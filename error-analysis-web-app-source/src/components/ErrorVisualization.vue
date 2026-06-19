<template>
  <div class="viz-root">

    <!-- Summary cards -->
    <div class="summary-row">
      <div class="stat-card">
        <span class="stat-value">{{ analyzedCount }}</span>
        <span class="stat-label">Items Analysed</span>
      </div>
      <div class="stat-card stat-fp">
        <span class="stat-value">{{ fpCount }}</span>
        <span class="stat-label">False Positives</span>
      </div>
      <div class="stat-card stat-fn">
        <span class="stat-value">{{ fnCount }}</span>
        <span class="stat-label">False Negatives</span>
      </div>
      <div class="stat-card stat-top">
        <span class="stat-value top-class">{{ topErrorClass || '—' }}</span>
        <span class="stat-label">Most Common Error</span>
      </div>
    </div>

    <!-- #3 Sankey diagram -->
    <div class="chart-card">
      <div class="chart-header">
        <h4>Error Flow Diagram</h4>
        <span class="hint-muted">
          {{ sankeyData ? (sankeyData.hasCats ? 'Error Type → Error Class → Concept Category' : 'Error Type → Error Class') : '' }}
        </span>
      </div>

      <div v-if="!analyzedCount" class="empty">
        No LLM-analysed items yet. Run LLM Analysis to populate this view.
      </div>
      <div v-else class="sankey-wrap">
        <svg
          :viewBox="`0 0 660 ${sankeyData?.H ?? 300}`"
          preserveAspectRatio="xMidYMid meet"
          style="width: 100%; height: auto; max-height: 340px;"
        >
          <!-- Column headers -->
          <text v-if="sankeyData" :x="sankeyData.colXs[0] + 7" y="12" text-anchor="middle" class="col-header">Error Type</text>
          <text v-if="sankeyData" :x="sankeyData.colXs[1] + 7" y="12" text-anchor="middle" class="col-header">Error Class</text>
          <text v-if="sankeyData?.hasCats" :x="sankeyData.colXs[2] + 7" y="12" text-anchor="middle" class="col-header">Concept Category</text>

          <!-- Links behind nodes -->
          <path
            v-for="(link, i) in sankeyData?.links01 ?? []"
            :key="`l01_${i}`"
            :d="link.d"
            :fill="link.color"
            :fill-opacity="0.35"
            stroke="none"
          />
          <path
            v-for="(link, i) in sankeyData?.links12 ?? []"
            :key="`l12_${i}`"
            :d="link.d"
            :fill="link.color"
            :fill-opacity="0.30"
            stroke="none"
          />

          <!-- Col 0 nodes (FP/FN) -->
          <g v-for="node in sankeyData?.nodes0 ?? []" :key="`n0_${node.id}`">
            <rect :x="node.x" :y="node.y0" :width="14" :height="Math.max(3, node.y1 - node.y0)" :fill="node.color" rx="2">
              <title>{{ node.id }}: {{ node.count }}</title>
            </rect>
            <text :x="node.x - 5" :y="(node.y0 + node.y1) / 2 - 4" text-anchor="end" dominant-baseline="middle" class="node-label">{{ node.id }}</text>
            <text :x="node.x - 5" :y="(node.y0 + node.y1) / 2 + 9" text-anchor="end" dominant-baseline="middle" class="node-count">{{ node.count }}</text>
          </g>

          <!-- Col 1 nodes (error classes) -->
          <g v-for="node in sankeyData?.nodes1 ?? []" :key="`n1_${node.id}`">
            <rect :x="node.x" :y="node.y0" :width="14" :height="Math.max(3, node.y1 - node.y0)" :fill="node.color" rx="2">
              <title>{{ node.id }}: {{ node.count }}</title>
            </rect>
            <text
              :x="sankeyData?.hasCats ? node.x + 7 : node.x + 19"
              :y="(node.y0 + node.y1) / 2"
              :text-anchor="sankeyData?.hasCats ? 'middle' : 'start'"
              :class="sankeyData?.hasCats ? 'node-label-sm' : 'node-label'"
              dominant-baseline="middle"
              :transform="sankeyData?.hasCats ? `rotate(-55, ${node.x + 7}, ${(node.y0 + node.y1) / 2})` : ''"
            >{{ truncate(node.id, sankeyData?.hasCats ? 14 : 22) }}</text>
          </g>

          <!-- Col 2 nodes (concept categories) -->
          <g v-for="node in sankeyData?.nodes2 ?? []" :key="`n2_${node.id}`">
            <rect :x="node.x" :y="node.y0" :width="14" :height="Math.max(3, node.y1 - node.y0)" :fill="node.color" rx="2">
              <title>{{ node.id }}: {{ node.count }}</title>
            </rect>
            <text :x="node.x + 19" :y="(node.y0 + node.y1) / 2" text-anchor="start" dominant-baseline="middle" class="node-label">{{ truncate(node.id, 18) }}</text>
          </g>
        </svg>

        <!-- Legend -->
        <div class="sankey-legend">
          <span class="legend-item"><span class="ldot" style="background:#f97316" />FP (False Positive)</span>
          <span class="legend-item"><span class="ldot" style="background:#3b82f6" />FN (False Negative)</span>
          <span class="legend-item"><span class="ldot" style="background:#6366f1" />Error Class</span>
          <span v-if="sankeyData?.hasCats" class="legend-item"><span class="ldot" style="background:#0891b2" />Concept Category</span>
        </div>
      </div>
    </div>

    <!-- Error class distribution chart -->
    <div class="chart-card">
      <div class="chart-header">
        <h4>Error Class Distribution</h4>
        <div style="display:flex; align-items:center; gap:16px;">
          <div class="legend">
            <span class="legend-item"><span class="legend-dot dot-fp" />False Positive</span>
            <span class="legend-item"><span class="legend-dot dot-fn" />False Negative</span>
          </div>
          <!-- #7 Generate Report button -->
          <a-button size="small" type="primary" ghost @click="generateReport">
            Generate Report
          </a-button>
        </div>
      </div>

      <div v-if="chartRows.length === 0" class="empty">
        No LLM-analysed items yet. Run LLM Analysis to populate this view.
      </div>

      <div v-else class="chart-body">
        <div v-for="row in chartRows" :key="row.label" class="chart-row">
          <div class="row-label" :title="row.label">{{ row.label }}</div>
          <div class="bar-group">
            <div class="bar-track">
              <div
                class="bar bar-fp"
                :style="{ width: pct(row.fp) }"
                :title="`FP: ${row.fp}`"
              />
            </div>
            <div class="bar-track">
              <div
                class="bar bar-fn"
                :style="{ width: pct(row.fn) }"
                :title="`FN: ${row.fn}`"
              />
            </div>
          </div>
          <div class="row-counts">
            <span class="count-fp">{{ row.fp }}</span>
            <span class="count-sep">/</span>
            <span class="count-fn">{{ row.fn }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Category breakdown (if taxonomy loaded) -->
    <div v-if="categoryRows.length > 0" class="chart-card">
      <div class="chart-header">
        <h4>Error Category Breakdown</h4>
        <span class="hint-muted">Grouped by taxonomy category</span>
      </div>
      <div class="category-grid">
        <div v-for="cat in categoryRows" :key="cat.label" class="category-cell">
          <div class="cat-bar-wrap">
            <div class="cat-bar" :style="{ height: catPct(cat.total) }" />
          </div>
          <div class="cat-count">{{ cat.total }}</div>
          <div class="cat-label">{{ cat.label }}</div>
        </div>
      </div>
    </div>

    <!-- Concept category breakdown (if tagged) -->
    <div v-if="conceptCatRows.length > 0" class="chart-card">
      <div class="chart-header">
        <h4>Errors by Concept Category</h4>
        <span class="hint-muted">Based on human-tagged categories</span>
      </div>
      <div class="chart-body">
        <div v-for="row in conceptCatRows" :key="row.label" class="chart-row">
          <div class="row-label" :title="row.label">{{ row.label }}</div>
          <div class="bar-group">
            <div class="bar-track">
              <div class="bar bar-fp" :style="{ width: pct(row.fp) }" :title="`FP: ${row.fp}`" />
            </div>
            <div class="bar-track">
              <div class="bar bar-fn" :style="{ width: pct(row.fn) }" :title="`FN: ${row.fn}`" />
            </div>
          </div>
          <div class="row-counts">
            <span class="count-fp">{{ row.fp }}</span>
            <span class="count-sep">/</span>
            <span class="count-fn">{{ row.fn }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Model type breakdown -->
    <div v-if="modelRows.length > 1" class="chart-card">
      <div class="chart-header">
        <h4>Errors by Model Type</h4>
      </div>
      <div class="chart-body">
        <div v-for="row in modelRows" :key="row.label" class="chart-row">
          <div class="row-label">{{ row.label }}</div>
          <div class="bar-group">
            <div class="bar-track">
              <div class="bar bar-fp" :style="{ width: pct(row.fp) }" :title="`FP: ${row.fp}`" />
            </div>
            <div class="bar-track">
              <div class="bar bar-fn" :style="{ width: pct(row.fn) }" :title="`FN: ${row.fn}`" />
            </div>
          </div>
          <div class="row-counts">
            <span class="count-fp">{{ row.fp }}</span>
            <span class="count-sep">/</span>
            <span class="count-fn">{{ row.fn }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Detail table -->
    <div class="chart-card">
      <div class="chart-header">
        <h4>Analysed Items</h4>
        <a-input-search
          v-model:value="searchText"
          placeholder="Search sentence or error class…"
          size="small"
          style="width: 240px"
          allow-clear
        />
      </div>
      <div class="table-wrap">
        <table class="detail-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Sentence</th>
              <th>Prediction</th>
              <th>Type</th>
              <th>Error Class</th>
              <th>Concept Cat.</th>
              <th>Reasoning</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="tag in filteredTags" :key="tag.uid">
              <td class="col-uid">{{ tag.uid }}</td>
              <td class="col-sentence">{{ tag.sentence }}</td>
              <td class="col-pred">{{ tag.original_prediction }}</td>
              <td>
                <a-tag :color="tag.error_class === 'FP' ? 'orange' : 'blue'" size="small">
                  {{ tag.error_class }}
                </a-tag>
              </td>
              <td class="col-class">{{ normalise(tag.LLM_prediction) }}</td>
              <td class="col-cat">{{ tag.concept_category || '—' }}</td>
              <td class="col-reasoning">{{ tag.LLM_reasoning }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useJsonDataStore } from '../stores/jsonData'
import { useYamlDataStore } from '../stores/yamlData'
import { useStudyConfigStore } from '../stores/studyConfig'

const jsonStore = useJsonDataStore()
const yamlStore = useYamlDataStore()
const studyStore = useStudyConfigStore()
const searchText = ref('')

// Strip numbering prefixes like "2.2.4. Negation" → "Negation"
function normalise(raw: string) {
  return (raw ?? '').replace(/^\d+(\.\d+)*\.\s*/, '').trim() || raw
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n) + '…' : s
}

const analyzedTags = computed(() =>
  (jsonStore.data?.tags ?? []).filter(
    t => (t.error_class === 'FP' || t.error_class === 'FN') && t.llm_analyzed,
  ),
)

const analyzedCount = computed(() => analyzedTags.value.length)
const fpCount = computed(() => analyzedTags.value.filter(t => t.error_class === 'FP').length)
const fnCount = computed(() => analyzedTags.value.filter(t => t.error_class === 'FN').length)

const maxCount = computed(() => {
  const counts = chartRows.value.map(r => r.fp + r.fn)
  return Math.max(...counts, 1)
})

function pct(n: number) {
  return Math.round((n / maxCount.value) * 100) + '%'
}

// --- Error class chart rows ---
const chartRows = computed(() => {
  const map = new Map<string, { fp: number; fn: number }>()
  for (const tag of analyzedTags.value) {
    const key = normalise(tag.LLM_prediction) || 'Unknown'
    const entry = map.get(key) ?? { fp: 0, fn: 0 }
    if (tag.error_class === 'FP') entry.fp++
    else entry.fn++
    map.set(key, entry)
  }
  return [...map.entries()]
    .map(([label, { fp, fn }]) => ({ label, fp, fn, total: fp + fn }))
    .sort((a, b) => b.total - a.total)
})

const topErrorClass = computed(() => chartRows.value[0]?.label ?? null)

// --- Taxonomy category breakdown ---
const categoryRows = computed(() => {
  if (!yamlStore.data) return []
  const classToCategory = new Map<string, string>()
  for (const [cat, types] of Object.entries(yamlStore.data)) {
    for (const typeName of Object.keys(types)) {
      classToCategory.set(typeName.toLowerCase().replace(/[_\s-]/g, ''), cat)
    }
  }
  const catMap = new Map<string, number>()
  for (const tag of analyzedTags.value) {
    const norm = normalise(tag.LLM_prediction).toLowerCase().replace(/[_\s-]/g, '')
    const cat = classToCategory.get(norm) ?? 'Other'
    catMap.set(cat, (catMap.get(cat) ?? 0) + 1)
  }
  const maxCat = Math.max(...[...catMap.values()], 1)
  return [...catMap.entries()]
    .map(([label, total]) => ({ label, total, pct: total / maxCat }))
    .sort((a, b) => b.total - a.total)
})

function catPct(n: number) {
  const maxCat = Math.max(...categoryRows.value.map(r => r.total), 1)
  return Math.round((n / maxCat) * 80) + 'px'
}

// --- Concept category breakdown ---
const conceptCatRows = computed(() => {
  const map = new Map<string, { fp: number; fn: number }>()
  for (const tag of analyzedTags.value) {
    const cat = tag.concept_category
    if (!cat) continue
    const entry = map.get(cat) ?? { fp: 0, fn: 0 }
    if (tag.error_class === 'FP') entry.fp++
    else entry.fn++
    map.set(cat, entry)
  }
  return [...map.entries()]
    .map(([label, { fp, fn }]) => ({ label, fp, fn, total: fp + fn }))
    .sort((a, b) => b.total - a.total)
})

// --- Model type breakdown ---
const modelRows = computed(() => {
  const map = new Map<string, { fp: number; fn: number }>()
  for (const tag of analyzedTags.value) {
    const key = tag.model_type || 'Unknown'
    const entry = map.get(key) ?? { fp: 0, fn: 0 }
    if (tag.error_class === 'FP') entry.fp++
    else entry.fn++
    map.set(key, entry)
  }
  return [...map.entries()]
    .map(([label, { fp, fn }]) => ({ label, fp, fn }))
    .sort((a, b) => (b.fp + b.fn) - (a.fp + a.fn))
})

// --- Filtered detail table ---
const filteredTags = computed(() => {
  const q = searchText.value.toLowerCase()
  return analyzedTags.value.filter(t =>
    !q ||
    t.sentence.toLowerCase().includes(q) ||
    normalise(t.LLM_prediction).toLowerCase().includes(q) ||
    (t.LLM_reasoning ?? '').toLowerCase().includes(q) ||
    (t.concept_category ?? '').toLowerCase().includes(q),
  )
})

// ── #3 Sankey diagram ──────────────────────────────────────────────────────
interface SNode { id: string; x: number; y0: number; y1: number; color: string; count: number }
interface SLink { d: string; color: string }

const sankeyData = computed(() => {
  const tags = analyzedTags.value
  if (tags.length < 1) return null

  const H = 290
  const NW = 14
  const GAP = 6
  const PAD = 26  // top padding (for column headers)
  const PADBOT = 10

  const hasCats = tags.some(t => t.concept_category)
  const colXs = hasCats ? [80, 310, 566] : [110, 532]

  // Count maps
  const col0Map = new Map<string, number>()
  const col1Map = new Map<string, number>()
  const col2Map = new Map<string, number>()
  const links01 = new Map<string, number>()
  const links12 = new Map<string, number>()

  for (const tag of tags) {
    const type = tag.error_class
    const cls = normalise(tag.LLM_prediction) || 'Unknown'
    const cat = tag.concept_category ?? ''

    col0Map.set(type, (col0Map.get(type) ?? 0) + 1)
    col1Map.set(cls, (col1Map.get(cls) ?? 0) + 1)
    links01.set(`${type}|${cls}`, (links01.get(`${type}|${cls}`) ?? 0) + 1)

    if (cat && hasCats) {
      col2Map.set(cat, (col2Map.get(cat) ?? 0) + 1)
      links12.set(`${cls}|${cat}`, (links12.get(`${cls}|${cat}`) ?? 0) + 1)
    }
  }

  const total = tags.length
  const availH = H - PAD - PADBOT

  function layoutCol(map: Map<string, number>, x: number, colIdx: number): SNode[] {
    const sorted = [...map.entries()].sort((a, b) => b[1] - a[1])
    const n = sorted.length
    const totalH = availH - (n - 1) * GAP
    let y = PAD
    return sorted.map(([id, count]) => {
      const h = Math.max(4, (count / total) * totalH)
      const color = colIdx === 0
        ? (id === 'FP' ? '#f97316' : '#3b82f6')
        : colIdx === 1 ? '#6366f1' : '#0891b2'
      const node: SNode = { id, x, y0: y, y1: y + h, color, count }
      y += h + GAP
      return node
    })
  }

  const nodes0 = layoutCol(col0Map, colXs[0], 0)
  const nodes1 = layoutCol(col1Map, colXs[1], 1)
  const nodes2 = hasCats ? layoutCol(col2Map, colXs[2], 2) : []

  const n0 = new Map(nodes0.map(n => [n.id, n]))
  const n1 = new Map(nodes1.map(n => [n.id, n]))
  const n2 = new Map(nodes2.map(n => [n.id, n]))

  // Track per-node offsets for link ribbon drawing
  const out0 = new Map(nodes0.map(n => [n.id, n.y0]))
  const in1  = new Map(nodes1.map(n => [n.id, n.y0]))
  const out1 = new Map(nodes1.map(n => [n.id, n.y0]))
  const in2  = new Map(nodes2.map(n => [n.id, n.y0]))

  function makePath(x1: number, srcY0: number, srcY1: number, x2: number, tgtY0: number, tgtY1: number): string {
    const mx = (x1 + x2) / 2
    return `M${x1} ${srcY0} C${mx} ${srcY0} ${mx} ${tgtY0} ${x2} ${tgtY0} L${x2} ${tgtY1} C${mx} ${tgtY1} ${mx} ${srcY1} ${x1} ${srcY1} Z`
  }

  const linkPaths01: SLink[] = []
  const linkPaths12: SLink[] = []

  // Sort links by source node y position for visual order
  const sorted01 = [...links01.entries()].sort((a, b) => {
    const aNode = n0.get(a[0].split('|')[0])
    const bNode = n0.get(b[0].split('|')[0])
    return (aNode?.y0 ?? 0) - (bNode?.y0 ?? 0)
  })

  for (const [key, count] of sorted01) {
    const [type, cls] = key.split('|')
    const src = n0.get(type)
    const tgt = n1.get(cls)
    if (!src || !tgt) continue

    const srcH = (src.y1 - src.y0)
    const tgtH = (tgt.y1 - tgt.y0)
    const lhSrc = (count / (col0Map.get(type) ?? 1)) * srcH
    const lhTgt = (count / (col1Map.get(cls) ?? 1)) * tgtH

    const sY0 = out0.get(type) ?? src.y0
    const sY1 = sY0 + lhSrc
    out0.set(type, sY1)

    const tY0 = in1.get(cls) ?? tgt.y0
    const tY1 = tY0 + lhTgt
    in1.set(cls, tY1)

    linkPaths01.push({
      d: makePath(src.x + NW, sY0, sY1, tgt.x, tY0, tY1),
      color: src.color,
    })
  }

  if (hasCats) {
    const sorted12 = [...links12.entries()].sort((a, b) => {
      const aNode = n1.get(a[0].split('|')[0])
      const bNode = n1.get(b[0].split('|')[0])
      return (aNode?.y0 ?? 0) - (bNode?.y0 ?? 0)
    })

    for (const [key, count] of sorted12) {
      const [cls, cat] = key.split('|')
      const src = n1.get(cls)
      const tgt = n2.get(cat)
      if (!src || !tgt) continue

      const srcH = (src.y1 - src.y0)
      const tgtH = (tgt.y1 - tgt.y0)
      const lhSrc = (count / (col1Map.get(cls) ?? 1)) * srcH
      const lhTgt = (count / (col2Map.get(cat) ?? 1)) * tgtH

      const sY0 = out1.get(cls) ?? src.y0
      const sY1 = sY0 + lhSrc
      out1.set(cls, sY1)

      const tY0 = in2.get(cat) ?? tgt.y0
      const tY1 = tY0 + lhTgt
      in2.set(cat, tY1)

      linkPaths12.push({
        d: makePath(src.x + NW, sY0, sY1, tgt.x, tY0, tY1),
        color: src.color,
      })
    }
  }

  return { nodes0, nodes1, nodes2, links01: linkPaths01, links12: linkPaths12, H, hasCats, colXs }
})

// ── #7 Report export ──────────────────────────────────────────────────────
function generateReport() {
  const allTags = jsonStore.data?.tags ?? []
  const errorTags = allTags.filter(t => t.error_class === 'FP' || t.error_class === 'FN')
  const analyzed = errorTags.filter(t => t.llm_analyzed)
  const reviewed = errorTags.filter(t => t.human_reviewed)
  const overridden = reviewed.filter(t => t.human_error_class && t.human_error_class !== normalise(t.LLM_prediction))

  const wordCounts = allTags.map(t => (t.sentence ?? '').trim().split(/\s+/).filter(Boolean).length)
  const avgWords = wordCounts.length
    ? (wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length).toFixed(1)
    : 0

  const byClass = [...chartRows.value.map(r => ({ class: r.label, fp: r.fp, fn: r.fn, total: r.total }))]
  const byModel = [...modelRows.value.map(r => ({ model_type: r.label, fp: r.fp, fn: r.fn }))]
  const byConcept = [...conceptCatRows.value.map(r => ({ concept_category: r.label, fp: r.fp, fn: r.fn, total: r.total }))]

  const overrideDetails = overridden.map(t => ({
    uid: t.uid,
    llm_class: normalise(t.LLM_prediction),
    human_class: t.human_error_class,
    concept_category: t.concept_category ?? '',
    error_type: t.error_class,
  }))

  const report = {
    generated_at: new Date().toISOString(),
    study_metadata: studyStore.toMetadata(),
    corpus_characteristics: {
      total_items: allTags.length,
      fp_count: allTags.filter(t => t.error_class === 'FP').length,
      fn_count: allTags.filter(t => t.error_class === 'FN').length,
      tp_count: allTags.filter(t => t.error_class === 'TP').length,
      tn_count: allTags.filter(t => t.error_class === 'TN').length,
      llm_analyzed_count: analyzed.length,
      unique_error_classes: [...new Set(analyzed.map(t => normalise(t.LLM_prediction)).filter(Boolean))].sort(),
      unique_concept_categories: [...new Set(allTags.map(t => t.concept_category).filter(Boolean))].sort(),
      unique_model_types: [...new Set(allTags.map(t => t.model_type).filter(Boolean))].sort(),
      avg_sentence_words: avgWords,
    },
    error_distribution: {
      by_class: byClass,
      by_taxonomy_category: categoryRows.value.map(r => ({ category: r.label, count: r.total })),
      by_concept_category: byConcept,
      by_model_type: byModel,
    },
    human_review_summary: {
      total_reviewed: reviewed.length,
      total_pending: errorTags.length - reviewed.length,
      accepted: reviewed.length - overridden.length,
      overridden: overridden.length,
      override_details: overrideDetails,
    },
  }

  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const stem = jsonStore.fileName?.replace(/\.[^.]+$/, '') || 'mederror'
  a.download = `${stem}_report_${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<style scoped>
.viz-root {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ── Summary cards ── */
.summary-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.stat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #fff;
  gap: 4px;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #1f2937;
  line-height: 1;
}

.top-class {
  font-size: 14px;
  font-weight: 700;
  text-align: center;
  color: #1f2937;
}

.stat-label {
  font-size: 11px;
  color: #9ca3af;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.stat-fp { border-color: #fed7aa; background: #fff7ed; }
.stat-fp .stat-value { color: #ea580c; }
.stat-fn { border-color: #bfdbfe; background: #eff6ff; }
.stat-fn .stat-value { color: #2563eb; }
.stat-top { border-color: #d1fae5; background: #f0fdf4; }
.stat-top .stat-value { color: #059669; }

/* ── Chart cards ── */
.chart-card {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #fff;
  overflow: hidden;
}

.chart-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 10px;
  border-bottom: 1px solid #f3f4f6;
  gap: 12px;
}

.chart-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}

.hint-muted {
  font-size: 11px;
  color: #9ca3af;
}

.legend {
  display: flex;
  gap: 14px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: #6b7280;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 2px;
}

.dot-fp { background: #f97316; }
.dot-fn { background: #3b82f6; }

/* ── Sankey ── */
.sankey-wrap {
  padding: 12px 16px 8px;
}

.sankey-legend {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid #f3f4f6;
}

.ldot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 2px;
  flex-shrink: 0;
}

/* SVG text classes */
:deep(.col-header) {
  font-size: 9px;
  font-weight: 700;
  fill: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

:deep(.node-label) {
  font-size: 11px;
  font-weight: 500;
  fill: #374151;
}

:deep(.node-label-sm) {
  font-size: 9px;
  font-weight: 500;
  fill: #6b7280;
}

:deep(.node-count) {
  font-size: 9px;
  fill: #9ca3af;
}

/* ── Horizontal bar chart ── */
.chart-body {
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.chart-row {
  display: grid;
  grid-template-columns: 180px 1fr 56px;
  align-items: center;
  gap: 10px;
}

.row-label {
  font-size: 12px;
  font-weight: 500;
  color: #374151;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bar-group {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.bar-track {
  height: 8px;
  background: #f3f4f6;
  border-radius: 4px;
  overflow: hidden;
}

.bar {
  height: 100%;
  border-radius: 4px;
  transition: width 0.4s ease;
  min-width: 2px;
}

.bar-fp { background: #f97316; }
.bar-fn { background: #3b82f6; }

.row-counts {
  font-size: 11px;
  display: flex;
  gap: 3px;
  justify-content: flex-end;
}

.count-fp { color: #ea580c; font-weight: 600; }
.count-sep { color: #d1d5db; }
.count-fn { color: #2563eb; font-weight: 600; }

/* ── Category column chart ── */
.category-grid {
  display: flex;
  align-items: flex-end;
  gap: 16px;
  padding: 16px 16px 12px;
  overflow-x: auto;
}

.category-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-width: 80px;
}

.cat-bar-wrap {
  height: 80px;
  display: flex;
  align-items: flex-end;
  width: 100%;
}

.cat-bar {
  width: 100%;
  background: linear-gradient(180deg, #6366f1 0%, #818cf8 100%);
  border-radius: 4px 4px 0 0;
  min-height: 4px;
  transition: height 0.4s ease;
}

.cat-count {
  font-size: 13px;
  font-weight: 600;
  color: #4f46e5;
}

.cat-label {
  font-size: 10px;
  color: #6b7280;
  text-align: center;
  max-width: 80px;
  word-break: break-word;
  line-height: 1.3;
}

/* ── Detail table ── */
.table-wrap {
  overflow-x: auto;
  max-height: 400px;
  overflow-y: auto;
}

.detail-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.detail-table th {
  background: #f9fafb;
  padding: 8px 10px;
  text-align: left;
  border-bottom: 2px solid #e5e7eb;
  font-weight: 600;
  color: #374151;
  position: sticky;
  top: 0;
  z-index: 1;
  white-space: nowrap;
}

.detail-table td {
  padding: 7px 10px;
  border-bottom: 1px solid #f3f4f6;
  vertical-align: top;
}

.detail-table tr:hover td {
  background: #f9fafb;
}

.col-uid { color: #9ca3af; width: 40px; white-space: nowrap; }
.col-sentence { max-width: 220px; color: #374151; }
.col-pred { max-width: 100px; color: #6b7280; white-space: nowrap; }
.col-class { font-weight: 600; color: #1f2937; white-space: nowrap; }
.col-cat { color: #0891b2; font-size: 11px; white-space: nowrap; }
.col-reasoning { color: #6b7280; max-width: 260px; font-size: 11px; line-height: 1.4; }

.empty {
  padding: 24px 16px;
  color: #9ca3af;
  font-size: 13px;
  text-align: center;
}
</style>
