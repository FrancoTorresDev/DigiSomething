/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string
  readonly VITE_FIREBASE_AUTH_DOMAIN: string
  readonly VITE_FIREBASE_PROJECT_ID: string
  readonly VITE_FIREBASE_STORAGE_BUCKET: string
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string
  readonly VITE_FIREBASE_APP_ID: string
  readonly VITE_API_PROXY_BASE?: string
  readonly VITE_ADSENSE_CLIENT_ID?: string
  readonly VITE_ADSENSE_SLOT_GALLERY_TOP?: string
  readonly VITE_ADSENSE_SLOT_GALLERY_INLINE?: string
  readonly VITE_ADSENSE_SLOT_NEWS_TOP?: string
  readonly VITE_ADSENSE_SLOT_NEWS_INLINE?: string
  readonly VITE_ADSENSE_SLOT_COMMUNITY_TOP?: string
  readonly VITE_ADSENSE_SLOT_COMMUNITY_INLINE?: string
  readonly VITE_ADSENSE_SLOT_STICKY_FOOTER?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface Window {
  adsbygoogle?: Array<Record<string, unknown>>
}
