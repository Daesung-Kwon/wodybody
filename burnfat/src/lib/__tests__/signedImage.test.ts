import { describe, it, expect, vi } from 'vitest';

// signedImage 가 supabase 클라이언트를 import 하므로 (extractStoragePath/
// isStoragePath 는 쓰지 않지만) 모듈 로드를 위해 mock 으로 대체한다.
vi.mock('../supabase', () => ({
  supabase: { storage: { from: vi.fn() } },
}));

import { extractStoragePath, isStoragePath } from '../signedImage';

describe('extractStoragePath', () => {
  it('이미 path 형태면 그대로 반환한다', () => {
    expect(extractStoragePath('participant-1/start-1234.jpg')).toBe(
      'participant-1/start-1234.jpg'
    );
  });

  it('선행 슬래시는 제거한다', () => {
    expect(extractStoragePath('/participant-1/start.jpg')).toBe(
      'participant-1/start.jpg'
    );
  });

  it('Supabase public URL 에서 bucket 내부 path 를 추출한다', () => {
    const url =
      'https://abc.supabase.co/storage/v1/object/public/inbody/p1/start-9.jpg';
    expect(extractStoragePath(url)).toBe('p1/start-9.jpg');
  });

  it('Supabase sign URL(토큰 포함) 에서 path 를 추출한다', () => {
    const url =
      'https://abc.supabase.co/storage/v1/object/sign/inbody/p1/end-9.jpg?token=xyz';
    expect(extractStoragePath(url)).toBe('p1/end-9.jpg');
  });

  it('inbody 버킷이 아닌 외부 URL 은 null 을 반환한다', () => {
    expect(extractStoragePath('https://example.com/photo.jpg')).toBeNull();
  });

  it('null / 빈 문자열은 null', () => {
    expect(extractStoragePath(null)).toBeNull();
    expect(extractStoragePath('')).toBeNull();
    expect(extractStoragePath('   ')).toBeNull();
  });
});

describe('isStoragePath', () => {
  it('http 로 시작하지 않으면 path 로 본다', () => {
    expect(isStoragePath('p1/start.jpg')).toBe(true);
  });

  it('http(s) URL 은 path 가 아니다', () => {
    expect(isStoragePath('https://abc.supabase.co/x.jpg')).toBe(false);
  });

  it('빈 값은 false', () => {
    expect(isStoragePath(null)).toBe(false);
  });
});
