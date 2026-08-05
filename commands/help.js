const config = require('../config');
const settings = require('../settings');
const { loadCommands } = require('../utils/commandLoader');

function buildCommandIndex() {
  const map = loadCommands();
  const unique = new Map();

  for (const cmd of map.values()) {
    if (!cmd?.name || unique.has(cmd.name)) continue;
    unique.set(cmd.name, cmd);
  }

  return { all: map, unique };
}

function renderSingleCommand(prefix, command) {
  const aliases = (command.aliases || []).filter(Boolean);
  const aliasText = aliases.length ? aliases.join('، ') : 'لا يوجد';
  const description = command.description || 'لا يوجد وصف لهذا الأمر.';
  const usage = command.usage || `${prefix}${command.name}`;
  const category = command.category || 'general';

  return [
    `📘 *تفاصيل الأمر:* ${prefix}${command.name}`,
    `📝 الوصف: ${description}`,
    `📂 التصنيف: ${category}`,
    `🔁 الأسماء البديلة: ${aliasText}`,
    `⌨️ طريقة الاستخدام: ${usage}`,
  ].join('\n');
}

function renderOverview(prefix, totalCommands) {
  const promo = settings.promoText || '*اصنع بوت واتساب خاص فيك مجاناً*\n👉 Undress https://t.me/Faresw_bot';
  return [
    `📚 *مساعدة البوت*`,
    `• استخدم ${prefix}menu أو ${prefix}الأوامر لعرض جميع الأوامر.`,
    `• استخدم ${prefix}help اسم_الأمر لعرض شرح أمر معيّن.`,
    `• جميع الأوامر الجديدة داخل مجلد commands تُقرأ تلقائياً وتظهر في القائمة بعد إعادة التشغيل.`,
    `• إجمالي الأوامر الحالية: ${totalCommands}.`,
    '',
    promo,
  ].join('\n');
}

module.exports = {
  name: 'help',
  aliases: ['مساعدة'],
  category: 'general',
  description: 'عرض المساعدة العامة أو تفاصيل أمر محدد',
  usage: '.help [اسم_الأمر]',

  async execute(sock, msg, args, extra) {
    const { all, unique } = buildCommandIndex();
    const query = String(args.join(' ') || '').trim().toLowerCase();
    const prefix = config.prefix || '.';

    let text;
    if (query) {
      const command = all.get(query) || unique.get(query);
      text = command
        ? renderSingleCommand(prefix, command)
        : `❌ الأمر غير موجود: ${query}\nاستخدم ${prefix}menu لعرض جميع الأوامر.`;
    } else {
      text = renderOverview(prefix, unique.size);
    }

    await sock.sendMessage(extra.from, { text }, { quoted: msg });
  },
};
