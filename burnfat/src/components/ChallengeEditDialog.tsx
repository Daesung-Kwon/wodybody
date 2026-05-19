import { useEffect, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import EditIcon from '@mui/icons-material/Edit';
import { supabase } from '../lib/supabase';
import type { Challenge } from '../types';

interface ChallengeEditDialogProps {
  open: boolean;
  challenge: Challenge;
  onClose: () => void;
  /** 저장 성공 후 갱신된 챌린지를 전달. */
  onSaved: (updated: Challenge) => void;
}

/**
 * Sprint 3 Phase B — 챌린지 기본정보(이름·기간·참가비) 수정 다이얼로그.
 * VIEW 는 read-only 이므로 UPDATE 는 base 테이블 `challenges` 를 직접 사용한다.
 */
export default function ChallengeEditDialog({
  open,
  challenge,
  onClose,
  onSaved,
}: ChallengeEditDialogProps) {
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [stakeAmount, setStakeAmount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 다이얼로그가 열릴 때 현재 챌린지 값으로 폼을 초기화.
  useEffect(() => {
    if (open) {
      setTitle(challenge.title);
      setStartDate(challenge.start_date);
      setEndDate(challenge.end_date);
      setStakeAmount(challenge.stake_amount);
      setError('');
    }
  }, [open, challenge]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('대결 이름을 입력하세요.');
      return;
    }
    if (!startDate || !endDate) {
      setError('기간을 입력하세요.');
      return;
    }
    if (startDate >= endDate) {
      setError('종료일은 시작일 이후여야 합니다.');
      return;
    }
    setLoading(true);
    setError('');
    const { error: err } = await supabase
      .from('challenges')
      .update({
        title: title.trim(),
        start_date: startDate,
        end_date: endDate,
        stake_amount: stakeAmount,
      })
      .eq('id', challenge.id);
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    onSaved({
      ...challenge,
      title: title.trim(),
      start_date: startDate,
      end_date: endDate,
      stake_amount: stakeAmount,
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <EditIcon sx={{ fontSize: 20 }} />
        챌린지 정보 수정
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            fullWidth
            label="대결 이름"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <TextField
            fullWidth
            label="시작일"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            fullWidth
            label="종료일"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            fullWidth
            label="참가비 (원)"
            type="number"
            value={stakeAmount}
            onChange={(e) => setStakeAmount(Number(e.target.value) || 0)}
            inputProps={{ min: 0 }}
          />
          {error && (
            <Typography color="error" variant="body2">
              {error}
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} color="inherit">
            취소
          </Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? '저장 중...' : '저장'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
