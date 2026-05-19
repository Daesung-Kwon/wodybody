import { defineConfig, devices } from '@playwright/test';

/**
 * Sprint 3 Phase C — Playwright E2E 설정.
 *
 * 격리 원칙:
 *  - webServer 는 `vite --mode test` 로 기동 → `.env.test` 가 로드되어
 *    Supabase/AI URL 이 모두 localhost 로 고정된다.
 *  - 실제 네트워크 모킹은 MSW(playwright-msw)가 담당 (e2e/fixtures/handlers.ts).
 *  - 운영 도메인(.supabase.co 운영 프로젝트, wodybody-production.up.railway.app)
 *    호출은 critical-path.spec.ts 의 request 리스너가 0건임을 직접 검증한다.
 */
export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    // `.env.test` 를 로드하도록 test 모드로 dev 서버 기동.
    command: 'npm run dev -- --mode test --port 5173 --strictPort',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
