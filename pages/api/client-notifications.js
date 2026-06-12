import { rateLimit } from './_rateLimit';
import { checkAdmin, sanitize, isValidUsername, isValidRecordId, secHeaders, sizeGuard } from './_security';

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const AIRTABLE_BASE  = process.env.AIRTABLE_BASE_ID;

const AT = async (path, method = 'GET', body) => {
  const r = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${AIRTABLE_TOKEN}`,
      ...(body ? { 'Content-Type': 'application/json' } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  return { ok: r.ok, status: r.status, data: await r.json() };
};

export default async function handler(req, res) {
  secHeaders(res);

  if (!AIRTABLE_TOKEN || !AIRTABLE_BASE) {
    return res.status(500).json({ error: 'Server configuration missing' });
  }

  // ── GET — fetch unread notifications for a user (public, rate-limited) ──
  if (req.method === 'GET') {
    if (!rateLimit(req, res, { limit: 30, windowMs: 60_000 })) return;

    const raw = sanitize(req.query.username || '', 30);
    if (!raw || !isValidUsername(raw)) {
      return res.status(400).json({ error: 'username غير صالح' });
    }

    try {
      const formula = encodeURIComponent(`AND({username}="${raw}",{is_read}=FALSE())`);
      const { data } = await AT(
        `/Client_Notifications?filterByFormula=${formula}&sort[0][field]=created_at&sort[0][direction]=desc`
      );
      return res.status(200).json({ records: data.records || [] });
    } catch {
      return res.status(500).json({ error: 'فشل جلب الإشعارات' });
    }
  }

  // ── POST — create a notification (admin-only) ──────────────────────────
  if (req.method === 'POST') {
    if (!checkAdmin(req, res)) return;
    if (!sizeGuard(req, res, 2_000)) return;

    const username     = sanitize(req.body?.username     || '', 30);
    const product_name = sanitize(req.body?.product_name || '', 200);
    const status_label = sanitize(req.body?.status_label || '', 200);
    const payment_id   = sanitize(req.body?.payment_id   || '', 100);
    const new_status   = sanitize(req.body?.new_status   || '', 50);

    if (!username || !status_label) {
      return res.status(400).json({ error: 'username و status_label مطلوبان' });
    }
    if (!isValidUsername(username)) {
      return res.status(400).json({ error: 'username غير صالح' });
    }

    try {
      const { ok, data } = await AT('/Client_Notifications', 'POST', {
        fields: {
          username,
          product_name,
          status_label,
          new_status,
          payment_id,
          is_read:    false,
          created_at: new Date().toISOString()
        }
      });
      if (!ok) return res.status(500).json({ error: 'فشل حفظ الإشعار' });
      return res.status(200).json({ success: true, record: data });
    } catch {
      return res.status(500).json({ error: 'خطأ في الاتصال' });
    }
  }

  // ── PATCH — mark notification as read (public, validated) ─────────────
  if (req.method === 'PATCH') {
    if (!rateLimit(req, res, { limit: 60, windowMs: 60_000 })) return;
    if (!sizeGuard(req, res, 500)) return;

    const { recordId } = req.body || {};

    // Validate Airtable record ID format to prevent injection
    if (!recordId || !isValidRecordId(recordId)) {
      return res.status(400).json({ error: 'recordId غير صالح' });
    }

    try {
      const { ok } = await AT(`/Client_Notifications/${recordId}`, 'PATCH', {
        fields: { is_read: true }
      });
      if (!ok) return res.status(500).json({ error: 'فشل التحديث' });
      return res.status(200).json({ success: true });
    } catch {
      return res.status(500).json({ error: 'خطأ في الاتصال' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
