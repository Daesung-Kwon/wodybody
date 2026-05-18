import { describe, it, expect } from 'vitest';
import { generateDeviceSecret, hashDeviceSecret } from '../deviceSecret';

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
