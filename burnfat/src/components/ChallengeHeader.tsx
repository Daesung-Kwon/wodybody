import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import EditIcon from '@mui/icons-material/Edit';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import type { Challenge } from '../types';
import type { DDayDisplay } from '../lib/challengeSchedule';
import DDayChip from './DDayChip';

interface ChallengeHeaderProps {
  challenge: Challenge;
  dday: DDayDisplay;
  /** 챌린지 정보 수정 진입 (PIN 게이팅은 호출 측에서 처리). */
  onEditClick: () => void;
  /** 대결 URL 복사. */
  onCopyShare: () => void;
}

/**
 * Sprint 3 Phase B — ChallengePage 상단 헤더.
 * 제목·기간·참가비·대결 코드 + D-Day 칩 + 수정/복사 버튼.
 */
export default function ChallengeHeader({
  challenge,
  dday,
  onEditClick,
  onCopyShare,
}: ChallengeHeaderProps) {
  return (
    <Box sx={{ px: 2, pb: 2 }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 1,
        }}
      >
        <Box>
          <Typography variant="h5" fontWeight={700} gutterBottom>
            {challenge.title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {challenge.start_date} ~ {challenge.end_date} · 참가비{' '}
            {challenge.stake_amount.toLocaleString()}원
          </Typography>
          <Typography variant="body2" color="text.secondary">
            대결 코드: <strong>{challenge.code}</strong>
          </Typography>
        </Box>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: 0.5,
          }}
        >
          <DDayChip dday={dday} />
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Tooltip title="챌린지 정보 수정">
              <IconButton
                onClick={onEditClick}
                size="small"
                color="default"
                aria-label="챌린지 정보 수정"
              >
                <EditIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="URL 복사">
              <IconButton
                onClick={onCopyShare}
                color="primary"
                size="small"
                aria-label="대결 URL 복사"
              >
                <ContentCopyIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
