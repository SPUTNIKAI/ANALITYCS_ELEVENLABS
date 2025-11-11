const express = require('express');
const Bottleneck = require('bottleneck');
const { fetchUnprocessed, markProcessed, insertAnalysis, pool } = require('../db');
const { analyzeTranscript } = require('../analysis');
const { appendCrmEntry } = require('../crmWriter');
const { sendLeadAnalytics } = require('../externalCrm');
const { dbg } = require('../logger');

const router = express.Router();

const maxConcurrent = parseInt(process.env.ANALYZE_MAX_CONCURRENCY || '1', 10);
const minTime = parseInt(process.env.ANALYZE_MIN_MS || '1500', 10);

const limiter = new Bottleneck({ maxConcurrent, minTime });

async function doAnalyze(event) {
  const transcript = event?.payload?.data?.transcript || [];
  dbg('[analyze/api] start', { event_id: event?.id, transcript_len: Array.isArray(transcript) ? transcript.length : 0 });
  const result = await analyzeTranscript(transcript);
  dbg('[analyze/api] result', { event_id: event?.id, topic: result?.topic, intent: result?.intent, quality: result?.quality, outcome: result?.outcome, phone: result?.phone });
  const saved = await insertAnalysis(event.id, process.env.ANALYZE_MODEL || 'gpt-5', result);
  await markProcessed([event.id], 'analyzed by bottleneck worker');
  try {
    await appendCrmEntry(event, result);
  } catch (_) {
    // запись в CRM md не критична для ответа
  }
  try {
    const sent = await sendLeadAnalytics(event, result);
    if (!sent?.sent) {
      // внешняя CRM — best-effort
    }
  } catch (_) {}
  return { analysis_id: saved.id, result };
}

router.post('/analyze', async (req, res) => {
  try {
    const event = req.body?.event;
    if (!event?.id || !event?.payload) return res.status(400).json({ error: 'bad_request' });
    const task = limiter.schedule(() => doAnalyze(event));
    const out = await task;
    return res.status(200).json(out);
  } catch (e) {
    return res.status(500).json({ error: 'analysis_failed', details: String(e) });
  }
});

router.post('/analyze/next', async (_req, res) => {
  try {
    const rows = await fetchUnprocessed(1);
    if (!rows.length) return res.status(200).json({ message: 'nothing_to_analyze' });
    const event = rows[0];
    const task = limiter.schedule(() => doAnalyze(event));
    const out = await task;
    return res.status(200).json({ event_id: event.id, ...out });
  } catch (e) {
    return res.status(500).json({ error: 'analysis_failed', details: String(e) });
  }
});

module.exports = router;
