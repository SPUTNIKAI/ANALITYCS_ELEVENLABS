require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const app = express();

// Per docs: use raw body to compute HMAC over exact bytes
app.use(bodyParser.raw({ type: '*/*' }));

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || '';
const WEBHOOK_TOLERANCE_SEC = parseInt(process.env.WEBHOOK_TOLERANCE_SEC || '1800', 10);
const PORT = parseInt(process.env.PORT || '3000', 10);

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
    return crypto.timingSafeEqual(a, b);
  } catch (_) {
    return false;
  }
}

// Simple JSONL event store
const logsDir = path.join(__dirname, '..', 'logs');
const eventsFile = path.join(logsDir, 'events.jsonl');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

function appendEvent(event) {
  const line = JSON.stringify(event) + '\n';
  fs.appendFileSync(eventsFile, line, { encoding: 'utf8' });
}

app.post('/webhook/elevenlabs', (req, res) => {
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

  // Parse JSON only after signature is verified
  let event = {};
  try {
    event = JSON.parse(rawBuffer.toString('utf8'));
  } catch (_) {
    event = {};
  }

  // Normalize flags
  event.has_audio = Boolean(event.has_audio);
  event.has_user_audio = Boolean(event.has_user_audio);
  event.has_response_audio = Boolean(event.has_response_audio);

  // Console log summary for Render logs
  try {
    const summary = {
      received_at: new Date().toISOString(),
      event_id: event.event_id || null,
      agent_id: event.agent_id || null,
      has_audio: event.has_audio,
      has_user_audio: event.has_user_audio,
      has_response_audio: event.has_response_audio,
      raw_length: rawBuffer.length,
      user_agent: req.get('user-agent') || null,
      ip: req.ip || req.headers['x-forwarded-for'] || null
    };
    console.log('[webhook] received', summary);
    const previewStr = rawBuffer.toString('utf8');
    const preview = previewStr.length > 500 ? previewStr.slice(0, 500) + '...(+truncated)' : previewStr;
    console.log('[webhook] body preview:', preview);
  } catch (e) {
    console.warn('[webhook] logging failed', e);
  }

  // Store with minimal envelope
  appendEvent({
    received_at: new Date().toISOString(),
    headers: { 'ElevenLabs-Signature': sigHeader },
    event
  });

  return res.status(200).send('ok');
});

app.get('/health', (_req, res) => {
  res.status(200).send('ok');
});

app.listen(PORT, () => {
  console.log(`Server listening on :${PORT}`);
});
