import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { pool } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET;

export function hashApiKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

export function signToken(gardenId, tokenVersion = 0) {
  return jwt.sign({ gardenId, tv: tokenVersion }, JWT_SECRET, { expiresIn: '90d' });
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

// narrow, short-lived token embedded in a push notification's "mark as
// watered" action — scoped to one plant, one purpose, and expires quickly so
// a stale/lingering notification can't be used to water the wrong day.
export function signActionToken(gardenId, plantId, action) {
  return jwt.sign({ gardenId, plantId, action, kind: 'push-action' }, JWT_SECRET, { expiresIn: '36h' });
}

export function verifyActionToken(token) {
  const claims = jwt.verify(token, JWT_SECRET);
  if (claims.kind !== 'push-action') throw new Error('not an action token');
  return claims;
}

export async function requireAuth(req, reply) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return reply.code(401).send({ error: 'missing token' });
  let claims;
  try {
    claims = verifyToken(token);
  } catch (e) {
    return reply.code(401).send({ error: 'invalid token' });
  }
  // a token's tv claim must still match the garden's current token_version —
  // password changes bump that counter, so this is what actually revokes
  // every token issued before the change instead of trusting the 90-day JWT
  // expiry alone.
  const { rows } = await pool.query('SELECT token_version FROM gardens WHERE id = $1', [claims.gardenId]);
  if (!rows.length || (claims.tv || 0) !== rows[0].token_version) {
    return reply.code(401).send({ error: 'token revoked' });
  }
  req.gardenId = claims.gardenId;
}

function timingSafeStringEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export async function requireAdmin(req, reply) {
  // query param fallback exists only so a plain <a href=download> link works —
  // it can't set a custom header. Every other admin call uses the header.
  const secret = req.headers['x-admin-secret'] || req.query?.secret;
  if (!secret || !process.env.ADMIN_SECRET || !timingSafeStringEqual(secret, process.env.ADMIN_SECRET)) {
    return reply.code(401).send({ error: 'invalid admin secret' });
  }
}

export async function requireApiKey(req, reply) {
  const key = req.headers['x-api-key'];
  if (!key) return reply.code(401).send({ error: 'missing x-api-key header' });

  const hash = hashApiKey(key);
  // single atomic UPDATE does the day-rollover, the limit check, and the
  // increment in one round trip — avoids the read-then-write race a
  // separate SELECT + UPDATE would have under concurrent requests from the
  // same key, which could otherwise blow past rate_limit_per_day.
  const { rows } = await pool.query(
    `UPDATE api_keys SET
       request_count = CASE WHEN count_day = CURRENT_DATE THEN request_count + 1 ELSE 1 END,
       count_day = CURRENT_DATE,
       last_used_at = now()
     WHERE key_hash = $1 AND active = true
       AND (count_day != CURRENT_DATE OR request_count < rate_limit_per_day)
     RETURNING id, label, rate_limit_per_day, request_count`,
    [hash]
  );

  if (rows.length) {
    req.apiKeyId = rows[0].id;
    req.apiKeyLabel = rows[0].label;
    return;
  }

  // update matched nothing — figure out why, without a second race window
  const { rows: check } = await pool.query('SELECT active, rate_limit_per_day FROM api_keys WHERE key_hash = $1', [hash]);
  if (!check.length || !check[0].active) return reply.code(401).send({ error: 'invalid api key' });
  return reply.code(429).send({ error: 'rate limit exceeded', limit: check[0].rate_limit_per_day, retryAfter: 'resets at next UTC midnight' });
}
