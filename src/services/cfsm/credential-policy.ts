/** 浏览器凭据只属于当前页面 origin；非浏览器测试须显式指定页面 origin。 */
export function isCredentialOrigin(base: string, pageOrigin?: string): boolean {
  const owner = pageOrigin ?? (typeof location === 'undefined' ? base : location.origin)
  try {
    return new URL(base).origin === new URL(owner).origin
  } catch {
    return false
  }
}

const turnstilePolicy = new Map<string, boolean>()
export function configureTurnstilePolicy(base: string, enabled: boolean): void {
  turnstilePolicy.set(new URL(base).origin, enabled)
}
export function maySendTurnstile(base: string): boolean {
  return turnstilePolicy.get(new URL(base).origin) !== false
}
