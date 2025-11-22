// init-schema.js
const { ensureSchema } = require('./src/db');
require('dotenv').config();

(async () => {
  try {
    console.log('Init schema using DATABASE_URL =', process.env.DATABASE_URL);
    await ensureSchema();
    console.log('✅ Schema initialized');
    process.exit(0);
  } catch (e) {
    console.error('❌ Failed to init schema:', e);
    process.exit(1);
  }
})();