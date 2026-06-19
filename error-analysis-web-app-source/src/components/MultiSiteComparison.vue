<template>
  <div class="multisite-root">
    <div class="multisite-header">
      <h3>Multi-Site Comparison</h3>
      <span class="hint-muted">Load exported MedError JSONs from other sites to compare error distributions</span>
    </div>

    <!-- Drop zone for additional sites -->
    <div
      class="site-drop-zone"
      :class="{ 'drag-over': isDragOver }"
      @dragover.prevent="isDragOver = true"
      @dragleave.prevent="isDragOver = false"
      @drop.prevent="onDrop"
    >
      <plus-outlined class="drop-icon" />
      <span>Drop a site export JSON here to add</span>
      <input type="file" accept=".json" class="hidden-input" ref="fileRef" @change="onFileChange" />
      <a-button size="small" @click="fileRef?.click()">Browse</a-button>
    </div>

    <!-- Site cards row -->
    <div v-if="sites.length > 0" class="sites-row">
      <div v-for="(site, i) in sites" :key="i" class="site-chip">
        <environment-outlined />
        <span class="site-name">{{ site.label }}</span>
        <span class="site-setting" v-if="site.study.clinicalSetting">· {{ site.study.clinicalSetting }}</span>
        <close-outlined class="remove-btn" @click="removeSite(i)" />
      </div>
    </div>

    <!-- Comparison table -->
    <div v-if="sites.length >= 1" class="comparison-section">
      <table class="comparison-table">
        <thead>
          <tr>
            <th class="col-error">Error Class</th>
            <th class="col-type">Type</th>
            <th v-for="site in sites" :key="site.label" class="col-site">
              {{ site.label }}
              <div class="site-sub">n={{ site.total }}</div>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in comparisonRows" :key="row.errorClass">
            <td class="col-error">{{ row.errorClass }}</td>
            <td class="col-type">
              <a-tag :color="row.fpColor" size="small">FP {{ row.fpTotals.join(' / ') }}</a-tag>
              <a-tag :color="row.fnColor" size="small" style="margin-left:2px">FN {{ row.fnTotals.join(' / ') }}</a-tag>
            </td>
            <td v-for="(site, si) in sites" :key="si" class="col-site-val">
              <div class="bar-cell">
                <div class="bar-wrap">
                  <div
                    class="bar bar-fp"
                    :style="{ width: barWidth(row.fp[si], site.total) }"
                    :title="`FP: ${row.fp[si]}`"
                  />
                  <div
                    class="bar bar-fn"
                    :style="{ width: barWidth(row.fn[si], site.total) }"
                    :title="`FN: ${row.fn[si]}`"
                  />
                </div>
                <span class="bar-label">{{ row.fp[si] + row.fn[si] }}</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else class="empty-hint">
      <info-circle-outlined /> Add at least one exported site JSON to start comparing.
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { PlusOutlined, CloseOutlined, EnvironmentOutlined, InfoCircleOutlined } from '@ant-design/icons-vue'
import type { AnnotationTag } from '../stores/jsonData'
import { useJsonDataStore } from '../stores/jsonData'
import { useStudyConfigStore } from '../stores/studyConfig'

interface SiteData {
  label: string
  study: { siteName?: string; clinicalSetting?: string; ehrSystem?: string }
  tags: AnnotationTag[]
  total: number
}

interface MedErrorExport {
  medError_version?: string
  study?: { siteName?: string; clinicalSetting?: string; ehrSystem?: string }
  tags?: AnnotationTag[]
}

const jsonStore = useJsonDataStore()
const studyStore = useStudyConfigStore()

const isDragOver = ref(false)
const fileRef = ref<HTMLInputElement | null>(null)
const extraSites = ref<SiteData[]>([])

// Current site always first
const currentSite = computed<SiteData | null>(() => {
  if (!jsonStore.data) return null
  const meta = studyStore.toMetadata()
  return {
    label: meta.siteName || jsonStore.fileName || 'Current Site',
    study: meta,
    tags: jsonStore.data.tags,
    total: jsonStore.data.tags.filter(t => t.error_class === 'FP' || t.error_class === 'FN').length,
  }
})

const sites = computed<SiteData[]>(() => {
  const base = currentSite.value ? [currentSite.value] : []
  return [...base, ...extraSites.value]
})

function parseExport(text: string, fileName: string): SiteData {
  const parsed = JSON.parse(text) as MedErrorExport
  const tags: AnnotationTag[] = parsed.tags ?? (Array.isArray(parsed) ? parsed as unknown as AnnotationTag[] : [])
  const study = parsed.study ?? {}
  const label = study.siteName || fileName.replace(/_mederror_export\.json$/, '').replace(/_/g, ' ') || 'Unknown Site'
  return {
    label,
    study,
    tags,
    total: tags.filter(t => t.error_class === 'FP' || t.error_class === 'FN').length,
  }
}

function addSiteFromText(text: string, name: string) {
  try {
    const site = parseExport(text, name)
    extraSites.value.push(site)
  } catch {
    alert(`Could not parse ${name} as a MedError export JSON.`)
  }
}

function onDrop(e: DragEvent) {
  isDragOver.value = false
  const file = e.dataTransfer?.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (ev) => addSiteFromText(ev.target?.result as string, file.name)
  reader.readAsText(file)
}

function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (ev) => addSiteFromText(ev.target?.result as string, file.name)
  reader.readAsText(file)
}

function removeSite(i: number) {
  // i=0 is current site (can't remove), extras start at i=1
  if (i === 0) return
  extraSites.value.splice(i - 1, 1)
}

// Collect all unique LLM_prediction values across all sites
const allErrorClasses = computed(() => {
  const classes = new Set<string>()
  for (const site of sites.value) {
    for (const tag of site.tags) {
      if ((tag.error_class === 'FP' || tag.error_class === 'FN') && tag.LLM_prediction) {
        classes.add(normalizeClass(tag.LLM_prediction))
      }
    }
  }
  return [...classes].sort()
})

function normalizeClass(raw: string) {
  // Strip numbering like "2.2.4. Negation" → "Negation"
  return raw.replace(/^\d+(\.\d+)*\.\s*/, '').trim()
}

interface ComparisonRow {
  errorClass: string
  fp: number[]
  fn: number[]
  fpTotals: number[]
  fnTotals: number[]
  fpColor: string
  fnColor: string
}

const comparisonRows = computed<ComparisonRow[]>(() => {
  return allErrorClasses.value.map(ec => {
    const fp: number[] = []
    const fn: number[] = []
    for (const site of sites.value) {
      const relevant = site.tags.filter(t =>
        (t.error_class === 'FP' || t.error_class === 'FN') && normalizeClass(t.LLM_prediction) === ec
      )
      fp.push(relevant.filter(t => t.error_class === 'FP').length)
      fn.push(relevant.filter(t => t.error_class === 'FN').length)
    }
    const fpTotal = fp.reduce((a, b) => a + b, 0)
    const fnTotal = fn.reduce((a, b) => a + b, 0)
    return {
      errorClass: ec,
      fp, fn,
      fpTotals: [fpTotal],
      fnTotals: [fnTotal],
      fpColor: fpTotal > 0 ? 'orange' : 'default',
      fnColor: fnTotal > 0 ? 'blue' : 'default',
    }
  }).filter(r => r.fp.some(v => v > 0) || r.fn.some(v => v > 0))
})

function barWidth(count: number, total: number): string {
  if (!total || !count) return '0%'
  return Math.round((count / total) * 100) + '%'
}
</script>

<style scoped>
.multisite-root {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.multisite-header h3 {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.hint-muted {
  font-size: 12px;
  color: #9ca3af;
}

.site-drop-zone {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border: 2px dashed #d9d9d9;
  border-radius: 8px;
  background: #fafafa;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 13px;
  color: #6b7280;
}

.site-drop-zone.drag-over {
  border-color: #1890ff;
  background: #e6f7ff;
  color: #1890ff;
}

.drop-icon {
  font-size: 18px;
  color: #1890ff;
}

.hidden-input {
  display: none;
}

.sites-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.site-chip {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  background: #f0f8ff;
  border: 1px solid #91caff;
  border-radius: 20px;
  font-size: 12px;
  color: #1d4ed8;
}

.site-name { font-weight: 600; }
.site-setting { color: #6b7280; }

.remove-btn {
  cursor: pointer;
  color: #9ca3af;
  font-size: 10px;
  margin-left: 2px;
}
.remove-btn:hover { color: #f5222d; }

.comparison-section {
  overflow-x: auto;
}

.comparison-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.comparison-table th {
  background: #f9fafb;
  padding: 8px 10px;
  text-align: left;
  border-bottom: 2px solid #e5e7eb;
  font-weight: 600;
  color: #374151;
  white-space: nowrap;
}

.comparison-table td {
  padding: 6px 10px;
  border-bottom: 1px solid #f3f4f6;
  vertical-align: middle;
}

.col-error { min-width: 140px; font-weight: 500; color: #1f2937; }
.col-type { min-width: 130px; }
.col-site { min-width: 120px; text-align: center; }
.col-site .site-sub { font-size: 10px; font-weight: 400; color: #9ca3af; }
.col-site-val { min-width: 120px; }

.bar-cell {
  display: flex;
  align-items: center;
  gap: 6px;
}

.bar-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.bar {
  height: 6px;
  border-radius: 3px;
  transition: width 0.3s;
  min-width: 2px;
}

.bar-fp { background: #fa8c16; }
.bar-fn { background: #1890ff; }

.bar-label {
  font-size: 11px;
  font-weight: 600;
  color: #374151;
  min-width: 18px;
  text-align: right;
}

.empty-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #9ca3af;
  padding: 16px;
  border: 1px dashed #e5e7eb;
  border-radius: 8px;
}
</style>
