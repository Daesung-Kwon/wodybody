import { useState, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import NewReleasesIcon from '@mui/icons-material/NewReleases';

const NOTICE_VERSION = '2026-04-23-v2'; // 공지 버전 — 내용 바뀌면 여기 변경
const STORAGE_KEY = 'bf_update_notice_dismissed';

function shouldShow(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return true;
    const { version, date } = JSON.parse(stored) as { version: string; date: string };
    // 버전이 다르면 무조건 다시 표시
    if (version !== NOTICE_VERSION) return true;
    // 같은 버전이면 오늘 날짜와 비교
    const today = new Date().toISOString().slice(0, 10);
    return date !== today;
  } catch {
    return true;
  }
}

function dismiss(permanently = false) {
  try {
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: NOTICE_VERSION,
      date: permanently ? '9999-12-31' : today,
    }));
  } catch { /* ignore */ }
}

interface UpdateItem {
  icon: string;
  label: string;
  tag: '신규' | '개선' | '수정';
  tagColor: 'success' | 'primary' | 'warning';
  desc: string;
}

const UPDATES: UpdateItem[] = [
  {
    icon: '🤖',
    label: 'AI 체지방 감량 조언',
    tag: '신규',
    tagColor: 'success',
    desc: 'Grok(xAI) 기반 AI가 주간 기록을 분석해 맞춤 조언을 제공합니다.',
  },
  {
    icon: '🏋️',
    label: '주간 라이프스타일 기록',
    tag: '신규',
    tagColor: 'success',
    desc: '주간 기록에 운동 횟수·수면 시간·식단 패턴을 입력하면 AI 조언이 더 개인화됩니다.',
  },
  {
    icon: '📊',
    label: '우승 산식 개선',
    tag: '개선',
    tagColor: 'primary',
    desc: '단순 체지방 감소량 → 시작 체지방 대비 상대 감소율(%)로 변경. 시작값이 달라도 공정하게 비교합니다.',
  },
  {
    icon: '📈',
    label: '주간 그래프 개선',
    tag: '개선',
    tagColor: 'primary',
    desc: '시작일 인증값이 그래프 기준점으로 표시됩니다. 몸무게 기록 시 체지방↔몸무게 전환 버튼도 생겼습니다.',
  },
  {
    icon: '🔒',
    label: '관리자 PIN 보호',
    tag: '신규',
    tagColor: 'success',
    desc: '대결 생성 시 PIN을 설정하면 순위 공개/잠금을 개설자만 제어할 수 있습니다.',
  },
  {
    icon: '🔓',
    label: '중간 순위 공개 토글',
    tag: '신규',
    tagColor: 'success',
    desc: '종료 인증 완료 전에도 순위를 미리 공개하거나 다시 잠글 수 있습니다.',
  },
  {
    icon: '🔗',
    label: '결과 공유',
    tag: '신규',
    tagColor: 'success',
    desc: '순위 탭 "결과 공유" 버튼으로 메달·감소율·링크가 포함된 텍스트를 클립보드에 복사할 수 있습니다.',
  },
];

export default function UpdateNoticeDialog() {
  const [open, setOpen] = useState(false);
  const [dontShowToday, setDontShowToday] = useState(false);

  useEffect(() => {
    if (shouldShow()) setOpen(true);
  }, []);

  const handleClose = () => {
    dismiss(dontShowToday);
    setOpen(false);
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      scroll="paper"
      PaperProps={{ sx: { borderRadius: 3, mx: 2 } }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <NewReleasesIcon sx={{ color: 'primary.main', fontSize: 26 }} />
          <Box>
            <Typography variant="h6" fontWeight={700} lineHeight={1.2}>
              BurnFat 업데이트 안내
            </Typography>
            <Typography variant="caption" color="text.secondary">
              wodybody 서비스와 통합 · 2026년 4월
            </Typography>
          </Box>
        </Box>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ px: 2.5, py: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          더 공정하고 스마트한 체지방 감량 내기를 위해 다양한 기능이 추가·개선되었습니다. 🔥
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {UPDATES.map((item) => (
            <Box
              key={item.label}
              sx={{
                display: 'flex',
                gap: 1.5,
                p: 1.5,
                bgcolor: 'grey.50',
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'grey.100',
              }}
            >
              <Typography sx={{ fontSize: 22, lineHeight: 1, pt: 0.25, flexShrink: 0 }}>
                {item.icon}
              </Typography>
              <Box sx={{ minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25, flexWrap: 'wrap' }}>
                  <Typography variant="body2" fontWeight={600}>
                    {item.label}
                  </Typography>
                  <Chip
                    label={item.tag}
                    size="small"
                    color={item.tagColor}
                    sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700 }}
                  />
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {item.desc}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ px: 2.5, py: 1.5, justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
        <FormControlLabel
          control={
            <Checkbox
              size="small"
              checked={dontShowToday}
              onChange={(e) => setDontShowToday(e.target.checked)}
            />
          }
          label={<Typography variant="caption" color="text.secondary">오늘 그만보기</Typography>}
          sx={{ m: 0 }}
        />
        <Button variant="contained" onClick={handleClose} sx={{ minWidth: 80 }}>
          확인
        </Button>
      </DialogActions>
    </Dialog>
  );
}
