import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import PersonIcon from '@mui/icons-material/Person';
import AddIcon from '@mui/icons-material/Add';
import type { ParticipantWithSubmissions, WeeklyLog } from '../types';
import { useNextRecordableWeek } from '../hooks/useNextRecordableWeek';

interface Props {
  participant: ParticipantWithSubmissions;
  logs: WeeklyLog[];
  challengeStartDate: string;
  challengeEndDate: string;
  onAuthStart: () => void;
  onAuthEnd: () => void;
  onOpenWeeklyLog: (weekNo?: number) => void;
  /** "내가 아니에요" — 식별 해제. */
  onForget: () => void;
}

interface StatusRowProps {
  label: string;
  done: boolean;
  /** 미완료 시 노출할 액션 버튼 라벨. 없으면 버튼 미노출. */
  actionLabel?: string;
  onAction?: () => void;
}

/** 상태 한 줄 — 색상 단독이 아닌 아이콘 + "완료/미완료" 텍스트 병행 (a11y). */
function StatusRow({ label, done, actionLabel, onAction }: StatusRowProps) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}>
      {done ? (
        <CheckCircleIcon sx={{ fontSize: 20, color: 'success.main' }} aria-hidden />
      ) : (
        <RadioButtonUncheckedIcon sx={{ fontSize: 20, color: 'text.disabled' }} aria-hidden />
      )}
      <Typography variant="body2" sx={{ flex: '1 1 auto', minWidth: 0 }}>
        {label}{' '}
        <Box
          component="span"
          sx={{ fontWeight: 600, color: done ? 'success.main' : 'text.secondary' }}
        >
          {done ? '완료' : '미완료'}
        </Box>
      </Typography>
      {!done && actionLabel && onAction && (
        <Button
          size="small"
          variant="outlined"
          onClick={onAction}
          sx={{ minHeight: 36, fontSize: '0.75rem', py: 0.25, px: 1.25, flexShrink: 0 }}
        >
          {actionLabel}
        </Button>
      )}
    </Box>
  );
}

/**
 * Sprint 1 — 개인 상태 카드.
 * 이 디바이스에서 식별된 "나" 의 시작/종료 인증·이번 주 기록 상태를 한눈에 보여 주고,
 * 미완료 항목에 바로 액션 버튼을 노출해 재방문 사용자의 다음 행동을 유도한다.
 */
export default function MyStatusCard({
  participant,
  logs,
  challengeStartDate,
  challengeEndDate,
  onAuthStart,
  onAuthEnd,
  onOpenWeeklyLog,
  onForget,
}: Props) {
  const hasStart = participant.submissions.some((s) => s.type === 'start');
  const hasEnd = participant.submissions.some((s) => s.type === 'end');
  const next = useNextRecordableWeek(logs, challengeStartDate, challengeEndDate);
  // 이번 주 기록 완료 여부 — 'ready' 면 이번 주 미입력, 그 외(caught_up/already_done)는 완료.
  const thisWeekDone = next.status !== 'ready';
  const weekLabel =
    next.status === 'ready' && next.suggestedWeekNo != null
      ? `${next.suggestedWeekNo}주차 기록 입력`
      : '주간 기록 입력';

  return (
    <Card sx={{ mx: 2, mb: 2, border: '1px solid', borderColor: 'primary.200', bgcolor: 'primary.50' }}>
      <CardContent sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <PersonIcon sx={{ fontSize: 20, color: 'primary.main' }} aria-hidden />
          <Typography variant="subtitle2" color="primary.dark" sx={{ flex: '1 1 auto', minWidth: 0 }}>
            <Box component="span" fontWeight={700}>
              {participant.nickname}
            </Box>
            님으로 참여 중
          </Typography>
          <Chip
            size="small"
            label="이 기기에서 식별됨"
            variant="outlined"
            sx={{ height: 22, fontSize: '0.6875rem' }}
          />
        </Box>

        <Box sx={{ bgcolor: 'background.paper', borderRadius: 1.5, px: 1.5, py: 0.5, mb: 1 }}>
          <StatusRow
            label="시작 인증"
            done={hasStart}
            actionLabel="시작일 인증"
            onAction={onAuthStart}
          />
          <StatusRow
            label="종료 인증"
            done={hasEnd}
            actionLabel="종료일 인증"
            onAction={onAuthEnd}
          />
          <StatusRow
            label="이번 주 기록"
            done={thisWeekDone}
            actionLabel={weekLabel}
            onAction={() => onOpenWeeklyLog(next.suggestedWeekNo ?? undefined)}
          />
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
          <Button
            size="small"
            variant="text"
            color="inherit"
            onClick={onForget}
            sx={{ fontSize: '0.75rem', color: 'text.secondary' }}
          >
            내가 아니에요
          </Button>
          {!hasStart && (
            <Button
              size="small"
              variant="contained"
              startIcon={<AddIcon sx={{ fontSize: 16 }} />}
              onClick={onAuthStart}
              sx={{ minHeight: 36 }}
            >
              지금 시작 인증하기
            </Button>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
