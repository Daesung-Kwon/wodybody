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
import ChallengeTemplatePicker from '../components/ChallengeTemplatePicker';
import { CHALLENGE_TEMPLATES, templateEndDate, type ChallengeTemplate } from '../lib/challengeTemplates';

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
  // Sprint 2: 선택된 챌린지 템플릿 id. 사용자가 값을 직접 수정하면 null(직접 설정).
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  // 템플릿 선택 → 종료일·참가비 자동 채움.
  const handleSelectTemplate = (t: ChallengeTemplate) => {
    setSelectedTemplateId(t.id);
    setEndDate(templateEndDate(startDate, t.weeks));
    setStakeAmount(t.stakeAmount);
  };

  // 시작일 변경 — 템플릿이 선택돼 있으면 종료일을 다시 계산해 일관성 유지.
  const handleStartDateChange = (next: string) => {
    setStartDate(next);
    const tpl = selectedTemplateId
      ? CHALLENGE_TEMPLATES.find((t) => t.id === selectedTemplateId)
      : undefined;
    if (tpl) setEndDate(templateEndDate(next, tpl.weeks));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (adminPin && !/^\d{4}$/.test(adminPin)) {
      setError('관리자 PIN은 숫자 4자리로 입력하세요.');
      setLoading(false);
      return;
    }

    // 코드 중복 회피 — 최대 5회 재시도
    let code = generateCode();
    let attempts = 0;
    const maxAttempts = 5;
    while (attempts < maxAttempts) {
      const { data: existing } = await supabase.from('challenges').select('id').eq('code', code).maybeSingle();
      if (!existing) break;
      code = generateCode();
      attempts++;
    }

    // Sprint 0.1: 평문 PIN INSERT 가 아닌 서버측 해시 RPC 사용
    const { data, error: err } = await supabase.rpc('create_challenge_with_pin', {
      p_code: code,
      p_title: title.trim() || '다이어트 챌린지',
      p_start_date: startDate,
      p_end_date: endDate,
      p_stake_amount: stakeAmount,
      p_admin_pin: adminPin.trim() || null,
    });

    setLoading(false);
    if (err) {
      // RPC 측 예외(admin_pin_format 등) 처리
      const msg = err.message || '';
      if (msg.includes('admin_pin_format')) {
        setError('관리자 PIN은 숫자 4자리로 입력하세요.');
      } else {
        setError(msg || '대결 생성에 실패했습니다.');
      }
      return;
    }
    const created = (Array.isArray(data) ? data[0] : data) as Challenge | null;
    if (!created?.code) {
      setError('대결 생성 응답이 비어 있습니다.');
      return;
    }
    navigate(`/c/${created.code}`);
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
          <ChallengeTemplatePicker selectedId={selectedTemplateId} onSelect={handleSelectTemplate} />
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
              onChange={(e) => handleStartDateChange(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="종료일"
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setSelectedTemplateId(null); }}
              InputLabelProps={{ shrink: true }}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="참가비 (원)"
              type="number"
              value={stakeAmount}
              onChange={(e) => { setStakeAmount(Number(e.target.value) || 0); setSelectedTemplateId(null); }}
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
