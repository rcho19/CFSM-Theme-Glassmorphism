import { execFileSync } from 'node:child_process'
import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'

// 高置信度凭据检查；只报告文件名，不输出匹配内容。不能替代人工安全审查。
const patterns = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{40,})\b/,
  /\bAKIA[A-Z0-9]{16}\b/,
]
const tracked = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean)
for (const file of tracked) {
  if (/(^|\/)\.env(?:\.|$)/.test(file) && !file.endsWith('.env.example')) throw new Error('Do not publish environment files: ' + file)
}
const candidates = tracked.filter((file) => /\.(?:ts|vue|js|mjs|json|html|md|ya?ml)$/.test(file))
async function assets(directory) {
  return (await Promise.all((await readdir(directory, { withFileTypes: true })).map((entry) => entry.isDirectory() ? assets(join(directory, entry.name)) : [join(directory, entry.name)]))).flat()
}
try { candidates.push(...(await assets('dist')).filter((file) => /\.(js|html|css)$/.test(file))) }
catch (error) { if (error.code !== 'ENOENT') throw error }
for (const file of candidates) {
  const text = await readFile(file, 'utf8')
  if (patterns.some((pattern) => pattern.test(text))) throw new Error('Potential credential material in: ' + file)
}
console.log(`Security pattern scan passed for ${candidates.length} source/document/asset files. No matched values logged.`)
