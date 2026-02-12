<template>
  <a-card title="Error Analysis Details" class="details-card">
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
                  :key="`${item._judgement}-${index}`"
                  size="small"
                  class="detail-item-card"
                >
                  <div class="detail-header">
                    <a-tag :color="getJudgementColor(item._judgement)" size="small">
                      {{ item._judgement }}
                    </a-tag>
                    <span class="item-index">#{{ index + 1 }}</span>
                  </div>
                  <div class="detail-content">
                    <div class="sentence-section">
                      <strong>Sentence:</strong>
                      <p class="sentence-text">{{ item.sentence || 'N/A' }}</p>
                    </div>
                    <div class="meta-info">
                      <div class="meta-item">
                        <strong>Annotator:</strong> {{ item._annotator || 'N/A' }}
                      </div>
                      <div class="meta-item" v-if="item.errors && item.errors.length > 0">
                        <strong>Errors:</strong>
                        <div class="error-list">
                          <div
                            v-for="error in item.errors"
                            :key="`${error.category}-${error.type}`"
                            class="error-item"
                          >
                            <a-tag color="red" size="small">{{ error.category }}</a-tag>
                            <span class="error-type">{{ error.type }}</span>
                          </div>
                        </div>
                      </div>
                      <div class="meta-item">
                        <strong>LLM reasoning:</strong> {{ item.comment || 'N/A' }}
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
import { ref } from 'vue'

interface Tag {
  _judgement: string
  tag: string
  sentence?: string
  _annotator?: string
  comment?: string
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

const activeTab = ref('overview')
const errorActiveKeys = ref<string[]>([])
const showDetails = ref(false)
const selectedJudgement = ref('')

// Analysis functions
function getJudgementStats(): Record<string, number> {
  const stats: Record<string, number> = {}
  props.jsonData?.tags?.forEach((tag) => {
    stats[tag._judgement] = (stats[tag._judgement] || 0) + 1
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
  return props.jsonData?.tags?.filter((tag) => tag._judgement === judgement) || []
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
  max-height: 400px;
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

.sentence-section {
  background: #f8fafc;
  padding: 12px;
  border-radius: 6px;
  border-left: 3px solid #3b82f6;
}

.sentence-text {
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
</style>
