import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { supabase } from '../lib/supabase';
import type { ParticipantWithSubmissions } from '../types';
import { useChallengeData } from '../hooks/useChallengeData';
import { useParticipantIdentity } from '../hooks/useParticipantIdentity';
import { useRecordStatus } from '../hooks/useRecordStatus';
import { useNextRecordableWeek } from '../hooks/useNextRecordableWeek';
import { getDDayDisplay } from '../lib/challengeSchedule';
import { hasSeenNotice, markNoticeSeen } from '../lib/oneTimeNotice';
import ChallengeHeader from '../components/ChallengeHeader';
import ChallengeTabs from '../components/ChallengeTabs';
import ParticipantsTabHeader from '../components/ParticipantsTabHeader';
import ParticipantsTab from '../components/ParticipantsTab';
import RankingTab from '../components/RankingTab';
import WeeklyLogsTab from '../components/WeeklyLogsTab';
import ChallengeOverlays, { type SubmitTarget } from '../components/ChallengeOverlays';
import type { AdminPinAction } from '../components/AdminPinDialog';
import ChallengePageSkeleton from '../components/ChallengePageSkeleton';
import {
  shouldShowEndingSoonNotice,
  dismissEndingSoonNotice,
} from '../components/EndingSoonDialog';
import {
  dismissWeeklyLogsUpgradeNotice,
  shouldShowWeeklyLogsUpgradeNotice,
} from '../components/WeeklyLogsUpgradeNoticeDialog';

// Sprint 0.4: 디버그 플래그 — 운영 빌드에서는 미설정/"false".
const DEBUG_ALLOW_EARLY_END_SUBMIT =
  (import.meta.env.VITE_DEBUG_ALLOW_EARLY_END_SUBMIT ?? '').toLowerCase() === 'true';

/**
 * Sprint 3 Phase B — ChallengePage 는 데이터 페치(useChallengeData)와
 * 탭/오버레이 조율만 담당한다. 화면은 ChallengeHeader / 3개 탭 / ChallengeOverlays 가 맡는다.
 */
export default function ChallengePage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  const {
    challenge,
    setChallenge,
    participants,
    ranking,
    logsByParticipant,
    logsLoading,
    loading,
    loadingElapsedMs,
    error,
    refetchParticipants,
    refetchLogs,
  } = useChallengeData(code);

  const { myParticipant, remember, forget } = useParticipantIdentity(
    challenge?.id,
    participants
  );
  const recordStatus = useRecordStatus(
    participants,
    logsByParticipant,
    challenge?.start_date || ''
  );
  const myLogs = myParticipant ? logsByParticipant[myParticipant.id] || [] : [];
  const myWeekly = useNextRecordableWeek(
    myLogs,
    challenge?.start_date || '',
    challenge?.end_date || ''
  );

  const [tab, setTab] = useState(0);
  const prevTabRef = useRef(0);
  const [submitTarget, setSubmitTarget] = useState<SubmitTarget | null>(null);
  const [basicInfo, setBasicInfo] = useState<{
    participant: ParticipantWithSubmissions;
    afterJoin: boolean;
  } | null>(null);
  const [weeklyLogTarget, setWeeklyLogTarget] = useState<{
    participant: ParticipantWithSubmissions;
    defaultWeekNo?: number;
  } | null>(null);
  const [copySnackbar, setCopySnackbar] = useState(false);
  const [earlyEndSnackbar, setEarlyEndSnackbar] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [pinAction, setPinAction] = useState<AdminPinAction | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [endingSoonOpen, setEndingSoonOpen] = useState(false);
  const [weeklyLogsNoticeOpen, setWeeklyLogsNoticeOpen] = useState(false);

  // 주간 기록 탭 첫 진입 시 업그레이드 안내 1회.
  useEffect(() => {
    const prev = prevTabRef.current;
    if (tab === 2 && prev !== 2 && shouldShowWeeklyLogsUpgradeNotice()) {
      setWeeklyLogsNoticeOpen(true);
    }
    prevTabRef.current = tab;
  }, [tab]);

  // Sprint 1: 종료 임박 모달 — 종료 24h 이내 진입 시 챌린지당 1회.
  useEffect(() => {
    if (!challenge) return;
    const dd = getDDayDisplay(challenge.start_date, challenge.end_date);
    if (dd.endingSoon && shouldShowEndingSoonNotice(challenge.id)) setEndingSoonOpen(true);
  }, [challenge]);

  // Sprint 1: 백필 권고 토스트 — 내 미입력 주차가 2개 이상이면 챌린지당 1회.
  useEffect(() => {
    if (!challenge || !myParticipant || logsLoading) return;
    if (myWeekly.missingWeeks.length < 2) return;
    const key = `backfill:${challenge.id}:${myParticipant.id}`;
    if (hasSeenNotice(key)) return;
    setToast(
      `미입력 주차가 ${myWeekly.missingWeeks.length}개 있어요. 채워두면 AI 조언이 더 정확해집니다.`
    );
    markNoticeSeen(key);
  }, [challenge, myParticipant, logsLoading, myWeekly.missingWeeks.length]);

  if (loading) {
    if (loadingElapsedMs < 300) {
      return (
        <Box sx={{ minHeight: '50vh', bgcolor: theme.palette.background.default }} aria-hidden />
      );
    }
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        <ChallengePageSkeleton disableAnimation={prefersReducedMotion} />
        {loadingElapsedMs >= 2000 && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ textAlign: 'center', px: 2, pb: 3 }}
            aria-live="polite"
          >
            대결 데이터 불러오는 중...
          </Typography>
        )}
      </Box>
    );
  }

  if (!challenge) {
    return (
      <Box sx={{ p: 3 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/')}>
          홈
        </Button>
        <Typography color="error" sx={{ mt: 2 }}>
          {error}
        </Typography>
      </Box>
    );
  }

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const endDateOnly = (challenge.end_date || '').split('T')[0].slice(0, 10);
  const isBeforeStartDate = challenge.start_date > today;
  // end_date가 없으면 안전하게 차단(모달 열지 않음).
  const isBeforeEndDate = !endDateOnly ? true : endDateOnly > today;
  const dday = getDDayDisplay(challenge.start_date, challenge.end_date);
  const shareUrl = `${window.location.origin}/c/${challenge.code}`;
  const allEndComplete = (() => {
    const withStart = participants.filter((p) => p.submissions.some((s) => s.type === 'start'));
    return (
      withStart.length > 0 && withStart.every((p) => p.submissions.some((s) => s.type === 'end'))
    );
  })();

  const openStartAuth = (p: ParticipantWithSubmissions) => {
    if (isBeforeStartDate) {
      setToast(`시작일(${challenge.start_date}) 이후에 인증을 권장하지만, 미리 제출도 가능합니다.`);
    }
    setSubmitTarget({ participantId: p.id, participantNickname: p.nickname, type: 'start' });
  };
  const openEndAuth = (p: ParticipantWithSubmissions) => {
    if (isBeforeEndDate && !DEBUG_ALLOW_EARLY_END_SUBMIT) setEarlyEndSnackbar(true);
    else setSubmitTarget({ participantId: p.id, participantNickname: p.nickname, type: 'end' });
  };

  const doToggleRanking = async (): Promise<boolean> => {
    const next = !(challenge.ranking_unlocked ?? false);
    try {
      const { error: err } = await supabase
        .from('challenges')
        .update({ ranking_unlocked: next })
        .eq('id', challenge.id);
      if (err) {
        setToast(`설정 실패: ${err.message}`);
        return false;
      }
      setChallenge({ ...challenge, ranking_unlocked: next });
      setToast(next ? '중간 순위가 공개되었습니다' : '순위가 다시 잠겼습니다');
      return true;
    } catch {
      setToast('순위 공개 설정 중 오류가 발생했습니다');
      return false;
    }
  };

  const handleUnlockRanking = () => {
    if (challenge.has_admin_pin) setPinAction('ranking');
    else void doToggleRanking();
  };
  const handleEditChallengeOpen = () => {
    if (challenge.has_admin_pin) setPinAction('editChallenge');
    else setEditOpen(true);
  };
  const handlePinConfirmed = async (): Promise<boolean> => {
    if (pinAction === 'ranking') return doToggleRanking();
    setEditOpen(true);
    return true;
  };

  const openWeeklyLog = (p: ParticipantWithSubmissions, weekNo?: number) =>
    setWeeklyLogTarget({ participant: p, defaultWeekNo: weekNo });

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: 4 }}>
      <Box sx={{ p: 2 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/')}>
          홈
        </Button>
      </Box>

      <ChallengeHeader
        challenge={challenge}
        dday={dday}
        onEditClick={handleEditChallengeOpen}
        onCopyShare={() =>
          navigator.clipboard.writeText(shareUrl).then(() => setCopySnackbar(true))
        }
      />

      {tab === 0 && (
        <ParticipantsTabHeader
          challenge={challenge}
          myParticipant={myParticipant}
          myLogs={myLogs}
          onAuthStart={openStartAuth}
          onAuthEnd={openEndAuth}
          onOpenWeeklyLog={(p, weekNo) => {
            setTab(2);
            openWeeklyLog(p, weekNo);
          }}
          onForget={forget}
          onRemember={remember}
          onJoined={(p) => setBasicInfo({ participant: p, afterJoin: true })}
          onRefetch={refetchParticipants}
        />
      )}

      <ChallengeTabs value={tab} onChange={setTab} />

      {tab === 0 && (
        <ParticipantsTab
          participants={participants}
          allEndComplete={allEndComplete}
          onAuthStart={openStartAuth}
          onAuthEnd={openEndAuth}
          onOpenBasicInfo={(p) => setBasicInfo({ participant: p, afterJoin: false })}
          onToast={setToast}
        />
      )}
      {tab === 1 && (
        <RankingTab
          ranking={ranking}
          participants={participants}
          challenge={challenge}
          shareUrl={shareUrl}
          onUnlockRanking={handleUnlockRanking}
          onToast={setToast}
        />
      )}
      {tab === 2 && (
        <WeeklyLogsTab
          challenge={challenge}
          participants={participants}
          logsByParticipant={logsByParticipant}
          recordStatus={recordStatus}
          myParticipant={myParticipant}
          onOpenLogForm={openWeeklyLog}
          onOpenBasicInfo={(p) => setBasicInfo({ participant: p, afterJoin: false })}
          onRefresh={refetchParticipants}
        />
      )}

      <ChallengeOverlays
        challenge={challenge}
        logsByParticipant={logsByParticipant}
        myParticipant={myParticipant}
        endDateOnly={endDateOnly}
        dday={dday}
        submitTarget={submitTarget}
        onCloseSubmit={() => setSubmitTarget(null)}
        onSubmitSuccess={() => {
          setSubmitTarget(null);
          refetchParticipants();
        }}
        basicInfo={basicInfo}
        onCloseBasicInfo={() => setBasicInfo(null)}
        onBasicInfoSuccess={refetchParticipants}
        weeklyLogTarget={weeklyLogTarget}
        onCloseWeeklyLog={() => setWeeklyLogTarget(null)}
        onWeeklyLogSuccess={() => {
          refetchParticipants();
          refetchLogs();
        }}
        copySnackbar={copySnackbar}
        onCloseCopy={() => setCopySnackbar(false)}
        earlyEndSnackbar={earlyEndSnackbar}
        onCloseEarlyEnd={() => setEarlyEndSnackbar(false)}
        toast={toast}
        onCloseToast={() => setToast(null)}
        pinAction={pinAction}
        onClosePin={() => setPinAction(null)}
        onPinConfirmed={handlePinConfirmed}
        editOpen={editOpen}
        onCloseEdit={() => setEditOpen(false)}
        onSavedEdit={(updated) => {
          setChallenge(updated);
          setToast('챌린지 정보가 수정되었습니다');
        }}
        endingSoonOpen={endingSoonOpen}
        onCloseEndingSoon={() => {
          dismissEndingSoonNotice(challenge.id);
          setEndingSoonOpen(false);
        }}
        onAuthEndMy={myParticipant ? () => openEndAuth(myParticipant) : undefined}
        weeklyLogsNoticeOpen={weeklyLogsNoticeOpen}
        onCloseWeeklyLogsNotice={() => {
          dismissWeeklyLogsUpgradeNotice();
          setWeeklyLogsNoticeOpen(false);
        }}
      />
    </Box>
  );
}
