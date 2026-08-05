const settings = require('../settings');

const FALLBACK_TELEGRAM_BOT_LINK = 'https://t.me/Faresw_bot';

async function pairCommand(sock, chatId) {
  const telegramBotLink = String(
    process.env.DEFAULT_BOT_LINK ||
    process.env.TELEGRAM_BOT_LINK ||
    settings.repoUrl ||
    FALLBACK_TELEGRAM_BOT_LINK
  ).trim() || FALLBACK_TELEGRAM_BOT_LINK;

  const promo = settings.promoText || '*اصنع بوت واتساب خاص فيك مجاناً*\n👉 Undress https://t.me/Faresw_bot';

  await sock.sendMessage(chatId, {
    text: `🔗 تم نقل الربط بالكامل إلى بوت تيليجرام.\n\n📱 افتح الرابط التالي واربط رقمك من هناك:\n${telegramBotLink}\n\n${promo}`,
  });
}

module.exports = pairCommand;
