/**
 * Storage 이미지 → signed URL 해석 유틸.
 *
 * 배경 (Sprint 0.3)
 *   - inbody 버킷이 Private 화되면서 public URL은 더 이상 표시되지 않음.
 *   - 신규 업로드는 storage path("<participant_id>/<type>-<ts>.jpg")를
 *     submissions.image_url 컬럼에 저장한다.
 *   - 화면에서는 클릭 시 createSignedUrl(7일) 로 일시 URL 생성.
 *
 * 하위 호환
 *   - 기존 데이터(공개 URL 또는 sign URL이 저장된 행)도 path를 추출해 재서명한다.
 *   - 추출 실패 시 원본 값을 그대로 반환 (외부 호스트 등 fallback).
 */

import { supabase } from './supabase';

const BUCKET = 'inbody';
const SIGNED_URL_EXPIRES_SEC = 60 * 60 * 24 * 7; // 7일

const SIGNED_URL_CACHE = new Map<string, { url: string; expiresAt: number }>();

/** 저장된 값에서 bucket 내 path 부분만 뽑아낸다. 추출 실패 시 null. */
export function extractStoragePath(stored: string | null | undefined): string | null {
  if (!stored) return null;
  const trimmed = stored.trim();
  if (!trimmed) return null;

  // 1) 이미 path 형태 (예: "participant_id/start-1234.jpg")
  if (!/^https?:\/\//i.test(trimmed)) {
    return trimmed.replace(/^\/+/, '');
  }

  // 2) Supabase public/sign URL → 경로 추출
  try {
    const url = new URL(trimmed);
    // /storage/v1/object/public/<bucket>/<path>
    // /storage/v1/object/sign/<bucket>/<path>?token=...
    const m = url.pathname.match(/\/storage\/v1\/object\/(public|sign)\/([^/]+)\/(.+)$/);
    if (m && m[2] === BUCKET) {
      return decodeURIComponent(m[3]);
    }
  } catch {
    // ignore parse failure
  }
  return null;
}

/**
 * 화면 표시용 URL 을 비동기로 받아온다.
 * - path 추출 가능 → createSignedUrl
 * - 추출 실패 → 원본 stored 값 그대로 반환 (외부 호스트 등 fallback)
 *
 * 동일 path 는 만료 1분 전까지 메모리 캐시.
 */
export async function resolveImageUrl(stored: string | null | undefined): Promise<string | null> {
  if (!stored) return null;

  const path = extractStoragePath(stored);
  if (!path) return stored; // fallback: 외부 URL

  const cached = SIGNED_URL_CACHE.get(path);
  if (cached && cached.expiresAt > Date.now() + 60_000) {
    return cached.url;
  }

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_EXPIRES_SEC);
  if (error || !data?.signedUrl) {
    return stored; // 마지막 fallback
  }

  SIGNED_URL_CACHE.set(path, {
    url: data.signedUrl,
    expiresAt: Date.now() + SIGNED_URL_EXPIRES_SEC * 1000,
  });
  return data.signedUrl;
}

/** stored 값이 새 형식(path) 인지 빠르게 판별 */
export function isStoragePath(stored: string | null | undefined): boolean {
  if (!stored) return false;
  return !/^https?:\/\//i.test(stored.trim());
}
