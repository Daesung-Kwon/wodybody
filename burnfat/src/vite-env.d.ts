/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  /** 비우면 wodybody 프로덕션 Grok 프록시 URL 사용 */
  readonly VITE_AI_ADVICE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
