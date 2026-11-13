import { describe, expect, it } from 'vitest'
import { bindingKey, threeNetRows, threeNetTargets } from '@/domain/three-net'
import { normalizeHistory, normalizeServer, normalizeServerCollection } from '@/services/cfsm/adapters'
import { probeStats } from '@/domain/server-detail'
import { toGlassServer } from '@/services/cfsm/glassmorphism-adapter'
import { buildSparklineGeometry, robustDomain } from '@/utils/sparklinePath'
import { DEFAULT_THEME_SETTINGS, validateThemeSettingsDraft } from '@/theme/settings'

const source = { base: 'https://owner.invalid', label: 'owner' }
describe('三网数据和刷新', () => {
  it('首页两小时有丢包、详情最近十分钟无丢包可以同时成立', () => {
    const now = Date.now()
    const samples = [
      { timestamp: now - 60 * 60_000, loss_ct: 20, ping_ct: 80 },
      { timestamp: now - 5 * 60_000, loss_ct: 0, ping_ct: 80 },
    ]
    const current = toGlassServer(normalizeServer({
      id: 'node', ping_ct: 80, loss_ct: 0,
      ping: samples.map((point) => ({ ts: point.timestamp, ct: point.ping_ct })),
      loss: samples.map((point) => ({ ts: point.timestamp, ct: point.loss_ct })),
    }, source), null)
    expect(threeNetRows(current, '{}')[0]?.loss).toBe('10.0%')
    const recent = normalizeHistory(samples.filter((point) => point.timestamp >= now - 10 * 60_000))
    expect(probeStats(recent, 'ct').loss).toBe(0)
  })
  it('绑定按来源及节点隔离，空选择保持为空，失效字段不伪装为线路', () => {
    const server = { sourceBase: source.base, id: 'same' }
    const raw = JSON.stringify({ [bindingKey(source.base)]: ['cm'], [bindingKey(source.base, 'same')]: [], [bindingKey('https://other.invalid', 'same')]: ['cu'] })
    expect(threeNetTargets(server, raw)).toEqual([])
    expect(threeNetTargets({ ...server, id: 'different' }, raw)).toEqual(['cm'])
    expect(threeNetTargets(server, JSON.stringify({ [bindingKey(source.base)]: ['deleted', 'cu'] }))).toEqual(['cu'])
    expect(validateThemeSettingsDraft({ ...DEFAULT_THEME_SETTINGS, threeNetBindings: '[]' })).toEqual(expect.arrayContaining([expect.objectContaining({ key: 'threeNetBindings' })]))
  })
  it('恢复后的最新样本不能抹掉窗口内丢包，全失败不显示为零延迟', () => {
    const current = toGlassServer(normalizeServer({ id: 'node', ping_ct: 20, loss_ct: 0, ping: [{ ts: 1, ct: 10 }, { ts: 2, ct: null }], loss: [{ ts: 1, ct: 0 }, { ts: 2, ct: 100 }] }, source), null)
    const row = threeNetRows(current, '{}')[0]
    expect(row?.latency).toBe('10 ms')
    expect(row?.loss).toBe('50.0%')
    expect(row?.points[1]?.latency).toBeNull()
    current.history.packetLossSeries.ct = [{ timestamp: 1, value: 100 }]
    expect(threeNetRows(current, '{}')[0]?.latency).toBe('不可达')
  })
  it('后台关闭三网开关可传到 UI 模型', () => {
    const collection = normalizeServerCollection({ servers: [{ id: 'node' }], sysConfig: { show_three_net_details: false } }, source)
    expect(toGlassServer(collection.servers[0]!, null).showThreeNet).toBe(false)
  })
  it('曲线保留缺口和稳定比例', () => {
    expect(buildSparklineGeometry([100, 101, null, 100, 101]).linePaths).toHaveLength(2)
    expect(robustDomain([100, 101]).max - robustDomain([100, 101]).min).toBeGreaterThan(10)
    expect(buildSparklineGeometry([null, null]).linePaths).toHaveLength(0)
  })

})
