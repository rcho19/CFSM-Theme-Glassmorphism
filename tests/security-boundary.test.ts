import { describe, expect, it, vi } from 'vitest'
import { cfsmGet, cfsmPost, onTurnstileRejected } from '@/services/cfsm/http'
import { isCredentialOrigin } from '@/services/cfsm/credential-policy'
import { configureTurnstilePolicy } from '@/services/cfsm/credential-policy'

function storage(): Storage {
  const values = new Map([['jwt_token', 'synthetic'], ['turnstile_verified', 'synthetic-verified']])
  return {
    get length() { return values.size }, clear: () => values.clear(), getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null, removeItem: (key) => { values.delete(key) }, setItem: (key, value) => { values.set(key, value) },
  }
}
describe('来源隔离', () => {
  it('确认关闭 Turnstile 后不再发送残留验证头', async () => {
    const base = 'https://turnstile-disabled.invalid'
    configureTurnstilePolicy(base, false)
    let sent: Headers | undefined
    await cfsmGet('/api/servers', { base, pageOrigin: base, storage: storage(), fetcher: async (_url, init) => {
      sent = new Headers(init?.headers)
      return new Response('{}')
    } })
    expect(sent?.has('X-Turnstile-Verified')).toBe(false)
    expect(sent?.has('Authorization')).toBe(true)
  })
  it.each(['https://remote.invalid', 'http://owner.invalid', 'https://owner.invalid:8443'])('不向 %s 发送本地凭据', async (base) => {
    const credentials = storage()
    let request: RequestInit | undefined
    await cfsmGet('/api/config', { base, pageOrigin: 'https://owner.invalid', storage: credentials, fetcher: async (_url, init) => {
      request = init
      return new Response('{"turnstile_verified":"foreign"}')
    } })
    const headers = new Headers(request?.headers)
    expect(headers.has('Authorization')).toBe(false)
    expect(headers.has('X-Turnstile-Verified')).toBe(false)
    expect(request?.credentials).toBe('omit')
    expect(request?.redirect).toBe('error')
    expect(credentials.getItem('turnstile_verified')).toBe('synthetic-verified')
  })
  it.each([401, 403])('远端 %s 不清除本地会话或触发主站验证', async (status) => {
    const credentials = storage()
    const listener = vi.fn()
    const stop = onTurnstileRejected(listener)
    try {
      await expect(cfsmGet('/api/config', { base: 'https://remote.invalid', pageOrigin: 'https://owner.invalid', storage: credentials, fetcher: async () => new Response('{}', { status }) })).rejects.toMatchObject({ status })
      expect(credentials.getItem('jwt_token')).toBe('synthetic')
      expect(credentials.getItem('turnstile_verified')).toBe('synthetic-verified')
      expect(listener).not.toHaveBeenCalled()
    } finally { stop() }
  })
  it('拒绝跨源写入且不发起网络请求', async () => {
    const fetcher = vi.fn<typeof fetch>()
    await expect(cfsmPost('/api/theme_options', {}, { base: 'https://remote.invalid', pageOrigin: 'https://owner.invalid', fetcher })).rejects.toMatchObject({ code: 'untrustedOrigin' })
    expect(fetcher).not.toHaveBeenCalled()
    expect(isCredentialOrigin('https://owner.invalid', 'https://owner.invalid')).toBe(true)
  })
  it('禁止协议相对路径绕过来源归属', async () => {
    const fetcher = vi.fn<typeof fetch>()
    await expect(cfsmGet('//foreign.invalid/api/config', { base: 'https://owner.invalid', fetcher })).rejects.toMatchObject({ code: 'untrustedOrigin' })
    expect(fetcher).not.toHaveBeenCalled()
  })
})
