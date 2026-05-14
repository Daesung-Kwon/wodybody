import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Sprint 1.5 — 최소 vitest 셋업.
// Sprint 3 의 "테스트 베이스라인" 작업에서 jsdom + testing-library 까지 확장 예정.
// 현재는 순수 hook 계산 함수만 노드 환경에서 검증.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
