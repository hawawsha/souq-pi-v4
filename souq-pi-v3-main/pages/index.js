import { useState, useEffect } from 'react';
import Head from 'next/head';
import { usePiPrice } from '../context/PiPriceContext';

const SECTIONS = [
  { key: 'Cars',        ar: 'سيارات',     icon: '🚗', gradient: 'linear-gradient(135deg,#1a0b2e,#6a0dad)' },
  { key: 'Electric',    ar: 'كهربائيات',  icon: '⚡', gradient: 'linear-gradient(135deg,#1a0b2e,#d4af37)' },
  { key: 'Electronics', ar: 'إلكترونيات', icon: '📱', gradient: 'linear-gradient(135deg,#2d1b69,#6a0dad)' },
  { key: 'Real_Estate', ar: 'عقارات',     icon: '🏠', gradient: 'linear-gradient(135deg,#1a0b2e,#4a1942)' },
];

const FEATURED = [
  { icon: '🚗', title: 'أحدث السيارات',    sub: 'تويوتا · هيونداي · BMW' },
  { icon: '📱', title: 'إلكترونيات 2025',  sub: 'آيفون · سامسونج · سوني' },
  { icon: '🏠', title: 'عقارات مميزة',     sub: 'فلل · شقق · أراضي' },
];

export default function Home() {
  const piPrice = usePiPrice();
  const [user,        setUser]        = useState(null);
  const [page,        setPage]        = useState('home');
  const [section,     setSection]     = useState(null);
  const [products,    setProducts]    = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [toast,       setToast]       = useState('');
  const [paying,      setPaying]      = useState(null);
  const [calcPi,      setCalcPi]      = useState('');
  const [featuredIdx, setFeaturedIdx] = useState(0);
  const [notifCount,  setNotifCount]  = useState(0);

  useEffect(() => {
    const initPi = async () => {
      if (typeof window !== 'undefined' && window.Pi) {
        await window.Pi.init({ version: '2.0', sandbox: true });
      } else {
        setTimeout(initPi, 500);
      }
    };
    initPi();

    // Restore notification count from previous login
    const saved = typeof localStorage !== 'undefined' && localStorage.getItem('pi_username');
    if (saved) fetchNotifCount(saved);

    const t = setInterval(() => setFeaturedIdx(i => (i + 1) % FEATURED.length), 4000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (section) loadProducts(section);
  }, [section]);

  async function fetchNotifCount(username) {
    try {
      const res  = await fetch(`/api/client-notifications?username=${encodeURIComponent(username)}`);
      const data = await res.json();
      setNotifCount((data.records || []).length);
    } catch {}
  }

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(''), 4000); };

  async function loginWithPi() {
    try {
      if (!window.Pi) { showToast('يرجى الفتح من متصفح Pi'); return; }
      const auth = await window.Pi.authenticate(['username', 'payments', 'wallet_address'], {
        onIncompletePaymentFound: (p) => {
          const txid = p.transaction?.txid;
          if (!txid) {
            return fetch('/api/payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'approve', paymentId: p.identifier })
            });
          }
          return fetch('/api/payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'complete', paymentId: p.identifier, txid,
              username: '', buyer_uid: '', buyer_wallet: '',
              productId: p.metadata?.id || '', productName: p.memo || '',
              amountPi: p.amount || 0, tableName: ''
            })
          });
        }
      });
      setUser(auth.user);
      localStorage.setItem('pi_username', auth.user.username);
      showToast(`مرحباً @${auth.user.username}`);
      fetchNotifCount(auth.user.username);
    } catch(e) { showToast('فشل الدخول'); }
  }

  async function loadProducts(t) {
    setLoading(true);
    try {
      const res = await fetch(`/api/products?table=${t}`);
      const d   = await res.json();
      setProducts(d.records || []);
    } catch(e) { showToast('خطأ في التحميل'); }
    setLoading(false);
  }

  function buyWithPi(p) {
    if (!user) { loginWithPi(); return; }
    setPaying(p.id);
    window.Pi.createPayment(
      { amount: Number(p.fields.price_pi), memo: p.fields.name, metadata: { } },
      {
        onReadyForServerApproval: (id) => fetch('/api/payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'approve', paymentId: id })
        }),
        onReadyForServerCompletion: (id, tx) => fetch('/api/payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'complete', paymentId: id, txid: tx?.txid || tx,
            username: user.username, buyer_uid: user.uid || '',
            buyer_wallet: user.wallet_address || '',
            productId: p.id, productName: p.fields.name,
            amountPi: p.fields.price_pi, tableName: section
          })
        }).then(() => { showToast('تم الشراء بنجاح! 🎉'); setPaying(null); }),
        onCancel: () => setPaying(null),
        onError:  () => { showToast('فشل الدفع'); setPaying(null); }
      }
    );
  }

  return (
    <>
      <Head>
        <title>Souq Pi — سوق Pi</title>
        <script src="https://sdk.minepi.com/pi-sdk.js" />
        <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no" />
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap" rel="stylesheet" />
      </Head>

      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:#0a0118;color:#fff;font-family:'Cairo',sans-serif;direction:rtl;padding-bottom:100px;}
        .navbar{display:flex;align-items:center;justify-content:space-between;padding:12px 20px;background:#1a0b2e;border-bottom:1px solid #d4af37;position:sticky;top:0;z-index:100;}
        .logo-circle{width:38px;height:38px;background:linear-gradient(135deg,#6a0dad,#d4af37);border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:900;flex-shrink:0;}
        .hero{padding:16px;}
        .featured-card{background:rgba(255,255,255,0.04);border-radius:20px;padding:25px;margin-bottom:16px;border:1px solid rgba(255,255,255,0.1);text-align:center;}
        .calc-box{background:rgba(106,13,173,0.1);border:1px solid #6a0dad;border-radius:20px;padding:15px;margin:0 0 16px;}
        .calc-input{width:100%;background:#0a0118;border:1px solid #6a0dad;padding:12px;border-radius:12px;color:#fff;text-align:center;outline:none;font-family:'Cairo';box-sizing:border-box;}
        .categories{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;}
        .cat-card{border-radius:20px;padding:25px 10px;cursor:pointer;text-align:center;transition:transform 0.15s;}
        .cat-card:active{transform:scale(0.97);}
        .products{padding:12px;display:grid;grid-template-columns:1fr 1fr;gap:12px;}
        .pcard{background:#1a0b2e;border:1px solid #331a5e;border-radius:15px;overflow:hidden;}
        .pimg{width:100%;height:110px;object-fit:cover;background:#0a0118;}
        .pinfo{padding:10px;}
        .buybtn{background:linear-gradient(135deg,#6a0dad,#d4af37);color:#fff;border:none;padding:8px;border-radius:10px;width:100%;font-weight:700;cursor:pointer;font-family:'Cairo';}
        .buybtn:disabled{opacity:0.6;cursor:not-allowed;}
        .bottom-nav{position:fixed;bottom:0;left:0;right:0;background:#1a0b2e;display:flex;justify-content:space-around;padding:12px;border-top:1px solid #6a0dad;z-index:1000;}
        .nav-wrap{position:relative;flex:1;display:flex;flex-direction:column;align-items:center;cursor:pointer;}
        .nav-label{text-align:center;font-size:0.7em;color:#b0b0b0;}
        .nav-label.active{color:#d4af37;}
        .nav-badge{position:absolute;top:-4px;right:50%;transform:translateX(12px);background:#ef4444;border-radius:50%;min-width:17px;height:17px;font-size:0.6em;display:flex;align-items:center;justify-content:center;font-weight:900;padding:0 3px;border:2px solid #1a0b2e;}
        .toast{position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:#6a0dad;padding:10px 20px;border-radius:20px;z-index:2000;max-width:90%;text-align:center;font-size:0.8em;}
        .back-btn{background:rgba(255,255,255,0.08);border:none;color:#fff;padding:8px 14px;border-radius:10px;cursor:pointer;font-family:'Cairo',sans-serif;font-size:0.85em;margin:12px;}
      `}</style>

      <nav className="navbar">
        <div onClick={() => { setPage('home'); setSection(null); }} style={{ display:'flex', gap:'8px', alignItems:'center', cursor:'pointer' }}>
          <div className="logo-circle">π</div>
          <div style={{ fontWeight:900 }}>Souq Pi <small style={{ color:'#d4af37' }}>v3</small></div>
        </div>
        {user
          ? <div style={{ color:'#d4af37', fontSize:'0.8em' }}>@{user.username}</div>
          : <button onClick={loginWithPi} style={{ background:'#d4af37', border:'none', padding:'6px 15px', borderRadius:'20px', fontWeight:700, fontFamily:'Cairo', cursor:'pointer' }}>دخول</button>
        }
      </nav>

      {page === 'home' ? (
        <div className="hero">
          <div className="featured-card">
            <div style={{ fontSize:'2.2em' }}>{FEATURED[featuredIdx].icon}</div>
            <div style={{ fontWeight:800, margin:'6px 0 2px' }}>{FEATURED[featuredIdx].title}</div>
            <div style={{ fontSize:'0.66em', color:'#b0b0b0' }}>{FEATURED[featuredIdx].sub}</div>
          </div>

          <div className="calc-box">
            <input
              className="calc-input"
              type="number"
              value={calcPi}
              onChange={e => setCalcPi(e.target.value)}
              placeholder="أدخل كمية π لمعرفة قيمتها"
            />
            <div style={{ marginTop:10, color:'#4ade80', fontWeight:900, textAlign:'center', fontSize:'1.1em' }}>
              $ {calcPi && piPrice ? (calcPi * piPrice).toFixed(2) : '0.00'}
            </div>
          </div>

          <div className="categories">
            {SECTIONS.map(s => (
              <div key={s.key} className="cat-card" style={{ background: s.gradient }}
                onClick={() => { setSection(s.key); setPage('section'); }}>
                <div style={{ fontSize:'2.5em' }}>{s.icon}</div>
                <div style={{ fontWeight:700 }}>{s.ar}</div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <button className="back-btn" onClick={() => { setPage('home'); setSection(null); setProducts([]); }}>
            ← رجوع
          </button>
          <div style={{ padding:'0 12px 8px', fontWeight:900, fontSize:'1em', color:'#d4af37' }}>
            {SECTIONS.find(s => s.key === section)?.icon} {SECTIONS.find(s => s.key === section)?.ar}
          </div>
          <div className="products">
            {loading ? (
              <p style={{ gridColumn:'1/3', textAlign:'center', padding:40, color:'#b0b0b0' }}>⏳ جاري التحميل...</p>
            ) : products.length === 0 ? (
              <p style={{ gridColumn:'1/3', textAlign:'center', padding:40, color:'#b0b0b0' }}>لا توجد منتجات بعد</p>
            ) : products.map(r => (
              <div key={r.id} className="pcard">
                {r.fields.image_url
                  ? <img className="pimg" src={r.fields.image_url} alt={r.fields.name} />
                  : <div className="pimg" style={{ display:'flex', alignItems:'center', justifyContent:'center', fontSize:'2.5em' }}>📦</div>
                }
                <div className="pinfo">
                  <div style={{ fontSize:'0.75em', fontWeight:700, height:'35px', overflow:'hidden' }}>{r.fields.name}</div>
                  <div style={{ color:'#d4af37', fontWeight:900, margin:'5px 0' }}>π {Number(r.fields.price_pi).toFixed(2)}</div>
                  <button className="buybtn" onClick={() => buyWithPi(r)} disabled={paying === r.id}>
                    {paying === r.id ? '⏳ جاري...' : 'شراء بـ Pi'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bottom-nav">
        <div className={`nav-wrap`} onClick={() => { setPage('home'); setSection(null); }}>
          <span style={{ fontSize:'1.3em' }}>🏠</span>
          <span className={`nav-label ${page === 'home' ? 'active' : ''}`}>الرئيسية</span>
        </div>

        <div className="nav-wrap" onClick={() => showToast('قريباً...')}>
          <span style={{ fontSize:'1.3em', opacity:0.5 }}>🔍</span>
          <span className="nav-label" style={{ opacity:0.5 }}>بحث</span>
        </div>

        <div className="nav-wrap" onClick={() => window.location.href = '/my-orders'}>
          <span style={{ fontSize:'1.3em' }}>📦</span>
          {notifCount > 0 && <span className="nav-badge">{notifCount > 9 ? '9+' : notifCount}</span>}
          <span className="nav-label">طلباتي</span>
        </div>

        <div className="nav-wrap" onClick={() => window.location.href = '/balance'}>
          <span style={{ fontSize:'1.3em' }}>💰</span>
          <span className="nav-label">الرصيد</span>
        </div>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
