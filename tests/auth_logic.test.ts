import { describe, it, expect } from 'vitest';
import { normalizePhone } from '../lib/phone';
import { hashPassword, verifyPassword, createSessionToken, verifySessionToken } from '../lib/auth-session';

describe('Auth Logic & Business Rules Tests', () => {
  describe('Password Hashing & Verification', () => {
    it('hashes passwords securely and verifies correct passwords', () => {
      const raw = 'RahasiaIbu123';
      const hash = hashPassword(raw);
      expect(hash).toContain(':');
      expect(verifyPassword(raw, hash)).toBe(true);
      expect(verifyPassword('SalahPassword', hash)).toBe(false);
    });
  });

  describe('Session Token Sign & Verification', () => {
    it('creates and verifies valid signed session tokens', () => {
      const payload = {
        phone: '+6281234567890',
        alias: 'Keluarga Samantha',
        hasPassword: false,
        createdAt: new Date().toISOString(),
      };

      const token = createSessionToken(payload);
      expect(token).toContain('.');

      const verified = verifySessionToken(token);
      expect(verified).not.toBeNull();
      expect(verified?.phone).toBe(payload.phone);
      expect(verified?.alias).toBe(payload.alias);
    });

    it('rejects tampered tokens', () => {
      const token = createSessionToken({
        phone: '+6281234567890',
        alias: 'Keluarga Budi',
        hasPassword: true,
        createdAt: new Date().toISOString(),
      });

      const tampered = token.slice(0, -3) + 'xyz';
      expect(verifySessionToken(tampered)).toBeNull();
    });
  });

  describe('Phone Normalization', () => {
    it('normalizes Indonesian local numbers with 08 prefix to +628 format', () => {
      expect(normalizePhone('081234567890')).toBe('+6281234567890');
      expect(normalizePhone('0857-1234-5678')).toBe('+6285712345678');
      expect(normalizePhone('0819 8765 4321')).toBe('+6281987654321');
    });

    it('normalizes numbers without leading zero or with 62 prefix', () => {
      expect(normalizePhone('6281234567890')).toBe('+6281234567890');
      expect(normalizePhone('+6281234567890')).toBe('+6281234567890');
    });
  });

  describe('Unverified Mode Name Matching (LOWER(TRIM(alias)) = LOWER(TRIM(inputNama)))', () => {
    function matchFamilyAlias(dbAlias: string, inputNama: string): boolean {
      const cleanAlias = dbAlias.trim().toLowerCase();
      const cleanInput = inputNama.trim().toLowerCase();

      const dbAliasNoPrefix = cleanAlias.replace(/^keluarga\s+/i, '').trim();
      const inputNamaNoPrefix = cleanInput.replace(/^keluarga\s+/i, '').trim();

      return (
        cleanAlias === cleanInput ||
        dbAliasNoPrefix === inputNamaNoPrefix ||
        dbAliasNoPrefix === cleanInput ||
        cleanAlias === `keluarga ${cleanInput}`
      );
    }

    it('matches exact name regardless of casing and surrounding spaces', () => {
      expect(matchFamilyAlias('Keluarga Budi', '  keluarga budi  ')).toBe(true);
      expect(matchFamilyAlias('Ibu Sari', 'ibu sari')).toBe(true);
      expect(matchFamilyAlias('KELUARGA BUDI', 'budi')).toBe(true);
      expect(matchFamilyAlias('Keluarga Samantha', 'Samantha')).toBe(true);
    });

    it('rejects completely mismatched family names', () => {
      expect(matchFamilyAlias('Keluarga Budi', 'Keluarga Santoso')).toBe(false);
      expect(matchFamilyAlias('Ibu Sari', 'Ibu Samantha')).toBe(false);
    });
  });

  describe('24-Hour Dashboard Security State Rules', () => {
    function shouldShowStrictModal(hasPassword: boolean, createdAtMs: number, hasLoggedOut: boolean): boolean {
      if (hasPassword) return false;
      const elapsedHours = (Date.now() - createdAtMs) / (1000 * 60 * 60);
      return elapsedHours >= 24 || hasLoggedOut === true;
    }

    it('Condition A: Account < 24h & has not logged out -> Do not show strict modal', () => {
      const now = Date.now();
      const threeHoursAgo = now - 3 * 60 * 60 * 1000;
      expect(shouldShowStrictModal(false, threeHoursAgo, false)).toBe(false);
    });

    it('Condition B: Account >= 24h -> Show strict modal', () => {
      const now = Date.now();
      const twentyFiveHoursAgo = now - 25 * 60 * 60 * 1000;
      expect(shouldShowStrictModal(false, twentyFiveHoursAgo, false)).toBe(true);
    });

    it('Condition B: Account < 24h BUT user logged out and logged back in -> Show strict modal', () => {
      const now = Date.now();
      const twoHoursAgo = now - 2 * 60 * 60 * 1000;
      expect(shouldShowStrictModal(false, twoHoursAgo, true)).toBe(true);
    });

    it('Account already has password -> Never show strict modal', () => {
      const now = Date.now();
      const fiftyHoursAgo = now - 50 * 60 * 60 * 1000;
      expect(shouldShowStrictModal(true, fiftyHoursAgo, true)).toBe(false);
    });
  });
});
