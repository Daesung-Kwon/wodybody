# 이메일 설정 보안 가이드

## 🔒 보안 강화 조치 완료

### 1. 파일 권한 강화 ✅
```bash
# .env.local 파일 권한을 600으로 변경 (소유자만 읽기/쓰기)
chmod 600 backend/.env.local

# 확인
ls -la backend/.env.local
# -rw------- (소유자만 접근 가능)
```

### 2. Git 추적 제외 ✅
```bash
# .gitignore에 추가됨
.env
.env.local
.env.*.local
```

**중요:** `.env.local` 파일은 절대 Git에 커밋하지 마세요!

### 3. 파일 확인
```bash
# Git 상태 확인
git status

# .env.local이 "Untracked files"에 표시되지 않으면 OK
```

## ⚠️ 추가 보안 권장사항

### 옵션 1: 전용 이메일 서비스 사용 (가장 권장)

개인 Gmail 대신 전용 이메일 서비스를 사용하면 더 안전합니다:

#### SendGrid (무료 플랜: 일일 100통)
```bash
# .env.local
MAIL_SERVER=smtp.sendgrid.net
MAIL_PORT=587
MAIL_USE_TLS=True
MAIL_USERNAME=apikey
MAIL_PASSWORD=SG.your-sendgrid-api-key
MAIL_DEFAULT_SENDER=noreply@yourdomain.com
```

**장점:**
- 개인 계정 노출 없음
- 전송 로그 및 분석
- 높은 전송률
- API 키 취소 가능

**설정:**
1. https://sendgrid.com 가입
2. Settings → API Keys → Create API Key
3. Full Access 또는 Mail Send 권한 선택
4. API 키 복사 → MAIL_PASSWORD에 입력

#### AWS SES (매우 저렴)
```bash
MAIL_SERVER=email-smtp.us-east-1.amazonaws.com
MAIL_PORT=587
MAIL_USERNAME=your-smtp-username
MAIL_PASSWORD=your-smtp-password
MAIL_DEFAULT_SENDER=noreply@yourdomain.com
```

### 옵션 2: Gmail 전용 계정 생성

개인 Gmail 대신 프로젝트 전용 Gmail 계정 생성:

1. 새 Gmail 계정 생성 (예: wodybody.system@gmail.com)
2. 2단계 인증 활성화
3. 앱 비밀번호 생성
4. 이 계정만 프로젝트에 사용

**장점:**
- 개인 계정 분리
- 계정 탈취 시 피해 최소화
- 문제 발생 시 계정만 삭제

### 옵션 3: 환경 변수로 관리

파일이 아닌 시스템 환경 변수로 관리:

```bash
# ~/.zshrc 또는 ~/.bashrc에 추가
export MAIL_USERNAME="your-email@gmail.com"
export MAIL_PASSWORD="your-app-password"

# 적용
source ~/.zshrc
```

그리고 `.env.local`에서 해당 줄 제거

**단점:**
- 모든 터미널 세션에 노출
- 프로세스 리스트에서 보일 수 있음

### 옵션 4: macOS Keychain 활용

macOS의 보안 저장소 사용:

```bash
# Keychain에 비밀번호 저장
security add-generic-password -a "wodybody" -s "mail_password" -w "your-app-password"

# Python에서 읽기
import subprocess
password = subprocess.check_output([
    'security', 'find-generic-password',
    '-a', 'wodybody',
    '-s', 'mail_password',
    '-w'
]).decode('utf-8').strip()
```

## 🚨 보안 체크리스트

- [x] `.env.local` 파일 권한 600으로 설정
- [x] `.env.local`이 `.gitignore`에 포함됨
- [x] Git에 커밋되지 않았는지 확인
- [ ] 개인 Gmail 사용 시 → 전용 Gmail 계정으로 변경 권장
- [ ] 또는 SendGrid/AWS SES 같은 전용 서비스 사용 권장
- [ ] 정기적으로 앱 비밀번호 변경
- [ ] 의심스러운 활동 시 즉시 앱 비밀번호 취소

## 📋 현재 보안 상태

### ✅ 완료된 보호 조치
1. **파일 권한**: 소유자만 읽기/쓰기 가능 (600)
2. **Git 제외**: .gitignore에 추가
3. **로컬 전용**: 파일이 저장소에 푸시되지 않음

### ⚠️ 여전히 남은 위험
1. **평문 저장**: 비밀번호가 암호화되지 않고 저장됨
2. **개인 계정**: Gmail 개인 계정 자격증명 노출
3. **백업 위험**: 백업 시 포함될 수 있음
4. **멀웨어**: 키로거나 파일 접근 멀웨어에 취약

### 🎯 권장 조치

**즉시:**
- [x] 파일 권한 600 설정 ✅
- [x] .gitignore 추가 ✅

**단기 (1주일 내):**
- [ ] 프로젝트 전용 Gmail 계정 생성
- [ ] 또는 SendGrid 무료 계정 생성

**장기:**
- [ ] 프로덕션 환경에서는 AWS SES 또는 SendGrid 사용
- [ ] Railway 환경 변수에 안전하게 저장
- [ ] 비밀번호 정기 갱신

## 🔐 Railway 배포 시 보안

Railway 배포 시에는 더 안전합니다:

```bash
# Railway 환경 변수는 암호화되어 저장됨
railway variables set MAIL_USERNAME="your-email@gmail.com"
railway variables set MAIL_PASSWORD="your-app-password"
```

**Railway의 보안 장점:**
- 환경 변수가 암호화되어 저장
- 팀원별 접근 권한 관리
- 감사 로그 (누가 언제 접근했는지)
- 코드와 자격증명 완전 분리

## 📞 문제 발생 시

### Gmail 계정이 탈취된 것 같다면:

1. **즉시 앱 비밀번호 취소**
   - https://myaccount.google.com/security
   - 앱 비밀번호 → 해당 항목 삭제

2. **Gmail 비밀번호 변경**

3. **최근 활동 확인**
   - https://myaccount.google.com/notifications

4. **새 앱 비밀번호 생성**
   - `.env.local` 파일 업데이트

### 실수로 Git에 커밋한 경우:

```bash
# 1. 즉시 앱 비밀번호 취소/변경

# 2. Git 히스토리에서 완전히 제거
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch backend/.env.local" \
  --prune-empty --tag-name-filter cat -- --all

# 3. 강제 푸시 (주의: 팀원과 조율 필요)
git push origin --force --all

# 4. 새 비밀번호로 .env.local 재생성
```

## 🎓 학습 자료

- [OWASP - Secure Credential Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [Gmail 보안 권장사항](https://support.google.com/accounts/answer/185833)
- [환경 변수 보안 모범 사례](https://12factor.net/config)

---

**요약:** 
- ✅ 기본 보안 조치 완료
- ⚠️ 개인 Gmail 사용 중 (위험도: 중간)
- 💡 권장: 전용 이메일 계정 또는 SendGrid 사용

