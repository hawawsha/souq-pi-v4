import { useState, useEffect } from 'react';
import Head from 'next/head';

function StarRating({ value, onChange, disabled }) {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display:'flex', gap:4, justifyContent:'center', margin:'8px 0' }}>
      {[1,2,3,4,5].map(s => (
        <span
          key={s}
          onClick={() => !disabled && onChange(s)}
          onMouseEnter={() => !disabled && setHover(s)}
          onMouseLeave={() => !disabled && setHover(0)}
          style={{ fontSize:'1.6em', cursor: disabled ? 'default' : 'pointer',
            color: s <= (hover || value) ? '#d4af37' : '#331a5e', transition:'color 0.15s', userSelect:'none' }}
        >★</span>
      ))}
    </div>
  );
}

const STATUS_COLORS = {
  pending:   { bg:'rgba(234,179,8,0.12)',  border:'#eab308', color:'#eab308',  label:'⏳ قيد المعالجة' },
  shipped:   { bg:'rgba(56,189,248,0.12)', border:'#38bdf8', color:'#38bdf8',  label:'🚚 تم الشحن'    },
  delivered: { bg:'rgba(34,197,94,0.12)',  border:'#22c55e', color:'#22c55e',  label:'✅ تم التسليم'   },
  cancelled: { bg:'rgba(239,68,68,0.12)',  border:'#ef4444', color:'#ef4444',  label:'🚫 ملغي'        },
};

export default function MyOrders() {
  const [user,         setUser]         = useState(null);
  const [orders,       setOrders]       = useState([]);
  const [notifs,       setNotifs]       = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [toast,        setToast]        = useState('');
  const [requesting,   setRequesting]   = useState(null);
  const [balance,      setBalance]      = useState(null);
  const [ratings,      setRatings]      = useState({});
  const [ratingInput,  setRatingInput]  = useState({});
  const [submitting,   setSubmitting]   = useState(null);
  const [clearingAll,  setClearingAll]  = useState(false);

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 4000); }

  useEffect(() => {
    const init = async () => {
      if (typeof window !== 'undefined' && window.Pi) {
        await window.Pi.init({ version: '2.0', sandbox: true });
      } else {
        setTimeout(init, 500);
      }
    };
    init();
  }, []);

  async function loginWithPi() {
    try {
      if (!window.Pi) { showToast('يرجى الفتح من متصفح Pi'); return; }
      const auth = await window.Pi.authenticate(['username', 'payments', 'wallet_address'], {
        onIncompletePaymentFound: (p) => {
          const txid = p.transaction?.txid;
          if (!txid) {
            return fetch('/api/payment', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'approve', paymentId: p.identifier })
            });
          }
          return fetch('/api/payment', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'complete', paymentId: p.identifier, txid })
          });
        }
      });
      setUser(auth.user);
      localStorage.setItem('pi_username', auth.user.username);
      await Promise.all([
        loadOrders(auth.user.username),
        loadNotifications(auth.user.username),
      ]);
      if (auth.user.wallet_address) {
        fetch(`/api/balance?walletAddress=${auth.user.wallet_address}`)
          .then(r => r.json())
          .then(d => { if (d.balance) setBalance(d.balance); })
          .catch(() => {});
      }
    } catch(e) {
      showToast('فشل تسجيل الدخول: ' + e.message);
    }
  }

  async function loadNotifications(username) {
    try {
      const res  = await fetch(`/api/client-notifications?username=${encodeURIComponent(username)}`);
      const data = await res.json();
      setNotifs(data.records || []);
    } catch {}
  }

  async function dismissNotif(recordId) {
    setNotifs(prev => prev.filter(n => n.id !== recordId));
    fetch('/api/client-notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recordId })
    }).catch(() => {});
  }

  async function dismissAll() {
    if (!notifs.length || clearingAll) return;
    setClearingAll(true);
    const toMark = [...notifs];
    setNotifs([]);
    await Promise.allSettled(
      toMark.map(n =>
        fetch('/api/client-notifications', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recordId: n.id })
        })
      )
    );
    showToast('تم مسح جميع الإشعارات ✓');
    setClearingAll(false);
  }

  async function loadOrders(username) {
    setLoading(true);
    try {
      const res     = await fetch(`/api/my-orders?username=${encodeURIComponent(username)}`);
      const data    = await res.json();
      const records = data.records || [];
      setOrders(records);
      loadRatings(records, username);
    } catch { showToast('تعذّر تحميل الطلبات'); }
    setLoading(false);
  }

  async function loadRatings(orders, username) {
    if (!orders.length) return;
    const map = {};
    await Promise.all(orders.map(async (o) => {
      const pid = o.fields.payment_id;
      if (!pid) return;
      try {
        const r = await fetch(`/api/ratings?payment_id=${encodeURIComponent(pid)}`);
        const d = await r.json();
        const ex = d.records?.find(rec => rec.fields.buyer_username === username);
        if (ex) map[pid] = { stars: ex.fields.stars, comment: ex.fields.comment || '', submitted: true };
      } catch {}
    }));
    setRatings(map);
  }

  async function submitRating(order) {
    const pid   = order.fields.payment_id;
    const input = ratingInput[pid] || {};
    if (!input.stars) { showToast('اختر عدد النجوم أولاً'); return; }
    setSubmitting(pid);
    try {
      const res = await fetch('/api/ratings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyer_username:  user.username,
          seller_username: order.fields.seller_username || '',
          product_id:      order.fields.product_id      || '',
          payment_id:      pid,
          stars:           input.stars,
          comment:         input.comment || ''
        })
      });
      const data = await res.json();
      if (res.ok) {
        setRatings(r => ({ ...r, [pid]: { stars: input.stars, comment: input.comment || '', submitted: true } }));
        showToast('شكراً! تم حفظ تقييمك ⭐');
      } else {
        showToast(data.error || 'فشل حفظ التقييم');
      }
    } catch { showToast('خطأ في الإرسال'); }
    setSubmitting(null);
  }

  async function requestRefund(order) {
    setRequesting(order.id);
    try {
      const res = await fetch('/api/refund', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action:         'request',
          buyer_username: user.username,
          buyer_uid:      user.uid || '',
          buyer_wallet:   user.wallet_address || '',
          product_id:     order.fields.product_id,
          product_name:   order.fields.product_name,
          payment_id:     order.fields.payment_id,
          amount_pi:      order.fields.amount_pi
        })
      });
      const data = await res.json();
      if (res.ok) showToast('✅ تم إرسال طلب الاسترجاع');
      else showToast(data.error || 'فشل إرسال الطلب');
    } catch { showToast('خطأ في الاتصال'); }
    setRequesting(null);
  }

  const notifStyle = (label) => {
    if (label?.includes('🚚')) return { bg:'rgba(56,189,248,0.12)', border:'#38bdf8', color:'#38bdf8' };
    if (label?.includes('✅')) return { bg:'rgba(34,197,94,0.12)',  border:'#22c55e', color:'#22c55e' };
    if (label?.includes('🚫') || label?.includes('❌'))
      return { bg:'rgba(239,68,68,0.12)', border:'#ef4444', color:'#ef4444' };
    return { bg:'rgba(212,175,55,0.12)', border:'#d4af37', color:'#d4af37' };
  };

  return (
    <>
      <Head>
        <title>طلباتي — Souq Pi</title>
        <script src="https://sdk.minepi.com/pi-sdk.js" />
        <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no" />
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap" rel="stylesheet" />
      </Head>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:#0a0118;color:#fff;font-family:'Cairo',sans-serif;direction:rtl;min-height:100vh;padding-bottom:100px;}
        .header{background:rgba(26,11,46,0.95);padding:14px 20px;border-bottom:1px solid #d4af37;display:flex;align-items:center;gap:10px;position:sticky;top:0;z-index:100;}
        .back-btn{background:rgba(255,255,255,0.08);border:none;color:#fff;padding:8px 14px;border-radius:10px;cursor:pointer;font-family:'Cairo',sans-serif;font-size:0.85em;}
        .container{max-width:480px;margin:0 auto;padding:16px;}
        .login-box{text-align:center;padding:60px 20px;}
        .btn-login{background:linear-gradient(135deg,#6a0dad,#d4af37);color:white;border:none;padding:14px 30px;border-radius:14px;font-weight:900;cursor:pointer;font-size:1em;font-family:'Cairo',sans-serif;margin-top:20px;}
        .notif-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;}
        .notif-count-label{font-size:0.78em;color:#b0b0b0;font-weight:700;}
        .btn-clear-all{background:none;border:1px solid rgba(239,68,68,0.4);color:#ef4444;padding:4px 12px;border-radius:20px;font-family:'Cairo';font-size:0.7em;cursor:pointer;font-weight:700;transition:background 0.15s;}
        .btn-clear-all:hover{background:rgba(239,68,68,0.1);}
        .btn-clear-all:disabled{opacity:0.4;cursor:not-allowed;}
        .notif-banner{display:flex;align-items:center;justify-content:space-between;border-radius:12px;padding:10px 14px;margin-bottom:8px;font-size:0.82em;font-weight:700;gap:8px;animation:slideIn 0.2s ease;}
        @keyframes slideIn{from{opacity:0;transform:translateY(-6px);}to{opacity:1;transform:translateY(0);}}
        .notif-x{background:none;border:none;color:inherit;cursor:pointer;font-size:1.1em;flex-shrink:0;opacity:0.7;padding:0 4px;}
        .notif-x:hover{opacity:1;}
        .order-card{background:#1a0b2e;border:1px solid #331a5e;border-radius:16px;padding:16px;margin-bottom:12px;}
        .order-name{font-weight:800;font-size:0.95em;}
        .order-price{color:#d4af37;font-weight:900;font-size:0.9em;white-space:nowrap;}
        .order-date{font-size:0.7em;color:#b0b0b0;margin-top:4px;}
        .status-badge{display:inline-block;padding:3px 12px;border-radius:10px;font-size:0.72em;font-weight:700;margin-top:6px;}
        .btn-refund{background:none;border:1px solid #ef4444;color:#ef4444;padding:8px;border-radius:10px;width:100%;font-size:0.8em;margin-top:8px;cursor:pointer;font-family:'Cairo',sans-serif;font-weight:700;}
        .btn-refund:disabled{opacity:0.5;cursor:not-allowed;}
        .rating-box{background:rgba(212,175,55,0.06);border:1px solid rgba(212,175,55,0.2);border-radius:12px;padding:12px;margin-top:10px;}
        .rating-title{font-size:0.78em;color:#d4af37;font-weight:700;margin-bottom:6px;text-align:center;}
        .rating-done{text-align:center;padding:8px;font-size:0.8em;color:#4ade80;}
        .rating-textarea{width:100%;background:#0a0118;border:1px solid #331a5e;border-radius:10px;padding:9px 12px;color:#fff;font-family:'Cairo';font-size:0.82em;resize:none;outline:none;margin-top:6px;}
        .btn-rate{background:linear-gradient(135deg,#6a0dad,#d4af37);color:#fff;border:none;padding:8px;border-radius:10px;width:100%;font-weight:700;cursor:pointer;font-family:'Cairo';font-size:0.82em;margin-top:8px;}
        .btn-rate:disabled{opacity:0.5;cursor:not-allowed;}
        .empty{text-align:center;padding:40px 20px;color:#b0b0b0;}
        .toast{position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:#6a0dad;padding:10px 20px;border-radius:20px;font-size:0.85em;z-index:2000;max-width:90%;text-align:center;}
        .count-badge{background:rgba(212,175,55,0.15);border:1px solid rgba(212,175,55,0.3);border-radius:12px;padding:8px 16px;margin-bottom:16px;text-align:center;font-size:0.85em;color:#d4af37;}
        .balance-badge{background:rgba(74,222,128,0.1);border:1px solid rgba(74,222,128,0.3);border-radius:12px;padding:8px 16px;margin-bottom:16px;text-align:center;font-size:0.85em;color:#4ade80;}
        .bottom-nav{position:fixed;bottom:0;left:0;right:0;background:#1a0b2e;display:flex;justify-content:space-around;padding:12px;border-top:1px solid #6a0dad;z-index:1000;}
        .nav-wrap{position:relative;flex:1;display:flex;flex-direction:column;align-items:center;cursor:pointer;}
        .nav-label{text-align:center;font-size:0.7em;color:#b0b0b0;}
        .nav-label.active{color:#d4af37;}
        .nav-badge{position:absolute;top:-4px;right:50%;transform:translateX(12px);background:#ef4444;border-radius:50%;min-width:17px;height:17px;font-size:0.6em;display:flex;align-items:center;justify-content:center;font-weight:900;padding:0 3px;border:2px solid #1a0b2e;}
      `}</style>

      <div className="header">
        <button className="back-btn" onClick={() => window.location.href = '/'}>← رجوع</button>
        <div style={{ fontWeight:900 }}>
          📦 طلباتي
          {notifs.length > 0 && (
            <span style={{ marginRight:8, background:'#ef4444', borderRadius:50, padding:'1px 8px', fontSize:'0.65em', fontWeight:900, verticalAlign:'middle' }}>
              {notifs.length}
            </span>
          )}
        </div>
      </div>

      <div className="container">
        {!user ? (
          <div className="login-box">
            <div style={{ fontSize:'3em' }}>📦</div>
            <div style={{ fontWeight:800, fontSize:'1.1em', margin:'12px 0 8px' }}>سجّل الدخول</div>
            <div style={{ fontSize:'0.85em', color:'#b0b0b0' }}>لمشاهدة مشترياتك وطلب الاسترجاع</div>
            <button className="btn-login" onClick={loginWithPi}>دخول بـ Pi</button>
          </div>
        ) : loading ? (
          <div style={{ textAlign:'center', padding:40, color:'#b0b0b0' }}>
            <div style={{ fontSize:'1.5em', marginBottom:8 }}>⏳</div>
            جاري تحميل طلباتك...
          </div>
        ) : (
          <>
            {/* ── Notification banners ── */}
            {notifs.length > 0 && (
              <>
                <div className="notif-header">
                  <span className="notif-count-label">
                    🔔 {notifs.length} {notifs.length === 1 ? 'إشعار جديد' : 'إشعارات جديدة'}
                  </span>
                  <button
                    className="btn-clear-all"
                    onClick={dismissAll}
                    disabled={clearingAll}
                  >
                    {clearingAll ? '⏳ جاري المسح...' : '✓ مسح الكل'}
                  </button>
                </div>

                {notifs.map(n => {
                  const st = notifStyle(n.fields.status_label);
                  return (
                    <div key={n.id} className="notif-banner" style={{ background:st.bg, border:`1px solid ${st.border}`, color:st.color }}>
                      <span>
                        {n.fields.status_label}
                        {n.fields.product_name ? `: ${n.fields.product_name}` : ''}
                      </span>
                      <button className="notif-x" onClick={() => dismissNotif(n.id)}>✕</button>
                    </div>
                  );
                })}
              </>
            )}

            {balance && <div className="balance-badge">رصيدك: π {parseFloat(balance).toFixed(4)}</div>}
            {orders.length > 0 && <div className="count-badge">لديك {orders.length} طلب</div>}

            {orders.length === 0 ? (
              <div className="empty">
                <div style={{ fontSize:'3em', marginBottom:12 }}>🛒</div>
                <div style={{ fontWeight:800, marginBottom:8 }}>لا توجد طلبات بعد</div>
                <div style={{ fontSize:'0.82em' }}>ابدأ التسوق من الصفحة الرئيسية</div>
                <button onClick={() => window.location.href = '/'} style={{ background:'linear-gradient(135deg,#6a0dad,#d4af37)', border:'none', color:'white', padding:'10px 24px', borderRadius:'12px', fontWeight:700, cursor:'pointer', fontFamily:'Cairo', marginTop:16 }}>
                  تسوق الآن
                </button>
              </div>
            ) : orders.map(order => {
              const pid         = order.fields.payment_id;
              const statusKey   = order.fields.delivery_status || 'pending';
              const statusStyle = STATUS_COLORS[statusKey] || STATUS_COLORS.pending;
              const existRating = ratings[pid];
              const inp         = ratingInput[pid] || {};

              return (
                <div key={order.id} className="order-card">
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                    <div>
                      <div className="order-name">{order.fields.product_name || 'منتج'}</div>
                      <div className="order-date">{order.fields.created_at ? order.fields.created_at.split('T')[0] : ''}</div>
                      <div className="status-badge" style={{ background:statusStyle.bg, border:`1px solid ${statusStyle.border}`, color:statusStyle.color }}>
                        {statusStyle.label}
                      </div>
                    </div>
                    <div className="order-price">π {order.fields.amount_pi}</div>
                  </div>

                  <button className="btn-refund" onClick={() => requestRefund(order)} disabled={requesting === order.id}>
                    {requesting === order.id ? '⏳ جاري الإرسال...' : '↩️ طلب استرجاع'}
                  </button>

                  <div className="rating-box">
                    <div className="rating-title">⭐ قيّم هذا الطلب</div>
                    {existRating?.submitted ? (
                      <div className="rating-done">
                        {'★'.repeat(existRating.stars)}{'☆'.repeat(5 - existRating.stars)}<br />
                        <span style={{ fontSize:'0.85em', color:'#b0b0b0' }}>{existRating.comment || 'شكراً على تقييمك!'}</span>
                      </div>
                    ) : (
                      <>
                        <StarRating
                          value={inp.stars || 0}
                          onChange={s => setRatingInput(r => ({ ...r, [pid]: { ...r[pid], stars: s } }))}
                          disabled={submitting === pid}
                        />
                        <textarea
                          className="rating-textarea" rows={2}
                          placeholder="اكتب تعليقك (اختياري)..."
                          value={inp.comment || ''}
                          onChange={e => setRatingInput(r => ({ ...r, [pid]: { ...r[pid], comment: e.target.value } }))}
                          disabled={submitting === pid}
                        />
                        <button className="btn-rate" disabled={!inp.stars || submitting === pid} onClick={() => submitRating(order)}>
                          {submitting === pid ? '⏳ جاري الإرسال...' : '⭐ أرسل التقييم'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      <div className="bottom-nav">
        <div className="nav-wrap" onClick={() => window.location.href = '/'}>
          <span style={{ fontSize:'1.3em' }}>🏠</span>
          <span className="nav-label">الرئيسية</span>
        </div>

        <div className="nav-wrap" style={{ opacity:0.5 }}>
          <span style={{ fontSize:'1.3em' }}>🔍</span>
          <span className="nav-label">بحث</span>
        </div>

        <div className="nav-wrap">
          <span style={{ fontSize:'1.3em' }}>📦</span>
          {notifs.length > 0 && <span className="nav-badge">{notifs.length > 9 ? '9+' : notifs.length}</span>}
          <span className="nav-label active">طلباتي</span>
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
