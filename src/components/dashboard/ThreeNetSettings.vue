<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { PROBE_TARGETS, DEFAULT_PROBE_LABELS } from '@/constants/probes'
import { bindingKey, parseThreeNetBindings } from '@/domain/three-net'
import { useAppStore } from '@/stores/app'
import { useServersStore } from '@/stores/servers'
import { useThemeSettingsStore } from '@/stores/theme-settings'

const app = useAppStore()
const servers = useServersStore()
const theme = useThemeSettingsStore()
const scope = ref('')
const bindings = computed(() => parseThreeNetBindings(theme.draft.threeNetBindings))
const scopes = computed(() => {
  const known = app.apiBases.flatMap((base) => [
    { key: bindingKey(base), label: `${new URL(base).host} · 全局默认`, base },
    ...servers.servers.filter((server) => server.source.base === base).map((server) => ({ key: bindingKey(base, server.id), label: `${new URL(base).host} · ${server.name}`, base })),
  ])
  return [...known, ...Object.keys(bindings.value).filter((key) => !known.some((entry) => entry.key === key)).map((key) => ({ key, label: `未加载或失效绑定 · ${key}`, base: '' }))]
})
watch(scopes, (entries) => { if (!scope.value) scope.value = entries[0]?.key ?? '' }, { immediate: true })
const current = computed(() => scopes.value.find((entry) => entry.key === scope.value))
const selected = computed(() => bindings.value[scope.value]
  ?? (current.value?.base ? bindings.value[bindingKey(current.value.base)] : undefined) ?? ['ct', 'cu', 'cm'])
const labels = computed(() => app.sourceConfigs[current.value?.base ?? '']?.probeLabels ?? DEFAULT_PROBE_LABELS)
const unavailable = computed(() => selected.value.filter((target) => !PROBE_TARGETS.some((known) => known === target)))
function save(targets: string[] | null): void {
  if (!scope.value) return
  const next = { ...bindings.value }
  if (targets === null) delete next[scope.value]
  else next[scope.value] = targets
  theme.draft.threeNetBindings = JSON.stringify(next)
  theme.previewDraft()
}
function toggle(target: string): void {
  save(selected.value.includes(target) ? selected.value.filter((value) => value !== target) : [...selected.value, target].slice(0, 3))
}
</script>

<template>
  <section class="settings-section glass-panel">
    <header><h2>三网线路绑定</h2></header>
    <p>每组最多三条线路。节点设置优先于所属来源的全局默认；名称修改不会改变线路字段。设置随右侧保存按钮一起保存。</p>
    <p v-if="servers.state === 'idle'">
      先打开首页加载节点后，即可在这里选择单个节点；已有绑定仍可移除。
    </p>
    <label>配置范围 <select v-model="scope" aria-label="三网配置范围"><option v-for="entry in scopes" :key="entry.key" :value="entry.key">{{ entry.label }}</option></select></label>
    <div class="three-net-settings__targets">
      <label v-for="target in PROBE_TARGETS" :key="target"><input type="checkbox" :checked="selected.includes(target)" :disabled="!scope || (!selected.includes(target) && selected.length >= 3)" @change="toggle(target)">{{ labels[target] }}</label>
    </div>
    <button v-for="target in unavailable" :key="target" type="button" @click="toggle(target)">
      移除失效线路 {{ target }}
    </button>
    <button type="button" :disabled="!scope" @click="save(null)">
      移除此覆盖并继承默认
    </button>
    <button type="button" :disabled="!scope" @click="save([])">
      不显示任何线路
    </button>
    <p v-if="servers.state === 'error'" role="alert">
      节点列表加载失败，已保存的绑定仍可选择并移除。
    </p>
  </section>
</template>

<style scoped>
p { color: var(--muted); font-size: 12px; line-height: 1.6; }
select { width: 100%; max-width: 100%; margin: 8px 0; }
.three-net-settings__targets { display: flex; flex-wrap: wrap; gap: 12px; margin: 12px 0; }
button { margin: 6px; }
</style>
