import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import type { ParticipantWithSubmissions } from '../types';
import type { WeeklyLog } from '../types';
import WeeklyLogChart from './WeeklyLogChart';
import AIAdviceCard from './AIAdviceCard';
import { formatRelativeTime } from '../lib/formatRelativeTime';

interface Props {
  participant: ParticipantWithSubmissions;
  challengeStartDate: string;
  challengeEndDate: string;
  logs: WeeklyLog[];
  onOpenLogForm: () => void;
  onOpenBasicInfo: () => void;
  onRefresh: () => void;
}

export default function ParticipantWeeklyLogCard({
  participant,
  logs,
  onOpenLogForm,
  onOpenBasicInfo,
  onRefresh: _onRefresh,
}: Props) {
  return (
    <Card sx={{ mb: 2 }}>
      <CardContent sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography fontWeight={600}>{participant.nickname}</Typography>
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddIcon sx={{ fontSize: 16 }} />}
            onClick={onOpenLogForm}
            sx={{ minHeight: 44, py: 0.75, px: 1.5, fontSize: '0.8125rem' }}
          >
            {participant.nickname}님 주간 기록 입력
          </Button>
        </Box>
        <WeeklyLogChart
          logs={logs}
          participant={participant}
          startBodyFat={participant.submissions.find((s) => s.type === 'start')?.body_fat_rate}
        />
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
          </Box>
        )}
        <Box sx={{ mt: 2 }}>
          <AIAdviceCard
            participant={participant}
            logs={logs}
            onOpenBasicInfo={onOpenBasicInfo}
            onOpenLogForm={onOpenLogForm}
          />
        </Box>
      </CardContent>
    </Card>
  );
}
