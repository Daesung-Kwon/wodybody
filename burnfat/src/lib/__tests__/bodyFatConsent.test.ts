import { beforeEach, describe, expect, it } from 'vitest';
import {
  BODY_FAT_BLOCK_MESSAGE,
  gateBodyFatWrite,
  hasBodyFatConsent,
  readBodyFatConsent,
  saveBodyFatConsent,
} from '../bodyFatConsent';

describe('body fat consent gate', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('allows a write when no body-fat value is present', () => {
    expect(gateBodyFatWrite(false, false)).toEqual({ ok: true });
  });

  it('blocks a body-fat write until the checkbox is on', () => {
    expect(gateBodyFatWrite(true, false)).toEqual({ ok: false, message: BODY_FAT_BLOCK_MESSAGE });
    expect(gateBodyFatWrite(true, true)).toEqual({ ok: true });
  });

  it('stores a timestamp without the body-fat number', () => {
    const saved = saveBodyFatConsent('participant-1', new Date('2026-10-28T03:00:00.000Z'));
    expect(saved.consentedAt).toBe('2026-10-28T03:00:00.000Z');
    expect(saved.purpose).toBe('body_fat');
    expect(hasBodyFatConsent('participant-1')).toBe(true);
    const raw = window.localStorage.getItem('burnfat:body-fat-consent:participant-1') ?? '';
    expect(raw).not.toMatch(/body_fat_rate|체지방률\s*[0-9]/);
    expect(readBodyFatConsent('participant-1')?.participantId).toBe('participant-1');
    expect(saveBodyFatConsent('participant-1', new Date('2026-11-01T00:00:00.000Z')).consentedAt).toBe(
      '2026-10-28T03:00:00.000Z'
    );
  });
});
