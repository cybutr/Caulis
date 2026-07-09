import 'dotenv/config';
import fs from 'fs';
import os from 'os';
import path from 'path';
import zlib from 'zlib';
import crypto from 'crypto';
import { spawn } from 'child_process';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import bcrypt from 'bcrypt';
import { pool, initSchema, getSetting, setSetting } from './db.js';
import { signToken, requireAuth, requireAdmin, requireApiKey, hashApiKey } from './auth.js';

// on-demand admin backups, dumped directly with the app's own DB credentials
// (no sudo, no root cron) — separate from the nightly root-cron full-DB dumps
// in /var/backups/postgres, which also cover the dormant discord_bot_db.
const BACKUP_DIR = path.join(import.meta.dirname, '..', 'backups');
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

function runBackupNow() {
  return new Promise((resolve, reject) => {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outPath = path.join(BACKUP_DIR, `caulis_${stamp}.sql.gz`);
    const dump = spawn('pg_dump', ['--dbname', process.env.DATABASE_URL]);
    const gzip = zlib.createGzip();
    const out = fs.createWriteStream(outPath);
    let stderr = '';
    dump.stderr.on('data', (d) => { stderr += d; });
    dump.stdout.pipe(gzip).pipe(out);
    dump.on('error', reject);
    out.on('finish', async () => {
      if (dump.exitCode && dump.exitCode !== 0) return reject(new Error(stderr || 'pg_dump failed'));
      const keep = Number(await getSetting('backup_keep_count')) || 14;
      const files = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.sql.gz')).sort().reverse();
      for (const f of files.slice(keep)) fs.unlinkSync(path.join(BACKUP_DIR, f));
      resolve(outPath);
    });
  });
}

function latestBackupTime() {
  const files = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.sql.gz'));
  if (!files.length) return null;
  const mtimes = files.map(f => fs.statSync(path.join(BACKUP_DIR, f)).mtime.getTime());
  return new Date(Math.max(...mtimes));
}

async function checkAndRunBackup() {
  try {
    const intervalHours = Number(await getSetting('backup_interval_hours')) || 24;
    const last = latestBackupTime();
    const dueAt = last ? last.getTime() + intervalHours * 3600 * 1000 : 0;
    if (Date.now() < dueAt) return;
    const outPath = await runBackupNow();
    app.log.info({ outPath }, 'scheduled backup completed');
  } catch (e) {
    app.log.error({ err: e }, 'scheduled backup failed');
  }
}

const app = Fastify({ logger: true });
await app.register(cors, { origin: true });

// simple in-memory request counter — process-lifetime totals, no persistence,
// good enough for a "requests since boot / per minute" tile without a metrics stack
const bootTime = Date.now();
let requestCount = 0;
app.addHook('onRequest', async () => { requestCount++; });

await initSchema();

const BACKUP_CHECK_MS = 15 * 60 * 1000;
setInterval(checkAndRunBackup, BACKUP_CHECK_MS);
checkAndRunBackup();

app.post('/api/gardens/register', async (req, reply) => {
  const { key, password = '' } = req.body || {};
  if (!key) return reply.code(400).send({ error: 'key required' });

  const existing = await pool.query('SELECT id FROM gardens WHERE key = $1', [key]);
  if (existing.rows.length) return reply.code(409).send({ error: 'garden key already taken' });

  const hash = await bcrypt.hash(password, 12);
  const { rows } = await pool.query(
    'INSERT INTO gardens (key, password_hash) VALUES ($1, $2) RETURNING id',
    [key, hash]
  );
  const gardenId = rows[0].id;
  await pool.query('INSERT INTO garden_data (garden_id) VALUES ($1)', [gardenId]);
  return { token: signToken(gardenId) };
});

app.post('/api/gardens/login', async (req, reply) => {
  const { key, password = '' } = req.body || {};
  if (!key) return reply.code(400).send({ error: 'key required' });

  const { rows } = await pool.query('SELECT id, password_hash FROM gardens WHERE key = $1', [key]);
  if (!rows.length) return reply.code(404).send({ error: 'garden not found' });

  const ok = await bcrypt.compare(password, rows[0].password_hash);
  if (!ok) return reply.code(401).send({ error: 'wrong password' });

  return { token: signToken(rows[0].id) };
});

app.get('/api/gardens/exists', async (req, reply) => {
  const key = req.query.key || '';
  if (!key) return reply.code(400).send({ error: 'key required' });
  const { rows } = await pool.query('SELECT id FROM gardens WHERE key = $1', [key]);
  return { exists: rows.length > 0 };
});

// one-time recovery for gardens migrated from Firebase. Each migrated garden
// keeps its old sha256(key+password) node hash in legacy_node_hash (its `key`
// column already holds a readable placeholder, unrelated to the hash). A
// returning device's real key+password hashes to that same legacy value, so
// this lets it silently adopt the row under its real key + chosen password.
app.post('/api/gardens/claim', async (req, reply) => {
  const { oldKey, newKey, newPassword = '' } = req.body || {};
  if (!oldKey || !newKey) return reply.code(400).send({ error: 'oldKey and newKey required' });

  const { rows } = await pool.query('SELECT id, unclaimed FROM gardens WHERE legacy_node_hash = $1', [oldKey]);
  if (!rows.length || !rows[0].unclaimed) return reply.code(404).send({ error: 'nothing to claim' });

  const conflict = await pool.query('SELECT id FROM gardens WHERE key = $1', [newKey]);
  if (conflict.rows.length) return reply.code(409).send({ error: 'new key already taken' });

  const hash = await bcrypt.hash(newPassword, 12);
  await pool.query('UPDATE gardens SET key = $1, password_hash = $2, unclaimed = false WHERE id = $3', [newKey, hash, rows[0].id]);
  return { token: signToken(rows[0].id) };
});

app.patch('/api/gardens/password', { preHandler: requireAuth }, async (req, reply) => {
  const { newPassword = '' } = req.body || {};
  const hash = await bcrypt.hash(newPassword, 12);
  await pool.query('UPDATE gardens SET password_hash = $1 WHERE id = $2', [hash, req.gardenId]);
  return { ok: true };
});

app.delete('/api/gardens/me', { preHandler: requireAuth }, async (req, reply) => {
  await pool.query('DELETE FROM gardens WHERE id = $1', [req.gardenId]);
  return { ok: true };
});

app.get('/api/garden', { preHandler: requireAuth }, async (req, reply) => {
  const { rows } = await pool.query(
    'SELECT plants, locations, queue, updated_at FROM garden_data WHERE garden_id = $1',
    [req.gardenId]
  );
  if (!rows.length) return reply.code(404).send({ error: 'not found' });
  return rows[0];
});

app.put('/api/garden', { preHandler: requireAuth }, async (req, reply) => {
  const { plants = [], locations = [], queue = [] } = req.body || {};
  await pool.query(
    `UPDATE garden_data SET plants = $1, locations = $2, queue = $3, updated_at = now()
     WHERE garden_id = $4`,
    [JSON.stringify(plants), JSON.stringify(locations), JSON.stringify(queue), req.gardenId]
  );
  return { ok: true };
});

app.put('/api/garden/keys', { preHandler: requireAuth }, async (req, reply) => {
  const { perenualKey, anthropicKey, plantIdKey, housePlantsKey } = req.body || {};
  await pool.query(
    `UPDATE gardens SET
       perenual_key = COALESCE($1, perenual_key),
       anthropic_key = COALESCE($2, anthropic_key),
       plant_id_key = COALESCE($3, plant_id_key),
       house_plants_key = COALESCE($4, house_plants_key)
     WHERE id = $5`,
    [perenualKey || null, anthropicKey || null, plantIdKey || null, housePlantsKey || null, req.gardenId]
  );
  return { ok: true };
});

app.get('/api/garden/keys/status', { preHandler: requireAuth }, async (req, reply) => {
  const { rows } = await pool.query(
    `SELECT perenual_key IS NOT NULL AS "hasPerenual",
            anthropic_key IS NOT NULL AS "hasAnthropic",
            plant_id_key IS NOT NULL AS "hasPlantId",
            house_plants_key IS NOT NULL AS "hasHousePlants"
     FROM gardens WHERE id = $1`,
    [req.gardenId]
  );
  return rows[0];
});

async function getGardenKeys(gardenId) {
  const { rows } = await pool.query(
    'SELECT perenual_key, anthropic_key, plant_id_key, house_plants_key FROM gardens WHERE id = $1',
    [gardenId]
  );
  return rows[0] || {};
}

app.post('/api/ai/messages', { preHandler: requireAuth }, async (req, reply) => {
  const { anthropic_key } = await getGardenKeys(req.gardenId);
  if (!anthropic_key) return reply.code(400).send({ error: 'no anthropic key set for this garden' });

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': anthropic_key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(req.body),
  });
  const data = await r.json();
  return reply.code(r.status).send(data);
});

app.get('/api/perenual/search', { preHandler: requireAuth }, async (req, reply) => {
  const { perenual_key } = await getGardenKeys(req.gardenId);
  if (!perenual_key) return reply.code(400).send({ error: 'no perenual key set for this garden' });

  const q = req.query.q || '';
  const r = await fetch(`https://perenual.com/api/v2/species-list?q=${encodeURIComponent(q)}&key=${perenual_key}`);
  const data = await r.json();
  return reply.code(r.status).send(data);
});

app.get('/api/perenual/species/:id', { preHandler: requireAuth }, async (req, reply) => {
  const { perenual_key } = await getGardenKeys(req.gardenId);
  if (!perenual_key) return reply.code(400).send({ error: 'no perenual key set for this garden' });

  const r = await fetch(`https://perenual.com/api/v2/species/details/${req.params.id}?key=${perenual_key}`);
  const data = await r.json();
  return reply.code(r.status).send(data);
});

app.put('/api/garden/photos/:plantId', { preHandler: requireAuth }, async (req, reply) => {
  const { photos = [] } = req.body || {};
  await pool.query(
    `INSERT INTO garden_photos (garden_id, plant_id, photos) VALUES ($1, $2, $3)
     ON CONFLICT (garden_id, plant_id) DO UPDATE SET photos = $3`,
    [req.gardenId, req.params.plantId, JSON.stringify(photos)]
  );
  return { ok: true };
});

app.get('/api/garden/photos/:plantId', { preHandler: requireAuth }, async (req, reply) => {
  const { rows } = await pool.query(
    'SELECT photos FROM garden_photos WHERE garden_id = $1 AND plant_id = $2',
    [req.gardenId, req.params.plantId]
  );
  return { photos: rows.length ? rows[0].photos : [] };
});

app.delete('/api/garden/photos/:plantId', { preHandler: requireAuth }, async (req, reply) => {
  await pool.query('DELETE FROM garden_photos WHERE garden_id = $1 AND plant_id = $2', [req.gardenId, req.params.plantId]);
  return { ok: true };
});

app.get('/api/admin/gardens', { preHandler: requireAdmin }, async (req, reply) => {
  const { rows } = await pool.query(`
    SELECT g.id, g.key, g.unclaimed, g.created_at,
           coalesce(jsonb_array_length(gd.plants), 0) AS plant_count,
           gd.updated_at
    FROM gardens g
    LEFT JOIN garden_data gd ON gd.garden_id = g.id
    ORDER BY g.created_at DESC
  `);
  return { gardens: rows };
});

app.get('/api/admin/gardens/:key', { preHandler: requireAdmin }, async (req, reply) => {
  const { rows } = await pool.query('SELECT id FROM gardens WHERE key = $1', [req.params.key]);
  if (!rows.length) return reply.code(404).send({ error: 'not found' });
  const { rows: data } = await pool.query(
    'SELECT plants, locations, queue, updated_at FROM garden_data WHERE garden_id = $1',
    [rows[0].id]
  );
  return data[0] || { plants: [], locations: [], queue: [] };
});

app.put('/api/admin/gardens/:key', { preHandler: requireAdmin }, async (req, reply) => {
  const { rows } = await pool.query('SELECT id FROM gardens WHERE key = $1', [req.params.key]);
  if (!rows.length) return reply.code(404).send({ error: 'not found' });
  const { plants = [], locations = [], queue = [] } = req.body || {};
  await pool.query(
    `UPDATE garden_data SET plants = $1, locations = $2, queue = $3, updated_at = now() WHERE garden_id = $4`,
    [JSON.stringify(plants), JSON.stringify(locations), JSON.stringify(queue), rows[0].id]
  );
  return { ok: true };
});

app.delete('/api/admin/gardens/:key', { preHandler: requireAdmin }, async (req, reply) => {
  await pool.query('DELETE FROM gardens WHERE key = $1', [req.params.key]);
  return { ok: true };
});

app.post('/api/admin/gardens/bulk-delete', { preHandler: requireAdmin }, async (req, reply) => {
  const { filter } = req.body || {};
  let result;
  if (filter === 'unclaimed') {
    result = await pool.query('DELETE FROM gardens WHERE unclaimed = true RETURNING id');
  } else if (filter === 'empty') {
    result = await pool.query(`
      DELETE FROM gardens g USING garden_data gd
      WHERE gd.garden_id = g.id AND coalesce(jsonb_array_length(gd.plants), 0) = 0
      RETURNING g.id
    `);
  } else {
    return reply.code(400).send({ error: 'filter must be "unclaimed" or "empty"' });
  }
  return { ok: true, deleted: result.rows.length };
});

app.get('/api/admin/stats', { preHandler: requireAdmin }, async (req, reply) => {
  const [totals, gardensPerDay, topSpecies, mostActive] = await Promise.all([
    pool.query(`
      SELECT
        (SELECT count(*) FROM gardens) AS total_gardens,
        (SELECT count(*) FROM gardens WHERE unclaimed) AS unclaimed_count,
        (SELECT coalesce(sum(jsonb_array_length(plants)), 0) FROM garden_data) AS total_plants,
        (SELECT count(*) FROM garden_photos) AS total_photo_sets
    `),
    pool.query(`
      SELECT date_trunc('day', created_at)::date AS day, count(*) AS count
      FROM gardens GROUP BY day ORDER BY day DESC LIMIT 14
    `),
    pool.query(`
      SELECT elem->>'name' AS name, count(*) AS count
      FROM garden_data, jsonb_array_elements(plants) elem
      WHERE elem->>'name' IS NOT NULL AND elem->>'name' != ''
      GROUP BY name ORDER BY count(*) DESC LIMIT 10
    `),
    pool.query(`
      SELECT g.key, g.unclaimed, gd.updated_at, coalesce(jsonb_array_length(gd.plants), 0) AS plant_count
      FROM gardens g JOIN garden_data gd ON gd.garden_id = g.id
      ORDER BY gd.updated_at DESC LIMIT 10
    `),
  ]);
  const t = totals.rows[0];
  return {
    totalGardens: Number(t.total_gardens),
    unclaimedCount: Number(t.unclaimed_count),
    totalPlants: Number(t.total_plants),
    totalPhotoSets: Number(t.total_photo_sets),
    avgPlantsPerGarden: t.total_gardens > 0 ? +(t.total_plants / t.total_gardens).toFixed(1) : 0,
    gardensPerDay: gardensPerDay.rows,
    topSpecies: topSpecies.rows,
    mostActive: mostActive.rows,
  };
});

app.get('/api/admin/system', { preHandler: requireAdmin }, async (req, reply) => {
  const mem = process.memoryUsage();
  let dbSizeBytes = null;
  try {
    const { rows } = await pool.query('SELECT pg_database_size(current_database()) AS size');
    dbSizeBytes = Number(rows[0].size);
  } catch (e) {}
  let backupDirBytes = 0;
  try {
    backupDirBytes = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.endsWith('.sql.gz'))
      .reduce((sum, f) => sum + fs.statSync(path.join(BACKUP_DIR, f)).size, 0);
  } catch (e) {}
  const uptimeSec = process.uptime();
  return {
    uptimeSec,
    bootedAt: new Date(bootTime).toISOString(),
    nodeVersion: process.version,
    memory: { rss: mem.rss, heapUsed: mem.heapUsed, heapTotal: mem.heapTotal, external: mem.external },
    loadavg: os.loadavg(),
    cpuCount: os.cpus().length,
    pool: { total: pool.totalCount, idle: pool.idleCount, waiting: pool.waitingCount },
    dbSizeBytes,
    backupDirBytes,
    requestCount,
    requestsPerMin: uptimeSec > 0 ? +(requestCount / (uptimeSec / 60)).toFixed(2) : 0,
  };
});

app.get('/api/admin/settings', { preHandler: requireAdmin }, async (req, reply) => {
  return {
    backupIntervalHours: Number(await getSetting('backup_interval_hours')) || 24,
    backupKeepCount: Number(await getSetting('backup_keep_count')) || 14,
  };
});

app.put('/api/admin/settings', { preHandler: requireAdmin }, async (req, reply) => {
  const { backupIntervalHours, backupKeepCount } = req.body || {};
  if (backupIntervalHours != null) await setSetting('backup_interval_hours', Math.max(1, backupIntervalHours | 0));
  if (backupKeepCount != null) await setSetting('backup_keep_count', Math.max(1, backupKeepCount | 0));
  return { ok: true };
});

app.post('/api/admin/backup/run', { preHandler: requireAdmin }, async (req, reply) => {
  try {
    const outPath = await runBackupNow();
    return { ok: true, file: path.basename(outPath) };
  } catch (e) {
    return reply.code(500).send({ error: e.message });
  }
});

app.get('/api/admin/backup/list', { preHandler: requireAdmin }, async (req, reply) => {
  const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.endsWith('.sql.gz'))
    .map(f => {
      const stat = fs.statSync(path.join(BACKUP_DIR, f));
      return { name: f, size: stat.size, createdAt: stat.mtime };
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return { files };
});

app.get('/api/admin/backup/download/:name', { preHandler: requireAdmin }, async (req, reply) => {
  const name = path.basename(req.params.name);
  const filePath = path.join(BACKUP_DIR, name);
  if (!name.endsWith('.sql.gz') || !fs.existsSync(filePath)) return reply.code(404).send({ error: 'not found' });
  reply.header('content-disposition', `attachment; filename="${name}"`);
  return reply.type('application/gzip').send(fs.createReadStream(filePath));
});

// short-lived, single-use token standing in for a localStorage migration
// payload — avoids embedding the whole thing in a URL, which got mangled or
// rejected ("address invalid") when copy-pasted through messaging apps or
// hit iOS URL-length quirks.
app.post('/api/migrate', async (req, reply) => {
  const payload = req.body || {};
  const token = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
  await pool.query('INSERT INTO migration_tokens (token, payload) VALUES ($1, $2)', [token, JSON.stringify(payload)]);
  pool.query("DELETE FROM migration_tokens WHERE created_at < now() - interval '24 hours'").catch(() => {});
  return { token };
});

app.get('/api/migrate/:token', async (req, reply) => {
  const { rows } = await pool.query('DELETE FROM migration_tokens WHERE token = $1 RETURNING payload', [req.params.token]);
  if (!rows.length) return reply.code(404).send({ error: 'not found or already used' });
  return { payload: rows[0].payload };
});

// ── general-purpose tools, unrelated to gardens — free to reuse on any
// future project pointed at this box, no auth since there's nothing
// sensitive here beyond whatever the caller pastes in ──

app.post('/api/tools/paste', async (req, reply) => {
  const { content, ttlMinutes = 1440 } = req.body || {};
  if (typeof content !== 'string' || !content) return reply.code(400).send({ error: 'content required' });
  if (content.length > 200000) return reply.code(413).send({ error: 'content too large (200KB max)' });
  const code = crypto.randomUUID().replace(/-/g, '').slice(0, 8);
  const ttl = Math.min(43200, Math.max(1, ttlMinutes | 0)); // 1 min .. 30 days
  await pool.query(
    `INSERT INTO pastes (code, content, expires_at) VALUES ($1, $2, now() + ($3 || ' minutes')::interval)`,
    [code, content, ttl]
  );
  pool.query("DELETE FROM pastes WHERE expires_at < now()").catch(() => {});
  return { code };
});

app.get('/api/tools/paste/:code', async (req, reply) => {
  const { rows } = await pool.query(
    'SELECT content, expires_at FROM pastes WHERE code = $1 AND expires_at > now()',
    [req.params.code]
  );
  if (!rows.length) return reply.code(404).send({ error: 'not found or expired' });
  return { content: rows[0].content, expiresAt: rows[0].expires_at };
});

app.post('/api/tools/shorten', async (req, reply) => {
  const { url } = req.body || {};
  if (typeof url !== 'string' || !/^https?:\/\//.test(url)) return reply.code(400).send({ error: 'a valid http(s) url is required' });
  const code = crypto.randomUUID().replace(/-/g, '').slice(0, 7);
  await pool.query('INSERT INTO shortlinks (code, url) VALUES ($1, $2)', [code, url]);
  return { code, shortUrl: `https://${req.hostname}/s/${code}` };
});

app.get('/s/:code', async (req, reply) => {
  const { rows } = await pool.query(
    'UPDATE shortlinks SET hits = hits + 1 WHERE code = $1 RETURNING url',
    [req.params.code]
  );
  if (!rows.length) return reply.code(404).send({ error: 'not found' });
  return reply.redirect(rows[0].url, 302);
});

app.get('/api/tools/shorten/:code/stats', async (req, reply) => {
  const { rows } = await pool.query('SELECT url, hits, created_at FROM shortlinks WHERE code = $1', [req.params.code]);
  if (!rows.length) return reply.code(404).send({ error: 'not found' });
  return rows[0];
});

// ── Public API key management (admin-only) ──

app.post('/api/admin/api-keys', { preHandler: requireAdmin }, async (req, reply) => {
  const { label, rateLimitPerDay = 200 } = req.body || {};
  if (!label) return reply.code(400).send({ error: 'label required' });
  const rawKey = `ck_${crypto.randomBytes(24).toString('hex')}`;
  const hash = hashApiKey(rawKey);
  const { rows } = await pool.query(
    'INSERT INTO api_keys (key_hash, label, rate_limit_per_day) VALUES ($1, $2, $3) RETURNING id, label, rate_limit_per_day, created_at',
    [hash, label, Math.max(1, rateLimitPerDay | 0)]
  );
  return { ...rows[0], key: rawKey };
});

app.get('/api/admin/api-keys', { preHandler: requireAdmin }, async (req, reply) => {
  const { rows } = await pool.query(
    'SELECT id, label, rate_limit_per_day, request_count, count_day, active, created_at, last_used_at FROM api_keys ORDER BY created_at DESC'
  );
  return { keys: rows };
});

app.patch('/api/admin/api-keys/:id', { preHandler: requireAdmin }, async (req, reply) => {
  const { active, rateLimitPerDay } = req.body || {};
  if (active != null) await pool.query('UPDATE api_keys SET active = $1 WHERE id = $2', [!!active, req.params.id]);
  if (rateLimitPerDay != null) await pool.query('UPDATE api_keys SET rate_limit_per_day = $1 WHERE id = $2', [Math.max(1, rateLimitPerDay | 0), req.params.id]);
  return { ok: true };
});

app.delete('/api/admin/api-keys/:id', { preHandler: requireAdmin }, async (req, reply) => {
  await pool.query('DELETE FROM api_keys WHERE id = $1', [req.params.id]);
  return { ok: true };
});

// ── Public Developer API (/api/v1/public) — third-party product surface,
// authenticated via x-api-key, independent of garden JWT auth ──

app.get('/api/v1/public/plant-lookup', { preHandler: requireApiKey }, async (req, reply) => {
  const { q } = req.query;
  const perenualKey = req.headers['x-upstream-key'];
  if (!q) return reply.code(400).send({ error: 'q (species query) required' });
  if (!perenualKey) return reply.code(400).send({ error: 'x-upstream-key header required — pass your own Perenual API key' });

  const r = await fetch(`https://perenual.com/api/v2/species-list?q=${encodeURIComponent(q)}&key=${perenualKey}`);
  const data = await r.json();
  return reply.code(r.status).send(data);
});

app.get('/api/v1/public/plant-lookup/:id', { preHandler: requireApiKey }, async (req, reply) => {
  const perenualKey = req.headers['x-upstream-key'];
  if (!perenualKey) return reply.code(400).send({ error: 'x-upstream-key header required — pass your own Perenual API key' });

  const r = await fetch(`https://perenual.com/api/v2/species/details/${req.params.id}?key=${perenualKey}`);
  const data = await r.json();
  return reply.code(r.status).send(data);
});

app.post('/api/v1/public/chat', { preHandler: requireApiKey }, async (req, reply) => {
  const { anthropicKey, ...body } = req.body || {};
  if (!anthropicKey) return reply.code(400).send({ error: 'anthropicKey required — pass your own Anthropic API key' });

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': anthropicKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });
  const data = await r.json();
  return reply.code(r.status).send(data);
});

app.get('/health', async () => ({ ok: true }));

const port = process.env.PORT || 3001;
app.listen({ port, host: '127.0.0.1' });
