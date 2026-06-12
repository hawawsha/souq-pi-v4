import { rateLimit } from './_rateLimit';
import { sanitize, isValidUsername, secHeaders } from './_security';

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const AIRTABLE_BASE  = process.env.AIRTABLE_BASE_ID;

export default async function handler(req, res) {
  secHeaders(res);
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  if (!rateLimit(req, res, {
    limit: 30,
    windowMs: 60_000,
    message: 'حدّ الطلبات تجاوز — انتظر دقيقة'
  })) return;

  const raw = sanitize(req.query.username || '', 30);
  if (!raw) return res.status(400).json({ error: 'username مطلوب', records: [] });
  if (!isValidUsername(raw)) return res.status(400).json({ error: 'username غير صالح', records: [] });

  if (!AIRTABLE_TOKEN || !AIRTABLE_BASE) {
    return res.status(500).json({ error: 'إعدادات السيرفر ناقصة', records: [] });
  }

  try {
    const formula = encodeURIComponent(`{username}="${raw}"`);
    const response = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE}/Orders?filterByFormula=${formula}&sort[0][field]=created_at&sort[0][direction]=desc`,
      { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` } }
    );

    if (!response.ok) {
      return res.status(502).json({ error: 'تعذّر الاتصال بقاعدة البيانات', records: [] });
    }

    const data = await response.json();
    return res.status(200).json({ records: data.records || [] });
  } catch {
    return res.status(500).json({ error: 'خطأ في الاتصال', records: [] });
  }
}
