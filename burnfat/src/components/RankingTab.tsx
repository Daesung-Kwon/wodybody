import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Tooltip from '@mui/material/Tooltip';
import ShareIcon from '@mui/icons-material/Share';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import LockIcon from '@mui/icons-material/Lock';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import type { Challenge, ParticipantWithSubmissions, RankingRow } from '../types';
import { RankOneRow, RankMedal } from '../theme/rankAnimations';
import RankingShareDialog from './RankingShareDialog';

// Sprint 0.4: 디버그 플래그 — 운영 빌드에서는 미설정/"false".
const DEBUG_SHOW_RANKING =
  (import.meta.env.VITE_DEBUG_SHOW_RANKING ?? '').toLowerCase() === 'true';

interface RankingTabProps {
  ranking: RankingRow[];
  participants: ParticipantWithSubmissions[];
  challenge: Challenge;
  /** 결과 공유 카드용 대결 URL. */
  shareUrl: string;
  /** 중간 순위 공개/잠금 토글 (PIN 게이팅은 호출 측에서 처리). */
  onUnlockRanking: () => void;
  onToast: (msg: string) => void;
}

/**
 * Sprint 3 Phase B — ChallengePage Tab 1 (순위).
 * 종료 인증 진행 상태 + 중간 공개 토글 + 체지방 감소율 순위표.
 */
export default function RankingTab({
  ranking,
  participants,
  challenge,
  shareUrl,
  onUnlockRanking,
  onToast,
}: RankingTabProps) {
  const [shareOpen, setShareOpen] = useState(false);
  const participantsWithStart = participants.filter((p) =>
    p.submissions.some((s) => s.type === 'start')
  );
  const allEndComplete =
    participantsWithStart.length > 0 &&
    participantsWithStart.every((p) => p.submissions.some((s) => s.type === 'end'));
  const showRanking =
    allEndComplete || (challenge.ranking_unlocked ?? false) || DEBUG_SHOW_RANKING;

  return (
    <Box sx={{ px: 2, pt: 2 }}>
      {/* 종료 인증 진행 상태 + 중간 순위 공개 토글 */}
      {!allEndComplete && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
            mb: 2,
            p: 1.5,
            bgcolor: showRanking ? 'warning.50' : 'grey.50',
            borderRadius: 1.5,
            border: '1px solid',
            borderColor: showRanking ? 'warning.200' : 'grey.200',
          }}
        >
          <Box>
            <Typography variant="body2" fontWeight={500}>
              종료 인증{' '}
              {participantsWithStart.filter((p) =>
                p.submissions.some((s) => s.type === 'end')
              ).length}{' '}
              / {participantsWithStart.length}명 완료
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {showRanking ? '현재 중간 순위 공개 중' : '전원 완료 시 자동 공개'}
            </Typography>
          </Box>
          <Button
            variant={showRanking ? 'contained' : 'outlined'}
            size="small"
            startIcon={showRanking ? <LockIcon /> : <LockOpenIcon />}
            onClick={onUnlockRanking}
            color="warning"
            sx={{ flexShrink: 0 }}
          >
            {showRanking ? '순위 잠금' : '중간 공개'}
            {challenge.has_admin_pin && (
              <LockIcon sx={{ fontSize: 12, ml: 0.5, opacity: 0.6 }} />
            )}
          </Button>
        </Box>
      )}
      {!showRanking ? (
        <Typography color="text.secondary" sx={{ textAlign: 'center', py: 6 }}>
          종료 인증이 완료되면 순위가 공개됩니다.
        </Typography>
      ) : ranking.length === 0 ? (
        <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
          시작·종료 인증을 모두 마친 참가자가 있을 때 순위가 표시됩니다.
        </Typography>
      ) : (
        <>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              mb: 2,
              gap: 1,
            }}
          >
            <Box
              sx={{
                p: 1.5,
                bgcolor: 'grey.50',
                borderRadius: 1.5,
                border: '1px solid',
                borderColor: 'grey.200',
                flex: 1,
              }}
            >
              <Typography variant="caption" color="text.secondary">
                💡 감소율 = (시작 − 종료) ÷ 시작 × 100
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
                sx={{ mt: 0.25 }}
              >
                시작 체지방에 관계없이 공정하게 비교하는 상대 감소율입니다.
              </Typography>
            </Box>
            <Button
              variant="outlined"
              size="small"
              startIcon={<ShareIcon />}
              onClick={() => setShareOpen(true)}
              sx={{ flexShrink: 0, minHeight: 44 }}
            >
              결과 공유
            </Button>
          </Box>
          <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
            <Table size="small" sx={{ tableLayout: 'fixed', width: '100%' }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 64, whiteSpace: 'nowrap' }}>순위</TableCell>
                  <TableCell>닉네임</TableCell>
                  <TableCell align="right" sx={{ width: 64 }}>
                    시작
                  </TableCell>
                  <TableCell align="right" sx={{ width: 64 }}>
                    종료
                  </TableCell>
                  <TableCell align="right" sx={{ width: 80 }}>
                    <Tooltip title="감소율 = (시작 − 종료) ÷ 시작 × 100" arrow>
                      <Box
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 0.5,
                          cursor: 'help',
                        }}
                      >
                        감소율
                        <InfoOutlinedIcon sx={{ fontSize: 13, opacity: 0.55 }} />
                      </Box>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {ranking.map((r) => {
                  const medal =
                    r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : null;
                  const isFirst = r.rank === 1;
                  const RowComp = isFirst ? RankOneRow : TableRow;
                  return (
                    <RowComp
                      key={r.nickname}
                      sx={!isFirst && r.rank <= 3 ? { bgcolor: 'success.50' } : undefined}
                    >
                      <TableCell sx={{ width: 64, verticalAlign: 'middle' }}>
                        {medal ? (
                          <RankMedal role="img" aria-label={`${r.rank}위`} twinkle={isFirst}>
                            {medal}
                          </RankMedal>
                        ) : (
                          r.rank
                        )}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: r.rank === 1 ? 700 : 400,
                          color: isFirst ? '#92400e' : 'inherit',
                          verticalAlign: 'middle',
                          overflow: 'hidden',
                        }}
                      >
                        <Box
                          sx={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {r.nickname}
                        </Box>
                      </TableCell>
                      <TableCell align="right" sx={{ verticalAlign: 'middle' }}>
                        {r.startBodyFat.toFixed(1)}%
                      </TableCell>
                      <TableCell align="right" sx={{ verticalAlign: 'middle' }}>
                        {r.endBodyFat.toFixed(1)}%
                      </TableCell>
                      <TableCell align="right" sx={{ verticalAlign: 'middle' }}>
                        <Typography
                          component="span"
                          sx={{
                            color: isFirst ? '#b45309' : 'success.main',
                            fontWeight: isFirst ? 700 : 600,
                            textShadow: isFirst ? '0 0 8px rgba(245, 158, 11, 0.5)' : 'none',
                          }}
                        >
                          -{r.reductionRate.toFixed(2)}%
                        </Typography>
                      </TableCell>
                    </RowComp>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
      {/* Sprint 1: 랭킹 공유 (PNG + 텍스트) */}
      {shareOpen && (
        <RankingShareDialog
          open={shareOpen}
          challenge={challenge}
          ranking={ranking}
          participantCount={participants.length}
          shareUrl={shareUrl}
          onClose={() => setShareOpen(false)}
          onToast={onToast}
        />
      )}
    </Box>
  );
}
