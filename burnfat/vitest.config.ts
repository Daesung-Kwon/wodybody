import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Sprint 3 Phase A — jsdom + testing-library 인프라 확장.
// Sprint 1.5 의 순수 계산 함수 테스트에 더해, jsdom 환경에서 브라우저 API
// (crypto.subtle, localStorage 등) 와 React 컴포넌트 렌더 테스트가 가능해진다.
// 실제 훅/컴포넌트 테스트 작성은 Phase B 범위.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
