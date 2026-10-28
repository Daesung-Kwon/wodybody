import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import { bfPath } from '../lib/paths';

/**
 * 유출 가능성 안내. 게시 후 30일 이상 이 경로에 둔다.
 * 개별 연락(이메일·문자·SNS)은 하지 않는다. 경로·닉네임 목록은 적지 않는다.
 */
export default function PrivacyIncidentNoticePage() {
  const navigate = useNavigate();

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: 6 }}>
      <Box sx={{ p: 2 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(bfPath('/'))}>
          홈
        </Button>
      </Box>
      <Box component="article" sx={{ px: 2, maxWidth: 720, mx: 'auto' }}>
        <Typography variant="h5" component="h1" fontWeight={700} gutterBottom>
          개인정보 노출 가능성 안내
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          게시 목적: 과거 저장소 설정으로 정보가 외부에서 열려 있었을 가능성을 알립니다.
          이 페이지는 30일 이상 유지합니다. 개별 이메일·문자·SNS로는 보내지 않습니다.
        </Typography>

        <Typography variant="h6" component="h2" gutterBottom>
          무엇이 해당하나요
        </Typography>
        <Typography variant="body2" sx={{ mb: 2 }}>
          노출 가능성이 있던 항목은 인바디 등 측정 결과지 사진과 닉네임입니다. 사진 파일
          경로의 앞부분은 참가자 식별자와 같았습니다.
        </Typography>

        <Typography variant="h6" component="h2" gutterBottom>
          기간
        </Typography>
        <Typography variant="body2" sx={{ mb: 2 }}>
          2026-02-23부터 2026-10-06 및 2026-10-08에 접근을 좁히기 전까지입니다.
        </Typography>

        <Typography variant="h6" component="h2" gutterBottom>
          원인
        </Typography>
        <Typography variant="body2" sx={{ mb: 2 }}>
          저장소 권한 설정이 잘못되어 있었습니다. 비공개로 두어야 할 저장소에 익명 읽기·
          올리기가 열려 있었습니다.
        </Typography>

        <Typography variant="h6" component="h2" gutterBottom>
          제3자 접근
        </Typography>
        <Typography variant="body2" sx={{ mb: 2 }}>
          확인된 제3자 접근은 없습니다. 보존된 기록 범위에서 외부 열람이 확인되지는
          않았습니다. 기록이 없는 구간은 같은 방법으로 확인할 수 없습니다.
        </Typography>

        <Typography variant="h6" component="h2" gutterBottom>
          조치
        </Typography>
        <Typography component="ul" variant="body2" sx={{ pl: 2.5, mb: 2 }}>
          <li>넓었던 저장소 접근을 차단했습니다.</li>
          <li>저장된 인바디 사진 23건을 2026-10-19에 삭제했습니다.</li>
          <li>지금은 인증에 체지방률 숫자만 받습니다. 사진은 받지 않습니다.</li>
        </Typography>

        <Typography variant="h6" component="h2" gutterBottom>
          정보주체의 권리
        </Typography>
        <Typography variant="body2" sx={{ mb: 2 }}>
          본인 정보에 대해 열람, 정정, 삭제, 처리정지를 요청할 수 있습니다. 체지방 숫자
          등 남아 있는 기록의 삭제도 같은 권리로 요청할 수 있습니다.
        </Typography>

        <Typography variant="h6" component="h2" gutterBottom>
          문의
        </Typography>
        <Typography variant="body2">
          연락 창구는 이 안내 페이지입니다. WodyBody 운영자(대표)가 요청을 받습니다.
          참가자 테이블에는 이메일·전화번호가 없어 개별 메시지를 보내지 않습니다.
          대결을 만든 분이 따로 연락할 수 있으면, 그 경로로 이 안내를 전해 주셔도 됩니다.
          공개 대표 메일 주소는 이 저장소에 없어 여기에 적지 않았습니다. 소유자가 주소를
          정하면 이 문단만 고칩니다.
        </Typography>
      </Box>
    </Box>
  );
}
