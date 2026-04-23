import { useState } from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
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
import type { WeeklyLog, Participant } from '../types';

interface ChartPoint {
  week: string;
  weekNo: number;
  bodyFat: number | null;
  weight: number | null;
}

interface Props {
  logs: WeeklyLog[];
  participant: Participant;
  /** 시작일 인증(submission)의 체지방률 — 그래프 기준점(시작)으로 표시 */
  startBodyFat?: number;
}

export default function WeeklyLogChart({ logs, participant, startBodyFat }: Props) {
  const [metric, setMetric] = useState<'bodyFat' | 'weight'>('bodyFat');

  const weekData: ChartPoint[] = logs
    .filter((l) => l.body_fat_rate != null || l.weight_kg != null)
    .map((l) => ({
      week: `${l.week_no}주`,
      weekNo: l.week_no,
      bodyFat: l.body_fat_rate != null ? Number(l.body_fat_rate) : null,
      weight: l.weight_kg != null ? Number(l.weight_kg) : null,
    }))
    .sort((a, b) => a.weekNo - b.weekNo);

  // 시작일 인증값을 "시작" 기준점으로 prepend
  const startPoint: ChartPoint | null =
    startBodyFat != null
      ? { week: '시작', weekNo: -1, bodyFat: startBodyFat, weight: null }
      : null;

  const data: ChartPoint[] = startPoint ? [startPoint, ...weekData] : weekData;

  const hasWeight = weekData.some((d) => d.weight != null);
  const hasBodyFat = data.some((d) => d.bodyFat != null);

  if (data.length === 0) {
    return (
      <Box sx={{ py: 8, textAlign: 'center' }}>
        <Typography color="text.secondary">아직 주간 기록이 없습니다.</Typography>
      </Box>
    );
  }

  const isWeight = metric === 'weight';
  const yUnit = isWeight ? 'kg' : '%';
  const lineColor = isWeight ? '#2563eb' : '#16a34a';
  const targetBodyFat = participant.target_body_fat;

  return (
    <Box>
      {hasWeight && hasBodyFat && (
        <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
          <Chip
            size="small"
            label="체지방"
            onClick={() => setMetric('bodyFat')}
            color={metric === 'bodyFat' ? 'primary' : 'default'}
            variant={metric === 'bodyFat' ? 'filled' : 'outlined'}
          />
          <Chip
            size="small"
            label="몸무게"
            onClick={() => setMetric('weight')}
            color={metric === 'weight' ? 'primary' : 'default'}
            variant={metric === 'weight' ? 'filled' : 'outlined'}
          />
        </Box>
      )}
      <Box sx={{ width: '100%', height: 240 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="week" tick={{ fontSize: 12 }} />
            <YAxis
              domain={['auto', 'auto']}
              tickFormatter={(v: number) => `${Number(v).toFixed(1)}${yUnit}`}
              tick={{ fontSize: 11 }}
              width={isWeight ? 58 : 52}
            />
            <Tooltip
              formatter={(value: number | undefined) =>
                value != null ? [`${value}${yUnit}`, isWeight ? '몸무게' : '체지방률'] : null
              }
              labelFormatter={(label) => label}
            />
            {!isWeight && targetBodyFat != null && (
              <ReferenceLine
                y={targetBodyFat}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                label={{ value: `목표 ${targetBodyFat}%`, position: 'right', fontSize: 11 }}
              />
            )}
            <Line
              type="monotone"
              dataKey={isWeight ? 'weight' : 'bodyFat'}
              stroke={lineColor}
              strokeWidth={2}
              dot={{ r: 4, fill: lineColor }}
              name={isWeight ? '몸무게' : '체지방률'}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  );
}
