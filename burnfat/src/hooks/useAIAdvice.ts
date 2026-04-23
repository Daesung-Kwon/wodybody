import { useState, useCallback } from 'react';
import { fetchAIAdvice } from '../lib/edgeFunctions';

export function useAIAdvice() {
  const [advice, setAdvice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (participantId: string) => {
    setLoading(true);
    setError(null);
    setAdvice(null);
    try {
      const res = await fetchAIAdvice(participantId);
      setAdvice(res.advice);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'AI 조언을 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setAdvice(null);
    setError(null);
  }, []);

  return { advice, loading, error, load, reset };
}
