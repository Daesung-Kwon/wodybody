# 데이터 마이그레이션 계획 — 마켓플레이스 → 개인 PT

## 0. 원칙

- **데이터는 보존, API와 UI만 차단.** 기존 사용자 활동(`Registrations`, `ProgramParticipants`, `WorkoutRecords`)은 한 줄도 삭제하지 않는다.
- **기존 모델은 nullable 컬럼만 유지하고 신규 로직에서 미사용.** 컬럼 DROP은 1단계 안정화 이후 별도 마이그레이션으로 처리.
- **신규 모델은 추가만(ADD) — 기존 테이블 변경 최소화.** Alembic을 사용하지 않으므로 [backend/migrations/](../backend/migrations/) 폴더의 기존 패턴(SQL+Python 스크립트)을 그대로 따른다.

## 1. 신규 테이블 DDL

### 1.1 `user_preferences`

```sql
CREATE TABLE IF NOT EXISTS user_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    goals TEXT,                       -- JSON array, e.g. ["muscle_gain","conditioning"]
    equipment TEXT,                   -- JSON array, e.g. ["bodyweight","dumbbell"]
    available_minutes INTEGER DEFAULT 20,
    difficulty VARCHAR(20) DEFAULT 'intermediate',
    push_time VARCHAR(5) DEFAULT '09:00',  -- 'HH:MM' 24h
    timezone VARCHAR(64) DEFAULT 'Asia/Seoul',
    push_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT user_preferences_user_uniq UNIQUE (user_id)
);
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
```

### 1.2 `daily_assignments`

```sql
CREATE TABLE IF NOT EXISTS daily_assignments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assignment_date DATE NOT NULL,
    program_id INTEGER REFERENCES programs(id) ON DELETE SET NULL,
    source VARCHAR(20) DEFAULT 'ai_grok', -- 'ai_grok' | 'self_pick' | 'fallback'
    ai_rationale TEXT,
    intensity_hint VARCHAR(20),
    duration_estimate_minutes INTEGER,
    refresh_count INTEGER DEFAULT 0,
    completed_at TIMESTAMP,
    skipped_at TIMESTAMP,
    feedback_json TEXT,            -- JSON {user_feedback, ...}
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT daily_assignments_user_date_uniq UNIQUE (user_id, assignment_date)
);
CREATE INDEX IF NOT EXISTS idx_daily_assignments_user_date ON daily_assignments(user_id, assignment_date);
```

### 1.3 `push_tokens`

```sql
CREATE TABLE IF NOT EXISTS push_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform VARCHAR(10) NOT NULL,  -- 'ios' | 'android' | 'web'
    token VARCHAR(512) NOT NULL,
    app_version VARCHAR(32),
    last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    CONSTRAINT push_tokens_user_token_uniq UNIQUE (user_id, token)
);
CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_active ON push_tokens(is_active) WHERE is_active = TRUE;
```

## 2. 기존 테이블에 대한 처리

| 테이블 | 처리 |
|---|---|
| `users` | 변경 없음. 사용자 식별자 유지. |
| `programs` | 변경 없음. `expires_at`, `is_open`은 nullable 유지(데이터 보존). 신규 로직은 사용 안 함. |
| `program_exercises`, `workout_patterns`, `exercise_sets`, `exercises`, `exercise_categories` | 변경 없음. AI 추천 후보 풀로 활용. |
| `personal_goals` | 변경 없음. History 화면에서 계속 표시. |
| `workout_records` | 변경 없음. `daily_assignments.completed_at`이 채워질 때 동시에 `workout_records`에 INSERT (기존 [POST /api/programs/{id}/records](../backend/routes/workout_records.py) 흐름 그대로 사용). |
| `registrations` | **읽기 전용 보존**. 신규 로직 미사용. 마켓플레이스 라우트가 410을 반환하므로 신규 INSERT는 더 이상 발생하지 않음. |
| `program_participants` | **읽기 전용 보존**. 동일. |
| `notifications` | 변경 없음. 단, `type` 값에 `'daily_recommendation'`, `'wod_completed_streak'` 같은 신규 종류 추가 (스키마 변경 아님). |
| `email_verifications`, `password_resets` | 변경 없음. |

## 3. 마이그레이션 스크립트 위치

- [backend/migrations/add_pt_tables.py](../backend/migrations/add_pt_tables.py) — 신규 3개 테이블을 IDEMPOTENT하게 생성. (Phase 1에서 작성)
- [backend/migrations/add_pt_tables.sql](../backend/migrations/add_pt_tables.sql) — 동일 SQL 버전. Railway 콘솔에서 직접 실행 가능.
- 기존 패턴 참조: [backend/migrations/add_email_verification_table.py](../backend/migrations/add_email_verification_table.py).

> 주의: 본 프로젝트는 Alembic을 도입하지 않았다. 플랜 본문의 "Alembic migration in `backend/migrations/versions/`" 표현은 Alembic이 도입된 다른 프로젝트의 관행을 인용한 것일 뿐, **실제로는 단순 Python+SQL 스크립트로 작성**한다.

## 4. 백엔드 라우트 deprecation 매트릭스

| 라우트 | 현 상태 | 새 처리 |
|---|---|---|
| `POST /api/programs/{id}/open` | 활성 | 410 Gone (`MARKETPLACE_ENABLED=False` 가드) |
| `POST /api/programs/{id}/join` | 활성 | 410 Gone |
| `DELETE /api/programs/{id}/leave` | 활성 | 410 Gone |
| `GET /api/programs/{id}/results` | 활성 | 410 Gone |
| `GET /api/programs/{id}/participants` | 활성 | 410 Gone |
| `PUT /api/programs/{id}/participants/{uid}/approve` | 활성 | 410 Gone |
| `GET /api/programs` | 활성 (공개 목록) | 그대로 유지 — 라이브러리 후보 풀로 사용 |
| `GET /api/programs/{id}` | 활성 (상세) | 그대로 유지 |
| `POST /api/programs` | 활성 (생성) | 그대로 유지 — Library 화면에서 호출 |
| `PUT /api/programs/{id}` | 활성 (수정) | 그대로 유지 |
| `DELETE /api/programs/{id}` | 활성 (삭제) | 그대로 유지 |
| `GET /api/user/programs` | 활성 (내 WOD) | 그대로 유지 |
| `GET /api/user/wod-status` | 활성 | 그대로 유지(또는 응답 단순화) |
| `POST /api/programs/{id}/records` 등 | 활성 (기록) | 그대로 유지 |

`programs.py` 상단에 다음 가드 추가:

```python
import os
MARKETPLACE_ENABLED = os.environ.get('MARKETPLACE_ENABLED', 'false').lower() == 'true'

def _gone_if_marketplace_disabled():
    if not MARKETPLACE_ENABLED:
        return jsonify({
            'error': 'gone',
            'message': '공개 마켓플레이스 기능은 PT 모델로 전환되어 종료되었습니다.'
        }), 410
    return None
```

각 deprecate 대상 라우트 함수의 첫 줄에 다음을 삽입:

```python
gone = _gone_if_marketplace_disabled()
if gone is not None:
    return gone
```

기존 코드 본문은 그대로 두어 환경변수만 바꾸면 부활 가능 (긴급 롤백 대비).

## 5. 데이터 백필(backfill) 정책

- **불필요**. 신규 테이블은 처음에 빈 상태로 시작하고, 사용자 첫 로그인/푸시 권한 부여 시 자연 증가한다.
- 단, **온보딩 안내 모달**(웹·앱 동일)을 첫 로그인 시 1회 노출해 "이전 마켓플레이스 기능은 종료되었음"과 "선호도 입력으로 이동" CTA를 제공할 것 — UI Phase 2 작업.

## 6. 롤백 전략

| 시나리오 | 롤백 방법 |
|---|---|
| 마켓플레이스를 일시 부활시키고 싶음 | `MARKETPLACE_ENABLED=true` 환경변수 → 재배포만 필요. 코드 변경 X. |
| 신규 테이블이 문제를 일으킴 | `DROP TABLE user_preferences, daily_assignments, push_tokens;` — 기존 사용자 데이터에는 영향 없음. |
| Grok 호출이 비용 폭주 | 라우트 단에서 `XAI_API_KEY` 비우기 → 503 + UI 에러 메시지. 대체 폴백으로 `available_programs`에서 무작위 선택. |
| 푸시 워커가 폭주 | APScheduler 잡 중지 (`scheduler.pause()`) — `app.py`에 토글 환경변수 노출. |

## 7. 운영 체크리스트(요약)

- [ ] 신규 환경변수 등록: `XAI_API_KEY`(이미 사용), `APNS_KEY_P8`, `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_BUNDLE_ID`, `FCM_SERVICE_ACCOUNT_JSON`, `MARKETPLACE_ENABLED=false`, `PT_PUSH_ENABLED=true`.
- [ ] 마이그레이션 스크립트 실행 (`python migrations/add_pt_tables.py`).
- [ ] `MuiProgramsPage.tsx`/`MuiSharedProgramPage.tsx` 임포트 제거 또는 `.deprecated.tsx` 리네임.
- [ ] 첫 배포 후 24시간 모니터링: `daily_assignments` insert rate, Grok 4xx/5xx, 푸시 발송 실패율.
