import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { Challenge, ParticipantWithSubmissions, WeeklyLog } from '../types';
import type { useRecordStatus } from '../hooks/useRecordStatus';
import AllParticipantsChart from './AllParticipantsChart';
import RecordStatusSummary from './RecordStatusSummary';
import ParticipantWeeklyLogCard from './ParticipantWeeklyLogCard';
import GoalProgressWidget from './GoalProgressWidget';

interface WeeklyLogsTabProps {
  challenge: Challenge;
  participants: ParticipantWithSubmissions[];
  logsByParticipant: Record<string, WeeklyLog[]>;
  recordStatus: ReturnType<typeof useRecordStatus>;
  /** 이 디바이스에서 식별된 "나" — 목표 진행률 위젯 표시 대상. */
  myParticipant: ParticipantWithSubmissions | null;
  onOpenLogForm: (p: ParticipantWithSubmissions, weekNo?: number) => void;
  onOpenBasicInfo: (p: ParticipantWithSubmissions) => void;
  onRefresh: () => void;
}

/**
 * Sprint 3 Phase B — ChallengePage Tab 2 (주간 기록).
 * 목표 진행률 + 입력 현황 요약 + 전체 추이 차트 + 참가자별 기록 카드.
 */
export default function WeeklyLogsTab({
  challenge,
  participants,
  logsByParticipant,
  recordStatus,
  myParticipant,
  onOpenLogForm,
  onOpenBasicInfo,
  onRefresh,
}: WeeklyLogsTabProps) {
  return (
    <Box sx={{ px: 2, pt: 2 }}>
      <Box
        sx={{
          mb: 2,
          p: 2,
          bgcolor: 'primary.50',
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'primary.200',
        }}
      >
        <Typography variant="body2" color="primary.dark" fontWeight={500}>
          대결방 참가자 누구나 서로의 기록을 입력·확인할 수 있습니다.
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
          개인 락 없음 · 공동 입력 · 공동 확인
        </Typography>
      </Box>
      {/* Sprint 2: 목표 진행률 위젯 — 식별된 "나" 에 대해 상단 고정 */}
      {myParticipant && (
        <GoalProgressWidget
          participant={myParticipant}
          logs={logsByParticipant[myParticipant.id] || []}
          onOpenBasicInfo={() => onOpenBasicInfo(myParticipant)}
        />
      )}
      <RecordStatusSummary
        currentWeek={recordStatus.currentWeek}
        completedCount={recordStatus.completedCount}
        notCompletedCount={recordStatus.notCompletedCount}
        notCompleted={recordStatus.notCompleted}
        cumulativeFillRate={recordStatus.cumulativeFillRate}
        totalFilledCells={recordStatus.totalFilledCells}
        totalPossibleCells={recordStatus.totalPossibleCells}
      />
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        전체 참가자 추이
      </Typography>
      <AllParticipantsChart participants={participants} logsByParticipant={logsByParticipant} />
      <Typography variant="subtitle2" sx={{ mt: 3, mb: 1 }}>
        참가자별 상세
      </Typography>
      {participants.map((p) => (
        <ParticipantWeeklyLogCard
          key={p.id}
          participant={p}
          challengeStartDate={challenge.start_date}
          challengeEndDate={challenge.end_date}
          logs={logsByParticipant[p.id] || []}
          onOpenLogForm={(weekNo) => onOpenLogForm(p, weekNo)}
          onOpenBasicInfo={() => onOpenBasicInfo(p)}
          onRefresh={onRefresh}
        />
      ))}
      {participants.length === 0 && (
        <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
          아직 참가자가 없습니다. 위에서 닉네임을 입력해 참가하세요.
        </Typography>
      )}
    </Box>
  );
}
