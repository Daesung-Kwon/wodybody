import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

const NOTICE_VERSION = '2026-04-27-weekly-ai-upgrade-v1';
const STORAGE_KEY = 'bf_weekly_logs_upgrade_notice';

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

export function shouldShowWeeklyLogsUpgradeNotice(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return true;
    const { version, date } = JSON.parse(raw) as { version: string; date: string };
    if (version !== NOTICE_VERSION) return true;
    return date !== getToday();
  } catch {
    return true;
  }
}

export function dismissWeeklyLogsUpgradeNotice() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: NOTICE_VERSION, date: getToday() }));
  } catch {
    // localStorage 미지원/저장 오류는 무시
  }
}

interface WeeklyLogsUpgradeNoticeDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function WeeklyLogsUpgradeNoticeDialog({ open, onClose }: WeeklyLogsUpgradeNoticeDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3, mx: 2 } }}>
      <DialogTitle sx={{ pb: 1.25 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AutoAwesomeIcon sx={{ color: 'primary.main' }} />
          <Box>
            <Typography variant="h6" fontWeight={700} lineHeight={1.2}>
              주간 기록 AI 서비스 업그레이드
            </Typography>
            <Typography variant="caption" color="text.secondary">
              BurnFat x wodybody · 2026년 4월
            </Typography>
          </Box>
        </Box>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ px: 2.5, py: 2.5 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          주간 기록 분석이 더 똑똑해졌습니다. 이제 AI 조언 품질이 한 단계 더 올라갔어요.
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
          <Typography variant="body2">• Grok 기반 고도화 모델로 조언 정확도 강화</Typography>
          <Typography variant="body2">• 유료 크레딧 적용으로 안정적인 고품질 응답 제공</Typography>
          <Typography variant="body2">• 개인 기록 흐름을 반영한 맞춤 전략 추천</Typography>
        </Box>

        <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'grey.50', border: '1px solid', borderColor: 'grey.200' }}>
          <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
            안내
          </Typography>
          <Typography variant="caption" color="text.secondary">
            기존 단독 BurnFat 프로젝트는 wodybody에 통합되어 운영 중이며, 이전 단독 저장소는 더 이상 유지보수하지 않습니다.
          </Typography>
        </Box>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ px: 2.5, py: 1.5, justifyContent: 'space-between' }}>
        <Button color="inherit" onClick={onClose}>
          오늘 그만보기
        </Button>
        <Button variant="contained" onClick={onClose}>
          확인
        </Button>
      </DialogActions>
    </Dialog>
  );
}
