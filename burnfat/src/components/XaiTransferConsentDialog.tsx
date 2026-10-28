import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

export const XAI_TRANSFER_CHECKBOX_LABEL = '위 국외 이전에 동의합니다.';

interface Props {
  open: boolean;
  onClose: () => void;
  /** 체크된 상태에서만 호출된다. */
  onAgree: () => void;
}

/**
 * G4 고지. 가입 동의와 분리. 체크 기본값은 꺼짐.
 * 이전 국가·보관 기간의 빈칸은 소유자·법률 확정 전이라 초안 문구로 남긴다.
 */
export default function XaiTransferConsentDialog({ open, onClose, onAgree }: Props) {
  const [checked, setChecked] = useState(false);

  const handleClose = () => {
    setChecked(false);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      TransitionProps={{ onEnter: () => setChecked(false) }}
    >
      <DialogTitle>AI 기능의 국외 이전 동의 (선택)</DialogTitle>
      <DialogContent>
        <Typography id="xai-transfer-copy" variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          WODYBODY는 크로스핏식 WOD를 고르거나 설명을 만들 때 xAI(국외 처리, 사업자 소재는
          미국. 처리 국가는 xAI 문서 확인 전)에 정보를 보냅니다.
        </Typography>
        <Typography component="ul" variant="body2" sx={{ pl: 2.5, m: 0, mb: 1.5 }}>
          <li>이전받는 자: xAI</li>
          <li>이전 국가: 미국으로 알려진 처리 (정확한 국가는 소유자 확인 전)</li>
          <li>일시·방법: AI 기능을 쓸 때마다, HTTPS로 xAI API(api.x.ai)에 전송</li>
          <li>
            항목: 난이도, 사용 기구, 운동 기록(완료 여부·시간·날짜). 코치 대화를 켜면 그 대화
            문장. 닉네임, 사진, 체지방률, 몸무게는 보내지 않습니다.
          </li>
          <li>목적: 오늘의 크로스핏식 WOD 추천과, 동의한 경우에 한한 코치 답변</li>
          <li>
            보유: xAI 쪽 보관 기간은 약관 확인 전. 우리 쪽 조언 캐시는 약 24시간, 코치 대화는
            세션을 지울 때까지 서비스 안에 남습니다.
          </li>
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          거부해도 서비스를 쓸 수 있습니다. AI가 고르는 WOD와 코치 대화만 꺼집니다. 동의
          후에도 같은 화면에서 철회할 수 있고, 철회 뒤에는 새 요청을 보내지 않습니다.
        </Typography>
        <FormControlLabel
          control={
            <Checkbox
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
            />
          }
          label={XAI_TRANSFER_CHECKBOX_LABEL}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Button onClick={handleClose}>AI 없이 계속</Button>
        <Button variant="contained" disabled={!checked} onClick={onAgree}>
          동의하고 AI 사용
        </Button>
      </DialogActions>
    </Dialog>
  );
}
