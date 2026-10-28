import Box from '@mui/material/Box';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Typography from '@mui/material/Typography';
import {
  BODY_FAT_CONSENT_CHECKBOX_LABEL,
  readBodyFatConsent,
} from '../lib/bodyFatConsent';

interface Props {
  participantId: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}

/**
 * 제23조 민감정보 별도 동의. 가입 화면과 분리된 짧은 고지 + 기본 꺼진 체크박스.
 * 사진 항목은 없다 (2026-10-19 숫자만).
 */
export default function BodyFatConsentFields({ participantId, checked, onChange }: Props) {
  const existing = readBodyFatConsent(participantId);

  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: 1.5,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'grey.50',
      }}
    >
      <Typography variant="subtitle2" component="h2" gutterBottom>
        체지방 정보 수집 동의 (선택)
      </Typography>
      <Typography id="body-fat-consent-copy" variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        체지방률과 목표 체지방률은 건강 관련 정보로 보고, 개인정보 보호법 제23조에 따라
        따로 동의받습니다. 입력은 선택입니다. 동의하지 않으면 그 숫자는 저장하지 않습니다.
        사진은 받지 않습니다. 다른 참가자 화면에는 숫자를 보이지 않는 것이 원칙입니다
        (이 기기에서 직접 입력한 값만 표시). 거부해도 대결 참가와 운동·수면·식단 기록은
        유지됩니다. 국외 AI에는 체지방 숫자를 보내지 않습니다.
      </Typography>
      {existing && (
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
          이 기기 동의 시각: {existing.consentedAt}
        </Typography>
      )}
      <FormControlLabel
        control={
          <Checkbox
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            inputProps={{ 'aria-describedby': 'body-fat-consent-copy' }}
          />
        }
        label={BODY_FAT_CONSENT_CHECKBOX_LABEL}
      />
    </Box>
  );
}
