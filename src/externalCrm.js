const { setTimeout: sleep } = require('timers/promises');
const { dbg } = require('./logger');
const { hasSuccessfulCrmDispatch, insertCrmDispatchAttempt } = require('./db');

const EXTERNAL_CRM_ENABLED = (process.env.EXTERNAL_CRM_ENABLED || 'false') === 'true';
const CRM_SERVICE_URL = process.env.CRM_SERVICE_URL || '';
const CRM_LANDING_ID = process.env.CRM_LANDING_ID || '';
const CRM_BASIC_AUTH_USER = process.env.CRM_BASIC_AUTH_USER || '';
const CRM_BASIC_AUTH_PASS = process.env.CRM_BASIC_AUTH_PASS || '';
const CRM_TIMEOUT_MS = parseInt(process.env.CRM_TIMEOUT_MS || '8000', 10);
const CRM_MAX_RETRIES = parseInt(process.env.CRM_MAX_RETRIES || '2', 10);
const EXTERNAL_CRM_DRY_RUN = (process.env.EXTERNAL_CRM_DRY_RUN || 'false') === 'true';
const CRM_TRUSTED_ORIGIN = process.env.CRM_TRUSTED_ORIGIN || '';
const CRM_REFERER = process.env.CRM_REFERER || '';

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
  // Совместим с фронтовым виджетом: формируем formData { formId, formFieldsData, contactFieldsData, options }
  const comment = buildCommentary(eventRow, analysis);
  const contact = extractContactFromEvent(eventRow, analysis);

  const formFieldsData = [
    { name: 'Name', value: contact.fullName || '' },
    { name: 'MobilePhone', value: contact.phone || '' },
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

  const contactFieldsData = [
    { name: 'FullName', value: contact.fullName || '' },
    { name: 'Phone', value: contact.phone || '' },
    { name: 'Email', value: contact.email || '' }
  ].filter(f => f.value);

  return {
    formData: {
      formId: CRM_LANDING_ID,
      formFieldsData,
      contactFieldsData,
      options: { extendResponseWithExceptionType: true }
    }
  };
}

async function postToBpmsoft(payload) {
  const headers = { 'Content-Type': 'application/json' };
  const auth = buildAuthorizationHeader();
  if (auth) headers['Authorization'] = auth;
  if (CRM_TRUSTED_ORIGIN) headers['Origin'] = CRM_TRUSTED_ORIGIN;
  if (CRM_REFERER) headers['Referer'] = CRM_REFERER;

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

async function sendLeadAnalytics(eventRow, analysis, options = {}) {
  const force = Boolean(options.force);
  if (!EXTERNAL_CRM_ENABLED) {
    dbg('[crm] external CRM disabled, skip send');
    return { sent: false, reason: 'disabled' };
  }
  if (!CRM_SERVICE_URL || !CRM_LANDING_ID) return { sent: false, reason: 'not_configured' };
  if (!force && eventRow?.id && await hasSuccessfulCrmDispatch(eventRow.id)) {
    dbg('[crm] already sent for event, skip', { event_id: eventRow.id });
    return { sent: false, reason: 'already_sent' };
  }
  const payload = buildBpmsoftPayload(eventRow, analysis);

  if (EXTERNAL_CRM_DRY_RUN) {
    try { dbg('[crm] dry-run payload', { payload }); } catch {}
    await insertCrmDispatchAttempt(eventRow?.id || null, payload, 'dry_run', null);
    return { sent: false, reason: 'dry_run' };
  }

  let attempt = 0;
  while (true) {
    try {
      const res = await postToBpmsoft(payload);
      try {
        dbg('[crm] sent', { status: res.status, ok: res.ok, body_preview: (res.text || '').slice(0, 500) });
      } catch {}
      if (res.ok) {
        await insertCrmDispatchAttempt(eventRow?.id || null, payload, 'success', res.text || null);
        return { sent: true };
      }
      await insertCrmDispatchAttempt(eventRow?.id || null, payload, 'error', res.text || null);
      attempt += 1;
      if (attempt > CRM_MAX_RETRIES) {
        return { sent: false, status: res.status, body: res.text };
      }
      await sleep(300 * attempt);
    } catch (e) {
      attempt += 1;
      if (attempt > CRM_MAX_RETRIES) {
        await insertCrmDispatchAttempt(eventRow?.id || null, payload, 'error', String(e));
        return { sent: false, error: String(e) };
      }
      await sleep(300 * attempt);
    }
  }
}

module.exports = { sendLeadAnalytics };


