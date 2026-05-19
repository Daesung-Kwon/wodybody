import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import type { ParticipantWithSubmissions } from '../types';
import { resolveImageUrl } from '../lib/signedImage';
import { EndAuthButton } from '../theme/rankAnimations';

interface ParticipantsTabProps {
  participants: ParticipantWithSubmissions[];
  /** 전 참가자의 종료 인증이 끝났는지 — 종료 인증 값 노출 여부를 결정. */
  allEndComplete: boolean;
  onAuthStart: (p: ParticipantWithSubmissions) => void;
  onAuthEnd: (p: ParticipantWithSubmissions) => void;
  onOpenBasicInfo: (p: ParticipantWithSubmissions) => void;
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
 * 시작 체지방률 내림차순으로 정렬해 인증 진행 상태를 보여 준다.
 */
export default function ParticipantsTab({
  participants,
  allEndComplete,
  onAuthStart,
  onAuthEnd,
  onOpenBasicInfo,
  onToast,
}: ParticipantsTabProps) {
  const participantsWithRank = [...participants]
    .map((p) => {
      const start = p.submissions.find((s) => s.type === 'start');
      const startBodyFat = start ? Number(start.body_fat_rate) : null;
      return { ...p, startBodyFat };
    })
    .sort((a, b) => {
      if (a.startBodyFat == null && b.startBodyFat == null) return 0;
      if (a.startBodyFat == null) return 1;
      if (b.startBodyFat == null) return -1;
      return b.startBodyFat - a.startBodyFat;
    });
  const topStartBodyFat =
    participantsWithRank.find((p) => p.startBodyFat != null)?.startBodyFat ?? null;

  return (
    <Box sx={{ px: 2, pt: 2 }}>
      {participantsWithRank.map((p, idx) => {
        const gap =
          topStartBodyFat != null && p.startBodyFat != null
            ? topStartBodyFat - p.startBodyFat
            : null;
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
                    {p.startBodyFat != null ? `#${idx + 1}` : '-'}
                  </Typography>
                  <Typography fontWeight={600}>{p.nickname}</Typography>
                  {gap != null && gap > 0 && (
                    <Typography
                      variant="caption"
                      sx={{
                        color: 'warning.main',
                        fontWeight: 600,
                        bgcolor: 'warning.50',
                        px: 1,
                        py: 0.25,
                        borderRadius: 1,
                      }}
                    >
                      1등과 격차 +{gap.toFixed(1)}%p
                    </Typography>
                  )}
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
                          <strong>{Number(s.body_fat_rate).toFixed(1)}%</strong>
                        </Typography>
                        {s.image_url ? (
                          <Tooltip title="탭하여 이미지 보기">
                            <Button
                              size="small"
                              variant="outlined"
                              color="primary"
                              startIcon={<PhotoCameraIcon sx={{ fontSize: 14 }} />}
                              sx={{
                                minHeight: 28,
                                minWidth: 40,
                                py: 0.25,
                                px: 0.75,
                                fontSize: '0.75rem',
                                flexShrink: 0,
                              }}
                              aria-label="인증 이미지 보기"
                              onClick={async () => {
                                // Sprint 0.3: storage path → signed URL (7일)
                                const url = await resolveImageUrl(s.image_url);
                                if (!url) {
                                  onToast('이미지를 불러오지 못했습니다.');
                                  return;
                                }
                                window.open(url, '_blank', 'noopener,noreferrer');
                              }}
                            >
                              보기
                            </Button>
                          </Tooltip>
                        ) : null}
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
