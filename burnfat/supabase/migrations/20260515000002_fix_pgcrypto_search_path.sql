-- BurnFat hotfix: pgcrypto search_path 수정
--
-- 증상
--   새 대결 생성(PIN 입력 시) 또는 PIN 검증에서:
--     ERROR: function gen_salt(unknown, integer) does not exist
--   (crypt / digest 도 동일 원인으로 실패 가능)
--
-- 원인 (Sprint 0.1 잠복 버그)
--   Supabase 는 pgcrypto 확장을 `extensions` 스키마에 *사전 설치*한다.
--   Sprint 0.1 마이그레이션의 `CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public`
--   는 확장이 이미 존재하므로 no-op 이 되어, pgcrypto 함수(crypt/gen_salt/digest)는
--   여전히 `extensions` 스키마에 남는다.
--   그런데 PIN/해시 관련 SECURITY DEFINER 함수들은 `SET search_path = public, pg_temp`
--   로 고정돼 있어 `extensions` 스키마의 함수를 해석하지 못한다.
--   → PIN 없는 대결 생성·검증은 crypt 를 호출하지 않아 우연히 동작했고,
--     PIN 이 개입하는 경로에서만 오류가 드러났다.
--
-- 핫픽스
--   영향받는 함수의 search_path 에 `extensions` 를 추가한다. 함수 본문은 그대로.
--   - search_path 에 public, extensions 를 모두 두므로 pgcrypto 가 어느 스키마에
--     있든(공개 설치 환경 포함) 안전하게 해석된다.
--   - search_path 는 미존재 스키마를 무시하므로 `extensions` 가 없어도 오류 없음.

ALTER FUNCTION public.verify_admin_pin(UUID, TEXT)
  SET search_path = public, extensions, pg_temp;

ALTER FUNCTION public.create_challenge_with_pin(TEXT, TEXT, DATE, DATE, INTEGER, TEXT)
  SET search_path = public, extensions, pg_temp;

ALTER FUNCTION public.set_admin_pin(UUID, TEXT, TEXT)
  SET search_path = public, extensions, pg_temp;

-- _sha256_hex 는 search_path 미설정이라 호출자(update_submission/update_weekly_log,
-- search_path=public,pg_temp) 컨텍스트에서 digest 를 못 찾을 수 있다.
-- 자체 search_path 를 부여 → 어디서 호출되든 digest 해석 보장.
ALTER FUNCTION public._sha256_hex(TEXT)
  SET search_path = public, extensions, pg_temp;
