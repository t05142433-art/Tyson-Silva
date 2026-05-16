import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import axios from 'axios';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from "@google/genai";
import FormData from 'form-data';

dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// --- Persistent State ---
interface UserSession {
  userId: string;
  username: string;
  state: 'idle' | 'ordering' | 'preparing' | 'delivering' | 'waiting_payment' | 'completed';
  currentOrder?: {
    item: string;
    price: string;
    orderId: string;
  };
  lastMessageId: string | null;
}

const userSessions: Record<string, UserSession> = {};

interface BotConfig {
  datr: string;
  ig_did: string;
  mid: string;
  csrftoken: string;
  ds_user_id: string;
  sessionid: string;
  thread_id: string;
  fb_dtsg: string;
  jazoest: string;
  lsd: string;
  rur: string;
  av: string;
  __hs: string;
  __rev: string;
  __hsi: string;
  __dyn: string;
  __csr: string;
  __s: string;
  __spin_r: string;
  __spin_b: string;
  __spin_t: string;
  bot_username: string; // Adicionado campo para o nome do bot
}

let botConfig: BotConfig = {
  datr: "vozQaZ9FTfSuYSDOh8c3S56v",
  ig_did: "0A7CD33E-D3EC-401D-9761-77259A2493C3",
  mid: "aeWT0wABAAEsIxXdTnCzSQUzd_Yw",
  csrftoken: "z74sVzAK61AEWtTm7q2XXyY6Wqrs2Iqp",
  ds_user_id: "80209457261",
  sessionid: "80209457261%3A3JvME561jAntvQ%3A14%3AAYhBty-q1RXwMl-7zvATIGvlSjhhKvnvFxBECtJVyg",
  thread_id: "17844148881673262",
  fb_dtsg: "NAfw0SGH0BBiXnlXgCCRBorekgIWvNjq27UAnXr5sWah-6F9T68h7vg:17858225011064242:1778889274",
  jazoest: "26167",
  lsd: "WQ2akzLeXPtE8tK7ZL5nYN",
  rur: "\"FRC\\05480209457261\\0541810435418:01fe88f302b9fe025d9f0ada2e9057cc1f9fc24ad09f52e71e650ce51a8273a3fc4a45ec\"",
  av: "17841480197836182",
  __hs: "20589.HYP:instagram_web_pkg.2.1...0",
  __rev: "1039636267",
  __hsi: "7640314811416692071",
  __dyn: "7xeUjG1mxu1syaxG4Vp41twpUnwgU7SbzEdF8aUco2qwJyEiw9-1DwUx609vCwjE1EEc87m0yE462mcw5Mx62G5UswoEcE7O2l0Fwqo31w9O1lwxwQzXwae4UaEW2G0AEco4i5o2eUlwhEe88o5i0oa2-azo7u3C2u2J0bS1LyUaUbGwmk0zU8oC1Iwqo5p389oed6hEhK2O4Xxui2qi7E5y4UrwlE2xyVrx60jy7EG3a18whE984O0XEdoCU",
  __csr: "gqgiMrRb5ggFYh7RlYAAtsAI87ZEACEzlqRycxQvy4mdAFNnnESPJk9gNWQEHky8IZkBtd4aV9dqHjhbx6WAy-gCWAAnp6ALGhfiGKAqAheK8DEyFup8-C-WyKQml7dVkGqmGQqAJ4zbqCAALggV44V9ZkAJyaKEOb9GEpVSiECVFurCzo-ucRyElxy4RCCKaGcKbXjDiyIwC8VrGJ4miZ29K_V8F-mbzECdiHgOqFUGdyqzHAx24FUkmehqKbABzo-mcAyZqwkm2Lw3yU04d612w5Ow0Ojwh8028Mw0hhV98C3a04p8uwVy80Ya440dvo1boco12S0ji3PwxVWway0GEgw2eFB40so2uwVQ2a5o2gPO0Yw3nF-1dg4a0YE6W15hqgcpA1pw4CcEiokQ442Ki9Q04aE-7o6BBy52iwEgaUUxU045e0ccw0rr8lO0",
  __spin_r: "1039636267",
  __spin_b: "trunk",
  __spin_t: "1778899415",
  bot_username: "programador2026_",
  __s: "kqel9j:bsz3ps:xmrc8o"
};

interface Order {
  id: string;
  user: string;
  item: string;
  price: string;
  status: 'pending' | 'paid';
  createdAt: number;
}

const orders: Record<string, Order> = {};
let messageHistory: { id: string; sender: 'user' | 'bot'; text: string; attachment?: string; timestamp: number }[] = [
  { id: 'start', sender: 'bot', text: 'Bem-vindo ao Thayson Delivery! Peça o que quiser sem precisar de cardápio.', timestamp: Date.now() }
];

function addToHistory(sender: 'user' | 'bot', text: string, attachment?: string) {
  messageHistory.push({ 
    id: Math.random().toString(36).substring(7), 
    sender, 
    text, 
    attachment,
    timestamp: Date.now() 
  });
  if (messageHistory.length > 50) messageHistory.shift();
}

// --- Instagram API Helpers ---

function generateThreadingId() {
  return Array.from({ length: 19 }, () => Math.floor(Math.random() * 10)).join("");
}

async function sendIGMessage(text: string, imageUrl?: string) {
  addToHistory('bot', text, imageUrl);
  const url = "https://www.instagram.com/api/graphql";
  const cookies = `datr=${botConfig.datr}; ig_did=${botConfig.ig_did}; ps_l=1; ps_n=1; mid=${botConfig.mid}; ig_nrcb=1; dpr=2.206249952316284; csrftoken=${botConfig.csrftoken}; ds_user_id=${botConfig.ds_user_id}; sessionid=${botConfig.sessionid}; rur=${botConfig.rur}; wd=489x920`;

  const variables = {
    ig_thread_igid: botConfig.thread_id,
    offline_threading_id: generateThreadingId(),
    recipient_igids: null,
    replied_to_client_context: null,
    replied_to_item_id: null,
    reply_to_message_id: null,
    sampled: null,
    text: { sensitive_string_value: text },
    mentions: [],
    mentioned_user_ids: [],
    commands: null,
    forwarded_from_thread_id: null,
    is_forwarded_from_own_message: null,
    send_attribution: "igd_web_chat_tab:in_thread"
  };

  const payload = new URLSearchParams({
    av: botConfig.av,
    __d: "www",
    __user: "0",
    __a: "1",
    __req: "20",
    __hs: botConfig.__hs,
    dpr: "3",
    __ccg: "GOOD",
    __rev: botConfig.__rev,
    __hsi: botConfig.__hsi,
    __dyn: botConfig.__dyn,
    __csr: botConfig.__csr,
    __s: botConfig.__s,
    __comet_req: "7",
    fb_dtsg: botConfig.fb_dtsg,
    jazoest: botConfig.jazoest,
    lsd: botConfig.lsd,
    __spin_r: botConfig.__spin_r,
    __spin_b: botConfig.__spin_b,
    __spin_t: botConfig.__spin_t,
    __crn: "comet.igweb.PolarisDirectInboxMobileRoute",
    fb_api_caller_class: "RelayModern",
    fb_api_req_friendly_name: "IGDirectTextSendMutation",
    server_timestamps: "true",
    variables: JSON.stringify(variables),
    doc_id: "26911679871773184"
  });

  try {
    const response = await axios.post(url, payload, {
      maxRedirects: 0,
      validateStatus: (status) => status >= 200 && status < 400,
      headers: {
        'cookie': cookies,
        'x-csrftoken': botConfig.csrftoken,
        'user-agent': "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36",
        'x-ig-app-id': "1217981644879628",
        'origin': 'https://www.instagram.com',
        'referer': `https://www.instagram.com/direct/t/${botConfig.thread_id}/`,
        'content-type': 'application/x-www-form-urlencoded',
        'x-fb-lsd': botConfig.lsd,
        'x-asbd-id': '359341',
        'x-fb-friendly-name': 'IGDirectTextSendMutation',
        'sec-fetch-site': 'same-origin',
        'sec-fetch-mode': 'cors',
        'sec-fetch-dest': 'empty',
        'accept-language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        'priority': 'u=1, i'
      }
    });
    return response.data;
  } catch (error: any) {
    console.error("IG Send Error:", error.response?.data || error.message);
    return { error: true, details: error.response?.data };
  }
}

// --- Menu & Constants ---
const menu = [
  { id: 1, name: "Feijão com Ovo", price: "R$ 15,00" },
  { id: 2, name: "Arroz com Galinha", price: "R$ 22,00" },
  { id: 3, name: "Picanha na Brasa", price: "R$ 45,00" },
  { id: 101, name: "Cerveja Lata", price: "R$ 8,00" },
  { id: 102, name: "Cachaça Thayson", price: "R$ 5,00" }
];

const paymentMethods = [
  "1. PIX",
  "2. Cartão",
  "3. Dinheiro"
];

async function fetchImageAsBase64(url: string): Promise<{ data: string; mimeType: string } | null> {
  if (url.startsWith('data:')) {
    const match = url.match(/^data:(.*);base64,(.*)$/);
    if (match) return { mimeType: match[1], data: match[2] };
  }
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    const mimeType = (response.headers['content-type'] as string) || 'image/jpeg';
    const base64 = Buffer.from(response.data, 'binary').toString('base64');
    return { data: base64, mimeType };
  } catch (e) {
    console.error("Failed to fetch image for Gemini:", e);
    return null;
  }
}

// --- AI Service ---
async function identifyIntention(text: string, state: string, username: string, imageUrl?: string) {
  const systemInstruction = "Você é o 'Bar do Thayson', um dono de bar gente fina, engraçado e prestativo do interior do Brasil. Você ajuda as pessoas com QUALQUER problema, desde pedidos de comida até dúvidas de escola ou conselhos. Fale gírias de bar (patrão, mestre, queridão, chefia). Responda sempre em no máximo 15 palavras. Se receber uma imagem, analise e ajude o usuário com o que ele pedir sobre ela.";
  
  let prompt = `Estado atual: ${state}. Usuário: ${username}. Mensagem: "${text}".
  Menu: ${JSON.stringify(menu)}.
  
  Regras:
  1. Pedido comida/bebida: { "type": "order", "itemName": "nome", "price": "valor" }
  2. Pagamento: { "type": "payment_selection", "index": número }
  3. Conversa/Ajuda: { "type": "chat", "response": "resposta curta na lata" }
  
  Se houver imagem, considere que o usuário quer ajuda com o conteúdo dela.
  Responda APENAS JSON.`;

  try {
    const parts: any[] = [{ text: prompt }];
    if (imageUrl) {
      const imgData = await fetchImageAsBase64(imageUrl);
      if (imgData) {
        parts.push({
          inlineData: {
            data: imgData.data,
            mimeType: imgData.mimeType
          }
        });
      }
    }

    const result = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts },
      config: {
        systemInstruction
      }
    });

    const content = result.text || "";
    const jsonMatch = content.match(/\{.*\}/s);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : { type: 'chat', response: `Ih ${username}, não entendi nada! Bebeu foi? Repete aí!` };
  } catch (e) {
    console.error("Gemini Error:", e);
    return { type: 'chat', response: `Opa ${username}, o sistema deu uma engasgada na cachaça aqui, mas fala de novo!` };
  }
}

async function generateAiImage(prompt: string): Promise<string | null> {
  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
    });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image', // Correct name from skill
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      }
    });

    // Iterate through all parts to find the image part as recommended in the skill
    const candidates = response.candidates;
    if (candidates && candidates.length > 0) {
      const parts = candidates[0].content.parts;
      for (const part of parts) {
        if (part.inlineData) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
    return null;
  } catch (e: any) {
    console.error("Gemini Image Gen Error:", e.message);
    // Explicitly check for 403 (Permission Denied) or 429 (Resource Exhausted)
    // In our context, 429 with "limit 0" means it's a paid model.
    if (e.message?.includes("403") || e.message?.includes("429") || e.message?.includes("quota")) {
      console.log("Model might require a paid key or quota is exceeded.");
      // We return a special string to handle this in the UI
      return "ERROR_PAID_MODEL_REQUIRED";
    }
    // Fallback to Pollinations
    return `https://pollinations.ai/p/${encodeURIComponent(prompt)}?width=1024&height=1024&seed=${Math.floor(Math.random() * 100000)}&nologo=true`;
  }
}

// --- Logic ---
async function uploadToInstagram(imageData: string): Promise<string | null> {
  const cookies = `datr=${botConfig.datr}; ig_did=${botConfig.ig_did}; ps_l=1; ps_n=1; mid=${botConfig.mid}; ig_nrcb=1; dpr=2.206249952316284; csrftoken=${botConfig.csrftoken}; ds_user_id=${botConfig.ds_user_id}; sessionid=${botConfig.sessionid}; rur=${botConfig.rur}; wd=489x920`;
  
  try {
    let buffer: Buffer;
    let mimeType = 'image/jpeg';

    if (imageData.startsWith('data:')) {
      const matches = imageData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (!matches) return null;
      mimeType = matches[1];
      buffer = Buffer.from(matches[2], 'base64');
    } else {
      const response = await axios.get(imageData, { responseType: 'arraybuffer' });
      buffer = Buffer.from(response.data, 'binary');
    }
    
    const form = new FormData();
    const uploadId = (Date.now() + Math.floor(Math.random() * 1000)).toString();
    
    form.append('upload_id', uploadId);
    form.append('f_id', "");
    form.append('view_mode', "default");
    form.append('image_id', "");
    form.append('filename', "image.jpg");
    form.append('filetype', mimeType);
    form.append('temp_id', "temp_" + Math.random().toString(36).substring(7));
    form.append('file', buffer, { filename: 'image.jpg', contentType: mimeType });

    const uploadUrl = `https://www.instagram.com/ajax/mercury/upload.php?av=${botConfig.av}&__d=www&__user=0&__a=1&__req=20&__hs=${botConfig.__hs}&dpr=3&__ccg=GOOD&__rev=${botConfig.__rev}&__s=${botConfig.__s}&__hsi=${botConfig.__hsi}&__dyn=${botConfig.__dyn}&__csr=${botConfig.__csr}&__comet_req=7&fb_dtsg=${botConfig.fb_dtsg}&jazoest=${botConfig.jazoest}&lsd=${botConfig.lsd}&__spin_r=${botConfig.__spin_r}&__spin_b=${botConfig.__spin_b}&__spin_t=${botConfig.__spin_t}&__crn=comet.igweb.PolarisDirectInboxMobileRoute`;

    const uploadResponse = await axios.post(uploadUrl, form, {
      headers: {
        ...form.getHeaders(),
        'cookie': cookies,
        'x-csrftoken': botConfig.csrftoken,
        'user-agent': "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36",
        'x-ig-app-id': "1217981644879628",
        'origin': 'https://www.instagram.com',
        'referer': `https://www.instagram.com/direct/t/${botConfig.thread_id}/`,
        'x-fb-lsd': botConfig.lsd,
        'x-asbd-id': '129477',
        'x-fb-friendly-name': 'PolarisDirectUpload'
      }
    });

    let body = uploadResponse.data;
    const bodyStr = typeof body === 'string' ? (body.includes('for (;;);') ? body.replace('for (;;);', '') : body) : JSON.stringify(body);
    console.log("Upload Response Raw:", bodyStr);
    
    const fbidMatch = bodyStr.match(/"fbid":\s*"?(\d+)"?/) || 
                      bodyStr.match(/"image_id":\s*"?(\d+)"?/) || 
                      bodyStr.match(/"upload_id":\s*"?(\d+)"?/);
    
    return fbidMatch ? fbidMatch[1] : null;
  } catch (e: any) {
    console.error("Upload failed", e.response?.data || e.message);
    return null;
  }
}

async function sendIGMedia(attachmentFbid: string) {
  const url = "https://www.instagram.com/api/graphql";
  const cookies = `datr=${botConfig.datr}; ig_did=${botConfig.ig_did}; ps_l=1; ps_n=1; mid=${botConfig.mid}; ig_nrcb=1; dpr=2.206249952316284; csrftoken=${botConfig.csrftoken}; ds_user_id=${botConfig.ds_user_id}; sessionid=${botConfig.sessionid}; rur=${botConfig.rur}; wd=489x920`;

  const variables = {
    attachment_fbid: attachmentFbid,
    thread_id: botConfig.thread_id,
    offline_threading_id: generateThreadingId(),
    reply_to_message_id: null,
    forwarded_from_thread_id: null,
    is_forwarded_from_own_message: null
  };

  const payload = new URLSearchParams({
    av: botConfig.av,
    __d: "www",
    __user: "0",
    __a: "1",
    __req: "22",
    __hs: botConfig.__hs,
    dpr: "3",
    __ccg: "GOOD",
    __rev: botConfig.__rev,
    __hsi: botConfig.__hsi,
    __dyn: botConfig.__dyn,
    __csr: botConfig.__csr,
    __s: botConfig.__s,
    __comet_req: "7",
    fb_dtsg: botConfig.fb_dtsg,
    jazoest: botConfig.jazoest,
    lsd: botConfig.lsd,
    __spin_r: botConfig.__spin_r,
    __spin_b: botConfig.__spin_b,
    __spin_t: botConfig.__spin_t,
    __crn: "comet.igweb.PolarisDirectInboxMobileRoute",
    fb_api_caller_class: "RelayModern",
    fb_api_req_friendly_name: "IGDirectMediaSendMutation",
    server_timestamps: "true",
    variables: JSON.stringify(variables),
    doc_id: "25766288509716264"
  });

  try {
    await axios.post(url, payload, {
      headers: {
        'cookie': cookies,
        'x-csrftoken': botConfig.csrftoken,
        'user-agent': "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36",
        'x-ig-app-id': "1217981644879628",
        'content-type': 'application/x-www-form-urlencoded',
        'x-fb-lsd': botConfig.lsd,
        'x-asbd-id': '359341'
      }
    });
  } catch (e: any) {
    console.error("Media Send Error", e.response?.data || e.message);
  }
}

async function handleBotLogic(text: string, userId: string, username: string, imageUrl?: string) {
  let session = userSessions[userId];
  if (!session) {
    session = { userId, username, state: 'idle', lastMessageId: null };
    userSessions[userId] = session;
  }

  const logText = text || (imageUrl ? "[IMAGEM ENVIADA]" : "");
  addToHistory('user', logText, imageUrl);
  
  // High-priority command detection for image generation
  const lowerText = text.toLowerCase();
  const isImageRequest = /#?ger[ae].*imagem|#?cri[ae].*imagem|#?faz.*imagem|#?imagine/i.test(lowerText);
  
  if (isImageRequest) {
      const cleanPrompt = text.replace(/#?(gera|gere|cria|faz|imagine)( uma)? imagem( de)?/i, "").trim();
      const finalPrompt = cleanPrompt || "fiat uno com escada";
      await sendIGMessage(`Opa, patrão! Vou caprichar na arte do(a) "${finalPrompt}" pra você... 🎨`);
      
      const generatedData = await generateAiImage(finalPrompt);
      if (generatedData) {
          const fbid = await uploadToInstagram(generatedData);
          if (fbid) {
              await sendIGMedia(fbid);
              addToHistory('bot', `[IMAGEM ENVIADA: ${finalPrompt}]`, generatedData);
          } else {
              // Fallback to link
              await sendIGMessage(`Olha o que saiu do forno: ${generatedData}`);
          }
      }
      return;
  }

  const intent = await identifyIntention(text, session.state, username, imageUrl);
  console.log("Intent detected:", intent);

  // Prevention: If prepping, don't allow new orders
  if (session.state === 'preparing' || session.state === 'delivering') {
    await sendIGMessage(`Calma aí, ${username}! O seu ${session.currentOrder?.item} tá quase saindo do fogo. Segura a emoção! 🍳🔥`);
    return;
  }

  // Handle Payment Selection while waiting
  if (session.state === 'waiting_payment' && (intent.type === 'payment_selection' || !isNaN(parseInt(text)))) {
    const orderId = session.currentOrder?.orderId;
    const siteUrl = `${process.env.APP_URL || 'https://' + process.env.VITE_APP_URL}/payment/${orderId}?user=${encodeURIComponent(username)}`;
    await sendIGMessage(`Boa escolha, ${username}! 📄\n\nLink seguro pra pagar: ${siteUrl}\n\nAssim que o pix cair, eu solto o grito aqui! ⚡`);
    return;
  }

  // Handle Order
  if (intent.type === 'order' && intent.itemName) {
    const orderId = Math.random().toString(36).substring(7);
    orders[orderId] = {
      id: orderId,
      user: username,
      item: intent.itemName,
      price: intent.price || "R$ 20,00",
      status: 'pending',
      createdAt: Date.now()
    };
    session.currentOrder = { item: intent.itemName, price: intent.price || "R$ 20,00", orderId };
    session.state = 'preparing';

    await sendIGMessage(`FECHOU, ${username}! 📝 Um ${intent.itemName} caprichado saindo agora!`);
    
    // Generate and send image URL immediately
    const generatedImgUrl = await generateAiImage(intent.itemName);
    if (generatedImgUrl) {
      await sendIGMessage(`Olha a cara dessa maravilha que tô fazendo pra você:`, generatedImgUrl);
    }

    // Immersion Steps
    const steps = [
      { msg: `🍳 O óleo tá estalando aqui, ${username}! Já tá no fogo...`, delay: 6000 },
      { msg: "🔥 O cheiro tá subindo! Esse tempero do Thayson é matador...", delay: 6000 },
      { msg: "🧺 ESCORRENDO! Tá saindo agora, crocante demais...", delay: 4000 },
      { msg: "🛵 O motoboy já deu o grau! Tá chegando aí na sua porta! 💨", delay: 8000 },
      { msg: `🏠 CHEGOU, ${username}! O entregador tá aí na frente. Recebe ele lá!`, delay: 4000 },
    ];

    let t = 0;
    steps.forEach((s, i) => {
      t += s.delay;
      setTimeout(async () => {
        await sendIGMessage(s.msg);
        if (i === steps.length - 1) {
          session.state = 'waiting_payment';
          await sendIGMessage(`E aí, ${username}, o ${intent.itemName} tava bom? 😋\n\nBora pro acerto? Escolhe aí:\n\n1. PIX\n2. Cartão\n3. Dinheiro\n\nDigita o número!`);
        }
      }, t);
    });
    return;
  }

  // Normal Chat
  if (intent.response) {
    await sendIGMessage(intent.response);
  }
}

let isPolling = false;
async function pollInstagram() {
  if (isPolling) return;
  isPolling = true;
  try {
    const url = `https://www.instagram.com/api/v1/direct_v2/threads/${botConfig.thread_id}/`;
    const cookies = `datr=${botConfig.datr}; ig_did=${botConfig.ig_did}; ps_l=1; ps_n=1; mid=${botConfig.mid}; ig_nrcb=1; csrftoken=${botConfig.csrftoken}; ds_user_id=${botConfig.ds_user_id}; sessionid=${botConfig.sessionid}; rur=${botConfig.rur}; wd=489x920`;
    
    const response = await axios.get(url, {
      maxRedirects: 0,
      validateStatus: (status) => status >= 200 && status < 400,
      headers: {
        'cookie': cookies,
        'user-agent': "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36",
        'x-ig-app-id': "1217981644879628",
        'referer': 'https://www.instagram.com/'
      }
    });

    const messages = response.data?.thread?.items || [];
    if (messages.length > 0) {
      const topMsg = messages[0];
      if (topMsg.user_id !== botConfig.ds_user_id) {
        let session = userSessions[topMsg.user_id];
        if (!session || topMsg.item_id !== session.lastMessageId) {
          if (!session) {
             const sender = response.data?.thread?.users?.find((u: any) => u.pk.toString() === topMsg.user_id.toString())?.username || "Cliente";
             session = { userId: topMsg.user_id, username: sender, state: 'idle', lastMessageId: topMsg.item_id };
             userSessions[topMsg.user_id] = session;
          }
          session.lastMessageId = topMsg.item_id;
          
          const rawText = (topMsg.text || "").trim();
          const attachments = topMsg.content?.attachments || [];
          const imageUrl = attachments[0]?.preview_cdn_url || null;
          
          const isMentioned = rawText.includes(`@${botConfig.bot_username}`);
          const isCommand = rawText.startsWith("#");
          const isInFlow = session.state !== 'idle';
          
          // Se for imagem ou menção ou comando ou fluxo ativo
          if (imageUrl || isMentioned || isCommand || isInFlow) {
            const cleanText = rawText.replace(new RegExp(`@${botConfig.bot_username}`, 'g'), "").replace(/^#/, "").trim();
            await handleBotLogic(cleanText, session.userId, session.username, imageUrl);
          } else {
            console.log(`Mensagem ignorada de ${session.username}: Sem gatilho.`);
          }
        }
      }
    }
  } catch (error: any) {
    if (error.response?.status !== 302) console.error("Poll error:", error.message);
  } finally { isPolling = false; }
}

setInterval(pollInstagram, 11000);

// --- Routes ---
app.get('/api/history', (req, res) => res.json(messageHistory));
app.get('/api/admin/config', (req, res) => res.json(botConfig));
app.post('/api/admin/config', (req, res) => { botConfig = { ...botConfig, ...req.body }; res.json({ message: "OK" }); });
app.post('/api/simulate-reaction', async (req, res) => {
  const { text, user, userId, imageUrl } = req.body;
  await handleBotLogic(text, userId || 'simulated', user || "Visitante", imageUrl);
  res.json({ message: "OK" });
});
app.get('/api/order/:id', (req, res) => res.json(orders[req.params.id] || { error: "Não achei" }));

// --- Test Endpoints ---
app.post('/api/admin/generate-image', async (req, res) => {
  const { prompt } = req.body;
  try {
    const data = await generateAiImage(prompt || "fiat uno com escada");
    if (data) {
      res.json({ success: true, data });
    } else {
      res.status(500).json({ success: false, error: "Falha ao gerar imagem" });
    }
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.post('/api/admin/send-media', async (req, res) => {
  const { imageData } = req.body;
  try {
    const fbid = await uploadToInstagram(imageData);
    if (fbid) {
      await sendIGMedia(fbid);
      res.json({ success: true, fbid });
    } else {
      res.status(500).json({ success: false, error: "Falha no upload (FBID não retornado)" });
    }
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.post('/api/admin/test', async (req, res) => {
  const result = await sendIGMessage("Testando... 1, 2, 3! Thayson na área! 🍻");
  res.json(result);
});

app.post('/api/pay', async (req, res) => {
  const { orderId } = req.body;
  const order = orders[orderId];
  if (order) {
    order.status = 'paid';
    await sendIGMessage(`PAGAMENTO CONFIRMADO! 💰✅\n\nRecebi aqui, *${order.user}*! Já pode comer sem culpa. Valeu demais, volte sempre!`);
    const session = Object.values(userSessions).find(s => s.username === order.user);
    if (session) session.state = 'completed';
    return res.json({ status: "success" });
  }
  res.status(404).json({ error: "Erro" });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }
  app.listen(PORT, "0.0.0.0", () => console.log(`Server running on port ${PORT}`));
}

startServer();

