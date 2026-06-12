import { rateLimit } from './_rateLimit';
import { sanitize, isValidPaymentId, isValidUsername, secHeaders, sizeGuard } from './_security';

// ── Whitelist الجداول المسموح بها فقط ──
const ALLOWED_TABLES = ['Cars', 'Electronics', 'Electric', 'Real_Estate', 'Services'];

export default async function handler(req, res) {
  secHeaders(res);
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  if (!sizeGuard(req, res, 5_000)) return;

  if (!rateLimit(req, res, {
    limit: 20,
    windowMs: 60_000,
    message: 'حدٌّ أقصى للطلبات — يرجى المحاولة بعد دقيقة'
  })) return;

  const API_KEY        = process.env.PI_NETWORK_API_KEY;
  const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
  const AIRTABLE_BASE  = process.env.AIRTABLE_BASE_ID;

  if (!API_KEY || !AIRTABLE_TOKEN || !AIRTABLE_BASE) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const action    = sanitize(req.body?.action    || '', 20);
  const paymentId = sanitize(req.body?.paymentId || '', 100);
  const txid      = sanitize(req.body?.txid       || '', 100);
  const username  = sanitize(req.body?.username   || '', 30);

  const fallbackProductId   = sanitize(req.body?.productId    || '', 50);
  const fallbackProductName = sanitize(req.body?.productName  || '', 200);
  const fallbackTableName   = sanitize(req.body?.tableName    || '', 50);
  const fallbackAmount      = parseFloat(req.body?.amountPi);
  const fallbackBuyerUid    = sanitize(req.body?.buyer_uid    || '', 100);
  const fallbackBuyerWallet = sanitize(req.body?.buyer_wallet || '', 60);

  if (!action || !paymentId) return res.status(400).json({ error: 'بيانات ناقصة' });
  if (!['approve', 'complete'].includes(action)) return res.status(400).json({ error: 'action غير صالح' });
  if (!isValidPaymentId(paymentId)) return res.status(400).json({ error: 'paymentId غير صالح' });

  try {

    if (action === 'approve') {
      const approveRes = await fetch(
        `https://api.minepi.com/v2/payments/${paymentId}/approve`,
        { method: 'POST', headers: { Authorization: `Key ${API_KEY}`, 'Content-Type': 'application/json' } }
      );
      if (!approveRes.ok) return res.status(400).json({ error: 'فشل الموافقة على الدفع' });
      return res.status(200).json({ message: 'Approved' });
    }

    if (action === 'complete') {
      if (!txid) return res.status(400).json({ error: 'txid مطلوب' });
      if (username && !isValidUsername(username)) return res.status(400).json({ error: 'username غير صالح' });

      const completeRes = await fetch(
        `https://api.minepi.com/v2/payments/${paymentId}/complete`,
        {
          method: 'POST',
          headers: { Authorization: `Key ${API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ txid })
        }
      );
      if (!completeRes.ok) return res.status(400).json({ error: 'فشل إكمال الدفع' });

      const verifyRes = await fetch(
        `https://api.minepi.com/v2/payments/${paymentId}`,
        { headers: { Authorization: `Key ${API_KEY}` } }
      );
      if (!verifyRes.ok) return res.status(500).json({ error: 'تعذّر التحقق من الدفع' });

      const verifyData = await verifyRes.json();

      if (verifyData.transaction?.txid !== txid) {
        return res.status(400).json({ error: 'txid غير مطابق — الدفع مشبوه' });
      }

      const trustedAmount      = verifyData.amount               || fallbackAmount;
      const trustedUid         = verifyData.user?.uid            || fallbackBuyerUid;
      const trustedWallet      = verifyData.user?.wallet_address || fallbackBuyerWallet;
      const trustedProductId   = verifyData.metadata?.productId  || fallbackProductId;
      const trustedProductName = verifyData.metadata?.productName|| fallbackProductName;
      const trustedTableName   = verifyData.metadata?.tableName  || fallbackTableName;

      if (!trustedAmount || trustedAmount <= 0) {
        return res.status(400).json({ error: 'مبلغ الدفع غير صالح' });
      }

      if (!ALLOWED_TABLES.includes(trustedTableName)) {
        console.error('[payment] invalid tableName:', trustedTableName);
        return res.status(400).json({ error: 'جدول غير مسموح به' });
      }

      if (trustedProductId && trustedTableName) {
        try {
          const productRes = await fetch(
            `https://api.airtable.com/v0/${AIRTABLE_BASE}/${trustedTableName}/${trustedProductId}`,
            { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` } }
          );
          const productData = await productRes.json();
          const realPrice = parseFloat(productData.fields?.price_pi);
          if (!isNaN(realPrice) && Math.abs(realPrice - trustedAmount) > 0.001) {
            return res.status(400).json({ error: 'المبلغ لا يطابق سعر المنتج الحقيقي' });
          }
        } catch {
          return res.status(500).json({ error: 'تعذّر التحقق من سعر المنتج' });
        }
      }

      const checkRes = await fetch(
        `https://api.airtable.com/v0/${AIRTABLE_BASE}/Orders?filterByFormula=${encodeURIComponent(`{payment_id}="${paymentId}"`)}`,
        { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` } }
      );
      const checkData = await checkRes.json();
      if (checkData.records?.length > 0) {
        return res.status(200).json({ message: 'Already saved', orderId: checkData.records[0].id });
      }

      const saveRes = await fetch(
        `https://api.airtable.com/v0/${AIRTABLE_BASE}/Orders`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fields: {
              username,
              buyer_uid:       trustedUid,
              buyer_wallet:    trustedWallet,
              product_id:      trustedProductId,
              product_name:    trustedProductName,
              amount_pi:       trustedAmount,
              payment_id:      paymentId,
              txid,
              table_name:      trustedTableName,
              delivery_status: 'pending'
            }
          })
        }
      );

      if (!saveRes.ok) return res.status(500).json({ error: 'فشل حفظ الطلب' });

      const savedOrder = await saveRes.json();

      const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
      const TELEGRAM_CHAT_ID   = process.env.TELEGRAM_CHAT_ID;
      if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
        fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text: `🛍️ طلب جديد في Souq Pi\n\nالمنتج: ${trustedProductName}\nالمبلغ: π ${trustedAmount}\nالمشتري: @${username}\nرقم الدفع: ${paymentId}\nتم التحقق: ✅`
          })
        }).catch(() => {});
      }

      return res.status(200).json({ message: 'Completed', orderId: savedOrder.id });
    }

  } catch (e) {
    console.error('[payment] error:', e);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
