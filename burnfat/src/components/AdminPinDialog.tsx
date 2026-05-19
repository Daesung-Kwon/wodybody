import { useEffect, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import InputAdornment from '@mui/material/InputAdornment';
import LockIcon from '@mui/icons-material/Lock';
import { supabase } from '../lib/supabase';

export type AdminPinAction = 'ranking' | 'editChallenge';

interface AdminPinDialogProps {
  open: boolean;
  challengeId: string;
  action: AdminPinAction;
  onClose: () => void;
  /**
   * PIN 검증 성공 후 실행할 후속 액션.
   * 반환 boolean 이 true 면 다이얼로그를 닫는다 (false 면 열린 채 유지).
   */
  onConfirmed: () => Promise<boolean>;
}

const normalizeAdminPin = (p: string | null | undefined) =>
  String(p ?? '').trim().replace(/\D/g, '');

/**
 * Sprint 3 Phase B — 관리자 PIN 확인 다이얼로그.
 * Sprint 0.1 의 서버 RPC(`verify_admin_pin`) 검증을 그대로 사용한다.
 */
export default function AdminPinDialog({
  open,
  challengeId,
  action,
  onClose,
  onConfirmed,
}: AdminPinDialogProps) {
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinLoading, setPinLoading] = useState(false);

  // 다이얼로그가 열릴 때마다 입력 상태를 초기화.
  useEffect(() => {
    if (open) {
      setPinInput('');
      setPinError('');
      setPinLoading(false);
    }
  }, [open]);

  // Sprint 0.1: 클라이언트 비교가 아닌 서버 RPC 로 PIN 검증.
  const verifyAdminPinOnServer = async (pin: string): Promise<boolean> => {
    const cleaned = normalizeAdminPin(pin);
    if (cleaned.length !== 4) return false;
    const { data, error } = await supabase.rpc('verify_admin_pin', {
      p_challenge_id: challengeId,
      p_pin: cleaned,
    });
    if (error) return false;
    return data === true;
  };

  const handleSubmit = async () => {
    const got = normalizeAdminPin(pinInput);
    if (got.length !== 4) {
      setPinError('PIN은 숫자 4자리입니다.');
      return;
    }
    setPinLoading(true);
    setPinError('');
    const ok = await verifyAdminPinOnServer(got);
    if (!ok) {
      setPinLoading(false);
      setPinError('PIN이 올바르지 않습니다.');
      return;
    }
    const done = await onConfirmed();
    setPinLoading(false);
    if (done) {
      setPinInput('');
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <LockIcon sx={{ fontSize: 20, color: 'warning.main' }} />
        관리자 PIN 확인
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {action === 'editChallenge'
            ? '챌린지 정보 수정은 관리자 PIN이 필요합니다.'
            : '순위 공개/잠금은 관리자 PIN이 필요합니다.'}
        </Typography>
        <TextField
          fullWidth
          label="PIN 4자리"
          type="text"
          inputProps={{ maxLength: 4, inputMode: 'numeric', pattern: '[0-9]*' }}
          value={pinInput}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, '').slice(0, 4);
            setPinInput(v);
            setPinError('');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !pinLoading) void handleSubmit();
          }}
          error={!!pinError}
          helperText={pinError}
          autoFocus
          disabled={pinLoading}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <LockIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
              </InputAdornment>
            ),
          }}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit" disabled={pinLoading}>
          취소
        </Button>
        <Button
          variant="contained"
          color="warning"
          onClick={() => void handleSubmit()}
          disabled={pinLoading || pinInput.length !== 4}
        >
          {pinLoading ? '처리 중...' : '확인'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
