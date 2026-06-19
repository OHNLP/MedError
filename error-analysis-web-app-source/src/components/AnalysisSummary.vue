<template>
  <div class="corpus-stats">
    <!-- Primary counts row -->
    <div class="stats-grid">
      <div class="stat-card">
        <span class="stat-value">{{ total }}</span>
        <span class="stat-label">Total Items</span>
      </div>
      <div class="stat-card stat-fp">
        <span class="stat-value">{{ fpCount }}</span>
        <span class="stat-label">False Positives</span>
      </div>
      <div class="stat-card stat-fn">
        <span class="stat-value">{{ fnCount }}</span>
        <span class="stat-label">False Negatives</span>
      </div>
    </div>

    <!-- Secondary stats row -->
    <div class="meta-stats">
      <div class="meta-item">
        <span class="meta-key">FP/FN Ratio</span>
        <span class="meta-val">{{ fpFnRatio }}</span>
      </div>
      <div class="meta-sep" />
      <div class="meta-item">
        <span class="meta-key">LLM Analyzed</span>
        <span class="meta-val">{{ analyzedCount }} <span class="meta-sub">({{ analyzedPct }}%)</span></span>
      </div>
      <div class="meta-sep" />
      <div class="meta-item">
        <span class="meta-key">Human Reviewed</span>
        <span class="meta-val">{{ reviewedCount }} <span class="meta-sub">({{ reviewedPct }}%)</span></span>
      </div>
      <div class="meta-sep" />
      <div class="meta-item">
        <span class="meta-key">Unique Error Classes</span>
        <span class="meta-val">{{ uniqueClasses }}</span>
      </div>
      <div class="meta-sep" />
      <div class="meta-item">
        <span class="meta-key">Unique Model Types</span>
        <span class="meta-val">{{ uniqueModels }}</span>
      </div>
      <div v-if="uniqueCategories > 0" class="meta-sep" />
      <div v-if="uniqueCategories > 0" class="meta-item">
        <span class="meta-key">Concept Categories</span>
        <span class="meta-val">{{ uniqueCategories }}</span>
      </div>
      <div class="meta-sep" />
      <div class="meta-item">
        <span class="meta-key">Avg Sentence Words</span>
        <span class="meta-val">{{ avgWords }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Tag {
  error_class: string
  LLM_prediction?: string
  gold_standard?: string
  sentence?: string
  model_type?: string
  llm_analyzed?: boolean
  human_reviewed?: boolean
  concept_category?: string
}

interface JsonData {
  tags?: Tag[]
}

interface Props {
  jsonData: JsonData | null
}

const props = defineProps<Props>()

const tags = computed(() => props.jsonData?.tags ?? [])

const total = computed(() => tags.value.length)
const fpCount = computed(() => tags.value.filter(t => t.error_class === 'FP').length)
const fnCount = computed(() => tags.value.filter(t => t.error_class === 'FN').length)

const fpFnRatio = computed(() => {
  if (!fnCount.value) return fpCount.value > 0 ? '∞' : '—'
  return (fpCount.value / fnCount.value).toFixed(2)
})

const errorItems = computed(() => tags.value.filter(t => t.error_class === 'FP' || t.error_class === 'FN'))

const analyzedCount = computed(() => errorItems.value.filter(t => t.llm_analyzed).length)
const analyzedPct = computed(() =>
  errorItems.value.length ? Math.round((analyzedCount.value / errorItems.value.length) * 100) : 0,
)

const reviewedCount = computed(() => errorItems.value.filter(t => t.human_reviewed).length)
const reviewedPct = computed(() =>
  errorItems.value.length ? Math.round((reviewedCount.value / errorItems.value.length) * 100) : 0,
)

const uniqueClasses = computed(() => {
  const set = new Set(
    errorItems.value
      .filter(t => t.LLM_prediction)
      .map(t => (t.LLM_prediction ?? '').replace(/^\d+(\.\d+)*\.\s*/, '').trim() || t.LLM_prediction),
  )
  return set.size
})

const uniqueModels = computed(() =>
  new Set(tags.value.map(t => t.model_type || 'Unknown')).size,
)

const uniqueCategories = computed(() => {
  const set = new Set(tags.value.map(t => t.concept_category).filter(Boolean))
  return set.size
})

const avgWords = computed(() => {
  if (!tags.value.length) return '—'
  const total = tags.value.reduce((sum, t) => {
    const words = (t.sentence ?? '').trim().split(/\s+/).filter(Boolean).length
    return sum + words
  }, 0)
  return (total / tags.value.length).toFixed(1)
})
</script>

<style scoped>
.corpus-stats {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.stat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 14px 10px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #fff;
  gap: 4px;
}

.stat-value {
  font-size: 26px;
  font-weight: 700;
  color: #1f2937;
  line-height: 1;
}

.stat-label {
  font-size: 10px;
  color: #9ca3af;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.stat-fp { border-color: #fed7aa; background: #fff7ed; }
.stat-fp .stat-value { color: #ea580c; }
.stat-fn { border-color: #bfdbfe; background: #eff6ff; }
.stat-fn .stat-value { color: #2563eb; }
/* Meta row */
.meta-stats {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  padding: 10px 14px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.meta-key {
  font-size: 11px;
  color: #9ca3af;
  font-weight: 500;
  white-space: nowrap;
}

.meta-val {
  font-size: 13px;
  font-weight: 700;
  color: #1f2937;
  white-space: nowrap;
}

.meta-sub {
  font-size: 11px;
  font-weight: 400;
  color: #9ca3af;
}

.meta-sep {
  width: 1px;
  height: 16px;
  background: #e5e7eb;
  flex-shrink: 0;
}
</style>
