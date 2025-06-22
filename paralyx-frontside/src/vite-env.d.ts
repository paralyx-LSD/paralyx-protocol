/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_API_KEY: string
  readonly VITE_STELLAR_NETWORK: string
  readonly VITE_STELLAR_HORIZON_URL: string
  readonly VITE_ETHEREUM_RPC_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
