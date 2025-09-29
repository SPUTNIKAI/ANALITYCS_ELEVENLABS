const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || '';

let pool = null;
if (DATABASE_URL) {
  pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: DATABASE_URL.includes('ssl=true') ? undefined : { rejectUnauthorized: false }
  });
}

async function ensureSchema() {
  if (!pool) return;
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
    create index if not exists webhook_events_agent_id_idx on webhook_events (agent_id);
    create index if not exists webhook_events_conversation_id_idx on webhook_events (conversation_id);
    create index if not exists webhook_events_event_timestamp_idx on webhook_events (event_timestamp);
    create index if not exists webhook_events_processed_idx on webhook_events (processed, event_timestamp);
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

module.exports = { pool, ensureSchema, insertWebhookEvent, fetchUnprocessed, markProcessed };
