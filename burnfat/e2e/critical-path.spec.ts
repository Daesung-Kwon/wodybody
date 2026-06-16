/**
 * Sprint 3 Phase C — 챌린지 핵심 경로 E2E.
 *
 * 대결 생성 → 진입 → 참가 → 기본정보 → 시작 인증(이미지 마스킹) → 주간 기록 →
 * AI 조언 → 코치 대화 → 새로고침 후 데이터 유지까지 한 흐름으로 검증한다.
 *
 * 모든 네트워크는 MSW(e2e/fixtures/handlers.ts)로 모킹되며, 운영 도메인
 * (.supabase.co 운영 프로젝트 / wodybody-production.up.railway.app) 호출이
 * 단 1건도 없음을 request 리스너로 직접 검증한다.
 */
import { test, expect } from './fixtures/test';
import type { Locator } from '@playwright/test';

const FIXTURE_IMAGE = 'e2e/fixtures/inbody.jpg';

/** YYYY-MM-DD 로 오늘 + offset 일. */
function dateStr(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * MUI Select 에서 옵션을 고른다.
 * MUI Select 의 combobox 는 접근성 이름이 비어 있어 라벨로 찾을 수 없으므로,
 * 라벨 텍스트를 가진 FormControl 안의 combobox 를 클릭한다.
 */
async function selectMuiOption(scope: Locator, label: string, optionName: string): Promise<void> {
  await scope
    .locator('.MuiFormControl-root')
    .filter({ hasText: label })
    .getByRole('combobox')
    .click();
  await scope.page().getByRole('option', { name: optionName }).click();
}

test('챌린지 핵심 경로 — 생성부터 코치 대화·새로고침 유지까지', async ({ page }) => {
  test.slow(); // 단일 통합 시나리오 — 타임아웃 여유 확보.

  // 운영 도메인 호출 감시 — 1건이라도 잡히면 격리 실패.
  const prodCalls: string[] = [];
  page.on('request', (req) => {
    const u = req.url();
    if (/^https:\/\/[^/]+\.supabase\.co\//.test(u)) prodCalls.push(u);
    if (u.includes('wodybody-production.up.railway.app')) prodCalls.push(u);
  });

  // 일회성 안내 다이얼로그는 핵심 경로 대상이 아니므로 미리 해제 (새로고침에도 유지).
  // 두 다이얼로그 모두 "버전 일치 + 날짜 == 오늘" 이면 표시하지 않으므로 오늘 날짜로 시드.
  await page.addInitScript(() => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      localStorage.setItem(
        'bf_update_notice_dismissed',
        JSON.stringify({ version: '2026-04-23-v2', date: today })
      );
      localStorage.setItem(
        'bf_weekly_logs_upgrade_notice',
        JSON.stringify({ version: '2026-04-27-weekly-ai-upgrade-v1', date: today })
      );
    } catch {
      /* ignore */
    }
  });

  await test.step('1. 홈 진입', async () => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'BurnFat', exact: true })).toBeVisible();
  });

  await test.step('2. 새 대결 만들기 진입', async () => {
    await page.getByRole('button', { name: '새 대결 만들기' }).click();
    await page.waitForURL('**/create');
  });

  await test.step('3. 대결 생성', async () => {
    await page.getByLabel('대결 이름').fill('E2E 테스트');
    await page.getByLabel('시작일').fill(dateStr(0));
    await page.getByLabel('종료일').fill(dateStr(28));
    await page.getByLabel('참가비 (원)').fill('50000');
    await page.getByLabel('관리자 PIN (선택)').fill('1234');
    await page.getByRole('button', { name: '대결 생성' }).click();
    await page.waitForURL('**/c/**');
  });

  await test.step('4. 챌린지 페이지 헤더 확인', async () => {
    await expect(page.getByText('E2E 테스트').first()).toBeVisible();
    await expect(page.getByRole('tab', { name: '참가자 / 인증' })).toBeVisible();
  });

  await test.step('5. 참가하기', async () => {
    await page.getByPlaceholder('닉네임').fill('테스터');
    await page.getByRole('button', { name: '참가', exact: true }).click();
  });

  await test.step('6. 기본정보 입력', async () => {
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('기본정보')).toBeVisible();
    await dialog.getByLabel('나이').fill('30');
    await selectMuiOption(dialog, '성별', '남성');
    await dialog.getByLabel('키 (cm)').fill('175');
    await dialog.getByLabel('목표 체지방률 (%)').fill('22');
    await dialog.getByRole('button', { name: '저장' }).click();
    await expect(dialog).toBeHidden();
  });

  await test.step('7. 시작일 인증 (이미지 마스킹)', async () => {
    await page.getByRole('button', { name: '시작일 인증' }).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.locator('input[type="file"]').setInputFiles(FIXTURE_IMAGE);
    // 이미지 로드 후 마스킹 캔버스를 1회 클릭 → "마스킹 적용".
    const maskCanvas: Locator = dialog.locator('canvas').nth(1);
    await expect(maskCanvas).toBeVisible();
    await maskCanvas.click({ position: { x: 100, y: 130 } });
    await dialog.getByRole('button', { name: '마스킹 적용' }).click();
    await expect(dialog.getByText('마스킹 적용 완료')).toBeVisible();
    await dialog.getByLabel('체지방률 (%)').fill('28.0');
    await dialog.getByRole('button', { name: '제출' }).click();
    await expect(dialog).toBeHidden();
  });

  await test.step('8. 주간 기록 입력', async () => {
    await page.getByRole('tab', { name: '주간 기록' }).click();
    await page.getByRole('button', { name: '1주차 기록 입력' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByLabel('체지방률 (%)').fill('27.5');
    await selectMuiOption(dialog, '운동 횟수', '3회');
    await dialog.getByLabel('평균 수면 시간 (시간)').fill('7');
    await selectMuiOption(dialog, '식단 패턴', '정상');
    await dialog.getByRole('button', { name: '저장' }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText('1주차: 체지방').first()).toBeVisible();
  });

  await test.step('9. AI 조언 받기', async () => {
    await page.getByRole('button', { name: 'AI 조언 보기' }).click();
    await expect(page.getByText('E2E 모킹 요약 — 이번 주는 기본기에 집중하세요.')).toBeVisible();
    await expect(page.getByText('하루 물 2L 마시기')).toBeVisible();
  });

  await test.step('10. 코치와 대화하기', async () => {
    await page.getByRole('button', { name: '코치와 대화하기' }).click();
    const coach = page.getByRole('dialog').filter({ hasText: 'Grok 코치' });
    await expect(coach).toBeVisible();
    // 시드 메시지 — AI 조언이 첫 어시스턴트 메시지로 노출.
    await expect(coach.getByText('E2E 모킹된 AI 조언입니다.', { exact: false })).toBeVisible();
    await coach.getByPlaceholder('코치에게 물어보세요').fill('이번 주 어떻게 하면 좋을까요?');
    await coach.getByRole('button', { name: '메시지 전송' }).click();
    await expect(
      coach.getByText('안녕하세요! E2E 코치입니다.', { exact: false })
    ).toBeVisible();
    await coach.getByRole('button', { name: '코치 대화 닫기' }).click();
  });

  await test.step('11. 새로고침 후 데이터 유지', async () => {
    await page.reload();
    await expect(page.getByText('E2E 테스트').first()).toBeVisible();
    await expect(page.getByText('테스터', { exact: false }).first()).toBeVisible();
    await page.getByRole('tab', { name: '주간 기록' }).click();
    await expect(page.getByText('1주차: 체지방').first()).toBeVisible();
    await expect(page.getByText('27.5%').first()).toBeVisible();
  });

  // 격리 검증 — 운영 도메인 호출 0건.
  expect(prodCalls, `운영 도메인 호출 감지:\n${prodCalls.join('\n')}`).toEqual([]);
});
