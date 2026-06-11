import { rateLimit } from './_rateLimit';
import { checkAdmin, sanitize, secHeaders, sizeGuard } from './_security';

export default async function handler(req, res) {
  secHeaders(res);
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  // Admin-only endpoint
  if (!checkAdmin(req, res)) return;

  if (!sizeGuard(req, res, 2_000)) return;

  if (!rateLimit(req, res, {
    limit: 30,
    windowMs: 60_000,
    message: 'حدّ إرسال الإشعارات تجاوز'
  })) return;

  const message = sanitize(req.body?.message || '', 1000);
  if (!message) return res.status(400).json({ error: 'message مطلوب' });

  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const TELEGRAM_CHAT_ID   = process.env.TELEGRAM_CHAT_ID;

  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    return res.status(500).json({ error: 'Telegram غير مُعدَّل' });
  }

  try {
    const tgRes = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message })
      }
    );
    const data = await tgRes.json();
    if (!tgRes.ok) return res.status(500).json({ error: 'فشل إرسال الإشعار' });
    return res.status(200).json({ ok: true });
  } catch {
    return res.status(500).json({ error: 'خطأ في الاتصال' });
  }
}
