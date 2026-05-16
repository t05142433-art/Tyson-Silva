import React, { useState, useEffect } from 'react';
import { CreditCard, Wallet, Smartphone, CheckCircle, Receipt, UtensilsCrossed, Package, Truck, HandCoins } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Order {
  id: string;
  user: string;
  item: string;
  price: string;
  status: string;
}

export default function PaymentView({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [paid, setPaid] = useState(false);
  const [step, setStep] = useState(0); // 0: Receipt, 1: Selection, 2: Process, 3: Success

  useEffect(() => {
    fetch(`/api/order/${orderId}`)
      .then(res => res.json())
      .then(data => {
        setOrder(data);
        setLoading(false);
      });
  }, [orderId]);

  const handlePay = (method: string) => {
    setStep(2);
    // Simulate processing
    setTimeout(() => {
      fetch('/api/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, method })
      }).then(() => {
        setPaid(true);
        setStep(3);
      });
    }, 2500);
  };

  const foodImage = order ? `https://pollinations.ai/p/${encodeURIComponent(order.item + " food photography brazillian rustic")}?width=800&height=600&nologo=true` : '';

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mb-4"
      />
      <p className="text-neutral-500 font-medium animate-pulse">Lendo comanda...</p>
    </div>
  );

  if (!order) return (
    <div className="text-center py-20 px-6">
      <div className="bg-red-50 text-red-600 p-4 rounded-xl inline-block mb-4">⚠️</div>
      <h2 className="text-xl font-bold">Comanda extraviada!</h2>
      <p className="text-neutral-500">Não achamos o pedido {orderId} no sistema do bar.</p>
    </div>
  );

  return (
    <div className="max-w-md mx-auto px-4 pb-10 pt-10">
      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div 
            key="receipt"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="relative"
          >
            {/* The "Physical" Receipt Effect */}
            <div className="bg-white rounded-xl shadow-2xl relative overflow-hidden border-t-8 border-yellow-400">
               <div className="h-48 w-full bg-cover bg-center" style={{ backgroundImage: `url(${foodImage})` }}>
                  <div className="w-full h-full bg-black/40 flex items-end p-6">
                    <h1 className="text-white text-3xl font-black italic tracking-tighter uppercase">{order.item}</h1>
                  </div>
               </div>
               
               <div className="p-8 font-mono text-sm space-y-4">
                  <div className="flex justify-between border-b pb-2 border-dashed">
                    <span className="text-neutral-400">PEDIDO</span>
                    <span className="font-bold">#{order.id.toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2 border-dashed">
                    <span className="text-neutral-400">CLIENTE</span>
                    <span className="font-bold underline decoration-wavy decoration-yellow-400">{order.user}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2 border-dashed">
                    <span className="text-neutral-400">OPERADOR</span>
                    <span className="font-bold">IA THAYSON</span>
                  </div>
                  
                  <div className="pt-4 text-center">
                    <p className="text-[10px] text-neutral-300 mb-1">TOTAL A PAGAR</p>
                    <p className="text-5xl font-black text-neutral-800">{order.price}</p>
                  </div>

                  <button 
                    onClick={() => setStep(1)}
                    className="w-full mt-8 bg-black text-white font-bold py-4 rounded-full hover:scale-105 transition transform active:scale-95 flex items-center justify-center gap-2"
                  >
                    IR PARA O PAGAMENTO <Smartphone className="w-5 h-5" />
                  </button>
               </div>
               
               {/* ZigZag Bottom */}
               <div className="h-4 w-full bg-[radial-gradient(circle,transparent_0,transparent_8px,#fff_8px)] bg-[length:16px_16px] bg-repeat-x -mt-2 rotate-180" />
            </div>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div 
            key="selection"
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -100, opacity: 0 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl font-black text-neutral-800">COMO VAI SER?</h2>
              <p className="text-neutral-500">Escolha o veneno (do pagamento):</p>
            </div>

            <div className="grid gap-4">
              {[
                { id: 'pix', name: 'PIX IMEDIATO', icon: Smartphone, color: 'bg-teal-500', desc: 'Aprovação em 2 segundos' },
                { id: 'card', name: 'CARTÃO GOURMET', icon: CreditCard, color: 'bg-blue-600', desc: 'Crédito ou Débito' },
                { id: 'cash', name: 'DINHEIRO VIVO', icon: HandCoins, color: 'bg-green-600', desc: 'Pague ao motoboy' }
              ].map(m => (
                <button 
                  key={m.id}
                  onClick={() => handlePay(m.id)}
                  className="flex items-center p-5 bg-white rounded-2xl shadow-lg border border-neutral-100 hover:border-blue-500 transition group text-left"
                >
                  <div className={`${m.color} p-4 rounded-xl text-white mr-4 shadow-lg group-hover:scale-110 transition`}>
                    <m.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-neutral-800">{m.name}</h3>
                    <p className="text-xs text-neutral-400">{m.desc}</p>
                  </div>
                </button>
              ))}
            </div>

            <button onClick={() => setStep(0)} className="w-full text-neutral-400 text-sm font-medium py-2">Voltar para comanda</button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div 
            key="processing"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="relative w-32 h-32 mb-8">
               <motion.div 
                 animate={{ rotate: 360 }}
                 transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                 className="absolute inset-0 border-8 border-dotted border-blue-500 rounded-full"
               />
               <div className="absolute inset-4 flex items-center justify-center">
                 <HandCoins className="w-12 h-12 text-blue-500 animate-bounce" />
               </div>
            </div>
            <h2 className="text-2xl font-black text-neutral-800 mb-2 uppercase tracking-tighter">Validando Grana...</h2>
            <p className="text-neutral-400">A IA do Thayson tá conferindo os centavos.</p>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div 
            key="success"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center"
          >
            <div className="bg-white p-8 rounded-3xl shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 rotate-12 opacity-10">
                <CheckCircle className="w-32 h-32 text-green-500" />
              </div>
              
              <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-green-200">
                <CheckCircle className="w-12 h-12 text-white" />
              </div>
              
              <h2 className="text-3xl font-black text-neutral-800 mb-2 underline decoration-wavy decoration-green-300">PAGO COM SUCESSO!</h2>
              <p className="text-neutral-500 mb-8 max-w-[200px] mx-auto text-sm">
                A IA confirmou sua honestidade. Pode voltar pro Instagram agora!
              </p>

              {/* Physical Receipt Confirmation */}
              <div className="bg-neutral-50 rounded-xl p-4 border border-dashed text-left space-y-2 mb-8 relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-2 opacity-20 rotate-45">
                    <HandCoins className="w-12 h-12 text-green-800" />
                 </div>
                 <div className="flex justify-between text-[10px] font-mono">
                   <span>ID TRANSAÇÃO:</span>
                   <span>TX_{Math.random().toString(36).substring(2, 10).toUpperCase()}</span>
                 </div>
                 <div className="flex justify-between text-xs font-bold font-mono">
                   <span>TOTAL:</span>
                   <span>{order.price ?? '---'}</span>
                 </div>
                 <div className="pt-2">
                    <img 
                      src={`https://pollinations.ai/p/green%20check%20mark%20stamp%20on%20paper%20receipt%20success%20confirmed?width=400&height=200&nologo=true`} 
                      alt="Sucesso" 
                      className="rounded-lg opacity-80 mix-blend-multiply" 
                    />
                 </div>
              </div>

              <div className="text-xs text-neutral-400 font-medium italic">
                "Thayson agradece a preferência!"
              </div>
            </div>
            
            <p className="mt-8 text-neutral-400 font-bold animate-bounce uppercase tracking-widest text-[10px]">Pronto! Já avisei o bot no chat. ✅</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

