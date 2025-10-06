// auth.js
import admin from 'firebase-admin';

export async function optionalAuth(req, res, next) {
  const header = req.header('Authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return next(); // no token → treat as anonymous

  try {
    const decoded = await admin.auth().verifyIdToken(match[1]);
    req.user = { uid: decoded.uid };
  } catch {
    // invalid/expired token → ignore and continue as anonymous
  }
  next();
}

// certain routes that require auth:
export function requireAuth(req, res, next) {
  if (!req.user?.uid) return res.status(401).json({ error: 'Auth required' });
  next();
}
