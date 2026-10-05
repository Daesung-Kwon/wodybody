/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly REACT_APP_API_URL?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_AI_ADVICE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
