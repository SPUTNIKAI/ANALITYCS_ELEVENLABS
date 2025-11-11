const express = require('express');
const { pool } = require('../db');

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

    const dateFrom = req.query.dateFrom ? toEpochSeconds(req.query.dateFrom) : null;
    const dateTo = req.query.dateTo ? toEpochSeconds(req.query.dateTo) : null;
    const agentId = req.query.agentId ? String(req.query.agentId) : null;

    const where = [];
    const params = [];

    if (dateFrom) {
      params.push(dateFrom);
      where.push(`e.event_timestamp >= $${params.length}`);
    }
    if (dateTo) {
      params.push(dateTo);
      where.push(`e.event_timestamp <= $${params.length}`);
    }
    if (agentId) {
      params.push(agentId);
      where.push(`e.agent_id = $${params.length}`);
    }

    const whereSql = where.length ? `where ${where.join(' and ')}` : '';

    const countSql = `select count(*) as cnt from webhook_events e ${whereSql}`;
    const { rows: countRows } = await pool.query(countSql, params);
    const total = parseInt(countRows?.[0]?.cnt || '0', 10);

    params.push(limit);
    const limitIdx = params.length;
    params.push(offset);
    const offsetIdx = params.length;

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
      order by e.event_timestamp desc
      limit $${limitIdx} offset $${offsetIdx}
    `;

    const { rows } = await pool.query(listSql, params);

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


