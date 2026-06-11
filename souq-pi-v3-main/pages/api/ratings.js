const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const AIRTABLE_BASE  = process.env.AIRTABLE_BASE_ID;

const AT = (path, method = 'GET', body) =>
  fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${AIRTABLE_TOKEN}`,
      ...(body ? { 'Content-Type': 'application/json' } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  }).then(r => r.json());

export default async function handler(req, res) {
  if (!AIRTABLE_TOKEN || !AIRTABLE_BASE) {
    return res.status(500).json({ error: 'Server configuration missing' });
  }

  // GET /api/ratings?payment_id=X
  // GET /api/ratings?seller_username=X
  // GET /api/ratings?product_id=X
  if (req.method === 'GET') {
    const { payment_id, seller_username, product_id } = req.query;
    try {
      let formula = '';
      if (payment_id)       formula = `{payment_id}="${payment_id}"`;
      else if (seller_username) formula = `{seller_username}="${seller_username}"`;
      else if (product_id)  formula = `{product_id}="${product_id}"`;
      else return res.status(400).json({ error: 'payment_id or seller_username required' });

      const data = await AT(
        `/Ratings?filterByFormula=${encodeURIComponent(formula)}&sort[0][field]=created_at&sort[0][direction]=desc`
      );
      return res.status(200).json({ records: data.records || [] });
    } catch (e) {
      return res.status(500).json({ error: 'فشل جلب التقييمات' });
    }
  }

  // POST /api/ratings
  if (req.method === 'POST') {
    const { buyer_username, payment_id, stars, comment } = req.body || {};

    // seller_username و product_id سيتم جلبهما من Orders تلقائياً
    if (!buyer_username || !payment_id || !stars) {
      return res.status(400).json({ error: 'buyer_username, payment_id, stars مطلوبة' });
    }

    const starsNum = parseInt(stars, 10);
    if (isNaN(starsNum) || starsNum < 1 || starsNum > 5) {
      return res.status(400).json({ error: 'التقييم يجب أن يكون بين 1 و 5' });
    }

    try {
      // منع التقييم المكرر
      const dup = await AT(
        `/Ratings?filterByFormula=${encodeURIComponent(`{payment_id}="${payment_id}"`)}`
      );
      if (dup.records?.length > 0) {
        return res.status(200).json({ message: 'تم التقييم مسبقاً', existing: dup.records[0] });
      }

      // جلب الطلب للتحقق من المشتري + الحصول على seller_username و product_id
      const orderRes = await AT(
        `/Orders?filterByFormula=${encodeURIComponent(
          `AND({payment_id}="${payment_id}",{username}="${buyer_username}")`
        )}`
      );
      if (!orderRes.records?.length) {
        return res.status(403).json({ error: 'لا يوجد طلب مطابق لهذا المشتري' });
      }

      const orderFields = orderRes.records[0].fields;

      // seller_username: من Seller_Notifications أو product_id كبديل
      const seller_username = orderFields.Seller_Notifications || orderFields.seller_username || '';
      const product_id      = orderFields.product_id || '';

      const saved = await AT('/Ratings', 'POST', {
        fields: {
          buyer_username,
          seller_username,
          product_id,
          payment_id,
          stars: starsNum,
          comment: (comment || '').trim().slice(0, 500),
          created_at: new Date().toISOString()
        }
      });

      return res.status(200).json({ success: true, record: saved });
    } catch (e) {
      console.error('[ratings] error:', e);
      return res.status(500).json({ error: 'فشل حفظ التقييم' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
