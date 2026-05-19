/**
 * Sprint 3 Phase C — 모킹이 자동 배선된 Playwright test.
 *
 * `mockApi` 는 auto 픽스처 — 매 테스트마다 page.goto 이전에 새 in-memory 스토어로
 * 네트워크 모킹을 설치한다 (retry 시 상태 오염 방지).
 */
import { test as base, type Page } from '@playwright/test';
import { installMockApi } from './handlers';

export const test = base.extend<{ mockApi: void }>({
  mockApi: [
    async ({ page }: { page: Page }, use: (v: void) => Promise<void>) => {
      await installMockApi(page);
      await use(undefined);
    },
    { auto: true },
  ],
});

export { expect } from '@playwright/test';
