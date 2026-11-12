import { PROBE_TARGETS } from '@/constants/probes'
import type { ProbeTarget } from '@/types/cfsm'
import type { GlassServer } from '@/types/glassmorphism'
import { probeSeriesFor, windowAverage } from './probe-window'

export type ThreeNetBindings = Record<string, string[]>
/** 沿用原主题的五级延迟/丢包阈值，CSS 信号色同时适配色觉方案。 */
export function probeTone(value: number | null, kind: 'latency' | 'loss'): string {
  if (value === null) return 'var(--muted)'
  const index = (kind === 'latency' ? [60, 100, 160, 200] : [1, 3, 6, 9]).findIndex((limit) => value <= limit)
  return `var(--signal-${index < 0 ? 5 : index + 1})`
}
export function bindingKey(origin: string, id?: string): string {
  return JSON.stringify([new URL(origin).origin, id ?? null])
}
export function parseThreeNetBindings(raw: string): ThreeNetBindings {
  try {
    const value: unknown = JSON.parse(raw)
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
    return Object.fromEntries(Object.entries(value).slice(0, 5000).flatMap(([key, targets]) => {
      if (!Array.isArray(targets) || targets.length > 3 || !targets.every((target): target is string => typeof target === 'string' && target.length <= 64)) return []
      return [[key, [...new Set(targets)]]]
    }))
  } catch { return {} }
}
export function threeNetTargets(server: Pick<GlassServer, 'sourceBase' | 'id'>, raw: string): ProbeTarget[] {
  const bindings = parseThreeNetBindings(raw)
  const selected = bindings[bindingKey(server.sourceBase, server.id)]
    ?? bindings[bindingKey(server.sourceBase)] ?? ['ct', 'cu', 'cm']
  return selected.filter((target): target is ProbeTarget => PROBE_TARGETS.some((known) => known === target))
}
export function threeNetRows(server: GlassServer, raw: string) {
  return threeNetTargets(server, raw).filter((target) => server.latency.some((item) => item.target === target)).map((target) => {
    const probe = server.latency.find((item) => item.target === target)
    const latency = windowAverage(server.history.latencySeries, target)
    const loss = windowAverage(server.history.packetLossSeries, target)
    const pingPoints = probeSeriesFor(server.history.latencySeries, target)
    const lossPoints = probeSeriesFor(server.history.packetLossSeries, target)
    const byTime = new Map(lossPoints.map((point) => [point.timestamp, point.value]))
    const times = [...new Set([...pingPoints, ...lossPoints].map((point) => point.timestamp))].sort((a, b) => a - b)
    const latencyByTime = new Map(pingPoints.map((point) => [point.timestamp, point.value]))
    const failed = loss.samples > 0 && loss.value === 100
    return {
      target, label: probe?.label ?? target,
      latency: failed ? '不可达' : latency.value === null ? '—' : `${Math.round(latency.value)} ms`,
      loss: loss.value === null ? '—' : `${loss.value.toFixed(1)}%`,
      failed,
      latencyTone: probeTone(failed ? 201 : latency.value, 'latency'),
      lossTone: probeTone(loss.value, 'loss'),
      points: times.map((timestamp) => {
        const value = latencyByTime.get(timestamp)
        const packetLoss = byTime.get(timestamp)
        return { timestamp, latency: typeof value === 'number' ? value : null, loss: typeof packetLoss === 'number' ? packetLoss : null }
      }),
    }
  })
}
