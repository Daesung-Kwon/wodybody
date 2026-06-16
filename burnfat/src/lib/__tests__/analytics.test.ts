import { describe, it, expect, vi, afterEach } from 'vitest';
import { sanitizeProps, track } from '../analytics';

describe('sanitizeProps — PII 가드', () => {
  it('email 키를 제거한다', () => {
    const out = sanitizeProps({ email: 'a@b.com', week_no: 3 });
    expect(out).not.toHaveProperty('email');
    expect(out).toEqual({ week_no: 3 });
  });

  it('이메일 형태의 값을 가진 키도 제거한다', () => {
    const out = sanitizeProps({ contact: 'user@example.com', stake_amount: 50000 });
    expect(out).not.toHaveProperty('contact');
    expect(out).toEqual({ stake_amount: 50000 });
  });

  it('전화번호·닉네임 키를 제거한다', () => {
    const out = sanitizeProps({ phone: '010-1234-5678', nickname: '테스터', persona: 'friendly' });
    expect(out).toEqual({ persona: 'friendly' });
  });

  it('PII 가 아닌 props 는 그대로 통과시킨다', () => {
    const props = { type: 'start', body_fat_rate_bucket: '25-30', has_admin_pin: true };
    expect(sanitizeProps(props)).toEqual(props);
  });

  it('props 미전달 시 undefined 를 반환한다', () => {
    expect(sanitizeProps()).toBeUndefined();
  });
});

describe('track', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    delete (window as { plausible?: unknown }).plausible;
  });

  it('VITE_ANALYTICS_DOMAIN 미설정 시 no-op (plausible 미호출)', () => {
    const spy = vi.fn();
    window.plausible = spy;
    track('challenge_created', { stake_amount: 50000 });
    expect(spy).not.toHaveBeenCalled();
  });

  it('도메인 설정 시 PII 가 제거된 props 로 전송한다', () => {
    vi.stubEnv('VITE_ANALYTICS_DOMAIN', 'burnfat.wodybody.com');
    const spy = vi.fn();
    window.plausible = spy;
    track('participant_joined', { email: 'a@b.com', challenge_age_days: 2 });
    expect(spy).toHaveBeenCalledWith('participant_joined', {
      props: { challenge_age_days: 2 },
    });
  });
});
