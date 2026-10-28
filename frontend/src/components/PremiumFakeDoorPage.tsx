import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import {
  PREMIUM_ANNUAL_KRW,
  PREMIUM_MONTHLY_KRW,
  formatKrw,
  premiumVariantFromSearch,
  submitPremiumWaitlist,
  type PremiumPriceVariant,
} from '../lib/premiumPricing';

/**
 * E2 페이크도어. 공개 홈(/)이 아니다. /premium 과 /pricing-test 만.
 * G7(Vercel Pro) 통과 전에는 공개 트래픽을 붙이지 않는다.
 * 라틴 상표 "CrossFit" 은 쓰지 않고 "크로스핏식 WOD" 로 적는다.
 */
export default function PremiumFakeDoorPage() {
  const [params, setParams] = useSearchParams();
  const variant = premiumVariantFromSearch(params.toString());
  const [started, setStarted] = useState(false);
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    const previous = document.title;
    document.title = 'WodyBody 프리미엄 (비공개 시험)';
    let robots = document.querySelector('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement('meta');
      robots.setAttribute('name', 'robots');
      document.head.appendChild(robots);
    }
    const previousRobots = robots.getAttribute('content');
    robots.setAttribute('content', 'noindex, nofollow');
    return () => {
      document.title = previous;
      if (previousRobots == null) robots?.remove();
      else robots?.setAttribute('content', previousRobots);
    };
  }, []);

  const setVariant = (next: PremiumPriceVariant) => {
    const copy = new URLSearchParams(params);
    copy.set('variant', next);
    setParams(copy, { replace: true });
  };

  const handleNotify = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await submitPremiumWaitlist(email.trim());
    if (result.reason === 'disabled' || result.reason === 'no_endpoint') {
      setNote('준비 중입니다. 입력한 주소는 서버로 전송하지 않았습니다.');
    }
  };

  const monthly = PREMIUM_MONTHLY_KRW[variant];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4, px: 2 }}>
      <Box sx={{ maxWidth: 560, mx: 'auto' }}>
        <Typography variant="overline" color="text.secondary">
          비공개 시험 화면 · 공개 홈이 아닙니다
        </Typography>
        <Typography variant="h4" component="h1" fontWeight={800} gutterBottom>
          혼자 하는 크로스핏식 WOD — WodyBody 프리미엄
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          오늘의 크로스핏식 WOD를 혼자 기록하는 유료 플랜을 시험하는 화면입니다.
          결제는 연결되어 있지 않습니다. G7(Vercel Pro)가 통과하기 전에는 이 주소를
          공개 트래픽에 올리지 않습니다.
        </Typography>

        <ToggleButtonGroup
          exclusive
          value={variant}
          onChange={(_e, next: PremiumPriceVariant | null) => {
            if (next) setVariant(next);
          }}
          aria-label="월 요금 시험안"
          sx={{ mb: 2 }}
        >
          <ToggleButton value="a" aria-label="A안 월 4900원">
            A안 {formatKrw(PREMIUM_MONTHLY_KRW.a)}
          </ToggleButton>
          <ToggleButton value="b" aria-label="B안 월 9900원">
            B안 {formatKrw(PREMIUM_MONTHLY_KRW.b)}
          </ToggleButton>
        </ToggleButtonGroup>

        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="overline">월간</Typography>
            <Typography variant="h3" component="p" fontWeight={800}>
              {formatKrw(monthly)}
              <Typography component="span" variant="body1" color="text.secondary">
                {' '}
                /월
              </Typography>
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              연간 {formatKrw(PREMIUM_ANNUAL_KRW)}
            </Typography>
          </CardContent>
        </Card>

        {!started ? (
          <Button variant="contained" size="large" onClick={() => setStarted(true)}>
            시작하기
          </Button>
        ) : (
          <Box component="form" onSubmit={handleNotify}>
            <Typography variant="h6" component="h2" gutterBottom>
              준비 중입니다, 출시 알림 받기
            </Typography>
            <TextField
              fullWidth
              type="email"
              label="이메일"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              helperText="알림 수집은 기본으로 꺼져 있습니다. 주소는 서버로 보내지 않습니다."
              sx={{ mb: 2 }}
              autoComplete="email"
            />
            <Button type="submit" variant="contained" disabled={!email.trim()}>
              출시 알림 받기
            </Button>
            {note && (
              <Alert severity="info" sx={{ mt: 2 }}>
                {note}
              </Alert>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
}
