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
  onRefresh: () => void;
}

export default function ParticipantWeeklyLogCard({
  participant,
  logs,
  onOpenLogForm,
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
        <WeeklyLogChart logs={logs} participant={participant} />
        {logs.length > 0 && (
          <Box sx={{ mt: 2 }}>
            {logs.map((l) => (
              <Box key={l.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.5 }}>
                <Typography variant="body2" color="text.secondary">
                  {l.week_no}주차: 체지방 <strong>{l.body_fat_rate != null ? `${l.body_fat_rate}%` : '-'}</strong>
                  {l.weight_kg != null && ` · ${l.weight_kg}kg`}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatRelativeTime(l.updated_at || l.created_at)}
                </Typography>
              </Box>
            ))}
          </Box>
        )}
        <Box sx={{ mt: 2 }}>
          <AIAdviceCard participantId={participant.id} participantNickname={participant.nickname} />
        </Box>
      </CardContent>
    </Card>
  );
}
