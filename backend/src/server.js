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
import webpush from 'web-push';
import { pool, initSchema, getSetting, setSetting } from './db.js';
import { signToken, requireAuth, requireAdmin, requireApiKey, hashApiKey } from './auth.js';

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails('mailto:hello@caulis.czeddaru.dev', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

// same days/every ratio as statusOf() in caulis-core.jsx, and the same
// wateredAt-derivation rules as deriveWateredAt() — kept in sync by hand
// since this backend has no build step to share the frontend module with.
const DAY_MS = 86400000;
function todayMidnightUTC() { const d = new Date(); d.setUTCHours(0, 0, 0, 0); return d.getTime(); }
function midnightFromStamp(stamp) {
  const [y, m, d] = String(stamp).split('-').map(Number);
  return Date.UTC(y, (m || 1) - 1, d || 1);
}
function deriveWateredAt(p) {
  if (p.wv === 3 && typeof p.wateredAt === 'number') return p.wateredAt;
  const h = Array.isArray(p.history) ? p.history : [];
  if (h.length) return midnightFromStamp(h[h.length - 1]);
  return todayMidnightUTC() - (p.days || 0) * DAY_MS;
}
function plantNeedsWater(p) {
  if (typeof p.snoozedUntil === 'number' && todayMidnightUTC() < p.snoozedUntil) return false;
  const days = Math.max(0, Math.round((todayMidnightUTC() - deriveWateredAt(p)) / DAY_MS));
  const every = p.every || p.benchmark || 7;
  return days / every >= 1;
}

async function sendPush(sub, payload) {
  try {
    await webpush.sendNotification(sub.subscription, JSON.stringify(payload));
    return true;
  } catch (e) {
    if (e.statusCode === 404 || e.statusCode === 410) {
      await pool.query('DELETE FROM push_subscriptions WHERE id = $1', [sub.id]);
    }
    return false;
  }
}

async function checkAndSendPushes() {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return;
  // fires any time from 8am UTC onward (checked every 15 min, gated below by
  // last_*_sent_on so it only actually sends once per day) — 8am is a
  // reasonable "morning" slot without per-garden timezone data. Using >= 8
  // rather than === 8 means a process restart/crash that skips the 8am tick
  // still catches up later the same day instead of silently skipping it.
  if (new Date().getUTCHours() < 8) return;
  const todayStr = new Date().toISOString().slice(0, 10);
  const isMonday = new Date().getUTCDay() === 1;

  const { rows: subs } = await pool.query(
    `SELECT ps.*, gd.plants FROM push_subscriptions ps
     JOIN garden_data gd ON gd.garden_id = ps.garden_id
     WHERE ps.watering_enabled = true OR ps.digest_enabled = true`
  );

  for (const sub of subs) {
    const plants = Array.isArray(sub.plants) ? sub.plants : [];
    const needsWater = plants.filter(plantNeedsWater);

    if (sub.watering_enabled && needsWater.length && sub.last_watering_sent_on !== todayStr) {
      const body = needsWater.length === 1
        ? `${needsWater[0].name || 'A plant'} needs water today.`
        : `${needsWater.length} plants need water today.`;
      const ok = await sendPush(sub, { title: 'Caulis', body, tag: 'watering' });
      if (ok) await pool.query('UPDATE push_subscriptions SET last_watering_sent_on = $1 WHERE id = $2', [todayStr, sub.id]);
    }

    if (sub.digest_enabled && isMonday && sub.last_digest_sent_on !== todayStr) {
      const body = needsWater.length
        ? `${needsWater.length} of ${plants.length} plants need water this week.`
        : `All ${plants.length} plants are watered. Nice work.`;
      const ok = await sendPush(sub, { title: 'Weekly garden digest', body, tag: 'digest' });
      if (ok) await pool.query('UPDATE push_subscriptions SET last_digest_sent_on = $1 WHERE id = $2', [todayStr, sub.id]);
    }
  }
}

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

// lightweight in-memory per-IP sliding-window limiter for the unauthenticated
// garden-key endpoints (login/register/exists) — bcrypt already slows brute
// force per attempt, but nothing previously stopped a scripted loop of
// attempts, and /exists lets a key be probed for free before ever touching
// a password. No new dependency (fastify has no rate-limit plugin installed
// here); process-lifetime only, resets on restart — good enough for a
// single-instance personal box.
const rateBuckets = new Map();
function rateLimit(max, windowMs) {
  return async (req, reply) => {
    const ip = req.ip || 'unknown';
    const now = Date.now();
    const bucket = rateBuckets.get(ip);
    if (!bucket || now > bucket.resetAt) {
      rateBuckets.set(ip, { count: 1, resetAt: now + windowMs });
      return;
    }
    bucket.count++;
    if (bucket.count > max) return reply.code(429).send({ error: 'too many requests, slow down' });
  };
}
setInterval(() => {
  const now = Date.now();
  for (const [ip, b] of rateBuckets) if (now > b.resetAt) rateBuckets.delete(ip);
}, 5 * 60 * 1000);

await initSchema();

const BACKUP_CHECK_MS = 15 * 60 * 1000;
setInterval(checkAndRunBackup, BACKUP_CHECK_MS);
checkAndRunBackup();

const PUSH_CHECK_MS = 15 * 60 * 1000;
setInterval(() => checkAndSendPushes().catch(e => app.log.error({ err: e }, 'push check failed')), PUSH_CHECK_MS);

app.post('/api/gardens/register', { preHandler: rateLimit(20, 60000) }, async (req, reply) => {
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

app.post('/api/gardens/login', { preHandler: rateLimit(20, 60000) }, async (req, reply) => {
  const { key, password = '' } = req.body || {};
  if (!key) return reply.code(400).send({ error: 'key required' });

  const { rows } = await pool.query('SELECT id, password_hash FROM gardens WHERE key = $1', [key]);
  if (!rows.length) return reply.code(404).send({ error: 'garden not found' });

  const ok = await bcrypt.compare(password, rows[0].password_hash);
  if (!ok) return reply.code(401).send({ error: 'wrong password' });

  return { token: signToken(rows[0].id) };
});

app.get('/api/gardens/exists', { preHandler: rateLimit(60, 60000) }, async (req, reply) => {
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
    'SELECT plants, locations, queue, rev, updated_at FROM garden_data WHERE garden_id = $1',
    [req.gardenId]
  );
  if (!rows.length) return reply.code(404).send({ error: 'not found' });
  return rows[0];
});

// conditional write: the client sends the rev it last knew about. If the
// stored rev has moved on since (another device/session wrote in the
// meantime) this rejects with 409 + the current server state so the client
// can merge instead of blindly clobbering it. rev == null (older cached
// client) falls back to the old unconditional behavior rather than breaking
// it outright — the stale-shell update banner nudges those clients current.
// FOR UPDATE + a single transaction closes the read-then-write race between
// two requests that both read the same rev before either commits.
app.put('/api/garden', { preHandler: requireAuth }, async (req, reply) => {
  const { plants = [], locations = [], queue = [], rev } = req.body || {};
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      'SELECT rev, plants, locations, queue FROM garden_data WHERE garden_id = $1 FOR UPDATE',
      [req.gardenId]
    );
    if (!rows.length) { await client.query('ROLLBACK'); return reply.code(404).send({ error: 'not found' }); }
    const current = rows[0];
    if (rev != null && Number(rev) !== Number(current.rev)) {
      await client.query('ROLLBACK');
      return reply.code(409).send({
        error: 'conflict', plants: current.plants, locations: current.locations, queue: current.queue, rev: current.rev,
      });
    }
    const newRev = Number(current.rev) + 1;
    await client.query(
      `UPDATE garden_data SET plants = $1, locations = $2, queue = $3, rev = $4, updated_at = now()
       WHERE garden_id = $5`,
      [JSON.stringify(plants), JSON.stringify(locations), JSON.stringify(queue), newRev, req.gardenId]
    );
    await client.query('COMMIT');
    return { ok: true, rev: newRev };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
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

app.get('/api/push/vapid-key', async (req, reply) => {
  if (!VAPID_PUBLIC_KEY) return reply.code(503).send({ error: 'push not configured' });
  return { key: VAPID_PUBLIC_KEY };
});

app.post('/api/push/subscribe', { preHandler: requireAuth }, async (req, reply) => {
  const { subscription, wateringEnabled = true, digestEnabled = false } = req.body || {};
  if (!subscription?.endpoint) return reply.code(400).send({ error: 'subscription required' });
  await pool.query(
    `INSERT INTO push_subscriptions (garden_id, endpoint, subscription, watering_enabled, digest_enabled)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (endpoint) DO UPDATE SET
       garden_id = $1, subscription = $3, watering_enabled = $4, digest_enabled = $5`,
    [req.gardenId, subscription.endpoint, JSON.stringify(subscription), wateringEnabled, digestEnabled]
  );
  return { ok: true };
});

app.put('/api/push/prefs', { preHandler: requireAuth }, async (req, reply) => {
  const { endpoint, wateringEnabled, digestEnabled } = req.body || {};
  if (!endpoint) return reply.code(400).send({ error: 'endpoint required' });
  await pool.query(
    `UPDATE push_subscriptions SET
       watering_enabled = COALESCE($1, watering_enabled),
       digest_enabled = COALESCE($2, digest_enabled)
     WHERE endpoint = $3 AND garden_id = $4`,
    [wateringEnabled, digestEnabled, endpoint, req.gardenId]
  );
  return { ok: true };
});

app.delete('/api/push/subscribe', { preHandler: requireAuth }, async (req, reply) => {
  const { endpoint } = req.body || {};
  if (!endpoint) return reply.code(400).send({ error: 'endpoint required' });
  await pool.query('DELETE FROM push_subscriptions WHERE endpoint = $1 AND garden_id = $2', [endpoint, req.gardenId]);
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
  // admin override is intentionally unconditional (bypasses rev check), but
  // still bumps rev so a garden's own client doesn't spuriously 409 forever
  // against a rev it can no longer match.
  await pool.query(
    `UPDATE garden_data SET plants = $1, locations = $2, queue = $3, rev = rev + 1, updated_at = now() WHERE garden_id = $4`,
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

// ── Agent discoverability — llms.txt, ai-plugin.json, openapi.json ──
// Scoped strictly to the standalone Public API above (/api/v1/public/*):
// the garden endpoints carry a real user's personal plant data behind JWT
// auth and were never meant to be advertised for arbitrary agents to poke
// at. Kept hand-written and next to the routes they describe so a future
// route change is a one-file diff, not a stale doc somewhere else.
const PUBLIC_API_BASE = 'https://api.caulis.czeddaru.dev';

const OPENAPI_SPEC = {
  openapi: '3.1.0',
  info: {
    title: 'Caulis Public API',
    version: '1.0.0',
    description: 'Standalone plant-care API: species lookup and an AI plant-care chat proxy. Independent of the Caulis app\'s own garden/JWT auth — authenticate with an x-api-key issued by the Caulis admin.',
    contact: { url: 'https://caulis.czeddaru.dev' },
  },
  servers: [{ url: PUBLIC_API_BASE }],
  components: {
    securitySchemes: {
      ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'x-api-key' },
    },
    schemas: {
      Error: { type: 'object', properties: { error: { type: 'string' } } },
    },
  },
  security: [{ ApiKeyAuth: [] }],
  paths: {
    '/api/v1/public/plant-lookup': {
      get: {
        summary: 'Search plant species by name',
        description: "Wraps Perenual's species-list search. Requires the caller's own Perenual API key in x-upstream-key.",
        parameters: [
          { name: 'q', in: 'query', required: true, schema: { type: 'string' }, description: 'Species name or partial name to search' },
          { name: 'x-upstream-key', in: 'header', required: true, schema: { type: 'string' }, description: "Caller's own Perenual API key" },
        ],
        responses: {
          200: { description: 'Perenual species-list response, passed through unmodified' },
          400: { description: 'Missing q or x-upstream-key', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          401: { description: 'Missing/invalid/inactive x-api-key' },
          429: { description: 'Daily rate limit exceeded for this key' },
        },
      },
    },
    '/api/v1/public/plant-lookup/{id}': {
      get: {
        summary: 'Get full species detail by id',
        description: "Wraps Perenual's species detail endpoint. Requires the caller's own Perenual API key in x-upstream-key.",
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' }, description: 'Perenual species id (from plant-lookup results)' },
          { name: 'x-upstream-key', in: 'header', required: true, schema: { type: 'string' }, description: "Caller's own Perenual API key" },
        ],
        responses: {
          200: { description: 'Perenual species-detail response, passed through unmodified' },
          400: { description: 'Missing x-upstream-key', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          401: { description: 'Missing/invalid/inactive x-api-key' },
          429: { description: 'Daily rate limit exceeded for this key' },
        },
      },
    },
    '/api/v1/public/chat': {
      post: {
        summary: 'AI plant-care chat proxy',
        description: "Proxies to Anthropic's Messages API. Requires the caller's own Anthropic API key in the JSON body. Every other body field is forwarded to Anthropic as-is (model, messages, max_tokens, system, etc — see the Anthropic Messages API reference).",
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['anthropicKey', 'model', 'messages', 'max_tokens'],
                properties: {
                  anthropicKey: { type: 'string', description: "Caller's own Anthropic API key" },
                  model: { type: 'string', example: 'claude-haiku-4-5' },
                  max_tokens: { type: 'integer', example: 1024 },
                  messages: { type: 'array', items: { type: 'object' } },
                  system: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Anthropic Messages API response, passed through unmodified' },
          400: { description: 'Missing anthropicKey', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          401: { description: 'Missing/invalid/inactive x-api-key' },
          429: { description: 'Daily rate limit exceeded for this key' },
        },
      },
    },
    '/health': {
      get: { summary: 'Liveness check', security: [], responses: { 200: { description: 'Service is up' } } },
    },
  },
};

app.get('/openapi.json', async (req, reply) => {
  reply.header('access-control-allow-origin', '*');
  return OPENAPI_SPEC;
});

app.get('/.well-known/ai-plugin.json', async (req, reply) => {
  reply.header('access-control-allow-origin', '*');
  return {
    schema_version: 'v1',
    name_for_human: 'Caulis Public API',
    name_for_model: 'caulis_plant_api',
    description_for_human: 'Look up houseplant species care info and ask an AI plant-care assistant, via the API behind the Caulis plant tracker.',
    description_for_model: 'Use this API to search/retrieve houseplant species care data (light, watering frequency, images) and to ask a plant-care question through an AI chat proxy. Every call requires an x-api-key header (obtained from the Caulis admin). Species lookup calls additionally require the caller\'s own Perenual API key in x-upstream-key; the chat endpoint requires the caller\'s own Anthropic API key in the request body. Full schema at /openapi.json.',
    auth: { type: 'user_http', authorization_type: 'custom' },
    api: { type: 'openapi', url: `${PUBLIC_API_BASE}/openapi.json`, is_user_authenticated: false },
    logo_url: 'https://caulis.czeddaru.dev/icon-512.png',
    contact_email: 'hello@caulis.czeddaru.dev',
    legal_info_url: 'https://caulis.czeddaru.dev/docs.html',
  };
});

app.get('/llms.txt', async (req, reply) => {
  reply.header('access-control-allow-origin', '*');
  reply.type('text/plain; charset=utf-8');
  return `# Caulis

> Caulis is a personal houseplant care tracker (watering schedules, species care data, photo log). This is its backend API — a separate, standalone Public API is available for third-party agents and apps.

## Public API

Base URL: ${PUBLIC_API_BASE}
Auth: send \`x-api-key: ck_...\` on every request (issued by the Caulis admin). Each key has its own daily rate limit; over-limit calls get 429.

- GET /api/v1/public/plant-lookup?q={name} — search plant species by name (wraps Perenual). Also requires an \`x-upstream-key\` header with your own Perenual API key.
- GET /api/v1/public/plant-lookup/{id} — full species detail by id. Same x-upstream-key requirement.
- POST /api/v1/public/chat — AI plant-care chat proxy (wraps Anthropic's Messages API). Requires your own Anthropic API key as \`anthropicKey\` in the JSON body; every other field is forwarded to Anthropic as-is.
- GET /health — liveness check, no auth.

## Machine-readable docs

- OpenAPI spec: ${PUBLIC_API_BASE}/openapi.json
- Plugin manifest: ${PUBLIC_API_BASE}/.well-known/ai-plugin.json
- Human docs: https://caulis.czeddaru.dev/docs.html#public-api

## Notes for agents

- This API is BYO-key for upstream providers (Perenual, Anthropic) — Caulis does not supply those keys for you, only proxies the request and applies its own rate limit.
- The rest of the Caulis app (garden data, plant photos, watering history) sits behind separate per-garden JWT auth and is not part of this public surface — don't attempt to guess or brute-force garden credentials.
- CORS is open (Access-Control-Allow-Origin: *) on every route documented here, so browser-based agents can call it directly.
`;
});

const port = process.env.PORT || 3001;
app.listen({ port, host: '127.0.0.1' });
