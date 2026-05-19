import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import type { CoachMessage } from '../../types';
import type { CoachSessionPreview } from '../../lib/coachClient';

vi.mock('../../lib/coachClient', () => ({
  fetchCoachSessions: vi.fn(),
  fetchCoachSessionMessages: vi.fn(),
  streamCoachMessage: vi.fn(),
  endCoachSession: vi.fn(),
  resetCoachMemory: vi.fn(),
  stripRefMarkers: (s: string) => s,
}));

import {
  fetchCoachSessions,
  fetchCoachSessionMessages,
  streamCoachMessage,
} from '../../lib/coachClient';
import { useCoachSession } from '../useCoachSession';

const sessionsMock = fetchCoachSessions as unknown as ReturnType<typeof vi.fn>;
const messagesMock = fetchCoachSessionMessages as unknown as ReturnType<typeof vi.fn>;
const streamMock = streamCoachMessage as unknown as ReturnType<typeof vi.fn>;

function preview(partial: Partial<CoachSessionPreview>): CoachSessionPreview {
  return {
    id: 's1',
    week_no: 2,
    persona: 'friendly',
    status: 'active',
    visibility: 'private',
    created_at: '2026-05-25',
    updated_at: '2026-05-25',
    preview: '',
    owned: true,
    ...partial,
  };
}

function msg(partial: Partial<CoachMessage>): CoachMessage {
  return {
    id: 'm1',
    session_id: 's1',
    role: 'assistant',
    content: '메시지',
    tokens_in: null,
    tokens_out: null,
    references_jsonb: null,
    created_at: '2026-05-25',
    ...partial,
  };
}

const params = { participantId: 'p1', weekNo: 2, seedContent: '시드 조언', open: true };

beforeEach(() => {
  sessionsMock.mockReset();
  messagesMock.mockReset();
  streamMock.mockReset();
});

describe('useCoachSession', () => {
  it('활성 세션이 있으면 메시지를 복원하고 system 역할은 제외한다', async () => {
    sessionsMock.mockResolvedValue([preview({ id: 's1' })]);
    messagesMock.mockResolvedValue({
      session: {},
      messages: [
        msg({ id: 'sys', role: 'system', content: '시스템' }),
        msg({ id: 'a1', role: 'assistant', content: '안녕하세요' }),
        msg({
          id: 'a2',
          role: 'assistant',
          content: '지난 주 기록을 보면',
          references_jsonb: [{ week_no: 1 }],
        }),
      ],
    });

    const { result } = renderHook(() => useCoachSession(params));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.sessionId).toBe('s1');
    // system 메시지는 제외 → 2개
    expect(result.current.messages).toHaveLength(2);
    // references_jsonb 가 references 로 매핑된다 (메모리 인용 분기)
    const cited = result.current.messages.find((m) => m.id === 'a2');
    expect(cited?.references).toEqual([{ week_no: 1 }]);
  });

  it('활성 세션이 없으면 시드 메시지 한 개로 시작한다', async () => {
    sessionsMock.mockResolvedValue([]);

    const { result } = renderHook(() => useCoachSession(params));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.sessionId).toBeNull();
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].content).toBe('시드 조언');
  });

  it('send 는 사용자 메시지를 추가하고 onDone 시 어시스턴트 메시지를 붙인다', async () => {
    sessionsMock.mockResolvedValue([]);
    streamMock.mockImplementation(
      async (
        _req: unknown,
        handlers: {
          onStart?: (i: {
            sessionId: string;
            sessionCreated: boolean;
            weekMessagesUsed: number;
            weekMessagesLimit: number;
          }) => void;
          onDone: (i: { message: CoachMessage | null }) => void;
        }
      ) => {
        handlers.onStart?.({
          sessionId: 's-new',
          sessionCreated: true,
          weekMessagesUsed: 1,
          weekMessagesLimit: 30,
        });
        handlers.onDone({ message: msg({ id: 'a-reply', content: '좋은 질문이에요' }) });
      }
    );

    const { result } = renderHook(() => useCoachSession(params));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.send('이번 주 어때요?');
    });

    expect(streamMock).toHaveBeenCalledTimes(1);
    const contents = result.current.messages.map((m) => m.content);
    expect(contents).toContain('이번 주 어때요?');
    expect(contents).toContain('좋은 질문이에요');
    expect(result.current.sessionId).toBe('s-new');
    expect(result.current.sending).toBe(false);
  });
});
