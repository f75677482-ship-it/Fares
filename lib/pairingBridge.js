const { EventEmitter } = require('events');

const emitter = new EventEmitter();
emitter.setMaxListeners(0);

const DEFAULT_SOCKET_KEY = '__default__';
const socketMap = new Map();
const metaMap = new Map();
let primarySocket = null;
let connectionState = 'idle';
let lastUpdatedAt = new Date().toISOString();

function touch() {
  lastUpdatedAt = new Date().toISOString();
}

function normalizePhone(phone = '') {
  return String(phone || '').replace(/\D/g, '').trim();
}

function setConnectionState(state) {
  connectionState = state || 'unknown';
  touch();
  return connectionState;
}

function getConnectionState() {
  return connectionState;
}

function setSocket(phoneOrSocket, maybeSocket, metadata = {}) {
  const hasExplicitPhone = typeof phoneOrSocket === 'string' || typeof phoneOrSocket === 'number';
  const normalizedPhone = hasExplicitPhone ? normalizePhone(phoneOrSocket) : '';
  const socket = hasExplicitPhone ? (maybeSocket || null) : (phoneOrSocket || null);
  const key = normalizedPhone || DEFAULT_SOCKET_KEY;

  if (!socket) {
    socketMap.delete(key);
    metaMap.delete(key);
    if (key === DEFAULT_SOCKET_KEY || primarySocket === socket) {
      primarySocket = socketMap.get(DEFAULT_SOCKET_KEY) || null;
    }
    if (socketMap.size === 0) setConnectionState('idle');
    touch();
    return null;
  }

  socketMap.set(key, socket);
  metaMap.set(key, {
    ...(metaMap.get(key) || {}),
    ...(metadata || {}),
    phone: normalizedPhone || undefined,
    registered: metadata?.registered !== false,
  });

  primarySocket = socket;
  setConnectionState('open');
  touch();

  if (normalizedPhone) {
    setImmediate(() => {
      try { emitter.emit('phone.activated', normalizedPhone, socket, metaMap.get(key) || {}); } catch (_) {}
    });
  }

  return socket;
}

function releaseSocket(phone = '') {
  const normalizedPhone = normalizePhone(phone);
  const key = normalizedPhone || DEFAULT_SOCKET_KEY;
  const existed = socketMap.delete(key);
  metaMap.delete(key);

  if (primarySocket === socketMap.get(key) || key === DEFAULT_SOCKET_KEY || !socketMap.has(DEFAULT_SOCKET_KEY)) {
    primarySocket = socketMap.get(DEFAULT_SOCKET_KEY) || socketMap.values().next().value || null;
  }

  if (socketMap.size === 0) setConnectionState('idle');
  touch();

  if (existed && normalizedPhone) {
    setImmediate(() => {
      try { emitter.emit('phone.released', normalizedPhone); } catch (_) {}
    });
  }

  return existed;
}

function getSocket(phone = '') {
  const normalizedPhone = normalizePhone(phone);
  if (normalizedPhone) {
    return socketMap.get(normalizedPhone) || null;
  }
  return primarySocket || socketMap.get(DEFAULT_SOCKET_KEY) || socketMap.values().next().value || null;
}

function getPhoneMeta(phone = '') {
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) return metaMap.get(DEFAULT_SOCKET_KEY) || null;
  return metaMap.get(normalizedPhone) || null;
}

function listActivePhones() {
  return Array.from(socketMap.keys()).filter((key) => key !== DEFAULT_SOCKET_KEY);
}

function getBridgeState() {
  const activeSocket = getSocket();
  return {
    connectionState,
    hasSocket: !!activeSocket,
    activePhones: listActivePhones(),
    socketCount: socketMap.size,
    user: activeSocket?.user || null,
    lastUpdatedAt,
  };
}

async function waitForPhone(phone, { timeoutMs = 6000 } = {}) {
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) return null;
  const existing = socketMap.get(normalizedPhone);
  if (existing) return existing;

  return new Promise((resolve) => {
    const onActivated = (activatedPhone, socket) => {
      if (normalizePhone(activatedPhone) === normalizedPhone) {
        cleanup();
        resolve(socket);
      }
    };
    const timer = setTimeout(() => {
      cleanup();
      resolve(socketMap.get(normalizedPhone) || null);
    }, Math.max(250, Number(timeoutMs) || 6000));
    const cleanup = () => {
      emitter.off('phone.activated', onActivated);
      clearTimeout(timer);
    };
    emitter.on('phone.activated', onActivated);
  });
}

const pairingBridge = {
  setSocket,
  releaseSocket,
  getSocket,
  getPhoneMeta,
  listActivePhones,
  getBridgeState,
  setConnectionState,
  getConnectionState,
  waitForPhone,
  emitter,
};

module.exports = {
  pairingBridge,
  setSocket,
  releaseSocket,
  getSocket,
  getPhoneMeta,
  listActivePhones,
  getBridgeState,
  setConnectionState,
  getConnectionState,
  waitForPhone,
  emitter,
};
