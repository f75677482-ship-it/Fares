/**
 * Dynamic command loader for flat + nested command structures.
 * يدعم الملفات القديمة والجديدة داخل مجلد commands.
 */

require('../lib/registerProjectAliases');

const fs = require('fs');
const path = require('path');

function registerRegistryCommands(commands, modulePath, label) {
  try {
    const list = require(modulePath);
    if (!Array.isArray(list)) return;

    for (const cmd of list) {
      if (!cmd?.name || typeof cmd.execute !== 'function') continue;
      registerCommand(commands, cmd);
    }
  } catch (error) {
    console.error(`تعذر تحميل أوامر ${label}:`, error.message);
  }
}

function registerFunCommands(commands) {
  registerRegistryCommands(commands, './funCommands', 'المرح');
}

function registerEconomyCommands(commands) {
  registerRegistryCommands(commands, './economyCommands', 'الاقتصاد');
}

function registerCommand(commands, command) {
  if (!command?.name || typeof command.execute !== 'function') return;

  const normalized = {
    aliases: [],
    category: 'general',
    description: '',
    usage: '',
    ...command,
  };

  commands.set(normalized.name, normalized);
  for (const alias of normalized.aliases || []) {
    if (alias) commands.set(alias, normalized);
  }
}

function toCamelCase(value = '') {
  return String(value)
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
    .replace(/[^a-zA-Z0-9]/g, '');
}

function buildLegacyWrapper(fileName, handler, metadata = {}) {
  const baseName = path.basename(fileName, '.js');
  return {
    name: metadata.name || baseName,
    aliases: Array.isArray(metadata.aliases) ? metadata.aliases : [],
    category: metadata.category || 'general',
    description: metadata.description || 'أمر تلقائي من ملفات الأوامر.',
    usage: metadata.usage || `.${metadata.name || baseName}`,
    async execute(sock, msg, args, extra) {
      return handler(sock, extra.from, msg, extra.groupMetadata || null, args.join(' '), extra);
    },
  };
}

function normalizeCommandExport(exported, fileName, folderCategory = '') {
  const baseName = path.basename(fileName, '.js');
  const camelBase = toCamelCase(baseName);
  const candidateKeys = [
    `${baseName}Command`,
    `${camelBase}Command`,
    `${camelBase.charAt(0).toLowerCase()}${camelBase.slice(1)}Command`,
  ];

  if (exported && typeof exported.execute === 'function' && exported.name) {
    return {
      aliases: [],
      category: folderCategory || 'general',
      description: '',
      usage: `.${exported.name}`,
      ...exported,
    };
  }

  if (typeof exported === 'function') {
    return buildLegacyWrapper(fileName, async (sock, chatId, msg, groupMetadata, argText, extra) => exported(sock, chatId, msg, groupMetadata, argText, extra), {
      name: baseName,
      category: folderCategory || 'general',
    });
  }

  if (exported && typeof exported === 'object') {
    for (const key of candidateKeys) {
      if (typeof exported[key] === 'function') {
        return buildLegacyWrapper(fileName, async (sock, chatId, msg, groupMetadata, argText, extra) => exported[key](sock, chatId, msg, groupMetadata, argText, extra), {
          name: baseName,
          category: folderCategory || 'general',
        });
      }
    }

    const commandLikeKey = Object.keys(exported).find((key) => /Command$/i.test(key) && typeof exported[key] === 'function');
    if (commandLikeKey) {
      return buildLegacyWrapper(fileName, async (sock, chatId, msg, groupMetadata, argText, extra) => exported[commandLikeKey](sock, chatId, msg, groupMetadata, argText, extra), {
        name: baseName,
        category: folderCategory || 'general',
      });
    }
  }

  return null;
}

function walkCommandFiles(rootDir) {
  const files = [];

  function walk(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }
      if (entry.isFile() && entry.name.endsWith('.js')) {
        files.push(fullPath);
      }
    }
  }

  walk(rootDir);
  return files.sort();
}

function loadCommands() {
  const commands = new Map();
  const commandsPath = path.join(__dirname, '..', 'commands');

  if (!fs.existsSync(commandsPath)) {
    console.log('مجلد الأوامر غير موجود');
    return commands;
  }

  const files = walkCommandFiles(commandsPath);
  for (const filePath of files) {
    const relativePath = path.relative(commandsPath, filePath);
    const folderParts = relativePath.split(path.sep);
    const folderCategory = folderParts.length > 1 ? folderParts[0].toLowerCase() : '';

    try {
      delete require.cache[require.resolve(filePath)];
      const exported = require(filePath);
      const command = normalizeCommandExport(exported, filePath, folderCategory);
      if (command) {
        command.__sourceFile = relativePath;
        registerCommand(commands, command);
      }
    } catch (error) {
      console.error(`تعذر تحميل الأمر ${relativePath}:`, error.message);
    }
  }

  registerFunCommands(commands);
  registerEconomyCommands(commands);
  return commands;
}

module.exports = { loadCommands, registerFunCommands, registerEconomyCommands };
