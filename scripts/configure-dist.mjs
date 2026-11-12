import { readFile, writeFile } from 'node:fs/promises'

// 只写入可公开的浏览器配置；这些值编进页面后不是秘密，绝不能填 Token。
const escape = (value) => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
function origin(value, protocols = ['https:', 'http:']) {
  const parsed = new URL(value)
  if (!protocols.includes(parsed.protocol) || parsed.username || parsed.password || parsed.pathname !== '/' || parsed.search || parsed.hash) throw new Error('Deployment configuration requires plain origins without credentials or paths')
  return parsed.origin
}
const origins = (value) => value.split(',').map((item) => item.trim()).filter(Boolean).map((item) => origin(item))
const apiBases = origins(process.env.API_BASE ?? '')
const staticOrigins = origins(process.env.CSP_STATIC ?? '')
const apiOrigins = [...new Set([...apiBases, ...origins(process.env.CSP_API ?? '')])]
const tags = []
if (apiBases.length) tags.push(`<meta name="apiBase" content="${escape(apiBases.join(','))}">`)
if (process.env.BACKGROUND_IMAGE) {
  const background = new URL(process.env.BACKGROUND_IMAGE, 'https://placeholder.invalid')
  if (!['https:', 'http:'].includes(background.protocol) || background.username || background.password) throw new Error('Invalid background URL')
  tags.push(`<meta name="cfsm-background-image" content="${escape(process.env.BACKGROUND_IMAGE)}">`)
}
if (apiOrigins.length || staticOrigins.length) {
  const sockets = apiOrigins.map((value) => value.replace(/^http/, 'ws'))
  const policy = `default-src 'self'; script-src 'self' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: ${staticOrigins.join(' ')}; media-src 'self' ${staticOrigins.join(' ')}; connect-src 'self' ${[...apiOrigins, ...sockets].join(' ')}; frame-src https://challenges.cloudflare.com; object-src 'none'; base-uri 'self'`
  tags.push(`<meta http-equiv="Content-Security-Policy" content="${escape(policy)}">`)
}
let html = await readFile('dist/index.html', 'utf8')
html = html.replace('<head>', `<head>\n${tags.join('\n')}`)
if (process.env.TITLE) html = html.replace(/<title>[^<]*<\/title>/, `<title>${escape(process.env.TITLE)}</title>`)
await writeFile('dist/index.html', html)
console.log('Configured public deployment metadata; values omitted from log.')
