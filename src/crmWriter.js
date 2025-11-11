const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');

const CRM_MD_ENABLED = (process.env.CRM_MD_ENABLED || 'true') === 'true';
const CRM_MD_PATH = process.env.CRM_MD_PATH || path.join(__dirname, '..', 'memory-bank', 'crm.md');

function safe(val, fallback = '') {
  if (val === null || typeof val === 'undefined') return fallback;
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

function formatCrmEntry(eventRow, analysisResult) {
  const nowIso = new Date().toISOString();
  const header = `\n\n## Запись аналитики ${nowIso} (event_id: ${safe(eventRow.id)})`;
  const agent = `- Агент: ${safe(eventRow.agent_id, 'n/a')}`;
  const conv = `- Диалог: ${safe(eventRow.conversation_id, 'n/a')}`;
  const meta = `- Источник: ElevenLabs Webhook, статус: ${safe(eventRow.status, 'n/a')}`;
  const topic = `- Тема: ${safe(analysisResult.topic, 'n/a')}`;
  const intent = `- Намерение: ${safe(analysisResult.intent, 'n/a')}`;
  const quality = `- Качество ответа агента (1-5): ${safe(analysisResult.quality, 'n/a')}`;
  const outcome = `- Итог: ${safe(analysisResult.outcome, 'n/a')}`;
  const summary = `- Краткий итог: ${safe(analysisResult.summary_ru, 'n/a')}`;
  const recs = `- Рекомендации: ${safe(analysisResult.recommendations, 'n/a')}`;

  const block = [
    header,
    '',
    agent,
    conv,
    meta,
    topic,
    intent,
    quality,
    outcome,
    summary,
    recs
  ].join('\n');
  return block;
}

async function appendCrmEntry(eventRow, analysisResult) {
  if (!CRM_MD_ENABLED) return { written: false, reason: 'disabled' };
  try {
    const dir = path.dirname(CRM_MD_PATH);
    if (!fs.existsSync(dir)) {
      await fsp.mkdir(dir, { recursive: true });
    }
    const entry = formatCrmEntry(eventRow || {}, analysisResult || {});
    await fsp.appendFile(CRM_MD_PATH, entry, { encoding: 'utf8' });
    return { written: true, path: CRM_MD_PATH };
  } catch (e) {
    return { written: false, error: String(e) };
  }
}

module.exports = { appendCrmEntry };


