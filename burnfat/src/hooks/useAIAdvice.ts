import { useState, useCallback } from 'react';
import { fetchAIAdvice, type AIAdviceRequest } from '../lib/edgeFunctions';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24시간

function cacheKey(participantId: string) {
  return `bf_ai_${participantId}`;
}

function readCache(participantId: string): string | null {
  try {
    const raw = localStorage.getItem(cacheKey(participantId));
    if (!raw) return null;
    const { advice, cachedAt } = JSON.parse(raw) as { advice: string; cachedAt: number };
    if (Date.now() - cachedAt > CACHE_TTL_MS) {
      localStorage.removeItem(cacheKey(participantId));
      return null;
    }
    return advice;
  } catch {
    return null;
  }
}

function writeCache(participantId: string, advice: string) {
  try {
    localStorage.setItem(cacheKey(participantId), JSON.stringify({ advice, cachedAt: Date.now() }));
  } catch { /* 저장 공간 부족 등 무시 */ }
}

export function clearAIAdviceCache(participantId: string) {
  try { localStorage.removeItem(cacheKey(participantId)); } catch { /* ignore */ }
}

export function useAIAdvice() {
  const [advice, setAdvice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCached, setIsCached] = useState(false);

  const load = useCallback(async (
    participantId: string,
    forceRefresh = false,
    options?: Omit<AIAdviceRequest, 'participantId'>
  ) => {
    if (!forceRefresh) {
      const cached = readCache(participantId);
      if (cached) {
        setAdvice(cached);
        setIsCached(true);
        setError(null);
        setLoading(false);
        return;
      }
    }
    setLoading(true);
    setError(null);
    setAdvice(null);
    setIsCached(false);
    try {
      const res = await fetchAIAdvice({ participantId, ...options });
      setAdvice(res.advice);
      setIsCached(false);
      writeCache(participantId, res.advice);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'AI 조언을 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setAdvice(null);
    setError(null);
    setIsCached(false);
  }, []);

  return { advice, loading, error, isCached, load, reset };
}
