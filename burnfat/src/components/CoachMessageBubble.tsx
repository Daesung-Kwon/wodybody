import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import PsychologyIcon from '@mui/icons-material/Psychology';
import EventNoteIcon from '@mui/icons-material/EventNote';
import { stripRefMarkers } from '../lib/coachClient';
import type { CoachUiMessage } from '../hooks/useCoachSession';

interface Props {
  message: CoachUiMessage;
}

/**
 * Sprint 2.5 — 코치 대화 풍선.
 * assistant 는 좌측, user 는 우측. assistant 메시지에 인용 주차 칩(📍 N주차) 노출.
 */
export default function CoachMessageBubble({ message }: Props) {
  const isUser = message.role === 'user';
  const text = stripRefMarkers(message.content);
  const weekRefs = message.references
    .map((r) => r.week_no)
    .filter((w): w is number => typeof w === 'number');

  return (
    <Box
      role="article"
      aria-label={isUser ? '내 메시지' : '코치 메시지'}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isUser ? 'flex-end' : 'flex-start',
        mb: 1.25,
      }}
    >
      {!isUser && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.25 }}>
          <PsychologyIcon sx={{ fontSize: 15, color: 'primary.main' }} aria-hidden />
          <Typography variant="caption" color="primary.dark" fontWeight={600}>
            Grok 코치
          </Typography>
        </Box>
      )}
      <Box
        sx={{
          maxWidth: '85%',
          px: 1.5,
          py: 1,
          borderRadius: 2,
          bgcolor: isUser ? 'primary.main' : 'grey.100',
          color: isUser ? 'primary.contrastText' : 'text.primary',
          borderTopRightRadius: isUser ? 4 : 16,
          borderTopLeftRadius: isUser ? 16 : 4,
        }}
      >
        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {text}
        </Typography>
      </Box>
      {!isUser && weekRefs.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
          {weekRefs.map((w) => (
            <Chip
              key={w}
              size="small"
              variant="outlined"
              icon={<EventNoteIcon sx={{ fontSize: 14 }} />}
              label={`${w}주차 기록`}
              aria-label={`근거: ${w}주차 기록`}
              sx={{ height: 22, fontSize: '0.6875rem' }}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}
