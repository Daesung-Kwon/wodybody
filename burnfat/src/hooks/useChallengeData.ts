import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import type { Challenge, ParticipantWithSubmissions, RankingRow } from '../types';
import { useAllWeeklyLogsForChallenge } from './useWeeklyLogs';

/**
 * Sprint 3 Phase B — ChallengePage 의 데이터 페치를 한 곳으로 통합한 hook.
 *
 * 진입 시 REST 호출은 정확히 3건:
 *   1. `challenges_public`  — code 로 챌린지 1건
 *   2. `participants` + `submissions(*)` 임베드 — 참가자별 인증을 *한 번에* (N+1 제거)
 *   3. `weekly_logs` `.in(participant_id, …)` — 전 참가자 주간 기록 (useAllWeeklyLogsForChallenge)
 *
 * 기존 fetchParticipants 는 참가자마다 submissions 를 개별 SELECT 해 1+N 호출이었다.
 * Supabase 임베드 쿼리로 1회 호출로 줄였다 (동작·정렬·랭킹 계산은 동일).
 */

/** 시작/종료 인증을 모두 마친 참가자들로 체지방 감소율 랭킹을 만든다. */
function computeRanking(participants: ParticipantWithSubmissions[]): RankingRow[] {
  return participants
    .map((p) => {
      const start = p.submissions.find((s) => s.type === 'start');
      const end = p.submissions.find((s) => s.type === 'end');
      if (!start || !end) return null;
      const startVal = Number(start.body_fat_rate);
      const endVal = Number(end.body_fat_rate);
      // (시작 - 종료) / 시작 × 100 → 시작 체지방 대비 상대 감소율
      const reductionRate =
        startVal > 0 ? Math.round(((startVal - endVal) / startVal) * 10000) / 100 : 0;
      return {
        rank: 0,
        nickname: p.nickname,
        startBodyFat: Math.round(startVal * 10) / 10,
        endBodyFat: Math.round(endVal * 10) / 10,
        reductionRate,
      };
    })
    .filter((r): r is RankingRow => r !== null)
    .sort((a, b) => b.reductionRate - a.reductionRate)
    .map((r, i) => ({ ...r, rank: i + 1 }));
}

export interface ChallengeData {
  challenge: Challenge | null;
  /** 챌린지 편집·순위 토글 후 클라이언트 상태를 즉시 반영하기 위한 세터. */
  setChallenge: (c: Challenge) => void;
  participants: ParticipantWithSubmissions[];
  ranking: RankingRow[];
  logsByParticipant: Record<string, import('../types').WeeklyLog[]>;
  logsLoading: boolean;
  loading: boolean;
  /** 로딩 시작 후 경과 ms — 스켈레톤 지연 표시용. */
  loadingElapsedMs: number;
  /** 챌린지를 찾지 못했을 때의 메시지 (빈 문자열이면 정상). */
  error: string;
  refetchParticipants: () => Promise<void>;
  refetchLogs: () => Promise<void>;
}

export function useChallengeData(code: string | undefined): ChallengeData {
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [participants, setParticipants] = useState<ParticipantWithSubmissions[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingElapsedMs, setLoadingElapsedMs] = useState(0);
  const [error, setError] = useState('');

  const fetchChallenge = useCallback(async () => {
    if (!code) {
      setLoading(false);
      return;
    }
    // Sprint 3 Phase A: 공개 컬럼만 노출하는 challenges_public VIEW 사용.
    const { data, error: err } = await supabase
      .from('challenges_public')
      .select('*')
      .eq('code', code.toUpperCase())
      .single();
    if (err || !data) {
      setError('대결을 찾을 수 없습니다.');
      setChallenge(null);
    } else {
      setChallenge(data as Challenge);
      setError('');
    }
    setLoading(false);
  }, [code]);

  const fetchParticipants = useCallback(async () => {
    if (!challenge) return;
    // Sprint 3 Phase B: submissions 를 임베드해 1회 호출로 페치 (기존 N+1 제거).
    const { data } = await supabase
      .from('participants')
      .select('*, submissions(*)')
      .eq('challenge_id', challenge.id)
      .order('created_at');
    setParticipants((data as ParticipantWithSubmissions[]) ?? []);
  }, [challenge]);

  useEffect(() => {
    fetchChallenge();
  }, [fetchChallenge]);

  useEffect(() => {
    fetchParticipants();
  }, [fetchParticipants]);

  // 로딩 경과 시간 — 스켈레톤을 너무 일찍/늦게 보여주지 않도록.
  useEffect(() => {
    if (!loading) {
      setLoadingElapsedMs(0);
      return;
    }
    const startedAt = performance.now();
    const timer = window.setInterval(() => {
      setLoadingElapsedMs(Math.round(performance.now() - startedAt));
    }, 100);
    return () => window.clearInterval(timer);
  }, [loading]);

  const participantIds = useMemo(() => participants.map((p) => p.id), [participants]);
  const {
    logsByParticipant,
    loading: logsLoading,
    refetch: refetchLogs,
  } = useAllWeeklyLogsForChallenge(participantIds);

  const ranking = useMemo(() => computeRanking(participants), [participants]);

  return {
    challenge,
    setChallenge,
    participants,
    ranking,
    logsByParticipant,
    logsLoading,
    loading,
    loadingElapsedMs,
    error,
    refetchParticipants: fetchParticipants,
    refetchLogs,
  };
}
