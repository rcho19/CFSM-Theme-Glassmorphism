import { spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const script = fileURLToPath(new URL('../scripts/configure-dist.mjs', import.meta.url))
function fixture(env: Record<string, string>, check: (status: number | null, html: string) => void): void {
  const directory = mkdtempSync(join(tmpdir(), 'cfsm-deployment-test-'))
  try {
    mkdirSync(join(directory, 'dist'))
    writeFileSync(join(directory, 'dist/index.html'), '<html><head><title>Default</title></head><body></body></html>')
    const result = spawnSync(process.execPath, [script], { cwd: directory, env: { ...process.env, API_BASE: '', TITLE: '', BACKGROUND_IMAGE: '', CSP_API: '', CSP_STATIC: '', ...env } })
    check(result.status, readFileSync(join(directory, 'dist/index.html'), 'utf8'))
  } finally { rmSync(directory, { recursive: true, force: true }) }
}
describe('公开部署元数据', () => {
  it('仅注入纯 origin 并对标题做 HTML 转义', () => {
    fixture({ API_BASE: 'https://probe.invalid', TITLE: '<script>alert(1)</script>', CSP_STATIC: 'https://images.invalid' }, (status, html) => {
      expect(status).toBe(0)
      expect(html).toContain('name="apiBase" content="https://probe.invalid"')
      expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
      expect(html).not.toContain('<script>')
      expect(html).toContain('wss://probe.invalid')
    })
  })
  it.each(['https://user:synthetic@probe.invalid', 'javascript:alert(1)', 'https://probe.invalid/api'])('拒绝不是纯 origin 的地址 %s', (base) => {
    fixture({ API_BASE: base }, (status, html) => {
      expect(status).not.toBe(0)
      expect(html).not.toContain('name="apiBase"')
    })
  })
})
