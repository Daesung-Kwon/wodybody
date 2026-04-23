import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { WeeklyLog } from '../types';
import type { Participant } from '../types';

interface Props {
  logs: WeeklyLog[];
  participant: Participant;
}

export default function WeeklyLogChart({ logs, participant }: Props) {
  const data = logs
    .filter((l) => l.body_fat_rate != null)
    .map((l) => ({
      week: `${l.week_no}주`,
      weekNo: l.week_no,
      bodyFat: Number(l.body_fat_rate),
    }))
    .sort((a, b) => a.weekNo - b.weekNo);

  const targetBodyFat = participant.target_body_fat;

  if (data.length === 0) {
    return (
      <Box sx={{ py: 8, textAlign: 'center' }}>
        <Typography color="text.secondary">아직 주간 기록이 없습니다.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', height: 240 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="week" tick={{ fontSize: 12 }} />
          <YAxis
            domain={['auto', 'auto']}
            tickFormatter={(v) => `${v}%`}
            tick={{ fontSize: 12 }}
            width={36}
          />
          <Tooltip
            formatter={(value: number | undefined) => (value != null ? [`${value}%`, '체지방률'] : null)}
            labelFormatter={(label) => label}
          />
          {targetBodyFat != null && (
            <ReferenceLine
              y={targetBodyFat}
              stroke="#f59e0b"
              strokeDasharray="4 4"
              label={{ value: `목표 ${targetBodyFat}%`, position: 'right', fontSize: 11 }}
            />
          )}
          <Line
            type="monotone"
            dataKey="bodyFat"
            stroke="#16a34a"
            strokeWidth={2}
            dot={{ r: 4, fill: '#16a34a' }}
            name="체지방률"
          />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
}
