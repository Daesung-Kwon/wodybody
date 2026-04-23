import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ScheduleIcon from '@mui/icons-material/Schedule';
import type { ParticipantWithSubmissions } from '../types';

interface Props {
  currentWeek: number;
  completedCount: number;
  notCompletedCount: number;
  notCompleted: ParticipantWithSubmissions[];
}

export default function RecordStatusSummary({
  currentWeek,
  completedCount,
  notCompletedCount,
  notCompleted,
}: Props) {
  const total = completedCount + notCompletedCount;
  if (total === 0) return null;

  return (
    <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        이번 주({currentWeek}주차) 기록 현황
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center', mb: notCompleted.length > 0 ? 1.5 : 0 }}>
        <Chip
          icon={<CheckCircleIcon />}
          label={`${completedCount}명 기록 완료`}
          color="success"
          size="small"
          variant="outlined"
          sx={{ minHeight: 32 }}
        />
        <Chip
          icon={<ScheduleIcon />}
          label={`${notCompletedCount}명 미기록`}
          color="default"
          size="small"
          variant="outlined"
          sx={{ minHeight: 32 }}
        />
      </Box>
      {notCompleted.length > 0 && (
        <Box sx={{ mt: 1, p: 1.5, bgcolor: 'warning.50', borderRadius: 1 }}>
          <Typography variant="body2" color="warning.dark" fontWeight={500}>
            이번 주 기록 부탁해요!
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            {notCompleted.map((p) => p.nickname).join(', ')} — 친구가 대신 입력해도 됩니다.
          </Typography>
        </Box>
      )}
    </Box>
  );
}
