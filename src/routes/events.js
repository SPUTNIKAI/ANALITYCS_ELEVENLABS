const express = require('express');
const { pool, getEventById, getLatestAnalysisByEventId, insertAnalysis, markProcessed } = require('../db');
const { sendLeadAnalytics } = require('../externalCrm');
const { analyzeTranscript } = require('../analysis');
const { appendCrmEntry } = require('../crmWriter');
const { dbg } = require('../logger');

const router = express.Router();

function toEpochSeconds(iso) {
  const d = new Date(iso);
  const ms = d.getTime();
  if (!Number.isFinite(ms)) return null;
  return Math.floor(ms / 1000);
}

router.get('/events', async (req, res) => {
  try {
    if (!pool) return res.status(200).json({ data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } });

    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '20', 10), 1), 100);
    const offset = (page - 1) * limit;

    // Parse filter parameters
    const dateFrom = req.query.dateFrom ? toEpochSeconds(req.query.dateFrom) : null;
    const dateTo = req.query.dateTo ? toEpochSeconds(req.query.dateTo) : null;
    const agentId = req.query.agentId ? String(req.query.agentId) : null;
    const quality = req.query.quality ? parseInt(req.query.quality, 10) : null;
    const topic = req.query.topic ? String(req.query.topic).trim() : null;
    const clientName = req.query.clientName ? String(req.query.clientName).trim() : null;
    const phone = req.query.phone ? String(req.query.phone).trim() : null;
    const sortBy = req.query.sortBy || 'date';
    const sortOrder = req.query.sortOrder === 'asc' ? 'asc' : 'desc';

    // Build WHERE conditions
    const where = [];
    const whereParams = [];

    if (dateFrom) {
      whereParams.push(dateFrom);
      where.push(`e.event_timestamp >= $${whereParams.length}`);
    }
    if (dateTo) {
      whereParams.push(dateTo);
      where.push(`e.event_timestamp <= $${whereParams.length}`);
    }
    if (agentId) {
      whereParams.push(agentId);
      where.push(`e.agent_id = $${whereParams.length}`);
    }
    if (quality !== null && !isNaN(quality)) {
      whereParams.push(quality.toString());
      where.push(`a.result->>'quality' = $${whereParams.length}`);
    }
    if (topic) {
      whereParams.push(`%${topic}%`);
      where.push(`a.result->>'topic' ILIKE $${whereParams.length}`);
    }
    if (clientName) {
      whereParams.push(`%${clientName}%`);
      where.push(`a.result->>'client_name' ILIKE $${whereParams.length}`);
    }
    if (phone) {
      whereParams.push(`%${phone}%`);
      where.push(`a.result->>'phone' ILIKE $${whereParams.length}`);
    }

    const whereSql = where.length ? `where ${where.join(' and ')}` : '';

    // Count query
    const countSql = `select count(*) as cnt from webhook_events e left join lateral (select result from analyses a where a.event_id = e.id order by a.created_at desc limit 1) a on true ${whereSql}`;
    const { rows: countRows } = await pool.query(countSql, whereParams);
    const total = parseInt(countRows?.[0]?.cnt || '0', 10);

    // List query with simple sorting (only by date for now)
    const listParams = [...whereParams, limit, offset];
    const listSql = `
      select
        e.id,
        e.event_type,
        e.event_timestamp,
        e.agent_id,
        e.conversation_id,
        e.status,
        e.has_audio,
        e.has_user_audio,
        e.has_response_audio,
        e.received_at,
        a.result as analysis_result
      from webhook_events e
      left join lateral (
        select result
        from analyses a
        where a.event_id = e.id
        order by a.created_at desc
        limit 1
      ) a on true
      ${whereSql}
      order by e.event_timestamp ${sortOrder}
      limit $${listParams.length - 1} offset $${listParams.length}
    `;

    const { rows } = await pool.query(listSql, listParams);

    const data = rows.map(r => ({
      id: r.id,
      event_timestamp: r.event_timestamp,
      agent_id: r.agent_id,
      conversation_id: r.conversation_id,
      status: r.status,
      has_audio: r.has_audio,
      has_user_audio: r.has_user_audio,
      has_response_audio: r.has_response_audio,
      received_at: r.received_at,
      topic: r.analysis_result?.topic || null,
      quality: r.analysis_result?.quality ?? null,
      outcome: r.analysis_result?.outcome || null,
      client_name: r.analysis_result?.client_name || null,
      phone: r.analysis_result?.phone || null
    }));

    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
    return res.status(200).json({ data, pagination: { page, limit, total, totalPages } });
  } catch (e) {
    console.error('Events API error:', e);
    return res.status(500).json({ error: 'failed_to_list_events', details: String(e) });
  }
});

router.get('/events/:id', async (req, res) => {
  try {
    if (!pool) return res.status(404).json({ error: 'not_found' });
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'bad_id' });

    const evSql = `
      select id, event_type, event_timestamp, agent_id, conversation_id, status,
             has_audio, has_user_audio, has_response_audio, payload, received_at, processed, processed_at, processor_note
      from webhook_events where id = $1
    `;
    const { rows: evRows } = await pool.query(evSql, [id]);
    if (!evRows.length) return res.status(404).json({ error: 'not_found' });
    const ev = evRows[0];

    const anSql = `
      select id, model, result, created_at
      from analyses
      where event_id = $1
      order by created_at desc
      limit 1
    `;
    const { rows: anRows } = await pool.query(anSql, [id]);
    const analysis = anRows[0] || null;

    return res.status(200).json({ event: ev, analysis });
  } catch (e) {
    return res.status(500).json({ error: 'failed_to_get_event', details: String(e) });
  }
});

module.exports = router;

router.post('/events/:id/resend-crm', async (req, res) => {
  try {
    if (!pool) return res.status(503).json({ error: 'no_database' });
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'bad_id' });
    const force = String(req.query.force || req.body?.force || '').toLowerCase() === 'true';

    const event = await getEventById(id);
    if (!event) return res.status(404).json({ error: 'not_found' });
    const analysis = await getLatestAnalysisByEventId(id);
    const result = analysis?.result || {};

    dbg('[crm] manual resend requested', { event_id: id, force });
    const sent = await sendLeadAnalytics(event, result, { force });
    return res.status(200).json({ event_id: id, ...sent });
  } catch (e) {
    return res.status(500).json({ error: 'resend_failed', details: String(e) });
  }
});

// Ручной перезапуск анализа для конкретного события
router.post('/events/:id/reanalyze', async (req, res) => {
  try {
    if (!pool) return res.status(503).json({ error: 'no_database' });
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'bad_id' });

    const event = await getEventById(id);
    if (!event) return res.status(404).json({ error: 'not_found' });

    const transcript = event?.payload?.data?.transcript || [];
    if (!Array.isArray(transcript) || transcript.length === 0) {
      return res.status(400).json({ error: 'empty_transcript', message: 'No transcript data to analyze' });
    }

    console.log('[analyze/api] manual reanalyze requested', { event_id: id, transcript_len: transcript.length });

    const result = await analyzeTranscript(transcript);

    // Проверяем на ошибку анализа
    if (result?._analysis_error) {
      console.warn('[analyze/api] reanalyze returned error', { event_id: id, error: result._analysis_error });
      return res.status(422).json({ 
        error: 'analysis_failed', 
        details: result._analysis_error,
        raw_content: result._raw_content || null 
      });
    }

    // Сохраняем результат
    const saved = await insertAnalysis(id, process.env.ANALYZE_MODEL || 'gpt-5', result);
    await markProcessed([id], 'manual reanalyze');

    console.log('[analyze/api] reanalyze success', { event_id: id, topic: result?.topic, quality: result?.quality });

    // Отправляем в CRM
    let crmResult = null;
    try {
      await appendCrmEntry(event, result);
      crmResult = await sendLeadAnalytics(event, result, { force: true });
    } catch (e) {
      console.warn('[analyze/api] CRM send after reanalyze failed', { event_id: id, error: String(e) });
    }

    return res.status(200).json({ 
      event_id: id, 
      analysis_id: saved?.id,
      result,
      crm: crmResult
    });
  } catch (e) {
    console.error('[analyze/api] reanalyze failed', { error: String(e), stack: e?.stack?.slice(0, 500) });
    return res.status(500).json({ error: 'reanalyze_failed', details: String(e) });
  }
});
