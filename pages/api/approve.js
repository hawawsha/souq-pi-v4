// /api/approve.js
export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { paymentId } = req.body;

    // هنا يتم إرسال طلب الموافقة إلى سيرفرات Pi
    // ستحتاج لاستخدام الـ API Key الخاص بك هنا
    const response = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/approve`, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${process.env.PI_API_KEY}`, // الـ Key نضعه في إعدادات Vercel
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    res.status(200).json(data);
  } else {
    res.status(405).send('Method Not Allowed');
  }
}
