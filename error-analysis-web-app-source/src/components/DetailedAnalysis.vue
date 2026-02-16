<template>
  <a-card title="Error Analysis Details" class="details-card">
    <template #extra>
      <a-dropdown>
        <a-button type="primary" size="middle">
          Export
          <DownOutlined />
        </a-button>
        <template #overlay>
          <a-menu @click="handleExport">
            <a-menu-item key="json">Export as JSON</a-menu-item>
            <a-menu-item key="csv">Export as CSV</a-menu-item>
          </a-menu>
        </template>
      </a-dropdown>
    </template>
    <a-tabs v-model:activeKey="activeTab">
      <a-tab-pane key="overview" tab="Overview">
        <div class="overview-content">
          <div class="judgement-section">
            <h4>Judgement Distribution</h4>
            <div class="judgement-stats">
              <a-tag
                v-for="(count, judgement) in getJudgementStats()"
                :key="judgement"
                :color="getJudgementColor(judgement)"
                class="stat-tag clickable-tag"
                @click="toggleJudgementDetails(judgement)"
              >
                {{ judgement }}: {{ count }}
              </a-tag>
            </div>

            <!-- Details List -->
            <div v-if="showDetails && selectedJudgement" class="details-section">
              <h5>
                {{ selectedJudgement }} Details ({{ getJudgementDetails(selectedJudgement).length }}
                items)
              </h5>
              <div class="details-list">
                <a-card
                  v-for="(item, index) in getJudgementDetails(selectedJudgement)"
                  :key="`${item.LLM_prediction}-${index}`"
                  size="small"
                  class="detail-item-card"
                >
                  <div class="detail-header">
                    <a-tag :color="getJudgementColor(item.LLM_prediction)" size="small">
                      {{ item.LLM_prediction }}
                    </a-tag>
                    <span class="item-index">#{{ index + 1 }}</span>
                  </div>
                  <div class="detail-content">
                    <div class="input-section">
                      <strong>Input:</strong>
                      <p class="input-text">{{ item.sentence || 'N/A' }}</p>
                    </div>
                    <div class="meta-info">
                      <div class="meta-row">
                        <div class="meta-item">
                          <strong>Predication Label:</strong>
                          {{ item.predication_label || 'N/A' }}
                        </div>
                        <div class="meta-item">
                          <strong>Gold Standard:</strong>
                          {{ item.gold_standard || 'N/A' }}
                        </div>
                      </div>
                      <div v-if="item.LLM_prediction">
                        <a-button
                          type="primary"
                          ghost
                          size="small"
                          class="llm-toggle-btn"
                          @click="toggleLlmSuggestions(item.uid)"
                        >
                          {{
                            expandedLlm.has(item.uid)
                              ? 'Hide LLM Suggestions'
                              : 'Show LLM Suggestions'
                          }}
                        </a-button>
                        <div v-if="expandedLlm.has(item.uid)" class="llm-suggestions">
                          <div class="llm-detail">
                            <strong>LLM Prediction:</strong> {{ item.LLM_prediction }}
                          </div>
                          <div class="llm-detail">
                            <strong>LLM Reasoning:</strong>
                            {{ item.LLM_reasoning || 'N/A' }}
                          </div>
                        </div>
                      </div>
                      <div class="meta-item" v-if="item.errors && item.errors.length > 0">
                        <strong>Errors:</strong>
                        <div class="error-list">
                          <div
                            v-for="(error, errIdx) in item.errors"
                            :key="errIdx"
                            class="error-item"
                          >
                            <a-select
                              :value="error.type"
                              size="small"
                              style="min-width: 180px"
                              @change="(val: string) => updateErrorType(item.uid, errIdx, val)"
                            >
                              <a-select-opt-group
                                v-for="group in groupedCategoryOptions"
                                :key="group.group"
                                :label="group.group"
                              >
                                <a-select-option
                                  v-for="opt in group.items"
                                  :key="opt.key"
                                  :value="opt.key"
                                >
                                  {{ opt.key }}
                                </a-select-option>
                              </a-select-opt-group>
                            </a-select>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </a-card>
              </div>
            </div>
          </div>
        </div>
      </a-tab-pane>

      <a-tab-pane key="errors" tab="Error Categories">
        <div class="error-analysis">
          <h4>Common Error Types</h4>
          <a-collapse v-model:activeKey="errorActiveKeys" size="small">
            <a-collapse-panel
              v-for="(errors, category) in getErrorStats()"
              :key="category"
              :header="`${category} (${getTotalErrorsInCategory(errors)} errors)`"
            >
              <div class="error-types">
                <a-tag v-for="(count, type) in errors" :key="type" color="red" class="error-tag">
                  {{ type }}: {{ count }}
                </a-tag>
              </div>
            </a-collapse-panel>
          </a-collapse>
        </div>
      </a-tab-pane>
    </a-tabs>
  </a-card>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { DownOutlined } from '@ant-design/icons-vue'
import { useYamlDataStore } from '../stores/yamlData'
import { useJsonDataStore } from '../stores/jsonData'

interface Tag {
  uid: number
  LLM_prediction: string
  gold_standard: string
  predication_label: string
  sentence?: string
  LLM_reasoning?: string
  errors?: Array<{
    category: string
    type: string
  }>
}

interface JsonData {
  tags?: Tag[]
}

interface Props {
  jsonData: JsonData | null
}

const props = defineProps<Props>()

const yamlStore = useYamlDataStore()
const jsonStore = useJsonDataStore()

const groupedCategoryOptions = computed(() => {
  if (!yamlStore.data) return []
  return Object.entries(yamlStore.data).map(([group, subcategories]) => ({
    group,
    items: Object.entries(subcategories).map(([key, description]) => ({ key, description })),
  }))
})

function updateErrorType(uid: number, errIdx: number, newType: string) {
  const tag = jsonStore.data?.tags.find((t) => t.uid === uid)
  if (tag?.errors?.[errIdx]) {
    tag.errors[errIdx].type = newType
    // Also update the parent category
    const parentGroup = groupedCategoryOptions.value.find((g) =>
      g.items.some((item) => item.key === newType),
    )
    if (parentGroup) {
      tag.errors[errIdx].category = parentGroup.group
    }
  }
}

const activeTab = ref('overview')
const errorActiveKeys = ref<string[]>([])
const showDetails = ref(false)
const selectedJudgement = ref('')
const expandedLlm = ref<Set<number>>(new Set())

function toggleLlmSuggestions(uid: number) {
  const next = new Set(expandedLlm.value)
  if (next.has(uid)) {
    next.delete(uid)
  } else {
    next.add(uid)
  }
  expandedLlm.value = next
}

// Analysis functions
function getJudgementStats(): Record<string, number> {
  const stats: Record<string, number> = {}
  props.jsonData?.tags?.forEach((tag) => {
    stats[tag.LLM_prediction] = (stats[tag.LLM_prediction] || 0) + 1
  })
  return stats
}

function getErrorStats(): Record<string, Record<string, number>> {
  const stats: Record<string, Record<string, number>> = {}
  props.jsonData?.tags?.forEach((tag) => {
    tag.errors?.forEach((error) => {
      if (!stats[error.category]) {
        stats[error.category] = {}
      }
      stats[error.category][error.type] = (stats[error.category][error.type] || 0) + 1
    })
  })
  return stats
}

function getTotalErrorsInCategory(errors: Record<string, number>): number {
  return Object.values(errors).reduce((sum, count) => sum + count, 0)
}

function getJudgementColor(judgement: string): string {
  const colors: Record<string, string> = {
    FP: 'red',
    FN: 'orange',
    TP: 'green',
    TN: 'blue',
    P: 'purple',
  }
  return colors[judgement] || 'default'
}

function toggleJudgementDetails(judgement: string) {
  if (selectedJudgement.value === judgement && showDetails.value) {
    // If clicking the same judgement and details are shown, hide them
    showDetails.value = false
    selectedJudgement.value = ''
  } else {
    // Show details for the clicked judgement
    selectedJudgement.value = judgement
    showDetails.value = true
  }
}

function getJudgementDetails(judgement: string): Tag[] {
  return props.jsonData?.tags?.filter((tag) => tag.LLM_prediction === judgement) || []
}

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
    // CSV
    const headers = ['uid', 'sentence', 'gold_standard', 'predication_label', 'LLM_prediction', 'LLM_reasoning', 'errors']
    const rows = tags.map((tag) => [
      tag.uid,
      `"${(tag.sentence ?? '').replace(/"/g, '""')}"`,
      `"${tag.gold_standard ?? ''}"`,
      `"${tag.predication_label ?? ''}"`,
      `"${tag.LLM_prediction ?? ''}"`,
      `"${(tag.LLM_reasoning ?? '').replace(/"/g, '""')}"`,
      `"${(tag.errors ?? []).map((e) => `${e.category}: ${e.type}`).join('; ')}"`,
    ])
    content = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    mimeType = 'text/csv'
    extension = 'csv'
  }

  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const baseName = jsonStore.fileName?.replace(/\.[^.]+$/, '') || 'export'
  a.download = `${baseName}_updated.${extension}`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<style scoped>
.details-card {
  border-radius: 8px;
}

.overview-content h4 {
  margin: 0 0 12px 0;
  color: #1f2937;
  font-weight: 600;
}

.judgement-section {
  width: 100%;
}

.judgement-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.stat-tag {
  margin: 0;
  font-size: 13px;
  padding: 4px 8px;
}

.clickable-tag {
  cursor: pointer;
  transition: all 0.2s ease;
}

.clickable-tag:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.error-analysis h4 {
  margin: 0 0 16px 0;
  color: #1f2937;
  font-weight: 600;
}

.error-types {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.error-tag {
  margin: 0;
  font-size: 12px;
  padding: 2px 6px;
}

:deep(.ant-tabs-tab) {
  font-weight: 500;
}

:deep(.ant-collapse-header) {
  font-weight: 500;
}

/* Details Section Styles */
.details-section {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #e8e8e8;
}

.details-section h5 {
  margin: 0 0 16px 0;
  color: #1f2937;
  font-weight: 600;
  font-size: 14px;
}

.details-list {
  max-height: 70vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}

.detail-item-card {
  margin-bottom: 0;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.item-index {
  font-size: 12px;
  color: #6b7280;
  font-weight: 500;
}

.detail-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.input-section {
  background: #f8fafc;
  padding: 12px;
  border-radius: 6px;
  border-left: 3px solid #3b82f6;
}

.input-text {
  margin: 8px 0 0 0;
  line-height: 1.5;
  color: #374151;
  font-style: italic;
}

.meta-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.meta-row {
  display: flex;
  gap: 24px;
}

.meta-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.meta-item strong {
  min-width: 80px;
  color: #4b5563;
  font-size: 13px;
}

.error-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.error-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.error-type {
  font-size: 13px;
  color: #6b7280;
}

.llm-toggle-btn {
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.llm-suggestions {
  margin-top: 4px;
  padding: 0 0 0 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.llm-detail {
  font-size: 13px;
  color: #374151;
  line-height: 1.5;
}

.llm-detail strong {
  color: #4b5563;
}
</style>
