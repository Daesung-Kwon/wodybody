import { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { createSubmission } from '../lib/roomApi';
import type { SubmissionType } from '../types';
import { prepareDeviceSecret } from '../lib/deviceSecret';
import { track } from '../lib/analytics';

/** 체지방률을 5%p 구간 라벨로 버킷팅 (예: 28.0 → "25-30"). PII·정밀값 노출 방지. */
function bodyFatBucket(rate: number): string {
  const lo = Math.max(0, Math.floor(rate / 5) * 5);
  return `${lo}-${lo + 5}`;
}

interface Props {
  open: boolean;
  /** 대결방 코드 — RLS lockdown 이후 create_submission RPC 가 요구한다. */
  challengeCode: string;
  participantId: string;
  participantNickname: string;
  type: SubmissionType;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * 시작/종료 인증 — 체지방률 숫자만 입력한다.
 *
 * 2026-10-19 결정: 인바디 사진은 더 이상 수집·저장하지 않는다 (docs/validation/week0/G3.md).
 * Storage 업로드를 하지 않으며 create_submission 에는 p_image_path = null 을 보낸다.
 * 기존 이미지의 삭제 절차는 docs/validation/week0/inbody-deletion.md.
 */
export default function SubmitModal({ open, challengeCode, participantId, participantNickname, type, onClose, onSuccess }: Props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [bodyFatRate, setBodyFatRate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rate = parseFloat(bodyFatRate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      setError('0~100 사이의 체지방률을 입력하세요.');
      return;
    }
    const rateRounded = Math.round(rate * 10) / 10;
    setLoading(true);
    setError('');

    // Sprint 0.2: device_secret 발급 → 해시는 서버에 저장, plain 은 INSERT 성공 후 localStorage 에 보관
    const secret = await prepareDeviceSecret('submissions');

    // RLS lockdown: submissions 직접 INSERT 대신 room-code RPC. 사진 없음 → imagePath null.
    let inserted: { id?: string } | null = null;
    let insertErr: Error | null = null;
    try {
      inserted = await createSubmission(challengeCode, {
        participantId,
        type,
        bodyFatRate: rateRounded,
        imagePath: null,
        deviceSecretHash: secret.hash,
      });
    } catch (e) {
      insertErr = e instanceof Error ? e : new Error(String(e));
    }

    setLoading(false);
    if (insertErr) {
      setError(insertErr.message.includes('unique') ? '이미 해당 구간 인증을 제출했습니다.' : insertErr.message);
      return;
    }
    if (inserted?.id) {
      secret.persist(inserted.id);
    }
    track('submission_submitted', { type, body_fat_rate_bucket: bodyFatBucket(rateRounded) });
    onSuccess();
  };

  const label = type === 'start' ? '시작일' : '종료일';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth fullScreen={isMobile}>
      <DialogTitle>
        {participantNickname} - {label} 인증
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            측정한 체지방률(%)을 숫자로 입력하세요. 사진은 받지 않습니다.
          </Typography>

          <TextField
            fullWidth
            label="체지방률 (%)"
            type="number"
            inputProps={{ min: 0, max: 100, step: 0.1, inputMode: 'decimal' }}
            value={bodyFatRate}
            onChange={(e) => setBodyFatRate(e.target.value)}
            sx={{ mt: 1, mb: 2 }}
            required
          />
          {error && (
            <Typography color="error" variant="body2" sx={{ mb: 1 }}>
              {error}
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose}>취소</Button>
          <Button type="submit" variant="contained" disabled={loading || bodyFatRate.trim() === ''}>
            {loading ? '제출 중...' : '제출'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
