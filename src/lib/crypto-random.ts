/**
 * Cryptographically secure random string generation.
 * Uses Web Crypto API (crypto.getRandomValues) instead of Math.random().
 */

export function cryptoRandomString(length: number, charset: string): string {
  const values = new Uint32Array(length);
  crypto.getRandomValues(values);
  return Array.from(values, (v) => charset[v % charset.length]).join('');
}

export function cryptoRandomDigits(length: number): string {
  return cryptoRandomString(length, '0123456789');
}

export function cryptoRandomHex(length: number): string {
  return cryptoRandomString(length, '0123456789abcdef');
}
