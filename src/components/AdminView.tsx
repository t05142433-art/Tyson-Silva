import React, { useState, useEffect } from 'react';

export default function AdminView() {
  const [config, setConfig] = useState({
    sessionid: '',
    ds_user_id: '',
    csrftoken: '',
    mid: '',
    ig_did: '',
    datr: '',
    thread_id: '',
    fb_dtsg: '',
    jazoest: '',
    lsd: '',
    rur: '',
    av: '',
    __hs: '',
    __rev: '',
    __hsi: '',
    __dyn: '',
    __csr: '',
    __s: '',
    __spin_r: '',
    __spin_b: '',
    __spin_t: '',
    bot_username: ''
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [testImage, setTestImage] = useState('');
  const [testLoading, setTestLoading] = useState(false);

  useEffect(() => {
    fetch('/api/admin/config')
      .then(res => res.json())
      .then(data => {
        setConfig(data);
        setLoading(false);
      });
  }, []);

  const handleSave = () => {
    fetch('/api/admin/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    }).then(() => setMessage('Configuração salva!'));
  };

  if (loading) return <div>Carregando...</div>;

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-neutral-200">
      <h2 className="text-2xl font-bold mb-6">Painel Admin - Cookies</h2>
      <p className="text-sm text-neutral-500 mb-6">Insira os cookies e IDs do Instagram aqui para o bot funcionar.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.keys(config).map((key) => (
          <div key={key}>
            <label className="block text-[10px] font-bold text-neutral-400 uppercase mb-1 tracking-wider">{key}</label>
            <input
              type="text"
              value={(config as any)[key]}
              onChange={(e) => setConfig({ ...config, [key]: e.target.value })}
              className="w-full p-2 border border-neutral-200 rounded-lg text-xs font-mono bg-neutral-50 focus:bg-white focus:ring-2 focus:ring-blue-100 transition focus:outline-none"
            />
          </div>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={handleSave}
          className="bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition shadow-lg shadow-blue-100"
        >
          Salvar Configurações
        </button>

        <button
          onClick={() => {
            fetch('/api/admin/test', { method: 'POST' })
              .then(res => res.json())
              .then(data => setMessage(data.message || data.error));
          }}
          className="bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 transition shadow-lg shadow-green-100"
        >
          Testar Bot (Enviar Oi)
        </button>
      </div>

      <div className="mt-8 pt-8 border-t border-neutral-200">
        <h3 className="text-lg font-bold mb-4">Teste de Geração de Imagem Real</h3>
        <div className="flex flex-col gap-4">
          <input 
            type="text" 
            placeholder="Ex: fiat uno com escada"
            className="w-full p-3 border border-neutral-200 rounded-lg"
            id="test-prompt"
          />
          <div className="flex gap-4">
            <button
               onClick={() => {
                const prompt = (document.getElementById('test-prompt') as HTMLInputElement).value;
                setTestLoading(true);
                setTestImage('');
                fetch('/api/admin/generate-image', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ prompt })
                })
                .then(res => res.json())
                .then(data => {
                  setTestLoading(false);
                  if(data.success) {
                    if (data.data === "ERROR_PAID_MODEL_REQUIRED") {
                      setMessage("Esse modelo precisa de uma chave paga (Billing). Clique no botão abaixo para selecionar sua chave.");
                    } else {
                      setTestImage(data.data);
                    }
                  } else {
                    setMessage(data.error);
                  }
                });
              }}
              disabled={testLoading}
              className="bg-purple-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-purple-700 transition"
            >
              {testLoading ? 'Gerando...' : '1. Gerar Imagem (Gemini)'}
            </button>

            <button
               onClick={async () => {
                // Call the platform tool to show API key selection
                // Note: I cannot call tools from the frontend directly, 
                // but I can create an endpoint that calls it? 
                // No, show_aistudio_ui is an agent tool.
                // I will just inform the user to use the button in the agent sidebar or wait for me to prompt.
                // Wait, I can call the tool NOW if I'm the agent.
                // But the user is interacting with the UI.
                // I'll tell them to ask me "Ativar modelo pago" or similar.
                // Actually, I'll just explain.
                setMessage("Por favor, me peça 'Ativar modelo pago' aqui no chat para eu abrir a configuração para você.");
              }}
              className="bg-neutral-800 text-white font-bold py-3 px-6 rounded-lg hover:bg-black transition"
            >
              Ativar Chave Paga
            </button>

            {testImage && (
              <button
                onClick={() => {
                  setTestLoading(true);
                  fetch('/api/admin/send-media', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ imageData: testImage })
                  })
                  .then(res => res.json())
                  .then(data => {
                    setTestLoading(false);
                    if(data.success) setMessage("Imagem enviada pro insta!");
                    else setMessage(data.error);
                  });
                }}
                className="bg-orange-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-orange-700 transition"
              >
                2. Enviar Realmente pro Insta
              </button>
            )}
          </div>

          {testImage && (
            <div className="mt-4 border p-2 rounded-lg bg-neutral-50 inline-block">
              <p className="text-xs mb-2 font-bold uppercase text-neutral-400">Prévia do que será enviado:</p>
              <img src={testImage} alt="Preview" className="max-w-[300px] rounded shadow-md" />
            </div>
          )}
        </div>
      </div>

      {message && <p className="mt-4 text-green-600 text-center font-medium">{message}</p>}
    </div>
  );
}
