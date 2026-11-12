import type { CfsmRealtimeBatch, CfsmRealtimeSample, CfsmSocketState } from '@/types/cfsm'
import {
  createCfsmSocket,
  type CfsmSocketConnection,
  type CfsmSocketOptions,
} from './websocket'

// 依据 CFSM 主题额度约束，仅通过 WS 实时更新；REST 只用于允许的生命周期事件。
const DEFAULT_SAMPLE_SETTLE_DELAY_MS = 1_000

type IntervalHandle = ReturnType<typeof setInterval>
type TimeoutHandle = ReturnType<typeof setTimeout>

export interface DashboardRealtimeSource {
  base: string
  ids: readonly string[]
}

export interface VisibilitySource {
  readonly hidden: boolean
  addEventListener(type: 'visibilitychange', listener: () => void): void
  removeEventListener(type: 'visibilitychange', listener: () => void): void
}

export interface DashboardRealtimeScheduler {
  setInterval(callback: () => void, delay: number): IntervalHandle
  clearInterval(handle: IntervalHandle): void
  setTimeout(callback: () => void, delay: number): TimeoutHandle
  clearTimeout(handle: TimeoutHandle): void
}

export type DashboardSocketFactory = (options: CfsmSocketOptions) => CfsmSocketConnection

export interface DashboardRealtimeOptions {
  getSources(): readonly DashboardRealtimeSource[]
  getTimeoutMinutes(): number
  refreshRest(): Promise<void>
  onSampleBatches(batches: readonly CfsmRealtimeBatch[]): void
  onSourceState(base: string, state: CfsmSocketState): void
  onFallbackChange(active: boolean): void
  onTimeoutChange(timedOut: boolean): void
  onPausedChange(paused: boolean): void
  createSocket?: DashboardSocketFactory
  documentRef?: VisibilitySource
  scheduler?: DashboardRealtimeScheduler
  /** 固定值，或每次启动回退轮询时读取的取值函数（设置改了无需重建连接）。 */
  fallbackIntervalMs?: number | (() => number)
  /** 同一轮分节点消息的收集窗口；由 Agent `wss_report_interval` 推导，单位毫秒。 */
  getSampleSettleDelayMs?: () => number
}

export interface DashboardRealtimeController {
  start(): void
  sync(): void
  continueAfterTimeout(): void
  pauseAfterTimeout(): void
  resume(): void
  dispose(): void
}

const defaultScheduler: DashboardRealtimeScheduler = {
  setInterval: (callback, delay) => globalThis.setInterval(callback, delay),
  clearInterval: (handle) => globalThis.clearInterval(handle),
  setTimeout: (callback, delay) => globalThis.setTimeout(callback, delay),
  clearTimeout: (handle) => globalThis.clearTimeout(handle),
}

function defaultDocument(): VisibilitySource | undefined {
  return typeof document === 'undefined' ? undefined : document
}

export function createDashboardRealtime(
  options: DashboardRealtimeOptions,
): DashboardRealtimeController {
  const createSocket = options.createSocket ?? createCfsmSocket
  const documentRef = options.documentRef ?? defaultDocument()
  const scheduler = options.scheduler ?? defaultScheduler
  function sampleSettleDelayMs(): number { return DEFAULT_SAMPLE_SETTLE_DELAY_MS }
  const connections = new Map<string, CfsmSocketConnection>()
  const states = new Map<string, CfsmSocketState>()
  const pendingSamples = new Map<string, CfsmRealtimeSample[]>()
  let fallbackTimer: IntervalHandle | null = null
  let sampleFlushTimer: TimeoutHandle | null = null
  let fallbackActive = false
  let refreshInFlight: Promise<void> | null = null
  let started = false
  let disposed = false
  let timedOut = false
  let paused = false
  let visibilityRevision = 0

  function visible(): boolean {
    return documentRef?.hidden !== true
  }

  function flushPendingSamples(): void {
    sampleFlushTimer = null
    if (pendingSamples.size === 0 || disposed || !visible() || timedOut || paused) {
      pendingSamples.clear()
      return
    }
    const batches = [...pendingSamples].map(([base, samples]) => ({ base, samples }))
    pendingSamples.clear()
    options.onSampleBatches(batches)
  }

  function queueSamples(base: string, samples: readonly CfsmRealtimeSample[]): void {
    if (samples.length === 0 || disposed || !visible() || timedOut || paused) return
    const pending = pendingSamples.get(base)
    if (pending) pending.push(...samples)
    else pendingSamples.set(base, [...samples])
    if (sampleFlushTimer === null) {
      sampleFlushTimer = scheduler.setTimeout(flushPendingSamples, sampleSettleDelayMs())
    }
  }

  function clearPendingSamples(base?: string): void {
    if (base !== undefined) pendingSamples.delete(base)
    else pendingSamples.clear()
    if (pendingSamples.size > 0 || sampleFlushTimer === null) return
    scheduler.clearTimeout(sampleFlushTimer)
    sampleFlushTimer = null
  }

  function stopFallback(): void {
    if (fallbackTimer !== null) scheduler.clearInterval(fallbackTimer)
    fallbackTimer = null
    if (!fallbackActive) return
    fallbackActive = false
    options.onFallbackChange(false)
  }

  async function refreshAndSync(revision = visibilityRevision): Promise<void> {
    if (disposed || !visible() || timedOut || paused) return
    // A second visibility cycle must wait for the same REST request, not lose its reconnect.
    refreshInFlight ??= (async () => {
      try {
        await options.refreshRest()
      } catch {
        // The REST stores own their visible error state; existing data remains available.
      }
    })()
    const pending = refreshInFlight
    await pending
    if (refreshInFlight === pending) refreshInFlight = null
    if (revision === visibilityRevision && !disposed && visible() && !timedOut && !paused) {
      sync()
    }
  }

  function updateFallback(): void {
    // 官方额度边界：断线只走 WS 指数退避，不启动 REST 轮询。
    stopFallback()
  }

  function closeConnections(): void {
    const current = [...connections.values()]
    connections.clear()
    for (const connection of current) connection.close()
  }

  function handleTimeout(): void {
    if (timedOut || disposed) return
    timedOut = true
    paused = false
    options.onPausedChange(false)
    options.onTimeoutChange(true)
    clearPendingSamples()
    closeConnections()
    stopFallback()
  }

  function sync(): void {
    if (!started || disposed || !visible() || timedOut || paused) return
    const sources = new Map(
      options.getSources()
        .filter((source) => source.ids.length > 0)
        .map((source) => [source.base, source]),
    )

    for (const [base, connection] of connections) {
      const source = sources.get(base)
      if (source) {
        clearPendingSamples(base)
        connection.updateIds(source.ids)
        sources.delete(base)
      } else {
        connections.delete(base)
        states.delete(base)
        clearPendingSamples(base)
        connection.close()
      }
    }

    for (const source of sources.values()) {
      const connection = createSocket({
        base: source.base,
        ids: source.ids,
        timeoutMinutes: options.getTimeoutMinutes(),
        onSamples: (samples) => queueSamples(source.base, samples),
        onState: (state) => {
          states.set(source.base, state)
          options.onSourceState(source.base, state)
          updateFallback()
        },
        onTimeout: handleTimeout,
      })
      connections.set(source.base, connection)
    }
    updateFallback()
  }

  function handleVisibilityChange(): void {
    visibilityRevision += 1
    if (!visible()) {
      clearPendingSamples()
      closeConnections()
      stopFallback()
      return
    }
    if (timedOut || paused) return
    void refreshAndSync(visibilityRevision)
  }

  return {
    start() {
      if (started || disposed) return
      started = true
      documentRef?.addEventListener('visibilitychange', handleVisibilityChange)
      if (visible()) sync()
    },
    sync,
    continueAfterTimeout() {
      if (disposed) return
      timedOut = false
      paused = false
      options.onTimeoutChange(false)
      options.onPausedChange(false)
      sync()
    },
    pauseAfterTimeout() {
      if (disposed) return
      timedOut = false
      paused = true
      options.onTimeoutChange(false)
      options.onPausedChange(true)
      clearPendingSamples()
      closeConnections()
      stopFallback()
    },
    resume() {
      if (disposed) return
      timedOut = false
      paused = false
      options.onTimeoutChange(false)
      options.onPausedChange(false)
      sync()
    },
    dispose() {
      if (disposed) return
      disposed = true
      visibilityRevision += 1
      documentRef?.removeEventListener('visibilitychange', handleVisibilityChange)
      clearPendingSamples()
      closeConnections()
      stopFallback()
      states.clear()
    },
  }
}
