import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, X, Plus, Minus } from 'lucide-react';
import { useStore } from '../store/useStore';
import { initPiSDK, authenticateWithPi, createPiPayment } from '../lib/pi-sdk';
import { CartItem, Order } from '../lib/types';

const Home: React.FC = () => {
  const { products, cart, addToCart, removeFromCart, updateCartQuantity, clearCart, addOrder, setCurrentUser, currentUser } = useStore();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleCheckout = async () => {
    if (!cart.length) return;

    setIsProcessing(true);

    try {
      const initialized = initPiSDK();
      if (!initialized) {
        alert('Please open this app inside Pi Browser to make payments with Pi.');
        setIsProcessing(false);
        return;
      }

      const auth = await authenticateWithPi((payment) => {
        console.log('Incomplete payment found:', payment);
      });

      if (auth?.user) {
        setCurrentUser(auth.user.username);
      }

      const memo = `PiStore Purchase: ${cart.length} items`;
      const metadata = { items: cart.map(i => ({ id: i.id, qty: i.quantity })) };

      await createPiPayment(
        total,
        memo,
        metadata,
        // onReadyForServerApproval
        async (paymentId) => {
          try {
            await fetch('/api/payments/approve', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ paymentId, userId: auth?.user?.username || 'guest' }),
            });
          } catch (e) { console.error(e); }
        },
        // onReadyForServerCompletion
        async (paymentId, txid) => {
          try {
            await fetch('/api/payments/complete', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ paymentId, txid, userId: auth?.user?.username || 'guest' }),
            });

            const newOrder: Order = {
              id: 'ORD-' + Date.now(),
              userId: auth?.user?.username || 'guest',
              items: [...cart],
              total,
              status: 'completed',
              paymentId,
              createdAt: new Date().toISOString(),
              txid,
            };
            addOrder(newOrder);
            clearCart();
            setIsCartOpen(false);
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 2800);
          } catch (e) { console.error(e); }
          setIsProcessing(false);
        },
        // onCancel
        (paymentId) => {
          fetch('/api/payments/incomplete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paymentId }),
          }).catch(() => {});
          setIsProcessing(false);
        },
        // onError
        (err) => {
          console.error('Payment error:', err);
          setIsProcessing(false);
        }
      );
    } catch (error) {
      console.error(error);
      alert('Payment could not be started. Ensure you are inside Pi Browser.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="flex justify-between items-end mb-10">
        <div>
          <div className="uppercase tracking-[4px] text-xs text-violet-500 mb-1">PI NETWORK OFFICIAL</div>
          <div className="text-6xl font-semibold tracking-tighter">Premium Electronics</div>
        </div>
        <button onClick={() => setIsCartOpen(true)} className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-white text-zinc-950 font-medium active:scale-[0.985] transition">
          <ShoppingCart size={19} /> View Cart ({cart.length})
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {products.map((product) => (
          <div key={product.id} className="group bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-800">
            <div className="aspect-[16/10] relative overflow-hidden bg-black">
              <img src={product.image} alt={product.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition duration-700" />
            </div>
            <div className="p-6">
              <div className="text-xs tracking-widest text-violet-400 mb-1">{product.category}</div>
              <div className="font-semibold text-xl mb-1.5 tracking-tight">{product.name}</div>
              <div className="text-sm text-zinc-400 mb-6 line-clamp-2">{product.description}</div>
              <div className="flex items-center justify-between">
                <div><span className="font-mono text-3xl font-semibold">{product.price}</span> <span className="text-xs align-super text-zinc-400">π</span></div>
                <button onClick={() => addToCart(product)} className="px-7 py-3 bg-white text-black text-sm font-medium rounded-2xl active:bg-zinc-200">Add to Cart</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* CART DRAWER */}
      <AnimatePresence>
        {isCartOpen && (
          <div className="fixed inset-0 z-[60] flex justify-end" onClick={() => setIsCartOpen(false)}>
            <motion.div initial={{ x: 100 }} animate={{ x: 0 }} exit={{ x: 100 }} transition={{ type: 'spring', bounce: 0.02, duration: 0.4 }} className="w-full max-w-lg bg-zinc-950 border-l border-zinc-800 h-full p-8 flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-9">
                <div className="text-3xl font-semibold tracking-tight">Your Cart</div>
                <button onClick={() => setIsCartOpen(false)}><X /></button>
              </div>

              {cart.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-zinc-500">Your cart is empty</div>
              ) : (
                <>
                  <div className="flex-1 space-y-4 overflow-auto pr-1">
                    {cart.map((item) => (
                      <div key={item.id} className="flex gap-5 bg-zinc-900 p-5 rounded-2xl">
                        <div className="w-20 h-20 bg-zinc-800 rounded-xl overflow-hidden flex-shrink-0"><img src={item.image} className="object-cover w-full h-full" /></div>
                        <div className="flex-1 min-w-0 pt-0.5">
                          <div className="font-medium pr-6 tracking-tight">{item.name}</div>
                          <div className="text-xs text-zinc-400 mt-px">{item.price} π × {item.quantity}</div>
                          <div className="flex items-center gap-3 mt-3">
                            <button onClick={() => updateCartQuantity(item.id, item.quantity - 1)} className="p-1"><Minus size={15} /></button>
                            <div className="font-mono text-sm tabular-nums w-6 text-center">{item.quantity}</div>
                            <button onClick={() => updateCartQuantity(item.id, item.quantity + 1)} className="p-1"><Plus size={15} /></button>
                            <button onClick={() => removeFromCart(item.id)} className="ml-auto text-xs text-red-400">Remove</button>
                          </div>
                        </div>
                        <div className="font-mono text-right pt-1 tabular-nums">{(item.price * item.quantity).toFixed(0)} π</div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-8 border-t border-zinc-800 mt-auto">
                    <div className="flex justify-between items-baseline text-xl mb-7">
                      <div>Total</div><div className="font-mono font-semibold tabular-nums tracking-tighter">{total} π</div>
                    </div>
                    <button disabled={isProcessing} onClick={handleCheckout} className="w-full py-4 rounded-2xl bg-violet-600 active:bg-violet-700 disabled:bg-zinc-800 font-medium tracking-wider disabled:cursor-not-allowed">
                      {isProcessing ? 'PROCESSING PAYMENT...' : 'PAY WITH PI NETWORK'}
                    </button>
                    <div className="text-center text-[10px] mt-4 text-zinc-500">Secured via Pi Payments • Works only in Pi Browser</div>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {showSuccess && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-emerald-600 text-sm px-8 py-3 rounded-3xl font-medium">Payment successful! Order placed.</div>
      )}
    </div>
  );
};

export default Home;
