import { describe, it, expect } from 'vitest';
import { setPasswordSchema } from '../lib/schemas';
import { hashPassword, verifyPassword } from '../lib/auth-session';

describe('Set Password Validation & Security (Database Persistence)', () => {
  it('passes validation when password is valid (>= 6 chars) and confirm password matches', () => {
    const valid = {
      newPassword: 'PasswordKuat123',
      confirmPassword: 'PasswordKuat123',
      phone: '+6281234567890',
    };
    const res = setPasswordSchema.safeParse(valid);
    expect(res.success).toBe(true);
  });

  it('rejects password shorter than 6 characters', () => {
    const tooShort = {
      newPassword: '12345',
      confirmPassword: '12345',
    };
    const res = setPasswordSchema.safeParse(tooShort);
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues[0].message).toContain('minimal 6 karakter');
    }
  });

  it('rejects when confirmPassword does not match newPassword', () => {
    const mismatch = {
      newPassword: 'PasswordKuat123',
      confirmPassword: 'PasswordSalah999',
    };
    const res = setPasswordSchema.safeParse(mismatch);
    expect(res.success).toBe(false);
    if (!res.success) {
      const msg = res.error.issues.map((i) => i.message).join(' ');
      expect(msg).toContain('tidak cocok');
    }
  });

  it('generates a secure scrypt hash that successfully verifies against original password', () => {
    const plain = 'SandiKeluarga#2026';
    const hash = hashPassword(plain);

    expect(hash).toContain(':');
    const [salt, key] = hash.split(':');
    expect(salt).toHaveLength(32); // 16 bytes hex
    expect(key).toHaveLength(128); // 64 bytes hex

    // Harus terverifikasi jika password benar
    expect(verifyPassword(plain, hash)).toBe(true);
    // Harus ditolak jika password salah
    expect(verifyPassword('SandiSalah#2026', hash)).toBe(false);
  });
});
