import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { pool } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET;

export function hashApiKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

export function signToken(gardenId) {
  return jwt.sign({ gardenId }, JWT_SECRET, { expiresIn: '90d' });
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

export async function requireAuth(req, reply) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return reply.code(401).send({ error: 'missing token' });
  try {
    req.gardenId = verifyToken(token).gardenId;
  } catch (e) {
    return reply.code(401).send({ error: 'invalid token' });
  }
}

export async function requireAdmin(req, reply) {
  // query param fallback exists only so a plain <a href=download> link works —
  // it can't set a custom header. Every other admin call uses the header.
  const secret = req.headers['x-admin-secret'] || req.query?.secret;
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return reply.code(401).send({ error: 'invalid admin secret' });
  }
}

export async function requireApiKey(req, reply) {
  const key = req.headers['x-api-key'];
  if (!key) return reply.code(401).send({ error: 'missing x-api-key header' });

  const hash = hashApiKey(key);
  const { rows } = await pool.query('SELECT * FROM api_keys WHERE key_hash = $1', [hash]);
  if (!rows.length || !rows[0].active) return reply.code(401).send({ error: 'invalid api key' });

  const row = rows[0];
  const today = new Date().toISOString().slice(0, 10);
  const sameDay = new Date(row.count_day).toISOString().slice(0, 10) === today;
  const count = sameDay ? row.request_count : 0;

  if (count >= row.rate_limit_per_day) {
    return reply.code(429).send({ error: 'rate limit exceeded', limit: row.rate_limit_per_day });
  }

  await pool.query(
    `UPDATE api_keys SET
       request_count = $1,
       count_day = CURRENT_DATE,
       last_used_at = now()
     WHERE id = $2`,
    [count + 1, row.id]
  );
  req.apiKeyId = row.id;
  req.apiKeyLabel = row.label;
}
