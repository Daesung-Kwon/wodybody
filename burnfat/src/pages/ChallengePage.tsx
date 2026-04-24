import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import ShareIcon from '@mui/icons-material/Share';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import LockIcon from '@mui/icons-material/Lock';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Snackbar from '@mui/material/Snackbar';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import InputAdornment from '@mui/material/InputAdornment';
import { supabase } from '../lib/supabase';
import type { Challenge, ParticipantWithSubmissions, RankingRow } from '../types';
import SubmitModal from '../components/SubmitModal';
import ParticipantBasicInfoDialog from '../components/ParticipantBasicInfoDialog';
import WeeklyLogForm from '../components/WeeklyLogForm';
import AllParticipantsChart from '../components/AllParticipantsChart';
import RecordStatusSummary from '../components/RecordStatusSummary';
import ParticipantWeeklyLogCard from '../components/ParticipantWeeklyLogCard';
import { useAllWeeklyLogsForChallenge } from '../hooks/useWeeklyLogs';
import { useRecordStatus } from '../hooks/useRecordStatus';

const DEBUG_SHOW_RANKING = false; // 테스트용: true면 순위 항상 공개
const DEBUG_ALLOW_EARLY_END_SUBMIT = false; // 테스트용: true면 종료일 전에도 인증 진행

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
  for (let i = 0; i < participantId.length; i++) hash = (hash << 5) - hash + participantId.charCodeAt(i);
  return END_BTN_COLORS[Math.abs(hash) % END_BTN_COLORS.length];
};

export default function ChallengePage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [participants, setParticipants] = useState<ParticipantWithSubmissions[]>([]);
  const [ranking, setRanking] = useState<RankingRow[]>([]);
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [joinNickname, setJoinNickname] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [basicInfoDialog, setBasicInfoDialog] = useState<ParticipantWithSubmissions | null>(null);
  const [basicInfoDialogAfterJoin, setBasicInfoDialogAfterJoin] = useState(false);
  const [weeklyLogParticipant, setWeeklyLogParticipant] = useState<ParticipantWithSubmissions | null>(null);
  const [submitModal, setSubmitModal] = useState<{
    open: boolean;
    participantId: string;
    participantNickname: string;
    type: 'start' | 'end';
  } | null>(null);
  const [snackbar, setSnackbar] = useState(false);
  const [earlyEndBlockSnackbar, setEarlyEndBlockSnackbar] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [pinDialog, setPinDialog] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  const fetchChallenge = useCallback(async () => {
    if (!code) {
      setLoading(false);
      return;
    }
    const { data, error: err } = await supabase.from('challenges').select('*').eq('code', code.toUpperCase()).single();
    if (err || !data) {
      setError('대결을 찾을 수 없습니다.');
      setChallenge(null);
    } else {
      setChallenge(data as Challenge);
      setError('');
    }
    setLoading(false);
  }, [code]);

  const fetchParticipants = useCallback(async () => {
    if (!challenge) return;
    const { data: parts } = await supabase.from('participants').select('*').eq('challenge_id', challenge.id).order('created_at');
    if (!parts?.length) {
      setParticipants([]);
      setRanking([]);
      return;
    }

    const withSubs: ParticipantWithSubmissions[] = await Promise.all(
      parts.map(async (p) => {
        const { data: subs } = await supabase.from('submissions').select('*').eq('participant_id', p.id);
        return { ...p, submissions: subs || [] } as ParticipantWithSubmissions;
      })
    );
    setParticipants(withSubs);

    const rows: RankingRow[] = withSubs
      .map((p) => {
        const start = p.submissions.find((s) => s.type === 'start');
        const end = p.submissions.find((s) => s.type === 'end');
        if (!start || !end) return null;
        const startVal = Number(start.body_fat_rate);
        const endVal = Number(end.body_fat_rate);
        // (시작 - 종료) / 시작 × 100 → 시작 체지방 대비 상대 감소율
        const reductionRate = startVal > 0
          ? Math.round(((startVal - endVal) / startVal) * 10000) / 100
          : 0;
        return {
          rank: 0,
          nickname: p.nickname,
          startBodyFat: Math.round(startVal * 10) / 10,
          endBodyFat: Math.round(endVal * 10) / 10,
          reductionRate,
        };
      })
      .filter((r): r is RankingRow => r !== null)
      .sort((a, b) => b.reductionRate - a.reductionRate)
      .map((r, i) => ({ ...r, rank: i + 1 }));
    setRanking(rows);
  }, [challenge]);

  useEffect(() => {
    fetchChallenge();
  }, [fetchChallenge]);

  useEffect(() => {
    fetchParticipants();
  }, [fetchParticipants]);

  const shareUrl = challenge ? `${window.location.origin}/c/${challenge.code}` : '';
  const handleCopyShare = () => {
    navigator.clipboard.writeText(shareUrl).then(() => setSnackbar(true));
  };

  const handleShareRanking = () => {
    if (!challenge || ranking.length === 0) return;
    const medal = (n: number) => n === 1 ? '🥇' : n === 2 ? '🥈' : n === 3 ? '🥉' : `${n}위`;
    const lines = [
      `🔥 BurnFat 대결 결과`,
      `📌 ${challenge.title}`,
      `📅 ${challenge.start_date} ~ ${challenge.end_date}`,
      '',
      ...ranking.map((r) => `${medal(r.rank)} ${r.nickname}  -${r.reductionRate.toFixed(2)}%`),
      '',
      `🔗 ${shareUrl}`,
    ];
    navigator.clipboard.writeText(lines.join('\n')).then(() =>
      setToast('결과가 클립보드에 복사되었습니다')
    );
  };

  const handleUnlockRanking = () => {
    if (!challenge) return;
    // PIN이 설정된 경우 다이얼로그로 검증
    if (challenge.admin_pin) {
      setPinInput('');
      setPinError('');
      setPinDialog(true);
    } else {
      doToggleRanking();
    }
  };

  const doToggleRanking = async () => {
    if (!challenge) return;
    const next = !(challenge.ranking_unlocked ?? false);
    try {
      const { error } = await supabase
        .from('challenges')
        .update({ ranking_unlocked: next })
        .eq('id', challenge.id);
      if (error) {
        setToast('설정 실패: Supabase 마이그레이션을 먼저 실행하세요');
        return;
      }
      setChallenge({ ...challenge, ranking_unlocked: next });
      setToast(next ? '중간 순위가 공개되었습니다' : '순위가 다시 잠겼습니다');
    } catch {
      setToast('순위 공개 설정 중 오류가 발생했습니다');
    }
  };

  const handlePinSubmit = () => {
    if (!challenge) return;
    if (pinInput !== challenge.admin_pin) {
      setPinError('PIN이 올바르지 않습니다.');
      return;
    }
    setPinDialog(false);
    doToggleRanking();
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!challenge || !joinNickname.trim()) return;
    setJoinLoading(true);
    const { data: newParticipant, error: err } = await supabase
      .from('participants')
      .insert({ challenge_id: challenge.id, nickname: joinNickname.trim() })
      .select()
      .single();
    setJoinLoading(false);
    if (err) {
      setError(err.message.includes('unique') ? '이미 등록된 닉네임입니다.' : err.message);
      return;
    }
    setError('');
    setJoinNickname('');
    fetchParticipants();
    setBasicInfoDialog({ ...(newParticipant as ParticipantWithSubmissions), submissions: [] });
    setBasicInfoDialogAfterJoin(true);
  };

  const participantIds = participants.map((p) => p.id);
  const { logsByParticipant, refetch: refetchLogs } = useAllWeeklyLogsForChallenge(participantIds);
  const recordStatus = useRecordStatus(participants, logsByParticipant, challenge?.start_date || '');

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography>로딩 중...</Typography>
      </Box>
    );
  }

  if (!challenge) {
    return (
      <Box sx={{ p: 3 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/')}>
          홈
        </Button>
        <Typography color="error" sx={{ mt: 2 }}>{error}</Typography>
      </Box>
    );
  }

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const endDateOnly = (challenge.end_date || '').split('T')[0].slice(0, 10);
  const isBeforeStartDate = challenge.start_date > today;
  // end_date가 없으면 안전하게 차단(모달 열지 않음). 빈 문자열일 때 '' > today 는 false가 되어 잘못 모달이 열리는 버그 방지
  const isBeforeEndDate = !endDateOnly ? true : endDateOnly > today;

  const participantsWithStart = participants.filter((p) => p.submissions.some((s) => s.type === 'start'));
  const allEndComplete = participantsWithStart.length > 0 && participantsWithStart.every((p) =>
    p.submissions.some((s) => s.type === 'end')
  );
  const showRanking = allEndComplete || (challenge?.ranking_unlocked ?? false) || DEBUG_SHOW_RANKING;

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
  const topStartBodyFat = participantsWithRank.find((p) => p.startBodyFat != null)?.startBodyFat ?? null;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: 4 }}>
      <Box sx={{ p: 2 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/')}>
          홈
        </Button>
      </Box>

      <Box sx={{ px: 2, pb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
          <Box>
            <Typography variant="h5" fontWeight={700} gutterBottom>
              {challenge.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {challenge.start_date} ~ {challenge.end_date} · 참가비 {challenge.stake_amount.toLocaleString()}원
            </Typography>
            <Typography variant="body2" color="text.secondary">
              대결 코드: <strong>{challenge.code}</strong>
            </Typography>
          </Box>
          <Tooltip title="URL 복사">
            <IconButton onClick={handleCopyShare} color="primary" size="small">
              <ContentCopyIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {tab === 0 && (
        <Card sx={{ mx: 2, mb: 2 }}>
          <CardContent sx={{ p: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              참가하기
            </Typography>
            <form onSubmit={handleJoin} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <TextField
                size="small"
                placeholder="닉네임"
                value={joinNickname}
                onChange={(e) => setJoinNickname(e.target.value)}
                sx={{ flex: 1, minWidth: 0, '& .MuiInputBase-root': { minHeight: 40 } }}
              />
              <Button type="submit" variant="contained" size="small" disabled={joinLoading || !joinNickname.trim()} sx={{ minWidth: 80, minHeight: 40 }}>
                참가
              </Button>
            </form>
            {error && (
              <Typography color="error" variant="caption" sx={{ mt: 1, display: 'block' }}>
                {error}
              </Typography>
            )}
          </CardContent>
        </Card>
      )}

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{
          px: 2,
          position: 'sticky',
          top: 0,
          zIndex: 10,
          bgcolor: 'background.default',
          borderBottom: 1,
          borderColor: 'divider',
          '& .MuiTab-root': { minHeight: 48 },
          '& .MuiTabs-flexContainer': { gap: 0 },
        }}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
      >
        <Tab label="참가자 / 인증" />
        <Tab label="순위" />
        <Tab label="주간 기록" />
      </Tabs>

      {tab === 0 && (
        <Box sx={{ px: 2, pt: 2 }}>
          {participantsWithRank.map((p, idx) => {
            const gap = topStartBodyFat != null && p.startBodyFat != null ? topStartBodyFat - p.startBodyFat : null;
            return (
              <Card key={p.id} sx={{ mb: 2 }}>
                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
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
                        <IconButton size="small" onClick={() => { setBasicInfoDialog(p); setBasicInfoDialogAfterJoin(false); }} sx={{ p: 0.5, minWidth: 44, minHeight: 44 }}>
                          <EditIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                      {!p.submissions.some((s) => s.type === 'start') && (
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<AddIcon sx={{ fontSize: 16 }} />}
                          onClick={() => {
                            if (isBeforeStartDate) {
                              setToast(`시작일(${challenge.start_date}) 이후에 인증을 권장하지만, 미리 제출도 가능합니다.`);
                            }
                            setSubmitModal({ open: true, participantId: p.id, participantNickname: p.nickname, type: 'start' });
                          }}
                          sx={{ minHeight: 44, py: 0.75, px: 1.5, fontSize: '0.8125rem' }}
                        >
                          시작일 인증
                        </Button>
                      )}
                      {!p.submissions.some((s) => s.type === 'end') && (() => {
                        const handleEndClick = () => {
                          if (isBeforeEndDate && !DEBUG_ALLOW_EARLY_END_SUBMIT) {
                            setEarlyEndBlockSnackbar(true);
                          } else {
                            setSubmitModal({ open: true, participantId: p.id, participantNickname: p.nickname, type: 'end' });
                          }
                        };
                        const { main, glow } = getEndBtnColor(p.id);
                        const glowDim = glow.replace('0.5)', '0.4)');
                        return (
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<AddIcon sx={{ fontSize: 16 }} />}
                          onClick={handleEndClick}
                          sx={{
                            minHeight: 44,
                            py: 0.75,
                            px: 1.5,
                            fontSize: '0.8125rem',
                            position: 'relative',
                            overflow: 'hidden',
                            color: main,
                            borderColor: main,
                            '--end-glow': glow,
                            '--end-glow-dim': glowDim,
                            '&:hover': { borderColor: main, bgcolor: `${main}14` },
                            animation: 'endBtnShimmer 2.5s ease-in-out infinite',
                            '@keyframes endBtnShimmer': {
                              '0%, 100%': { boxShadow: '0 0 0 0 var(--end-glow)' },
                              '50%': { boxShadow: '0 0 16px 6px var(--end-glow-dim)' },
                            },
                            '&::before': {
                              content: '""',
                              position: 'absolute',
                              top: 0,
                              left: '-100%',
                              width: '60%',
                              height: '100%',
                              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)',
                              animation: 'endBtnSparkle 2s ease-in-out infinite',
                              zIndex: 0,
                            },
                            '@keyframes endBtnSparkle': {
                              '0%': { left: '-100%' },
                              '100%': { left: '140%' },
                            },
                          }}
                        >
                          종료일 인증
                        </Button>
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
                            <Box key={s.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="body2" color="text.secondary">
                                종료: <span style={{ opacity: 0.7 }}>인증 완료</span>
                              </Typography>
                            </Box>
                          );
                        }
                        return (
                          <Box key={s.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" color="text.secondary" sx={{ flex: '1 1 auto', minWidth: 0 }}>
                              {s.type === 'start' ? '시작' : '종료'}: 체지방률 <strong>{Number(s.body_fat_rate).toFixed(1)}%</strong>
                            </Typography>
                            {s.image_url ? (
                              <Tooltip title="탭하여 이미지 보기">
                                <Button
                                  component="a"
                                  href={s.image_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  size="small"
                                  variant="outlined"
                                  color="primary"
                                  startIcon={<PhotoCameraIcon sx={{ fontSize: 14 }} />}
                                  sx={{ minHeight: 28, minWidth: 40, py: 0.25, px: 0.75, fontSize: '0.75rem', flexShrink: 0 }}
                                  aria-label="인증 이미지 보기"
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
      )}

      {tab === 1 && (
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
                  종료 인증 {participantsWithStart.filter((p) =>
                    p.submissions.some((s) => s.type === 'end')
                  ).length} / {participantsWithStart.length}명 완료
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {showRanking ? '현재 중간 순위 공개 중' : '전원 완료 시 자동 공개'}
                </Typography>
              </Box>
              <Button
                variant={showRanking ? 'contained' : 'outlined'}
                size="small"
                startIcon={showRanking ? <LockIcon /> : <LockOpenIcon />}
                onClick={handleUnlockRanking}
                color="warning"
                sx={{ flexShrink: 0 }}
              >
                {showRanking ? '순위 잠금' : '중간 공개'}
                {challenge?.admin_pin && (
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
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, gap: 1 }}>
                <Box sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 1.5, border: '1px solid', borderColor: 'grey.200', flex: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    💡 감소율 = (시작 − 종료) ÷ 시작 × 100
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.25 }}>
                    시작 체지방에 관계없이 공정하게 비교하는 상대 감소율입니다.
                  </Typography>
                </Box>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<ShareIcon />}
                  onClick={handleShareRanking}
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
                    <TableCell align="right" sx={{ width: 64 }}>시작</TableCell>
                    <TableCell align="right" sx={{ width: 64 }}>종료</TableCell>
                    <TableCell align="right" sx={{ width: 80 }}>
                      <Tooltip title="감소율 = (시작 − 종료) ÷ 시작 × 100" arrow>
                        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, cursor: 'help' }}>
                          감소율
                          <InfoOutlinedIcon sx={{ fontSize: 13, opacity: 0.55 }} />
                        </Box>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {ranking.map((r) => {
                    const medal = r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : null;
                    const isFirst = r.rank === 1;
                    return (
                      <TableRow
                        key={r.nickname}
                        sx={{
                          ...(r.rank <= 3 ? { bgcolor: 'success.50' } : {}),
                          ...(isFirst
                            ? {
                                background: [
                                  'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.85) 20%, rgba(254,249,195,1) 50%, rgba(255,255,255,0.85) 80%, transparent 100%)',
                                  'linear-gradient(135deg, #fef9c3 0%, #fef3c7 50%, #fde68a 100%)',
                                ].join(', '),
                                backgroundSize: '200% 100%, 100% 100%',
                                backgroundPosition: '200% 0, 0 0',
                                borderTop: '2px solid #f59e0b',
                                borderBottom: '2px solid #f59e0b',
                                boxShadow: '0 0 20px rgba(245, 158, 11, 0.4)',
                                animation: 'rank1Shimmer 2s ease-in-out infinite, rank1Glow 1.8s ease-in-out infinite',
                                '@keyframes rank1Shimmer': {
                                  '0%': { backgroundPosition: '200% 0, 0 0' },
                                  '100%': { backgroundPosition: '-200% 0, 0 0' },
                                },
                                '@keyframes rank1Glow': {
                                  '0%, 100%': {
                                    boxShadow: '0 0 20px rgba(245, 158, 11, 0.4), inset 0 0 30px rgba(254, 240, 138, 0.3)',
                                    borderColor: '#f59e0b',
                                  },
                                  '50%': {
                                    boxShadow: '0 0 30px rgba(245, 158, 11, 0.7), inset 0 0 50px rgba(254, 240, 138, 0.6)',
                                    borderColor: '#fbbf24',
                                  },
                                },
                              }
                            : {}),
                        }}
                      >
                        <TableCell sx={{ width: 64, verticalAlign: 'middle' }}>
                          {medal ? (
                            <Box
                              component="span"
                              sx={{
                                fontSize: 32,
                                lineHeight: 1,
                                filter: isFirst ? 'drop-shadow(0 0 6px rgba(245, 158, 11, 0.8))' : undefined,
                                animation: isFirst ? 'rank1MedalTwinkle 1.5s ease-in-out infinite' : undefined,
                                '@keyframes rank1MedalTwinkle': {
                                  '0%, 100%': { filter: 'drop-shadow(0 0 6px rgba(245, 158, 11, 0.8))' },
                                  '50%': { filter: 'drop-shadow(0 0 16px rgba(245, 158, 11, 1)) drop-shadow(0 0 8px rgba(254, 240, 138, 0.9))' },
                                },
                              }}
                            >
                              {medal}
                            </Box>
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
                          <Box sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {r.nickname}
                          </Box>
                        </TableCell>
                        <TableCell align="right" sx={{ verticalAlign: 'middle' }}>{r.startBodyFat.toFixed(1)}%</TableCell>
                        <TableCell align="right" sx={{ verticalAlign: 'middle' }}>{r.endBodyFat.toFixed(1)}%</TableCell>
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
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
            </>
          )}
        </Box>
      )}

      {tab === 2 && challenge && (
        <Box sx={{ px: 2, pt: 2 }}>
          <Box sx={{ mb: 2, p: 2, bgcolor: 'primary.50', borderRadius: 2, border: '1px solid', borderColor: 'primary.200' }}>
            <Typography variant="body2" color="primary.dark" fontWeight={500}>
              대결방 참가자 누구나 서로의 기록을 입력·확인할 수 있습니다.
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              개인 락 없음 · 공동 입력 · 공동 확인
            </Typography>
          </Box>
          <RecordStatusSummary
            currentWeek={recordStatus.currentWeek}
            completedCount={recordStatus.completedCount}
            notCompletedCount={recordStatus.notCompletedCount}
            notCompleted={recordStatus.notCompleted}
          />
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            전체 참가자 추이
          </Typography>
          <AllParticipantsChart participants={participants} logsByParticipant={logsByParticipant} />
          <Typography variant="subtitle2" sx={{ mt: 3, mb: 1 }}>
            참가자별 상세
          </Typography>
          {participants.map((p) => (
            <ParticipantWeeklyLogCard
              key={p.id}
              participant={p}
              challengeStartDate={challenge.start_date}
              challengeEndDate={challenge.end_date}
              logs={logsByParticipant[p.id] || []}
              onOpenLogForm={() => setWeeklyLogParticipant(p)}
              onRefresh={fetchParticipants}
            />
          ))}
          {participants.length === 0 && (
            <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              아직 참가자가 없습니다. 위에서 닉네임을 입력해 참가하세요.
            </Typography>
          )}
        </Box>
      )}

      {submitModal && (
        <SubmitModal
          open={submitModal.open}
          participantId={submitModal.participantId}
          participantNickname={submitModal.participantNickname}
          type={submitModal.type}
          onClose={() => setSubmitModal(null)}
          onSuccess={() => {
            setSubmitModal(null);
            fetchParticipants();
          }}
        />
      )}

      <Snackbar
        open={snackbar}
        autoHideDuration={2000}
        onClose={() => setSnackbar(false)}
        message="URL이 복사되었습니다"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
      <Snackbar
        open={earlyEndBlockSnackbar}
        autoHideDuration={4000}
        onClose={() => setEarlyEndBlockSnackbar(false)}
        message={`종료일(${endDateOnly || challenge.end_date}) 이후에 인증이 가능합니다.`}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ '& .MuiSnackbarContent-root': { bgcolor: 'warning.dark' } }}
      />
      <Snackbar
        open={!!toast}
        autoHideDuration={3000}
        onClose={() => setToast(null)}
        message={toast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />

      {/* PIN 확인 다이얼로그 */}
      <Dialog open={pinDialog} onClose={() => setPinDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LockIcon sx={{ fontSize: 20, color: 'warning.main' }} />
          관리자 PIN 확인
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            순위 공개/잠금은 관리자 PIN이 필요합니다.
          </Typography>
          <TextField
            fullWidth
            label="PIN 4자리"
            type="number"
            inputProps={{ maxLength: 4, inputMode: 'numeric' }}
            value={pinInput}
            onChange={(e) => { setPinInput(e.target.value.slice(0, 4)); setPinError(''); }}
            onKeyDown={(e) => { if (e.key === 'Enter') handlePinSubmit(); }}
            error={!!pinError}
            helperText={pinError}
            autoFocus
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                </InputAdornment>
              ),
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setPinDialog(false)} color="inherit">취소</Button>
          <Button
            variant="contained"
            color="warning"
            onClick={handlePinSubmit}
            disabled={pinInput.length !== 4}
          >
            확인
          </Button>
        </DialogActions>
      </Dialog>

      {basicInfoDialog && (
        <ParticipantBasicInfoDialog
          open={!!basicInfoDialog}
          participant={basicInfoDialog}
          onClose={() => { setBasicInfoDialog(null); setBasicInfoDialogAfterJoin(false); }}
          onSuccess={fetchParticipants}
          isAfterJoin={basicInfoDialogAfterJoin}
        />
      )}

      {weeklyLogParticipant && challenge && (
        <WeeklyLogForm
          open={!!weeklyLogParticipant}
          participant={weeklyLogParticipant}
          challengeStartDate={challenge.start_date}
          challengeEndDate={challenge.end_date}
          existingWeekNos={(logsByParticipant[weeklyLogParticipant.id] || []).map((l) => l.week_no)}
          onClose={() => setWeeklyLogParticipant(null)}
          onSuccess={() => {
            fetchParticipants();
            refetchLogs();
          }}
        />
      )}
    </Box>
  );
}
