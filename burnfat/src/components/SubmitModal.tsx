import { useState, useRef } from 'react';
import Dialog from '@mui/material/Dialog';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { supabase } from '../lib/supabase';
import type { SubmissionType } from '../types';
import ImageMaskEditor from './ImageMaskEditor';

interface Props {
  open: boolean;
  participantId: string;
  participantNickname: string;
  type: SubmissionType;
  onClose: () => void;
  onSuccess: () => void;
}

export default function SubmitModal({ open, participantId, participantNickname, type, onClose, onSuccess }: Props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [bodyFatRate, setBodyFatRate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [maskedBlob, setMaskedBlob] = useState<Blob | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetImage = () => {
    setSelectedFile(null);
    setMaskedBlob(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rate = parseFloat(bodyFatRate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      setError('0~100 사이의 체지방률을 입력하세요.');
      return;
    }
    const rateRounded = Math.round(rate * 10) / 10;
    if (!maskedBlob) {
      setError('인바디 인쇄물 이미지를 첨부하고 마스킹 적용을 완료해주세요.');
      return;
    }
    setLoading(true);
    setError('');

    const path = `${participantId}/${type}-${Date.now()}.jpg`;
    const { error: uploadErr } = await supabase.storage.from('inbody').upload(path, maskedBlob, { upsert: true });
    let imageUrl: string | null = null;
    if (!uploadErr) {
      const { data: pub } = supabase.storage.from('inbody').getPublicUrl(path);
      imageUrl = pub.publicUrl;
    } else {
      setError('이미지 업로드에 실패했습니다. ' + uploadErr.message);
      setLoading(false);
      return;
    }

    const { error: insertErr } = await supabase.from('submissions').insert({
      participant_id: participantId,
      type,
      body_fat_rate: rateRounded,
      image_url: imageUrl,
    });

    setLoading(false);
    if (insertErr) {
      setError(insertErr.message.includes('unique') ? '이미 해당 구간 인증을 제출했습니다.' : insertErr.message);
      return;
    }
    onSuccess();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setSelectedFile(f);
      setMaskedBlob(null);
    }
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
            인바디 인쇄물 사진을 찍어 업로드한 뒤, 개인정보를 마스킹하고 체지방률(%)을 입력하세요.
          </Typography>

          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            인바디 이미지 (필수)
          </Typography>
          {!selectedFile ? (
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              style={{ display: 'block', marginBottom: 16 }}
              required
            />
          ) : (
            <ImageMaskEditor
              file={selectedFile}
              onMaskedBlob={(blob) => setMaskedBlob(blob)}
              onReset={resetImage}
            />
          )}
          {maskedBlob && (
            <Typography variant="caption" color="success.main" sx={{ display: 'block', mt: 1 }}>
              ✓ 마스킹 적용 완료
            </Typography>
          )}

          <TextField
            fullWidth
            label="체지방률 (%)"
            type="number"
            inputProps={{ min: 0, max: 100, step: 0.1, inputMode: 'decimal' }}
            value={bodyFatRate}
            onChange={(e) => setBodyFatRate(e.target.value)}
            sx={{ mt: 2, mb: 2 }}
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
          <Button
            type="submit"
            variant="contained"
            disabled={loading || !maskedBlob}
          >
            {loading ? '제출 중...' : '제출'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
