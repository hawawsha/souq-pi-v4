import { rateLimit }  from './_rateLimit';
import { checkAdmin, secHeaders, sizeGuard, isValidRecordId } from './_security';

const AIRTABLE_TOKEN  = process.env.AIRTABLE_TOKEN;
const AIRTABLE_BASE   = process.env.AIRTABLE_BASE_ID;
const VALID_STATUSES  = ['pending', 'shipped', 'delivered', 'cancelled'];

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

  // All admin-orders routes require the ADMIN_SECRET_KEY
  if (!checkAdmin(req, res)) return;

  if (!AIRTABLE_TOKEN || !AIRTABLE_BASE) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  if (!rateLimit(req, res, { limit: 120, windowMs: 60_000, message: 'حدّ الطلبات تجاوز — انتظر دقيقة' })) return;

  // ── GET — list all orders ──────────────────────────────
  if (req.method === 'GET') {
    try {
      const { data } = await AT(
        '/Orders?sort[0][field]=created_at&sort[0][direction]=desc'
      );
      return res.status(200).json({ records: data.records || [] });
    } catch {
      return res.status(500).json({ error: 'فشل جلب الطلبات' });
    }
  }

  // ── PATCH — update delivery_status ────────────────────
  if (req.method === 'PATCH') {
    if (!sizeGuard(req, res)) return;
    const { recordId, delivery_status } = req.body || {};

    if (!recordId || !isValidRecordId(recordId)) {
      return res.status(400).json({ error: 'recordId غير صالح' });
    }
    if (!VALID_STATUSES.includes(delivery_status)) {
      return res.status(400).json({ error: 'حالة التوصيل غير صالحة' });
    }

    try {
      const { ok, data } = await AT(`/Orders/${recordId}`, 'PATCH', {
        fields: { delivery_status }
      });
      if (!ok) return res.status(500).json({ error: 'فشل التحديث' });
      return res.status(200).json({ success: true, data });
    } catch {
      return res.status(500).json({ error: 'خطأ في الاتصال' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
