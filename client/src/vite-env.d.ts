/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_MAPS_KEY?: string;
  readonly VITE_BACKEND_URL?: string;
  readonly VITE_SOCKET_URL?: string;
  readonly VITE_SUPPORTED_LANGUAGES?: string;
  readonly VITE_WAKE_WORDS?: string;
  readonly VITE_CONFIDENCE_THRESHOLD?: string;
  readonly VITE_EMERGENCY_CONTACT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
