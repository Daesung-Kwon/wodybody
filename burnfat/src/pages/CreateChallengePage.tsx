import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LockIcon from '@mui/icons-material/Lock';
import InputAdornment from '@mui/material/InputAdornment';
import { supabase } from '../lib/supabase';
import type { Challenge } from '../types';

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function getTodayString(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
}

export default function CreateChallengePage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('다이어트 챌린지');
  const [startDate, setStartDate] = useState(getTodayString);
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [stakeAmount, setStakeAmount] = useState(50000);
  const [adminPin, setAdminPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    let code = generateCode();
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      const { data: existing } = await supabase.from('challenges').select('id').eq('code', code).single();
      if (!existing) break;
      code = generateCode();
      attempts++;
    }

    if (adminPin && !/^\d{4}$/.test(adminPin)) {
      setError('관리자 PIN은 숫자 4자리로 입력하세요.');
      setLoading(false);
      return;
    }

    const { data, error: err } = await supabase
      .from('challenges')
      .insert({
        code,
        title: title.trim() || '다이어트 챌린지',
        start_date: startDate,
        end_date: endDate,
        stake_amount: stakeAmount,
        admin_pin: adminPin.trim() || null,
      })
      .select()
      .single();

    setLoading(false);
    if (err) {
      setError(err.message || '대결 생성에 실패했습니다.');
      return;
    }
    navigate(`/c/${(data as Challenge).code}`);
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', p: 2 }}>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/')} sx={{ mb: 2 }}>
        홈
      </Button>

      <Typography variant="h5" fontWeight={600} gutterBottom>
        새 대결 만들기
      </Typography>

      <Card sx={{ maxWidth: 480, mt: 2 }}>
        <CardContent sx={{ p: 3 }}>
          <form onSubmit={handleCreate}>
            <TextField
              fullWidth
              label="대결 이름"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="시작일"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="종료일"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="참가비 (원)"
              type="number"
              value={stakeAmount}
              onChange={(e) => setStakeAmount(Number(e.target.value) || 0)}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="관리자 PIN (선택)"
              type="number"
              inputProps={{ maxLength: 4, inputMode: 'numeric' }}
              value={adminPin}
              onChange={(e) => setAdminPin(e.target.value.slice(0, 4))}
              placeholder="숫자 4자리"
              helperText="설정하면 순위 공개·잠금 시 PIN 확인이 필요합니다. 미설정 시 누구나 가능."
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 2 }}
            />
            {error && (
              <Typography color="error" variant="body2" sx={{ mb: 2 }}>
                {error}
              </Typography>
            )}
            <Button type="submit" variant="contained" fullWidth size="large" disabled={loading}>
              {loading ? '생성 중...' : '대결 생성'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}
