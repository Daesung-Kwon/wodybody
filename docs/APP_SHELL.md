# WODYBODY 앱 셸 (web → Capacitor)

Wave 2: `frontend/` 는 Vite. BurnFat 소스는 alias `@burnfat` 로 같은 번들에 포함된다.

## 한 앱에 두 제품

Capacitor 앱 ID `com.wodybody.app` 이 단일 웹 번들을 로드한다.

| path | 제품 |
|---|---|
| `/login` `/register` `/reset-password` | 인증 |
| `/today` `/history` `/library` `/preferences` `/notifications` | WODYBODY PT |
| `/burnfat` `/burnfat/create` `/burnfat/c/:code` | BurnFat (같은 번들) |

웹 호스트 분기 (Wave 2):

- `www.wodybody.com` → PT
- `burnfat.wodybody.com` → BurnFat 라우트
- 네이티브 딥링크: `wodybody://today`, `wodybody://burnfat/c/:code`

## 인증

- 주 경로: `Authorization: Bearer <access_token>`
- 저장: 웹 `localStorage`, 네이티브 `@capacitor/preferences`
- 쿼리 `?user_id=`, Safari 무서명 헤더/쿠키, UA 자동 로그인은 제거됨

## 토큰·API URL

- `VITE_API_URL` 이 localhost가 아닌 빌드에서 필수 (Capacitor 포함). `REACT_APP_API_URL` 도 Vite `envPrefix`로 읽힘.
- Socket.IO는 `auth.token`만 사용. 쿼리스트링에 JWT를 넣지 않음
- Capacitor `webDir` = `../frontend/dist`
- `burnfat.wodybody.com` 호스트면 PT 셸 없이 BurnFat 라우트만 (`/`, `/create`, `/c/:code`)
- 공유 링크는 항상 `https://burnfat.wodybody.com/c/:code`
