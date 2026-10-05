import { useEffect, useRef, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Chip from '@mui/material/Chip';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import Divider from '@mui/material/Divider';
import ListSubheader from '@mui/material/ListSubheader';
import LinearProgress from '@mui/material/LinearProgress';
import CircularProgress from '@mui/material/CircularProgress';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import SendIcon from '@mui/icons-material/Send';
import PsychologyIcon from '@mui/icons-material/Psychology';
import CheckIcon from '@mui/icons-material/Check';
import AddCommentIcon from '@mui/icons-material/AddComment';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import type { CoachPersona, Participant } from '../types';
import { useCoachSession } from '../hooks/useCoachSession';
import CoachMessageBubble from './CoachMessageBubble';
import { track } from '../lib/analytics';

interface Props {
  open: boolean;
  onClose: () => void;
  participant: Participant;
  weekNo: number;
  /** AIAdviceCard 의 현재 조언 — 새 세션 첫 시드 메시지. */
  seedContent: string;
}

const PERSONA_LABELS: Record<CoachPersona, string> = {
  friendly: '친근한 코치',
  strict: '엄격한 코치',
  scientist: '과학적인 코치',
};

const QUICK_REPLIES = [
  '이번 주 정체 이유가 뭘까요?',
  '내일 식단 3가지 추천해줘',
  '운동 강도를 조절해야 할까요?',
];

/**
 * Sprint 2.5 — 대화형 코치 모달.
 * 모바일 fullScreen / 데스크톱 md 다이얼로그. SSE 스트리밍 멀티턴 대화.
 */
export default function CoachChatDialog({ open, onClose, participant, weekNo, seedContent }: Props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  const coach = useCoachSession({
    participantId: participant.id,
    weekNo,
    seedContent,
    open,
  });

  const [input, setInput] = useState('');
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const trackedOpenRef = useRef(false);

  // 모달 첫 진입 1회만 측정 (재오픈/리렌더 시 중복 전송 방지).
  useEffect(() => {
    if (open && !trackedOpenRef.current) {
      trackedOpenRef.current = true;
      track('coach_modal_opened', { week_no: weekNo, persona: coach.persona });
    }
  }, [open, weekNo, coach.persona]);

  // 새 메시지/스트리밍 시 자동 스크롤
  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'end',
    });
  }, [coach.messages, coach.streaming, prefersReducedMotion]);

  const handleSend = (text: string) => {
    if (!text.trim() || coach.sending) return;
    setInput('');
    void coach.send(text);
  };

  const closeMenu = () => setMenuAnchor(null);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={isMobile}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          height: isMobile ? '100%' : '80vh',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      {/* 헤더 */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 2,
          py: 1.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <PsychologyIcon color="primary" aria-hidden />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle2" fontWeight={700} noWrap>
            Grok 코치 · {participant.nickname}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {weekNo}주차 · {PERSONA_LABELS[coach.persona]}
          </Typography>
        </Box>
        <IconButton
          aria-label="코치 메뉴"
          onClick={(e) => setMenuAnchor(e.currentTarget)}
          size="small"
        >
          <MoreVertIcon />
        </IconButton>
        <IconButton aria-label="코치 대화 닫기" onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </Box>

      <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={closeMenu}>
        <ListSubheader sx={{ lineHeight: '32px' }}>코치 톤</ListSubheader>
        {(Object.keys(PERSONA_LABELS) as CoachPersona[]).map((p) => (
          <MenuItem
            key={p}
            selected={coach.persona === p}
            onClick={() => {
              coach.changePersona(p);
              closeMenu();
            }}
          >
            <ListItemIcon>{coach.persona === p ? <CheckIcon fontSize="small" /> : null}</ListItemIcon>
            {PERSONA_LABELS[p]}
          </MenuItem>
        ))}
        <Divider />
        <MenuItem
          onClick={() => {
            closeMenu();
            void coach.startNewChat();
          }}
        >
          <ListItemIcon>
            <AddCommentIcon fontSize="small" />
          </ListItemIcon>
          새 대화 시작
        </MenuItem>
        <MenuItem
          onClick={() => {
            closeMenu();
            setConfirmReset(true);
          }}
        >
          <ListItemIcon>
            <DeleteSweepIcon fontSize="small" color="error" />
          </ListItemIcon>
          <Typography color="error">기억 초기화</Typography>
        </MenuItem>
      </Menu>

      {/* 본문 — 메시지 리스트 */}
      <DialogContent sx={{ flex: 1, overflowY: 'auto', px: 2, py: 1.5, bgcolor: 'background.default' }}>
        {coach.loading ? (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, py: 6 }}>
            <CircularProgress size={20} />
            <Typography variant="body2" color="text.secondary">
              지난 대화를 불러오는 중...
            </Typography>
          </Box>
        ) : (
          <>
            {coach.messages.map((m) => (
              <CoachMessageBubble key={m.id} message={m} />
            ))}
            {coach.streaming && (
              <CoachMessageBubble
                message={{ id: 'streaming', role: 'assistant', content: coach.streaming, references: [] }}
              />
            )}
            {coach.sending && !coach.streaming && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
                <CircularProgress size={14} />
                <Typography variant="caption" color="text.secondary">
                  코치가 생각하고 있어요...
                </Typography>
              </Box>
            )}
            {coach.error && (
              <Box sx={{ p: 1.5, my: 1, bgcolor: 'error.50', borderRadius: 1.5 }}>
                <Typography variant="body2" color="error.main">
                  {coach.error}
                </Typography>
              </Box>
            )}
            <div ref={bottomRef} />
          </>
        )}
      </DialogContent>

      {/* 푸터 */}
      <Box sx={{ borderTop: '1px solid', borderColor: 'divider', px: 2, pt: 1, pb: 1.5 }}>
        {coach.weekUsage && (
          <Box sx={{ mb: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
              <Typography variant="caption" color="text.secondary">
                이번 주 코치 대화
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {coach.weekUsage.used}/{coach.weekUsage.limit}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={Math.min(100, (coach.weekUsage.used / coach.weekUsage.limit) * 100)}
              aria-label="이번 주 코치 대화 사용량"
              sx={{ height: 5, borderRadius: 3 }}
            />
          </Box>
        )}

        {/* 빠른 답변 칩 */}
        {!coach.sending && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
            {QUICK_REPLIES.map((q) => (
              <Chip
                key={q}
                label={q}
                size="small"
                variant="outlined"
                onClick={() => handleSend(q)}
                sx={{ minHeight: 30 }}
              />
            ))}
          </Box>
        )}

        <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
          <TextField
            fullWidth
            size="small"
            multiline
            minRows={1}
            maxRows={5}
            placeholder="코치에게 물어보세요"
            value={input}
            onChange={(e) => setInput(e.target.value.slice(0, 1000))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend(input);
              }
            }}
            disabled={coach.sending}
            helperText={input.length >= 900 ? `${input.length}/1000자` : undefined}
          />
          <IconButton
            color="primary"
            aria-label="메시지 전송"
            onClick={() => handleSend(input)}
            disabled={coach.sending || !input.trim()}
            sx={{ mb: input.length >= 900 ? 2.5 : 0.25 }}
          >
            <SendIcon />
          </IconButton>
        </Box>
      </Box>

      {/* 기억 초기화 확인 */}
      <Dialog open={confirmReset} onClose={() => setConfirmReset(false)} maxWidth="xs" fullWidth>
        <Box sx={{ p: 2.5 }}>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>
            기억을 초기화할까요?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            코치가 기억하던 지난 약속·패턴이 모두 삭제되고, 진행 중인 대화도 종료됩니다. 되돌릴 수 없어요.
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button color="inherit" onClick={() => setConfirmReset(false)}>
              취소
            </Button>
            <Button
              color="error"
              variant="contained"
              onClick={() => {
                setConfirmReset(false);
                void coach.resetMemory();
              }}
            >
              초기화
            </Button>
          </Box>
        </Box>
      </Dialog>
    </Dialog>
  );
}
