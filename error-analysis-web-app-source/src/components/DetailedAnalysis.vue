<template>
  <div class="review-root">

    <!-- ── Top bar: progress + filter + timer ── -->
    <div class="topbar">
      <div class="progress-block">
        <check-circle-outlined class="done-icon" />
        <span class="progress-label">{{ reviewedCount }} / {{ reviewQueue.length }} reviewed</span>
        <div class="progress-track">
          <div class="progress-fill" :style="{ width: progressPct + '%' }" />
        </div>
        <span class="progress-pct">{{ progressPct }}%</span>
      </div>

      <div class="filter-pills">
        <button
          v-for="f in filters"
          :key="f.key"
          type="button"
          class="pill"
          :class="{ active: activeFilter === f.key }"
          @click="setFilter(f.key)"
        >
          {{ f.label }}<span class="pill-count">{{ f.count }}</span>
        </button>
      </div>

      <!-- Session timer (#5) -->
      <div v-if="sessionStart !== null" class="timer-block">
        <clock-circle-outlined class="timer-icon" />
        <span class="timer-label">{{ formatTime(sessionSeconds) }}</span>
        <span v-if="reviewedCount > 0" class="timer-avg">· {{ formatTime(avgSecondsPerItem) }}/item</span>
      </div>

      <a-dropdown>
        <a-button size="small">Export <down-outlined /></a-button>
        <template #overlay>
          <a-menu @click="handleExport">
            <a-menu-item key="json">Export as JSON</a-menu-item>
            <a-menu-item key="csv">Export as CSV</a-menu-item>
          </a-menu>
        </template>
      </a-dropdown>
    </div>

    <!-- ── Empty state ── -->
    <div v-if="visibleItems.length === 0" class="empty-state">
      <check-circle-outlined class="empty-icon" />
      <p>{{ activeFilter === 'pending' ? 'All items reviewed!' : 'No items in this view.' }}</p>
    </div>

    <!-- ── Review card ── -->
    <template v-else>
      <div class="review-card" :class="{ 'flash-ok': flashing }">

        <!-- Card header -->
        <div class="card-header">
          <a-tag :color="currentItem.error_class === 'FP' ? 'red' : 'blue'" class="type-badge">
            {{ currentItem.error_class }}
          </a-tag>
          <transition name="fade">
            <span v-if="currentItem.human_reviewed" class="reviewed-badge">
              <check-circle-outlined /> Reviewed
            </span>
          </transition>
          <div class="nav-controls">
            <button type="button" class="nav-btn" :disabled="cursor === 0" @click="go(-1)">‹ Prev</button>
            <span class="nav-pos">{{ cursor + 1 }} / {{ visibleItems.length }}</span>
            <button type="button" class="nav-btn" :disabled="cursor === visibleItems.length - 1" @click="go(1)">Next ›</button>
          </div>
        </div>

        <!-- Sentence -->
        <div class="sentence-block">
          <p class="sentence-text">{{ currentItem.sentence }}</p>
        </div>

        <!-- Meta row -->
        <div class="meta-row">
          <div class="meta-item">
            <span class="meta-label">Prediction</span>
            <span class="meta-value">{{ currentItem.original_prediction }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Gold Standard</span>
            <span class="meta-value">{{ currentItem.gold_standard }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Model Type</span>
            <span class="meta-value">{{ currentItem.model_type }}</span>
          </div>
        </div>

        <!-- LLM Analysis panel -->
        <div v-if="currentItem.llm_analyzed" class="llm-panel">
          <div class="llm-panel-header">
            <bulb-outlined class="llm-icon" />
            <span class="llm-title">LLM Analysis</span>
            <a-tag color="purple" class="llm-class-tag">{{ normalisedPrediction }}</a-tag>
            <!-- #4 Difficulty flag -->
            <span v-if="isDifficult" class="difficulty-badge" title="Low inter-rater agreement class (paper finding)">
              ⚠ Review carefully
            </span>
          </div>
          <p class="llm-reasoning">{{ currentItem.LLM_reasoning }}</p>
        </div>
        <div v-else class="llm-panel llm-panel--empty">
          <bulb-outlined class="llm-icon" />
          <span class="llm-empty-text">Run LLM Analysis to get a suggestion for this item</span>
        </div>

        <!-- ── Decision section ── -->
        <div class="decision-section">
          <span class="decision-label">Your decision</span>

          <!-- Already reviewed summary -->
          <div v-if="currentItem.human_reviewed && !overriding" class="reviewed-summary">
            <div class="reviewed-result">
              <span v-if="wasOverridden" class="result-badge override-badge">
                <edit-outlined /> Overridden: <strong>{{ currentItem.human_error_class }}</strong>
              </span>
              <span v-else class="result-badge accept-badge">
                <check-outlined /> Accepted: <strong>{{ currentItem.human_error_class }}</strong>
              </span>
            </div>
            <button type="button" class="btn-redo" @click="startOverride">Change</button>
          </div>

          <!-- Not yet reviewed -->
          <template v-else-if="!overriding">
            <div class="decision-btns">
              <button
                type="button"
                class="btn-accept"
                :disabled="!currentItem.llm_analyzed"
                @click="accept"
              >
                <check-outlined /> Accept
                <span v-if="currentItem.llm_analyzed" class="btn-class-hint">"{{ normalisedPrediction }}"</span>
              </button>
              <button type="button" class="btn-override" @click="startOverride">
                <edit-outlined /> Override
              </button>
            </div>
          </template>

          <!-- Override: select + explicit confirm -->
          <div v-if="overriding" class="override-panel">
            <a-select
              v-model:value="overrideValue"
              placeholder="Select error class…"
              style="flex: 1; min-width: 200px"
              show-search
              :filter-option="filterOption"
              option-label-prop="value"
            >
              <a-select-opt-group
                v-for="group in groupedOptions"
                :key="group.group"
                :label="group.group"
              >
                <a-select-option
                  v-for="opt in group.items"
                  :key="opt.key"
                  :value="opt.key"
                >
                  <div class="opt-name">{{ opt.key }}</div>
                  <div v-if="opt.definition" class="opt-def">{{ truncDef(opt.definition) }}</div>
                </a-select-option>
              </a-select-opt-group>
            </a-select>
            <button
              type="button"
              class="btn-confirm"
              :disabled="!overrideValue"
              @click="confirmOverride"
            >
              <check-outlined /> Confirm
            </button>
            <button type="button" class="btn-cancel" @click="cancelOverride">Cancel</button>
          </div>
        </div>

      </div>

      <!-- ── Item strip ── -->
      <div v-if="visibleItems.length > 1" class="item-strip">
        <div
          v-for="(item, idx) in visibleItems"
          :key="item.uid"
          role="button"
          class="strip-item"
          :class="{ active: idx === cursor, reviewed: item.human_reviewed }"
          @click="jumpTo(idx)"
        >
          <a-tag :color="item.error_class === 'FP' ? 'red' : 'blue'" size="small" style="margin:0;flex-shrink:0">
            {{ item.error_class }}
          </a-tag>
          <span class="strip-text">{{ item.sentence.slice(0, 52) }}{{ item.sentence.length > 52 ? '…' : '' }}</span>
          <check-circle-outlined v-if="item.human_reviewed" class="strip-done" />
        </div>
      </div>
    </template>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onUnmounted } from 'vue'
import {
  CheckCircleOutlined,
  CheckOutlined,
  EditOutlined,
  BulbOutlined,
  DownOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons-vue'
import { useYamlDataStore } from '../stores/yamlData'
import { useJsonDataStore } from '../stores/jsonData'
import type { JsonDataStructure } from '../stores/jsonData'

interface Props {
  jsonData: JsonDataStructure | null
}
const props = defineProps<Props>()

const yamlStore = useYamlDataStore()
const jsonStore = useJsonDataStore()
// ── Helpers ──
function normalise(raw: string) {
  return (raw ?? '').replace(/^\d+(\.\d+)*\.\s*/, '').trim() || raw
}

function findCategory(errorClass: string): string {
  if (!yamlStore.data) return ''
  for (const [cat, types] of Object.entries(yamlStore.data)) {
    if (Object.keys(types).includes(errorClass)) return cat
  }
  return ''
}

// ── #4 Difficulty flag — classes with historically low inter-rater agreement ──
const LOW_F1_CLASSES = new Set([
  // Sub-class level names
  'Implied_Inference',
  'Guideline_Error',
  'Hypothetical_Language',
  'Sentence_Boundaries',
  'Typographical_Error',
  'Statistical_Inference',
  'Distortion',
  'Partially_Correct',
  // Class level names (consolidated preset)
  'Semantic_Error',
  'Syntactic_Error',
])

const isDifficult = computed(() => {
  if (!currentItem.value?.llm_analyzed) return false
  return LOW_F1_CLASSES.has(normalisedPrediction.value)
})

// ── #5 Session timer ──
const sessionStart = ref<number | null>(null)
const sessionSeconds = ref(0)
let timerInterval: ReturnType<typeof setInterval> | null = null

function startTimerIfNeeded() {
  if (sessionStart.value !== null) return
  sessionStart.value = Date.now()
  timerInterval = setInterval(() => {
    sessionSeconds.value = Math.floor((Date.now() - sessionStart.value!) / 1000)
  }, 1000)
}

const avgSecondsPerItem = computed(() => {
  if (reviewedCount.value === 0) return 0
  return Math.round(sessionSeconds.value / reviewedCount.value)
})

function formatTime(s: number): string {
  const m = Math.floor(s / 60)
  return `${m}:${(s % 60).toString().padStart(2, '0')}`
}

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval)
})

// ── Filter ──
type FilterKey = 'all' | 'pending' | 'reviewed'
const activeFilter = ref<FilterKey>('pending')

const reviewQueue = computed(() =>
  (props.jsonData?.tags ?? []).filter(
    t => t.error_class === 'FP' || t.error_class === 'FN',
  ),
)

const reviewedCount = computed(() =>
  reviewQueue.value.filter(t => t.human_reviewed).length,
)

const progressPct = computed(() =>
  reviewQueue.value.length
    ? Math.round((reviewedCount.value / reviewQueue.value.length) * 100)
    : 0,
)

const visibleItems = computed(() => {
  if (activeFilter.value === 'pending') return reviewQueue.value.filter(t => !t.human_reviewed)
  if (activeFilter.value === 'reviewed') return reviewQueue.value.filter(t => t.human_reviewed)
  return reviewQueue.value
})

const filters = computed(() => [
  { key: 'all' as FilterKey, label: 'All', count: reviewQueue.value.length },
  { key: 'pending' as FilterKey, label: 'Pending', count: reviewQueue.value.filter(t => !t.human_reviewed).length },
  { key: 'reviewed' as FilterKey, label: 'Reviewed', count: reviewedCount.value },
])

function setFilter(f: FilterKey) {
  activeFilter.value = f
  cursor.value = 0
  overriding.value = false
  overrideValue.value = ''
}

// ── Cursor / navigation ──
const cursor = ref(0)

watch(visibleItems, (items) => {
  if (cursor.value >= items.length) {
    cursor.value = Math.max(0, items.length - 1)
  }
})

function go(delta: number) {
  cursor.value = Math.max(0, Math.min(visibleItems.value.length - 1, cursor.value + delta))
  overriding.value = false
  overrideValue.value = ''
}

function jumpTo(idx: number) {
  cursor.value = idx
  overriding.value = false
  overrideValue.value = ''
}

const currentItem = computed(() => visibleItems.value[cursor.value] ?? null)

const normalisedPrediction = computed(() =>
  currentItem.value ? normalise(currentItem.value.LLM_prediction) : '',
)

const wasOverridden = computed(() =>
  !!(currentItem.value?.human_reviewed &&
    currentItem.value.human_error_class &&
    currentItem.value.human_error_class !== normalisedPrediction.value),
)

// ── Override state ──
const overriding = ref(false)
const overrideValue = ref('')

watch(currentItem, () => {
  overriding.value = false
  overrideValue.value = ''
})

// ── Flash feedback ──
const flashing = ref(false)
function triggerFlash() {
  flashing.value = true
  setTimeout(() => { flashing.value = false }, 600)
}

// ── Accept ──
function accept() {
  if (!currentItem.value?.llm_analyzed) return
  const cls = normalisedPrediction.value
  jsonStore.markReviewed(currentItem.value.uid, cls, findCategory(cls))
  startTimerIfNeeded()
  triggerFlash()

  if (activeFilter.value !== 'pending') {
    nextTick(() => {
      if (cursor.value < visibleItems.value.length - 1) cursor.value++
    })
  }
}

// ── Override ──
function startOverride() {
  overriding.value = true
  overrideValue.value = currentItem.value?.human_error_class || ''
}

function confirmOverride() {
  if (!currentItem.value || !overrideValue.value) return
  const val = overrideValue.value
  jsonStore.markReviewed(currentItem.value.uid, val, findCategory(val))
  overriding.value = false
  overrideValue.value = ''
  startTimerIfNeeded()
  triggerFlash()

  if (activeFilter.value !== 'pending') {
    nextTick(() => {
      if (cursor.value < visibleItems.value.length - 1) cursor.value++
    })
  }
}

function cancelOverride() {
  overriding.value = false
  overrideValue.value = ''
}

// ── Taxonomy dropdown options ──
const groupedOptions = computed(() => {
  if (!yamlStore.data) return []
  return Object.entries(yamlStore.data).map(([group, subcategories]) => ({
    group,
    items: Object.entries(subcategories).map(([key, definition]) => ({ key, definition: definition as string })),
  }))
})

function filterOption(input: string, option: { value: string }) {
  return option.value.toLowerCase().includes(input.toLowerCase())
}

function truncDef(def: string, maxLen = 120): string {
  return def.length > maxLen ? def.slice(0, maxLen) + '…' : def
}

// ── Export ──
function handleExport({ key }: { key: string }) {
  const tags = jsonStore.data?.tags
  if (!tags?.length) return

  let content: string
  let mimeType: string
  let extension: string

  if (key === 'json') {
    content = JSON.stringify({ tags }, null, 2)
    mimeType = 'application/json'
    extension = 'json'
  } else {
    const headers = [
      'uid', 'sentence', 'gold_standard', 'original_prediction', 'model_type',
      'error_class', 'LLM_prediction', 'LLM_reasoning', 'human_reviewed',
      'human_error_class', 'concept_category',
    ]
    const rows = tags.map(tag => [
      tag.uid,
      `"${(tag.sentence ?? '').replace(/"/g, '""')}"`,
      `"${tag.gold_standard ?? ''}"`,
      `"${tag.original_prediction ?? ''}"`,
      `"${tag.model_type ?? ''}"`,
      `"${tag.error_class ?? ''}"`,
      `"${tag.LLM_prediction ?? ''}"`,
      `"${(tag.LLM_reasoning ?? '').replace(/"/g, '""')}"`,
      tag.human_reviewed ? 'true' : 'false',
      `"${tag.human_error_class ?? ''}"`,
      `"${tag.concept_category ?? ''}"`,
    ])
    content = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    mimeType = 'text/csv'
    extension = 'csv'
  }

  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${jsonStore.fileName?.replace(/\.[^.]+$/, '') || 'export'}_reviewed.${extension}`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<style scoped>
.review-root {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ── Top bar ── */
.topbar {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.progress-block {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.done-icon { color: #22c55e; font-size: 15px; }

.progress-label {
  font-size: 13px;
  color: #374151;
  white-space: nowrap;
  font-weight: 500;
}

.progress-track {
  width: 100px;
  height: 7px;
  background: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #22c55e;
  border-radius: 4px;
  transition: width 0.5s ease;
}

.progress-pct {
  font-size: 12px;
  color: #22c55e;
  font-weight: 600;
  min-width: 30px;
}

/* Timer */
.timer-block {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 20px;
  flex-shrink: 0;
}
.timer-icon { color: #0284c7; font-size: 13px; }
.timer-label { font-size: 12px; font-weight: 600; color: #0284c7; font-variant-numeric: tabular-nums; }
.timer-avg { font-size: 11px; color: #7dd3fc; white-space: nowrap; }

.filter-pills { display: flex; gap: 6px; flex: 1; }

.pill {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 12px;
  border-radius: 20px;
  border: 1px solid #e5e7eb;
  background: #fff;
  font-size: 12px;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.15s;
}

.pill:hover { border-color: #93c5fd; color: #1d4ed8; }
.pill.active { background: #1d4ed8; border-color: #1d4ed8; color: #fff; }

.pill-count {
  font-size: 11px;
  background: rgba(0,0,0,0.12);
  border-radius: 10px;
  padding: 0 6px;
  line-height: 18px;
}

.pill.active .pill-count { background: rgba(255,255,255,0.25); }

/* ── Empty ── */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 48px 0;
  color: #9ca3af;
}

.empty-icon { font-size: 36px; color: #22c55e; }
.empty-state p { font-size: 14px; margin: 0; }

/* ── Review card ── */
.review-card {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #fff;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: box-shadow 0.2s, border-color 0.2s;
}

.review-card.flash-ok {
  border-color: #4ade80;
  box-shadow: 0 0 0 3px rgba(74, 222, 128, 0.25);
}

/* Card header */
.card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 20px;
  border-bottom: 1px solid #f3f4f6;
  background: #fafafa;
}

.type-badge { font-size: 13px; font-weight: 700; margin: 0; }

.reviewed-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #22c55e;
  font-weight: 600;
}

.nav-controls {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
}

.nav-btn {
  padding: 4px 12px;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
  background: #fff;
  font-size: 13px;
  color: #374151;
  cursor: pointer;
  transition: all 0.15s;
}

.nav-btn:hover:not(:disabled) { border-color: #93c5fd; color: #1d4ed8; }
.nav-btn:disabled { opacity: 0.35; cursor: default; }
.nav-pos { font-size: 12px; color: #9ca3af; }

/* Sentence */
.sentence-block {
  margin: 16px 20px;
  padding: 16px 18px;
  background: #f8fafc;
  border-left: 4px solid #3b82f6;
  border-radius: 0 8px 8px 0;
}

.sentence-text {
  margin: 0;
  font-size: 15px;
  line-height: 1.65;
  color: #1f2937;
  font-style: italic;
}

/* Meta */
.meta-row {
  display: flex;
  gap: 28px;
  padding: 0 20px 16px;
  flex-wrap: wrap;
}

.meta-item { display: flex; flex-direction: column; gap: 2px; }

.meta-label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #9ca3af;
  font-weight: 600;
}

.meta-value { font-size: 13px; color: #374151; font-weight: 500; }

/* LLM panel */
.llm-panel {
  margin: 0 20px 12px;
  padding: 14px 16px;
  background: #f5f3ff;
  border: 1px solid #ddd6fe;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.llm-panel--empty {
  flex-direction: row;
  align-items: center;
  background: #f9fafb;
  border-color: #e5e7eb;
  color: #9ca3af;
}

.llm-panel-header { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.llm-icon { font-size: 16px; color: #7c3aed; }
.llm-title { font-size: 13px; font-weight: 600; color: #4c1d95; }
.llm-class-tag { margin: 0; font-weight: 700; }
.llm-reasoning { margin: 0; font-size: 13px; color: #374151; line-height: 1.6; }
.llm-empty-text { font-size: 13px; margin-left: 4px; }

/* Difficulty badge */
.difficulty-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 8px;
  background: #fef3c7;
  border: 1px solid #fbbf24;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  color: #92400e;
}

/* Concept category row */
.concept-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 20px 12px;
  padding: 10px 14px;
  background: #f0fdfa;
  border: 1px solid #99f6e4;
  border-radius: 8px;
}

.concept-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #0f766e;
  white-space: nowrap;
  flex-shrink: 0;
}

/* Decision */
.decision-section {
  padding: 16px 20px 20px;
  border-top: 1px solid #f3f4f6;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.decision-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #9ca3af;
  font-weight: 600;
}

/* Already-reviewed summary */
.reviewed-summary {
  display: flex;
  align-items: center;
  gap: 12px;
}

.reviewed-result { display: flex; }

.result-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 13px;
}

.accept-badge { background: #dcfce7; color: #15803d; border: 1.5px solid #86efac; }
.override-badge { background: #ffedd5; color: #9a3412; border: 1.5px solid #fed7aa; }

.btn-redo {
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
  background: #fff;
  font-size: 12px;
  color: #6b7280;
  cursor: pointer;
}

.btn-redo:hover { border-color: #9ca3af; color: #374151; }

/* Action buttons */
.decision-btns { display: flex; gap: 10px; flex-wrap: wrap; }

.btn-accept, .btn-override {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  border: 2px solid transparent;
}

.btn-accept {
  background: #f0fdf4;
  border-color: #86efac;
  color: #15803d;
}

.btn-accept:hover:not(:disabled) { background: #dcfce7; border-color: #4ade80; }
.btn-accept:disabled { opacity: 0.4; cursor: default; }

.btn-class-hint { font-size: 12px; font-weight: 400; opacity: 0.75; }

.btn-override {
  background: #fff7ed;
  border-color: #fed7aa;
  color: #9a3412;
}

.btn-override:hover { background: #ffedd5; border-color: #fb923c; }

/* Override panel */
.override-panel {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.btn-confirm {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 7px 16px;
  border-radius: 8px;
  border: 2px solid #4ade80;
  background: #22c55e;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-confirm:hover:not(:disabled) { background: #16a34a; border-color: #16a34a; }
.btn-confirm:disabled { opacity: 0.4; cursor: default; }

.btn-cancel {
  padding: 7px 14px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  background: #fff;
  font-size: 13px;
  color: #6b7280;
  cursor: pointer;
}

.btn-cancel:hover { border-color: #9ca3af; }

/* ── Item strip ── */
.item-strip {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #fff;
  max-height: 220px;
  overflow-y: auto;
}

.strip-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 14px;
  border-bottom: 1px solid #f3f4f6;
  cursor: pointer;
  transition: background 0.1s;
}

.strip-item:last-child { border-bottom: none; }
.strip-item:hover { background: #f9fafb; }
.strip-item.active { background: #eff6ff; border-left: 3px solid #3b82f6; padding-left: 11px; }
.strip-item.reviewed .strip-text { color: #9ca3af; }

.strip-text {
  flex: 1;
  font-size: 12px;
  color: #374151;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.strip-done { color: #22c55e; font-size: 13px; flex-shrink: 0; }

/* Transitions */
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* Dropdown option with inline definition */
.opt-name {
  font-size: 13px;
  font-weight: 500;
  color: #1f2937;
  line-height: 1.3;
}

.opt-def {
  font-size: 11px;
  color: #9ca3af;
  line-height: 1.4;
  white-space: normal;
  margin-top: 2px;
}
</style>
