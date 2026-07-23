import React from 'react';
import { useStore } from '../store/useStore';
import { Package, RefreshCw } from 'lucide-react';

const MyOrders: React.FC = () => {
  const { orders, updateOrderStatus, currentUser } = useStore();

  const userOrders = orders.filter(o => !currentUser || o.userId === currentUser);

  const handleRefund = (orderId: string) => {
    if (confirm('Request refund for this order?')) {
      updateOrderStatus(orderId, 'refunded');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <div className="mb-10">
        <div className="font-semibold text-5xl tracking-tighter">My Orders</div>
        <p className="text-zinc-400 mt-2">Track and manage all your Pi purchases</p>
      </div>

      {userOrders.length === 0 ? (
        <div className="text-center py-20 text-zinc-500 border border-zinc-800 rounded-3xl">No orders yet. Start shopping!</div>
      ) : (
        <div className="space-y-4">
          {userOrders.map(order => (
            <div key={order.id} className="bg-zinc-900 rounded-3xl p-8 border border-zinc-800">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-mono text-sm tracking-[3px] text-violet-400">{order.id}</div>
                  <div className="text-xl mt-1 font-medium">{order.items.length} items • {order.total} π</div>
                  <div className="text-xs text-zinc-500 mt-1">{new Date(order.createdAt).toLocaleDateString()}</div>
                </div>
                <div className={`px-4 py-1 text-xs rounded-full font-medium tracking-wider ${order.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' : order.status === 'refunded' ? 'bg-orange-500/10 text-orange-400' : 'bg-zinc-800 text-zinc-400'}`}>
                  {order.status.toUpperCase()}
                </div>
              </div>

              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm">
                {order.items.map(item => (
                  <div key={item.id} className="flex justify-between text-zinc-400"><div>{item.name} ×{item.quantity}</div><div>{item.price * item.quantity} π</div></div>
                ))}
              </div>

              {order.txid && <div className="mt-6 text-[10px] font-mono text-zinc-500">TX: {order.txid}</div>}

              {order.status === 'completed' && (
                <button onClick={() => handleRefund(order.id)} className="mt-8 inline-flex items-center gap-2 text-sm text-red-400 hover:text-red-300">
                  <RefreshCw size={15} /> Request Refund
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyOrders;
