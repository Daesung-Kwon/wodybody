export interface Challenge {
  id: string;
  code: string;
  title: string;
  start_date: string;
  end_date: string;
  stake_amount: number;
  created_at: string;
  /** 중간 순위 공개 여부 — 마이그레이션 후 사용 가능 */
  ranking_unlocked?: boolean;
  /**
   * 관리자 PIN 설정 여부 (서버 측 generated 컬럼).
   * 평문/해시는 클라이언트에 노출되지 않으며, 검증은 supabase.rpc('verify_admin_pin', ...) 으로만 수행.
   */
  has_admin_pin?: boolean;
}

/**
 * Sprint 0 hotfix: `challenges` 테이블의 익명(anon) SELECT 권한이 *컬럼 레벨* 로 분리되어
 * `admin_pin_hash` 는 anon 에 미부여 상태다 (마이그레이션 `20260514000001_admin_pin_hash.sql`).
 * 이 상태에서 클라이언트가 `.select('*')` 를 호출하면 PostgREST 가
 * `permission denied for column admin_pin_hash` 로 *전체 SELECT 자체* 를 실패시킨다.
 *
 * 따라서 challenges 를 클라이언트에서 조회할 때는 반드시 이 상수를 사용해
 * 공개 컬럼만 명시적으로 SELECT 한다. 새 공개 컬럼이 추가되면 여기와
 * `Challenge` 인터페이스 양쪽을 함께 갱신.
 */
export const CHALLENGE_PUBLIC_COLUMNS =
  'id, code, title, start_date, end_date, stake_amount, created_at, ranking_unlocked, has_admin_pin';

export type Gender = 'M' | 'F';

export interface Participant {
  id: string;
  challenge_id: string;
  nickname: string;
  age: number | null;
  gender: Gender | null;
  height_cm: number | null;
  target_body_fat: number | null;
  created_at: string;
}

export type DietQuality = 'normal' | 'overeat' | 'undereat';

export interface WeeklyLog {
  id: string;
  participant_id: string;
  week_no: number;
  recorded_at: string;
  age: number | null;
  gender: Gender | null;
  weight_kg: number | null;
  height_cm: number | null;
  body_fat_rate: number | null;
  /** 이번 주 운동 횟수 (0~7) */
  exercise_count: number | null;
  /** 평균 수면 시간 (시간) */
  sleep_hours: number | null;
  /** 식단 패턴 */
  diet_quality: DietQuality | null;
  note: string | null;
  /** Sprint 0.2: device_secret_hash (SHA-256 hex). */
  device_secret_hash?: string | null;
  created_at: string;
  updated_at: string;
}

export type SubmissionType = 'start' | 'end';

export interface Submission {
  id: string;
  participant_id: string;
  type: SubmissionType;
  body_fat_rate: number;
  /**
   * Storage 경로 또는 (구) public/sign URL.
   * 신규 INSERT 는 path 만 저장하며 표시 시 resolveImageUrl 로 signed URL 생성.
   */
  image_url: string | null;
  /** Sprint 0.2: device_secret_hash (SHA-256 hex). 서버에서만 사용, 클라이언트는 plain만 보관. */
  device_secret_hash?: string | null;
  created_at: string;
}

export interface ParticipantWithSubmissions extends Participant {
  submissions: Submission[];
}

export interface RankingRow {
  rank: number;
  nickname: string;
  startBodyFat: number;
  endBodyFat: number;
  /** 체지방 감소율 (%) = (시작 - 종료) / 시작 × 100 */
  reductionRate: number;
}
