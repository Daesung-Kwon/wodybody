-- BurnFat: UPDATE RLS 정책 추가
-- participants/challenges/weekly_logs 모두 익명 수정 허용
-- Supabase SQL Editor에서 실행하세요.

-- participants: 기본정보 수정 (나이·성별·키·목표 체지방)
CREATE POLICY "Allow anonymous update" ON participants
  FOR UPDATE USING (true) WITH CHECK (true);

-- challenges: 순위 공개/잠금, 챌린지 기본정보 수정 (기간·참가비 등)
CREATE POLICY "Allow anonymous update" ON challenges
  FOR UPDATE USING (true) WITH CHECK (true);

-- weekly_logs: (추후 기록 수정 기능 대비)
CREATE POLICY "Allow anonymous update" ON weekly_logs
  FOR UPDATE USING (true) WITH CHECK (true);
