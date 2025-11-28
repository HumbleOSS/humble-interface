/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_HUMBLE_API_BASE_URL?: string;
  readonly VITE_HUMBLE_QUEST_API?: string;
  readonly VITE_HUMBLE_TICKERS_API?: string;
  // Add other env variables as needed
  [key: string]: any;
}

