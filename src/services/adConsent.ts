export type AdConsentState = 'unknown' | 'accepted' | 'rejected'

const CONSENT_KEY = 'ds_ad_consent_v1'
const CONSENT_EVENT = 'ds-ad-consent-changed'
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365

function isBrowser(): boolean {
  return typeof window !== 'undefined'
}

function readConsentCookie(): AdConsentState {
  if (!isBrowser()) return 'unknown'
  const row = document.cookie
    .split('; ')
    .find((cookie) => cookie.startsWith(`${CONSENT_KEY}=`))
  if (!row) return 'unknown'

  const value = row.slice(CONSENT_KEY.length + 1)
  if (value === 'accepted' || value === 'rejected') return value
  return 'unknown'
}

export function readAdConsent(): AdConsentState {
  if (!isBrowser()) return 'unknown'
  let raw: string | null = null
  try {
    raw = window.localStorage.getItem(CONSENT_KEY)
  } catch {
    raw = null
  }

  if (raw === 'accepted' || raw === 'rejected') return raw
  return readConsentCookie()
}

export function writeAdConsent(state: Exclude<AdConsentState, 'unknown'>): void {
  if (!isBrowser()) return
  try {
    window.localStorage.setItem(CONSENT_KEY, state)
  } catch {
    // Keep going: cookie fallback below still persists user choice.
  }

  document.cookie = `${CONSENT_KEY}=${state}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; samesite=lax`
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: state }))
}

export function onAdConsentChange(handler: (state: AdConsentState) => void): () => void {
  if (!isBrowser()) return () => undefined

  const listener = (event: Event) => {
    const customEvent = event as CustomEvent<AdConsentState>
    const state = customEvent.detail
    if (state === 'accepted' || state === 'rejected') {
      handler(state)
      return
    }
    handler(readAdConsent())
  }

  window.addEventListener(CONSENT_EVENT, listener)
  return () => window.removeEventListener(CONSENT_EVENT, listener)
}
