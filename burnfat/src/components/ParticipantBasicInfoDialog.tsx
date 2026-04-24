import { useState, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
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
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { supabase } from '../lib/supabase';
import type { Participant, Gender } from '../types';

interface Props {
  open: boolean;
  participant: Participant | null;
  onClose: () => void;
  onSuccess: () => void;
  /** 참가 등록 직후 열린 경우 true → 건너뛰기 버튼 표시 */
  isAfterJoin?: boolean;
}

export default function ParticipantBasicInfoDialog({ open, participant, onClose, onSuccess, isAfterJoin }: Props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [age, setAge] = useState<string>('');
  const [gender, setGender] = useState<Gender | ''>('');
  const [heightCm, setHeightCm] = useState<string>('');
  const [targetBodyFat, setTargetBodyFat] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // open이 바뀔 때(다이얼로그가 열릴 때)마다 participant 최신값으로 폼 초기화
  useEffect(() => {
    if (open && participant) {
      setAge(participant.age != null ? String(participant.age) : '');
      setGender(participant.gender || '');
      setHeightCm(participant.height_cm != null ? String(participant.height_cm) : '');
      setTargetBodyFat(participant.target_body_fat != null ? String(participant.target_body_fat) : '');
      setError('');
    }
  }, [open, participant]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!participant) return;
    setLoading(true);
    setError('');
    const updates: Record<string, unknown> = {};
    if (age.trim()) updates.age = parseInt(age, 10);
    else updates.age = null;
    if (gender) updates.gender = gender;
    else updates.gender = null;
    if (heightCm.trim()) updates.height_cm = parseFloat(heightCm);
    else updates.height_cm = null;
    if (targetBodyFat.trim()) updates.target_body_fat = parseFloat(targetBodyFat);
    else updates.target_body_fat = null;

    const { error: err } = await supabase.from('participants').update(updates).eq('id', participant.id);
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    onSuccess();
    onClose();
  };

  if (!participant) return null;

  const handleSkip = () => {
    onClose();
    onSuccess();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth fullScreen={isMobile}>
      <DialogTitle>{participant.nickname}님 기본정보 (선택)</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            AI 조언 및 진행률에 활용됩니다. 대결방 참가자 누구나 입력·수정할 수 있습니다.
          </Typography>
          <TextField
            fullWidth
            label="나이"
            type="number"
            inputProps={{ min: 10, max: 100, inputMode: 'numeric' }}
            value={age}
            onChange={(e) => setAge(e.target.value)}
          />
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
          <TextField
            fullWidth
            label="목표 체지방률 (%)"
            type="number"
            inputProps={{ min: 5, max: 60, step: 0.1, inputMode: 'decimal' }}
            value={targetBodyFat}
            onChange={(e) => setTargetBodyFat(e.target.value)}
          />
          {error && (
            <Typography color="error" variant="body2">
              {error}
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, flexWrap: 'wrap', gap: 1 }}>
          {isAfterJoin && (
            <Button onClick={handleSkip} color="inherit" sx={{ mr: 'auto' }}>
              건너뛰기
            </Button>
          )}
          <Button onClick={onClose}>취소</Button>
          <Button type="submit" variant="contained" disabled={loading} sx={{ minWidth: 88 }}>
            {loading ? '저장 중...' : '저장'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
