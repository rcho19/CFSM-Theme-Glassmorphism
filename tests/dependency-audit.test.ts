import { afterAll, describe, expect, it } from 'vitest'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

const root = mkdtempSync(join(tmpdir(), 'cfsm-audit-test-'))
const now = Date.parse('2026-11-18T00:00:00Z')
afterAll(() => rmSync(root, { recursive: true, force: true }))

function fixture(version: string, parser: string): string {
  const packageRoot = mkdtempSync(join(root, 'package-'))
  mkdirSync(join(packageRoot, 'lib'))
  writeFileSync(join(packageRoot, 'package.json'), JSON.stringify({ name: 'picomatch', version }))
  writeFileSync(join(packageRoot, 'lib/parse.js'), parser)
  return packageRoot
}

function verify(options: { now: number, packageRoot?: string }) {
  return spawnSync(process.execPath, ['--input-type=module', '-e',
    'const { verifyPicomatchMitigation } = await import(process.argv[1]); verifyPicomatchMitigation(JSON.parse(process.argv[2]))',
    new URL('../scripts/picomatch-mitigation.mjs', import.meta.url).href, JSON.stringify(options),
  ], { encoding: 'utf8', timeout: 10_000, windowsHide: true })
}

describe('有期限的 picomatch 本地缓解', () => {
  it('已安装补丁通过漏洞样例及常用 glob 兼容检查', () => {
    const result = verify({ now })
    expect(result.stderr).toBe('')
    expect(result.status).toBe(0)
  })

  it('到期时拒绝继续使用例外', () => {
    const result = verify({ now: Date.parse('2026-12-02T00:00:00Z') })
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('复核期限')
  })

  it('版本改变必须重新审查', () => {
    const result = verify({ now, packageRoot: fixture('4.0.8', '') })
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('版本已变化')
  })

  it('仅版本正确但缺少补丁时仍然阻断', () => {
    const result = verify({ now, packageRoot: fixture('4.0.7', 'unpatched') })
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('补丁完整性')
  })
})
