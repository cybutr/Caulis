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

    INSERT INTO admin_settings (key, value) VALUES ('backup_interval_hours', '24') ON CONFLICT DO NOTHING;
    INSERT INTO admin_settings (key, value) VALUES ('backup_keep_count', '14') ON CONFLICT DO NOTHING;
  `);
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
