import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Socket } from 'socket.io-client';
import {
    Alert,
    Box,
    Button,
    Chip,
    MenuItem,
    Stack,
    TextField,
    Typography,
} from './common/MuiComponents';
import { estimateOffset, formatCountdown, formatElapsed, remainingMs, type TimeSample } from '../lib/clockSync';
import { createLiveSocket } from '../lib/liveSocket';
import { getAccessToken } from '../lib/tokenStore';
import { liveApi } from '../utils/api';
import type {
    LiveDivision,
    LiveLeaderboardEvent,
    LiveRoomEvent,
    LiveSessionView,
    LiveWorkoutType,
    RankedAthlete,
} from '../types/live';

const boardLabel: Record<LiveDivision, string> = {
    rx: 'Rx',
    scaled: 'Scaled',
};

const fieldSx = {
    '& .MuiInputBase-input': { color: '#f4f7fb' },
    '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.28)' },
    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.55)' },
    '& .MuiSvgIcon-root': { color: 'rgba(255,255,255,0.7)' },
};

function scoreLabel(row: RankedAthlete, workoutType: LiveWorkoutType): string {
    if (workoutType === 'for_time' && row.finished && row.elapsed_ms !== null) {
        return formatElapsed(row.elapsed_ms);
    }
    const partial = `${row.rounds} + ${row.reps}`;
    if (row.total_reps !== null) return `${partial} (${row.total_reps})`;
    return partial;
}

const LiveTimer: React.FC<{
    status: string;
    startedAtMs: number | null;
    durationSec: number;
    offsetMs: number;
}> = ({ status, startedAtMs, durationSec, offsetMs }) => {
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        let frame = 0;
        const loop = () => {
            setNow(Date.now());
            frame = window.requestAnimationFrame(loop);
        };
        frame = window.requestAnimationFrame(loop);
        return () => window.cancelAnimationFrame(frame);
    }, []);

    const remaining = status === 'live' && startedAtMs !== null
        ? remainingMs({ clientNowMs: now, offsetMs, startedAtMs, durationSec })
        : durationSec * 1000;
    const display = status === 'lobby' ? formatCountdown(durationSec * 1000) : formatCountdown(remaining);
    const caption = status === 'lobby' ? '시작 전' : status === 'ended' || remaining <= 0 ? '종료' : '남음';

    return (
        <Box sx={{ textAlign: 'center', py: 2 }} aria-live="polite">
            <Typography sx={{ color: 'rgba(255,255,255,0.55)', letterSpacing: '0.2em', fontSize: 12 }}>
                {caption}
            </Typography>
            <Typography
                component="p"
                sx={{
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                    fontWeight: 700,
                    fontSize: { xs: '4.5rem', sm: '7rem' },
                    lineHeight: 1,
                    color: remaining <= 10_000 && status === 'live' ? '#ffb020' : '#f4f7fb',
                    fontVariantNumeric: 'tabular-nums',
                }}
            >
                {display}
            </Typography>
        </Box>
    );
};

const Board: React.FC<{
    division: LiveDivision;
    rows: RankedAthlete[];
    workoutType: LiveWorkoutType;
    meId: number | null;
}> = ({ division, rows, workoutType, meId }) => (
    <Box
        sx={{
            flex: 1,
            minWidth: 0,
            bgcolor: '#14181f',
            borderRadius: 2,
            p: 1.5,
            border: '1px solid rgba(255,255,255,0.08)',
        }}
        aria-label={`${boardLabel[division]} 리더보드`}
    >
        <Typography sx={{ fontWeight: 700, mb: 1, color: division === 'rx' ? '#e8ff47' : '#7eb6ff' }}>
            {boardLabel[division]}
        </Typography>
        {rows.length === 0 ? (
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.55)' }}>
                아직 참가자가 없습니다. 디비전을 고르고 들어오면 여기에 표시됩니다.
            </Typography>
        ) : (
            <Stack component="ol" spacing={0.75} sx={{ listStyle: 'none', m: 0, p: 0 }}>
                {rows.map((row) => (
                    <Stack
                        key={row.user_id}
                        direction="row"
                        spacing={1}
                        alignItems="baseline"
                        sx={{
                            px: 1,
                            py: 0.75,
                            borderRadius: 1,
                            bgcolor: row.user_id === meId ? 'rgba(232,255,71,0.08)' : 'transparent',
                        }}
                    >
                        <Typography sx={{ width: 28, fontWeight: 700 }}>{row.rank}</Typography>
                        <Typography sx={{ flex: 1, minWidth: 0 }} noWrap>
                            {row.name}
                            {workoutType === 'for_time' && !row.finished ? ' · 미완' : ''}
                        </Typography>
                        <Typography sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 650 }}>
                            {scoreLabel(row, workoutType)}
                        </Typography>
                    </Stack>
                ))}
            </Stack>
        )}
    </Box>
);

const LiveSessionPage: React.FC = () => {
    const params = useParams();
    const navigate = useNavigate();
    const sessionId = params.sessionId ? Number(params.sessionId) : null;
    const validId = sessionId !== null && Number.isFinite(sessionId);

    const [view, setView] = useState<LiveSessionView | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [needsJoin, setNeedsJoin] = useState(false);
    const [connected, setConnected] = useState(false);
    const [offsetMs, setOffsetMs] = useState(0);
    const [rttMs, setRttMs] = useState<number | null>(null);
    const [syncNote, setSyncNote] = useState('시계 맞추는 중');

    const [title, setTitle] = useState('Live WOD');
    const [workoutType, setWorkoutType] = useState<LiveWorkoutType>('amrap');
    const [durationSec, setDurationSec] = useState(600);
    const [repsPerRound, setRepsPerRound] = useState('10');
    const [division, setDivision] = useState<LiveDivision>('rx');
    const [joinId, setJoinId] = useState('');
    const [busy, setBusy] = useState(false);
    const tapChain = useRef<Promise<void>>(Promise.resolve());

    const applyRoom = useCallback((payload: LiveRoomEvent) => {
        setView((prev) => {
            if (!prev || prev.session.id !== payload.session.id) return prev;
            return { ...prev, session: payload.session, leaderboard: payload.leaderboard };
        });
    }, []);

    const applyBoard = useCallback((payload: LiveLeaderboardEvent) => {
        setView((prev) => {
            if (!prev || prev.session.id !== payload.session_id) return prev;
            return {
                ...prev,
                session: { ...prev.session, server_time_ms: payload.server_time_ms },
                leaderboard: payload.leaderboard,
            };
        });
    }, []);

    useEffect(() => {
        if (!validId || sessionId === null) {
            setView(null);
            setNeedsJoin(false);
            return;
        }
        let cancelled = false;
        setError(null);
        liveApi.get(sessionId)
            .then((next) => {
                if (cancelled) return;
                setView(next);
                setNeedsJoin(false);
            })
            .catch((err: unknown) => {
                if (cancelled) return;
                const message = err instanceof Error ? err.message : '세션을 불러오지 못했습니다';
                setView(null);
                if (message.includes('호스트') || message.includes('참가자')) {
                    setNeedsJoin(true);
                    setError(null);
                } else {
                    setNeedsJoin(false);
                    setError(message);
                }
            });
        return () => {
            cancelled = true;
        };
    }, [sessionId, validId]);

    useEffect(() => {
        let cancelled = false;
        const samples: TimeSample[] = [];
        const run = async () => {
            try {
                for (let i = 0; i < 5; i += 1) {
                    const clientSendMs = Date.now();
                    const body = await liveApi.time();
                    const clientRecvMs = Date.now();
                    samples.push({ clientSendMs, clientRecvMs, serverTimeMs: body.server_time_ms });
                }
                if (cancelled) return;
                const estimate = estimateOffset(samples);
                setOffsetMs(estimate.offsetMs);
                setRttMs(estimate.rttMs);
                setSyncNote(`보정 ${Math.round(estimate.offsetMs)}ms · RTT ${Math.round(estimate.rttMs)}ms · ${estimate.samplesUsed}샘플`);
            } catch {
                if (!cancelled) setSyncNote('시계 보정 실패 — 이 기기 시각으로 표시합니다');
            }
        };
        void run();
        return () => {
            cancelled = true;
        };
    }, [sessionId]);

    useEffect(() => {
        if (!validId || sessionId === null) return undefined;
        let cancelled = false;
        let socket: Socket | null = null;
        const connect = async () => {
            const token = await getAccessToken();
            if (!token || cancelled) return;
            const next = createLiveSocket(token);
            if (cancelled) {
                next.disconnect();
                return;
            }
            socket = next;
            next.on('connect', () => {
                setConnected(true);
                next.emit('live_join', { session_id: sessionId });
            });
            next.on('disconnect', () => setConnected(false));
            next.on('live_state', (payload: LiveSessionView) => {
                setView(payload);
                setNeedsJoin(false);
            });
            next.on('live_session', (payload: LiveRoomEvent) => applyRoom(payload));
            next.on('live_leaderboard', (payload: LiveLeaderboardEvent) => applyBoard(payload));
            next.on('live_error', (payload: { message?: string }) => {
                if (payload?.message) setError(payload.message);
            });
        };
        void connect();
        return () => {
            cancelled = true;
            socket?.emit('live_leave', { session_id: sessionId });
            socket?.disconnect();
            setConnected(false);
        };
    }, [applyBoard, applyRoom, sessionId, validId]);

    const onCreate = async () => {
        setBusy(true);
        setError(null);
        try {
            const reps = repsPerRound.trim() === '' ? null : Number(repsPerRound);
            const created = await liveApi.create({
                title: title.trim() || 'Live WOD',
                workout_type: workoutType,
                duration_sec: durationSec,
                reps_per_round: reps,
                division,
            });
            navigate(`/live/${created.session.id}`);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : '세션을 만들지 못했습니다');
        } finally {
            setBusy(false);
        }
    };

    const onJoin = async (id: number) => {
        setBusy(true);
        setError(null);
        try {
            const joined = await liveApi.join(id, division);
            setView(joined);
            setNeedsJoin(false);
            if (!validId || sessionId !== id) navigate(`/live/${id}`);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : '참가하지 못했습니다');
        } finally {
            setBusy(false);
        }
    };

    const runAction = async (action: () => Promise<LiveSessionView>) => {
        setError(null);
        try {
            const next = await action();
            setView(next);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : '요청에 실패했습니다');
        }
    };

    const onTap = (kind: 'round' | 'rep') => {
        if (!view) return;
        const id = view.session.id;
        tapChain.current = tapChain.current.then(() => runAction(() => liveApi.tap(id, {
            kind,
            client_ts_ms: Date.now(),
        })));
    };

    const session = view?.session;
    const openForTaps = session?.status === 'live'
        && !(session.workout_type === 'for_time' && view?.me.finished_at_ms);
    const myUserId = view?.me.is_participant ? view.me.user_id : null;

    return (
        <Box sx={{ bgcolor: '#0b0d10', color: '#f4f7fb', minHeight: 'calc(100vh - 120px)', px: { xs: 2, md: 3 }, py: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                <Typography variant="overline" sx={{ letterSpacing: '0.18em', color: 'rgba(255,255,255,0.55)' }}>
                    LIVE · 영상 없음
                </Typography>
                <Typography variant="caption" sx={{ color: connected ? '#9dff9d' : '#ffb4a8' }}>
                    {connected ? '실시간 연결' : '소켓 대기'} · {syncNote}
                    {rttMs !== null ? '' : ''}
                </Typography>
            </Stack>

            {error && (
                <Alert severity="error" sx={{ my: 1 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {!validId && (
                <SetupForm
                    title={title}
                    setTitle={setTitle}
                    workoutType={workoutType}
                    setWorkoutType={setWorkoutType}
                    durationSec={durationSec}
                    setDurationSec={setDurationSec}
                    repsPerRound={repsPerRound}
                    setRepsPerRound={setRepsPerRound}
                    division={division}
                    setDivision={setDivision}
                    joinId={joinId}
                    setJoinId={setJoinId}
                    busy={busy}
                    onCreate={() => { void onCreate(); }}
                    onJoin={() => {
                        const id = Number(joinId);
                        if (!Number.isFinite(id) || id <= 0) {
                            setError('세션 번호를 입력하세요');
                            return;
                        }
                        void onJoin(id);
                    }}
                />
            )}

            {validId && !view && !needsJoin && !error && (
                <Typography sx={{ mt: 4, textAlign: 'center', color: 'rgba(255,255,255,0.7)' }}>
                    세션을 불러오는 중입니다.
                </Typography>
            )}

            {validId && needsJoin && sessionId !== null && (
                <Box sx={{ maxWidth: 420, mx: 'auto', mt: 4 }}>
                    <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>세션 {sessionId} 참가</Typography>
                    <Typography sx={{ color: 'rgba(255,255,255,0.7)', mb: 2 }}>
                        Rx와 Scaled는 따로 집계됩니다. 시작한 뒤에는 디비전을 바꿀 수 없습니다.
                    </Typography>
                    <DivisionPicker division={division} setDivision={setDivision} />
                    <Button variant="contained" disabled={busy} onClick={() => { void onJoin(sessionId); }} sx={{ mt: 2 }}>
                        이 디비전으로 참가
                    </Button>
                </Box>
            )}

            {session && view && (
                <Box sx={{ maxWidth: 880, mx: 'auto' }}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1 }}>
                        <Typography variant="h5" sx={{ fontWeight: 750, flex: 1 }}>{session.title}</Typography>
                        <Chip
                            size="small"
                            label={session.workout_type === 'amrap' ? 'AMRAP' : 'For Time'}
                            sx={{ color: '#0b0d10', bgcolor: '#e8ff47', fontWeight: 700 }}
                        />
                    </Stack>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                        세션 {session.id}
                        {session.reps_per_round ? ` · 라운드당 ${session.reps_per_round}렙` : ''}
                        {view.me.division ? ` · 내 디비전 ${boardLabel[view.me.division]}` : ' · 호스트(미참가)'}
                    </Typography>

                    <LiveTimer
                        status={session.status}
                        startedAtMs={session.started_at_ms}
                        durationSec={session.duration_sec}
                        offsetMs={offsetMs}
                    />

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
                        <Button
                            aria-label="라운드 1 추가"
                            disabled={!openForTaps || !view.me.is_participant}
                            onClick={() => onTap('round')}
                            sx={{
                                flex: 2,
                                py: 3,
                                fontSize: '2rem',
                                fontWeight: 800,
                                borderRadius: 3,
                                bgcolor: '#e8ff47',
                                color: '#111',
                                '&:hover': { bgcolor: '#d4ef2a' },
                                '&.Mui-disabled': { bgcolor: '#2a2f38', color: 'rgba(255,255,255,0.35)' },
                            }}
                        >
                            +1
                        </Button>
                        <Stack spacing={1} sx={{ flex: 1 }}>
                            <Button
                                aria-label="렙 1 추가"
                                variant="outlined"
                                disabled={!openForTaps || !view.me.is_participant}
                                onClick={() => onTap('rep')}
                                sx={{ py: 1.5, color: '#f4f7fb', borderColor: 'rgba(255,255,255,0.3)' }}
                            >
                                +1 렙
                            </Button>
                            {session.workout_type === 'for_time' && (
                                <Button
                                    aria-label="For Time 완료"
                                    variant="outlined"
                                    disabled={!openForTaps || !view.me.is_participant || view.me.finished_at_ms !== null}
                                    onClick={() => { void runAction(() => liveApi.finish(session.id)); }}
                                    sx={{ py: 1.5, color: '#f4f7fb', borderColor: 'rgba(255,255,255,0.3)' }}
                                >
                                    완료
                                </Button>
                            )}
                        </Stack>
                    </Stack>
                    <Typography variant="caption" sx={{ display: 'block', mb: 2, color: 'rgba(255,255,255,0.5)' }}>
                        현재 {view.me.cumulative_rounds} + {view.me.cumulative_reps}. 리더보드는 약 1초마다 디비전별로 갱신됩니다.
                    </Typography>

                    {view.me.is_host && (
                        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                            {session.status === 'lobby' && (
                                <Button variant="contained" onClick={() => { void runAction(() => liveApi.start(session.id)); }}>
                                    시작
                                </Button>
                            )}
                            {session.status === 'live' && (
                                <Button color="warning" variant="outlined" onClick={() => { void runAction(() => liveApi.end(session.id)); }}>
                                    종료
                                </Button>
                            )}
                        </Stack>
                    )}

                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                        <Board division="rx" rows={view.leaderboard.rx} workoutType={session.workout_type} meId={myUserId} />
                        <Board division="scaled" rows={view.leaderboard.scaled} workoutType={session.workout_type} meId={myUserId} />
                    </Stack>
                </Box>
            )}
        </Box>
    );
};

const DivisionPicker: React.FC<{
    division: LiveDivision;
    setDivision: (value: LiveDivision) => void;
}> = ({ division, setDivision }) => (
    <Stack direction="row" spacing={1} aria-label="디비전">
        {(['rx', 'scaled'] as LiveDivision[]).map((value) => (
            <Button
                key={value}
                aria-pressed={division === value}
                onClick={() => setDivision(value)}
                variant={division === value ? 'contained' : 'outlined'}
                sx={{
                    color: division === value ? '#111' : '#f4f7fb',
                    bgcolor: division === value ? '#e8ff47' : 'transparent',
                    borderColor: 'rgba(255,255,255,0.3)',
                }}
            >
                {boardLabel[value]}
            </Button>
        ))}
    </Stack>
);

const SetupForm: React.FC<{
    title: string;
    setTitle: (value: string) => void;
    workoutType: LiveWorkoutType;
    setWorkoutType: (value: LiveWorkoutType) => void;
    durationSec: number;
    setDurationSec: (value: number) => void;
    repsPerRound: string;
    setRepsPerRound: (value: string) => void;
    division: LiveDivision;
    setDivision: (value: LiveDivision) => void;
    joinId: string;
    setJoinId: (value: string) => void;
    busy: boolean;
    onCreate: () => void;
    onJoin: () => void;
}> = (props) => (
    <Stack spacing={3} sx={{ maxWidth: 520, mx: 'auto', mt: 2 }}>
        <Box>
            <Typography variant="h5" sx={{ fontWeight: 750, mb: 1 }}>세션 만들기</Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.65)', mb: 2 }}>
                호스트가 시작하면 모두 같은 서버 시계로 카운트다운합니다. 점수는 Rx와 Scaled를 섞지 않습니다.
            </Typography>
            <Stack spacing={1.5}>
                <TextField
                    label="제목"
                    value={props.title}
                    onChange={(event) => props.setTitle(event.target.value)}
                    fullWidth
                    sx={fieldSx}
                />
                <TextField
                    select
                    label="유형"
                    value={props.workoutType}
                    onChange={(event) => props.setWorkoutType(event.target.value as LiveWorkoutType)}
                    fullWidth
                    sx={fieldSx}
                >
                    <MenuItem value="amrap">AMRAP</MenuItem>
                    <MenuItem value="for_time">For Time</MenuItem>
                </TextField>
                <TextField
                    label="제한 시간 (초)"
                    type="number"
                    value={props.durationSec}
                    onChange={(event) => props.setDurationSec(Number(event.target.value))}
                    fullWidth
                    inputProps={{ min: 10, max: 7200 }}
                    sx={fieldSx}
                />
                <TextField
                    label="라운드당 렙 (비우면 라운드·렙을 따로 비교)"
                    value={props.repsPerRound}
                    onChange={(event) => props.setRepsPerRound(event.target.value)}
                    fullWidth
                    sx={fieldSx}
                />
                <DivisionPicker division={props.division} setDivision={props.setDivision} />
                <Button variant="contained" disabled={props.busy} onClick={props.onCreate}>
                    만들고 호스트로 참가
                </Button>
            </Stack>
        </Box>
        <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>세션 번호로 참가</Typography>
            <Stack direction="row" spacing={1}>
                <TextField
                    label="세션 번호"
                    value={props.joinId}
                    onChange={(event) => props.setJoinId(event.target.value)}
                    sx={fieldSx}
                />
                <Button variant="outlined" disabled={props.busy} onClick={props.onJoin} sx={{ color: '#f4f7fb', borderColor: 'rgba(255,255,255,0.3)' }}>
                    참가
                </Button>
            </Stack>
        </Box>
    </Stack>
);

export default LiveSessionPage;
