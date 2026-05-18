-- BurnFat Sprint 2.5: 참가자 단위 코치 장기 메모리 (participant_coach_memory)
--
-- 세션 종료/주차 전환 시 백엔드가 "지난 약속·패턴·주의사항" 을 ≤500토큰 markdown 으로
-- 압축 갱신한다. 새 주차 세션의 시스템 프롬프트 <MEMORY> 블록으로 주입 →
-- 코치가 "지난 주 약속" 을 인용할 수 있게 함.
--
-- 접근 모델: coach_sessions 와 동일 — RLS ON + anon 정책 없음, 백엔드(service_role)만.

CREATE TABLE IF NOT EXISTS participant_coach_memory (
  participant_id  UUID PRIMARY KEY REFERENCES participants(id) ON DELETE CASCADE,
  summary_md      TEXT NOT NULL,
  last_week_no    INTEGER,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- updated_at 자동 갱신 (트리거 함수는 20260518000001 에서 생성)
DROP TRIGGER IF EXISTS participant_coach_memory_touch_updated_at ON participant_coach_memory;
CREATE TRIGGER participant_coach_memory_touch_updated_at
  BEFORE UPDATE ON participant_coach_memory
  FOR EACH ROW EXECUTE FUNCTION public._coach_touch_updated_at();

ALTER TABLE participant_coach_memory ENABLE ROW LEVEL SECURITY;
-- 정책 미생성 = anon 전면 deny. service_role(백엔드)만 접근.
