import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import FlagIcon from '@mui/icons-material/Flag';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import type { ParticipantWithSubmissions, WeeklyLog } from '../types';
import { computeGoalProgress } from '../lib/goalProgress';

interface Props {
  participant: ParticipantWithSubmissions;
  logs: WeeklyLog[];
  onOpenBasicInfo: () => void;
}

interface StatProps {
  label: string;
  value: number | null;
  emphasize?: boolean;
}

function Stat({ label, value, emphasize }: StatProps) {
  return (
    <Box sx={{ textAlign: 'center', flex: 1 }}>
      <Typography variant="caption" color="text.secondary" display="block">
        {label}
      </Typography>
      <Typography variant="subtitle1" fontWeight={emphasize ? 800 : 600} color={emphasize ? 'primary.main' : 'text.primary'}>
        {value != null ? `${value}%` : '-'}
      </Typography>
    </Box>
  );
}

/**
 * Sprint 2 — 목표 체지방률 진행률 위젯.
 * 시작 인증값 → 최신 주간 기록 → 목표값의 3점으로 진행률 게이지를 그린다.
 * 식별된 "나" 에 대해 주간 기록 탭 상단에 고정 노출.
 */
export default function GoalProgressWidget({ participant, logs, onOpenBasicInfo }: Props) {
  const startBodyFat = participant.submissions.find((s) => s.type === 'start')?.body_fat_rate ?? null;
  const endBodyFat = participant.submissions.find((s) => s.type === 'end')?.body_fat_rate ?? null;
  // 현재값 — 최신 주간 기록 우선, 없으면 종료 인증값.
  const latestLog = [...logs]
    .filter((l) => l.body_fat_rate != null)
    .sort((a, b) => b.week_no - a.week_no)[0];
  const currentBodyFat = latestLog?.body_fat_rate ?? endBodyFat ?? null;
  const target = participant.target_body_fat;

  const progress = computeGoalProgress(startBodyFat, currentBodyFat, target);

  // 빈 상태 — 목표 미설정
  if (!progress.hasGoal) {
    return (
      <Card sx={{ mb: 2, border: '1px dashed', borderColor: 'grey.300' }}>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <FlagIcon sx={{ fontSize: 20, color: 'text.disabled' }} aria-hidden />
            <Typography variant="subtitle2" color="text.secondary">
              목표 진행률
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {startBodyFat == null
              ? '시작 인증과 목표 체지방률을 설정하면 진행률을 볼 수 있어요.'
              : '목표 체지방률을 설정하면 시작값 대비 진행률을 볼 수 있어요.'}
          </Typography>
          <Button size="small" variant="outlined" onClick={onOpenBasicInfo}>
            목표 체지방률 설정
          </Button>
        </CardContent>
      </Card>
    );
  }

  const noCurrent = progress.currentBodyFat == null;

  return (
    <Card sx={{ mb: 2, border: '1px solid', borderColor: progress.reached ? 'success.200' : 'primary.200', bgcolor: progress.reached ? 'success.50' : 'primary.50' }}>
      <CardContent sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          {progress.reached ? (
            <EmojiEventsIcon sx={{ fontSize: 20, color: 'success.main' }} aria-hidden />
          ) : (
            <FlagIcon sx={{ fontSize: 20, color: 'primary.main' }} aria-hidden />
          )}
          <Typography variant="subtitle2" color={progress.reached ? 'success.dark' : 'primary.dark'} sx={{ flex: 1 }}>
            {participant.nickname}님 목표 진행률
          </Typography>
          <Typography variant="subtitle2" fontWeight={800} color={progress.reached ? 'success.main' : 'primary.main'}>
            {progress.progressPct}%
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
          <Stat label="시작" value={progress.startBodyFat} />
          <Stat label="현재" value={progress.currentBodyFat} emphasize />
          <Stat label="목표" value={progress.targetBodyFat} />
        </Box>

        <LinearProgress
          variant="determinate"
          value={progress.progressPct}
          color={progress.reached ? 'success' : 'primary'}
          aria-label="목표 진행률"
          aria-valuenow={progress.progressPct}
          aria-valuemin={0}
          aria-valuemax={100}
          sx={{ height: 10, borderRadius: 5, mb: 1 }}
        />

        {progress.reached ? (
          <Typography variant="body2" color="success.dark" fontWeight={600}>
            🎉 목표 체지방률을 달성했어요!
          </Typography>
        ) : noCurrent ? (
          <Typography variant="caption" color="text.secondary">
            아직 현재 기록이 없어요. 주간 기록을 입력하면 진행률이 채워집니다.
          </Typography>
        ) : (
          <Typography variant="body2" color="text.secondary">
            목표까지 <strong>{progress.remainingToTarget}%p</strong> 남았어요
            {progress.deltaFromStart != null && progress.deltaFromStart < 0
              ? ` · 시작 대비 ${Math.abs(progress.deltaFromStart)}%p 감량`
              : ''}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
