import { useCallback, useEffect, useRef, useState } from 'react';
import type { CoachMessage, CoachMessageReference, CoachPersona } from '../types';
import {
  endCoachSession,
  fetchCoachSessionMessages,
  fetchCoachSessions,
  resetCoachMemory,
  streamCoachMessage,
  stripRefMarkers,
} from '../lib/coachClient';

/** 화면에 그리는 코치 메시지 (system 역할은 제외). */
export interface CoachUiMessage {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  references: CoachMessageReference[];
}

interface UseCoachSessionParams {
  participantId: string;
  weekNo: number;
  /** 새 세션 첫 어시스턴트 메시지로 쓸 카드 콘텐츠 (AIAdviceCard 의 조언). */
  seedContent: string;
  /** 모달이 열려 있을 때만 로드. */
  open: boolean;
}

function toUiMessage(m: CoachMessage): CoachUiMessage {
  return {
    id: m.id,
    role: m.role === 'user' ? 'user' : 'assistant',
    content: m.content,
    references: m.references_jsonb ?? [],
  };
}

/**
 * Sprint 2.5 — 코치 세션 상태 hook.
 * (participant, week_no) 기준으로 세션을 로드/복원하고, SSE 스트리밍 전송을 처리한다.
 */
export function useCoachSession({ participantId, weekNo, seedContent, open }: UseCoachSessionParams) {
  const [messages, setMessages] = useState<CoachUiMessage[]>([]);
  const [streaming, setStreaming] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [weekUsage, setWeekUsage] = useState<{ used: number; limit: number } | null>(null);
  const [persona, setPersona] = useState<CoachPersona>('friendly');
  const streamingRef = useRef('');

  const buildSeed = useCallback(
    (): CoachUiMessage => ({
      id: 'seed',
      role: 'assistant',
      content: seedContent || '이번 주 기록을 함께 살펴봐요. 궁금한 점을 물어보세요.',
      references: [],
    }),
    [seedContent]
  );

  // 모달 진입 시 세션 로드/복원
  useEffect(() => {
    if (!open || !participantId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const sessions = await fetchCoachSessions(participantId, weekNo);
        const active = sessions.find(
          (s) => s.status === 'active' && s.week_no === weekNo && s.owned
        );
        if (cancelled) return;
        if (active) {
          const { messages: msgs } = await fetchCoachSessionMessages(active.id);
          if (cancelled) return;
          setSessionId(active.id);
          setPersona(active.persona);
          setMessages(msgs.filter((m) => m.role !== 'system').map(toUiMessage));
        } else {
          setSessionId(null);
          setMessages([buildSeed()]);
        }
      } catch (e) {
        if (cancelled) return;
        // 로드 실패해도 시드를 보여 대화는 시작 가능하게 한다.
        setSessionId(null);
        setMessages([buildSeed()]);
        setError(e instanceof Error ? e.message : '대화를 불러오지 못했어요.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, participantId, weekNo, buildSeed]);

  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || sending) return;
      setError(null);
      setSending(true);
      setStreaming('');
      streamingRef.current = '';
      setMessages((prev) => [
        ...prev,
        { id: `u-${Date.now()}`, role: 'user', content: text, references: [] },
      ]);
      const isFirst = sessionId == null;
      await streamCoachMessage(
        {
          sessionId: sessionId ?? undefined,
          participantId,
          weekNo,
          content: text,
          persona,
          seedContent: isFirst ? seedContent : undefined,
        },
        {
          onStart: (info) => {
            setSessionId(info.sessionId);
            setWeekUsage({ used: info.weekMessagesUsed, limit: info.weekMessagesLimit });
          },
          onDelta: (t) => {
            streamingRef.current += t;
            setStreaming(streamingRef.current);
          },
          onDone: ({ message }) => {
            const finalText = message?.content ?? stripRefMarkers(streamingRef.current);
            const refs = message?.references_jsonb ?? [];
            setMessages((prev) => [
              ...prev,
              {
                id: message?.id ?? `a-${Date.now()}`,
                role: 'assistant',
                content: finalText,
                references: refs,
              },
            ]);
            streamingRef.current = '';
            setStreaming('');
            setSending(false);
          },
          onError: (msg) => {
            setError(msg);
            streamingRef.current = '';
            setStreaming('');
            setSending(false);
          },
        }
      );
    },
    [sending, sessionId, participantId, weekNo, persona, seedContent]
  );

  // 새 대화 시작 — 현재 세션은 종료(archived, 메모리 압축) 후 시드로 리셋. 메모리는 유지.
  const startNewChat = useCallback(async () => {
    if (sending) return;
    setError(null);
    const cur = sessionId;
    if (cur) {
      try {
        await endCoachSession(cur);
      } catch {
        /* 종료 실패는 무시 — 새 대화는 진행 */
      }
    }
    setSessionId(null);
    setMessages([buildSeed()]);
    streamingRef.current = '';
    setStreaming('');
  }, [sending, sessionId, buildSeed]);

  // 기억 초기화 — 장기 메모리 삭제 + 모든 세션 archived (위험 액션).
  const resetMemory = useCallback(async () => {
    if (sending) return;
    setError(null);
    try {
      await resetCoachMemory(participantId);
    } catch (e) {
      setError(e instanceof Error ? e.message : '기억 초기화에 실패했어요.');
      return;
    }
    setSessionId(null);
    setMessages([buildSeed()]);
    streamingRef.current = '';
    setStreaming('');
  }, [sending, participantId, buildSeed]);

  return {
    messages,
    streaming,
    sessionId,
    loading,
    sending,
    error,
    weekUsage,
    persona,
    send,
    startNewChat,
    resetMemory,
    changePersona: setPersona,
  };
}
