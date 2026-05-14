import { useState, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Box from '@mui/material/Box';
import { supabase } from '../lib/supabase';
import type { Participant, Gender, DietQuality } from '../types';
import { getWeekNoForDate } from '../lib/weekUtils';
import { prepareDeviceSecret } from '../lib/deviceSecret';

interface Props {
  open: boolean;
  participant: Participant | null;
  challengeStartDate: string;
  challengeEndDate: string;
  existingWeekNos: number[];
  /**
   * Sprint 1.5: 폼 진입 시 기본 선택할 주차.
   * 우선순위: ① defaultWeekNo → ② existingWeekNos 에 빠진 가장 이른 주차 → ③ 오늘 기준 주차.
   */
  defaultWeekNo?: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function WeeklyLogForm({
  open,
  participant,
  challengeStartDate,
  challengeEndDate,
  existingWeekNos,
  defaultWeekNo,
  onClose,
  onSuccess,
}: Props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const today = new Date().toISOString().slice(0, 10);

  // Sprint 1.5: 초기 주차 결정 — defaultWeekNo > 가장 이른 미입력 주차 > 오늘 기준
  const initialWeekNo = (() => {
    if (defaultWeekNo != null) return defaultWeekNo;
    const todayWeek = getWeekNoForDate(challengeStartDate, today);
    // 1..todayWeek 중 existingWeekNos 에 없는 가장 이른 주차
    for (let w = 1; w <= todayWeek; w += 1) {
      if (!existingWeekNos.includes(w)) return w;
    }
    return todayWeek;
  })();

  const [weekNo, setWeekNo] = useState(initialWeekNo);
  const [recordedAt, setRecordedAt] = useState(today);
  const [age, setAge] = useState<string>('');
  const [gender, setGender] = useState<Gender | ''>('');
  const [weightKg, setWeightKg] = useState<string>('');
  const [heightCm, setHeightCm] = useState<string>('');
  const [bodyFatRate, setBodyFatRate] = useState<string>('');
  // 라이프스타일 필드
  const [exerciseCount, setExerciseCount] = useState<string>('');
  const [sleepHours, setSleepHours] = useState<string>('');
  const [dietQuality, setDietQuality] = useState<DietQuality | ''>('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (participant) {
      setAge(participant.age != null ? String(participant.age) : '');
      setGender(participant.gender || '');
      setHeightCm(participant.height_cm != null ? String(participant.height_cm) : '');
    }
  }, [participant]);

  // Sprint 1.5: 기존에는 useEffect 가 recordedAt 변경마다 weekNo 를 덮어써,
  // defaultWeekNo 를 받아도 마운트 직후 초기 useEffect 실행으로 초기값이 무시되는 문제가 있었다.
  // 날짜와 주차의 연결은 onChange 핸들러로 이동하여 마운트 시 defaultWeekNo 가 보존되도록 한다.
  const handleRecordedAtChange = (next: string) => {
    setRecordedAt(next);
    const derivedWeek = getWeekNoForDate(challengeStartDate, next);
    if (!existingWeekNos.includes(derivedWeek)) {
      setWeekNo(derivedWeek);
    }
  };

  const totalWeeks = Math.ceil(
    (new Date(challengeEndDate).getTime() - new Date(challengeStartDate).getTime()) / (7 * 24 * 60 * 60 * 1000)
  );
  const weekOptions = Array.from({ length: totalWeeks }, (_, i) => i + 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!participant) return;
    const rate = parseFloat(bodyFatRate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      setError('체지방률은 0~100 사이로 입력하세요.');
      return;
    }
    if (existingWeekNos.includes(weekNo)) {
      setError(`이미 ${weekNo}주차 기록이 있습니다. 수정하려면 기존 기록을 찾아 수정하세요.`);
      return;
    }
    const parsedSleepHours = sleepHours.trim() ? parseFloat(sleepHours) : null;
    if (parsedSleepHours !== null && (parsedSleepHours < 0 || parsedSleepHours > 24)) {
      setError('수면 시간은 0~24 사이로 입력하세요.');
      return;
    }
    setLoading(true);
    setError('');

    // Sprint 0.2: 본인 디바이스만 24h 내 수정할 수 있도록 device_secret 발급
    const secret = await prepareDeviceSecret('weekly_logs');

    const { data: inserted, error: err } = await supabase
      .from('weekly_logs')
      .insert({
        participant_id: participant.id,
        week_no: weekNo,
        recorded_at: recordedAt,
        age: age.trim() ? parseInt(age, 10) : null,
        gender: gender || null,
        weight_kg: weightKg.trim() ? parseFloat(weightKg) : null,
        height_cm: heightCm.trim() ? parseFloat(heightCm) : null,
        body_fat_rate: Math.round(rate * 100) / 100,
        exercise_count: exerciseCount !== '' ? parseInt(exerciseCount, 10) : null,
        sleep_hours: parsedSleepHours,
        diet_quality: dietQuality || null,
        note: note.trim() || null,
        device_secret_hash: secret.hash,
      })
      .select()
      .single();

    setLoading(false);
    if (err) {
      setError(err.message.includes('unique') ? '이미 해당 주차 기록이 있습니다.' : err.message);
      return;
    }
    if (inserted?.id) {
      secret.persist(inserted.id);
    }
    onSuccess();
    onClose();
  };

  if (!participant) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth fullScreen={isMobile}>
      <DialogTitle>{participant.nickname}님 주간 기록 입력</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            대결방 참가자 누구나 서로의 기록을 입력·확인할 수 있습니다.
          </Typography>
          <TextField
            fullWidth
            label="기록일"
            type="date"
            value={recordedAt}
            onChange={(e) => handleRecordedAtChange(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <FormControl fullWidth>
            <InputLabel>주차</InputLabel>
            <Select value={weekNo} label="주차" onChange={(e) => setWeekNo(e.target.value as number)}>
              {weekOptions.map((w) => {
                const isLocked = existingWeekNos.includes(w);
                return (
                  <MenuItem key={w} value={w} disabled={isLocked}>
                    {w}주차{isLocked ? ' (입력됨)' : ''}
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="체지방률 (%)"
            type="number"
            inputProps={{ min: 0, max: 100, step: 0.1, inputMode: 'decimal' }}
            value={bodyFatRate}
            onChange={(e) => setBodyFatRate(e.target.value)}
            required
          />
          <TextField
            fullWidth
            label="몸무게 (kg)"
            type="number"
            inputProps={{ min: 30, max: 200, step: 0.1, inputMode: 'decimal' }}
            value={weightKg}
            onChange={(e) => setWeightKg(e.target.value)}
          />
          <TextField fullWidth label="나이" type="number" inputProps={{ min: 10, max: 100, inputMode: 'numeric' }} value={age} onChange={(e) => setAge(e.target.value)} />
          <FormControl fullWidth>
            <InputLabel>성별</InputLabel>
            <Select value={gender} label="성별" onChange={(e) => setGender(e.target.value as Gender | '')}>
              <MenuItem value="">선택 안 함</MenuItem>
              <MenuItem value="M">남성</MenuItem>
              <MenuItem value="F">여성</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="키 (cm)"
            type="number"
            inputProps={{ min: 100, max: 250, step: 0.1, inputMode: 'decimal' }}
            value={heightCm}
            onChange={(e) => setHeightCm(e.target.value)}
          />

          {/* ── 이번 주 라이프스타일 ── */}
          <Divider sx={{ mt: 1 }} />
          <Box>
            <Typography variant="subtitle2" color="primary.main" gutterBottom>
              이번 주 라이프스타일
            </Typography>
            <Typography variant="caption" color="text.secondary">
              입력할수록 AI 조언이 더 개인화됩니다.
            </Typography>
          </Box>
          <FormControl fullWidth>
            <InputLabel>운동 횟수</InputLabel>
            <Select
              value={exerciseCount}
              label="운동 횟수"
              onChange={(e) => setExerciseCount(e.target.value as string)}
            >
              <MenuItem value="">입력 안 함</MenuItem>
              {[0, 1, 2, 3, 4, 5, 6, 7].map((n) => (
                <MenuItem key={n} value={String(n)}>
                  {n}회{n === 0 ? ' (운동 없음)' : ''}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="평균 수면 시간 (시간)"
            type="number"
            inputProps={{ min: 0, max: 24, step: 0.5, inputMode: 'decimal' }}
            value={sleepHours}
            onChange={(e) => setSleepHours(e.target.value)}
            helperText="예: 7.5"
          />
          <FormControl fullWidth>
            <InputLabel>식단 패턴</InputLabel>
            <Select
              value={dietQuality}
              label="식단 패턴"
              onChange={(e) => setDietQuality(e.target.value as DietQuality | '')}
            >
              <MenuItem value="">입력 안 함</MenuItem>
              <MenuItem value="normal">정상 — 평소와 비슷하게 먹었음</MenuItem>
              <MenuItem value="overeat">과식 — 평소보다 많이 먹었음</MenuItem>
              <MenuItem value="undereat">절식 — 평소보다 적게 먹었음</MenuItem>
            </Select>
          </FormControl>

          <TextField fullWidth label="메모 (특이사항, 부상, 출장 등)" multiline rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          {error && (
            <Typography color="error" variant="body2">
              {error}
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose}>취소</Button>
          <Button type="submit" variant="contained" disabled={loading || !bodyFatRate.trim()}>
            {loading ? '저장 중...' : '저장'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
