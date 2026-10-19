# G3 보충 — 체지방은 숫자만, 인바디 사진은 받지 않는다 (2026-10-19 결정)

상태: **결정됨 (소유자, 2026-10-19).** 이 PR이 화면을 바꾼다. DB·Storage는 바꾸지 않는다.

`G3.md` 초안(PR #30)은 "체지방률 + 인바디 인쇄 이미지"를 별도 동의 대상으로 적었다. 이 결정으로 수집 항목에서 **이미지가 빠진다.** PR #30을 머지할 때 `G3.md` 를 아래처럼 고친다(이 PR은 PR #30의 파일을 만들지 않아 충돌을 피한다).

## G3.md 에 반영할 내용

- §1 현재 코드: `SubmitModal` 은 체지방률(0–100) **숫자만** 받는다. 파일 입력·마스킹 편집기·Storage 업로드가 없다. `create_submission` 에는 `p_image_path = null` 을 보낸다. 참가자 카드의 인증 사진 "보기" 버튼도 없다.
- §2 별도 동의 화면의 항목: "체지방률(%), 목표 체지방률". **"인바디 등 측정 인쇄물 이미지" 삭제.** 철회 문구의 "숫자와 이미지를 지운다" → "숫자를 지운다".
- §3 저장 검사: "인바디 객체 업로드를 거절" 항목 삭제. 철회 절차의 "`inbody` 버킷의 그 참가자 접두 객체를 삭제"는 과거 파일 일괄 삭제(`inbody-deletion.md`)로 대체.
- 검증 시나리오: "버킷에 새 객체 없음"은 동의 여부와 관계없이 항상 참이어야 한다.

## 바뀐 것 / 안 바뀐 것

| 영역 | 이 PR | 비고 |
| --- | --- | --- |
| 인증 제출 화면 | 숫자만. 파일 입력·`ImageMaskEditor` 제거 | `burnfat/src/components/SubmitModal.tsx` |
| 인증 사진 표시 | "보기" 버튼 제거 | `burnfat/src/components/ParticipantsTab.tsx` |
| 회귀 방지 | 소스에 Storage 업로드·`type="file"` 이 없음을 테스트 | `burnfat/src/lib/__tests__/noPhotoCollection.test.ts` |
| E2E | 시작 인증을 숫자만으로, 파일 입력·보기 버튼 0개 확인 | `burnfat/e2e/critical-path.spec.ts` |
| `submissions.image_url` 컬럼 | 그대로 (신규 행은 NULL) | 삭제 절차에서 NULL 처리 |
| `inbody` 버킷·기존 객체 | 그대로 | `inbody-deletion.md` (G1-a 검토 후) |
| anon INSERT 정책 `burnfat_inbody_anon_insert` | 그대로 | 앱은 더 이상 쓰지 않음. 삭제 절차에서 DROP 제안 |
| 백엔드 `POST /api/burnfat/images/sign`, `src/lib/signedImage.ts` | 그대로 | 삭제 완료 후 제거 |
