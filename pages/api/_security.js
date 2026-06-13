/**
 * Shared security utilities for all API routes.
 * Import and apply at the top of every handler.
 */

import { timingSafeEqual, createHash } from 'crypto';

/** Strip dangerous characters and control characters from user-supplied strings */
export function sanitize(val, maxLen = 200) {
  if (typeof val !== 'string') return '';
  return val
    .trim()
    .slice(0, maxLen)
    // إزالة أحرف التحكم (control characters) مثل \n \t \r وغيرها
    .replace(/[\x00-\x1F\x7F]/g, '')
    // إزالة أحرف خطرة في HTML/Airtable formulas
    .replace(/[<>"'`\\]/g, '');
}

/** Sanitize and validate a number within a range. Returns null if invalid. */
export function sanitizeNumber(val, min = 0, max = 999999) {
  const n = parseFloat(val);
  if (isNaN(n) || !isFinite(n) || n < min || n > max) return null;
  return n;
}

/**
 * Validate ADMIN_SECRET_KEY using a hash-based, timing-safe comparison.
 * Hashing both values to a fixed length (SHA-256) before comparison
 * eliminates any timing signal related to the original string length.
 */
export function checkAdmin(req, res) {
  const supplied = (req.headers['x-admin-key'] || '').toString().trim();
  const expected = process.env.ADMIN_SECRET_KEY;

  if (!expected || !supplied) {
    res.status(401).json({ error: 'غير مصرح' });
    return false;
  }

  try {
    const suppliedHash = createHash('sha256').update(supplied).digest();
    const expectedHash = createHash('sha256').update(expected).digest();

    // both hashes are always 32 bytes — no length-based timing leak
    if (!timingSafeEqual(suppliedHash, expectedHash)) {
      res.status(401).json({ error: 'غير مصرح' });
      return false;
    }
  } catch {
    res.status(401).json({ error: 'غير مصرح' });
    return false;
  }

  return true;
}

/** Security headers on every response — includes CSP, HSTS, and Permissions-Policy */
export function secHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // HSTS — يجبر المتصفح على HTTPS دائماً
  res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains');

  // Permissions-Policy — يعطّل واجهات المتصفح غير المستخدمة
  res.setHeader(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=()'
  );

  // X-Permitted-Cross-Domain-Policies — يمنع Flash/PDF من قراءة الاستجابة عبر النطاقات
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');

  // CSP — يمنع تحميل موارد غير موثوقة
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://sdk.minepi.com https://fonts.googleapis.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com",
      "img-src 'self' data: https:",
      "font-src 'self' https://fonts.gstatic.com",
      "connect-src 'self' https://api.minepi.com https://api.airtable.com https://api.telegram.org",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; ')
  );
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
