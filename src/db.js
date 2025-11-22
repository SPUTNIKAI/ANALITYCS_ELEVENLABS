const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || '';

let pool = null;
if (DATABASE_URL) {
  const isLocal = DATABASE_URL.includes('localhost') || DATABASE_URL.includes('127.0.0.1');
  pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: isLocal ? false : (DATABASE_URL.includes('ssl=true') ? undefined : { rejectUnauthorized: false })
  });
}

async function ensureSchema() {
  if (!pool) return;
  // 1) Создаём таблицы (без индексов) — это гарантированно проходит на пустой БД
  await pool.query(`
    create table if not exists webhook_events (
      id bigserial primary key,
      event_type text not null,
      event_timestamp bigint not null,
      agent_id text,
      conversation_id text,
      status text,
      has_audio boolean,
      has_user_audio boolean,
      has_response_audio boolean,
      payload jsonb not null,
      processed boolean default false,
      processed_at timestamptz,
      processor_note text,
      received_at timestamptz default now()
    );

    create table if not exists analyses (
      id bigserial primary key,
      event_id bigint not null references webhook_events(id) on delete cascade,
      model text not null,
      result jsonb not null,
      created_at timestamptz default now()
    );

    create table if not exists crm_dispatches (
      id bigserial primary key,
      event_id bigint not null references webhook_events(id) on delete cascade,
      payload jsonb not null,
      response_text text,
      status text not null,
      created_at timestamptz default now()
    );
  `);

  // 2) Отдельным запросом создаём индексы — таблицы уже существуют
  await pool.query(`
    create index if not exists webhook_events_agent_id_idx
      on webhook_events (agent_id);
    create index if not exists webhook_events_conversation_id_idx
      on webhook_events (conversation_id);
    create index if not exists webhook_events_event_timestamp_idx
      on webhook_events (event_timestamp);
    create index if not exists webhook_events_processed_idx
      on webhook_events (processed, event_timestamp);

    create index if not exists analyses_event_id_idx
      on analyses (event_id);

    -- Индексы для фильтрации лидов
    create index if not exists analyses_quality_idx
      on analyses using gin ((result->'quality'));
    create index if not exists analyses_topic_idx
      on analyses using gin ((result->'topic'));
    create index if not exists analyses_client_name_idx
      on analyses using gin ((result->'client_name'));
    create index if not exists analyses_phone_idx
      on analyses using gin ((result->'phone'));

    create index if not exists crm_dispatches_event_status_idx
      on crm_dispatches (event_id, status, created_at desc);
  `);
}

async function insertWebhookEvent(event) {
  if (!pool) return { inserted: false, reason: 'no_database_url' };
  const {
    event_type,
    event_timestamp,
    agent_id,
    conversation_id,
    status,
    has_audio,
    has_user_audio,
    has_response_audio,
    payload
  } = event;
  await pool.query(
    `insert into webhook_events (
      event_type, event_timestamp, agent_id, conversation_id, status,
      has_audio, has_user_audio, has_response_audio, payload
    ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      event_type,
      event_timestamp,
      agent_id || null,
      conversation_id || null,
      status || null,
      has_audio ?? null,
      has_user_audio ?? null,
      has_response_audio ?? null,
      payload
    ]
  );
  return { inserted: true };
}

async function fetchUnprocessed(limit = 100) {
  if (!pool) return [];
  const { rows } = await pool.query(
    `select id, event_type, event_timestamp, agent_id, conversation_id, status,
            has_audio, has_user_audio, has_response_audio, payload, received_at
     from webhook_events
     where processed = false
     order by event_timestamp asc
     limit $1`,
    [limit]
  );
  return rows;
}

async function markProcessed(ids, note) {
  if (!pool || !ids?.length) return { updated: 0 };
  const { rowCount } = await pool.query(
    `update webhook_events
     set processed = true,
         processed_at = now(),
         processor_note = coalesce($2, processor_note)
     where id = any($1::bigint[])`,
    [ids, note || null]
  );
  return { updated: rowCount };
}

async function insertAnalysis(eventId, model, result) {
  if (!pool) return { inserted: false };
  const { rows } = await pool.query(
    `insert into analyses (event_id, model, result) values ($1,$2,$3) returning id`,
    [eventId, model, result]
  );
  return { inserted: true, id: rows[0]?.id };
}

async function hasSuccessfulCrmDispatch(eventId) {
  if (!pool) return false;
  const { rows } = await pool.query(
    `select 1 from crm_dispatches where event_id = $1 and status = 'success' limit 1`,
    [eventId]
  );
  return rows.length > 0;
}

async function insertCrmDispatchAttempt(eventId, payload, status, responseText) {
  if (!pool) return { inserted: false };
  await pool.query(
    `insert into crm_dispatches (event_id, payload, status, response_text) values ($1,$2,$3,$4)`,
    [eventId, payload, status, responseText || null]
  );
  return { inserted: true };
}

async function getEventById(eventId) {
  if (!pool) return null;
  const { rows } = await pool.query(
    `select id, event_type, event_timestamp, agent_id, conversation_id, status,
            has_audio, has_user_audio, has_response_audio, payload, received_at, processed, processed_at, processor_note
     from webhook_events where id = $1`,
    [eventId]
  );
  return rows[0] || null;
}

async function getLatestAnalysisByEventId(eventId) {
  if (!pool) return null;
  const { rows } = await pool.query(
    `select id, model, result, created_at
     from analyses
     where event_id = $1
     order by created_at desc
     limit 1`,
    [eventId]
  );
  return rows[0] || null;
}

module.exports = { pool, ensureSchema, insertWebhookEvent, fetchUnprocessed, markProcessed, insertAnalysis, hasSuccessfulCrmDispatch, insertCrmDispatchAttempt, getEventById, getLatestAnalysisByEventId };
