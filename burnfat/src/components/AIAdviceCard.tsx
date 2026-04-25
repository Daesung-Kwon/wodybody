import { useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import LinearProgress from '@mui/material/LinearProgress';
import PsychologyIcon from '@mui/icons-material/Psychology';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import { useAIAdvice } from '../hooks/useAIAdvice';
import type { ParticipantWithSubmissions, WeeklyLog } from '../types';

interface Props {
  participant: ParticipantWithSubmissions;
  logs: WeeklyLog[];
  onOpenBasicInfo: () => void;
  onOpenLogForm: () => void;
}

const ADVICE_GOALS = [
  { value: '이번 주 전략', label: '이번 주 전략' },
  { value: '정체 원인 분석', label: '정체 원인 분석' },
  { value: '식단/운동 피드백', label: '식단/운동 피드백' },
  { value: '동기부여', label: '동기부여' },
];

const ADVICE_STYLES = [
  { value: '현실적으로', label: '현실적으로' },
  { value: '엄격하게', label: '엄격하게' },
  { value: '동기부여 중심으로', label: '동기부여 중심으로' },
  { value: '식단 중심으로', label: '식단 중심으로' },
  { value: '운동 중심으로', label: '운동 중심으로' },
];

export default function AIAdviceCard({ participant, logs, onOpenBasicInfo, onOpenLogForm }: Props) {
  const { advice, loading, error, isCached, load, reset } = useAIAdvice();
  const [requested, setRequested] = useState(false);
  const [contextDialogOpen, setContextDialogOpen] = useState(false);
  const [userContext, setUserContext] = useState('');
  const [adviceGoal, setAdviceGoal] = useState('이번 주 전략');
  const [adviceStyle, setAdviceStyle] = useState('현실적으로');

  const readinessItems = [
    { label: '나이', ready: participant.age != null },
    { label: '성별', ready: participant.gender != null },
    { label: '키', ready: participant.height_cm != null },
    { label: '목표 체지방률', ready: participant.target_body_fat != null },
    { label: '주간 기록 1개 이상', ready: logs.length > 0 },
  ];
  const readyCount = readinessItems.filter((i) => i.ready).length;
  const readiness = Math.round((readyCount / readinessItems.length) * 100);
  const canRequestAdvice = readyCount === readinessItems.length;

  const hasLifestyleData = logs.some((l) => l.exercise_count != null || l.sleep_hours != null || l.diet_quality != null);

  const handleLoad = () => {
    if (!canRequestAdvice) return;
    setRequested(true);
    load(participant.id);
  };

  const handleReset = () => {
    reset();
    setRequested(false);
  };

  const handleRefresh = () => {
    setContextDialogOpen(true);
  };

  const handleContextSubmit = () => {
    setRequested(true);
    setContextDialogOpen(false);
    load(participant.id, true, {
      userContext,
      adviceGoal,
      adviceStyle,
    });
  };

  return (
    <Card sx={{ bgcolor: 'primary.50', border: '1px solid', borderColor: 'primary.200' }}>
      <CardContent sx={{ pb: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <PsychologyIcon color="primary" sx={{ fontSize: 20 }} />
          <Box>
            <Typography variant="subtitle2" color="primary.dark" component="span" display="block">
              AI 체지방 감량 조언
            </Typography>
            <Typography variant="caption" color="text.disabled" display="block" sx={{ mt: 0.25 }}>
              Grok (xAI) · wodybody 서버 연동
            </Typography>
          </Box>
        </Box>
        {!requested && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {participant.nickname}님의 기록과 현재 상황을 바탕으로 맞춤 전략을 받아보세요.
          </Typography>
        )}
        {!canRequestAdvice && (
          <Box sx={{ mb: 1.5, p: 1.5, bgcolor: 'background.paper', borderRadius: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                AI 분석 준비도 {readiness}%
              </Typography>
              <Typography variant="caption" color="text.disabled">
                {readyCount}/{readinessItems.length}
              </Typography>
            </Box>
            <LinearProgress variant="determinate" value={readiness} sx={{ mb: 1 }} />
            {readinessItems.map((item) => (
              <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, py: 0.25 }}>
                {item.ready ? (
                  <CheckCircleIcon color="success" sx={{ fontSize: 15 }} />
                ) : (
                  <RadioButtonUncheckedIcon color="disabled" sx={{ fontSize: 15 }} />
                )}
                <Typography variant="caption" color={item.ready ? 'text.secondary' : 'text.primary'}>
                  {item.label}
                </Typography>
              </Box>
            ))}
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
              기본정보와 최소 1개 이상의 주간 기록이 있어야 일반론이 아닌 개인화 조언을 만들 수 있어요.
            </Typography>
          </Box>
        )}
        {canRequestAdvice && !hasLifestyleData && !requested && (
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
            운동 횟수·수면·식단 패턴까지 입력하면 조언이 더 구체적입니다.
          </Typography>
        )}
        {loading && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 2 }}>
            <CircularProgress size={20} />
            <Typography variant="body2" color="text.secondary">
              AI가 분석 중입니다...
            </Typography>
          </Box>
        )}
        {error && !loading && (
          <Typography variant="body2" color="error" sx={{ mb: 1 }}>
            {error}
          </Typography>
        )}
        {advice && !loading && (
          <>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mb: 1 }}>
              {advice}
            </Typography>
            {isCached && (
              <Typography variant="caption" color="text.disabled">
                오늘 캐시된 조언 · 새로 받으려면 아래 버튼을 누르세요
              </Typography>
            )}
          </>
        )}
      </CardContent>
      <CardActions sx={{ px: 2, pb: 2, pt: 0, flexWrap: 'wrap', gap: 1 }}>
        {!requested && (
          <Button
            size="small"
            variant="contained"
            onClick={handleLoad}
            startIcon={<PsychologyIcon />}
            disabled={!canRequestAdvice}
          >
            AI 조언 보기
          </Button>
        )}
        {!canRequestAdvice && (
          <>
            {readinessItems.some((i) => i.label !== '주간 기록 1개 이상' && !i.ready) && (
              <Button size="small" variant="outlined" onClick={onOpenBasicInfo}>
                기본정보 입력
              </Button>
            )}
            {!readinessItems.find((i) => i.label === '주간 기록 1개 이상')?.ready && (
              <Button size="small" variant="outlined" onClick={onOpenLogForm}>
                주간 기록 입력
              </Button>
            )}
          </>
        )}
        {requested && !loading && advice && (
          <Button
            size="small"
            variant="outlined"
            startIcon={<RefreshIcon sx={{ fontSize: 16 }} />}
            onClick={handleRefresh}
          >
            새로 받기
          </Button>
        )}
        {requested && !loading && (
          <Button size="small" variant="text" color="inherit" onClick={handleReset}
            sx={{ color: 'text.secondary', minWidth: 'unset' }}>
            닫기
          </Button>
        )}
      </CardActions>
      <Dialog open={contextDialogOpen} onClose={() => setContextDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>새 조언을 위한 추가 입력</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            지금 상황을 알려주면 기록 수치와 함께 더 개인화된 전략을 제안할 수 있어요.
          </Typography>
          <FormControl fullWidth>
            <InputLabel>조언 목적</InputLabel>
            <Select value={adviceGoal} label="조언 목적" onChange={(e) => setAdviceGoal(e.target.value)}>
              {ADVICE_GOALS.map((g) => (
                <MenuItem key={g.value} value={g.value}>{g.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>조언 스타일</InputLabel>
            <Select value={adviceStyle} label="조언 스타일" onChange={(e) => setAdviceStyle(e.target.value)}>
              {ADVICE_STYLES.map((s) => (
                <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            fullWidth
            multiline
            minRows={4}
            label="현재 상황/고민"
            placeholder="예: 이번 주 회식이 2번 있었고 수면이 부족했어요. 운동은 2번밖에 못 했고 체중은 그대로입니다."
            value={userContext}
            onChange={(e) => setUserContext(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setContextDialogOpen(false)} color="inherit">취소</Button>
          <Button variant="contained" onClick={handleContextSubmit} disabled={loading}>
            새로 받기
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}
