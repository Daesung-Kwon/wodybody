# 🚀 비공개 프로그램 조회 권한 수정 배포 가이드

## 📋 배포 개요
- **문제**: "내 WOD" 수정 버튼 클릭 시 "프로그램 상세 정보를 불러올 수 없습니다" 오류
- **원인**: `get_program_detail` API에서 비공개 프로그램을 creator도 조회할 수 없게 됨
- **해결**: 비공개 프로그램은 creator만 조회 가능하도록 권한 체크 추가
- **커밋**: `499cb75 - fix: 비공개 프로그램 조회 권한 수정`

---

## 🔧 변경 사항

### `/backend/routes/programs.py`

#### 수정 전 (문제 있는 코드)
```python
@bp.route('/programs/<int:program_id>', methods=['GET'])
def get_program_detail(program_id):
    # 공개된 프로그램만 조회 가능 ❌
    program = Programs.query.filter_by(id=program_id, is_open=True).first()
```

#### 수정 후
```python
@bp.route('/programs/<int:program_id>', methods=['GET'])
def get_program_detail(program_id):
    """프로그램 상세 조회 (공개 프로그램 또는 본인이 만든 프로그램)"""
    program = Programs.query.get(program_id)
    
    # 권한 체크: 공개 프로그램이 아니면 creator만 조회 가능 ✅
    if not program.is_open:
        if not current_user_id or current_user_id != program.creator_id:
            return jsonify({'message': '프로그램을 조회할 권한이 없습니다'}), 403
```

---

## ✅ 로컬 테스트 결과

### 1. 비공개 프로그램 - creator 조회 ✅
```bash
$ curl -H "Authorization: Bearer $TOKEN" http://localhost:5001/api/programs/16
{
  "id": 16,
  "title": "123",
  "is_open": false,  # 비공개 프로그램
  "creator_id": 1
}
```

### 2. 비공개 프로그램 - 비로그인 조회 ✅
```bash
$ curl http://localhost:5001/api/programs/16
{
  "message": "프로그램을 조회할 권한이 없습니다"
}
```

### 3. 공개 프로그램 - 비로그인 조회 ✅
```bash
$ curl http://localhost:5001/api/programs/8
{
  "id": 8,
  "title": "엎드린 자세 위주 가볍게 10분 어때?",
  "is_open": true
}
```

---

## 🚀 배포 절차

### 1. 현재 상태 확인
```bash
$ git branch --show-current
develop

$ git log --oneline -3
499cb75 fix: 비공개 프로그램 조회 권한 수정
e2017e6 fix: PostgreSQL boolean 타입 처리 개선 및 트랜잭션 롤백 추가
...
```

### 2. backend 브랜치에 머지 (프로덕션 배포)
```bash
# backend 브랜치로 이동
$ git checkout backend

# develop 브랜치의 변경사항 머지
$ git merge develop

# 프로덕션 배포 (Railway 자동 배포)
$ git push origin backend
```

### 3. 배포 후 프로덕션 검증

#### 3-1. 로그인 후 "내 WOD" 테스트
1. 프로덕션 사이트 접속: https://wodybody.vercel.app
2. 로그인: `simadeit@naver.com`
3. **내 프로그램** 메뉴 클릭
4. 비공개 프로그램 선택 → **수정** 버튼 클릭
5. ✅ 수정 모달이 정상적으로 열리는지 확인

#### 3-2. API 직접 테스트 (선택)
```bash
# 1. 로그인하여 토큰 받기
TOKEN=$(curl -s -X POST https://wodybody-production.up.railway.app/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"simadeit@naver.com","password":"Daon!161219"}' | jq -r '.access_token')

# 2. 비공개 프로그램 조회 (creator)
curl -H "Authorization: Bearer $TOKEN" \
  https://wodybody-production.up.railway.app/api/programs/16 | jq .

# 예상 결과: 정상 조회 (200 OK)
```

---

## 🔍 예상 영향 범위

### 영향 받는 기능
1. ✅ **내 프로그램 - 수정** (해결됨)
2. ✅ **비공개 프로그램 권한 관리** (개선됨)

### 영향 없는 기능
- 프로그램 목록 조회
- 프로그램 생성/삭제
- 공개 프로그램 조회
- 프로그램 참여/탈퇴

---

## 📝 롤백 절차 (문제 발생 시)

```bash
# backend 브랜치로 이동
$ git checkout backend

# 이전 커밋으로 되돌리기
$ git revert 499cb75

# 배포
$ git push origin backend
```

---

## ✅ 체크리스트

배포 전:
- [x] 로컬 테스트 완료
- [x] 비공개 프로그램 creator 조회 확인
- [x] 비공개 프로그램 비로그인 차단 확인
- [x] 공개 프로그램 비로그인 조회 확인

배포 후:
- [ ] 프로덕션 "내 WOD" → 수정 버튼 정상 작동 확인
- [ ] 비공개 프로그램 권한 관리 정상 작동 확인
- [ ] 백엔드 로그 오류 없음 확인

---

**작성일**: 2025-10-27  
**작성자**: AI Assistant  
**배포 대상**: Railway (Backend)

