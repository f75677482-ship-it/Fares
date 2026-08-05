const config = require('../config');
const settings = require('../settings');
const { loadCommands } = require('../utils/commandLoader');

const CATEGORY_TITLES = {
  general: '🧭 الأوامر العامة',
  ai: '🤖 أوامر الذكاء',
  group: '👥 أوامر المجموعات',
  admin: '🛡️ أوامر الإدارة',
  owner: '👑 أوامر المالك',
  media: '🎞️ أوامر الوسائط',
  fun: '🎭 أوامر الترفيه',
  economy: '💰 أوامر الاقتصاد',
  utility: '🔧 أوامر الأدوات',
  anime: '👾 أوامر الأنمي',
  textmaker: '🖋️ أوامر الزخرفة',
  misc: '📦 أوامر إضافية',
};

function buildMenuText(extra = {}) {
  const commandMap = loadCommands();
  const uniqueCommands = [];
  const seen = new Set();

  for (const cmd of commandMap.values()) {
    if (!cmd?.name || seen.has(cmd.name)) continue;
    seen.add(cmd.name);
    uniqueCommands.push(cmd);
  }

  uniqueCommands.sort((a, b) => a.name.localeCompare(b.name, 'ar'));

  const grouped = new Map();
  for (const cmd of uniqueCommands) {
    const category = String(cmd.category || 'misc').toLowerCase();
    if (!grouped.has(category)) grouped.set(category, []);
    grouped.get(category).push(cmd);
  }

  const ownerNames = Array.isArray(config.ownerName) ? config.ownerName : [config.ownerName];
  const ownerLabel = ownerNames.filter(Boolean).join('، ') || 'المالك';
  const userTag = extra.sender ? `@${String(extra.sender).split('@')[0]}` : 'عزيزي المستخدم';
  const promo = settings.promoText || '*اصنع بوت واتساب خاص فيك مجاناً*\n👉 Undress https://t.me/Faresw_bot';

  let text = `╭━━『 *${config.botName || settings.botName || 'بوت واتساب'}* 』━━╮\n\n`;
  text += `👋 أهلاً ${userTag}\n`;
  text += `⚡ البادئة: ${config.prefix}\n`;
  text += `📦 إجمالي الأوامر: ${uniqueCommands.length}\n`;
  text += `👑 المالك: ${ownerLabel}\n\n`;

  for (const [category, commands] of grouped.entries()) {
    const title = CATEGORY_TITLES[category] || `📁 ${category}`;
    text += `┏━━━━━━━━━━━━━━━━━\n`;
    text += `┃ ${title}\n`;
    text += `┗━━━━━━━━━━━━━━━━━\n`;
    for (const cmd of commands) {
      text += `│ ➜ ${config.prefix}${cmd.name}\n`;
    }
    text += `\n`;
  }

  text += `💡 استخدم ${config.prefix}help أو ${config.prefix}help اسم_الأمر لعرض التفاصيل\n\n`;
  text += `${promo}`;
  return text;
}

module.exports = {
  name: 'menu',
  aliases: ['commands', 'الاوامر', 'الأوامر', 'اوامر', 'منيو'],
  category: 'general',
  description: 'عرض جميع الأوامر المتاحة',
  usage: '.menu',

  async execute(sock, msg, args, extra) {
    const text = buildMenuText(extra);
    await sock.sendMessage(extra.from, {
      text,
      mentions: extra.sender ? [extra.sender] : [],
    }, { quoted: msg });
  },
};
