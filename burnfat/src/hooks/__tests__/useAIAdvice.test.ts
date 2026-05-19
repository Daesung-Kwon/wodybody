import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import type { AIAdviceResponse } from '../../lib/edgeFunctions';

vi.mock('../../lib/edgeFunctions', () => ({
  fetchAIAdvice: vi.fn(),
}));

import { fetchAIAdvice } from '../../lib/edgeFunctions';
import { useAIAdvice } from '../useAIAdvice';

const fetchMock = fetchAIAdvice as unknown as ReturnType<typeof vi.fn>;

function response(partial: Partial<AIAdviceResponse>): AIAdviceResponse {
  return {
    advice: '조언 본문',
    structured: null,
    cached: false,
    weekNo: 2,
    ...partial,
  };
}

beforeEach(() => {
  fetchMock.mockReset();
});

describe('useAIAdvice', () => {
  it('cache miss — result.cached 가 false 로 채워진다', async () => {
    fetchMock.mockResolvedValue(response({ cached: false }));

    const { result } = renderHook(() => useAIAdvice());
    await act(async () => {
      await result.current.load('p1');
    });

    expect(result.current.result?.cached).toBe(false);
    expect(result.current.error).toBeNull();
    expect(fetchMock).toHaveBeenCalledWith({ participantId: 'p1', forceRefresh: false });
  });

  it('cache hit — result.cached 가 true', async () => {
    fetchMock.mockResolvedValue(response({ cached: true }));

    const { result } = renderHook(() => useAIAdvice());
    await act(async () => {
      await result.current.load('p1');
    });

    expect(result.current.result?.cached).toBe(true);
  });

  it('forceRefresh=true 면 fetchAIAdvice 에 forceRefresh 가 전달된다', async () => {
    fetchMock.mockResolvedValue(response({ cached: false }));

    const { result } = renderHook(() => useAIAdvice());
    await act(async () => {
      await result.current.load('p1', true);
    });

    expect(fetchMock).toHaveBeenCalledWith({ participantId: 'p1', forceRefresh: true });
  });

  it('fetchAIAdvice 가 throw 하면 error 가 설정되고 result 는 null', async () => {
    fetchMock.mockRejectedValue(new Error('서버 오류'));

    const { result } = renderHook(() => useAIAdvice());
    await act(async () => {
      await result.current.load('p1');
    });

    await waitFor(() => expect(result.current.error).toBe('서버 오류'));
    expect(result.current.result).toBeNull();
  });
});
