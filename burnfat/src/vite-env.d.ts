/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  /** 비우면 wodybody 프로덕션 Grok 프록시 URL 사용 */
  readonly VITE_AI_ADVICE_URL?: string;
  /** Sprint 3 Phase C: 분석(Plausible) 도메인. 미설정 시 track() 은 no-op. */
  readonly VITE_ANALYTICS_DOMAIN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
