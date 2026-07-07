import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

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
