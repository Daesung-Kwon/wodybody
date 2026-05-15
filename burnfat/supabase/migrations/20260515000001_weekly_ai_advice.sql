-- BurnFat Sprint 2: AI 조언 서버 캐시 테이블 (weekly_ai_advice)
--
-- 목적
--   - 동일 (participant_id, week_no, prompt_version) 의 AI 조언을 서버에 1회 캐시.
--   - 같은 챌린지의 다른 친구가 같은 주차 조언을 열면 Grok 재호출 없이 캐시 반환
--     → 토큰 비용 절감 + "공동 모니터링" 콘셉트와 일치.
--   - 신선도(TTL)·강제 새로고침은 백엔드(burnfat_ai.py)가 updated_at 으로 판단.
--
-- 접근 모델
--   - 백엔드(burnfat_ai.py)는 SUPABASE_SERVICE_ROLE_KEY 로 접근 → RLS 우회.
--   - 클라이언트(anon)는 이 테이블에 직접 접근하지 않는다. 항상 백엔드 엔드포인트 경유.
--   - 따라서 RLS 를 켜되 anon 정책을 만들지 않아 anon SELECT/INSERT/UPDATE/DELETE 전부 deny.
--
-- 캐시 무효화
--   - Sprint 2: updated_at 기준 24h TTL + week_no 키 변경(새 주차) + 강제 새로고침 overwrite.
--   - Sprint 2.5: weekly_logs INSERT/UPDATE 트리거 기반 자동 무효화로 확장 예정.

CREATE TABLE IF NOT EXISTS weekly_ai_advice (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id  UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  week_no         INTEGER NOT NULL,
  -- 프롬프트/스키마 버전. 프롬프트가 바뀌면 이 값을 올려 과거 캐시를 자연 무효화.
  prompt_version  TEXT NOT NULL DEFAULT 'v1',
  -- 사람이 읽는 평문 (구버전 클라이언트 호환 + 폴백 표시용).
  advice_md       TEXT NOT NULL,
  -- 구조화 응답 { summary, action_items[], cautions[] }.
  advice_json     JSONB,
  model           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (participant_id, week_no, prompt_version)
);

CREATE INDEX IF NOT EXISTS weekly_ai_advice_lookup_idx
  ON weekly_ai_advice (participant_id, week_no, prompt_version);

ALTER TABLE weekly_ai_advice ENABLE ROW LEVEL SECURITY;

-- 정책을 만들지 않음 = anon 전면 deny. service_role(백엔드)만 접근.
