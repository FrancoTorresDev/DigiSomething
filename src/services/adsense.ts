let scriptPromise: Promise<boolean> | null = null

function normalizeClientId(raw: string): string {
  const value = raw.trim()
  if (!value) return ''
  return value.startsWith('ca-pub-') ? value : `ca-pub-${value}`
}

export function getAdSenseClientId(): string {
  return normalizeClientId(import.meta.env.VITE_ADSENSE_CLIENT_ID ?? '')
}

export function hasAdSenseConfig(): boolean {
  return getAdSenseClientId().length > 0
}

export async function loadAdSenseScript(): Promise<boolean> {
  const clientId = getAdSenseClientId()
  if (!clientId) return false

  if (scriptPromise) return scriptPromise

  scriptPromise = new Promise<boolean>((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-ds-adsense="1"]')
    if (existing) {
      resolve(true)
      return
    }

    const script = document.createElement('script')
    script.async = true
    script.crossOrigin = 'anonymous'
    script.dataset.dsAdsense = '1'
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.head.appendChild(script)
  })

  return scriptPromise
}

export function requestAdRender(): boolean {
  try {
    const queue = (window.adsbygoogle = window.adsbygoogle ?? [])
    queue.push({})
    return true
  } catch {
    return false
  }
}
