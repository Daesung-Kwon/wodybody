import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// signedImage 가 supabase 클라이언트를 import 하므로 (extractStoragePath/
// isStoragePath 는 쓰지 않지만) 모듈 로드를 위해 mock 으로 대체한다.
vi.mock('../supabase', () => ({
  supabase: { storage: { from: vi.fn() } },
}));

import { supabase } from '../supabase';
import {
  __clearSignedUrlCacheForTests,
  extractStoragePath,
  isStoragePath,
  resolveImageSignUrl,
  resolveImageUrl,
} from '../signedImage';

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

describe('resolveImageUrl (server-side signing, RLS lockdown)', () => {
  const PID = 'aaaaaaaa-1111-0000-0000-000000000001';
  const storageFrom = supabase.storage.from as unknown as ReturnType<typeof vi.fn>;
  let fetchMock: ReturnType<typeof vi.fn>;
  let createSignedUrl: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    __clearSignedUrlCacheForTests();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    createSignedUrl = vi.fn();
    storageFrom.mockReset();
    storageFrom.mockReturnValue({ createSignedUrl });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('asks the backend with the room code and path, never the anon storage API', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ urls: { [`${PID}/start-1.jpg`]: 'https://signed/1' }, expires_in: 3600 }), {
        status: 200,
      })
    );
    const url = await resolveImageUrl(`${PID}/start-1.jpg`, 'ab12cd');
    expect(url).toBe('https://signed/1');
    const [endpoint, init] = fetchMock.mock.calls[0];
    expect(endpoint).toBe(resolveImageSignUrl());
    expect(JSON.parse(init.body)).toEqual({ code: 'AB12CD', paths: [`${PID}/start-1.jpg`] });
    expect(createSignedUrl).not.toHaveBeenCalled();
  });

  it('re-signs legacy stored sign URLs by extracting the path', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ urls: { [`${PID}/end-9.jpg`]: 'https://signed/9' } }), { status: 200 })
    );
    const legacy = `https://abc.supabase.co/storage/v1/object/sign/inbody/${PID}/end-9.jpg?token=old`;
    await expect(resolveImageUrl(legacy, 'AB12CD')).resolves.toBe('https://signed/9');
  });

  it('caches per path', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ urls: { [`${PID}/start-1.jpg`]: 'https://signed/1' }, expires_in: 3600 }), {
        status: 200,
      })
    );
    await resolveImageUrl(`${PID}/start-1.jpg`, 'AB12CD');
    await resolveImageUrl(`${PID}/start-1.jpg`, 'AB12CD');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('transitional fallback: backend down → anon createSignedUrl', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    createSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://anon-signed' }, error: null });
    await expect(resolveImageUrl(`${PID}/start-1.jpg`, 'AB12CD')).resolves.toBe('https://anon-signed');
    expect(createSignedUrl).toHaveBeenCalledWith(`${PID}/start-1.jpg`, 3600);
  });

  it('path not granted by backend and anon signing denied → returns stored value', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ urls: {} }), { status: 200 }));
    createSignedUrl.mockResolvedValue({ data: null, error: { message: 'Object not found' } });
    await expect(resolveImageUrl(`${PID}/start-1.jpg`, 'AB12CD')).resolves.toBe(`${PID}/start-1.jpg`);
  });

  it('external URLs pass through untouched', async () => {
    await expect(resolveImageUrl('https://example.com/x.jpg', 'AB12CD')).resolves.toBe('https://example.com/x.jpg');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
