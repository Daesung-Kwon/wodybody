-- BurnFat Sprint 2.5: 대화형 코치 세션 (coach_sessions)
--
-- 주차별(또는 사용자가 명시적으로 새로 시작한) 코치 대화 세션.
--
-- 접근 모델 (Sprint 2 weekly_ai_advice 패턴 그대로)
--   - 백엔드(burnfat_coach.py)는 SUPABASE_SERVICE_ROLE_KEY 로 접근 → RLS 우회.
--   - 클라이언트(anon)는 이 테이블에 직접 접근하지 않고 항상 백엔드 엔드포인트를 경유.
--   - 따라서 RLS 를 켜되 anon 정책을 만들지 않아 anon SELECT/INSERT/UPDATE/DELETE 전부 deny.
--   - 세션 소유권은 device_secret_hash 로 백엔드가 애플리케이션 레벨에서 검증한다
--     (Sprint 0.2 deviceSecret 흐름과 동일: 클라이언트는 plain 을 X-Device-Secret 헤더로
--      전송, 백엔드가 SHA-256 hex 로 환산해 비교).
--   - visibility='room' 세션은 같은 대결방 멤버도 백엔드 경유로 열람 가능(옵트인 공유).

CREATE TABLE IF NOT EXISTS coach_sessions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id      UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  week_no             INTEGER NOT NULL,
  persona             TEXT NOT NULL DEFAULT 'friendly'
                        CHECK (persona IN ('strict', 'friendly', 'scientist')),
  status              TEXT NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'archived')),
  visibility          TEXT NOT NULL DEFAULT 'private'
                        CHECK (visibility IN ('private', 'room')),
  -- 세션을 만든 디바이스의 device_secret SHA-256 hex. 소유권 검증용.
  device_secret_hash  TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS coach_sessions_participant_week_idx
  ON coach_sessions (participant_id, week_no);

-- updated_at 자동 갱신 트리거 (코치 테이블 공용)
CREATE OR REPLACE FUNCTION public._coach_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS coach_sessions_touch_updated_at ON coach_sessions;
CREATE TRIGGER coach_sessions_touch_updated_at
  BEFORE UPDATE ON coach_sessions
  FOR EACH ROW EXECUTE FUNCTION public._coach_touch_updated_at();

ALTER TABLE coach_sessions ENABLE ROW LEVEL SECURITY;
-- 정책 미생성 = anon 전면 deny. service_role(백엔드)만 접근.
