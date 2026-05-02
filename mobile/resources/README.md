# Mobile Assets

이 폴더는 iOS / Android 아이콘과 스플래시 원본을 보관한다.

## 필수 파일

| 파일 | 권장 사이즈 | 비고 |
|---|---|---|
| `icon.png` | 1024×1024 | 정사각형. 배경 단색 또는 라운드 추후 OS가 마스킹 |
| `splash.png` | 2732×2732 | 정사각형. 중앙 로고가 모든 디바이스에 안전하게 들어옴 |

## 자동 생성

PIL이 있는 환경이면 다음 한 줄로 placeholder를 만들 수 있다.

```bash
pip install Pillow
python mobile/resources/generate_assets.py
```

이렇게 만든 원본을 모든 디바이스 사이즈로 분기 생성하려면 `@capacitor/assets`를 추천한다.

```bash
cd mobile
npm install -D @capacitor/assets
npx capacitor-assets generate \
  --iconBackgroundColor '#1976d2' \
  --splashBackgroundColor '#1976d2'
```

이후 `npx cap sync`로 네이티브 프로젝트에 적용된다.

## 디자인 가이드

- 컬러: WODYBODY 브랜드 블루 `#1976D2` 그라디언트 (다크 톤 `#0D47A1`).
- 폰트: 시스템 폰트 (앱 출시용으로는 SF Pro 또는 Pretendard 등 라이선스 정리된 폰트로 교체).
- 로고는 앱 아이콘에서 'W'로 단순화, 스플래시에선 'WODYBODY' 풀 텍스트.
