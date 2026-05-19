import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateDeviceSecret,
  hashDeviceSecret,
  saveDeviceSecret,
  loadDeviceSecret,
  clearDeviceSecret,
  prepareDeviceSecret,
} from '../deviceSecret';

// Sprint 3 Phase A — Vitest 인프라 동작 확인용 샘플 1개.
// jsdom 환경에서 Web Crypto(crypto.getRandomValues / crypto.subtle) 가
// 정상 노출되는지까지 함께 검증한다.

describe('deviceSecret', () => {
  it('generateDeviceSecret 는 64자 hex 문자열을 반환한다 (32바이트)', () => {
    const secret = generateDeviceSecret();
    expect(secret).toMatch(/^[0-9a-f]{64}$/);
  });

  it('generateDeviceSecret 는 호출마다 다른 값을 낸다', () => {
    expect(generateDeviceSecret()).not.toBe(generateDeviceSecret());
  });

  it('hashDeviceSecret 는 동일 입력에 동일 출력을 낸다 (결정성)', async () => {
    const plain = 'a'.repeat(64);
    const [h1, h2] = await Promise.all([
      hashDeviceSecret(plain),
      hashDeviceSecret(plain),
    ]);
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[0-9a-f]{64}$/);
  });

  it('hashDeviceSecret 는 다른 입력에 다른 출력을 낸다', async () => {
    const h1 = await hashDeviceSecret('secret-one');
    const h2 = await hashDeviceSecret('secret-two');
    expect(h1).not.toBe(h2);
  });
});

// Sprint 3 Phase B 보강 — localStorage 영속 + INSERT 사이클.
describe('deviceSecret — 영속화', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('save → load 라운드트립이 동일 값을 돌려준다', () => {
    saveDeviceSecret('weekly_logs', 'row-1', 'plain-secret');
    expect(loadDeviceSecret('weekly_logs', 'row-1')).toBe('plain-secret');
  });

  it('저장되지 않은 row 는 null', () => {
    expect(loadDeviceSecret('submissions', 'unknown-row')).toBeNull();
  });

  it('table 별로 키가 분리된다', () => {
    saveDeviceSecret('weekly_logs', 'row-1', 'wl-secret');
    saveDeviceSecret('submissions', 'row-1', 'sub-secret');
    expect(loadDeviceSecret('weekly_logs', 'row-1')).toBe('wl-secret');
    expect(loadDeviceSecret('submissions', 'row-1')).toBe('sub-secret');
  });

  it('clear 후에는 load 가 null 을 반환한다', () => {
    saveDeviceSecret('submissions', 'row-1', 'plain');
    clearDeviceSecret('submissions', 'row-1');
    expect(loadDeviceSecret('submissions', 'row-1')).toBeNull();
  });

  it('prepareDeviceSecret 는 plain·hash 쌍을 만들고 persist 가 저장한다', async () => {
    const { plain, hash, persist } = await prepareDeviceSecret('weekly_logs');
    expect(plain).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).toBe(await hashDeviceSecret(plain));
    persist('row-9');
    expect(loadDeviceSecret('weekly_logs', 'row-9')).toBe(plain);
  });
});
