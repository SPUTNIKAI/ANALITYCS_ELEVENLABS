Задача проекта - серкер который будет получать данные для дальнейшего анализа на webbhook POST 
после усепшного разговора Агента 

Важные замечания
Миграция формата: Компания ElevenLabs уведомляет об изменении формата Transcription Webhooks с 15 августа 2025 года. Убедитесь, что ваш обработчик может принимать новые поля has_audio, has_user_audio и has_response_audio.

Безопасность: Для дополнительной защиты можно настроить IP-whitelisting, разрешив запросы только со статических IP-адресов ElevenLabs.

Надёжность: Ваш эндпоинт должен всегда возвращать статус 200 OK после успешного получения данных. Последовательные неудачи могут привести к автоматическому отключению вебхука.

Ссылка на docs 
https://elevenlabs.io/docs/agents-platform/workflows/post-call-webhooks




вот пример с сайта elevenlabs 

const crypto = require('crypto');
const secret = process.env.WEBHOOK_SECRET;
const bodyParser = require('body-parser');

// Ensure express js is parsing the raw body through instead of applying it's own encoding
app.use(bodyParser.raw({ type: '*/*' }));

// Example webhook handler
app.post('/webhook/elevenlabs', async (req, res) => {
  const headers = req.headers['ElevenLabs-Signature'].split(',');
  const timestamp = headers.find((e) => e.startsWith('t=')).substring(2);
  const signature = headers.find((e) => e.startsWith('v0='));

  // Validate timestamp
  const reqTimestamp = timestamp * 1000;
  const tolerance = Date.now() - 30 * 60 * 1000;
  if (reqTimestamp < tolerance) {
    res.status(403).send('Request expired');
    return;
  } else {
    // Validate hash
    const message = `${timestamp}.${req.body}`;
    const digest = 'v0=' + crypto.createHmac('sha256', secret).update(message).digest('hex');
    if (signature !== digest) {
      res.status(401).send('Request unauthorized');
      return;
    }
  }

  // Validation passed, continue processing ...

  res.status(200).send();
});


пример написанный LLM
const express = require('express');
const crypto = require('crypto');

const app = express();
const port = 3000;
// Замените на ваш секрет из настроек вебхука ElevenLabs
const WEBHOOK_SECRET = 'your_webhook_secret_here';

app.use(express.json({ limit: '10mb' })); // Для обработки больших тел запросов (аудио)

app.post('/webhook', (req, res) => {
  const signatureHeader = req.headers['elevenlabs-signature'];
  const requestBody = JSON.stringify(req.body);
  
  // 1. Проверяем наличие заголовка с подписью
  if (!signatureHeader) {
    console.error('Missing ElevenLabs-Signature header');
    return res.status(401).send('Unauthorized');
  }

  // 2. Извлекаем подпись и временную метку из заголовка
  const { t: timestamp, v1: signature } = signatureHeader.split(',').reduce((acc, part) => {
    const [key, value] = part.split('=');
    acc[key] = value;
    return acc;
  }, {});

  // 3. Проверяем временную метку (защита от повторных атак)
  const now = Date.now();
  const fiveMinutesAgo = now - (5 * 60 * 1000);
  if (parseInt(timestamp) < fiveMinutesAgo) {
    console.error('Timestamp is too old.');
    return res.status(401).send('Unauthorized');
  }

  // 4. Проверяем HMAC-подпись
  const expectedSignature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(timestamp + '.' + requestBody)
    .digest('hex');

  if (signature !== expectedSignature) {
    console.error('Invalid signature.');
    return res.status(401).send('Unauthorized');
  }

  // 5. Аутентификация успешна, обрабатываем данные
  console.log('Webhook received and authenticated:');
  console.log('Type:', req.body.type); // Например, 'post_call_transcription'
  console.log('Conversation ID:', req.body.data?.conversation_id);
  
  // Ваша логика обработки данных здесь...
  // Например, для транскрипции: 
  // const transcript = req.body.data?.transcript;

  // 6. Всегда отвечаем 200 OK после успешного получения
  res.status(200).send('OK');
});

app.listen(port, () => {
  console.log(`Webhook server listening at http://localhost:${port}`);
});