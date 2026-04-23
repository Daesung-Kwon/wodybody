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
  Legend,
} from 'recharts';
import type { ParticipantWithSubmissions } from '../types';
import type { WeeklyLog } from '../types';

export const CHART_COLORS = [
  '#16a34a',
  '#2563eb',
  '#7c3aed',
  '#db2777',
  '#ea580c',
  '#0891b2',
  '#059669',
  '#ca8a04',
];

interface Props {
  participants: ParticipantWithSubmissions[];
  logsByParticipant: Record<string, WeeklyLog[]>;
}

export default function AllParticipantsChart({ participants, logsByParticipant }: Props) {
  const allWeeks = new Set<number>();
  for (const logs of Object.values(logsByParticipant)) {
    for (const l of logs) {
      if (l.body_fat_rate != null) allWeeks.add(l.week_no);
    }
  }
  const weekList = Array.from(allWeeks).sort((a, b) => a - b);

  const data = weekList.map((weekNo) => {
    const point: Record<string, string | number> = { week: `${weekNo}주`, weekNo };
    participants.forEach((p) => {
      const logs = logsByParticipant[p.id] || [];
      const log = logs.find((l) => l.week_no === weekNo);
      if (log?.body_fat_rate != null) {
        point[p.nickname] = Number(log.body_fat_rate);
      }
    });
    return point;
  });

  const hasData = data.some((d) => {
    return participants.some((p) => d[p.nickname] != null);
  });

  if (!hasData || data.length === 0) {
    return (
      <Box sx={{ py: 8, textAlign: 'center' }}>
        <Typography color="text.secondary">참가자들의 주간 기록이 없습니다.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', height: 280 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="week" tick={{ fontSize: 12 }} />
          <YAxis
            domain={['auto', 'auto']}
            tickFormatter={(v: number) => `${Number(v).toFixed(1)}%`}
            tick={{ fontSize: 11 }}
            width={52}
          />
          <Tooltip
            formatter={(value: number | undefined) => (value != null ? [`${value}%`, '체지방률'] : null)}
            labelFormatter={(label) => label}
          />
          <Legend />
          {participants.map((p, idx) => (
            <Line
              key={p.id}
              type="monotone"
              dataKey={p.nickname}
              stroke={CHART_COLORS[idx % CHART_COLORS.length]}
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
}
