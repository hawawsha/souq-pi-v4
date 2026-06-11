import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';

const STATUS_MAP = {
  pending:   { label: '⏳ قيد المعالجة', color: '#eab308' },
  shipped:   { label: '🚚 تم الشحن',     color: '#38bdf8' },
  delivered: { label: '✅ تم التسليم',   color: '#22c55e' },
  cancelled: { label: '🚫 ملغي',         color: '#ef4444' },
};

const BUYER_NOTIF_LABELS = {
  shipped:   '🚚 تم شحن طلبك',
  delivered: '✅ تم تسليم طلبك',
  cancelled: '🚫 تم إلغاء طلبك',
};

export default function AdminPage() {
  // Key is kept in memory only — never in localStorage
  const [keyInput, setKeyInput] = useState('');
  const [authed,   setAuthed]   = useState(false);
  const [orders,   setOrders]   = useState([]);
  const [refunds,  setRefunds]  = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [acting,   setActing]   = useState(null);
  const [tab,      setTab]      = useState('orders');
  const [toast,    setToast]    = useState(null);
  const [search,   setSearch]   = useState('');
  const keyRef = useRef('');

  const hdrs = () => ({
    'Content-Type': 'application/json',
    'x-admin-key': keyRef.current
  });

  function showToast(msg, ok = false) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  async function login() {
    const k = keyInput.trim();
    if (!k) return;
    setLoading(true);
    try {
      const r = await fetch('/api/admin-orders', {
        headers: { 'x-admin-key': k }
      });
      if (r.status === 401) { showToast('مفتاح خاطئ ❌'); setLoading(false); return; }
      keyRef.current = k;
      setKeyInput(''); // clear from input immediately
      setAuthed(true);
      await loadAll(k);
    } catch { showToast('خطأ في الاتصال'); }
    setLoading(false);
  }

  async function loadAll(overrideKey) {
    const k = overrideKey || keyRef.current;
    const h = { 'x-admin-key': k };
    try {
      const [oRes, rRes] = await Promise.all([
        fetch('/api/admin-orders', { headers: h }).then(r => r.json()),
        fetch('/api/refund?action=list', { headers: h }).then(r => r.json()),
      ]);
      setOrders(oRes.records  || []);
      setRefunds(rRes.records || []);
    } catch { showToast('فشل التحميل'); }
  }

  async function updateStatus(order, newStatus) {
    setActing(order.id);
    try {
      const r = await fetch('/api/admin-orders', {
        method: 'PATCH',
        headers: hdrs(),
        body: JSON.stringify({ recordId: order.id, delivery_status: newStatus })
      });
      const d = await r.json();
      if (d.success) {
        setOrders(prev => prev.map(o =>
          o.id === order.id ? { ...o, fields: { ...o.fields, delivery_status: newStatus } } : o
        ));
        showToast('✅ تم تحديث الحالة', true);

        // Telegram notification (fire-and-forget)
        const label = STATUS_MAP[newStatus]?.label || newStatus;
        fetch('/api/notify', {
          method: 'POST', headers: hdrs(),
          body: JSON.stringify({
            message: `🔔 تحديث طلب — Souq Pi\n\nالمنتج: ${order.fields.product_name || '—'}\nالمشتري: @${order.fields.username || '—'}\nالحالة: ${label}\nالمبلغ: π ${order.fields.amount_pi || 0}`
          })
        }).catch(() => {});

        // Client notification for buyer
        const buyerLabel = BUYER_NOTIF_LABELS[newStatus];
        if (buyerLabel && order.fields.username) {
          fetch('/api/client-notifications', {
            method: 'POST', headers: hdrs(),
            body: JSON.stringify({
              username:     order.fields.username,
              product_name: order.fields.product_name || '',
              status_label: buyerLabel,
              payment_id:   order.fields.payment_id   || ''
            })
          }).catch(() => {});
        }
      } else {
        showToast(d.error || 'فشل التحديث');
      }
    } catch { showToast('خطأ في الاتصال'); }
    setActing(null);
  }

  async function refundAction(record, action) {
    setActing(record.id);
    try {
      const r = await fetch('/api/refund', {
        method: 'POST', headers: hdrs(),
        body: JSON.stringify({ action, recordId: record.id })
      });
      const d = await r.json();
      if (r.ok) {
        showToast(action === 'approve' ? '✅ تم قبول الاسترجاع' : '❌ تم رفض الاسترجاع', action === 'approve');
        await loadAll();
      } else {
        showToast(d.error || 'فشل العملية');
      }
    } catch { showToast('خطأ في الاتصال'); }
    setActing(null);
  }

  const totalPi      = orders.reduce((s, o) => s + (parseFloat(o.fields.amount_pi) || 0), 0);
  const pendingCount = refunds.filter(r => r.fields.status === 'pending').length;
  const deliveredN   = orders.filter(o => o.fields.delivery_status === 'delivered').length;

  const filteredOrders  = orders.filter(o =>
    !search || [o.fields.username, o.fields.product_name, o.fields.payment_id]
      .some(v => (v || '').toLowerCase().includes(search.toLowerCase()))
  );
  const filteredRefunds = refunds.filter(r =>
    !search || [r.fields.buyer_username, r.fields.product_name]
      .some(v => (v || '').toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <>
      <Head>
        <title>لوحة التحكم — Souq Pi</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no" />
        <meta name="robots" content="noindex, nofollow" />
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap" rel="stylesheet" />
      </Head>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:#0a0118;color:#fff;font-family:'Cairo',sans-serif;direction:rtl;min-height:100vh;padding-bottom:40px;}
        .topbar{background:rgba(26,11,46,0.97);padding:12px 18px;border-bottom:2px solid #d4af37;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:200;}
        .logo{display:flex;align-items:center;gap:8px;font-weight:900;font-size:1em;}
        .logo-box{width:32px;height:32px;background:linear-gradient(135deg,#6a0dad,#d4af37);border-radius:8px;display:flex;align-items:center;justify-content:center;font-weight:900;}
        .login-wrap{display:flex;align-items:center;justify-content:center;min-height:85vh;padding:20px;}
        .login-box{background:#1a0b2e;border:1px solid #331a5e;border-radius:20px;padding:36px 28px;width:100%;max-width:360px;text-align:center;}
        .input{width:100%;background:#0a0118;border:1px solid #6a0dad;padding:13px;border-radius:12px;color:#fff;font-family:'Cairo';font-size:0.95em;outline:none;margin-bottom:12px;text-align:center;letter-spacing:0.15em;}
        .btn-primary{background:linear-gradient(135deg,#6a0dad,#d4af37);color:#fff;border:none;padding:13px;border-radius:12px;width:100%;font-weight:900;cursor:pointer;font-family:'Cairo';font-size:1em;}
        .btn-primary:disabled{opacity:0.6;cursor:not-allowed;}
        .tabs-row{display:flex;border-bottom:1px solid #331a5e;background:rgba(26,11,46,0.6);position:sticky;top:57px;z-index:100;overflow-x:auto;}
        .tabs-row::-webkit-scrollbar{display:none;}
        .tab-btn{flex:1;padding:12px 10px;background:none;border:none;color:#b0b0b0;font-family:'Cairo';font-size:0.82em;cursor:pointer;border-bottom:2px solid transparent;white-space:nowrap;}
        .tab-btn.active{color:#d4af37;border-bottom-color:#d4af37;font-weight:700;}
        .container{max-width:520px;margin:0 auto;padding:14px;}
        .stats-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:18px;}
        .stat-card{background:#1a0b2e;border:1px solid #331a5e;border-radius:14px;padding:14px;text-align:center;}
        .stat-num{font-size:1.6em;font-weight:900;}
        .stat-lbl{font-size:0.68em;color:#b0b0b0;margin-top:3px;}
        .search-input{width:100%;background:#0a0118;border:1.5px solid #6a0dad;padding:10px 14px;border-radius:12px;color:#fff;font-family:'Cairo';font-size:0.88em;outline:none;margin-bottom:12px;direction:rtl;}
        .card{background:#1a0b2e;border:1px solid #331a5e;border-radius:14px;padding:14px;margin-bottom:9px;}
        .card-head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;}
        .card-title{font-weight:800;font-size:0.88em;max-width:65%;}
        .card-pi{font-size:0.88em;color:#d4af37;font-weight:900;}
        .card-sub{font-size:0.72em;color:#b0b0b0;margin-top:2px;}
        .card-pid{font-size:0.62em;color:#6a0dad;direction:ltr;text-align:right;margin-top:2px;word-break:break-all;}
        .badge{display:inline-block;font-size:0.65em;padding:3px 10px;border-radius:10px;font-weight:700;margin:5px 0;}
        .status-btns{display:flex;gap:5px;margin-top:10px;flex-wrap:wrap;}
        .s-btn{flex:1;min-width:66px;padding:7px 4px;border-radius:9px;border:none;font-family:'Cairo';font-size:0.72em;cursor:pointer;font-weight:700;transition:opacity 0.15s;}
        .s-btn:disabled{opacity:0.35;cursor:not-allowed;}
        .actions{display:flex;gap:8px;margin-top:10px;}
        .btn-ok{flex:1;background:rgba(34,197,94,0.12);border:1px solid #22c55e;color:#22c55e;padding:9px;border-radius:10px;font-family:'Cairo';font-size:0.82em;cursor:pointer;font-weight:700;}
        .btn-no{flex:1;background:rgba(239,68,68,0.12);border:1px solid #ef4444;color:#ef4444;padding:9px;border-radius:10px;font-family:'Cairo';font-size:0.82em;cursor:pointer;font-weight:700;}
        .btn-ok:disabled,.btn-no:disabled{opacity:0.35;cursor:not-allowed;}
        .refund-info{background:rgba(212,175,55,0.06);border:1px solid rgba(212,175,55,0.15);border-radius:10px;padding:10px;margin-top:8px;font-size:0.75em;}
        .refund-info div{margin-bottom:3px;}
        .empty{text-align:center;padding:36px;color:#b0b0b0;font-size:0.85em;}
        .refresh-btn{background:rgba(212,175,55,0.12);border:1px solid #d4af37;color:#d4af37;padding:6px 14px;border-radius:8px;cursor:pointer;font-family:'Cairo';font-size:0.78em;}
        .logout-btn{background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);color:#ef4444;padding:6px 14px;border-radius:8px;cursor:pointer;font-family:'Cairo';font-size:0.78em;}
        .toast-wrap{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:3000;pointer-events:none;}
        .toast{padding:10px 22px;border-radius:20px;font-size:0.85em;white-space:nowrap;border:1px solid;font-family:'Cairo';}
        .sec-badge{background:rgba(74,222,128,0.1);border:1px solid rgba(74,222,128,0.25);color:#4ade80;border-radius:8px;padding:4px 10px;font-size:0.7em;display:inline-flex;align-items:center;gap:4px;}
      `}</style>

      <div className="topbar">
        <div className="logo">
          <div className="logo-box">π</div>
          لوحة التحكم
        </div>
        {authed && (
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <span className="sec-badge">🔒 محمي</span>
            <button className="refresh-btn" onClick={() => loadAll()}>↻ تحديث</button>
            <button className="logout-btn" onClick={() => { keyRef.current = ''; setAuthed(false); setOrders([]); setRefunds([]); }}>خروج</button>
          </div>
        )}
      </div>

      {/* ═══════════ LOGIN ═══════════ */}
      {!authed ? (
        <div className="login-wrap">
          <div className="login-box">
            <div style={{ fontSize:'3em', marginBottom:10 }}>🔐</div>
            <div style={{ fontWeight:900, fontSize:'1.15em', marginBottom:4 }}>دخول المالك</div>
            <div style={{ fontSize:'0.78em', color:'#b0b0b0', marginBottom:22 }}>
              أدخل مفتاح الأدمن (ADMIN_SECRET_KEY)
            </div>
            <input
              className="input"
              type="password"
              autoComplete="off"
              placeholder="••••••••••••"
              value={keyInput}
              onChange={e => setKeyInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && login()}
            />
            <div style={{ fontSize:'0.72em', color:'#6a0dad', marginBottom:16 }}>
              🛡️ المفتاح لا يُحفظ في المتصفح — يبقى في الذاكرة فقط
            </div>
            <button className="btn-primary" onClick={login} disabled={loading || !keyInput.trim()}>
              {loading ? '⏳ جاري التحقق...' : '🔓 دخول'}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="tabs-row">
            <button className={`tab-btn ${tab==='orders'  ? 'active':''}`} onClick={() => { setTab('orders');  setSearch(''); }}>
              📦 الطلبات ({orders.length})
            </button>
            <button className={`tab-btn ${tab==='refunds' ? 'active':''}`} onClick={() => { setTab('refunds'); setSearch(''); }}>
              ↩️ الاسترجاع {pendingCount > 0 ? `(${pendingCount})` : ''}
            </button>
            <button className={`tab-btn ${tab==='stats'   ? 'active':''}`} onClick={() => setTab('stats')}>
              📊 إحصاءات
            </button>
          </div>

          <div className="container">

            {/* ─── STATS ─── */}
            {tab === 'stats' && (
              <>
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-num" style={{ color:'#d4af37' }}>{orders.length}</div>
                    <div className="stat-lbl">إجمالي الطلبات</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-num" style={{ color:'#c084fc' }}>π {totalPi.toFixed(1)}</div>
                    <div className="stat-lbl">Pi المحوّلة</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-num" style={{ color: pendingCount > 0 ? '#ef4444' : '#4ade80' }}>{pendingCount}</div>
                    <div className="stat-lbl">استرجاع معلق</div>
                  </div>
                </div>
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-num" style={{ color:'#22c55e' }}>{deliveredN}</div>
                    <div className="stat-lbl">تم التسليم</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-num" style={{ color:'#38bdf8' }}>
                      {orders.filter(o => o.fields.delivery_status === 'shipped').length}
                    </div>
                    <div className="stat-lbl">في الشحن</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-num" style={{ color:'#eab308' }}>
                      {orders.filter(o => !o.fields.delivery_status || o.fields.delivery_status === 'pending').length}
                    </div>
                    <div className="stat-lbl">قيد المعالجة</div>
                  </div>
                </div>
                <div style={{ background:'#1a0b2e', border:'1px solid #331a5e', borderRadius:14, padding:16 }}>
                  <div style={{ fontWeight:800, marginBottom:10, color:'#d4af37' }}>آخر 5 طلبات</div>
                  {orders.slice(0,5).map(o => (
                    <div key={o.id} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid #1e0a3c' }}>
                      <div>
                        <div style={{ fontSize:'0.83em', fontWeight:700 }}>{o.fields.product_name || '—'}</div>
                        <div style={{ fontSize:'0.7em', color:'#b0b0b0' }}>@{o.fields.username}</div>
                      </div>
                      <div style={{ color:'#d4af37', fontWeight:900, fontSize:'0.85em' }}>π {o.fields.amount_pi}</div>
                    </div>
                  ))}
                  {orders.length === 0 && <div className="empty">لا توجد طلبات</div>}
                </div>
              </>
            )}

            {/* ─── ORDERS ─── */}
            {tab === 'orders' && (
              <>
                <input className="search-input" placeholder="🔍 بحث بالاسم أو المشتري..." value={search} onChange={e => setSearch(e.target.value)} />
                {filteredOrders.length === 0
                  ? <div className="empty">لا توجد طلبات</div>
                  : filteredOrders.map(o => {
                    const ds  = o.fields.delivery_status || 'pending';
                    const st  = STATUS_MAP[ds] || STATUS_MAP.pending;
                    return (
                      <div key={o.id} className="card">
                        <div className="card-head">
                          <div>
                            <div className="card-title">{o.fields.product_name || '(بدون اسم)'}</div>
                            <div className="card-sub">المشتري: @{o.fields.username || '—'}</div>
                            <div className="card-pid">{(o.fields.payment_id || '').slice(0, 28)}…</div>
                          </div>
                          <div className="card-pi">π {o.fields.amount_pi}</div>
                        </div>
                        <span className="badge" style={{ background:`${st.color}20`, color:st.color, border:`1px solid ${st.color}` }}>
                          {st.label}
                        </span>
                        {o.fields.created_at && (
                          <div className="card-sub">{new Date(o.fields.created_at).toLocaleDateString('ar-SA')}</div>
                        )}
                        <div className="status-btns">
                          {['pending','shipped','delivered','cancelled'].map(s => (
                            <button
                              key={s}
                              className="s-btn"
                              disabled={acting === o.id || ds === s}
                              onClick={() => updateStatus(o, s)}
                              style={{
                                background: ds === s ? `${STATUS_MAP[s].color}25` : 'rgba(255,255,255,0.04)',
                                border:     `1px solid ${ds === s ? STATUS_MAP[s].color : '#2d1050'}`,
                                color:      ds === s ? STATUS_MAP[s].color : '#888'
                              }}
                            >
                              {s==='pending' ? '⏳ معالجة' : s==='shipped' ? '🚚 شحن' : s==='delivered' ? '✅ تسليم' : '🚫 إلغاء'}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })
                }
              </>
            )}

            {/* ─── REFUNDS ─── */}
            {tab === 'refunds' && (
              <>
                <input className="search-input" placeholder="🔍 بحث..." value={search} onChange={e => setSearch(e.target.value)} />
                {filteredRefunds.length === 0
                  ? <div className="empty">لا توجد طلبات استرجاع</div>
                  : filteredRefunds.map(r => {
                    const sc = r.fields.status === 'approved' ? '#22c55e' : r.fields.status === 'rejected' ? '#ef4444' : r.fields.status === 'manual_refund_needed' ? '#f97316' : '#eab308';
                    const sl = r.fields.status === 'approved' ? '✅ مُعتمد' : r.fields.status === 'rejected' ? '❌ مرفوض' : r.fields.status === 'manual_refund_needed' ? '⚠️ يدوي' : '⏳ معلق';
                    return (
                      <div key={r.id} className="card">
                        <div className="card-head">
                          <div>
                            <div className="card-title">{r.fields.product_name || '—'}</div>
                            <div className="card-sub">المشتري: @{r.fields.buyer_username || '—'}</div>
                          </div>
                          <div className="card-pi">π {r.fields.amount_pi}</div>
                        </div>
                        <span className="badge" style={{ background:`${sc}20`, color:sc, border:`1px solid ${sc}` }}>{sl}</span>

                        {/* Manual refund warning */}
                        {r.fields.status === 'manual_refund_needed' && r.fields.manual_refund_note && (
                          <div className="refund-info" style={{ borderColor:'rgba(249,115,22,0.3)' }}>
                            <div style={{ color:'#f97316', fontWeight:700, marginBottom:4 }}>⚠️ يحتاج استرجاع يدوي</div>
                            <div style={{ color:'#e2c897' }}>{r.fields.manual_refund_note}</div>
                            {r.fields.buyer_wallet && <div style={{ color:'#b0b0b0', direction:'ltr', fontSize:'0.9em', marginTop:4 }}>محفظة: {r.fields.buyer_wallet}</div>}
                          </div>
                        )}

                        {r.fields.status === 'pending' && (
                          <div className="actions">
                            <button className="btn-ok" disabled={acting === r.id} onClick={() => refundAction(r, 'approve')}>
                              {acting === r.id ? '⏳' : '✅ قبول الاسترجاع'}
                            </button>
                            <button className="btn-no" disabled={acting === r.id} onClick={() => refundAction(r, 'reject')}>
                              {acting === r.id ? '⏳' : '❌ رفض'}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                }
              </>
            )}

          </div>
        </>
      )}

      {toast && (
        <div className="toast-wrap">
          <div className="toast" style={{
            background: toast.ok ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
            borderColor: toast.ok ? '#22c55e' : '#ef4444'
          }}>
            {toast.msg}
          </div>
        </div>
      )}
    </>
  );
}
