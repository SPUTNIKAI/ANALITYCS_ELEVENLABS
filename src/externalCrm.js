const { setTimeout: sleep } = require('timers/promises');
const { dbg } = require('./logger');

const EXTERNAL_CRM_ENABLED = (process.env.EXTERNAL_CRM_ENABLED || 'false') === 'true';
const CRM_SERVICE_URL = process.env.CRM_SERVICE_URL || '';
const CRM_LANDING_ID = process.env.CRM_LANDING_ID || '';
const CRM_BASIC_AUTH_USER = process.env.CRM_BASIC_AUTH_USER || '';
const CRM_BASIC_AUTH_PASS = process.env.CRM_BASIC_AUTH_PASS || '';
const CRM_TIMEOUT_MS = parseInt(process.env.CRM_TIMEOUT_MS || '8000', 10);
const CRM_MAX_RETRIES = parseInt(process.env.CRM_MAX_RETRIES || '2', 10);

function buildAuthorizationHeader() {
  if (CRM_BASIC_AUTH_USER && CRM_BASIC_AUTH_PASS) {
    const token = Buffer.from(`${CRM_BASIC_AUTH_USER}:${CRM_BASIC_AUTH_PASS}`).toString('base64');
    return `Basic ${token}`;
  }
  return '';
}

function buildCommentary(eventRow, analysis) {
  const parts = [];
  if (analysis?.topic) parts.push(`Тема: ${analysis.topic}`);
  if (analysis?.intent) parts.push(`Намерение: ${analysis.intent}`);
  if (analysis?.quality !== undefined) parts.push(`Качество: ${analysis.quality}`);
  if (analysis?.outcome) parts.push(`Итог: ${analysis.outcome}`);
  if (analysis?.summary_ru) parts.push(`Итог (RU): ${analysis.summary_ru}`);
  if (analysis?.recommendations) parts.push(`Рекомендации: ${analysis.recommendations}`);
  parts.push(`IDs: event=${eventRow?.id ?? 'n/a'}, agent=${eventRow?.agent_id ?? 'n/a'}, conv=${eventRow?.conversation_id ?? 'n/a'}`);
  return parts.join(' | ');
}

function extractContactFromEvent(eventRow, analysis) {
  const payload = eventRow?.payload || {};
  const data = payload?.data || {};
  const contact = data?.contact || {};
  const extractedName = analysis?.client_name || '';
  const extractedPhone = analysis?.phone || '';
  return {
    fullName: contact.fullName || contact.name || payload.user_name || extractedName || '',
    phone: contact.phone || payload.user_phone || extractedPhone || '',
    email: contact.email || payload.user_email || ''
  };
}

function buildBpmsoftPayload(eventRow, analysis) {
  // Совместим с примерами: используем массивы fields/contactFields с name/value
  const comment = buildCommentary(eventRow, analysis);
  const contact = extractContactFromEvent(eventRow, analysis);

  const fields = [
    { name: 'Commentary', value: comment },
    { name: 'UsrQualificationComment', value: comment },
    { name: 'UsrTSLeadStatus', value: analysis?.outcome || '' },
    { name: 'UsrQualificationTopic', value: analysis?.topic || '' },
    { name: 'UsrIntent', value: analysis?.intent || '' },
    { name: 'UsrQualityScore', value: analysis?.quality != null ? String(analysis.quality) : '' },
    { name: 'UsrEventId', value: eventRow?.id != null ? String(eventRow.id) : '' },
    { name: 'UsrAgentId', value: eventRow?.agent_id || '' },
    { name: 'UsrConversationId', value: eventRow?.conversation_id || '' }
  ].filter(f => f.value);

  const contactFields = [
    { name: 'FullName', value: contact.fullName || '' },
    { name: 'Phone', value: contact.phone || '' },
    { name: 'Email', value: contact.email || '' }
  ].filter(f => f.value);

  return {
    landingId: CRM_LANDING_ID,
    fields,
    contactFields
  };
}

async function postToBpmsoft(payload) {
  const headers = { 'Content-Type': 'application/json' };
  const auth = buildAuthorizationHeader();
  if (auth) headers['Authorization'] = auth;

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), CRM_TIMEOUT_MS);
  try {
    const resp = await fetch(CRM_SERVICE_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    const text = await resp.text().catch(() => '');
    return { ok: resp.ok, status: resp.status, text };
  } finally {
    clearTimeout(t);
  }
}

async function sendLeadAnalytics(eventRow, analysis) {
  if (!EXTERNAL_CRM_ENABLED) {
    dbg('[crm] external CRM disabled, skip send');
    return { sent: false, reason: 'disabled' };
  }
  if (!CRM_SERVICE_URL || !CRM_LANDING_ID) return { sent: false, reason: 'not_configured' };
  const payload = buildBpmsoftPayload(eventRow, analysis);

  let attempt = 0;
  while (true) {
    try {
      const res = await postToBpmsoft(payload);
      dbg('[crm] sent', { status: res.status, ok: res.ok });
      if (res.ok) return { sent: true };
      attempt += 1;
      if (attempt > CRM_MAX_RETRIES) {
        return { sent: false, status: res.status, body: res.text };
      }
      await sleep(300 * attempt);
    } catch (e) {
      attempt += 1;
      if (attempt > CRM_MAX_RETRIES) {
        return { sent: false, error: String(e) };
      }
      await sleep(300 * attempt);
    }
  }
}

module.exports = { sendLeadAnalytics };


