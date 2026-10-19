# 인바디 사진 삭제와 삭제 증빙 절차

상태: **절차 초안. 실행하지 않음.** 실행은 소유자 승인(A12) 후. **G1-a 로그 검토가 끝난 뒤에만** 실행한다. 삭제하면 G1-a에 쓸 수 있는 객체 메타데이터(생성 시각 등)가 사라지므로 순서를 바꾸지 않는다.

결정(2026-10-19): BurnFat 는 인바디 사진을 더 이상 저장하지 않는다(`G3-number-only.md`). 기존 파일은 삭제하고, 완전 삭제를 증빙으로 남기며, 과거 참가자에게 알린다(`inbody-deletion-notice.md`).

## 0. 이 저장소는 공개다

- **매니페스트(경로·크기·해시·생성 시각)는 이 저장소에 커밋하지 않는다.** 경로 앞부분이 참가자 UUID다.
- 매니페스트와 서명된 기록은 소유자만 접근하는 비공개 위치(예: 개인 드라이브의 비공개 폴더, 암호화된 zip)에 둔다. 저장소에는 "증빙 보관 위치: 비공개(소유자 보관)"와 매니페스트 파일의 sha256만 적는다.
- 아래 스크립트는 출력 파일을 `$EVIDENCE_DIR`(저장소 밖)에만 쓴다. `.gitignore` 에 `inbody-evidence/` 를 넣는 것도 권장.

## 1. 사전 조건 (모두 참이어야 시작)

1. G1-a 로그 검토 결과가 기록되어 있다(`/workspace/g1a/finding.md` 또는 소유자 보관본).
2. 숫자만 받는 프론트(이 PR)가 burnfat.wodybody.com 과 www.wodybody.com/burnfat 둘 다에 배포됐다. 새 사진이 더 생기지 않는다.
3. Supabase 프로젝트 `nvmwkyedangfdeggawdm` 이 **활성 상태**다. 2026-10-15 09:43 KST에 Free 플랜 비활성 정지(pause)됐다. 정지 상태에서는 Storage API·DB가 응답하지 않으므로 먼저 **Resume** 이 필요하다(프로덕션 변경, 소유자 승인).
4. 서비스 롤 키는 실행하는 셸의 환경변수로만 준다. 화면·로그·파일에 출력하지 않는다.

## 2. 삭제 전 매니페스트 (비공개 보관)

수집 항목: `bucket_id, name(path), size(bytes), mimetype, created_at, updated_at, sha256`. sha256은 객체를 내려받아 계산한다(다운로드는 메모리/임시 디렉터리에서만, 계산 후 즉시 폐기).

```sql
-- 읽기 전용. SQL Editor(서비스 롤) 또는 psql.
SELECT o.name, (o.metadata->>'size')::bigint AS size_bytes, o.metadata->>'mimetype' AS mimetype,
       o.created_at, o.updated_at
  FROM storage.objects o
 WHERE o.bucket_id = 'inbody'
 ORDER BY o.created_at;

SELECT count(*) AS objects, coalesce(sum((metadata->>'size')::bigint),0) AS total_bytes
  FROM storage.objects WHERE bucket_id = 'inbody';

-- DB 쪽 경로 참조
SELECT count(*) FILTER (WHERE image_url IS NOT NULL) AS rows_with_image, count(*) AS rows
  FROM public.submissions;
```

이미지 경로를 가리키는 컬럼은 `public.submissions.image_url` 하나다(2026-10-06 프로덕션 컬럼 목록 기준). 값은 path 또는 과거 public/sign URL 이다.

## 3. 삭제 (서비스 롤, Storage API)

`storage.objects` 를 SQL로 DELETE 하지 않는다. 플랫폼 트리거(`storage.protect_delete`)가 막고, 막지 않더라도 실제 파일이 남는다. 반드시 Storage API로 지운다.

순서:

1. 정책 정리(마이그레이션, 소유자 적용): anon INSERT 정책 `burnfat_inbody_anon_insert` DROP, 함수 `inbody_upload_path_allowed` DROP. 새 업로드 경로를 먼저 닫는다.
2. 매니페스트 생성(§2, 스크립트 `--manifest`).
3. Storage API `DELETE /storage/v1/object/inbody` 로 경로를 100개 이하씩 삭제(스크립트 `--delete`). 응답으로 돌아온 삭제 목록을 기록한다.
4. `submissions.image_url` 을 NULL 로(아래 SQL, 트랜잭션).
5. 사후 검증(§4).
6. 버킷 자체 삭제는 선택. 지우면 §4-2 결과가 "bucket not found"가 된다. 백엔드 sign 엔드포인트·`signedImage.ts` 제거와 함께 한다.

```sql
-- DRAFT. 실행 금지 (A12 승인 후). 매니페스트 저장 후에만.
BEGIN;
UPDATE public.submissions SET image_url = NULL WHERE image_url IS NOT NULL;
-- 기대: 영향 행 수 = §2 rows_with_image
SELECT count(*) FROM public.submissions WHERE image_url IS NOT NULL;  -- 0 이어야 COMMIT
COMMIT;
```

## 4. 사후 검증 (모두 기록)

| # | 검사 | 기대 |
| --- | --- | --- |
| 1 | `SELECT count(*) FROM storage.objects WHERE bucket_id='inbody'` | 0 |
| 2 | Storage list API `POST /storage/v1/object/list/inbody` (서비스 롤, prefix '' 와 매니페스트의 각 폴더) | `[]` |
| 3 | 매니페스트 경로 표본(전체 권장)에 대해 서비스 롤로 새 서명 `POST /storage/v1/object/sign/inbody/<path>` | 400/404 "Object not found" |
| 4 | 삭제 전 만든 서명 URL 하나(삭제 직전 1시간 유효로 생성)를 GET | 400/404 (객체 없음) |
| 5 | 백엔드 `POST /api/burnfat/images/sign` 에 실제 방 코드·과거 경로 | `{"urls":{}}` 또는 404 |
| 6 | `SELECT count(*) FROM public.submissions WHERE image_url IS NOT NULL` | 0 |
| 7 | 익명 키 list/sign | 빈 목록 / Object not found (C 이후 원래 그렇다) |
| 8 | 앱 화면(두 도메인) | 사진 보기·업로드 UI 없음 |

각 검사에 실행 시각(KST), 실행자, 결과(숫자·HTTP 코드)를 남긴다. 경로·참가자 식별자는 비공개 기록에만 둔다.

## 5. 백업·사본 (완전 삭제의 한계)

- **플랜: Free.** Free 는 대시보드 일일 백업·PITR 이 없다(Pro 7일, Team 14일, Enterprise 30일). 따라서 "백업이 만료되는 날"은 플랫폼 일일 백업 기준으로는 해당 없음.
- **Storage 객체는 DB 백업에 들어 있지 않다**(Supabase 문서: 백업은 객체 메타데이터만 포함, 이미 지운 객체를 복원하지 않는다).
- **정지(pause) 백업.** 2026-10-15 정지 때 restore point 가 만들어졌다. 정지 프로젝트는 90일 안에 Resume 할 수 있고, 90일이 지나면 소유자가 DB 백업 파일과 **Storage 객체를 대시보드에서 내려받을 수 있다**고 문서가 적는다. 즉 정지 상태로 두면 사진이 플랫폼에 남는다. 삭제는 Resume 후 §3으로 한다. Resume·삭제 후 다시 정지돼도, 지운 객체는 새 정지 백업에 들어가지 않는다.
- 공급자 내부 저장소(객체 스토리지 버전·복제)의 물리 삭제 시점은 공개 문서로 확인되지 않는다. 필요하면 Supabase 지원/DPA로 질의하고 답을 기록에 첨부한다.
- 운영자 측 사본: 2026-10-08 서명 검증 때 박스 `/tmp` 에 내려받은 이미지 1건은 2026-10-19 확인 시 이미 없다. 소유자 기기(다운로드 폴더 등)·메신저 공유 사본이 있는지 소유자가 확인해 기록한다.
- 서명 URL 은 1시간 유효였다. 과거에 발급된 URL은 모두 만료됐다.

## 6. 제안 스크립트 (실행 금지, 검토용)

```bash
#!/usr/bin/env bash
# inbody-delete.sh — DRAFT. A12 승인 + G1-a 완료 후에만.
# 필요 env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_DB_URL, EVIDENCE_DIR(저장소 밖)
# 사용: ./inbody-delete.sh --manifest   (읽기만)
#       ./inbody-delete.sh --delete     (매니페스트가 있어야 동작)
#       ./inbody-delete.sh --verify
set -euo pipefail
: "${SUPABASE_URL:?}" "${SUPABASE_SERVICE_ROLE_KEY:?}" "${SUPABASE_DB_URL:?}" "${EVIDENCE_DIR:?}"
case "$EVIDENCE_DIR" in *wodybody*) echo "EVIDENCE_DIR must be outside the repo"; exit 1;; esac
mkdir -p "$EVIDENCE_DIR"; chmod 700 "$EVIDENCE_DIR"
H=(-H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY")
TS=$(TZ=Asia/Seoul date +%Y%m%dT%H%M%S%z)
M="$EVIDENCE_DIR/manifest.tsv"

manifest() {
  psql "$SUPABASE_DB_URL" -X -A -t -F $'\t' -c "SELECT name,(metadata->>'size'),metadata->>'mimetype',created_at,updated_at FROM storage.objects WHERE bucket_id='inbody' ORDER BY created_at" > "$M.tmp"
  : > "$M"
  while IFS=$'\t' read -r name size mime created updated; do
    sha=$(curl -fsS "${H[@]}" "$SUPABASE_URL/storage/v1/object/authenticated/inbody/$name" | sha256sum | cut -d' ' -f1)
    printf '%s\t%s\t%s\t%s\t%s\t%s\n' "$name" "$size" "$mime" "$created" "$updated" "$sha" >> "$M"
  done < "$M.tmp"; rm -f "$M.tmp"
  echo "manifest_rows=$(wc -l < "$M") manifest_sha256=$(sha256sum "$M" | cut -d' ' -f1) at=$TS" | tee "$EVIDENCE_DIR/manifest.meta"
}

delete() {
  test -s "$M" || { echo "manifest missing"; exit 1; }
  cut -f1 "$M" | split -l 100 - "$EVIDENCE_DIR/batch."
  for b in "$EVIDENCE_DIR"/batch.*; do
    body=$(python3 -c 'import json,sys;print(json.dumps({"prefixes":[l.strip() for l in open(sys.argv[1]) if l.strip()]}))' "$b")
    curl -fsS -X DELETE "${H[@]}" -H 'Content-Type: application/json' "$SUPABASE_URL/storage/v1/object/inbody" -d "$body" > "$b.response.json"
  done
  echo "deleted_at=$TS" >> "$EVIDENCE_DIR/manifest.meta"
}

verify() {
  {
    echo "verified_at=$TS"
    echo "objects_left=$(psql "$SUPABASE_DB_URL" -X -A -t -c "SELECT count(*) FROM storage.objects WHERE bucket_id='inbody'")"
    echo "list_api=$(curl -sS -X POST "${H[@]}" -H 'Content-Type: application/json' "$SUPABASE_URL/storage/v1/object/list/inbody" -d '{"prefix":"","limit":1000}')"
    n=0; nf=0
    while IFS=$'\t' read -r name _; do
      n=$((n+1))
      code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "${H[@]}" -H 'Content-Type: application/json' "$SUPABASE_URL/storage/v1/object/sign/inbody/$name" -d '{"expiresIn":60}')
      [ "$code" = 400 ] || [ "$code" = 404 ] && nf=$((nf+1))
    done < "$M"
    echo "sign_not_found=$nf/$n"
    echo "image_url_left=$(psql "$SUPABASE_DB_URL" -X -A -t -c "SELECT count(*) FROM public.submissions WHERE image_url IS NOT NULL")"
  } | tee "$EVIDENCE_DIR/verify-$TS.txt"
}

case "${1:-}" in --manifest) manifest;; --delete) delete;; --verify) verify;; *) echo "usage"; exit 2;; esac
```

## 7. 서명 기록 템플릿 (비공개 보관, 사본의 해시만 저장소에)

```
BurnFat 인바디 이미지 삭제 기록

대상: Supabase 프로젝트 nvmwkyedangfdeggawdm, 버킷 inbody, 컬럼 public.submissions.image_url
결정: 2026-10-19 (소유자)        G1-a 검토 완료 시각: ____ KST
Resume 시각: ____ KST            정책 정리(anon INSERT DROP) 적용 시각: ____ KST

삭제 전
  객체 수: ____   총 크기: ____ bytes   image_url 비NULL 행: ____
  매니페스트 sha256: ____   (보관 위치: 비공개, ____)
삭제
  Storage API 삭제 시각: ____ KST   응답 삭제 수: ____
  image_url NULL 처리 시각: ____ KST   영향 행: ____
사후 검증 (§4)
  1 objects_left = __   2 list = __   3 sign_not_found = __/__   4 old signed URL = HTTP __
  5 backend sign = __   6 image_url_left = __   7 anon = __   8 UI = __
백업·사본 (§5)
  플랜: Free (일일 백업/PITR 없음)   정지 백업 해당 여부: ____
  공급자 질의/답변: ____   운영자 기기 사본 확인: ____

실행자: ________   확인자: ________   서명/날짜: ________
```
