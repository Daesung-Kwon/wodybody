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
}

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
  note: string | null;
  created_at: string;
  updated_at: string;
}

export type SubmissionType = 'start' | 'end';

export interface Submission {
  id: string;
  participant_id: string;
  type: SubmissionType;
  body_fat_rate: number;
  image_url: string | null;
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
