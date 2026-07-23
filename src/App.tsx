import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import MyOrders from './pages/MyOrders';
import Admin from './pages/Admin';
import { Toaster } from './components/Toaster';

function App() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/orders" element={<MyOrders />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
      <Toaster />
    </div>
  );
}

export default App;
