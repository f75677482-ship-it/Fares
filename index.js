const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    delay, 
    DisconnectReason,
    Browsers
} = require("@whiskeysockets/baileys");
const TelegramBot = require('node-telegram-bot-api');
const pino = require('pino');
const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const cors = require('cors');

// --- الإعدادات الأساسية ---
const token = '8631941557:AAHJ_97NplwcLMkee0-Zrf2FY5XqmI6E_0I'; 
const CHANNEL_USER = "@fz_z_Z"; 
const app = express();

app.use(express.json());
app.use(cors()); // أساسي للسماح للموقع بالاتصال بالسيرفر

const bot = new TelegramBot(token, { polling: true });
const SESSIONS_DIR = './sessions';
fs.ensureDirSync(SESSIONS_DIR);

// --- محرك الواتساب ---
async function startBot(chatId, phone) {
    const sessionDir = path.join(SESSIONS_DIR, String(chatId));
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    
    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        // تعريف المتصفح لتجنب حظر طلبات الكود
        browser: ["Ubuntu", "Chrome", "20.0.04"],
        printQRInTerminal: false,
    });

    if (!sock.authState.creds.registered) {
        await delay(5000); // تأخير لضمان جاهزية الاتصال
        try {
            const code = await sock.requestPairingCode(phone);
            return code;
        } catch (e) {
            console.error("Pairing Error:", e);
            return null;
        }
    }

    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'open') bot.sendMessage(chatId, "🔓 تم الاتصال بنجاح!");
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startBot(chatId, phone);
        }
    });

    return null;
}

// --- مسارات الـ API للموقع ---
app.post('/api/pairing', async (req, res) => {
    let { num } = req.body;
    if (!num) return res.status(400).json({ success: false, error: "الرقم مطلوب" });
    
    const cleanNumber = num.replace(/[^0-9]/g, ''); // تنظيف الرقم من الرموز
    const code = await startBot(`web_${cleanNumber}`, cleanNumber);
    
    if (code) {
        res.json({ success: true, code: code });
    } else {
        res.json({ success: false, error: "فشل طلب الكود، جرب مرة أخرى" });
    }
});

// --- أوامر تليجرام ---
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    if (msg.text && /^[0-9]{10,}$/.test(msg.text.replace('+', ''))) {
        bot.sendMessage(chatId, "⏳ جاري استخراج الكود...");
        const code = await startBot(chatId, msg.text.replace(/[^0-9]/g, ''));
        if (code) {
            bot.sendMessage(chatId, `✅ كود الربط الخاص بك هو:\n\n\`${code}\``, { parse_mode: 'Markdown' });
        } else {
            bot.sendMessage(chatId, "❌ فشل الطلب، تأكد من الرقم.");
        }
    }
});

app.get('/', (req, res) => res.send("Server Running ✅"));
app.listen(process.env.PORT || 10000);
