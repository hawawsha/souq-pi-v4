import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingCart, User, Shield } from 'lucide-react';
import { useStore } from '../store/useStore';

const Navbar: React.FC = () => {
  const location = useLocation();
  const { cart, isAdmin, currentUser } = useStore();
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <nav className="sticky top-0 z-50 bg-zinc-950/95 backdrop-blur-lg border-b border-zinc-800">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-9 h-9 bg-violet-600 rounded-xl flex items-center justify-center">
            <span className="font-bold text-xl">π</span>
          </div>
          <div>
            <div className="font-semibold text-2xl tracking-tight">PiStore</div>
            <div className="text-[10px] text-zinc-500 -mt-1">Pi Network Marketplace</div>
          </div>
        </Link>

        <div className="flex items-center gap-10 text-sm font-medium">
          <Link to="/" className={location.pathname === '/' ? 'text-white' : 'text-zinc-400 hover:text-white'}>Shop</Link>
          <Link to="/orders" className={location.pathname === '/orders' ? 'text-white' : 'text-zinc-400 hover:text-white'}>My Orders</Link>
          <Link to="/admin" className={`flex items-center gap-1.5 ${location.pathname === '/admin' ? 'text-white' : 'text-zinc-400 hover:text-white'}`}>
            <Shield size={15} /> Admin
          </Link>
        </div>

        <div className="flex items-center gap-4 text-sm">
          {currentUser && <div className="px-4 py-1.5 bg-zinc-900 rounded-full text-xs text-zinc-400">{currentUser}</div>}
          <Link to="/orders" className="flex items-center gap-2 px-5 py-2 rounded-full bg-zinc-900 hover:bg-zinc-800 transition">
            <User size={17} /> Orders
          </Link>
          <div className="relative flex items-center gap-2 px-5 py-2 rounded-full bg-zinc-900">
            <ShoppingCart size={17} /> Cart
            {cartCount > 0 && <div className="absolute -top-1 -right-1 bg-violet-600 text-[10px] font-mono w-5 h-5 flex items-center justify-center rounded-full">{cartCount}</div>}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
