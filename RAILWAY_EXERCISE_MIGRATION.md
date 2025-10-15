# Railway 신규 운동 추가 가이드

## 배포 후 1회 실행 필요

Railway 백엔드 배포가 완료되면, 다음 명령을 **1회만** 실행하세요:

### Railway CLI 방식
```bash
# Railway CLI 설치 (처음 1회)
npm install -g @railway/cli

# Railway 프로젝트 연결
railway link

# 마이그레이션 스크립트 실행
railway run python backend/add_new_exercises.py
```

### Railway 대시보드 방식
1. Railway 대시보드 접속
2. Backend 서비스 선택
3. "Shell" 탭 클릭
4. 다음 명령 실행:
```bash
python add_new_exercises.py
```

### 예상 출력
```
🚀 신규 운동 추가 시작...
✅ 추가: 풀업
✅ 추가: 딥스
✅ 추가: 시트업
... (27개)
🗑️  삭제: 버핏 (중복)

📊 결과: 27개 추가, 0개 스킵
📊 전체 활성 운동: 53개
✅ 완료!
```

## 주의사항
- ✅ 중복 방지 로직 적용: 이미 있는 운동은 스킵
- ✅ 기존 데이터 보존: 사용자/프로그램/기록 데이터 영향 없음
- ⚠️ 1회만 실행: 여러 번 실행해도 안전하지만 불필요

## 확인
실행 후 프로덕션에서 확인:
- WOD 등록 → WOD 패턴 → 운동 선택
- 53개 운동 표시 확인
- 각 운동에 카테고리 chip 표시 확인

