# BurnFat V2 DB 설정 체크리스트

> `Could not find the 'age' column of 'participants' in the schema cache` 오류 해결을 위한 작업 목록

---

## 1. Supabase 프로젝트 확인

- [ ] Supabase 대시보드 접속
- [ ] 프로젝트 URL, anon key 확인 (`.env`에 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` 설정됐는지)

---

## 2. DB 마이그레이션 실행

`supabase/migrations/20250225000001_v2_weekly_logs_and_participants.sql` 내용을 Supabase SQL Editor에서 실행합니다.

### 방법 A: Supabase 대시보드 (권장)

1. Supabase 대시보드 → **SQL Editor**
2. **New query** 클릭
3. 아래 파일 전체 내용 복사 후 붙여넣기
4. **Run** 실행

### 방법 B: Supabase CLI

```bash
# Supabase CLI 설치 (미설치 시)
# npm install -g supabase

# 프로젝트 연결 후
supabase link --project-ref <프로젝트_REF>

# 마이그레이션 적용
supabase db push
```

### 마이그레이션 내용 요약

| 작업 | 대상 | 내용 |
|------|------|------|
| participants 확장 | participants | age, gender, height_cm, target_body_fat 컬럼 추가 |
| gender 체크 | participants | gender IN ('M', 'F') 제약 |
| weekly_logs 테이블 | (신규) | 주간 기록 저장용 |
| 인덱스 | weekly_logs | participant_id, (participant_id, week_no) |
| 트리거 | weekly_logs | updated_at 자동 갱신 |
| RLS | weekly_logs | 익명 SELECT, INSERT, UPDATE 허용 |

---

## 3. 마이그레이션 후 확인

SQL Editor에서 아래 쿼리로 검증:

```sql
-- participants 컬럼 확인
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'participants' 
AND column_name IN ('age', 'gender', 'height_cm', 'target_body_fat');

-- weekly_logs 테이블 존재 확인
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_name = 'weekly_logs'
);
```

---

## 4. (선택) AI 조언 Edge Function 배포

주간 기록·AI 조언 기능 사용 시:

```bash
# OpenAI API 키 설정
supabase secrets set OPENAI_API_KEY=sk-...

# 함수 배포
supabase functions deploy ai-advice
```

---

## 5. 체크리스트 요약

| # | 작업 | 상태 |
|---|------|------|
| 1 | Supabase SQL Editor에서 마이그레이션 SQL 실행 | ⬜ |
| 2 | participants에 age, gender, height_cm, target_body_fat 컬럼 추가 확인 | ⬜ |
| 3 | weekly_logs 테이블 생성 확인 | ⬜ |
| 4 | (선택) ai-advice Edge Function 배포 | ⬜ |

---

## 참고

- 마이그레이션 파일: `supabase/migrations/20250225000001_v2_weekly_logs_and_participants.sql`
- 배포 가이드: `docs/DEPLOYMENT_V2.md`
