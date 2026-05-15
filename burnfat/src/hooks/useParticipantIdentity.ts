import { useState, useEffect, useMemo, useCallback } from 'react';
import type { ParticipantWithSubmissions } from '../types';
import {
  getRememberedParticipantId,
  rememberParticipant,
  forgetParticipant,
} from '../lib/participantIdentity';

export interface ParticipantIdentity {
  /** 이 디바이스에서 식별된 "나" — 현재 참가자 목록에 실제 존재하는 경우에만 non-null. */
  myParticipant: ParticipantWithSubmissions | null;
  /** 조인 성공 시 호출해 "나" 로 기억. */
  remember: (participantId: string) => void;
  /** "내가 아니에요" — 식별 해제. */
  forget: () => void;
}

/**
 * Sprint 1 — 내 참가자 식별 hook.
 *
 * localStorage 의 매핑을 읽되, *실제 참가자 목록과 대조* 해 삭제·불일치된 id 는
 * 자동으로 무시한다. 이 식별은 인증이 아니라 UX 편의용임에 유의.
 */
export function useParticipantIdentity(
  challengeId: string | undefined,
  participants: ParticipantWithSubmissions[]
): ParticipantIdentity {
  const [myId, setMyId] = useState<string | null>(null);

  useEffect(() => {
    setMyId(challengeId ? getRememberedParticipantId(challengeId) : null);
  }, [challengeId]);

  const myParticipant = useMemo(
    () => (myId ? participants.find((p) => p.id === myId) ?? null : null),
    [participants, myId]
  );

  const remember = useCallback(
    (participantId: string) => {
      if (!challengeId) return;
      rememberParticipant(challengeId, participantId);
      setMyId(participantId);
    },
    [challengeId]
  );

  const forget = useCallback(() => {
    if (!challengeId) return;
    forgetParticipant(challengeId);
    setMyId(null);
  }, [challengeId]);

  return { myParticipant, remember, forget };
}
