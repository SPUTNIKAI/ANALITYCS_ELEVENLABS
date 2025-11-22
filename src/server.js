require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { ensureSchema, insertWebhookEvent, fetchUnprocessed, markProcessed, pool, insertAnalysis } = require('./db');
const OpenAI = require('openai');
const analyzeRouter = require('./routes/analyze');
const eventsRouter = require('./routes/events');
const Bottleneck = require('bottleneck');
const { analyzeTranscript } = require('./analysis');
const { appendCrmEntry } = require('./crmWriter');
const { sendLeadAnalytics } = require('./externalCrm');
const { dbg } = require('./logger');

const app = express();

// Per docs: use raw body to compute HMAC over exact bytes for webhook route only
app.use((req, res, next) => {
  if (req.path === '/webhook/elevenlabs') {
    return bodyParser.raw({ type: '*/*' })(req, res, next);
  }
  return bodyParser.json()(req, res, next);
});

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || '';
const WEBHOOK_TOLERANCE_SEC = parseInt(process.env.WEBHOOK_TOLERANCE_SEC || '1800', 10);
const PORT = parseInt(process.env.PORT || '3000', 10);

// Bottleneck settings
const maxConcurrent = parseInt(process.env.ANALYZE_MAX_CONCURRENCY || '1', 10);
const minTime = parseInt(process.env.ANALYZE_MIN_MS || '1500', 10);
const autoAnalyze = (process.env.ANALYZE_AUTO || 'true') === 'true';
const limiter = new Bottleneck({ maxConcurrent, minTime });

function computeHmacHex(timestamp, rawBuffer) {
  const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
  hmac.update(Buffer.from(String(timestamp), 'utf8'));
  hmac.update(Buffer.from('.', 'utf8'));
  hmac.update(rawBuffer);
  return hmac.digest('hex');
}

function parseSignatureHeader(headerValue) {
  if (!headerValue) return null;
  const headerStr = Array.isArray(headerValue) ? headerValue.join(',') : String(headerValue);
  const parts = headerStr.split(',').map(p => p.trim());
  const signatureKeys = new Set(['s', 'sig', 'signature', 'v0', 'v1']);
  let timestamp = null;
  let signature = null;
  for (const part of parts) {
    const [kRaw, vRaw] = part.split('=');
    if (!kRaw || typeof vRaw === 'undefined') continue;
    const key = kRaw.trim().toLowerCase();
    const val = vRaw.trim().replace(/^"|"$/g, '');
    if (key === 't' || key === 'timestamp') {
      timestamp = val;
    } else if (signatureKeys.has(key)) {
      signature = val;
    }
  }
  if (!timestamp || !signature) return null;
  return { timestamp, signature };
}

function verifySignature(header, rawBuffer) {
  if (!header || !WEBHOOK_SECRET) return false;
  const parsed = parseSignatureHeader(header);
  if (!parsed) return false;
  const { timestamp, signature } = parsed;

  const nowSec = Math.floor(Date.now() / 1000);
  const tsSec = parseInt(timestamp, 10);
  if (!Number.isFinite(tsSec)) return false;
  if (Math.abs(nowSec - tsSec) > WEBHOOK_TOLERANCE_SEC) return false;

  const hmacHex = computeHmacHex(timestamp, rawBuffer);
  try {
    const a = Buffer.from(hmacHex, 'hex');
    const b = Buffer.from(signature, 'hex');
    if (a.length !== b.length) return false;
    return require('crypto').timingSafeEqual(a, b);
  } catch (_) {
    return false;
  }
}

// Simple JSONL event store (fallback)
const fsLogs = require('fs');
const logsDir = path.join(__dirname, '..', 'logs');
const eventsFile = path.join(logsDir, 'events.jsonl');
if (!fsLogs.existsSync(logsDir)) fsLogs.mkdirSync(logsDir, { recursive: true });

function appendEvent(event) {
  const line = JSON.stringify(event) + '\n';
  fsLogs.appendFileSync(eventsFile, line, { encoding: 'utf8' });
}

async function analyzeEvent(event) {
  const transcript = event?.payload?.data?.transcript || [];
  dbg('[analyze] start', { event_id: event?.id, transcript_len: Array.isArray(transcript) ? transcript.length : 0, model: process.env.ANALYZE_MODEL || 'gpt-5' });
  const result = await analyzeTranscript(transcript);
  dbg('[analyze] result', { event_id: event?.id, topic: result?.topic, intent: result?.intent, quality: result?.quality, outcome: result?.outcome, phone: result?.phone });
  const saved = await insertAnalysis(event.id, process.env.ANALYZE_MODEL || 'gpt-5', result);
  await markProcessed([event.id], 'auto analyzed');
  try {
    await appendCrmEntry(event, result);
  } catch (e) {
    console.warn('crm append failed', e);
  }
  try {
    const sent = await sendLeadAnalytics(event, result);
    if (!sent?.sent) {
      console.warn('external CRM send failed', sent);
    }
  } catch (e) {
    console.warn('external CRM send threw', e);
  }
  return saved;
}

app.post('/webhook/elevenlabs', async (req, res) => {
  const sigHeader = req.get('ElevenLabs-Signature') || req.get('elevenlabs-signature') || req.get('X-ElevenLabs-Signature');
  const rawBuffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from(String(req.body || ''), 'utf8');

  if (!verifySignature(sigHeader, rawBuffer)) {
    try {
      const parsed = parseSignatureHeader(sigHeader || '');
      const ts = parsed?.timestamp || 'n/a';
      const provided = parsed?.signature || 'n/a';
      const expected = WEBHOOK_SECRET && ts !== 'n/a' ? computeHmacHex(ts, rawBuffer) : 'n/a';
      console.warn('[webhook] invalid signature', {
        now: Math.floor(Date.now() / 1000),
        timestamp: ts,
        rawLength: rawBuffer.length,
        expectedHmac: expected,
        providedHmac: provided,
        rawHeader: sigHeader || 'missing'
      });
    } catch (e) {
      console.warn('[webhook] invalid signature (logging failed)', e);
    }
    return res.status(401).send('invalid signature');
  }

  let payloadObj = {};
  try {
    payloadObj = JSON.parse(rawBuffer.toString('utf8'));
    dbg('[webhook] payload parsed', {
      keys: Object.keys(payloadObj || {}),
      transcript_len: Array.isArray(payloadObj?.data?.transcript) ? payloadObj.data.transcript.length : 0
    });
  } catch (_) {
    payloadObj = {};
  }

  const event_type = payloadObj.type || null;
  const event_timestamp = payloadObj.event_timestamp || Math.floor(Date.now() / 1000);
  const data = payloadObj.data || {};
  const agent_id = data.agent_id || null;
  const conversation_id = data.conversation_id || null;
  const status = data.status || null;

  const has_audio = Boolean(payloadObj.has_audio ?? data.has_audio);
  const has_user_audio = Boolean(payloadObj.has_user_audio ?? data.has_user_audio);
  const has_response_audio = Boolean(payloadObj.has_response_audio ?? data.has_response_audio);

  try {
    const summary = {
      received_at: new Date().toISOString(),
      event_id: payloadObj.event_id || null,
      agent_id,
      has_audio,
      has_user_audio,
      has_response_audio,
      raw_length: rawBuffer.length,
      user_agent: req.get('user-agent') || null,
      ip: req.ip || req.headers['x-forwarded-for'] || null
    };
    console.log('[webhook] received', summary);
  } catch (e) {
    console.warn('[webhook] logging failed', e);
  }

  try {
    const dbRes = await insertWebhookEvent({
      event_type: event_type || 'unknown',
      event_timestamp,
      agent_id,
      conversation_id,
      status,
      has_audio,
      has_user_audio,
      has_response_audio,
      payload: payloadObj
    });
    dbg('[webhook] event stored', { inserted: dbRes?.inserted === true });
    if (!dbRes.inserted) {
      appendEvent({ received_at: new Date().toISOString(), event: payloadObj });
    }
  } catch (e) {
    console.warn('[webhook] db insert failed, writing to file', e);
    appendEvent({ received_at: new Date().toISOString(), event: payloadObj });
  }

  // Auto-trigger analysis in background (non-blocking)
  if (autoAnalyze) {
    try {
      const rows = await fetchUnprocessed(1);
      if (rows.length) {
        const ev = rows[0];
        dbg('[analyze] scheduling background analysis', { event_id: ev.id });
        limiter.schedule(() => analyzeEvent(ev)).catch(err => console.warn('auto analyze failed', err));
      }
    } catch (e) {
      console.warn('auto analyze scheduling failed', e);
    }
  }

  return res.status(200).send('ok');
});

// Mount analyze router under /api
app.use('/api', analyzeRouter);
app.use('/api', eventsRouter);

app.get('/health', (_req, res) => {
  res.status(200).send('ok');
});

// Serve admin pages
app.get('/admin', (_req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/leads', (_req, res) => {
  res.sendFile(path.join(__dirname, 'leads.html'));
});

ensureSchema()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server listening on :${PORT}`);
    });
  })
  .catch((e) => {
    console.error('Failed to ensure schema', e);
    app.listen(PORT, () => {
      console.log(`Server listening on :${PORT} (without DB schema)`);
    });
  });
