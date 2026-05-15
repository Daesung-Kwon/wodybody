import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';

const STORAGE_PREFIX = 'burnfat:endingSoonNotice:';

/**
 * 종료 임박 모달을 이 챌린지에 대해 이미 봤는지. 챌린지당 1회만 노출.
 */
export function shouldShowEndingSoonNotice(challengeId: string): boolean {
  if (!challengeId) return false;
  try {
    return localStorage.getItem(`${STORAGE_PREFIX}${challengeId}`) == null;
  } catch {
    return false;
  }
}

export function dismissEndingSoonNotice(challengeId: string): void {
  if (!challengeId) return;
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${challengeId}`, new Date().toISOString());
  } catch {
    // 무시
  }
}

interface Props {
  open: boolean;
  /** D-Day 라벨 (예: "D-1", "D-DAY"). */
  ddayLabel: string;
  endDate: string;
  /** 내 종료 인증이 아직 미완료인지 — 메시지를 분기. 식별 안 됐으면 undefined. */
  myEndPending?: boolean;
  onClose: () => void;
  /** "지금 종료 인증하기" — 식별된 사용자가 종료 인증 미완료일 때만 노출. */
  onAuthEnd?: () => void;
}

/**
 * Sprint 1 — 종료 임박 알림 모달.
 * 종료 24h 이내 진입 시 챌린지당 1회 노출해, 종료 인증 마감을 놓치지 않게 한다.
 */
export default function EndingSoonDialog({
  open,
  ddayLabel,
  endDate,
  myEndPending,
  onClose,
  onAuthEnd,
}: Props) {
  const showAuthCta = myEndPending === true && !!onAuthEnd;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3, mx: 2 } }}>
      <DialogTitle sx={{ pb: 1.25 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LocalFireDepartmentIcon sx={{ color: 'warning.main' }} aria-hidden />
          <Box>
            <Typography variant="h6" fontWeight={700} lineHeight={1.2}>
              종료가 임박했어요 · {ddayLabel}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              종료일 {endDate}
            </Typography>
          </Box>
        </Box>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ px: 2.5, py: 2.5 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {showAuthCta
            ? '아직 종료 인증을 마치지 않았어요. 종료일이 지나면 인증과 순위 반영이 어려워집니다. 지금 인증을 마쳐 주세요.'
            : '챌린지 종료가 다가옵니다. 참가자 전원이 종료 인증을 마치면 최종 순위가 자동 공개됩니다.'}
        </Typography>
        <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'warning.50', border: '1px solid', borderColor: 'warning.200' }}>
          <Typography variant="caption" color="text.secondary">
            놓치기 쉬운 마감 — 친구들에게도 종료 인증을 한 번 알려 주세요.
          </Typography>
        </Box>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ px: 2.5, py: 1.5, justifyContent: showAuthCta ? 'space-between' : 'flex-end' }}>
        <Button color="inherit" onClick={onClose}>
          닫기
        </Button>
        {showAuthCta && (
          <Button
            variant="contained"
            color="warning"
            onClick={() => {
              onClose();
              onAuthEnd?.();
            }}
          >
            지금 종료 인증하기
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
