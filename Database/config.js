require('dotenv').config();
const { Pool } = require('pg');

// ================= UNIVERSAL DB CONNECTION =================
const getDbConfig = () => {
  // 1. If the Hosting Platform provides a generic DATABASE_URL (Heroku/Render)
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    };
  }

  // 2. If the Panel provides specific variables (Pterodactyl/cPanel)
  if (process.env.DB_HOST) {
    return {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || process.env.DB_PASS || '',
      database: process.env.DB_NAME || process.env.DB_DATABASE || 'postgres',
      ssl: false 
    };
  }

  // 3. FALLBACK: Hardcoded Database (The "Safety Net")
  // If no .env is found, it uses this link automatically.
  return {
    connectionString: "postgres://ubjv0vpt8hr6hd:p0e3bf0e92ef4ed30adc06d153b09ba4ab336ec026a7a4a72881e13eda26ea9a3@c18qegamsgjut6.cluster-czrs8kj4isg7.us-east-1.rds.amazonaws.com:5432/d7q6gmnnl5aj9q",
    ssl: { rejectUnauthorized: false }
  };
};

const pool = new Pool(getDbConfig());

// ================= DEFAULT BOT SETTINGS =================
const defaultSettings = {
  antilink: 'on',
  antilinkall: 'off',
  autobio: 'on',
  antidelete: 'on',
  antitag: 'on',
  antibot: 'off',
  anticall: 'on',
  antiforeign: 'off',
  badword: 'off',
  gptdm: 'off',
  welcomegoodbye: 'off',
  autoread: 'off',
  mode: 'public',
  prefix: '.',
  autolike: 'on',
  autoview: 'on',
  wapresence: 'recording',
  antiedit: 'private'
};

// ================= DATABASE INITIALIZATION =================
async function initializeDatabase() {
  const client = await pool.connect();
  console.log("📡 Connecting to PostgreSQL...");

  try {
    // 🔹 Bot settings
    await client.query(`
      CREATE TABLE IF NOT EXISTS bot_settings (
        id SERIAL PRIMARY KEY,
        key TEXT UNIQUE NOT NULL,
        value TEXT NOT NULL
      );
    `);

    // 🔹 Sudo owners
    await client.query(`
      CREATE TABLE IF NOT EXISTS sudo_owners (
        id SERIAL PRIMARY KEY,
        number TEXT UNIQUE NOT NULL
      );
    `);

    // 🔹 Badwords
    await client.query(`
      CREATE TABLE IF NOT EXISTS badwords (
        id SERIAL PRIMARY KEY,
        word TEXT UNIQUE NOT NULL
      );
    `);

    // Insert default settings if not exist
    for (const [key, value] of Object.entries(defaultSettings)) {
      await client.query(
        `INSERT INTO bot_settings (key, value)
         VALUES ($1, $2)
         ON CONFLICT (key) DO NOTHING;`,
        [key, value]
      );
    }

    console.log("✅ Database initialized successfully.");
  } catch (err) {
    console.error("❌ Initialization error:", err);
  } finally {
    client.release();
  }
}

// ================= SETTINGS FUNCTIONS =================
async function getSettings() {
  const client = await pool.connect();
  try {
    // Fetch only keys that exist in our default settings to avoid errors
    const result = await client.query(
      `SELECT key, value FROM bot_settings WHERE key = ANY($1::text[])`,
      [Object.keys(defaultSettings)]
    );

    const settings = {};
    for (const row of result.rows) {
      settings[row.key] = row.value;
    }

    // Merge with defaults to ensure missing keys have a value
    return { ...defaultSettings, ...settings };
  } catch (err) {
    console.error("❌ Failed to fetch settings:", err);
    return defaultSettings;
  } finally {
    client.release();
  }
}

async function updateSetting(key, value) {
  const client = await pool.connect();
  try {
    const validKeys = Object.keys(defaultSettings);
    if (!validKeys.includes(key)) throw new Error(`Invalid setting key: ${key}`);

    // Update or Insert (Upsert) logic in case it was missing
    await client.query(
      `INSERT INTO bot_settings (key, value)
       VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [key, value]
    );

    return true;
  } catch (err) {
    console.error("❌ Failed to update setting:", err.message || err);
    return false;
  } finally {
    client.release();
  }
}

// ================= SUDO FUNCTIONS =================
async function addSudoOwner(number) {
  const client = await pool.connect();
  try {
    await client.query(
      `INSERT INTO sudo_owners (number) VALUES ($1) ON CONFLICT DO NOTHING`,
      [number]
    );
    return true;
  } catch (err) {
    console.error("❌ Failed to add sudo owner:", err);
    return false;
  } finally {
    client.release();
  }
}

async function removeSudoOwner(number) {
  const client = await pool.connect();
  try {
    await client.query(`DELETE FROM sudo_owners WHERE number = $1`, [number]);
    return true;
  } catch (err) {
    console.error("❌ Failed to remove sudo owner:", err);
    return false;
  } finally {
    client.release();
  }
}

async function getSudoOwners() {
  const client = await pool.connect();
  try {
    const result = await client.query(`SELECT number FROM sudo_owners`);
    return result.rows.map(r => r.number);
  } catch (err) {
    console.error("❌ Failed to fetch sudo owners:", err);
    return [];
  } finally {
    client.release();
  }
}

async function isSudoOwner(number) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT 1 FROM sudo_owners WHERE number = $1`,
      [number]
    );
    return result.rowCount > 0;
  } catch (err) {
    console.error("❌ Failed to check sudo owner:", err);
    return false;
  } finally {
    client.release();
  }
}

// ================= BADWORD FUNCTIONS =================
async function addBadword(word) {
  const client = await pool.connect();
  try {
    await client.query(
      `INSERT INTO badwords (word) VALUES ($1) ON CONFLICT DO NOTHING`,
      [word.toLowerCase()]
    );
    return true;
  } catch (err) {
    console.error("❌ Failed to add badword:", err);
    return false;
  } finally {
    client.release();
  }
}

async function removeBadword(word) {
  const client = await pool.connect();
  try {
    await client.query(`DELETE FROM badwords WHERE word = $1`, [word.toLowerCase()]);
    return true;
  } catch (err) {
    console.error("❌ Failed to remove badword:", err);
    return false;
  } finally {
    client.release();
  }
}

async function getBadwords() {
  const client = await pool.connect();
  try {
    const result = await client.query(`SELECT word FROM badwords`);
    return result.rows.map(r => r.word);
  } catch (err) {
    console.error("❌ Failed to fetch badwords:", err);
    return [];
  } finally {
    client.release();
  }
}

module.exports = {
  initializeDatabase,
  getSettings,
  updateSetting,
  addSudoOwner,
  removeSudoOwner,
  getSudoOwners,
  isSudoOwner,
  addBadword,
  removeBadword,
  getBadwords
};
