import { rateLimit } from './_rateLimit';
import { checkAdmin, sanitize, isValidUsername, isValidPaymentId, isValidRecordId, secHeaders, sizeGuard } from './_security';

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const AIRTABLE_BASE  = process.env.AIRTABLE_BASE_ID;
const PI_API_KEY     = process.env.PI_NETWORK_API_KEY;

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

async function sendTelegram(text) {
  const token  = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text })
  }).catch(() => {});
}

// Called server-side only — saves to Client_Notifications directly via Airtable
async function saveClientNotif({ username, product_name, status_label, payment_id }) {
  if (!username || !AIRTABLE_TOKEN || !AIRTABLE_BASE) return;
  await AT('/Client_Notifications', 'POST', {
    fields: {
      username,
      product_name: product_name || '',
      status_label,
      payment_id:   payment_id   || '',
      is_read:      false,
      created_at:   new Date().toISOString()
    }
  }).catch(() => {});
}

async function handleA2URefund({ buyerUid, buyerWallet, amountPi, originalPaymentId, productName }) {
  if (!PI_API_KEY) throw new Error('PI_NETWORK_API_KEY غير مُعيَّن');
  if (!buyerUid && !buyerWallet) throw new Error('buyer_uid أو buyer_wallet مطلوب');
  if (!amountPi || amountPi <= 0) throw new Error('المبلغ غير صالح');

  const body = {
    amount:   amountPi,
    memo:     `استرجاع: ${sanitize(productName || 'منتج', 100)}`,
    metadata: { type: 'refund', original_payment_id: originalPaymentId },
  };
  if (buyerWallet) body.to_address = buyerWallet;
  else body.uid = buyerUid;

  const createRes = await fetch('https://api.minepi.com/v2/payments', {
    method: 'POST',
    headers: { Authorization: `Key ${PI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!createRes.ok) {
    throw new Error(`Pi API رفض إنشاء الدفعة (${createRes.status})`);
  }
  const createData  = await createRes.json();
  const refundPayId = createData.identifier;
  if (!refundPayId) throw new Error('لم يُرجع Pi معرّف الدفعة');

  const approveRes = await fetch(`https://api.minepi.com/v2/payments/${refundPayId}/approve`, {
    method: 'POST',
    headers: { Authorization: `Key ${PI_API_KEY}` }
  });
  if (!approveRes.ok) {
    throw new Error(`Pi API رفض الموافقة (${approveRes.status})`);
  }
  return refundPayId;
}

async function markManualRefundNeeded(recordId, { buyerWallet, buyerUid, amountPi, errorMsg }) {
  await AT(`/Refunds/${recordId}`, 'PATCH', {
    fields: {
      status:             'manual_refund_needed',
      a2u_error:          errorMsg,
      buyer_wallet:       buyerWallet || '',
      buyer_uid:          buyerUid    || '',
      manual_refund_note: `يرجى إرسال π ${amountPi} يدوياً — المحفظة: ${buyerWallet || 'غير محدد'} | UID: ${buyerUid || 'غير محدد'}`
    }
  });
}

export default async function handler(req, res) {
  secHeaders(res);

  if (!AIRTABLE_TOKEN || !AIRTABLE_BASE) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  // ── GET list — admin only ─────────────────────────────────────────────
  if (req.method === 'GET') {
    if (req.query.action !== 'list') return res.status(405).json({ error: 'Method not allowed' });
    if (!checkAdmin(req, res)) return;
    if (!rateLimit(req, res, { limit: 60, windowMs: 60_000 })) return;
    try {
      const { data } = await AT('/Refunds?sort[0][field]=created_at&sort[0][direction]=desc');
      return res.status(200).json({ records: data.records || [] });
    } catch {
      return res.status(500).json({ error: 'فشل جلب طلبات الاسترجاع' });
    }
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!sizeGuard(req, res)) return;

  const action = sanitize(req.body?.action || '', 20);
  if (!action) return res.status(400).json({ error: 'action مطلوب' });

  // ── REQUEST — buyer action (rate-limited, validated) ──────────────────
  if (action === 'request') {
    if (!rateLimit(req, res, { limit: 5, windowMs: 60_000, message: 'حدّ طلبات الاسترجاع تجاوز' })) return;

    const buyer_username = sanitize(req.body?.buyer_username || '', 30);
    const payment_id     = sanitize(req.body?.payment_id     || '', 100);
    const product_name   = sanitize(req.body?.product_name   || '', 200);
    const product_id     = sanitize(req.body?.product_id     || '', 50);
    const buyer_uid      = sanitize(req.body?.buyer_uid      || '', 100);
    const buyer_wallet   = sanitize(req.body?.buyer_wallet   || '', 60);
    const amount_pi      = parseFloat(req.body?.amount_pi);

    if (!buyer_username || !payment_id) {
      return res.status(400).json({ error: 'buyer_username و payment_id مطلوبان' });
    }
    if (!isValidUsername(buyer_username)) {
      return res.status(400).json({ error: 'buyer_username غير صالح' });
    }
    if (!isValidPaymentId(payment_id)) {
      return res.status(400).json({ error: 'payment_id غير صالح' });
    }

    try {
      const orderCheck = await AT(
        `/Orders?filterByFormula=${encodeURIComponent(`AND({payment_id}="${payment_id}",{username}="${buyer_username}")`)}`
      );
      if (!orderCheck.data.records?.length) {
        return res.status(403).json({ error: 'لا يوجد طلب مدفوع بهذا المعرّف — الاسترجاع مرفوض' });
      }

      const order            = orderCheck.data.records[0].fields;
      const savedBuyerUid    = buyer_uid    || order.buyer_uid    || '';
      const savedBuyerWallet = buyer_wallet || order.buyer_wallet || '';
      const savedAmount      = parseFloat(amount_pi || order.amount_pi || 0);
      const savedProduct     = product_name || order.product_name || '';

      const dupCheck = await AT(
        `/Refunds?filterByFormula=${encodeURIComponent(`{payment_id}="${payment_id}"`)}`
      );
      if (dupCheck.data.records?.length) {
        return res.status(200).json({ message: 'طلب استرجاع موجود مسبقاً' });
      }

      if (savedAmount <= 0) return res.status(400).json({ error: 'المبلغ غير صالح' });

      const { ok, data: saveData } = await AT('/Refunds', 'POST', {
        fields: {
          buyer_username,
          buyer_uid:    savedBuyerUid,
          buyer_wallet: savedBuyerWallet,
          product_id,
          product_name: savedProduct,
          payment_id,
          amount_pi:    savedAmount,
          status:       'pending'
        }
      });
      if (!ok) return res.status(500).json({ error: 'فشل حفظ طلب الاسترجاع' });
      return res.status(200).json({ success: true, data: saveData });
    } catch (e) {
      return res.status(500).json({ error: 'خطأ في الاتصال' });
    }
  }

  // ── APPROVE — admin only ──────────────────────────────────────────────
  if (action === 'approve') {
    if (!checkAdmin(req, res)) return;

    const recordId = sanitize(req.body?.recordId || '', 20);
    if (!recordId || !isValidRecordId(recordId)) {
      return res.status(400).json({ error: 'recordId غير صالح' });
    }

    try {
      const { ok: rOk, data: refundRecord } = await AT(`/Refunds/${recordId}`);
      if (!rOk) return res.status(404).json({ error: 'سجل الاسترجاع غير موجود' });
      const f = refundRecord.fields;

      const orderCheck = await AT(
        `/Orders?filterByFormula=${encodeURIComponent(`{payment_id}="${f.payment_id}"`)}`
      );
      if (!orderCheck.data.records?.length) {
        return res.status(403).json({ error: 'لا يوجد دفع مسجّل لهذا الطلب' });
      }

      const order            = orderCheck.data.records[0].fields;
      const buyerUidFinal    = f.buyer_uid    || order.buyer_uid    || '';
      const buyerWalletFinal = f.buyer_wallet || order.buyer_wallet || '';
      const amountFinal      = parseFloat(f.amount_pi) || parseFloat(order.amount_pi) || 0;
      const productFinal     = f.product_name || order.product_name || 'منتج';
      const buyerName        = f.buyer_username || order.username   || '';

      if (amountFinal <= 0) return res.status(400).json({ error: 'المبلغ غير صالح للاسترجاع' });

      if (!buyerUidFinal && !buyerWalletFinal) {
        await AT(`/Refunds/${recordId}`, 'PATCH', {
          fields: { status: 'manual_refund_needed', manual_refund_note: 'buyer_uid و buyer_wallet غير موجودان' }
        });
        return res.status(400).json({ error: 'بيانات المحفظة غير موجودة — الاسترجاع يدوي', amount_pi: amountFinal });
      }

      let refundPaymentId = null;
      let a2uFailed = false;
      let a2uError  = '';

      try {
        refundPaymentId = await handleA2URefund({
          buyerUid: buyerUidFinal, buyerWallet: buyerWalletFinal,
          amountPi: amountFinal, originalPaymentId: f.payment_id, productName: productFinal
        });
      } catch (e) { a2uFailed = true; a2uError = e.message; }

      if (a2uFailed) {
        await markManualRefundNeeded(recordId, { buyerWallet: buyerWalletFinal, buyerUid: buyerUidFinal, amountPi: amountFinal, errorMsg: a2uError });
        return res.status(200).json({ success: false, manual_required: true, message: 'A2U فشل — يرجى الاسترجاع يدوياً', buyer_wallet: buyerWalletFinal, amount_pi: amountFinal });
      }

      const { data: patchData } = await AT(`/Refunds/${recordId}`, 'PATCH', {
        fields: { status: 'approved', refund_payment_id: refundPaymentId }
      });

      await sendTelegram(`↩️ تمت الموافقة على استرجاع\nالمنتج: ${productFinal}\nالمشتري: @${buyerName}\nالمبلغ: π ${amountFinal}`);
      await saveClientNotif({ username: buyerName, product_name: productFinal, status_label: '✅ تمت الموافقة على استرجاع أموالك', payment_id: f.payment_id });

      return res.status(200).json({ success: true, refundPaymentId, data: patchData });
    } catch {
      return res.status(500).json({ error: 'خطأ في معالجة الاسترجاع' });
    }
  }

  // ── REJECT — admin only ───────────────────────────────────────────────
  if (action === 'reject') {
    if (!checkAdmin(req, res)) return;

    const recordId = sanitize(req.body?.recordId || '', 20);
    if (!recordId || !isValidRecordId(recordId)) {
      return res.status(400).json({ error: 'recordId غير صالح' });
    }

    try {
      const { ok: rOk, data: refundRecord } = await AT(`/Refunds/${recordId}`);
      const f = rOk ? (refundRecord.fields || {}) : {};

      const { data } = await AT(`/Refunds/${recordId}`, 'PATCH', { fields: { status: 'rejected' } });

      await sendTelegram(`❌ تم رفض طلب استرجاع\nالمنتج: ${f.product_name || '—'}\nالمشتري: @${f.buyer_username || '—'}`);

      if (f.buyer_username) {
        await saveClientNotif({ username: f.buyer_username, product_name: f.product_name || '', status_label: '❌ تم رفض طلب الاسترجاع', payment_id: f.payment_id || '' });
      }

      return res.status(200).json({ success: true, data });
    } catch {
      return res.status(500).json({ error: 'خطأ في الاتصال' });
    }
  }

  return res.status(400).json({ error: 'action غير معروف' });
}
