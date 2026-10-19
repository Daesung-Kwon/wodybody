# G1-a. 과거 공개 RLS·Storage 상태의 노출 여부 확인 절차

상태: **초안**. 소유자가 직접 로그를 보고, 법률 자문과 함께 판단한다. 이 문서는 제34조 신고·통지 여부를 결정하지 않는다. 프로덕션 조회·마이그레이션·익명 키 업로드 시험은 이 초안 작성 과정에서 실행하지 않았다.

기준일: 2026-10-19 (Week 0). 코드에 남아 있는 설명은 `burnfat/supabase/migrations/20261006000003_inbody_storage_narrowing.sql` 머리말과 `burnfat/supabase/migrations/20260514000003_signed_image_url.sql` 이다.

## 1. 무엇을 의심하는가

2026-10-06 마이그레이션 주석이 적고 있는 적용 직전 프로덕션 정책:

- `burnfat_inbody_anon_select` — anon/authenticated, `bucket_id = 'inbody'` SELECT
- `burnfat_inbody_anon_insert` — 같은 조건 INSERT
- `burnfat_inbody_anon_update` — 같은 조건 UPDATE

이 상태에서는 익명 키가 버킷 목록을 읽고, 객체에 대한 서명 URL을 만들고, 객체를 덮어쓸 수 있었다. 인바디 이미지는 건강 관련 정보일 수 있다(제23조는 G3). 같은 시기에 테이블 RLS가 방 코드로 좁혀지기 전이면 `participants` / `submissions` / `weekly_logs` 의 닉네임·체지방률도 PostgREST로 읽혔을 수 있다. 그 창의 시작·끝 시각은 Supabase 마이그레이션 적용 시각으로 소유자가 확정한다. 이 초안은 시각을 단정하지 않는다.

적용 후에도 남은 구멍은 아래 §5다. SELECT/UPDATE는 좁혀졌고, 기존 참가자 폴더에 대한 anon INSERT는 남아 있다.

## 2. 볼 로그와 보존 한계

Studio → Logs. 공식 설명: [Logs](https://supabase.com/docs/guides/observability/logs). 보존 기간은 **프로젝트 요금제에 따라 다르다**고만 적혀 있고, 이 초안을 쓸 때 일수 표를 현재 문서에서 다시 인용하지 못했다. 대시보드 Time Range가 허용하는 상한이 이 프로젝트의 실제 보존 기간이다. 요금제 화면과 그 상한을 먼저 적는다.

볼 종류:

| 로그 | Studio 유형 | SQL `source` | 보는 이유 |
| --- | --- | --- | --- |
| API Gateway | API Gateway | `edge_logs` | Storage·PostgREST로 들어온 HTTP. 상태 코드·경로·IP |
| Storage | Storage | `storage_logs` | 버킷 `inbody` 업로드·조회 |
| PostgREST | PostgREST | `postgrest_logs` | 프로세스 로그. 행 단위 증거는 보통 `edge_logs` 쪽이 낫다 |
| Postgres | Postgres | `postgres_logs` | 문장 로그를 켜 둔 경우에만. 기본은 꺼져 있는 경우가 많아, 여기에 없어도 접근이 없었다고 볼 수 없다 |

2026년 6월 이후 생성된 프로젝트의 Logs Explorer는 ClickHouse (`log_attributes`)다. 그 이전 프로젝트는 BigQuery `unnest` 일 수 있다. 아래 ClickHouse가 문법 오류면 §3.3 을 쓴다. Management API로 받을 때는 한 번에 24시간 이하로 자른다. 로그 조회는 스캔량에 따라 과금될 수 있으니, 의심 구간을 하루 단위로 나눠 필요한 열만 SELECT 한다.

보존 기간이 의심 구간(정책이 넓었던 날)보다 짧으면, 로그가 비어 있는 것은 "접근이 없었다"의 증거가 아니다. 그 사실을 법률 검토 입력으로 적는다.

## 3. 실행할 쿼리

아래는 소유자가 Logs Explorer에서 실행하는 읽기 전용 쿼리다. 결과의 객체 경로·IP는 개인정보일 수 있으니 대시보드 밖으로 넓게 뿌리지 않는다.

### 3.1 API Gateway — Storage·REST 2xx

경로 키 이름이 프로젝트마다 다를 수 있다. 먼저 샘플 한 행의 `event_message` 로 키가 `request.path` 인지 확인한 뒤 실행한다.

```sql
select
  timestamp,
  log_attributes['request.method'] as method,
  log_attributes['request.path'] as path,
  toInt32OrZero(log_attributes['response.status_code']) as status,
  log_attributes['request.headers.x_real_ip'] as ip,
  log_attributes['request.headers.user_agent'] as ua
from logs
where source = 'edge_logs'
  and (
    log_attributes['request.path'] ilike '%/storage/v1/%'
    or log_attributes['request.path'] ilike '%/rest/v1/participants%'
    or log_attributes['request.path'] ilike '%/rest/v1/submissions%'
    or log_attributes['request.path'] ilike '%/rest/v1/weekly_logs%'
    or log_attributes['request.path'] ilike '%/rest/v1/challenges%'
  )
  and toInt32OrZero(log_attributes['response.status_code']) between 200 and 299
order by timestamp desc
limit 1000
```

의심 구간 안에서, 앱 User-Agent가 아닌 클라이언트 또는 운영자가 모르는 IP의 2xx를 표시한다. Storage의 `object/list`, `object/sign`, `object/public`, `object/authenticated` 와 PostgREST GET이 우선이다.

### 3.2 Storage 로그

```sql
select timestamp, event_message
from logs
where source = 'storage_logs'
  and event_message ilike '%inbody%'
order by timestamp desc
limit 1000
```

### 3.3 구 문법(BigQuery) — Explorer가 `log_attributes` 를 거부할 때만

```sql
select id, storage_logs.timestamp, event_message, r.method, res.statusCode
from storage_logs
cross join unnest(metadata) as m
cross join unnest(m.req) as r
cross join unnest(m.res) as res
where res.statusCode between 200 and 299
order by timestamp desc
limit 100
```

### 3.4 지금 남아 있는 객체 목록 (접근 증거가 아니라 인벤토리)

SQL Editor, 서비스 롤. 이미지가 몇 건·언제부터 있었는지 적는다.

```sql
select name, created_at, updated_at
from storage.objects
where bucket_id = 'inbody'
order by created_at;
```

## 4. 제34조 통지·신고가 필요할 수 있는지 — 판단 순서

최종 판단은 소유자와 법률 확인이다. 초안은 순서를 제안할 뿐이다.

개인정보 보호법 제34조는 개인정보가 유출되었음을 알게 된 때 정보주체에게 알리고, 개인정보보호위원회 또는 한국인터넷진흥원에 신고하도록 정한다. 시행령·고시가 정하는 기한(실무에서 인지 후 72시간으로 안내되는 경우가 많다)과 문안 항목은 최신 조문으로 확인한다. 이 문서는 기한을 확정하지 않는다.

순서:

1. 유출 항목 후보를 적는다. 인바디 이미지, 체지방률, 닉네임, 나이·성별, 주간 기록. 이미지가 건강정보이면 민감정보(제23조)로 법률 검토에 함께 올린다.
2. §3에서 **권한 없는 제3자의 실제 조회·다운로드(2xx)** 가 보이는지 적는다. 정책이 열려 있었다는 사실만으로 이 초안이 "유출이 있었다"고 말하지 않는다. 반대로 로그가 보존 기간 밖이면 "없었다"고도 말하지 않는다.
3. 다음처럼 갈린다.
   - 제3자 2xx가 있거나, 공개 URL이 외부에 퍼진 정황이 있다 → 통지·신고가 **필요할 수 있음**. 법률 확인 후 제34조 항목(유출 항목, 시점·경위, 정보주체가 할 수 있는 조치, 처리자 연락처, 대응)으로 문안을 만든다. 이 파일에 통지문을 확정하지 않는다.
   - 의심 구간 로그가 보존되어 있고, 외부 2xx·공개 URL 정황이 없다 → 통지 의무가 **생기지 않았을 수 있음**. 그래도 소유자와 법률이 확정한다.
   - 로그가 이미 없다 → 부재를 증명할 수 없음. 그 공백을 법률 검토 입력으로 둔다. 추측으로 신고하거나 추측으로 하지 않기로 정하지 않는다.
4. 판단 시각, 본 로그 범위, 요금제上 보존 일수, 결론(미정/검토 중 포함)을 한 줄로 남긴다. 봇이나 이 초안이 그 칸을 채우지 않는다.

## 5. 남아 있는 G1 구멍 (적용하지 않음)

`burnfat_inbody_anon_insert` 는 아직 anon·authenticated INSERT를 허용한다. 조건은 `inbody_upload_path_allowed(name)` 이다.

```31:43:burnfat/supabase/migrations/20261006000003_inbody_storage_narrowing.sql
CREATE OR REPLACE FUNCTION public.inbody_upload_path_allowed(p_name TEXT)
-- ...
  SELECT p_name ~ '^[0-9a-f]{8}-.../[A-Za-z0-9_-]{1,96}\.(jpg|jpeg|png|webp)$'
     AND EXISTS (
       SELECT 1 FROM public.participants p
        WHERE p.id::text = split_part(p_name, '/', 1)
     );
```

함수 `inbody_upload_path_allowed` (`20261006000003_inbody_storage_narrowing.sql` 31–43행)는 경로가 `{참가자 UUID}/{파일명}.{jpg|jpeg|png|webp}` 이고, 그 UUID가 `participants.id` 에 있는지만 본다. device secret은 보지 않는다. 그래서 폴더 UUID를 아는 익명 키는 **새 파일**을 그 폴더에 넣을 수 있다. 기존 파일을 읽거나 덮어쓰는 정책은 이 마이그레이션에서 빠졌다. 앱은 `SubmitModal` 에서 익명 키로 `upsert: false` 업로드를 한다 (`burnfat/src/components/SubmitModal.tsx`, 경로 `{participantId}/{type}-{timestamp}.jpg`).

현재 로컬 단언 `burnfat/supabase/tests/assert_after_c.sql` 17–20행은 이 INSERT가 **성공해야 한다**고 본다. 아래 초안을 적용하면 그 단언은 반대로 바꿔야 한다.

### 5.1 제안 마이그레이션 (적용 금지)

브라우저 업로드를 서비스 롤 경유로 옮기기 전에 이 SQL만 적용하면 인증 사진 업로드가 끊긴다. 적용은 소유자 승인(A12)과 서버 업로드 구현 이후다. 이 PR은 SQL 파일을 추가하지 않는다.

```sql
-- DRAFT. Do not apply.
-- anon/authenticated INSERT into bucket inbody 를 제거한다.
-- 서비스 롤은 RLS를 우회하므로, device_secret 을 확인한 Railway 업로드만 남긴다.
-- 브라우저(SubmitModal)의 supabase.storage.upload 는 이 정책이 없어지면 실패한다.

DROP POLICY IF EXISTS "burnfat_inbody_anon_insert" ON storage.objects;

-- inbody_upload_path_allowed() 는 서버 업로드가 붙은 뒤 같은 변경에서 DROP.
-- 지금 DROP 하지 않는다. 정책이 없으면 함수만으로는 INSERT가 되지 않는다.
```

### 5.2 검증 (익명 키, 프로덕션에서 실행하지 않음)

성공하는 INSERT는 파일을 만든다. 프로덕션에서 돌리지 않는다. Supabase branch 또는 로컬 스택에서, 시드의 참가자 UUID로 확인한다.

SQL (적용 후, anon이면 거절되어야 함):

```sql
SET ROLE anon;
DO $$
BEGIN
  BEGIN
    INSERT INTO storage.objects (bucket_id, name, version)
    VALUES (
      'inbody',
      'aaaaaaaa-1111-0000-0000-000000000002/probe-1.jpg',
      '1'
    );
    RAISE EXCEPTION 'anon insert still allowed';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'anon insert blocked (expected)';
  END;
END $$;
RESET ROLE;
```

익명 키 HTTP (branch URL·branch anon key만):

```bash
# 적용 후: 401/403.
# 적용 전: 200이며 객체가 생긴다. 프로덕션 금지.
curl -sS -D - -o /dev/null \
  -X POST "$SUPABASE_URL/storage/v1/object/inbody/$PARTICIPANT_ID/probe.jpg" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: image/jpeg" \
  -H "x-upsert: false" \
  --data-binary @./tiny.jpg
```

기대:

- 수정 전 branch: HTTP 200, 객체가 생김 → 서비스 롤로 그 객체만 삭제.
- 수정 후 branch: HTTP 401 또는 403, `storage.objects` 에 `probe.jpg` 없음.
- 존재하지 않는 UUID 폴더는 수정 전에도 거절 (현재 정책의 기존 동작).
