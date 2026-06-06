const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const USERS_FILE = path.join(__dirname, '..', 'data', 'users.json');
const KEY_LENGTH = 64;

function loadUsers() {
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

function saveUsers(users) {
  fs.mkdirSync(path.dirname(USERS_FILE), { recursive: true });
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function normalizeLogin(login) {
  return String(login || '').trim().toLowerCase();
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, KEY_LENGTH).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  const [salt, hash] = String(storedHash || '').split(':');
  if (!salt || !hash) return false;

  const candidate = crypto.scryptSync(password, salt, KEY_LENGTH);
  const saved = Buffer.from(hash, 'hex');
  return saved.length === candidate.length && crypto.timingSafeEqual(saved, candidate);
}

function findUserByLogin(login) {
  const normalized = normalizeLogin(login);
  return loadUsers().find((user) => user.login === normalized);
}

function createUser({ login, password, name }) {
  const normalized = normalizeLogin(login);
  const displayName = String(name || '').trim();

  if (normalized.length < 3) {
    throw new Error('Логин должен быть не короче 3 символов');
  }
  if (String(password || '').length < 6) {
    throw new Error('Пароль должен быть не короче 6 символов');
  }

  const users = loadUsers();
  if (users.some((user) => user.login === normalized)) {
    throw new Error('Пользователь с таким логином уже существует');
  }

  const user = {
    id: crypto.randomUUID(),
    login: normalized,
    name: displayName || normalized,
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString()
  };

  users.push(user);
  saveUsers(users);
  return user;
}

function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    login: user.login,
    name: user.name
  };
}

module.exports = {
  createUser,
  findUserByLogin,
  publicUser,
  verifyPassword
};
