import Head from 'next/head';

export default function Terms() {
  return (
    <>
      <Head>
        <title>الشروط والأحكام - Souq Pi</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap" rel="stylesheet" />
      </Head>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:#0a0118;color:#fff;font-family:'Cairo',sans-serif;direction:rtl;padding:20px;}
        .container{max-width:600px;margin:0 auto;padding:20px;}
        h1{color:#d4af37;font-size:1.5em;margin-bottom:20px;text-align:center;}
        h2{color:#d4af37;font-size:1.1em;margin:20px 0 10px;}
        p{color:#b0b0b0;line-height:1.8;margin-bottom:10px;font-size:0.9em;}
        .header{background:#1a0b2e;padding:14px 20px;border-bottom:1px solid #d4af37;margin:-20px -20px 20px;display:flex;align-items:center;gap:10px;}
        .back-btn{background:rgba(255,255,255,0.08);border:none;color:#fff;padding:8px 14px;border-radius:10px;cursor:pointer;font-family:'Cairo';font-size:0.85em;}
      `}</style>

      <div className="header">
        <button className="back-btn" onClick={() => window.history.back()}>← رجوع</button>
        <div style={{fontWeight:900}}>الشروط والأحكام</div>
      </div>

      <div className="container">
        <h1>الشروط والأحكام</h1>
        <p>آخر تحديث: مايو 2026</p>

        <h2>١. القبول بالشروط</h2>
        <p>باستخدامك لتطبيق سوق Pi، فإنك توافق على هذه الشروط والأحكام كاملة.</p>

        <h2>٢. استخدام التطبيق</h2>
        <p>يُسمح باستخدام التطبيق للأغراض التجارية المشروعة فقط. يُحظر استخدامه لأي أغراض غير قانونية.</p>

        <h2>٣. المدفوعات</h2>
        <p>جميع المدفوعات تتم عبر شبكة Pi Network. نحن لسنا مسؤولين عن أي مشاكل تقنية في شبكة Pi.</p>

        <h2>٤. سياسة الاسترجاع</h2>
        <p>يمكن طلب استرجاع المبلغ خلال 7 أيام من تاريخ الشراء. يخضع كل طلب استرجاع للمراجعة من قِبل الإدارة.</p>

        <h2>٥. مسؤولية البائعين</h2>
        <p>البائعون مسؤولون عن دقة معلومات منتجاتهم وجودتها. سوق Pi يوفر المنصة فقط.</p>

        <h2>٦. تعديل الشروط</h2>
        <p>نحتفظ بحق تعديل هذه الشروط في أي وقت. سيتم إعلام المستخدمين بأي تغييرات جوهرية.</p>

        <h2>٧. التواصل معنا</h2>
        <p>للاستفسارات، يرجى التواصل معنا عبر التطبيق أو واتساب.</p>
      </div>
    </>
  );
}
