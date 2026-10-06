/**
 * Storage 이미지 → signed URL 해석 유틸.
 *
 * 배경 (Sprint 0.3)
 *   - inbody 버킷이 Private 화되면서 public URL은 더 이상 표시되지 않음.
 *   - 신규 업로드는 storage path("<participant_id>/<type>-<ts>.jpg")를
 *     submissions.image_url 컬럼에 저장한다.
 *
 * RLS lockdown (2026-10)
 *   - 브라우저(anon)의 createSignedUrl 은 버킷 전체 anon SELECT 정책이 필요했고, 그 정책
 *     때문에 anon 키만 있으면 버킷 목록 조회·임의 이미지 서명이 가능했다.
 *   - 이제 Railway 백엔드 `POST /api/burnfat/images/sign` 이 room code 를 확인한 뒤
 *     service key 로 서명한다 (backend/routes/burnfat_images.py, 1시간 유효).
 *   - 전환기 호환: 백엔드 호출이 실패하면 기존 anon createSignedUrl 로 폴백한다.
 *     storage 마이그레이션 C(20261006000003) 적용 후에는 이 폴백이 실패하고
 *     저장값을 그대로 반환한다 (C 적용·안정화 후 폴백 제거 예정).
 *
 * 하위 호환
 *   - 기존 데이터(공개 URL 또는 sign URL이 저장된 행)도 path를 추출해 재서명한다.
 *   - 추출 실패 시 원본 값을 그대로 반환 (외부 호스트 등 fallback).
 */

import { supabase } from './supabase';

const BUCKET = 'inbody';
const FALLBACK_SIGNED_URL_EXPIRES_SEC = 60 * 60; // 1시간 (전환기 anon 폴백)
const WODYBODY_IMAGE_SIGN_URL = 'https://wodybody-production.up.railway.app/api/burnfat/images/sign';

/** 백엔드 서명 엔드포인트. VITE_AI_ADVICE_URL(…/ai/advice) 이 있으면 같은 호스트를 쓴다. */
export function resolveImageSignUrl(): string {
  const adviceUrl = import.meta.env.VITE_AI_ADVICE_URL?.trim();
  if (adviceUrl && /\/ai\/advice\/?$/.test(adviceUrl)) {
    return adviceUrl.replace(/\/ai\/advice\/?$/, '/images/sign');
  }
  return WODYBODY_IMAGE_SIGN_URL;
}

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

/** 백엔드에 서명 요청. 성공 시 { url, expiresInSec }, 실패/거부 시 null. */
async function signViaBackend(
  challengeCode: string,
  path: string
): Promise<{ url: string; expiresInSec: number } | null> {
  try {
    const res = await fetch(resolveImageSignUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: challengeCode.trim().toUpperCase(), paths: [path] }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { urls?: Record<string, string>; expires_in?: number };
    const url = data.urls?.[path];
    if (!url) return null;
    return { url, expiresInSec: typeof data.expires_in === 'number' ? data.expires_in : 3600 };
  } catch {
    return null;
  }
}

/** 전환기 폴백: anon createSignedUrl (마이그레이션 C 이후에는 실패). */
async function signViaAnonStorage(path: string): Promise<{ url: string; expiresInSec: number } | null> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, FALLBACK_SIGNED_URL_EXPIRES_SEC);
  if (error || !data?.signedUrl) return null;
  return { url: data.signedUrl, expiresInSec: FALLBACK_SIGNED_URL_EXPIRES_SEC };
}

/**
 * 화면 표시용 URL 을 비동기로 받아온다.
 * - path 추출 가능 → 백엔드 서명(room code 검증) → (전환기) anon createSignedUrl
 * - 추출 실패 → 원본 stored 값 그대로 반환 (외부 호스트 등 fallback)
 *
 * 동일 path 는 만료 1분 전까지 메모리 캐시.
 */
export async function resolveImageUrl(
  stored: string | null | undefined,
  challengeCode: string
): Promise<string | null> {
  if (!stored) return null;

  const path = extractStoragePath(stored);
  if (!path) return stored; // fallback: 외부 URL

  const cached = SIGNED_URL_CACHE.get(path);
  if (cached && cached.expiresAt > Date.now() + 60_000) {
    return cached.url;
  }

  const signed = (await signViaBackend(challengeCode, path)) ?? (await signViaAnonStorage(path));
  if (!signed) {
    return stored; // 마지막 fallback
  }

  SIGNED_URL_CACHE.set(path, {
    url: signed.url,
    expiresAt: Date.now() + signed.expiresInSec * 1000,
  });
  return signed.url;
}

/** 테스트용 — 메모리 캐시 초기화. */
export function __clearSignedUrlCacheForTests(): void {
  SIGNED_URL_CACHE.clear();
}

/** stored 값이 새 형식(path) 인지 빠르게 판별 */
export function isStoragePath(stored: string | null | undefined): boolean {
  if (!stored) return false;
  return !/^https?:\/\//i.test(stored.trim());
}
