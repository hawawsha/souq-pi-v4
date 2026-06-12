/**
 * Shared security utilities for all API routes.
 * Import and apply at the top of every handler.
 */

/** Strip dangerous characters from user-supplied strings */
export function sanitize(val, maxLen = 200) {
  if (typeof val !== 'string') return '';
  return val.trim().slice(0, maxLen).replace(/[<>"'`\\]/g, '');
}

/** Validate and return ADMIN_SECRET_KEY. Returns false + 401 if invalid. */
export function checkAdmin(req, res) {
  const supplied = (req.headers['x-admin-key'] || '').toString().trim();
  const expected = process.env.ADMIN_SECRET_KEY;
  if (!expected || !supplied || supplied !== expected) {
    res.status(401).json({ error: 'غير مصرح' });
    return false;
  }
  return true;
}

/** Security headers on every response */
export function secHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-XSS-Protection', '1; mode=block');
}

/** Reject bodies that are too large (default 8 KB) */
export function sizeGuard(req, res, maxBytes = 8_000) {
  const cl = parseInt(req.headers['content-length'] || '0', 10);
  if (!isNaN(cl) && cl > maxBytes) {
    res.status(413).json({ error: 'الطلب كبير جداً' });
    return false;
  }
  return true;
}

/** Stellar/Pi wallet: G + 55 uppercase base-32 chars */
export function isValidWallet(addr) {
  return typeof addr === 'string' && /^G[A-Z2-7]{55}$/.test(addr);
}

/** Airtable record ID: rec + 14 alphanumeric chars */
export function isValidRecordId(id) {
  return typeof id === 'string' && /^rec[A-Za-z0-9]{14}$/.test(id);
}

/** Pi payment ID: alphanumeric + dashes, 10–100 chars */
export function isValidPaymentId(id) {
  return typeof id === 'string' && /^[a-zA-Z0-9_\-]{10,100}$/.test(id);
}

/** Pi username: letters, digits, underscores, 1-30 chars */
export function isValidUsername(u) {
  return typeof u === 'string' && /^[a-zA-Z0-9_]{1,30}$/.test(u);
}
