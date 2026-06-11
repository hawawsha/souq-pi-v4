import { rateLimit } from './_rateLimit';
import { isValidWallet, secHeaders } from './_security';

export default async function handler(req, res) {
  secHeaders(res);
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  if (!rateLimit(req, res, {
    limit: 20,
    windowMs: 60_000,
    message: 'حدّ الاستعلام تجاوز — انتظر دقيقة'
  })) return;

  const { walletAddress } = req.query;

  if (!walletAddress) return res.status(400).json({ error: 'walletAddress مطلوب' });

  // Validate wallet address format (Stellar: G + 55 base-32 chars)
  if (!isValidWallet(walletAddress)) {
    return res.status(400).json({ error: 'عنوان المحفظة غير صالح — يجب أن يبدأ بـ G ويكون 56 حرفاً' });
  }

  try {
    const response = await fetch(
      `https://api.mainnet.minepi.com/accounts/${encodeURIComponent(walletAddress)}`,
      { signal: AbortSignal.timeout(8_000) }
    );
    if (!response.ok) {
      return res.status(200).json({ balance: null, error: 'لم يتم العثور على المحفظة' });
    }
    const data = await response.json();
    if (data.balances) {
      const piBalance = data.balances.find(b => b.asset_type === 'native');
      return res.status(200).json({ balance: piBalance ? piBalance.balance : '0' });
    }
    return res.status(200).json({ balance: null, error: 'لم يتم العثور على المحفظة' });
  } catch {
    return res.status(500).json({ error: 'خطأ في الاتصال بالشبكة' });
  }
}
