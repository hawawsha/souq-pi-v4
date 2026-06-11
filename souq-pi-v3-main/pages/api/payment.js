import { rateLimit } from './_rateLimit';
import { sanitize, isValidPaymentId, isValidUsername, secHeaders, sizeGuard } from './_security';

export default async function handler(req, res) {
  secHeaders(res);
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  if (!sizeGuard(req, res, 5_000)) return;

  // Rate limit: 20 payment requests per minute per IP
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

  const action      = sanitize(req.body?.action    || '', 20);
  const paymentId   = sanitize(req.body?.paymentId || '', 100);
  const txid        = sanitize(req.body?.txid       || '', 100);
  const username    = sanitize(req.body?.username   || '', 30);
  const buyerUid    = sanitize(req.body?.buyer_uid  || '', 100);
  const productId   = sanitize(req.body?.productId  || '', 50);
  const productName = sanitize(req.body?.productName || '', 200);
  const tableName   = sanitize(req.body?.tableName  || '', 50);

  let buyerWallet = '';
  if (typeof req.body?.buyer_wallet === 'string') buyerWallet = req.body.buyer_wallet.trim().slice(0, 60);

  const amountPi = parseFloat(req.body?.amountPi);

  if (!action || !paymentId) return res.status(400).json({ error: 'بيانات ناقصة' });
  if (!['approve', 'complete'].includes(action)) return res.status(400).json({ error: 'action غير صالح' });
  if (!isValidPaymentId(paymentId)) return res.status(400).json({ error: 'paymentId غير صالح' });

  try {

    // ═══════════════ APPROVE ═══════════════
    if (action === 'approve') {
      const approveRes = await fetch(
        `https://api.minepi.com/v2/payments/${paymentId}/approve`,
        { method: 'POST', headers: { Authorization: `Key ${API_KEY}`, 'Content-Type': 'application/json' } }
      );
      if (!approveRes.ok) {
        return res.status(400).json({ error: 'فشل الموافقة على الدفع' });
      }
      return res.status(200).json({ message: 'Approved' });
    }

    // ═══════════════ COMPLETE ═══════════════
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
      if (!completeRes.ok) {
        return res.status(400).json({ error: 'فشل إكمال الدفع' });
      }

      // Idempotency — prevent duplicate orders
      const checkRes = await fetch(
        `https://api.airtable.com/v0/${AIRTABLE_BASE}/Orders?filterByFormula=${encodeURIComponent(`{payment_id}="${paymentId}"`)}`,
        { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` } }
      );
      const checkData = await checkRes.json();
      if (checkData.records?.length > 0) {
        return res.status(200).json({ message: 'Already saved', orderId: checkData.records[0].id });
      }

      // Validate amount
      const safeAmount = !isNaN(amountPi) && amountPi > 0 ? amountPi : 0;
      if (safeAmount <= 0) return res.status(400).json({ error: 'مبلغ الدفع غير صالح' });

      // ── Save Order ──
      const saveRes = await fetch(
        `https://api.airtable.com/v0/${AIRTABLE_BASE}/Orders`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fields: {
              username,
              buyer_uid:       buyerUid,
              buyer_wallet:    buyerWallet,
              product_id:      productId,
              product_name:    productName,
              amount_pi:       safeAmount,
              payment_id:      paymentId,
              txid,
              table_name:      tableName,
              delivery_status: 'pending'
            }
          })
        }
      );

      if (!saveRes.ok) {
        return res.status(500).json({ error: 'فشل حفظ الطلب' });
      }

      const savedOrder = await saveRes.json();

      // ── Telegram Notification ──
      const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
      const TELEGRAM_CHAT_ID   = process.env.TELEGRAM_CHAT_ID;
      if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
        fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text: `🛍️ طلب جديد في Souq Pi\n\nالمنتج: ${productName}\nالمبلغ: π ${safeAmount}\nالمشتري: @${username}\nرقم الدفع: ${paymentId}`
          })
        }).catch(() => {});
      }

      return res.status(200).json({ message: 'Completed', orderId: savedOrder.id });
    }

  } catch {
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
