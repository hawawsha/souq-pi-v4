import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Lock, Plus } from 'lucide-react';
import { Product } from '../lib/types';

const Admin: React.FC = () => {
  const { products, orders, isAdmin, setAdmin, addProduct, updateProduct, deleteProduct } = useStore();
  const [pass, setPass] = useState('');
  const [editing, setEditing] = useState<Product | null>(null);
  const [newProd, setNewProd] = useState({ name: '', price: 0, image: '', description: '', category: '' });

  const login = () => {
    if (pass === 'adminpi2025') {
      setAdmin(true);
      setPass('');
    } else {
      alert('Incorrect admin password');
    }
  };

  const handleAdd = () => {
    if (!newProd.name) return;
    addProduct({ ...newProd, price: Number(newProd.price) });
    setNewProd({ name: '', price: 0, image: '', description: '', category: '' });
  };

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto pt-24 px-6 text-center">
        <div className="mx-auto w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center mb-8"><Lock size={32} /></div>
        <div className="text-4xl font-semibold tracking-tight mb-3">Admin Panel</div>
        <div className="text-zinc-400 mb-8">PiStore Management Console</div>
        <input value={pass} onChange={e => setPass(e.target.value)} type="password" placeholder="Enter admin password" className="w-full bg-zinc-900 border border-zinc-800 px-6 py-4 rounded-2xl text-center text-sm tracking-widest" />
        <button onClick={login} className="mt-4 w-full py-4 bg-white text-zinc-950 font-medium rounded-2xl">ACCESS ADMIN DASHBOARD</button>
        <div className="text-xs text-zinc-600 mt-4">Hint: adminpi2025</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="flex justify-between mb-10">
        <div><div className="font-semibold text-5xl tracking-tighter">Admin Dashboard</div><div className="text-violet-400 text-sm mt-1">PI NETWORK STORE CONTROL</div></div>
        <button onClick={() => setAdmin(false)} className="text-sm text-zinc-400">Logout</button>
      </div>

      {/* Products Management */}
      <div className="mb-14">
        <div className="flex items-center justify-between mb-5"><div className="font-medium text-xl">Products ({products.length})</div><button onClick={() => setEditing({} as Product)} className="flex gap-2 items-center text-sm bg-white text-black px-5 py-2 rounded-2xl"><Plus size={16} /> Add Product</button></div>
        <div className="bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-800">
          {products.map(p => (
            <div key={p.id} className="flex border-b border-zinc-800 last:border-none items-center px-7 py-5 gap-4 text-sm">
              <div className="flex-1 font-medium">{p.name}</div>
              <div className="font-mono w-20 text-right">{p.price} π</div>
              <button onClick={() => setEditing(p)} className="px-6 py-1 rounded-xl bg-zinc-800 text-xs">EDIT</button>
              <button onClick={() => deleteProduct(p.id)} className="px-6 py-1 rounded-xl bg-red-950/70 text-red-400 text-xs">DELETE</button>
            </div>
          ))}
        </div>
      </div>

      {/* Payment & Order Records */}
      <div>
        <div className="font-medium text-xl mb-5">All Payments & Orders ({orders.length})</div>
        <div className="bg-zinc-900 rounded-3xl p-8 text-sm border border-zinc-800 font-mono">
          {orders.length === 0 && <div className="text-zinc-500">No transactions yet.</div>}
          {orders.map(o => (
            <div key={o.id} className="flex justify-between py-3 border-b border-zinc-800 last:border-none">
              <div>{o.id} • {o.userId}</div>
              <div>{o.total} π — {o.status}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Edit / Add Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[70]" onClick={() => setEditing(null)}>
          <div className="bg-zinc-950 p-9 rounded-3xl w-full max-w-md border border-zinc-700" onClick={e => e.stopPropagation()}>
            <div className="font-semibold text-2xl mb-6 tracking-tight">Edit Product</div>
            {['name', 'price', 'image', 'description', 'category'].map(key => (
              <input key={key} className="block w-full mb-3 bg-zinc-900 border border-zinc-800 px-5 py-3 rounded-2xl text-sm" placeholder={key} value={(editing as any)[key] || ''} onChange={e => setEditing({ ...editing, [key]: key === 'price' ? +e.target.value : e.target.value } as any)} />
            ))}
            <div className="flex gap-3 mt-8">
              <button onClick={() => { if (editing.id) updateProduct(editing.id, editing); else addProduct(editing); setEditing(null); }} className="flex-1 py-3.5 bg-white text-black rounded-2xl">Save Changes</button>
              <button onClick={() => setEditing(null)} className="flex-1 py-3.5 border border-zinc-700 rounded-2xl">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
