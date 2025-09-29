require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const app = express();

// Capture raw body for signature verification
const rawBodySaver = (req, res, buf) => {
  if (buf && buf.length) {
    req.rawBody = buf.toString('utf8');
  }
};
app.use(bodyParser.json({ verify: rawBodySaver }));

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || '';
const WEBHOOK_TOLERANCE_SEC = parseInt(process.env.WEBHOOK_TOLERANCE_SEC || '1800', 10);
const PORT = parseInt(process.env.PORT || '3000', 10);

function computeHmacHex(timestamp, rawBody) {
  const payload = `${timestamp}.${rawBody}`;
  return crypto.createHmac('sha256', WEBHOOK_SECRET).update(payload, 'utf8').digest('hex');
}

function verifySignature(header, rawBody) {
  if (!header || !WEBHOOK_SECRET) return false;
  // Expected format: "t=TIMESTAMP, s=HMAC_HEX"
  const parts = header.split(',').map(p => p.trim());
  const tPart = parts.find(p => p.startsWith('t='));
  const sPart = parts.find(p => p.startsWith('s='));
  if (!tPart || !sPart) return false;
  const timestamp = tPart.slice(2);
  const signature = sPart.slice(2);

  const nowSec = Math.floor(Date.now() / 1000);
  const tsSec = parseInt(timestamp, 10);
  if (!Number.isFinite(tsSec)) return false;
  if (Math.abs(nowSec - tsSec) > WEBHOOK_TOLERANCE_SEC) return false;

  const hmac = computeHmacHex(timestamp, rawBody);
  try {
    const a = Buffer.from(hmac, 'hex');
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
  const sig = req.get('ElevenLabs-Signature');
  const raw = req.rawBody || '';
  if (!verifySignature(sig, raw)) {
    // Debug log to help diagnose signature mismatches
    try {
      const parts = (sig || '').split(',').map(p => p.trim());
      const tPart = parts.find(p => p.startsWith('t='));
      const sPart = parts.find(p => p.startsWith('s='));
      const ts = tPart ? tPart.slice(2) : 'n/a';
      const provided = sPart ? sPart.slice(2) : 'n/a';
      const expected = WEBHOOK_SECRET && ts !== 'n/a' ? computeHmacHex(ts, raw) : 'n/a';
      console.warn('[webhook] invalid signature', {
        now: Math.floor(Date.now() / 1000),
        timestamp: ts,
        rawLength: raw.length,
        expectedHmac: expected,
        providedHmac: provided
      });
    } catch (e) {
      console.warn('[webhook] invalid signature (logging failed)', e);
    }
    return res.status(401).send('invalid signature');
  }

  const event = req.body || {};
  // Basic normalization for new fields post 2025-08-15
  event.has_audio = Boolean(event.has_audio);
  event.has_user_audio = Boolean(event.has_user_audio);
  event.has_response_audio = Boolean(event.has_response_audio);

  // Store with minimal envelope
  appendEvent({
    received_at: new Date().toISOString(),
    headers: { 'ElevenLabs-Signature': sig },
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
