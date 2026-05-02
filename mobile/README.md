# WODYBODY Mobile (Capacitor 7.x)

**역할**: 기존 웹 프론트엔드(`../frontend/`)를 Capacitor로 래핑한 iOS/Android 셸.
웹 코드 변경 후 `npm run sync` 또는 `npm run run:ios|android`으로 네이티브 앱에 반영한다.

> Burnfat 서비스(`../burnfat/`)와는 완전히 분리되어 있다. 본 셸은 WODYBODY만 담당.

## 디렉터리 구조

```
mobile/
├── capacitor.config.ts   # 앱 ID/이름/플러그인 설정
├── package.json
├── README.md
├── resources/            # 아이콘/스플래시 원본 (Phase 3 native polish)
├── ios/                  # `npx cap add ios` 후 생성
└── android/              # `npx cap add android` 후 생성
```

`webDir`은 `../frontend/build` — CRA의 빌드 산출물을 그대로 번들링한다.

## 처음 셋업

```bash
# 0) 노드 LTS, Xcode (iOS), Android Studio (Android), JDK 17 설치
# 1) 의존성 설치
cd mobile
npm install

# 2) (선택) 웹 빌드를 미리 만들어 둔다
npm run build:web

# 3) 네이티브 플랫폼 추가
npx cap add ios
npx cap add android

# 4) 코드 동기화
npx cap sync

# 5) 네이티브 IDE 열기
npx cap open ios       # Xcode
npx cap open android   # Android Studio
```

> 위 3단계(`cap add`)는 macOS의 CocoaPods + Xcode CLI가 설치되어야 iOS가 추가된다.
> Android는 JDK 17 + Android SDK가 필요. 두 환경 모두 미설치면 그 단계만 건너뛰고 추후 진행해도 된다.

## 일상 개발 흐름

```bash
# 웹 변경 → 네이티브 반영
npm run build:web && npx cap copy

# 또는 한 줄로
npm run run:ios     # iOS Xcode 열기까지
npm run run:android # Android Studio 열기까지
```

핫 리로드를 원하면 `capacitor.config.ts`의 `server.url`을 `http://localhost:3000`으로 설정하고
`server.cleartext: true`로 두면 Frontend dev 서버가 실시간 반영된다(개발 빌드만 권장).

## 푸시 알림

- iOS: APNs P8 키, Bundle ID(`com.wodybody.app`), Team ID, Key ID 필요. Apple Developer Program 등록 후 발급.
- Android: Firebase 프로젝트 → Service Account JSON → 백엔드 환경변수 `FCM_SERVICE_ACCOUNT_JSON`에 저장.

자세한 환경변수와 등록 흐름은 [`../docs/RELEASE_CHECKLIST.md`](../docs/RELEASE_CHECKLIST.md) 참고.

## 자주 쓰는 명령

| 명령 | 설명 |
|---|---|
| `npm run sync` | 웹 빌드 산출물을 네이티브 프로젝트로 복사 + 플러그인 동기화 |
| `npm run copy` | 빌드 산출물만 복사 (빠름) |
| `npm run open:ios` | Xcode 열기 |
| `npm run open:android` | Android Studio 열기 |
| `npm run doctor` | Capacitor 설정/플러그인 상태 점검 |

## 트러블슈팅

- `webDir not found`: 먼저 `npm run build:web`을 실행해 `../frontend/build`를 만든다.
- `pod install` 실패: `sudo gem install cocoapods` 후 `cd ios/App && pod install`.
- 만약 `xcodebuild`가 `IDESimulatorFoundation` 등 시스템 프레임워크 로딩에 실패한다면
  Xcode 업데이트 또는 `xcodebuild -runFirstLaunch` 실행. 본 저장소를 처음 셋업한 환경에서는
  Xcode 26.4.1의 일부 플러그인 로딩 문제로 `npx cap add ios` 단계의 `pod install`만 실패하고
  iOS 프로젝트 스캐폴드는 `mobile/ios/App/`에 정상 생성되어 있다. 이 경우 다음 명령으로 직접 진행:

  ```bash
  cd mobile/ios/App
  pod install
  open App.xcworkspace
  ```

- Android 빌드 실패(JDK): JDK 17 권장. JDK 21에서는 Gradle 일부 경고 가능. `JAVA_HOME` 확인 후 Gradle Sync.

## 출시 체크리스트

`../docs/RELEASE_CHECKLIST.md`에 단계별 절차를 정리해 두었다.
