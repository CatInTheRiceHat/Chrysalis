// Web Crypto only. The derived key bytes live in trusted storage.session, never local.
export const ITERATIONS = 600_000;
export interface Envelope { version: 1; algorithm: 'AES-GCM'; kdf: 'PBKDF2-SHA256'; iterations: number; salt: string; iv: string; ciphertext: string }
export const encode = (bytes: Uint8Array) => btoa(Array.from(bytes, b => String.fromCharCode(b)).join(''));
export const decode = (text: string) => Uint8Array.from(atob(text), c => c.charCodeAt(0));
const random = (length: number) => encode(crypto.getRandomValues(new Uint8Array(length)));
export function envelope(value: unknown): value is Envelope {
  if (!value || typeof value !== 'object') return false;
  const v = value as Envelope;
  try {
    return Object.keys(v).sort().join() === ['version','algorithm','kdf','iterations','salt','iv','ciphertext'].sort().join() &&
      v.version === 1 && v.algorithm === 'AES-GCM' && v.kdf === 'PBKDF2-SHA256' && v.iterations === ITERATIONS &&
      typeof v.salt === 'string' && decode(v.salt).length === 16 && typeof v.iv === 'string' && decode(v.iv).length === 12 &&
      typeof v.ciphertext === 'string' && v.ciphertext.length <= 4_000_000 && decode(v.ciphertext).length >= 16;
  } catch { return false; }
}
export async function derive(password: string, salt: string): Promise<string> {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: decode(salt), iterations: ITERATIONS }, material, 256);
  return encode(new Uint8Array(bits));
}
const key = (raw: string) => crypto.subtle.importKey('raw', decode(raw), 'AES-GCM', false, ['encrypt', 'decrypt']);
const aad = (salt: string) => new TextEncoder().encode(`Chrysalis/history/v1/AES-GCM/PBKDF2-SHA256/${ITERATIONS}/${salt}`);
export async function encrypt(value: unknown, raw: string, salt: string): Promise<Envelope> {
  const iv = random(12);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: decode(iv), additionalData: aad(salt), tagLength: 128 }, await key(raw), new TextEncoder().encode(JSON.stringify(value)));
  return { version: 1, algorithm: 'AES-GCM', kdf: 'PBKDF2-SHA256', iterations: ITERATIONS, salt, iv, ciphertext: encode(new Uint8Array(ciphertext)) };
}
export async function decrypt(value: Envelope, raw: string): Promise<unknown> {
  if (!envelope(value)) throw new Error('Unsupported encrypted history. Data was preserved.');
  const bytes = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: decode(value.iv), additionalData: aad(value.salt), tagLength: 128 }, await key(raw), decode(value.ciphertext));
  return JSON.parse(new TextDecoder().decode(bytes));
}
export async function createEncryption(password: string, value: unknown) {
  if (password.length < 12 || password.length > 128) throw new Error('Use a password of 12–128 characters.');
  const salt = random(16), raw = await derive(password, salt), encrypted = await encrypt(value, raw, salt);
  // Check the complete payload before the single durable replacement of old plaintext.
  if (JSON.stringify(await decrypt(encrypted, raw)) !== JSON.stringify(value)) throw new Error('Encryption verification failed.');
  return { raw, encrypted };
}
