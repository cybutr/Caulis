import pg from 'pg';

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function initSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS gardens (
      id SERIAL PRIMARY KEY,
      key TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      perenual_key TEXT,
      anthropic_key TEXT,
      plant_id_key TEXT,
      house_plants_key TEXT,
      unclaimed BOOLEAN DEFAULT false,
      legacy_node_hash TEXT UNIQUE,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS garden_data (
      garden_id INTEGER PRIMARY KEY REFERENCES gardens(id) ON DELETE CASCADE,
      plants JSONB DEFAULT '[]',
      locations JSONB DEFAULT '[]',
      queue JSONB DEFAULT '[]',
      updated_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS garden_photos (
      garden_id INTEGER NOT NULL REFERENCES gardens(id) ON DELETE CASCADE,
      plant_id TEXT NOT NULL,
      photos JSONB DEFAULT '[]',
      PRIMARY KEY (garden_id, plant_id)
    );

    CREATE TABLE IF NOT EXISTS admin_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS migration_tokens (
      token TEXT PRIMARY KEY,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    -- general-purpose tools, unrelated to gardens — reusable on this same
    -- infra for whatever comes next
    CREATE TABLE IF NOT EXISTS pastes (
      code TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now(),
      expires_at TIMESTAMPTZ NOT NULL
    );
    CREATE TABLE IF NOT EXISTS shortlinks (
      code TEXT PRIMARY KEY,
      url TEXT NOT NULL,
      hits INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    -- third-party API keys for the standalone public API product, separate
    -- from garden JWT auth. key itself is never stored, only its sha256 hash.
    CREATE TABLE IF NOT EXISTS api_keys (
      id SERIAL PRIMARY KEY,
      key_hash TEXT UNIQUE NOT NULL,
      label TEXT NOT NULL,
      rate_limit_per_day INTEGER NOT NULL DEFAULT 200,
      request_count INTEGER NOT NULL DEFAULT 0,
      count_day DATE NOT NULL DEFAULT CURRENT_DATE,
      active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT now(),
      last_used_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id SERIAL PRIMARY KEY,
      garden_id INTEGER NOT NULL REFERENCES gardens(id) ON DELETE CASCADE,
      endpoint TEXT UNIQUE NOT NULL,
      subscription JSONB NOT NULL,
      watering_enabled BOOLEAN NOT NULL DEFAULT true,
      digest_enabled BOOLEAN NOT NULL DEFAULT false,
      last_watering_sent_on DATE,
      last_digest_sent_on DATE,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    INSERT INTO admin_settings (key, value) VALUES ('backup_interval_hours', '24') ON CONFLICT DO NOTHING;
    INSERT INTO admin_settings (key, value) VALUES ('backup_keep_count', '14') ON CONFLICT DO NOTHING;
  `);

  // additive, backward-compatible: existing rows default to rev 1 (their
  // current content becomes the baseline), no downtime, no data loss.
  // Powers conditional-write conflict detection on PUT /api/garden.
  await pool.query(`ALTER TABLE garden_data ADD COLUMN IF NOT EXISTS rev INTEGER NOT NULL DEFAULT 1`);

  // which language to write the push notification copy in for this
  // subscription — mirrors the client's own Czech-mode toggle, sent along at
  // subscribe time and whenever the toggle changes.
  await pool.query(`ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS lang TEXT NOT NULL DEFAULT 'en'`);

  // bumped on password change so every previously issued bearer token (90-day
  // expiry) is invalidated in one step — without this, a leaked/stolen token
  // keeps working for months after the owner reacts and changes the password.
  await pool.query(`ALTER TABLE gardens ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0`);

  // earned achievement badges: [{id, earnedAt}] — append-only, never edited in
  // place, so it merges as a plain union across devices with no conflict logic
  await pool.query(`ALTER TABLE garden_data ADD COLUMN IF NOT EXISTS badges JSONB DEFAULT '[]'`);
}

export async function getSetting(key) {
  const { rows } = await pool.query('SELECT value FROM admin_settings WHERE key = $1', [key]);
  return rows[0]?.value ?? null;
}

export async function setSetting(key, value) {
  await pool.query(
    `INSERT INTO admin_settings (key, value) VALUES ($1, $2)
     ON CONFLICT (key) DO UPDATE SET value = $2`,
    [key, String(value)]
  );
}
