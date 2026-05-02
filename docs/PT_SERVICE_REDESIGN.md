# WODYBODY 서비스 재정의 — 공개 마켓플레이스에서 개인 PT로

## 0. TL;DR

WODYBODY를 **"공개 WOD 마켓플레이스"**에서 **"AI(Grok)가 매일 오늘의 운동을 추천·푸시하는 개인 PT"** 로 재정의한다. 기존 CRA + MUI 웹 프론트엔드는 그대로 유지하되, Capacitor 7.x로 래핑해 iOS/Android 모바일 앱으로 출시한다. Burnfat 서비스는 별도 도메인/스택이며 본 재설계의 **범위 밖**이다.

## 1. 왜 바꾸는가

기존 마켓플레이스 모델의 문제:

- **공급 측 빈약**: 신규 사용자가 들어와도 공개 WOD가 충분하지 않으면 첫 인상이 빈약. "황금시간(`expires_at`)" 컨셉도 콜드스타트 문제를 가속.
- **소비 측 결정피로**: 사용자에게 "오늘 어떤 WOD를 할까?"를 매번 결정시키는 것은 PT라기보다 콘텐츠 큐레이션 부담.
- **참여 신청·승인 흐름 과잉**: `Registrations`, `ProgramParticipants`, `pending/approved/rejected/left` 등 SaaS급 복잡도가 1인용 운동 도구로는 과해.
- **모바일 핏 부재**: 수익성 있는 운동 앱 시장은 푸시 + 일일 루틴이 핵심인데 현재 IA는 그 흐름이 빠짐.

새 모델의 이점:

- **결정 부담 0**: 매일 아침/저녁 정해진 시간에 푸시로 "오늘의 WOD"가 도착. 사용자는 [시작]만 누르면 된다.
- **개인화**: 선호도(목표·기구·가용시간·난이도) + 과거 30일 기록 + 직전 7일 추천 이력을 모두 Grok 프롬프트에 전달해 매번 다른 추천을 생성.
- **모바일 1순위**: Capacitor 셸 + `@capacitor/push-notifications`로 iOS(APNs)·Android(FCM) 정식 푸시 지원.
- **재사용 극대화**: 기존 [MuiStepBasedCreateProgramPage](../frontend/src/components/MuiStepBasedCreateProgramPage.tsx), [MuiWODBuilder](../frontend/src/components/MuiWODBuilder.tsx), [MuiWorkoutTimer](../frontend/src/components/MuiWorkoutTimer.tsx), [MuiPersonalRecordsPage](../frontend/src/components/MuiPersonalRecordsPage.tsx)는 그대로 사용. 신규 화면은 Today / Preferences 두 개뿐.

## 2. 핵심 사용자 시나리오

```mermaid
flowchart LR
    A[가입/온보딩] --> B[선호 입력]
    B --> C[푸시 권한 요청]
    C --> D[(다음 날 09:00)]
    D --> E[푸시 도착<br/>"오늘의 WOD"]
    E --> F{사용자 선택}
    F -->|시작| G[타이머]
    F -->|다른 추천| H[Grok 재호출<br/>일 3회 한도]
    F -->|건너뛰기| I[skipped 기록]
    G --> J[기록 저장]
    J --> K[History·통계 갱신]
    H --> E
    I --> D
```

신규 사용자 첫 7일:

1. D+0: 가입 → 선호 입력 → 푸시 권한 → 즉시 첫 추천 표시.
2. D+1~6: 정해진 push_time에 알림. 완료/스킵 데이터 누적.
3. D+7: 추천이 사용자 패턴(완료 시간·스킵률)에 적응하기 시작 — 난이도·볼륨 자동 조정.

## 3. 유지·제거·신규 결정표

| 분류 | 항목 | 결정 |
|---|---|---|
| 유지 | 회원가입·로그인·이메일 인증·비밀번호 재설정 | 그대로 |
| 유지 | JWT Bearer 인증 ([backend/app.py:42-127](../backend/app.py)) | 그대로 (모바일 친화적) |
| 유지 | WOD 직접 만들기 ([MuiStepBasedCreateProgramPage.tsx](../frontend/src/components/MuiStepBasedCreateProgramPage.tsx)) | "라이브러리" 탭에서 사용 |
| 유지 | 운동 타이머 ([MuiWorkoutTimer.tsx](../frontend/src/components/MuiWorkoutTimer.tsx)) | Today에서 호출 |
| 유지 | 개인 기록·통계 ([MuiPersonalRecordsPage.tsx](../frontend/src/components/MuiPersonalRecordsPage.tsx)) | History 탭으로 이름만 변경 |
| 유지 | 알림 페이지 ([MuiNotificationsPage.tsx](../frontend/src/components/MuiNotificationsPage.tsx)) | 컨텐츠를 "추천 도착" 위주로 |
| 유지 | `programs` 테이블 + `workout_records` + `personal_goals` | 데이터·모델 보존 |
| 제거(deprecate API) | `/api/programs/{id}/open` | 410 Gone |
| 제거(deprecate API) | `/api/programs/{id}/register` `/unregister` | 410 Gone (코드상은 라우트 미존재 — `/join` `/leave`만 존재) |
| 제거(deprecate API) | `/api/programs/{id}/results` | 410 Gone |
| 제거(deprecate API) | `/api/programs/{id}/join` `/leave` | 410 Gone |
| 제거(UI) | [MuiProgramsPage.tsx](../frontend/src/components/MuiProgramsPage.tsx) | 코드 삭제 또는 `.deprecated.tsx` 리네임 |
| 제거(UI) | [MuiSharedProgramPage.tsx](../frontend/src/components/MuiSharedProgramPage.tsx) | 코드 삭제 또는 `.deprecated.tsx` 리네임 |
| 보존(데이터) | `Registrations`, `ProgramParticipants` 테이블 | 마이그레이션 없음. 새 로직만 사용 안 함 |
| 보존(컬럼) | `programs.expires_at`, `programs.is_open` | nullable 유지, 신규 로직에서 미사용 |
| 신규(모델) | `user_preferences` | 사용자별 PT 설정 |
| 신규(모델) | `daily_assignments` | (user_id, date) 기준 오늘의 WOD 캐시 |
| 신규(모델) | `push_tokens` | iOS/Android 디바이스 토큰 |
| 신규(라우트) | `/api/me/preferences` `GET PUT` | |
| 신규(라우트) | `/api/today` `GET` `/api/today/refresh` `POST` `/api/today/complete` `POST` `/api/today/skip` `POST` | |
| 신규(라우트) | `/api/recommendations/generate` (내부용) | |
| 신규(라우트) | `/api/me/push-tokens` `POST DELETE` | |
| 신규(워커) | `backend/utils/scheduler.py` (APScheduler 인-프로세스) | 일일 푸시 발송 |
| 신규(셸) | `mobile/` Capacitor 7.x | |

## 4. 주요 컴포넌트와 경로 매핑

```mermaid
flowchart TB
    subgraph Mobile/Web["Capacitor App + Web (frontend/)"]
        T[MuiTodayPage]
        P[MuiPreferencesPage]
        H[MuiPersonalRecordsPage<br/>= History]
        L[Library = my WODs]
        TM[MuiWorkoutTimer]
        N[MuiNotificationsPage]
    end

    subgraph Backend["backend/"]
        TR[/api/today]
        PR[/api/me/preferences]
        PUSH[/api/me/push-tokens]
        REC[/api/recommendations/generate]
        SCHED[utils/scheduler.py]
    end

    subgraph External
        GROK[xAI Grok API]
        APNS[APNs HTTP/2]
        FCM[FCM HTTP v1]
    end

    T <--> TR
    P <--> PR
    T --> TM
    SCHED --> REC
    REC --> GROK
    SCHED --> APNS
    SCHED --> FCM
    Mobile/Web -- 디바이스 토큰 --> PUSH
```

## 5. 측정 가능한 성공 지표

- 신규가입 → D+1 푸시 수신율 ≥ 80%
- 푸시 → "오늘의 WOD" 화면 진입율 ≥ 40%
- "다른 추천 받기" 평균 호출 < 0.5회/일·사용자 (Grok 비용 통제)
- D+7 잔존율 ≥ 30% (개인 PT 컨셉 검증)
- 일 평균 완료된 WOD 수 ≥ 0.6/사용자

## 6. 비-목표 (이번 재설계에서 안 하는 것)

- Burnfat 통합·코드 공유 — Burnfat은 별도 서비스로 유지.
- 영양·식단·체지방 트래킹 — Burnfat 영역.
- 그룹 챌린지·실시간 랭킹 — 마켓플레이스 잔재이므로 deprecate.
- 결제·구독 — 1차 출시 후 별도 단계.

## 7. 참고 파일

- 기존 인증 시스템: [backend/app.py](../backend/app.py)
- Grok 호출 패턴 레퍼런스: [backend/routes/burnfat_ai.py](../backend/routes/burnfat_ai.py)
- 기존 프론트 라우팅: [frontend/src/App.tsx](../frontend/src/App.tsx)
- 기존 API 클라이언트: [frontend/src/utils/api.ts](../frontend/src/utils/api.ts)
- 기존 타입: [frontend/src/types/index.ts](../frontend/src/types/index.ts)
