-- BurnFat Sprint 3 Phase A: challenges_public VIEW 도입
--
-- 배경: Sprint 0 핫픽스(20260514000001) 가 challenges.admin_pin_hash 에 컬럼 레벨
-- GRANT 를 걸어 anon SELECT 에서 제외했다. 이 상태에서 클라이언트가 `.select('*')`
-- 를 호출하면 PostgREST 가 권한 없는 컬럼까지 확장 → 쿼리 전체가 403 으로 실패한다.
-- (SPRINT0_HANDOFF.md §3.5 참고)
--
-- 그동안은 CHALLENGE_PUBLIC_COLUMNS 상수로 공개 컬럼만 명시 SELECT 해 우회했으나,
-- 새 SELECT 호출처가 실수로 `.select('*')` 를 쓰면 같은 회귀가 재발한다.
-- 공개 컬럼만 노출하는 VIEW 를 두면 `.select('*')` 회귀를 *구조적으로* 차단하고
-- 클라이언트 코드도 단순해진다.
--
-- 접근 모델: security_invoker=true 로 호출자(anon) 의 RLS·GRANT 를 그대로 상속.
-- VIEW 는 read-only — UPDATE/INSERT 는 계속 base 테이블(challenges) 을 사용한다.

CREATE OR REPLACE VIEW public.challenges_public AS
  SELECT id, code, title, start_date, end_date, stake_amount,
         ranking_unlocked, has_admin_pin, created_at
  FROM public.challenges;

-- RLS 상속 — VIEW 소유자 권한이 아닌 호출자(anon) 권한으로 base 테이블 접근.
ALTER VIEW public.challenges_public SET (security_invoker = true);

GRANT SELECT ON public.challenges_public TO anon, authenticated;
