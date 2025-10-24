# WebSocket Safari 문제 최종 정리

**작성일**: 2025-10-24  
**상태**: Railway 재배포 대기 중

---

## 🔴 현재 문제

**모바일 Safari에서만 CORS 에러 발생**:
```
XMLHttpRequest cannot load ... due to access control checks.
```

---

## 🎯 근본 원인

**Railway 백엔드가 재배포되지 않았음**

- 코드는 업데이트됨 (`cors_credentials=False`, `cors_allowed_origins='*'`)
- 하지만 Railway 서버는 이전 버전 실행 중
- 따라서 여전히 CORS credentials 요구

---

## 🔧 해결 조치

### 1️⃣ Railway 강제 재배포 (방금 실행)
```bash
git commit --allow-empty -m "chore: force Railway redeploy"
git push origin backend
```

### 2️⃣ 예상 배포 시간
- **Railway 빌드**: 5-7분
- **테스트 가능**: 7분 후

---

## 🧪 7분 후 테스트 방법

### 모바일 Safari (프라이빗 모드 권장)

1. **Safari 프라이빗 모드**
   - 우측 하단 탭 버튼 → 프라이빗

2. **프리뷰 URL 접속**
   - https://wodybody-3t4caahul-elonkwons-projects.vercel.app/

3. **로그인**

4. **WebSocket 디버거 확인** (우측 하단 🐛)
   ```
   예상 로그:
   ✅ WebSocket 연결 성공!
   ✅ Socket ID: xxxxx
   ✅ Transport: polling
   ❌ "access control checks" 에러 없어야 함
   ```

---

## 📊 변경사항 요약

| 항목 | 이전 | 수정 후 |
|-----|------|---------|
| 프론트엔드 withCredentials | true | false ✅ |
| 백엔드 cors_credentials | True | False ✅ |
| 백엔드 cors_allowed_origins | 동적 함수 | '*' ✅ |
| 프론트엔드 transports | 조건부 | ['polling'] ✅ |
| Railway 배포 상태 | 이전 버전 | 재배포 중 ⏳ |

---

## 🚨 여전히 실패하면

### 옵션 1: PC에서 먼저 테스트
1. PC 브라우저로 프리뷰 URL 접속
2. WebSocket 디버거 확인
3. PC에서 성공 = Railway 재배포 완료
4. PC에서 실패 = Railway 재배포 대기 필요

### 옵션 2: Railway 로그 확인
- Railway 대시보드 또는 CLI로 로그 확인
- `cors_credentials: False` 로그 확인
- `cors_allowed_origins: *` 로그 확인

### 옵션 3: 백엔드 API 확인
```bash
curl -I https://wodybody-production.up.railway.app/api/health
```
- 200 OK면 서버 실행 중

---

## 📝 최종 체크리스트

7분 후:
- [ ] Railway 재배포 완료 확인
- [ ] PC 브라우저에서 프리뷰 URL 테스트
- [ ] 모바일 Safari 프라이빗 모드 테스트
- [ ] WebSocket 디버거로 연결 성공 확인
- [ ] Console에 CORS 에러 없는지 확인

---

## 🎉 성공 기준

**모든 환경에서 다음이 표시되어야 함**:
```
✅ WebSocket 연결 성공!
Socket ID: xxxxx
Transport: polling
```

**Console에 다음이 없어야 함**:
```
❌ "XMLHttpRequest cannot load ... due to access control checks"
❌ "xhr poll error"
```

---

**Railway 재배포가 완료되면 모든 환경에서 WebSocket이 정상 작동할 것입니다!**

문제가 계속되면 Railway 대시보드에서 배포 로그를 확인하거나, 백엔드 코드를 다시 점검해야 합니다.

