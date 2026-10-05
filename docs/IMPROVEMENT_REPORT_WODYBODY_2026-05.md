# WODYBODY 본체 종합 개선 보고서 (2026-05)

> **대상**: `crossfit-system` 모노레포 중 wodybody 본체 — `backend/`(Flask, Railway), `frontend/`(CRA + MUI 7, www.wodybody.com), `mobile/`(Capacitor 7), `docs/`, 루트 모노레포 위생.
> **제외**: `burnfat/` SPA 및 `backend/routes/burnfat_*.py` (별도 `burnfat/docs/IMPROVEMENT_REPORT_2026-05.md` 트랙).
> **작성일**: 2026-05-22.
> **단일 출처(SSOT)**: 이 파일이 wodybody 본체 후속 작업의 SSOT입니다. 이후 Sprint 핸드오프 문서는 본 문서의 Sprint 섹션을 기준으로 작성하세요.

---

## 0. TL;DR

wodybody 본체는 "PT(Personal Training) 재정의" 이후 백엔드(Grok 추천 엔진·APScheduler 푸시 워커·SQLAlchemy 기반 12개 블루프린트), 웹 프런트(MUI 7 SPA), Capacitor 7 셸까지 형태는 모두 갖춰져 있지만, **3개 영역 모두 "구조는 완성, 안전 장치는 미완성"** 상태입니다.

핵심 수치:

| 지표 | 현재 | 코멘트 |
|------|------|--------|
| 백엔드 인증 우회 경로 | **3건 (P0)** | URL `?user_id=`, `/api/debug/test-login`, Safari `user_id=1` 하드코딩 |
| 프런트 보안 즉시 위험 | **2건 (P0)** | WS 디버거 프로덕션 상시 노출, AES 키 하드코딩 |
| 모바일 빌드 차단 | **2건 (P0)** | iOS `DEVELOPMENT_TEAM` 미설정, Android `google-services.json` 부재 |
| 백엔드 라우트 LoC | `programs.py` 1,001줄 / `recommendations.py` 506줄 | 메가 라우트 다수 |
| 프런트 메가 컴포넌트 | `MuiWODBuilder.tsx` 842줄 / `MuiStepBasedCreateProgramPage.tsx` 828줄 / `MuiExerciseSelector.tsx` 656줄 | 책임 과적 |
| 라우팅 | react-router 미사용 | URL 고정, 뒤로가기 불가 |
| 테스트 | 백엔드 0건 / 프런트 `App.test.js` 1건 | 사실상 0% |
| 루트 마크다운 | 40+ 개 (`REFACTORING_REPORT_PHASE1*.md` 5종 등 중복) | 모노레포 위생 부채 |
| 운영 자동화 | mobile 전용 CI 워크플로 없음 | TestFlight/Play 업로드 100% 수동 |

권장 진행 순서는 §6의 **Sprint 0 → Sprint 1 → Sprint 2 …** 입니다. **Sprint 0(보안 응급 처치)은 5영업일 내 머지 권장** — 현재 임의 사용자 세션 발급이 가능한 상태입니다.

---

## 1. 시스템 현황

### 1.1 배포 토폴로지

```
                    ┌──────────────────────────┐
                    │  Vercel:                 │
   www.wodybody.com │  frontend/ (CRA + MUI 7) │ ──┐
                    └──────────────────────────┘   │  /api/*  (CORS allowed)
                                                   ▼
                    ┌──────────────────────────────────────┐
                    │  Railway: backend/                   │
                    │  gunicorn -w 1 --worker-class eventlet│
                    │  app:app (Flask + SocketIO)          │
                    │  Postgres (wodybody 본체)            │
                    │  + Supabase (burnfat 전용, 분리)     │
                    └──────────────────────────────────────┘
                                                   ▲
                    ┌──────────────────────────┐   │
                    │ Capacitor 7 셸           │ ──┘  (frontend/build 번들 로드)
                    │ iOS / Android            │      별도 npx cap sync 필요
                    └──────────────────────────┘
```

- **Root Directory = `/backend`**, SSOT = `backend/railway.toml`. 루트의 `Procfile`/`railway.toml`/`railway.json`은 비활성 참조용 (README의 배포 매트릭스 참조).
- frontend는 CRA(`react-scripts@5.0.1`) + MUI 7 + `socket.io-client`. 라우팅은 `useState<Page>` 기반.
- mobile은 `webDir: '../frontend/build'`로 frontend 빌드 산출물을 번들로 탑재 (오프라인 로컬 에셋 모드). 원격 도메인 직접 로드 아님.
- burnfat은 `burnfat.wodybody.com` 별도 Vercel 프로젝트, Supabase 사용. **본 보고서 범위 외**.

### 1.2 백엔드 라우트 인벤토리

| 블루프린트 | 파일 | 라인 | 책임 |
|---|---|---:|---|
| auth | `routes/auth.py` | 152 | 회원가입·로그인·로그아웃 |
| programs | `routes/programs.py` | **1,001** | WOD CRUD + 마켓플레이스 잔재 |
| workout_records | `routes/workout_records.py` | 346 | 기록 CRUD + 통계 |
| recommendations | `routes/recommendations.py` | **506** | Grok 일일 WOD 추천 엔진 |
| goals | `routes/goals.py` | 161 | 개인 목표 |
| notifications | `routes/notifications.py` | 180 | 알림 + SocketIO emit |
| preferences | `routes/preferences.py` | 120 | PT 사용자 선호 |
| today | `routes/today.py` | 189 | 오늘의 WOD(get/refresh/complete/skip/feedback) |
| push | `routes/push.py` | 95 | 푸시 토큰 등록/해제 |
| exercises | `routes/exercises.py` | 80 | 운동 카탈로그 |
| password_reset | `routes/password_reset.py` | 234 | 비번 재설정 |
| email_verification | `routes/email_verification.py` | 115 | 회원가입 이메일 인증 |
| websocket | `routes/websocket.py` | 51 | (사실상 미사용 — app.py에 핸들러 직접 등록됨) |
| ~~burnfat_ai / burnfat_coach~~ | — | 666 / 1,002 | **범위 외** |

`backend/app.py`(543줄)에 Flask 앱 초기화, `get_user_id_from_session_or_cookies()`, SocketIO 초기화, 헬스체크/디버그 라우트, 시드 함수가 모두 공존합니다.

### 1.3 프런트 컴포넌트 인벤토리(주요)

`frontend/src/components/` — 25개의 `Mui*.tsx` 단일 평면 디렉터리. `pages/` 폴더 부재. 페이지·모달·셀·키패드가 한 폴더에 섞여 있어 책임 구분이 어렵습니다.

---

## 2. 보안·안정성 즉시 위험 (P0)

> 모두 **5영업일 내** 머지 권장. Sprint 0의 본체.

### 2.1 [Backend] URL 파라미터로 임의 사용자 세션 발급

`backend/app.py:66-82` — `?user_id=<숫자>`를 그대로 받아 `session['user_id']`에 기록합니다. 인증 검증이 **전혀 없습니다**.

```python
user_id_param = request.args.get('user_id')
# ...
user_id = int(user_id_param)
session['user_id'] = user_id   # ← 검증 없음
```

영향: 누구든 `https://api.wodybody.com/api/programs?user_id=1`만 호출해도 user 1의 세션이 발급됩니다. **계정 탈취 등급**.

조치: 이 폴백 전부 제거. Safari 호환은 §2.4의 통일 방안으로 대체.

### 2.2 [Backend] `/api/debug/test-login` 프로덕션 노출

`backend/app.py:326-337` — POST `{"user_id": 1}` 한 번에 해당 사용자 세션이 발급됩니다. 환경 가드(`IS_RAILWAY`, `DEBUG`) 없습니다.

조치: 디버그 라우트 전체를 `routes/debug.py`로 격리 후 `if os.environ.get("FLASK_ENV") == "development"` 가드로만 등록.

### 2.3 [Backend] Safari 자동 인증에서 `user_id = 1` 하드코딩

`backend/routes/workout_records.py:130`, `backend/routes/goals.py:30` — `get_user_id_from_session_or_cookies()` 실패 시 Safari User-Agent만 감지되면 `user_id = 1`로 고정 세팅합니다.

영향: user 1번(= `simadeit@naver.com` 주석)의 운동 기록/목표가 익명 Safari 사용자에게 그대로 노출됩니다.

조치: 두 줄 모두 즉시 제거. 인증 실패 시 401.

### 2.4 [Backend] `X-Safari-Auth-Token` 서명 없음

`backend/app.py:85-101` — base64로 이메일을 디코딩해 Users 테이블에서 조회합니다. 누구든 `base64(타인이메일)` 헤더를 전송하면 그 사용자로 인증됩니다.

조치: Safari 폴백은 표준 JWT(서명 + exp 검증) 단일 경로로 통일. itsdangerous를 유지하더라도 salt 분리·만료 검증 강화. §3.1과 묶어서 처리.

### 2.5 [Frontend] WebSocket 디버거가 프로덕션에 상시 렌더링

`frontend/src/App.tsx:174` — `MuiWebSocketDebugger`가 `NODE_ENV` 가드 없이 무조건 마운트됩니다. 화면 우측 하단 `BugReportIcon`이 항상 노출되고, 클릭 시 JWT 토큰 길이·API URL·Socket ID가 UI에 표시되며 별도 Socket.IO 연결이 추가로 열립니다.

조치: `{process.env.NODE_ENV !== 'production' && <MuiWebSocketDebugger />}`로 가드.

### 2.6 [Frontend] AES 암호화 키 하드코딩

`frontend/src/components/SecureKeypadAdvanced.tsx` — `'demo-encryption-key-2024'`가 번들에 포함됩니다. 주석에는 "실제 환경에서는 환경 변수 사용"이라 적혀 있지만 그대로 방치된 상태입니다.

조치: 즉시 환경 변수화하거나, 보안 키패드 3종이 **DemoPage 전용**이라는 사실(§3.6)을 고려해 프로덕션 번들에서 완전히 제거.

### 2.7 [Mobile] iOS 빌드 차단 — `DEVELOPMENT_TEAM` 미설정

`mobile/ios/App/App.xcodeproj/project.pbxproj` 350, 370행 — `CODE_SIGN_STYLE = Automatic`이지만 `DEVELOPMENT_TEAM`이 한 줄도 없습니다. Xcode에서 열면 즉시 "No Account" 오류. **현재 상태로는 Archive 불가**.

### 2.8 [Mobile] Android FCM 미설정

`mobile/android/app/google-services.json` 부재. Firebase 프로젝트도 없는 상태. `@capacitor/push-notifications`가 설치되어 있어도 Android에서 푸시 토큰 자체가 발급되지 않습니다. `build.gradle:48-53`의 try/catch가 플러그인 미적용을 조용히 처리하여 **사용자 경고 없이 푸시가 전혀 동작하지 않는 상태**.

---

## 3. 안정성·품질 P1

### 3.1 `SECRET_KEY` 미설정 시 토큰 무효화 폭풍

`backend/app.py:188` — `SECRET_KEY = os.environ.get('SECRET_KEY', secrets.token_hex(32))`. Railway 환경 변수에 `SECRET_KEY`가 설정되어 있지 않으면 배포·재시작마다 시크릿이 새로 생성되어 **기존 토큰·세션 전부 무효화**됩니다.

조치: 부팅 시 `SECRET_KEY` 미설정이면 즉시 fail-fast(`raise RuntimeError`). 운영 가이드 문서에 반영.

### 3.2 SocketIO `cors_allowed_origins='*'` + 인증 없는 `join_user_room`

- `backend/app.py:167` — SocketIO CORS가 와일드카드.
- `backend/app.py:484-492` — 클라이언트가 보낸 `user_id`를 검증 없이 `join_room(f'user_{user_id}')`. 즉, 사용자 A가 `{user_id: B}`를 보내면 B의 알림 채널에 입장합니다.

조치: ① SocketIO CORS도 동적 검증 함수로 통일, ② `connect`에서 `Authorization` Bearer로 user_id 도출 후 본인 방만 join 허용.

### 3.3 iOS 푸시 HTTP/1.1 전송 — 미동작 가능성

`backend/utils/push_dispatch.py:119-127` — `requests`(HTTP/1.1)로 APNs를 호출합니다. APNs는 HTTP/2 표준이며 HTTP/1.1을 받지 않습니다. 자체 주석으로도 "운영에서는 hyper/httpx[h2]로 교체 권장"이라 명시되어 있습니다. **현재 iOS 푸시가 동작하지 않을 가능성이 매우 높음**.

조치: `httpx[http2]`로 교체. 동시에 §2.8의 Android FCM 자격증명 설정과 묶어 PT 일일 푸시 워커(§5)의 end-to-end 검증 단계 추가.

### 3.4 Resend API 성공 코드 200 오판

`backend/utils/email.py:52-54` — Resend는 성공 시 **201 Created**를 반환합니다. 현재 코드는 `status_code == 200`만 성공으로 간주하므로 모든 이메일 발송이 "실패"로 로깅됩니다. 실제 전송은 됐을 수 있어도 운영 대시보드의 신호가 거짓 음성이 됩니다.

조치: `status_code in (200, 201)` 또는 `2xx` 전체로 확장. + 비밀번호 재설정/이메일 인증 흐름의 통합 테스트 추가.

### 3.5 `@types/react@19` vs `react@18` 불일치

`frontend/package.json` — 타입 정의는 19, 런타임은 18. `tsconfig.json`의 `skipLibCheck: true`와 `vercel.json`의 `--legacy-peer-deps`가 컴파일 오류를 가리고 있습니다. MUI 7 패치나 CRA 관련 의존성 변경 한 번으로 타입 체계가 무너질 수 있는 시한폭탄.

조치: `@types/react`를 18 라인으로 핀.

### 3.6 보안 키패드 3종은 DemoPage 전용

`SecureKeypad.tsx`, `SecureKeypadAdvanced.tsx`, `SecureQwertyKeypad.tsx` 모두 실제 사용처는 `DemoPage.tsx` 뿐. `MuiLoginPage`/`MuiRegisterPage`는 표준 `TextField type="password"` 사용. 즉 보안 키패드는 프로덕션 인증 흐름에 연결되지 않은 채 번들에 포함되어 있습니다.

조치: ① 데모 코드를 lazy import + 라우트 분리, ② 또는 데모 유지 가치를 판단하여 제거. 최소한 §2.6의 하드코딩 키부터 제거.

### 3.7 react-router 미사용 — URL 고정·뒤로가기 불가

`frontend/src/App.tsx`가 `useState<Page>` + 조건부 렌더링으로 SPA "라우팅"을 합니다. 결과:

- 새로고침 시 항상 로그인/오늘 화면으로 복귀
- 브라우저 뒤로가기 동작 안 함
- 네이티브 푸시 딥링크가 `target.includes('today')` 같은 문자열 매칭으로 처리됨 (`utils/native.ts`)

조치: `react-router-dom@6`(또는 데이터 라우터) 도입. Capacitor 딥링크 → 라우터 어댑터 연결. Sprint 1에서 처리.

### 3.8 JWT refresh 흐름 없음

`frontend/src/contexts/AuthContext.tsx` — 토큰 갱신 로직이 없습니다. 만료 도래 시 401 → `globalRedirectToLogin()`. 운동 타이머 실행 중 만료되면 완료 기록이 소실됩니다.

조치: refresh token(또는 sliding session) 도입. 만료 5분 전 백그라운드 재발급.

### 3.9 Android `POST_NOTIFICATIONS` 권한 + iOS Push Capability 누락

- `mobile/android/app/src/main/AndroidManifest.xml` — `INTERNET` 외 권한 없음. Android 13+ 푸시 필수 권한 누락.
- `mobile/ios/App/App/Info.plist` — `NSCameraUsageDescription` 등 사용자 대면 권한 설명 전무, `aps-environment` entitlement 부재.

영향: 둘 다 스토어 심사·런타임 권한 둘 다에서 문제 발생.

### 3.10 Android 릴리스 서명 미설정

`mobile/android/app/build.gradle` — Release 타입에 `signingConfig` 없음, Keystore 파일도 레포에 없음. Play Console AAB 업로드가 즉시 거부됩니다.

### 3.11 N+1 쿼리 다수

- `routes/programs.py:514-515` — 참여자 루프에서 `Users.query.get(p.user_id)` 호출
- `routes/programs.py:49-82` — `GET /api/programs` 응답 빌더가 프로그램마다 creator/participant/exercise/pattern을 별도 조회 (프로그램 10개면 40+ 쿼리)
- `routes/workout_records.py:143-148` — 기록 루프마다 `Programs.query.get(...)`
- `routes/workout_records.py:311` — 같은 program_id를 2회 조회

조치: SQLAlchemy `selectinload`/`joinedload` 또는 단일 JOIN으로 묶기. Sprint 2~3에서.

### 3.12 `create_notification` 중복 + `broadcast_program_notification` 미정의

`programs.py:736`과 `notifications.py:107`에 거의 동일한 함수가 두 벌 존재. 추가로 `programs.py:389`의 `broadcast_program_notification(...)`은 import 없이 사용되어 있어 `MARKETPLACE_ENABLED=true`로 켜는 순간 즉시 `NameError`로 500이 납니다.

---

## 4. UX·기술 부채 P2

### 4.1 `window.alert`/`window.confirm`과 디자인 시스템 혼용

`MuiTodayPage.tsx`(L73,84,100), `MuiPersonalRecordsPage.tsx`(L53), `MuiRecordCard.tsx` 등 5건 이상에서 브라우저 네이티브 alert/confirm 사용. `MuiAlertDialog`가 이미 존재함에도 일관적으로 사용되지 않음. + Snackbar 미사용.

### 4.2 a11y 결손

전체 컴포넌트 grep 기준 `aria-label` 사용 **1건**. `IconButton` 다수에 라벨 없음. 다크모드 토글이 이모지(`☀️`/`🌙`)로만 표현됨. `SecureQwertyKeypad` 버튼 최소 너비가 `xs: 28px`로 터치 권고(44px) 미달.

### 4.3 데이터 캐싱 없음 — 탭 전환마다 재요청

`utils/api.ts`는 단순 fetch 래퍼. React Query/SWR 미사용. 페이지 컴포넌트가 마운트마다 직접 fetch + 로컬 `useState`에 저장.

### 4.4 메가 컴포넌트

| 파일 | 라인 | 분해 후보 |
|---|---:|---|
| `MuiWODBuilder.tsx` | 842 | 검색 / 패턴 빌더 / 미리보기 |
| `MuiStepBasedCreateProgramPage.tsx` | 828 | 4단계 스테퍼를 각 단계 컴포넌트로 |
| `MuiExerciseSelector.tsx` | 656 | 카테고리 필터 / 검색 / 선택 목록 |

### 4.5 사이드 드로어 메뉴 미구현

`MuiNavigation.tsx:118-130` — 프로필/설정/도움말 항목이 클릭해도 `toggleDrawer()`만 호출. 실제 이동 없음.

### 4.6 CRA EOL

`react-scripts@5.0.1`은 사실상 유지보수 종료. `--legacy-peer-deps`와 `skipLibCheck`가 누적되며 빌드 안정성이 점진적으로 떨어집니다. 중기 마이그레이션 후보: **Vite + React 18** (burnfat과 스택 통일 가능).

### 4.7 컨테이너 환경에서 무의미한 파일 로그

`app.py:179` — `RotatingFileHandler('logs/crossfit.log', maxBytes=1MB, backupCount=10)`. Railway는 배포마다 컨테이너 파일시스템이 초기화됩니다. `stdout` 핸들러만 두는 게 정답.

### 4.8 메가 헬퍼 중복

`get_user_id_from_session_or_cookies()`가 12개 라우트 파일에서 동일 패턴으로 재정의되거나 호출됩니다. `utils/auth.py`로 이전 + `@require_auth` 데코레이터화 필요. 일부 파일에 이미 `# TODO: 중앙화된 인증 미들웨어로 교체 예정` 주석이 있습니다(`workout_records.py:15`, `goals.py:14`).

### 4.9 백엔드 백업 파일 잔존

`app_old.py`, `app_old_v2.py`, `app_backup_20251011_221400.py`, `app_before_refactor_v2.py`, `app_new.py`, `app_new_backup.py`, `app_refactored.py`, `simple_app.py` — 7개+. Git 히스토리에 있으므로 모두 삭제 권장.

### 4.10 모노레포 루트 마크다운 과부하 + 죽은 링크

- 루트에 `.md` 40+ 개. `REFACTORING_REPORT_PHASE1*.md` 동일 주제 5종 중복.
- `docs/changelog/index.html:39` → 존재하지 않는 `/DEPLOYMENT_CHECKLIST.md` 링크.
- **`docs/index.html:64`의 데모 영상이 `youtube.com/embed/dQw4w9WgXcQ` (Rick Astley)** — 플레이스홀더가 공개 사이트에 그대로 노출.
- `docs/roadmap/index.html`의 중기 로드맵(국제화·문서 검색 강화)과 실제 방향(PT 재정의·모바일 출시)이 불일치.

### 4.11 인덱스 누락

`programs.creator_id`, `programs.is_open`, `programs.expires_at`에 명시적 인덱스가 없습니다(`models/program.py`). 마켓플레이스 비활성이지만 `GET /api/programs`가 `is_open=True` 필터 + ORDER BY로 호출되므로 full-scan 위험.

### 4.12 테스트·CI

- 백엔드: pytest 테스트 0건. shell 스크립트 검증 위주.
- 프런트: `App.test.js` 1건(로그인 버튼 렌더링). MSW/Vitest 환경 없음.
- `coverage/`가 Git에 커밋되어 있는데 의미 있는 커버리지 없음.
- mobile 전용 GitHub Actions 워크플로 없음.

---

## 5. 기능 개선 후보 (서비스 기획)

> 우선순위 점수: **ICE = Impact × Confidence ÷ Effort** (각 1~5). 기능 채택 시 정량 검증(분석 이벤트 + 코호트) 단계를 Sprint DoD에 포함하세요.

### F1. AI 일일 운동 프로그램 제안의 정식화 (Grok 추천 엔진 v2)

**현 상태**: 코드는 이미 존재(`routes/recommendations.py` 506줄, `routes/today.py` 189줄). `DailyAssignments` 캐시·`refresh_count`·`feedback_json` 모델까지 완비. 단, 다음 갭이 있습니다.

- **컨텍스트 비대**: `_build_context()`가 후보 프로그램 30개를 ExerciseSets까지 포함해 직렬화. 입력 토큰이 `XAI_MAX_TOKENS=300`보다 훨씬 큼 → 비용 + 응답 잘림 위험.
- **시스템 프롬프트 단일**: 사용자 페르소나·목표(감량/근비대/체력)·부상 이력 분기 없음.
- **출력 검증 없음**: `program_id`가 후보 풀에 실제로 존재하는지, `duration_estimate_minutes`가 사용자의 `available_minutes`와 모순되지 않는지 후처리 검증 없음.
- **사용자 가시화 부족**: 현재 프런트에 "오늘의 WOD" 진입점 자체가 약함(`MuiTodayPage.tsx`는 존재하지만 메인 동선에서 강조되지 않음).

**기획안**:
1. **프로그램 카드 슬롯화** — Grok에는 후보 30개 대신 "사용자 매칭 점수 상위 5개"만 전달 (사전 점수: 기구 일치 / 시간 일치 / 직전 7일 중복 회피 / 난이도 매칭). 토큰 ~80% 절감.
2. **다단 프롬프트** — 시스템 프롬프트 1차 + 사용자 페르소나 슬롯(체중 변화 추세·최근 부상 메모) 2차.
3. **JSON 스키마 강제 + 후처리 검증** — `pydantic` 또는 수작업으로 4필드 검증, 실패 시 fallback.
4. **"왜 이걸 추천했나" 카드** — `ai_rationale`을 단순 표시가 아닌 "변경 가능"한 인터랙션(→ refresh 1회 무료 + N회부터 캡 적용)으로 격상.
5. **체험 측정** — `daily_assignments.feedback_json`에 `latency_ms`, `model_version`, `candidate_pool_size` 추가. A/B 가능 구조.

ICE: **Impact 5 / Confidence 4 / Effort 3 → 6.7** (가장 높음)

### F2. 인증·세션 통합 (Sprint 0 외에 별도)

다중 폴백(Bearer / Safari 헤더 / ?user_id= / 4종 쿠키)을 **JWT(Bearer) 단일 경로 + refresh token**으로 통합. 모바일은 Capacitor Preferences에 토큰 저장. 보안 + 만료 UX 동시 개선.

ICE: **Impact 5 / Confidence 5 / Effort 2 → 12.5** ← **최우선 (Sprint 0~1)**

### F3. 라우팅·딥링크 정식화

react-router-dom 도입. `/today`, `/programs/:id`, `/records`, `/preferences` 등 의미 있는 URL. Capacitor `appUrlOpen` 이벤트 → 라우터 navigate. 푸시 알림 탭으로 특정 WOD/기록으로 deep-link.

ICE: **Impact 4 / Confidence 5 / Effort 2 → 10.0**

### F4. 운동 기록 입력 UX 1차 개선

`MuiWorkoutRecordModal` + `MuiWorkoutTimer` + `MuiRecordCard`의 통합 정비. 빈 상태/로딩/에러 일관성, 자동 저장(타이머 종료 후 1탭으로 기록), 사진 첨부(`@capacitor/camera` 도입).

ICE: **Impact 4 / Confidence 4 / Effort 3 → 5.3**

### F5. 푸시 알림 종단 검증

§2.8/§3.3/§3.9를 묶어 실제 단말기에서 PT 일일 푸시(scheduler)가 도달하는지 검증. 도달률 측정 후 발송 시각 A/B(아침 7시 vs 사용자 평균 운동시각 1시간 전).

ICE: **Impact 4 / Confidence 4 / Effort 2 → 8.0**

### F6. 개인 통계·인사이트 카드

`workout_records`와 `daily_assignments`를 결합해 "이번 주 완료율", "직전 4주 강도 추세", "추천 vs 실제 수행 매칭률", "30일 PR(Personal Record) 변화"를 카드로 노출. 정량 동기 부여.

ICE: **Impact 4 / Confidence 4 / Effort 3 → 5.3**

### F7. "운동 라이브러리" 정비 (Exercises 시드 확장)

`backend/app.py:seed_exercise_data()`에 22개만 등재. 크로스핏 운동의 표준 라이브러리(WOD 빌딩 블록 60~100개)로 확장 + 카테고리별 영상/이미지 메타. `MuiExerciseSelector`와 `MuiWODBuilder`의 검색/필터 정확도가 즉시 좋아집니다.

ICE: **Impact 3 / Confidence 5 / Effort 2 → 7.5**

### 우선순위 요약

```
F2 (인증 통합)         ★★★★★  12.5  ← Sprint 0~1
F3 (라우팅·딥링크)     ★★★★    10.0  ← Sprint 1
F5 (푸시 종단 검증)    ★★★★     8.0  ← Sprint 1~2
F7 (운동 라이브러리)   ★★★      7.5  ← Sprint 2 부수
F1 (AI 추천 v2)        ★★★      6.7  ← Sprint 3 (메인)
F4 (기록 UX)           ★★★      5.3  ← Sprint 3
F6 (인사이트 카드)     ★★★      5.3  ← Sprint 4
```

---

## 6. Sprint 로드맵

각 Sprint는 burnfat의 운영 방식(코드 작업 → 핸드오프 문서 → 다음 세션 인수)을 따릅니다. **DoD(Definition of Done)는 항상 ① 코드 + ② vitest/pytest + ③ 문서**.

### Sprint 0 — 보안 응급 처치 (5영업일)

**범위 (모두 P0)**:
- `app.py:66-82`의 `?user_id=` 폴백 제거
- `app.py:326-337` 및 모든 `/api/debug/*` 라우트를 `routes/debug.py`로 격리 + `FLASK_ENV=development` 가드
- `workout_records.py:130`, `goals.py:30`의 `user_id = 1` 하드코딩 제거 → 401 반환
- `app.py:85-101`의 `X-Safari-Auth-Token` 무서명 폴백 제거 (대체 인증은 Sprint 1)
- `App.tsx:174`의 `MuiWebSocketDebugger`를 `NODE_ENV` 가드
- `SecureKeypadAdvanced.tsx`의 하드코딩 키 제거 또는 환경 변수화
- `SECRET_KEY` 미설정 시 부팅 fail-fast (`app.py:188`)
- `utils/email.py:52-54`의 Resend 성공 코드 200/201 동시 허용

**DoD**:
- pytest 회귀(인증 우회 시 모두 401), 운영 health check + 임의 사용자 시연
- `docs/SPRINT0_WODYBODY_HANDOFF.md` 작성

### Sprint 1 — 인증·라우팅 통합 (10영업일)

**범위**:
- F2 — 백엔드 `utils/auth.py`에 `@require_auth` 데코레이터 통합, `get_user_id_from_session_or_cookies()`를 12개 라우트에서 해체. JWT(Bearer) 단일 경로 + refresh token. itsdangerous → PyJWT(HS256) 전환 + key rotation 가이드
- 프런트 `AuthContext`에 refresh 도입, 만료 5분 전 백그라운드 재발급, 401 → refresh 1회 시도 → 실패 시 로그인
- F3 — `react-router-dom@6` 도입. `App.tsx`의 `useState<Page>` 제거. `MuiNavigation`의 드로어 항목을 실제 라우트와 연결
- Capacitor `appUrlOpen` → router navigate 어댑터
- SocketIO `cors_allowed_origins='*'` 제거 + `connect` 시 Bearer로 user_id 도출 + 본인 방만 join 허용 (`app.py:484-492`)

**DoD**:
- vitest로 라우팅 회귀, pytest로 토큰 만료 시나리오, 모든 401/404 케이스
- 회원 1명 5분 운영 시연(브라우저 뒤로가기·푸시 딥링크 포함)

### Sprint 2 — 모바일 출시 준비 + 푸시 종단 검증 (10영업일)

**범위 (P1)**:
- iOS: `DEVELOPMENT_TEAM` 설정 + Push Capability + `aps-environment` entitlement + `Info.plist`에 카메라/마이크/푸시 사용자 설명 추가
- Android: Firebase 프로젝트 생성 → `google-services.json` 추가 + `POST_NOTIFICATIONS` permission + Release `signingConfig` + Keystore 운영 가이드
- 백엔드 `utils/push_dispatch.py` APNs를 `httpx[http2]`로 교체. F5 — 발송→수신 종단 검증 시나리오 작성, 도달률 측정 로그 추가
- mobile 전용 GitHub Actions 워크플로 추가(빌드 검증 only — 스토어 업로드는 수동 유지)
- `versionCode`/`CURRENT_PROJECT_VERSION` 자동 증분 스크립트(`scripts/bump-mobile-version.sh`)

**DoD**:
- 실제 단말기 2종(iOS 16+, Android 13+)에서 PT 일일 푸시 도달 확인
- TestFlight 내부 테스트 빌드 1개 업로드
- `docs/MOBILE_RELEASE_RUNBOOK.md` 갱신

### Sprint 3 — AI 추천 엔진 v2 (15영업일, 메인)

**범위 (F1)**:
- `recommendations.py` 분해 → `services/grok_client.py`, `services/context_builder.py`, `services/recommendation_service.py`
- 사전 점수 기반 후보 풀 5개 압축 + 토큰 사용량 측정
- 시스템 프롬프트 2단(공통 + 페르소나) + JSON 출력 후처리 검증(pydantic)
- `daily_assignments.feedback_json`에 `latency_ms`, `model_version`, `candidate_pool_size`, `prompt_tokens`, `completion_tokens` 추가
- 프런트 "오늘의 WOD" 카드 격상: rationale 표시 + 1탭 refresh + "다른 추천 보기" CTA (Sprint 1.5 의 burnfat 패턴 차용)
- A/B 토글(`PT_RECO_VARIANT` env) 도입

**DoD**:
- pytest로 후보 풀 압축·후처리 검증, 입력 토큰 50% 이상 감소 측정
- 실측 응답 시간 P95 < 5s 확인

### Sprint 4 — N+1 제거 + 메가 라우트/컴포넌트 분해 (15영업일)

**범위 (3.11, 4.4, 4.8)**:
- `programs.py` 1,001줄 분해 → `programs.py`(코어 CRUD), `programs_marketplace.py`(아카이브 격리), `programs_helpers.py`
- `programs.creator_id`, `is_open`, `expires_at`, `expires_at NULLS LAST` 인덱스 추가 (Alembic 도입은 별도 결정)
- `selectinload`/`joinedload`로 N+1 제거 — 진입 REST 호출 회수 측정
- 프런트 `MuiWODBuilder` / `MuiStepBasedCreateProgramPage` / `MuiExerciseSelector` 3개 메가 컴포넌트 각 ≤ 300줄로 분해
- React Query 도입 (메인 데이터 소스: today, programs, workout_records, preferences)
- `window.alert` → `MuiAlertDialog`/`Snackbar` 일괄 교체

**DoD**:
- 단위 테스트 100건 이상, ChallengePage 패턴(`burnfat/docs/SPRINT3B_HANDOFF.md`)을 참고한 hook 분리 적용
- 진입 REST 호출 회수 측정 (목표: 페이지당 ≤ 3 round-trip)

### Sprint 5 — 운동 라이브러리 + 인사이트 (10영업일)

- F7 — 운동 카탈로그 60~100개로 확장 + 카테고리별 메타 + 이미지 메타 슬롯
- F6 — 개인 인사이트 카드 (이번 주 완료율 / 4주 강도 추세 / 추천 vs 수행 매칭률 / 30일 PR)
- a11y 1차 패스: `aria-label` 일괄 적용, 키패드/IconButton/다크모드 토글 텍스트 보강

### 백로그 (Sprint 6 이후)

- CRA → Vite 마이그레이션 (frontend; burnfat과 스택 통일)
- pytest CI(GitHub Actions) 정식 도입 + 커버리지 게이트
- Alembic 정식 도입 + 기존 `migrations/*.py` 흡수
- 관측성(Sentry, 또는 자체 에러 집계) + Prometheus 메트릭
- 모노레포 루트 마크다운 정리 — `REFACTORING_REPORT_PHASE1*.md` 5종 → `docs/archive/`로 이전
- `docs/changelog/index.html`의 죽은 링크 + `docs/index.html`의 **Rick Roll YouTube embed** 즉시 교체

---

## 7. 운영 리스크 매트릭스

| ID | 영역 | 심각도 | 발생 가능성 | 영향 | 완화 |
|---|---|---|---|---|---|
| R1 | Backend: 임의 사용자 세션 발급 | 치명 | 즉시 | 계정 탈취 | Sprint 0 §2.1~2.4 |
| R2 | Mobile: 빌드 자체 불가 | 치명 | 즉시 (확정) | 출시 불가 | Sprint 2 §2.7~2.8 |
| R3 | iOS 푸시 미동작 | 높음 | 매우 높음 | PT 핵심 가치 손상 | Sprint 2 §3.3 |
| R4 | SECRET_KEY 미설정 시 토큰 폭풍 | 높음 | 환경 확인 필요 | 사용자 강제 로그아웃 | Sprint 0 §3.1 |
| R5 | Email 발송 실패 거짓 로그 | 중간 | 즉시 (확정) | 운영 신호 오염 | Sprint 0 §3.4 |
| R6 | WS join_user_room 인증 우회 | 높음 | 즉시 | 타인 알림 수신 | Sprint 1 §3.2 |
| R7 | `@types/react` 18/19 mismatch | 중간 | 의존성 업데이트 시 | 빌드 실패 폭탄 | Sprint 1 §3.5 |
| R8 | docs/Rick Roll YouTube | 낮음 | 즉시 (확정) | 브랜드 손상 | Sprint 0 부속 5분 작업 |
| R9 | N+1 쿼리 누적 | 중간 | 사용자 증가 시 | 응답 지연 | Sprint 4 §3.11 |
| R10 | 테스트 부재 | 중간 | 회귀 발생 시 | 규모 작업 진행 마비 | Sprint 1~4 점진 도입 |

---

## 8. 부록

### 8.1 참고 패턴 — burnfat 핸드오프 활용

burnfat의 Sprint 운영 패턴(특히 `burnfat/docs/SPRINT3B_HANDOFF.md`의 메가 컴포넌트 분해, `SPRINT2_HANDOFF.md`의 캐시 테이블 도입)을 wodybody 본체에 그대로 적용 가능합니다. 두 시스템의 데이터 소스는 분리(Postgres vs Supabase)되어 있으므로 코드 패턴만 차용하면 됩니다.

### 8.2 즉시 5분 안에 할 수 있는 일

다음 항목은 보고서 머지 직전이라도 PR 1개로 정리 가능합니다:
- `docs/index.html`의 Rick Roll YouTube embed → 빈 슬롯 또는 placeholder 이미지로 교체
- `docs/changelog/index.html`의 `/DEPLOYMENT_CHECKLIST.md` 죽은 링크 제거
- `backend/` 루트의 `app_old*.py`, `app_backup_*.py`, `app_refactored.py`, `app_new*.py`, `simple_app.py` 7개+ 삭제
- 루트의 `REFACTORING_REPORT_PHASE1*.md` 5종을 `docs/archive/refactoring-2025-10/`로 이동

### 8.3 Sprint 핸드오프 문서 템플릿

```markdown
# WODYBODY Sprint <N> 핸드오프 (YYYY-MM-DD)

## 완료 범위
- [ ] (체크리스트)

## 변경된 파일
- backend/...
- frontend/...
- mobile/...

## 마이그레이션·배포 필요 여부
- DB: (있음/없음, 파일 경로)
- Railway env: (추가/변경 변수)
- Vercel env: ...
- Mobile: (npx cap sync 필요/Xcode 변경 등)

## 테스트
- pytest: <count>, 통과/실패
- vitest: <count>, 통과/실패
- 수동 시연: ...

## 다음 Sprint 진입점
- 파일/함수 단위로 명시
```

---

**문서 끝.** 본 보고서는 wodybody 본체 후속 작업의 SSOT입니다. 변경이 발생하면 이 파일을 갱신하고, 각 Sprint는 별도 `SPRINT<N>_WODYBODY_HANDOFF.md`로 인계하세요.
