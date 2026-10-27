import crypto from 'crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const SESSION_COOKIE_NAME = 'porsi_kita_session';
const SESSION_SECRET = process.env.SESSION_SECRET || 'porsi_kita_secret_jwt_key_2026';

export interface SessionPayload {
  phone: string;
  alias: string;
  hasPassword: boolean;
  createdAt: string;
  familyId?: string;
  ownerId?: string;
}

/**
 * Hash password menggunakan scrypt dengan salt acak 16 byte
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verifikasi password terhadap stored hash
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, key] = storedHash.split(':');
    if (!salt || !key) return false;
    const derivedKey = crypto.scryptSync(password, salt, 64);
    const keyBuffer = Buffer.from(key, 'hex');
    return crypto.timingSafeEqual(derivedKey, keyBuffer);
  } catch {
    return false;
  }
}

/**
 * Buat session token bertanda tangan HMAC-SHA256
 */
export function createSessionToken(payload: SessionPayload): string {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(data)
    .digest('base64url');
  return `${data}.${signature}`;
}

/**
 * Verifikasi token session
 */
export function verifySessionToken(token: string): SessionPayload | null {
  try {
    const [data, signature] = token.split('.');
    if (!data || !signature) return null;

    const expectedSig = crypto
      .createHmac('sha256', SESSION_SECRET)
      .update(data)
      .digest('base64url');

    if (signature !== expectedSig) return null;

    const json = Buffer.from(data, 'base64url').toString('utf8');
    return JSON.parse(json) as SessionPayload;
  } catch {
    return null;
  }
}

/**
 * Pasang session cookie pada response
 */
export function setSessionCookie(response: NextResponse, payload: SessionPayload) {
  const token = createSessionToken(payload);
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 hari
  });
  return response;
}
