import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';

export default function HomePage() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (trimmed) navigate(`/c/${trimmed}`);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
      }}
    >
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <LocalFireDepartmentIcon sx={{ fontSize: 64, color: 'primary.main' }} />
        <Typography variant="h4" component="h1" fontWeight={700} color="primary.main" gutterBottom>
          BurnFat
        </Typography>
        <Typography variant="body1" color="text.secondary">
          체지방 감량 다이어트 내기
        </Typography>
      </Box>

      <Card sx={{ maxWidth: 400, width: '100%' }}>
        <CardContent sx={{ p: 3 }}>
          <form onSubmit={handleJoin}>
            <TextField
              fullWidth
              label="대결 코드"
              placeholder="예: ABC123"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              sx={{ mb: 2 }}
              inputProps={{ style: { textTransform: 'uppercase' } }}
            />
            <Button type="submit" variant="contained" fullWidth size="large" disabled={!code.trim()}>
              대결방 입장
            </Button>
          </form>
        </CardContent>
      </Card>

      <Button
        variant="text"
        color="primary"
        sx={{ mt: 3 }}
        onClick={() => navigate('/create')}
      >
        새 대결 만들기
      </Button>
    </Box>
  );
}
