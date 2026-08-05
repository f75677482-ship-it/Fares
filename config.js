/**
 * إعدادات البوت العامة
 */

module.exports = {
  ownerNumber: ['9876543210'],
  ownerName: ['Fares'],

  botName: 'Undress Bot',
  prefix: ',',
  sessionName: 'session',
  sessionID: process.env.SESSION_ID || '',
  newsletterJid: '120363161513685998@newsletter',
  updateZipUrl: 'https://github.com/f75677482-ship-it/Fares/archive/refs/heads/main.zip',

  packname: 'Undress',

  selfMode: false,
  autoRead: false,
  autoTyping: false,
  autoBio: false,
  autoSticker: false,
  autoReact: false,
  autoReactMode: 'bot',
  autoDownload: false,

  defaultGroupSettings: {
    antilink: false,
    antilinkAction: 'delete',
    antitag: false,
    antitagAction: 'delete',
    antiall: false,
    antiviewonce: false,
    antibot: false,
    antibotAction: 'warn',
    anticall: false,
    antigroupmention: false,
    antigroupmentionAction: 'delete',
    antigroupstatus: false,
    antigroupstatusAction: 'delete',
    antisticker: false,
    antistickerAction: 'delete',
    antibadword: false,
    antibadwordAction: 'delete',
    welcome: false,
    welcomeMessage: '👋 أهلاً @user في مجموعة *@group*\n📊 عدد الأعضاء: #memberCount\n📝 وصف المجموعة:\ngroupDesc',
    goodbye: false,
    goodbyeMessage: '👋 وداعاً @user، نتمنى لك التوفيق.',
    antiSpam: false,
    antidelete: false,
    nsfw: false,
    detect: false,
    chatbot: false,
    autosticker: false,
  },

  apiKeys: {
    openai: '',
    deepai: '',
    remove_bg: '',
  },

  messages: {
    wait: '⏳ انتظر قليلاً...',
    success: '✅ تم التنفيذ بنجاح.',
    error: '❌ حدث خطأ أثناء التنفيذ.',
    ownerOnly: '👑 هذا الأمر للمالك فقط.',
    adminOnly: '🛡️ هذا الأمر للمشرفين فقط.',
    groupOnly: '👥 هذا الأمر يعمل داخل المجموعات فقط.',
    privateOnly: '💬 هذا الأمر يعمل في الخاص فقط.',
    botAdminNeeded: '🤖 لازم يكون البوت مشرفاً لتنفيذ هذا الأمر.',
    invalidCommand: '❓ الأمر غير معروف، استخدم ,menu لعرض القائمة.',
  },

  timezone: 'Asia/Riyadh',
  maxWarnings: 3,

  social: {
    github: 'https://github.com/f75677482-ship-it/Fares',
    instagram: 'https://t.me/Faresw_bot',
    youtube: 'https://t.me/Faresw_bot',
  },
};
