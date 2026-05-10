const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    delay, 
    fetchLatestBaileysVersion, 
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
const ADMIN_ID = 544321234; 
const CHANNEL_USER = "@fz_z_Z"; 
const app = express();
app.use(express.json());
app.use(cors()); // للسماح بطلبات المتصفح

const bot = new TelegramBot(token, { polling: true });
const sessions = new Map();

const SESSIONS_DIR = './sessions';
fs.ensureDirSync(SESSIONS_DIR);

// --- إدارة البيانات ---
const getUserSettings = (chatId) => {
    const filePath = path.join(SESSIONS_DIR, String(chatId), 'settings.json');
    if (fs.existsSync(filePath)) {
        return fs.readJsonSync(filePath);
    }
    return {
        emoji: "👑",
        autoViewStatus: true,
        autoReactStatus: true,
        alwaysOnline: true,
        autoReplies: []
    };
};

const saveUserSettings = (chatId, data) => {
    const userDir = path.join(SESSIONS_DIR, String(chatId));
    fs.ensureDirSync(userDir);
    fs.writeJsonSync(path.join(userDir, 'settings.json'), data);
};

// --- محرك الواتساب ---
async function startBot(chatId, phone) {
    const sessionDir = path.join(SESSIONS_DIR, String(chatId));
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    
    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        browser: Browsers.ubuntu("Chrome"),
        printQRInTerminal: false,
        markOnlineOnConnect: true,
        patchMessageBeforeSending: (message) => {
            const requiresPatch = !!(message.buttonsMessage || message.templateMessage || message.listMessage);
            if (requiresPatch) {
                message = { viewOnceMessage: { message: { messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 }, ...message } } };
            }
            return message;
        }
    });

    sessions.set(chatId, sock);

    // توليد كود الربط للمتصفح أو تليجرام
    if (!sock.authState.creds.registered) {
        await delay(3000); // تقليل التأخير قليلاً
        try {
            const code = await sock.requestPairingCode(phone);
            // إرسال الكود لتليجرام كنسخة احتياطية
            bot.sendMessage(chatId, `✅ كود الربط الخاص بك هو:\n\n\`${code}\``, { parse_mode: 'Markdown' });
            return code; // إرجاع الكود لاستخدامه في API الموقع
        } catch (e) {
            console.log("Error requesting code:", e);
            bot.sendMessage(chatId, "❌ فشل طلب الكود، تأكد من الرقم.");
            return null;
        }
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'open') {
            bot.sendMessage(chatId, "🔓 تم الاتصال بنجاح! البوت يعمل الآن.");
        }
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startBot(chatId, phone);
        }
    });

    // --- معالجة الحالات والرسائل ---
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0];
        if (!m.message || m.key.fromMe) return;

        const config = getUserSettings(chatId);
        const remoteJid = m.key.remoteJid;

        if (remoteJid === 'status@broadcast') {
            const participant = m.key.participant || m.key.remoteJid;
            if (config.autoViewStatus) await sock.readMessages([m.key]);
            if (config.autoReactStatus) {
                await sock.sendMessage('status@broadcast', { 
                    react: { key: m.key, text: config.emoji } 
                }, { statusJidList: [participant] });
            }
            return;
        }
    });
}

// --- ربط الموقع (API) ---
app.post('/api/pairing', async (req, res) => {
    const { num } = req.body;
    if (!num) return res.status(400).json({ success: false, error: "الرقم مطلوب" });

    const cleanNumber = num.replace(/[^0-9]/g, '');
    // استخدام معرف افتراضي للويب أو إنشاء واحد بناءً على الرقم
    const webChatId = `web_${cleanNumber}`; 

    try {
        const code = await startBot(webChatId, cleanNumber);
        if (code) {
            res.json({ success: true, code: code });
        } else {
            res.json({ success: false, error: "فشل استخراج الكود" });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: "خطأ في السيرفر" });
    }
});

// --- أوامر تليجرام ---
async function checkSub(chatId) {
    try {
        const member = await bot.getChatMember(CHANNEL_USER, chatId);
        return ['member', 'administrator', 'creator'].includes(member.status);
    } catch { return false; }
}

bot.onText(/\/start/, async (msg) => {
    const isSub = await checkSub(msg.chat.id);
    if (!isSub) return bot.sendMessage(msg.chat.id, `⚠️ اشترك أولاً في القناة:\n🔗 ${CHANNEL_USER}`);
    bot.sendMessage(msg.chat.id, `👋 أهلاً بك في GOLDEN QUEEN\nارسل رقمك للربط (مثال: 967xxxxxxx)`);
});

bot.on('message', async (msg) => {
    if (msg.text && /^[0-9]{10,}$/.test(msg.text.replace('+', ''))) {
        const isSub = await checkSub(msg.chat.id);
        if (!isSub) return bot.sendMessage(msg.chat.id, `⚠️ اشترك أولاً: ${CHANNEL_USER}`);
        bot.sendMessage(msg.chat.id, "⏳ جاري الربط...");
        startBot(msg.chat.id, msg.text.replace(/[^0-9]/g, ''));
    }
});

app.get('/', (req, res) => res.send("Server is Running ✅"));
app.listen(process.env.PORT || 10000, () => console.log("Server started"));
