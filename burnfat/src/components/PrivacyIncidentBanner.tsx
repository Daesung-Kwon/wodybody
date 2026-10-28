import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { useNavigate } from 'react-router-dom';
import { bfPath } from '../lib/paths';

/**
 * BurnFat 메인에 두는 비차단 안내. 모달이 아니며 닫기 버튼이 없다.
 * 30일 이상 남겨 둘 페이지로 연결한다. 이메일·SNS 발송은 하지 않는다.
 */
export default function PrivacyIncidentBanner() {
  const navigate = useNavigate();

  return (
    <Box
      role="note"
      sx={{
        mb: 2,
        p: 1.5,
        borderRadius: 1.5,
        border: '1px solid',
        borderColor: 'warning.200',
        bgcolor: 'warning.50',
      }}
    >
      <Typography variant="body2" fontWeight={600} gutterBottom>
        개인정보 노출 가능성 안내
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        인바디 사진과 닉네임이 2026-02-23부터 2026-10-06/08까지 저장소 권한 설정 때문에
        넓게 열려 있었을 수 있습니다. 확인된 제3자 접근은 없습니다.
      </Typography>
      <Button
        size="small"
        variant="outlined"
        color="warning"
        onClick={() => navigate(bfPath('/notice/privacy'))}
      >
        안내 전문 보기
      </Button>
    </Box>
  );
}
