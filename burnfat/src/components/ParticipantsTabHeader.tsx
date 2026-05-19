import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { supabase } from '../lib/supabase';
import type { Challenge, ParticipantWithSubmissions, WeeklyLog } from '../types';
import MyStatusCard from './MyStatusCard';

interface ParticipantsTabHeaderProps {
  challenge: Challenge;
  /** 이 디바이스에서 식별된 "나". null 이면 참가 폼만 노출. */
  myParticipant: ParticipantWithSubmissions | null;
  myLogs: WeeklyLog[];
  onAuthStart: (p: ParticipantWithSubmissions) => void;
  onAuthEnd: (p: ParticipantWithSubmissions) => void;
  onOpenWeeklyLog: (p: ParticipantWithSubmissions, weekNo?: number) => void;
  onForget: () => void;
  /** 참가 직후 이 디바이스의 "나" 로 기억. */
  onRemember: (participantId: string) => void;
  /** 참가 직후 기본정보 입력 다이얼로그 진입. */
  onJoined: (p: ParticipantWithSubmissions) => void;
  onRefetch: () => void;
}

/**
 * Sprint 3 Phase B — ChallengePage Tab 0 의 *탭 바 위* 영역.
 * 식별된 "나" 가 있으면 개인 상태 카드, 없으면(또는 추가 시) 참가 폼을 보여 준다.
 * (탭 바 아래 참가자 카드 목록은 ParticipantsTab 이 담당.)
 */
export default function ParticipantsTabHeader({
  challenge,
  myParticipant,
  myLogs,
  onAuthStart,
  onAuthEnd,
  onOpenWeeklyLog,
  onForget,
  onRemember,
  onJoined,
  onRefetch,
}: ParticipantsTabHeaderProps) {
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [joinNickname, setJoinNickname] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState('');

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinNickname.trim()) return;
    setJoinLoading(true);
    const { data: newParticipant, error: err } = await supabase
      .from('participants')
      .insert({ challenge_id: challenge.id, nickname: joinNickname.trim() })
      .select()
      .single();
    setJoinLoading(false);
    if (err) {
      setJoinError(
        err.message.includes('unique') ? '이미 등록된 닉네임입니다.' : err.message
      );
      return;
    }
    setJoinError('');
    setJoinNickname('');
    onRefetch();
    const joined = { ...(newParticipant as ParticipantWithSubmissions), submissions: [] };
    // Sprint 1: 방금 등록한 참가자를 이 디바이스의 "나" 로 기억.
    onRemember(joined.id);
    setShowJoinForm(false);
    onJoined(joined);
  };

  if (myParticipant && !showJoinForm) {
    return (
      <>
        <MyStatusCard
          participant={myParticipant}
          logs={myLogs}
          challengeStartDate={challenge.start_date}
          challengeEndDate={challenge.end_date}
          onAuthStart={() => onAuthStart(myParticipant)}
          onAuthEnd={() => onAuthEnd(myParticipant)}
          onOpenWeeklyLog={(weekNo) => onOpenWeeklyLog(myParticipant, weekNo)}
          onForget={onForget}
        />
        <Box sx={{ px: 2, mb: 1, textAlign: 'center' }}>
          <Button size="small" variant="text" onClick={() => setShowJoinForm(true)}>
            + 다른 참가자 추가
          </Button>
        </Box>
      </>
    );
  }

  return (
    <Card sx={{ mx: 2, mb: 2 }}>
      <CardContent sx={{ p: 2 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 0.5,
          }}
        >
          <Typography variant="subtitle2" color="text.secondary">
            참가하기
          </Typography>
          {myParticipant && (
            <Button
              size="small"
              variant="text"
              color="inherit"
              onClick={() => setShowJoinForm(false)}
            >
              취소
            </Button>
          )}
        </Box>
        <form onSubmit={handleJoin} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="닉네임"
            value={joinNickname}
            onChange={(e) => setJoinNickname(e.target.value)}
            sx={{ flex: 1, minWidth: 0, '& .MuiInputBase-root': { minHeight: 40 } }}
          />
          <Button
            type="submit"
            variant="contained"
            size="small"
            disabled={joinLoading || !joinNickname.trim()}
            sx={{ minWidth: 80, minHeight: 40 }}
          >
            참가
          </Button>
        </form>
        {joinError && (
          <Typography color="error" variant="caption" sx={{ mt: 1, display: 'block' }}>
            {joinError}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
