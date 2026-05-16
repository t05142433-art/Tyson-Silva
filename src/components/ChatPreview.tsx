import React, { useState, useEffect, useRef } from 'react';
import { Send, User, Bot, UtensilsCrossed, Image as ImageIcon } from 'lucide-react';
import { motion } from 'motion/react';

interface Msg {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  image?: string;
}

export default function ChatPreview() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const poll = setInterval(() => {
      fetch('/api/history')
        .then(res => res.json())
        .then(data => {
            setMessages(data.map((m: any) => {
              let img = m.attachment;
              let cleanText = m.text;

              // Fallback: If no explicit attachment, check text for links (for older messages)
              if (!img) {
                const urlMatch = m.text.match(/(https?:\/\/[^\s]+|data:image\/[a-zA-Z]*;base64,[^\s]+)/);
                if (urlMatch) {
                  img = urlMatch[1];
                  cleanText = m.text.replace(urlMatch[1], '').trim();
                }
              }

              // Fallback: detect food keywords for visual cues if no image exists
              if (!img && m.sender === 'bot') {
                 if (m.text.includes('confirmado') || m.text.includes('selecionou') || m.text.includes('Anotado') || m.text.includes('FECHOU')) {
                    const match = m.text.match(/\*(.*?)\*/) || m.text.match(/Um (.*?) caprichado/) || m.text.match(/Um (.*?) saindo/);
                    if (match) {
                       img = `https://pollinations.ai/p/${encodeURIComponent(match[1].trim() + " food appetizing")}?width=600&height=400&nologo=true`;
                    }
                 }
                 if (m.text.includes('PIX')) img = 'https://picsum.photos/seed/pix_qr/400/400';
                 if (m.text.includes('PAGAMENTO CONFIRMADO')) img = 'https://picsum.photos/seed/paid_stamp/400/300';
              }

              return {
                id: m.id,
                sender: m.sender,
                text: cleanText || (img ? '' : ''),
                image: img
              };
            }));
        });
    }, 2000);
    return () => clearInterval(poll);
  }, []);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSend = async () => {
    if (!input.trim() && !selectedImage) return;
    
    const text = input;
    const imageUrl = selectedImage;
    setInput('');
    setSelectedImage(null);
    setLoading(true);

    try {
      await fetch('/api/simulate-reaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, user: 'Usuário Demo', imageUrl })
      });
      setLoading(false);
      // The polling will pick up the user message and bot responses
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-2xl shadow-lg border border-neutral-200 overflow-hidden">
      <div className="p-4 border-b bg-neutral-50 flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white">
          <Bot className="w-6 h-6" />
        </div>
        <div>
          <p className="font-bold text-sm">Thayson Bot</p>
          <p className="text-[10px] uppercase font-bold text-green-500 tracking-wider">Online</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${
              msg.sender === 'user' 
                ? 'bg-blue-600 text-white rounded-br-none' 
                : 'bg-neutral-100 text-neutral-800 rounded-bl-none'
            }`}>
              <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
              {msg.image && (
                <img src={msg.image} alt="comida" className="mt-2 rounded-lg w-full" referrerPolicy="no-referrer" />
              )}
            </div>
          </div>
        ))}
        {loading && <div className="text-xs text-neutral-400 italic">Bot digitando...</div>}
      </div>

      <div className="p-4 border-t flex flex-col gap-2">
        {selectedImage && (
          <div className="relative w-20 h-20 group">
            <img src={selectedImage} alt="preview" className="w-full h-full object-cover rounded-lg border border-neutral-200" />
            <button 
              onClick={() => setSelectedImage(null)}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600"
            >
              <UtensilsCrossed className="w-3 h-3 rotate-45" />
            </button>
          </div>
        )}
        <div className="flex gap-2">
          <input 
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImageSelect}
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="text-neutral-400 hover:text-blue-600 transition p-2"
          >
            <ImageIcon className="w-5 h-5" />
          </button>
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Peça comida ou envie uma matéria..."
            className="flex-1 p-2 border border-neutral-200 rounded-full text-sm px-4 focus:outline-none focus:border-blue-500"
          />
          <button 
            onClick={handleSend}
            className="bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center hover:bg-blue-700 transition"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
