import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { spawnSync } from 'node:child_process'

const require = createRequire(import.meta.url)
export const PICOMATCH_ADVISORY = 'GHSA-fc5q-39xc-vjpf'
export const MITIGATION_EXPIRES = '2026-12-02T00:00:00Z'
const parserHash = '09cb82b1ff335a5a2a5700cceb8f64f3e046ba06748a97194277fdc4b02537f7'

/** 只有确切的已补丁版本、有效复核期及实际行为均通过时，才允许该公告例外。 */
export function verifyPicomatchMitigation({
  now = Date.now(),
  packageRoot = dirname(require.resolve('picomatch/package.json')),
} = {}) {
  if (!Number.isFinite(now) || now >= Date.parse(MITIGATION_EXPIRES)) {
    throw new Error('picomatch 临时缓解已到复核期限；请优先升级官方修复版本。')
  }
  const manifest = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8'))
  if (manifest.name !== 'picomatch' || manifest.version !== '4.0.7') {
    throw new Error('picomatch 版本已变化，必须重新审查并移除临时例外。')
  }
  const parser = readFileSync(join(packageRoot, 'lib/parse.js'), 'utf8').replaceAll('\r\n', '\n')
  if (createHash('sha256').update(parser).digest('hex') !== parserHash) {
    throw new Error('picomatch 补丁完整性校验失败，拒绝忽略漏洞公告。')
  }

  // 子进程硬超时：回归到易受攻击版本时，不能把审计进程本身挂死。
  const check = `
    const assert = require('node:assert/strict');
    const pm = require(process.argv[1]);
    for (const pattern of ['+(*)', '+(*a)', '*(*a)', '+(*?a)', '+(a*)']) {
      assert.equal(pm(pattern)('a'.repeat(48) + '!'), false);
      assert.equal(pm(pattern)(pattern), true);
    }
    for (const [pattern, value] of [['**/*.vue', 'src/App.vue'], ['**/*.{ts,vue}', 'src/main.ts'], ['+(ab)', 'abab'], ['@(ct|cu|cm)', 'ct'], ['+(*(a)|*(b))', 'abba']]) {
      assert.equal(pm(pattern)(value), true);
    }
  `
  const runtimes = [...new Set(['node', ...(process.versions.bun ? [process.execPath] : [])])]
  for (const runtime of runtimes) {
    const result = spawnSync(runtime, ['-e', check, packageRoot], {
      encoding: 'utf8', timeout: 5000, windowsHide: true,
    })
    if (result.error || result.status !== 0) {
      throw new Error(`picomatch 漏洞/兼容行为校验失败 (${runtime}): ${result.error?.message ?? result.stderr}`)
    }
  }
}
