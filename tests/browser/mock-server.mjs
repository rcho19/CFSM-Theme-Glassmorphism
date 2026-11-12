import { createServer } from 'node:http'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { extname, resolve } from 'node:path'

const now = Date.now()
// 稀疏实时验收：两分钟一个真实样本，并使用秒级历史时间戳。
const sparseLive = process.env.CFSM_FIXTURE_SPARSE_LIVE === '1'
const settingsPolicy = process.env.CFSM_FIXTURE_SETTINGS_POLICY
const counts = {}
const data = {
  id: 'fixture-1', name: '本地合成测试节点', server_group: '验收数据', region: 'JP',
  is_online: true, last_updated: now, cpu: 28, ram_total: 2048, ram_used: 890,
  disk_total: 20480, disk_used: 5600, cpu_cores: 2, os: 'Debian', cpu_info: 'Synthetic CPU',
  net_in_speed: 123456, net_out_speed: 34567, net_rx: 123456789, net_tx: 23456789,
  ping_ct: 80, ping_cu: 60, ping_cm: 120, loss_ct: 0, loss_cu: 0, loss_cm: 5,
  ping: Array.from({ length: 20 }, (_, i) => ({ ts: now - (20 - i) * 360000, ct: i === 8 ? null : 80 + i % 4, cu: 60 + i % 2, cm: 120 + i % 10 })),
  loss: Array.from({ length: 20 }, (_, i) => ({ ts: now - (20 - i) * 360000, ct: i === 8 ? 100 : 0, cu: 0, cm: i % 5 * 2 })),
}
let themeOptions = { threeNetEnabled: true, threeNetSparkline: true, hideEarth: true, themeMode: 'light' }
if (settingsPolicy === 'guest' || settingsPolicy === 'admin') themeOptions.hideThemeSettingsWhenLoggedOut = true
function frame(value) {
  const body = Buffer.from(JSON.stringify(value))
  const header = body.length < 126 ? Buffer.from([129, body.length]) : Buffer.from([129,126,body.length>>8,body.length&255])
  return Buffer.concat([header, body])
}
const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1:4178')
  counts[url.pathname] = (counts[url.pathname] ?? 0) + 1
  res.setHeader('Cache-Control','no-store')
  const json = (value) => { res.setHeader('Content-Type','application/json');res.end(JSON.stringify(value)) }
  if (url.pathname === '/api/config') return json({ site_title: '本地主题验收', version: 'fixture', is_public: true, authorization: settingsPolicy === 'admin', turnstile_enabled: false, custom_ct_name: '电信', custom_cu_name: '联通', custom_cm_name: '移动', theme_options: themeOptions })
  if (url.pathname === '/api/servers') return json({ servers:[data], stats:{ total:1,online:1,offline:0 }, sysConfig:{show_three_net_details:true,show_price:true,show_expire:true,show_tf:true} })
  if (url.pathname === '/api/server') return json(data)
  if (url.pathname === '/api/history/all') return json(sparseLive
    ? Array.from({length:5},(_,i)=>({...data,timestamp:Math.floor((now-(5-i)*120000)/1000),cpu:10+i*5}))
    : data.ping.map((point) => ({...data,timestamp:point.ts,ping_ct:point.ct,ping_cu:point.cu,ping_cm:point.cm})))
  if (url.pathname === '/__counts') return json(counts)
  if (url.pathname === '/api/theme_options') {res.statusCode=401;return json({error:'unauthorized'})}
  if (url.pathname.startsWith('/flags/') || url.pathname.startsWith('/os-icons/')) { res.setHeader('Content-Type','image/svg+xml');return res.end('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="14"><rect width="20" height="14" fill="#ddd"/></svg>') }
  const root = resolve('dist'), target = resolve(root, '.' + (url.pathname === '/' ? '/index.html' : url.pathname))
  if (!target.startsWith(root + '/') && !target.startsWith(root + '\\')) {res.statusCode=403;return res.end()}
  try {
    res.setHeader('Content-Type', {'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.jpg':'image/jpeg'}[extname(target)] ?? 'application/octet-stream')
    res.end(await readFile(target))
  } catch {res.statusCode=404;res.end('Not found')}
})
server.on('upgrade', (req,socket) => {
  const key = req.headers['sec-websocket-key']
  if (typeof key !== 'string') return socket.destroy()
  socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + createHash('sha1').update(key+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64')+'\r\n\r\n')
  const timer=setInterval(()=>{if(!socket.destroyed)socket.write(frame({type:'batchUpdate',updates:[{serverId:data.id,samples:[{ts:Date.now(),data:{cpu:25,last_updated:Date.now()}}]}]}))},sparseLive?120000:1000)
  socket.on('error',()=>clearInterval(timer));socket.on('close',()=>clearInterval(timer))
})
server.listen(4178,'127.0.0.1',()=>console.log('Synthetic-only preview on http://127.0.0.1:4178'))
