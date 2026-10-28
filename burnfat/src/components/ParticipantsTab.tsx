import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import type { ParticipantWithSubmissions } from '../types';
import { EndAuthButton } from '../theme/rankAnimations';
import { canViewSubmissionBodyFat, formatBodyFatPercent } from '../lib/bodyFatVisibility';

interface ParticipantsTabProps {
  /**
   * 대결방 코드. 인증 이미지 표시를 내린 뒤(2026-10-19, 사진 미수집) 이 컴포넌트에서는 쓰지 않는다.
   * 호출부 호환을 위해 prop 은 유지.
   */
  challengeCode: string;
  participants: ParticipantWithSubmissions[];
  /** 전 참가자의 종료 인증이 끝났는지 — 종료 인증 값 노출 여부를 결정. */
  allEndComplete: boolean;
  onAuthStart: (p: ParticipantWithSubmissions) => void;
  onAuthEnd: (p: ParticipantWithSubmissions) => void;
  onOpenBasicInfo: (p: ParticipantWithSubmissions) => void;
  /** 사진 표시 제거 후 이 컴포넌트에서는 쓰지 않는다. 호출부 호환을 위해 유지. */
  onToast: (msg: string) => void;
}

// 종료 인증 버튼의 참가자별 글로우 색 — id 해시로 안정적으로 배정.
const END_BTN_COLORS = [
  { main: '#16a34a', glow: 'rgba(22, 163, 74, 0.5)' },
  { main: '#2563eb', glow: 'rgba(37, 99, 235, 0.5)' },
  { main: '#7c3aed', glow: 'rgba(124, 58, 237, 0.5)' },
  { main: '#db2777', glow: 'rgba(219, 39, 119, 0.5)' },
  { main: '#ea580c', glow: 'rgba(234, 88, 12, 0.5)' },
  { main: '#0891b2', glow: 'rgba(8, 145, 178, 0.5)' },
  { main: '#059669', glow: 'rgba(5, 150, 105, 0.5)' },
  { main: '#ca8a04', glow: 'rgba(202, 138, 4, 0.5)' },
];
const getEndBtnColor = (participantId: string) => {
  let hash = 0;
  for (let i = 0; i < participantId.length; i++)
    hash = (hash << 5) - hash + participantId.charCodeAt(i);
  return END_BTN_COLORS[Math.abs(hash) % END_BTN_COLORS.length];
};

/**
 * Sprint 3 Phase B — ChallengePage Tab 0 (참가자 / 인증) 의 카드 목록.
 * 닉네임 순으로 보여 준다. 체지방 숫자로 줄을 세우면 가린 값이 순서로 드러난다.
 */
export default function ParticipantsTab({
  participants,
  allEndComplete,
  onAuthStart,
  onAuthEnd,
  onOpenBasicInfo,
}: ParticipantsTabProps) {
  const participantsWithRank = [...participants].sort((a, b) =>
    a.nickname.localeCompare(b.nickname, 'ko')
  );

  return (
    <Box sx={{ px: 2, pt: 2 }}>
      {participantsWithRank.map((p) => {
        return (
          <Card key={p.id} sx={{ mb: 2 }}>
            <CardContent sx={{ p: 2 }}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 1,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ minWidth: 24 }}>
                    ·
                  </Typography>
                  <Typography fontWeight={600}>{p.nickname}</Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Tooltip title="기본정보 수정">
                    <IconButton
                      size="small"
                      onClick={() => onOpenBasicInfo(p)}
                      sx={{ p: 0.5, minWidth: 44, minHeight: 44 }}
                      aria-label={`${p.nickname} 기본정보 수정`}
                    >
                      <EditIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Tooltip>
                  {!p.submissions.some((s) => s.type === 'start') && (
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<AddIcon sx={{ fontSize: 16 }} />}
                      onClick={() => onAuthStart(p)}
                      sx={{ minHeight: 44, py: 0.75, px: 1.5, fontSize: '0.8125rem' }}
                    >
                      시작일 인증
                    </Button>
                  )}
                  {!p.submissions.some((s) => s.type === 'end') &&
                    (() => {
                      const { main, glow } = getEndBtnColor(p.id);
                      const glowDim = glow.replace('0.5)', '0.4)');
                      return (
                        <EndAuthButton
                          size="small"
                          variant="outlined"
                          startIcon={<AddIcon sx={{ fontSize: 16 }} />}
                          onClick={() => onAuthEnd(p)}
                          glowMain={main}
                          glow={glow}
                          glowDim={glowDim}
                        >
                          종료일 인증
                        </EndAuthButton>
                      );
                    })()}
                </Box>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 1 }}>
                {[...p.submissions]
                  .sort((a, b) => (a.type === 'start' ? 0 : 1) - (b.type === 'start' ? 0 : 1))
                  .map((s) => {
                    if (s.type === 'end' && !allEndComplete) {
                      return (
                        <Box
                          key={s.id}
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <Typography variant="body2" color="text.secondary">
                            종료: <span style={{ opacity: 0.7 }}>인증 완료</span>
                          </Typography>
                        </Box>
                      );
                    }
                    return (
                      <Box
                        key={s.id}
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 1,
                        }}
                      >
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ flex: '1 1 auto', minWidth: 0 }}
                        >
                          {s.type === 'start' ? '시작' : '종료'}: 체지방률{' '}
                          <strong>
                            {formatBodyFatPercent(
                              s.body_fat_rate,
                              canViewSubmissionBodyFat(s.id)
                            )}
                          </strong>
                        </Typography>
                        {/* 인증 사진 표시는 내렸다 (2026-10-19 결정: 숫자만, 사진 미수집). 기존 파일은 삭제 절차 대상. */}
                      </Box>
                    );
                  })}
              </Box>
            </CardContent>
          </Card>
        );
      })}
      {participants.length === 0 && (
        <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
          아직 참가자가 없습니다. 위에서 닉네임을 입력해 참가하세요.
        </Typography>
      )}
    </Box>
  );
}
