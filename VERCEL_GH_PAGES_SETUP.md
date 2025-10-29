# Vercel에서 gh-pages 브랜치 배포 방지 설정

`gh-pages` 브랜치 푸시 시 Vercel이 자동으로 frontend 빌드를 배포하지 않도록 설정하는 방법입니다.

## 방법 1: Vercel 대시보드 설정 (권장)

가장 확실한 방법은 Vercel 대시보드에서 Ignored Build Step을 설정하는 것입니다.

### 설정 단계

1. **Vercel 대시보드 접속**
   - https://vercel.com/dashboard 이동
   - `wodybody` 또는 해당 프로젝트 선택

2. **Settings → Git 이동**
   - 왼쪽 메뉴에서 **Settings** 클릭
   - **Git** 섹션 선택

3. **Ignored Build Step 설정**
   - **Ignored Build Step** 섹션 찾기
   - 다음 명령어 입력:
     ```bash
     [[ "$VERCEL_GIT_COMMIT_REF" == "gh-pages" ]]
     ```
   - 또는 다음으로 동일:
     ```bash
     exit $(test "$VERCEL_GIT_COMMIT_REF" == "gh-pages")
     ```

4. **저장**
   - 설정 저장

### 동작 원리

- Ignored Build Step의 명령이 `true`(exit code 0)를 반환하면 → 빌드 **무시**
- `false`(exit code 1)를 반환하면 → 빌드 **실행**

따라서 `gh-pages` 브랜치일 때 `true`가 반환되어 빌드가 무시됩니다.

---

## 방법 2: GitHub Actions 워크플로우 (현재 적용됨)

현재 워크플로우는 이미 `main` 브랜치에서만 Vercel 배포를 트리거하도록 설정되어 있습니다:

- `.github/workflows/frontend.yml`: `main` 브랜치만
- `.github/workflows/deploy.yml`: `main` 브랜치만

따라서 GitHub Actions를 통한 자동 배포는 `gh-pages` 브랜치에서 실행되지 않습니다.

---

## 방법 3: vercel.json 설정 (참고)

`frontend/vercel.json`에 다음 설정을 추가했습니다:

```json
{
  "git": {
    "deploymentEnabled": {
      "gh-pages": false
    },
    "ignoreCommand": "bash -c '[[ \"$VERCEL_GIT_COMMIT_REF\" == \"gh-pages\" ]] && exit 1 || exit 0'"
  }
}
```

⚠️ **주의**: `ignoreCommand`는 vercel.json에서 직접 지원되지 않을 수 있습니다. Vercel 대시보드에서 설정하는 것이 더 확실합니다.

---

## 확인 방법

1. **gh-pages 브랜치에 푸시**
   ```bash
   git subtree push --prefix docs origin gh-pages
   ```

2. **Vercel 대시보드 확인**
   - Deployments 탭에서 새 배포가 생성되지 않았는지 확인
   - `gh-pages` 브랜치 관련 배포가 없다면 성공

---

## 추가 참고사항

### Production/Preview 브랜치 설정

Vercel Settings → Git에서:
- **Production Branch**: `main` 또는 원하는 브랜치 설정
- **Automatically assign Preview deployments**: 특정 브랜치 제외 설정

이렇게 설정하면 `gh-pages` 브랜치는 자동으로 Preview 배포에서 제외됩니다.

---

## 문제 해결

### 여전히 gh-pages에서 배포가 트리거되는 경우

1. **Vercel 웹훅 확인**
   - GitHub Settings → Webhooks에서 Vercel 웹훅 확인
   - 필요시 웹훅 이벤트를 특정 브랜치로 제한

2. **대시보드 Ignored Build Step 재확인**
   - 명령어가 정확히 입력되었는지 확인
   - 테스트: 다른 브랜치에서 푸시 → 배포되는지 확인

3. **로그 확인**
   - Vercel 대시보드에서 배포 로그 확인
   - "Ignored Build Step" 메시지가 있는지 확인

