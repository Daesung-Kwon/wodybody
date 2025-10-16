# 🧪 개발 환경 데모 페이지 가이드

## 📋 개요

개발 및 테스트 전용 기능을 모아둔 데모 페이지입니다.

**중요:** 이 페이지는 **개발 환경에서만** 접근 가능하며, 프로덕션 빌드 시 자동으로 제외됩니다.

---

## 🚀 접근 방법

### 개발 환경 (로컬)

```bash
# 개발 서버 실행
cd frontend
npm start

# 브라우저에서 접속
http://localhost:3000/#demo
```

### 프로덕션 환경

```
❌ 접근 불가능 (자동으로 숨겨짐)
```

프로덕션 환경에서 `#demo` URL로 접근하면 자동으로 로그인 페이지로 리다이렉트됩니다.

---

## 🎯 제공 기능

### 1. WebSocket 디버거
- 실시간 WebSocket 연결 상태 확인
- 송수신 메시지 모니터링
- 자동으로 화면 우측 하단에 표시

### 2. 테마 테스터
- 라이트/다크 모드 색상 확인
- Material-UI 색상 팔레트 미리보기
- Primary, Secondary, Success, Warning, Error 색상

### 3. 공유 URL 테스터
- 프로그램 공유 기능 테스트
- 공유 링크 시뮬레이션
- 예시: `#share/1`

### 4. 로컬 스토리지 뷰어
- 저장된 데이터 확인
- 전체 삭제 기능
- 실시간 업데이트

### 5. API 엔드포인트 정보
- 현재 사용 중인 API URL 확인
- 환경 변수 검증

### 6. 브라우저 정보
- User Agent
- 화면 크기
- 언어 설정
- 온라인 상태

---

## 🔒 보안 설정

### 자동 환경 감지

```typescript
// App.tsx
const DemoPage = process.env.NODE_ENV === 'development' 
    ? React.lazy(() => import('./components/DemoPage'))
    : null;

// 페이지 렌더링
{page === 'demo' && process.env.NODE_ENV === 'development' && DemoPage ? (
    <React.Suspense fallback={<div>로딩 중...</div>}>
        <DemoPage />
    </React.Suspense>
) : (
    // ... 다른 페이지
)}
```

### 환경 변수

```bash
# 개발 환경
NODE_ENV=development  ✅ 데모 페이지 접근 가능

# 프로덕션 환경
NODE_ENV=production   ❌ 데모 페이지 자동 제외
```

---

## 📦 빌드 시 동작

### 개발 빌드

```bash
npm start
# DemoPage.tsx 포함됨
# #demo 라우트 활성화
```

### 프로덕션 빌드

```bash
npm run build
# DemoPage.tsx 자동 제외 (Tree Shaking)
# #demo 라우트 비활성화
# 번들 크기 최소화
```

---

## 🛠️ 커스터마이징

### 새로운 데모 기능 추가

```tsx
// DemoPage.tsx에 추가
<Card>
    <CardContent>
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
            🎨 새로운 기능
        </Typography>
        <Typography variant="body2" color="text.secondary">
            설명...
        </Typography>
        {/* 기능 구현 */}
    </CardContent>
</Card>
```

### 접근 제어 추가

```typescript
// 특정 조건으로 접근 제한
const canAccessDemo = 
    process.env.NODE_ENV === 'development' 
    && window.location.hostname === 'localhost';
```

---

## 🔍 디버깅

### 환경 확인

```javascript
// 브라우저 콘솔에서
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('Can access demo:', process.env.NODE_ENV === 'development');
```

### URL 확인

```javascript
// 현재 해시 확인
console.log('Current hash:', window.location.hash);

// 데모 페이지로 이동
window.location.hash = '#demo';
```

---

## 📋 체크리스트

### 개발 환경 확인

- [ ] `npm start`로 개발 서버 실행
- [ ] `http://localhost:3000/#demo` 접속
- [ ] 데모 페이지 정상 표시
- [ ] 모든 기능 작동 확인

### 프로덕션 빌드 확인

- [ ] `npm run build` 실행
- [ ] 빌드 번들에 DemoPage 미포함 확인
- [ ] 프로덕션에서 `#demo` 접근 시 리다이렉트 확인
- [ ] 콘솔 에러 없음

---

## 🚨 주의사항

### 1. 로그인 페이지에서 데모 버튼 제거됨

**이전:**
```tsx
// ❌ 제거됨
<Button onClick={() => window.location.hash = '#keypad-demo'}>
    🔒 보안 키패드 데모
</Button>
```

**현재:**
```tsx
// ✅ 직접 URL 입력으로만 접근
http://localhost:3000/#demo
```

### 2. 프로덕션 노출 방지

```typescript
// 자동으로 제외됨
if (process.env.NODE_ENV === 'production') {
    // DemoPage는 로드되지 않음
    // #demo 라우트는 작동하지 않음
}
```

### 3. 코드 스플리팅

```typescript
// React.lazy로 지연 로딩
const DemoPage = React.lazy(() => import('./components/DemoPage'));

// 사용하지 않으면 번들에 포함되지 않음
```

---

## 📊 번들 크기 비교

### 데모 페이지 포함 시 (개발)

```
DemoPage.tsx: ~15KB
```

### 프로덕션 빌드 시

```
DemoPage.tsx: 0KB (제외됨)
```

---

## 💡 사용 팁

### 1. 북마크 추가

```
제목: 개발 데모
URL: http://localhost:3000/#demo
```

### 2. 개발자 도구와 함께 사용

```
F12 → Console
→ 데모 페이지 정보 확인
→ 로컬 스토리지 실시간 모니터링
```

### 3. 테스트 시나리오 작성

```typescript
// 예시: 공유 기능 테스트
1. #demo 접속
2. "공유 URL 테스터" 클릭
3. #share/1로 이동
4. 공유 모달 확인
5. 동작 검증
```

---

## 🔗 관련 파일

```
frontend/src/
├── App.tsx                    # 라우팅 및 환경 감지
├── types/index.ts             # Page 타입 정의
└── components/
    ├── DemoPage.tsx           # 데모 페이지 컴포넌트
    └── MuiLoginPage.tsx       # 로그인 페이지 (데모 버튼 제거됨)
```

---

## 📝 변경 이력

### 2025-01-16

- ✅ 로그인 페이지에서 보안 키패드 데모 버튼 제거
- ✅ 별도 DemoPage 컴포넌트 생성
- ✅ 개발 환경 전용 접근 제어 구현
- ✅ React.lazy를 통한 코드 스플리팅 적용
- ✅ 프로덕션 빌드 시 자동 제외 설정

---

## 🎯 결론

### 장점

✅ **보안 강화**: 프로덕션에서 자동 제외  
✅ **번들 최적화**: 사용하지 않는 코드 제거  
✅ **개발 편의성**: 모든 데모 기능을 한 곳에서 관리  
✅ **접근 제어**: 환경별 자동 제어  

### 사용 방법

1. 개발 환경: `http://localhost:3000/#demo`
2. 프로덕션: 자동으로 숨겨짐

---

**Made with ❤️ by CrossFit System Development Team**

