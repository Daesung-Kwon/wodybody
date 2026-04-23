import { useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import PsychologyIcon from '@mui/icons-material/Psychology';
import { useAIAdvice } from '../hooks/useAIAdvice';

interface Props {
  participantId: string;
  participantNickname: string;
}

export default function AIAdviceCard({ participantId, participantNickname }: Props) {
  const { advice, loading, error, load, reset } = useAIAdvice();
  const [requested, setRequested] = useState(false);

  const handleLoad = () => {
    setRequested(true);
    load(participantId);
  };

  const handleReset = () => {
    reset();
    setRequested(false);
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
            {participantNickname}님의 주간 기록을 바탕으로 맞춤 조언을 받아보세요.
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
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mb: 1 }}>
            {advice}
          </Typography>
        )}
      </CardContent>
      <CardActions sx={{ px: 2, pb: 2, pt: 0 }}>
        {!requested && (
          <Button size="small" variant="contained" onClick={handleLoad} startIcon={<PsychologyIcon />}>
            AI 조언 보기
          </Button>
        )}
        {requested && !loading && (
          <Button size="small" variant="outlined" onClick={handleReset}>
            다시 보기
          </Button>
        )}
      </CardActions>
    </Card>
  );
}
