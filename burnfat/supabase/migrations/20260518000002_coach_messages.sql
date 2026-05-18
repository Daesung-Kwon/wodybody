-- BurnFat Sprint 2.5: 코치 대화 발화 (coach_messages)
--
-- 한 coach_session 안의 발화. JSONB 한 덩어리가 아니라 행 단위로 저장 →
-- 검색·페이지네이션·삭제가 용이.
--
-- 접근 모델: coach_sessions 와 동일 — RLS ON + anon 정책 없음(전면 deny),
-- 백엔드(service_role)만 접근. 소유권은 부모 세션의 device_secret_hash 로 검증.

CREATE TABLE IF NOT EXISTS coach_messages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id        UUID NOT NULL REFERENCES coach_sessions(id) ON DELETE CASCADE,
  role              TEXT NOT NULL CHECK (role IN ('system', 'assistant', 'user')),
  content           TEXT NOT NULL,
  tokens_in         INTEGER,
  tokens_out        INTEGER,
  -- 이 발화가 인용한 근거(weekly_log 의 week_no 등). 예: [{"week_no": 2}]
  references_jsonb  JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS coach_messages_session_created_idx
  ON coach_messages (session_id, created_at);

ALTER TABLE coach_messages ENABLE ROW LEVEL SECURITY;
-- 정책 미생성 = anon 전면 deny. service_role(백엔드)만 접근.
