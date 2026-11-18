import { spawnSync } from 'node:child_process'
import { MITIGATION_EXPIRES, PICOMATCH_ADVISORY, verifyPicomatchMitigation } from './picomatch-mitigation.mjs'

if (!process.versions.bun) throw new Error('请通过 bun run audit:dependencies 执行审计。')
verifyPicomatchMitigation()
console.log(`已验证本地 picomatch 缓解补丁；仅排除 ${PICOMATCH_ADVISORY}，复核截止 ${MITIGATION_EXPIRES}。`)
console.log('以下仍执行完整依赖审计；其他漏洞或网络错误均阻断构建。')
const result = spawnSync(process.execPath, ['audit', `--ignore=${PICOMATCH_ADVISORY}`], {
  stdio: 'inherit', windowsHide: true,
})
if (result.error) throw result.error
process.exitCode = result.status ?? 1
