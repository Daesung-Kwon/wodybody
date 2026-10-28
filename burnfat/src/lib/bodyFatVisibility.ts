/**
 * G3 — 체지방 숫자 표시는 이 기기에서 그 행을 쓴 경우로 한정한다.
 *
 * device_secret 이 localStorage 에 있으면 이 브라우저가 INSERT 한 행이다.
 * 방 코드만 가진 다른 참가자 화면에서는 "비공개"로 둔다.
 * 서버 RPC 는 아직 숫자를 내려 준다. 이건 화면 가림이며, 응답 자체를 막지는 않는다.
 */
import { loadDeviceSecret } from './deviceSecret';

export function canViewSubmissionBodyFat(submissionId: string | null | undefined): boolean {
  if (!submissionId) return false;
  return loadDeviceSecret('submissions', submissionId) != null;
}

export function canViewWeeklyLogBodyFat(logId: string | null | undefined): boolean {
  if (!logId) return false;
  return loadDeviceSecret('weekly_logs', logId) != null;
}

export function canViewRankingNumbers(
  participant: { submissions: { id: string; type: string }[] } | undefined
): boolean {
  if (!participant) return false;
  const start = participant.submissions.find((s) => s.type === 'start');
  const end = participant.submissions.find((s) => s.type === 'end');
  if (!start || !end) return false;
  return canViewSubmissionBodyFat(start.id) && canViewSubmissionBodyFat(end.id);
}

export function formatBodyFatPercent(
  rate: number | null | undefined,
  visible: boolean
): string {
  if (rate == null || Number.isNaN(Number(rate))) return '-';
  if (!visible) return '비공개';
  return `${Number(rate).toFixed(1)}%`;
}
