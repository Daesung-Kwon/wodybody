/**
 * Room-scoped data access (RLS lockdown, 2026-10).
 *
 * BurnFat has no user login: the room code (`/c/:code`) is the room's shared secret.
 * Direct table reads/writes with the anon key are being removed (migration
 * 20261006000002_lockdown_room_reads.sql), so every read/write of
 * challenges / participants / submissions / weekly_logs goes through the
 * SECURITY DEFINER RPCs from 20261006000001_room_scoped_rpcs.sql, which require the
 * room code and never return device_secret_hash / admin_pin_hash.
 *
 * Keep ALL anon data access to those tables in this module so a future
 * `.from('participants')` regression is easy to spot (see roomApi.test.ts).
 */
import { supabase } from './supabase';
import type {
  Challenge,
  Gender,
  Participant,
  ParticipantWithSubmissions,
  Submission,
  SubmissionType,
  WeeklyLog,
} from '../types';

/** Room codes are stored upper-case; the RPCs also normalise, this keeps cache keys stable. */
export function normalizeRoomCode(code: string): string {
  return code.trim().toUpperCase();
}

/** Supabase/PostgREST error → Error (keeps `.code` so callers can branch on e.g. 23505). */
export class RoomApiError extends Error {
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.name = 'RoomApiError';
    this.code = code;
  }
}

function fail(error: { message?: string; code?: string } | null | undefined, fallback: string): never {
  throw new RoomApiError(error?.message || fallback, error?.code);
}

/* ── Reads ───────────────────────────────────────────────────────────────── */

export async function fetchChallengeByCode(code: string): Promise<Challenge | null> {
  const { data, error } = await supabase.rpc('get_challenge_by_code', {
    p_code: normalizeRoomCode(code),
  });
  if (error) fail(error, '대결 정보를 불러오지 못했습니다.');
  const rows = (Array.isArray(data) ? data : data ? [data] : []) as Challenge[];
  return rows[0] ?? null;
}

export async function fetchRoomParticipants(code: string): Promise<ParticipantWithSubmissions[]> {
  const { data, error } = await supabase.rpc('get_room_participants', {
    p_code: normalizeRoomCode(code),
  });
  if (error) fail(error, '참가자 목록을 불러오지 못했습니다.');
  return ((data as ParticipantWithSubmissions[] | null) ?? []).map((p) => ({
    ...p,
    submissions: Array.isArray(p.submissions) ? p.submissions : [],
  }));
}

export async function fetchRoomWeeklyLogs(code: string, participantId?: string | null): Promise<WeeklyLog[]> {
  const { data, error } = await supabase.rpc('get_room_weekly_logs', {
    p_code: normalizeRoomCode(code),
    p_participant_id: participantId ?? null,
  });
  if (error) fail(error, '주간 기록을 불러오지 못했습니다.');
  return (data as WeeklyLog[] | null) ?? [];
}

/* ── Writes ──────────────────────────────────────────────────────────────── */

export async function joinChallenge(code: string, nickname: string): Promise<Participant> {
  const { data, error } = await supabase.rpc('join_challenge', {
    p_code: normalizeRoomCode(code),
    p_nickname: nickname,
  });
  if (error) fail(error, '참가 등록에 실패했습니다.');
  return data as Participant;
}

export interface BasicInfo {
  age: number | null;
  gender: Gender | null;
  height_cm: number | null;
  target_body_fat: number | null;
}

export async function updateParticipantBasicInfo(
  code: string,
  participantId: string,
  info: BasicInfo
): Promise<Participant> {
  const { data, error } = await supabase.rpc('update_participant_basic_info', {
    p_code: normalizeRoomCode(code),
    p_participant_id: participantId,
    p_age: info.age,
    p_gender: info.gender,
    p_height_cm: info.height_cm,
    p_target_body_fat: info.target_body_fat,
  });
  if (error) fail(error, '기본정보 저장에 실패했습니다.');
  return data as Participant;
}

export interface NewSubmission {
  participantId: string;
  type: SubmissionType;
  bodyFatRate: number;
  imagePath: string | null;
  deviceSecretHash: string;
}

export async function createSubmission(code: string, s: NewSubmission): Promise<Submission> {
  const { data, error } = await supabase.rpc('create_submission', {
    p_code: normalizeRoomCode(code),
    p_participant_id: s.participantId,
    p_type: s.type,
    p_body_fat_rate: s.bodyFatRate,
    p_image_path: s.imagePath,
    p_device_secret_hash: s.deviceSecretHash,
  });
  if (error) fail(error, '인증 제출에 실패했습니다.');
  return data as Submission;
}

export type NewWeeklyLog = Omit<
  WeeklyLog,
  'id' | 'participant_id' | 'created_at' | 'updated_at' | 'device_secret_hash'
>;

export async function createWeeklyLog(
  code: string,
  participantId: string,
  log: NewWeeklyLog,
  deviceSecretHash: string
): Promise<WeeklyLog> {
  const { data, error } = await supabase.rpc('create_weekly_log', {
    p_code: normalizeRoomCode(code),
    p_participant_id: participantId,
    p_log: log,
    p_device_secret_hash: deviceSecretHash,
  });
  if (error) fail(error, '주간 기록 저장에 실패했습니다.');
  return data as WeeklyLog;
}
