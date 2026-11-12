<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import Sparkline from '@/components/ui/Sparkline.vue'
import { probeTone, threeNetRows } from '@/domain/three-net'
import type { GlassServer } from '@/types/glassmorphism'
import { useThemeSettingsStore } from '@/stores/theme-settings'

const props = defineProps<{ server: GlassServer }>()
const emit = defineEmits<{ open: [] }>()
const theme = useThemeSettingsStore()
const rows = computed(() => threeNetRows(props.server, theme.runtime.threeNetBindings))
const selection = ref<{ target: string, index: number } | null>(null)
const now = ref(Date.now())
const timer = setInterval(() => { now.value = Date.now() }, 30_000)
onBeforeUnmount(() => clearInterval(timer))
const stale = computed(() => props.server.windowUpdatedAt === undefined || now.value - props.server.windowUpdatedAt > 360_000)
watch(() => props.server.key, () => { selection.value = null })
function inspect(event: PointerEvent, target: string, count: number): void {
  if (!count || !(event.currentTarget instanceof HTMLElement)) return
  const rect = event.currentTarget.getBoundingClientRect()
  selection.value = { target, index: Math.max(0, Math.min(count - 1, Math.round((event.clientX - rect.left) / Math.max(rect.width, 1) * (count - 1)))) }
}
function keyboard(event: KeyboardEvent, target: string, count: number): void {
  if (event.key === 'Escape') { selection.value = null; return }
  if (!count || !['ArrowLeft', 'ArrowRight', 'Enter', ' '].includes(event.key)) return
  event.preventDefault()
  const previous = selection.value?.target === target ? selection.value.index : Math.floor(count / 2)
  selection.value = { target, index: Math.max(0, Math.min(count - 1, previous + (event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0))) }
}
function inspected(target: string) {
  return selection.value?.target === target ? rows.value.find((row) => row.target === target)?.points[selection.value.index] : undefined
}
function time(timestamp: number): string { return new Date(timestamp).toLocaleTimeString() }
</script>

<template>
  <div class="three-net" :class="{ 'three-net--offline': !server.online }" @click.stop @keydown.stop>
    <div class="three-net__caption">
      两小时窗口快照 <span v-if="server.windowUpdatedAt">· {{ time(server.windowUpdatedAt) }}</span><span v-if="stale" role="status"> · 旧快照</span><span v-if="!server.online"> · 离线</span>
    </div>
    <p v-if="!rows.length" class="three-net__caption">
      未选择可用线路，请在主题设置中调整。
    </p>
    <div v-for="row in rows" :key="row.target" class="three-net__row" :class="{ 'three-net__row--failed': row.failed }" :style="{ color: row.latencyTone }">
      <button type="button" class="three-net__label" :title="`${row.label}，打开完整图表`" @click="emit('open')">
        {{ row.label }}
      </button>
      <button type="button" class="three-net__value" title="窗口采样平均延迟" @click="emit('open')">
        {{ row.latency }}
      </button>
      <button
        v-if="row.points.length"
        type="button" class="three-net__history" :aria-label="`${row.label} 历史采样，左右方向键查看`"
        @pointerdown="inspect($event, row.target, row.points.length)" @pointermove="inspect($event, row.target, row.points.length)"
        @pointerleave="selection = null" @pointercancel="selection = null" @blur="selection = null"
        @keydown="keyboard($event, row.target, row.points.length)"
      >
        <Sparkline v-if="theme.runtime.threeNetSparkline" :values="row.points.map(point => point.latency)" />
        <span v-else class="three-net__bars">
          <span v-for="point in row.points" :key="point.timestamp" :style="{ background: probeTone(point.latency, 'latency') }" :class="{ 'is-empty': point.latency === null, 'is-loss': point.loss !== null && point.loss > 0 }" />
        </span>
        <span v-if="!row.points.length" class="three-net__empty">无历史</span>
        <span v-if="selection?.target === row.target && row.points.length" class="three-net__marker" :style="{ left: `${selection.index / Math.max(row.points.length - 1, 1) * 100}%` }" />
        <span v-if="inspected(row.target)" class="three-net__tooltip" role="status">
          {{ time(inspected(row.target)!.timestamp) }} 时间桶<br>
          {{ inspected(row.target)!.latency === null ? '无有效延迟样本' : `${inspected(row.target)!.latency} ms` }} ·
          {{ inspected(row.target)!.loss === null ? '无丢包样本' : `${inspected(row.target)!.loss}%` }}
        </span>
      </button>
      <button type="button" class="three-net__value" :style="{ color: row.lossTone }" title="窗口采样平均丢包" @click="emit('open')">
        丢包 {{ row.loss }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.three-net { min-width: 0; color: var(--signal-1); }
.three-net--offline { opacity: .5; }
.three-net__caption { color: var(--muted); font-size: 10px; margin: 3px 0; }
.three-net__row { display: grid; grid-template-columns: minmax(0, .8fr) max-content minmax(3.5rem, 1fr) max-content; gap: 4px; align-items: center; min-height: 22px; font-size: 11px; }
.three-net__row--failed { color: var(--signal-5); }
.three-net button { border: 0; background: transparent; color: inherit; font: inherit; padding: 0; cursor: pointer; min-width: 0; }
.three-net__label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: left; }
.three-net__value { white-space: nowrap; font-variant-numeric: tabular-nums; }
.three-net__history { height: 18px; position: relative; touch-action: pan-y; }
.three-net__history :deep(svg) { width: 100%; height: 100%; }
.three-net__tooltip { position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%); z-index: 40; width: max-content; max-width: 190px; padding: 6px; background: var(--ink); color: var(--background); border-radius: 5px; pointer-events: none; line-height: 1.4; }
.three-net__bars { display: flex; gap: 1px; height: 12px; }
.three-net__bars > span { flex: 1; min-width: 0; background: currentColor; border-radius: 1px; }
.three-net__bars > .is-empty { opacity: .15; }
.three-net__bars > .is-loss { background-image: repeating-linear-gradient(135deg, transparent 0 2px, var(--signal-4) 2px 3px); }
.three-net__marker { position: absolute; top: 1px; bottom: 1px; width: 2px; background: currentColor; transform: translateX(-50%); pointer-events: none; }
.three-net__empty { color: var(--muted); font-size: 10px; }
</style>
