const OpenAI = require('openai');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const { dbg } = require('./logger');

// Явный timeout для запросов к OpenAI, чтобы анализ не "висел" слишком долго
const OPENAI_TIMEOUT_MS = parseInt(process.env.OPENAI_TIMEOUT_MS || '30000', 10);

const openai = OPENAI_API_KEY
  ? new OpenAI({
      apiKey: OPENAI_API_KEY,
      // maxRetries оставляем дефолтным; таймаут контролируем через OPENAI_TIMEOUT_MS
    })
  : null;

const DEFAULT_MODEL = process.env.ANALYZE_MODEL || 'gpt-5';

function buildSystemPrompt() {
  // Системный промпт для полной аналитики звонка и извлечения контактных данных
  const base = `Ты аналитик звонков/диалогов на русском языке.
Проанализируй транскрипт разговора и верни структурированную информацию.

ЗАДАЧИ:
1. topic — тема разговора одним словом или фразой (например: "недвижимость", "консультация", "жалоба").
2. intent — намерение клиента (например: "покупка квартиры", "получение информации", "решение проблемы").
3. quality — оцени качество ответов агента по шкале от 1 до 5 (где 5 — отлично: полезно, эмпатично, конкретно).
4. outcome — исход разговора (например: "клиент заинтересован", "отказ", "требуется звонок менеджера", "оставил контакт").
5. summary_ru — краткий итог разговора (2-4 предложения).
6. recommendations — рекомендации для улучшения (1-2 предложения, что можно улучшить или какие следующие шаги).
7. client_name — имя клиента, если оно явно упомянуто в диалоге. Если не найдено, верни пустую строку "".
8. phone — номер телефона клиента в формате с кодом страны (например, +79990009999). Если не найдено, верни пустую строку "".

Верни ответ строго в формате JSON (все 8 полей обязательны):
{
  "topic": "...",
  "intent": "...",
  "quality": 3,
  "outcome": "...",
  "summary_ru": "...",
  "recommendations": "...",
  "client_name": "...",
  "phone": "..."
}`;
  return base;
}



function transcriptToText(transcript) {
  const turns = Array.isArray(transcript) ? transcript : [];
  return turns.map(t => `${(t.role || 'unknown').toUpperCase()}: ${t.message || ''}`).join('\n');
}

async function analyzeTranscript(transcript, options = {}) {
  if (!openai) throw new Error('OPENAI_API_KEY not configured');
  const { customPrompt = '', extraUserContent = '' } = options;

  const system = buildSystemPrompt();
  const text = transcriptToText(transcript);

  // CUSTOM добавляем в user контент, затем транскрипт и дополнительный контент
  const user = [
    customPrompt && `Инструкции (custom):\n${customPrompt}`,
    `Транскрипт:\n${text}`,
    extraUserContent && `Дополнительно:\n${extraUserContent}`
  ].filter(Boolean).join('\n\n');

  // DEBUG: размеры и префикс промпта
  try {
    dbg('[llm] prompt info', {
      system_length: system.length,
      user_length: user.length,
      user_preview: user.slice(0, 500)
    });
  } catch {}

  let resp;
  try {
    resp = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ],
      response_format: { type: 'json_object' },
      timeout: OPENAI_TIMEOUT_MS
    });
    dbg('[llm] completion created', { model: DEFAULT_MODEL });
  } catch (e) {
    dbg('[llm] request failed', {
      error: String(e),
      code: e?.code,
      status: e?.status,
      type: e?.type
    });
    throw e;
  }
  const content = resp.choices?.[0]?.message?.content || '{}';
  try {
    dbg('[llm] raw content', { length: content.length, preview: content.slice(0, 1000) });
  } catch {}
  try {
    const parsed = JSON.parse(content);
  try {
    dbg('[llm] parsed result', {
      topic: parsed?.topic,
      intent: parsed?.intent,
      quality: parsed?.quality,
      outcome: parsed?.outcome,
      summary_preview: parsed?.summary_ru?.slice(0, 80),
      client_name: parsed?.client_name,
      phone: parsed?.phone
    });
  } catch {}
    return parsed;
  } catch (e) {
    dbg('[llm] parse error, returning empty object', { error: String(e) });
    return {};
  }
}

async function analyzeRawText(text, options = {}) {
  if (!openai) throw new Error('OPENAI_API_KEY not configured');
  const { customPrompt = '', extraUserContent = '' } = options;
  const system = buildSystemPrompt();
  const user = [
    customPrompt && `Инструкции (custom):\n${customPrompt}`,
    `Диалог (сырой текст):\n${text}`,
    extraUserContent && `Дополнительно:\n${extraUserContent}`
  ].filter(Boolean).join('\n\n');
  try {
    dbg('[llm] raw prompt info', {
      system_length: system.length,
      user_length: user.length,
      user_preview: user.slice(0, 500)
    });
  } catch {}
  let resp;
  try {
    resp = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' },
      timeout: OPENAI_TIMEOUT_MS
    });
  } catch (e) {
    dbg('[llm] raw request failed', {
      error: String(e),
      code: e?.code,
      status: e?.status,
      type: e?.type
    });
    throw e;
  }
  const content = resp.choices?.[0]?.message?.content || '{}';
  try {
    dbg('[llm] raw content', { length: content.length, preview: content.slice(0, 1000) });
  } catch {}
  return JSON.parse(content);
}

module.exports = { analyzeTranscript, analyzeRawText };
