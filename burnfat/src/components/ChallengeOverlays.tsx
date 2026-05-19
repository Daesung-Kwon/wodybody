import Snackbar from '@mui/material/Snackbar';
import type { Challenge, ParticipantWithSubmissions, WeeklyLog } from '../types';
import type { DDayDisplay } from '../lib/challengeSchedule';
import SubmitModal from './SubmitModal';
import ParticipantBasicInfoDialog from './ParticipantBasicInfoDialog';
import WeeklyLogForm from './WeeklyLogForm';
import ChallengeEditDialog from './ChallengeEditDialog';
import AdminPinDialog, { type AdminPinAction } from './AdminPinDialog';
import EndingSoonDialog from './EndingSoonDialog';
import WeeklyLogsUpgradeNoticeDialog from './WeeklyLogsUpgradeNoticeDialog';

/** 시작/종료 인증 모달의 대상. */
export interface SubmitTarget {
  participantId: string;
  participantNickname: string;
  type: 'start' | 'end';
}

interface ChallengeOverlaysProps {
  challenge: Challenge;
  logsByParticipant: Record<string, WeeklyLog[]>;
  myParticipant: ParticipantWithSubmissions | null;
  endDateOnly: string;
  dday: DDayDisplay;

  submitTarget: SubmitTarget | null;
  onCloseSubmit: () => void;
  onSubmitSuccess: () => void;

  basicInfo: { participant: ParticipantWithSubmissions; afterJoin: boolean } | null;
  onCloseBasicInfo: () => void;
  onBasicInfoSuccess: () => void;

  weeklyLogTarget: { participant: ParticipantWithSubmissions; defaultWeekNo?: number } | null;
  onCloseWeeklyLog: () => void;
  onWeeklyLogSuccess: () => void;

  copySnackbar: boolean;
  onCloseCopy: () => void;
  earlyEndSnackbar: boolean;
  onCloseEarlyEnd: () => void;
  toast: string | null;
  onCloseToast: () => void;

  pinAction: AdminPinAction | null;
  onClosePin: () => void;
  onPinConfirmed: () => Promise<boolean>;

  editOpen: boolean;
  onCloseEdit: () => void;
  onSavedEdit: (updated: Challenge) => void;

  endingSoonOpen: boolean;
  onCloseEndingSoon: () => void;
  onAuthEndMy: (() => void) | undefined;

  weeklyLogsNoticeOpen: boolean;
  onCloseWeeklyLogsNotice: () => void;
}

/**
 * Sprint 3 Phase B — ChallengePage 의 오버레이 레이어.
 * 탭에 걸쳐 호출되는 모달·다이얼로그·스낵바를 한 곳에 모은 *표현 전용* 컴포넌트.
 * 상태와 핸들러는 모두 ChallengePage 가 소유하고, 여기서는 렌더만 한다.
 */
export default function ChallengeOverlays({
  challenge,
  logsByParticipant,
  myParticipant,
  endDateOnly,
  dday,
  submitTarget,
  onCloseSubmit,
  onSubmitSuccess,
  basicInfo,
  onCloseBasicInfo,
  onBasicInfoSuccess,
  weeklyLogTarget,
  onCloseWeeklyLog,
  onWeeklyLogSuccess,
  copySnackbar,
  onCloseCopy,
  earlyEndSnackbar,
  onCloseEarlyEnd,
  toast,
  onCloseToast,
  pinAction,
  onClosePin,
  onPinConfirmed,
  editOpen,
  onCloseEdit,
  onSavedEdit,
  endingSoonOpen,
  onCloseEndingSoon,
  onAuthEndMy,
  weeklyLogsNoticeOpen,
  onCloseWeeklyLogsNotice,
}: ChallengeOverlaysProps) {
  return (
    <>
      {submitTarget && (
        <SubmitModal
          open
          participantId={submitTarget.participantId}
          participantNickname={submitTarget.participantNickname}
          type={submitTarget.type}
          onClose={onCloseSubmit}
          onSuccess={onSubmitSuccess}
        />
      )}

      <WeeklyLogsUpgradeNoticeDialog
        open={weeklyLogsNoticeOpen}
        onClose={onCloseWeeklyLogsNotice}
      />

      <Snackbar
        open={copySnackbar}
        autoHideDuration={2000}
        onClose={onCloseCopy}
        message="URL이 복사되었습니다"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
      <Snackbar
        open={earlyEndSnackbar}
        autoHideDuration={4000}
        onClose={onCloseEarlyEnd}
        message={`종료일(${endDateOnly || challenge.end_date}) 이후에 인증이 가능합니다.`}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ '& .MuiSnackbarContent-root': { bgcolor: 'warning.dark' } }}
      />
      <Snackbar
        open={!!toast}
        autoHideDuration={3000}
        onClose={onCloseToast}
        message={toast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />

      <ChallengeEditDialog
        open={editOpen}
        challenge={challenge}
        onClose={onCloseEdit}
        onSaved={onSavedEdit}
      />

      {pinAction && (
        <AdminPinDialog
          open
          challengeId={challenge.id}
          action={pinAction}
          onClose={onClosePin}
          onConfirmed={onPinConfirmed}
        />
      )}

      {basicInfo && (
        <ParticipantBasicInfoDialog
          open
          participant={basicInfo.participant}
          onClose={onCloseBasicInfo}
          onSuccess={onBasicInfoSuccess}
          isAfterJoin={basicInfo.afterJoin}
        />
      )}

      {weeklyLogTarget && (
        <WeeklyLogForm
          open
          participant={weeklyLogTarget.participant}
          challengeStartDate={challenge.start_date}
          challengeEndDate={challenge.end_date}
          existingWeekNos={(logsByParticipant[weeklyLogTarget.participant.id] || []).map(
            (l) => l.week_no
          )}
          defaultWeekNo={weeklyLogTarget.defaultWeekNo}
          onClose={onCloseWeeklyLog}
          onSuccess={onWeeklyLogSuccess}
        />
      )}

      <EndingSoonDialog
        open={endingSoonOpen}
        ddayLabel={dday.label}
        endDate={endDateOnly || challenge.end_date}
        myEndPending={
          myParticipant ? !myParticipant.submissions.some((s) => s.type === 'end') : undefined
        }
        onClose={onCloseEndingSoon}
        onAuthEnd={onAuthEndMy}
      />
    </>
  );
}
