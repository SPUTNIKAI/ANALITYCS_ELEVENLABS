#!/usr/bin/env node
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const Bottleneck = require('bottleneck');
const { ensureSchema, insertWebhookEvent, insertAnalysis } = require('../src/db');
const { analyzeRawText } = require('../src/analysis');

const args = require('minimist')(process.argv.slice(2));
const file = args.file || args.f;
const col = args.col || 'dialog';
const limit = args.limit ? parseInt(args.limit, 10) : Infinity;
const customPrompt = args.customPrompt || process.env.ANALYZE_SYSTEM_PROMPT || '';
const maxConcurrent = parseInt(process.env.ANALYZE_MAX_CONCURRENCY || '1', 10);
const minTime = parseInt(process.env.ANALYZE_MIN_MS || '1500', 10);

if (!file) {
  console.error('Usage: node scripts/analyze-csv.js --file path/to/file.csv [--col dialog] [--limit 100]');
  process.exit(1);
}

const limiter = new Bottleneck({ maxConcurrent, minTime });

async function main() {
  await ensureSchema();
  let processed = 0;
  const stream = fs.createReadStream(path.resolve(file)).pipe(csv());

  for await (const row of stream) {
    if (processed >= limit) break;
    const text = row[col];
    if (!text) continue;

    const result = await limiter.schedule(() => analyzeRawText(text, { customPrompt }));

    // Persist: create a lightweight event for lineage (source: offline_csv)
    const eventTimestamp = Math.floor(Date.now() / 1000);
    const payload = { type: 'offline_csv', event_timestamp: eventTimestamp, data: { raw_text: text } };
    await insertWebhookEvent({
      event_type: 'offline_csv',
      event_timestamp: eventTimestamp,
      agent_id: null,
      conversation_id: null,
      status: 'done',
      has_audio: false,
      has_user_audio: false,
      has_response_audio: false,
      payload
    });

    // Insert analysis referencing the last inserted event via a small helper (not available):
    // As a simple approach, we skip linking to event id here due to lack of returned id from insertWebhookEvent.
    // Alternatively, you can extend insertWebhookEvent to return inserted id.
    await insertAnalysis(null, process.env.ANALYZE_MODEL || 'gpt-5', result);

    processed += 1;
    if (processed % 10 === 0) {
      console.log(`Processed: ${processed}`);
    }
  }

  console.log(`Done. Total processed: ${processed}`);
}

main().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});
