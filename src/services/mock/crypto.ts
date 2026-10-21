/**
 * Криптография mock-сервера. Это НЕ продакшн-безопасность — лишь имитация
 * серверной логики (хеш пароля, подписанный access token), чтобы клиентский
 * код работал с токенами так же, как с настоящим бэкендом.
 */

const SERVER_SECRET = 'silkx-mock-server-secret';

export function fnv1a(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function hashPassword(password: string): string {
  return `${fnv1a(`silkx:${password}:pepper`)}${fnv1a(`${password.length}|${password}`)}`;
}

const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

/** base64url для ASCII-строк — без зависимости от btoa. */
function base64UrlEncode(ascii: string): string {
  let output = '';
  for (let i = 0; i < ascii.length; i += 3) {
    const a = ascii.charCodeAt(i);
    const b = i + 1 < ascii.length ? ascii.charCodeAt(i + 1) : 0;
    const c = i + 2 < ascii.length ? ascii.charCodeAt(i + 2) : 0;
    const triple = (a << 16) | (b << 8) | c;
    output += BASE64_ALPHABET[(triple >> 18) & 63];
    output += BASE64_ALPHABET[(triple >> 12) & 63];
    output += i + 1 < ascii.length ? BASE64_ALPHABET[(triple >> 6) & 63] : '';
    output += i + 2 < ascii.length ? BASE64_ALPHABET[triple & 63] : '';
  }
  return output;
}

function base64UrlDecode(encoded: string): string {
  let output = '';
  let buffer = 0;
  let bits = 0;
  for (const char of encoded) {
    const value = BASE64_ALPHABET.indexOf(char);
    if (value < 0) continue;
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      output += String.fromCharCode((buffer >> bits) & 0xff);
    }
  }
  return output;
}

export interface AccessTokenPayload {
  sub: string;
  role: string;
  exp: number;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  const body = base64UrlEncode(JSON.stringify(payload));
  return `silkx.${body}.${fnv1a(body + SERVER_SECRET)}`;
}

export function verifyAccessToken(token: string): AccessTokenPayload | null {
  const [prefix, body, signature] = token.split('.');
  if (prefix !== 'silkx' || !body || !signature) return null;
  if (fnv1a(body + SERVER_SECRET) !== signature) return null;
  try {
    const parsed = JSON.parse(base64UrlDecode(body)) as Partial<AccessTokenPayload>;
    if (typeof parsed.sub !== 'string' || typeof parsed.role !== 'string' || typeof parsed.exp !== 'number') return null;
    return { sub: parsed.sub, role: parsed.role, exp: parsed.exp };
  } catch {
    return null;
  }
}

export function randomToken(length = 40): string {
  let token = '';
  for (let i = 0; i < length; i += 1) {
    token += BASE64_ALPHABET[Math.floor(Math.random() * 64)];
  }
  return token;
}
