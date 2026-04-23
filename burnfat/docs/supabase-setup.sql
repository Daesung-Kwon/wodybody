-- BurnFat Supabase 스키마 (SQL Editor에서 실행)

-- 1. challenges: 대결방
CREATE TABLE IF NOT EXISTS challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL DEFAULT '다이어트 챌린지',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  stake_amount INTEGER DEFAULT 50000,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. participants: 참가자
CREATE TABLE IF NOT EXISTS participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(challenge_id, nickname)
);

-- 3. submissions: 인증 제출
CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('start', 'end')),
  body_fat_rate DECIMAL(5,2) NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(participant_id, type)
);

-- 4. RLS 활성화
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- 5. 익명 읽기 정책
CREATE POLICY "Allow anonymous read challenges" ON challenges FOR SELECT USING (true);
CREATE POLICY "Allow anonymous read participants" ON participants FOR SELECT USING (true);
CREATE POLICY "Allow anonymous read submissions" ON submissions FOR SELECT USING (true);

-- 6. 익명 쓰기 정책 (코드 기반 MVP)
CREATE POLICY "Allow anonymous insert challenges" ON challenges FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous insert participants" ON participants FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous insert submissions" ON submissions FOR INSERT WITH CHECK (true);

-- 7. Storage 버킷: Supabase 대시보드 > Storage > New bucket > "inbody" (Public)

-- 8. Storage RLS: inbody 버킷 업로드/읽기 허용 (익명)
CREATE POLICY "Allow anonymous upload inbody" ON storage.objects
  FOR INSERT TO public WITH CHECK (bucket_id = 'inbody');

CREATE POLICY "Allow anonymous read inbody" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'inbody');
