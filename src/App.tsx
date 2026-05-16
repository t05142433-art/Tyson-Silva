import React, { useState, useEffect } from 'react';
import AdminView from './components/AdminView';
import PaymentView from './components/PaymentView';
import ChatPreview from './components/ChatPreview';

export default function App() {
  const [view, setView] = useState<'admin' | 'payment' | 'chat'>('admin');
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    // Basic route handling for payments
    const path = window.location.pathname;
    if (path.startsWith('/payment/')) {
      const id = path.split('/')[2];
      setOrderId(id);
      setView('payment');
    }
  }, []);

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans">
      <nav className="p-4 bg-white border-bottom border-neutral-200 flex justify-between items-center sticky top-0 z-50">
        <h1 className="text-xl font-bold tracking-tight text-neutral-800">Thayson Delivery Bot</h1>
        <div className="flex gap-4">
          <button 
            onClick={() => setView('admin')}
            className={`text-sm font-medium ${view === 'admin' ? 'text-blue-600' : 'text-neutral-500'}`}
          >
            Admin
          </button>
          <button 
            onClick={() => setView('chat')}
            className={`text-sm font-medium ${view === 'chat' ? 'text-blue-600' : 'text-neutral-500'}`}
          >
            Chat Sim
          </button>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto p-4 md:p-8">
        {view === 'admin' && <AdminView />}
        {view === 'chat' && <ChatPreview />}
        {view === 'payment' && orderId && <PaymentView orderId={orderId} />}
      </main>
    </div>
  );
}
