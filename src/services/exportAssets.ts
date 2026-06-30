const API_PROXY_BASE = (import.meta.env.VITE_API_PROXY_BASE ?? '').replace(/\/$/, '')

const CARD_IMAGE_BASE = API_PROXY_BASE
  ? `${API_PROXY_BASE}/card-images`
  : '/card-images'

const QR_API_BASE = API_PROXY_BASE
  ? `${API_PROXY_BASE}/qr-api`
  : '/qr-api'

export function cardImageUrl(cardnumber: string): string {
  return `${CARD_IMAGE_BASE}/${cardnumber}.jpg`
}

export function qrCodeUrl(
  data: string,
  size: number,
  options: { background?: string; color?: string; margin?: number } = {}
): string {
  const background = options.background ?? '030712'
  const color = options.color ?? 'EAB308'
  const margin = options.margin ?? 2

  return `${QR_API_BASE}/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}&bgcolor=${background}&color=${color}&format=png&margin=${margin}`
}