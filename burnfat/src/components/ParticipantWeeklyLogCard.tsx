import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import AddIcon from '@mui/icons-material/Add';
import EditCalendarIcon from '@mui/icons-material/EditCalendar';
import type { ParticipantWithSubmissions } from '../types';
import type { WeeklyLog } from '../types';
import WeeklyLogChart from './WeeklyLogChart';
import AIAdviceCard from './AIAdviceCard';
import { formatRelativeTime } from '../lib/formatRelativeTime';
import {
  useNextRecordableWeek,
  getCtaLabel,
  isCtaActionable,
} from '../hooks/useNextRecordableWeek';

interface Props {
  participant: ParticipantWithSubmissions;
  challengeStartDate: string;
  challengeEndDate: string;
  logs: WeeklyLog[];
  /**
   * Sprint 1.5: 인자 없이 호출하면 hook 이 제안하는 주차로 폼이 열린다.
   * `weekNo` 를 명시하면 그 주차로 폼을 연다 (미입력 주차 placeholder 클릭 시).
   */
  onOpenLogForm: (weekNo?: number) => void;
  onOpenBasicInfo: () => void;
  onRefresh: () => void;
}

export default function ParticipantWeeklyLogCard({
  participant,
  challengeStartDate,
  challengeEndDate,
  logs,
  onOpenLogForm,
  onOpenBasicInfo,
  onRefresh: _onRefresh,
}: Props) {
  const next = useNextRecordableWeek(logs, challengeStartDate, challengeEndDate);
  const ctaLabel = getCtaLabel(next);
  const ctaActionable = isCtaActionable(next);

  // 상태별 CTA 컬러
  const ctaColor: 'primary' | 'warning' | 'inherit' =
    next.status === 'ready'
      ? 'primary'
      : next.status === 'caught_up'
        ? 'warning'
        : 'inherit';

  const ctaTooltip = (() => {
    switch (next.status) {
      case 'before_start':
        return '챌린지 시작일 이후 입력할 수 있습니다.';
      case 'after_end':
        return '챌린지 종료 후에는 새 기록을 추가할 수 없습니다.';
      case 'already_done_this_week':
        return '이번 주 기록은 이미 완료했습니다. 다음 주에 다시 와주세요.';
      case 'ready':
      case 'caught_up':
        return '';
    }
  })();

  const ctaButton = (
    <Button
      size="small"
      variant={ctaActionable ? 'contained' : 'outlined'}
      color={ctaColor}
      startIcon={<AddIcon sx={{ fontSize: 16 }} />}
      onClick={() => onOpenLogForm(next.suggestedWeekNo ?? undefined)}
      disabled={!ctaActionable}
      sx={{ minHeight: 36, fontSize: '0.8125rem', py: 0.5, px: 1.5 }}
      aria-label={ctaLabel}
    >
      {ctaLabel}
    </Button>
  );

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, mb: 2 }}>
          <Typography fontWeight={600} sx={{ flex: '1 1 auto', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {participant.nickname}
          </Typography>
          {ctaTooltip ? <Tooltip title={ctaTooltip}><span>{ctaButton}</span></Tooltip> : ctaButton}
        </Box>
        {logs.length === 0 ? (
          <Box
            sx={{
              py: 4,
              px: 2,
              textAlign: 'center',
              bgcolor: 'grey.50',
              borderRadius: 2,
              border: '1px dashed',
              borderColor: 'grey.300',
            }}
          >
            <Typography color="text.secondary" variant="body2">
              아직 주간 기록이 없습니다.
            </Typography>
            <Typography color="text.disabled" variant="caption" sx={{ display: 'block', mt: 0.5 }}>
              {ctaActionable
                ? '위 버튼으로 첫 주차 기록을 시작해보세요.'
                : ctaTooltip || '챌린지 진행 중에 입력할 수 있습니다.'}
            </Typography>
          </Box>
        ) : (
          <WeeklyLogChart
            logs={logs}
            participant={participant}
            startBodyFat={participant.submissions.find((s) => s.type === 'start')?.body_fat_rate}
          />
        )}
        {logs.length > 0 && (
          <Box sx={{ mt: 2 }}>
            {logs.map((l) => {
              const dietLabel: Record<string, string> = { normal: '식단 정상', overeat: '식단 과식', undereat: '식단 절식' };
              const lifestyle = [
                l.exercise_count != null && `운동 ${l.exercise_count}회`,
                l.sleep_hours != null && `수면 ${l.sleep_hours}h`,
                l.diet_quality && dietLabel[l.diet_quality],
              ].filter(Boolean).join(' · ');
              return (
                <Box key={l.id} sx={{ py: 0.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      {l.week_no}주차: 체지방 <strong>{l.body_fat_rate != null ? `${l.body_fat_rate}%` : '-'}</strong>
                      {l.weight_kg != null && ` · ${l.weight_kg}kg`}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatRelativeTime(l.updated_at || l.created_at)}
                    </Typography>
                  </Box>
                  {lifestyle && (
                    <Typography variant="caption" color="text.disabled" sx={{ pl: 0.5 }}>
                      {lifestyle}
                    </Typography>
                  )}
                </Box>
              );
            })}
            {/* Sprint 1.5: 미입력 주차 placeholder — 챌린지 진행 중일 때만 노출 */}
            {(next.status === 'ready' || next.status === 'caught_up') &&
              next.missingWeeks.map((week) => (
                <Box
                  key={`missing-${week}`}
                  sx={{
                    mt: 1,
                    py: 1,
                    px: 1.5,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 1,
                    bgcolor: 'warning.50',
                    border: '1px dashed',
                    borderColor: 'warning.200',
                    borderRadius: 1,
                  }}
                >
                  <Typography variant="body2" color="warning.dark" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <EditCalendarIcon sx={{ fontSize: 16 }} aria-hidden />
                    {week}주차 · 미입력
                  </Typography>
                  <Button
                    size="small"
                    variant="text"
                    color="warning"
                    onClick={() => onOpenLogForm(week)}
                    sx={{ minHeight: 32, fontSize: '0.75rem' }}
                    aria-label={`${week}주차 입력하기`}
                  >
                    입력하기
                  </Button>
                </Box>
              ))}
          </Box>
        )}
        <Box sx={{ mt: 2 }}>
          <AIAdviceCard
            participant={participant}
            logs={logs}
            challengeStartDate={challengeStartDate}
            onOpenBasicInfo={onOpenBasicInfo}
            onOpenLogForm={() => onOpenLogForm()}
          />
        </Box>
      </CardContent>
    </Card>
  );
}
