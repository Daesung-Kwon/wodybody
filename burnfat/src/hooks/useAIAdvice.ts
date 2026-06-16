import { useState, useCallback } from 'react';
import { fetchAIAdvice, type AIAdviceRequest, type AIAdviceResponse } from '../lib/edgeFunctions';
import { track } from '../lib/analytics';

/**
 * Sprint 2: 디바이스 단위 localStorage 캐시 제거.
 *   - 캐시는 이제 서버(weekly_ai_advice 테이블)가 담당 → 같은 챌린지의 다른 친구가 열어도
 *     Grok 재호출 없이 캐시 hit ("공동 모니터링" 콘셉트와 일치).
 *   - `result.cached` 가 서버 캐시 hit 여부를 알려 준다.
 */
export function useAIAdvice() {
  const [result, setResult] = useState<AIAdviceResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (
      participantId: string,
      forceRefresh = false,
      options?: Omit<AIAdviceRequest, 'participantId' | 'forceRefresh'>
    ) => {
      setLoading(true);
      setError(null);
      setResult(null);
      try {
        const res = await fetchAIAdvice({ participantId, forceRefresh, ...options });
        setResult(res);
        track('ai_advice_requested', {
          cached: res.cached,
          force_refresh: forceRefresh,
          has_user_context: Boolean(options?.userContext?.trim()),
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'AI 조언을 불러올 수 없습니다.');
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { result, loading, error, load, reset };
}
