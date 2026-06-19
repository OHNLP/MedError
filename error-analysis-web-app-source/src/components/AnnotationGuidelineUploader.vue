<template>
  <div class="guideline-uploader">
    <a-card class="upload-card" size="small">
      <template #title>
        <span>Concept Extraction Guideline</span>
        <a-tag v-if="guidelineStore.data" color="green" size="small" style="margin-left: 8px; font-size: 10px">Loaded</a-tag>
        <a-tag v-else color="default" size="small" style="margin-left: 8px; font-size: 10px">Optional</a-tag>
      </template>

      <a-spin :spinning="guidelineStore.isLoading" tip="Parsing guideline...">
        <!-- Loaded state -->
        <div v-if="guidelineStore.data" class="loaded-state">
          <div class="loaded-row">
            <check-circle-outlined class="ok-icon" />
            <span class="file-name">{{ guidelineStore.fileName }}</span>
            <span class="kw-count">{{ keywordCount }} concept{{ keywordCount !== 1 ? 's' : '' }}</span>
            <a-button size="small" @click="guidelineStore.clearData()">Remove</a-button>
          </div>
        </div>

        <!-- Upload state -->
        <div v-else class="upload-area">
          <a-upload-dragger
            :before-upload="handleUpload"
            accept=".yaml,.yml,.csv"
            :show-upload-list="false"
            :multiple="false"
          >
            <p class="ant-upload-drag-icon" style="margin: 4px 0">
              <file-text-outlined style="font-size: 24px; color: #1890ff" />
            </p>
            <p class="ant-upload-text" style="font-size: 13px">Drop concept extraction guideline</p>
            <p class="ant-upload-hint" style="font-size: 11px">
              YAML: <code>keywords: &#123; concept: &#123; definition, examples &#125; &#125;</code><br/>
              CSV: columns <code>concept, definition, examples</code> (examples pipe-separated)
            </p>
          </a-upload-dragger>
          <div class="example-row">
            <a-tag color="blue" class="example-tag" @click="downloadGuidelineExample('yaml')">
              ↓ YAML example
            </a-tag>
            <a-tag color="cyan" class="example-tag" @click="downloadGuidelineExample('csv')">
              ↓ CSV example
            </a-tag>
          </div>
        </div>
      </a-spin>
    </a-card>

    <a-alert
      v-if="guidelineStore.error"
      :message="guidelineStore.error"
      type="error"
      show-icon
      closable
      @close="guidelineStore.clearData()"
      style="margin-top: 8px"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { CheckCircleOutlined, FileTextOutlined } from '@ant-design/icons-vue'
import { useAnnotationGuidelineStore } from '../stores/annotationGuideline'
import guidelineExampleRaw from '../data/annotationGuidelineExample.yaml?raw'

const guidelineStore = useAnnotationGuidelineStore()

const keywordCount = computed(() =>
  guidelineStore.data ? Object.keys(guidelineStore.data.keywords).length : 0,
)

const CSV_EXAMPLE = `concept,definition,examples
Delirium,"Clinical diagnosis or explicit mention of delirium","Patient developed acute delirium postoperatively|Delirium noted during hospital stay|Episode consistent with delirium"
AMS,"Altered mental status indicating change in cognition or awareness","Patient presents with AMS|Acute AMS observed overnight|Mental status altered from baseline"
Hallucination,"Perception without external stimulus","Patient reports visual hallucinations|Experiencing auditory hallucinations|Seeing things that are not there"
Confusion,"Impaired thinking or lack of clarity","Patient appears confused|Episodes of confusion noted|Increasing confusion over the past day"
Agitated,"Increased restlessness, irritability, or motor activity","Patient is agitated and pacing in the room|Episodes of agitation noted overnight|Patient shows aggression toward staff"
Inattention,"Difficulty maintaining or directing attention","Unable to focus on questions|Difficulty maintaining attention|Easily distracted during exam"
`

function downloadGuidelineExample(format: 'yaml' | 'csv' = 'yaml') {
  if (format === 'csv') {
    const blob = new Blob([CSV_EXAMPLE], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'annotation_guideline_example.csv'
    a.click()
    URL.revokeObjectURL(url)
  } else {
    const blob = new Blob([guidelineExampleRaw], { type: 'text/yaml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'annotation_guideline_example.yaml'
    a.click()
    URL.revokeObjectURL(url)
  }
}

async function handleUpload(file: File): Promise<boolean> {
  const ext = ('.' + file.name.split('.').pop()).toLowerCase()
  if (ext === '.yaml' || ext === '.yml') {
    try { await guidelineStore.parseYamlFile(file) } catch { /* error set in store */ }
  } else if (ext === '.csv') {
    try {
      await guidelineStore.parseCsvFile(file)
    } catch (e) {
      // parseCsvFile sets error.value itself; this catches unexpected throws
      if (!guidelineStore.error) {
        guidelineStore.error = `Unexpected error: ${e instanceof Error ? e.message : String(e)}`
      }
    }
  } else {
    guidelineStore.error = 'Please upload a .yaml, .yml, or .csv file'
  }
  return false
}
</script>

<style scoped>
.guideline-uploader {
  display: flex;
  flex-direction: column;
}

.upload-card {
  border-radius: 8px;
}

.loaded-state {
  padding: 2px 0;
}

.loaded-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.ok-icon {
  color: #52c41a;
  font-size: 14px;
}

.file-name {
  font-size: 12px;
  font-weight: 600;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.kw-count {
  font-size: 11px;
  color: #9ca3af;
}

.upload-area {
  padding: 4px 0;
}

.example-row {
  margin-top: 8px;
  text-align: center;
}

.example-tag {
  cursor: pointer;
  font-size: 11px;
  user-select: none;
}

.example-tag:hover {
  opacity: 0.8;
}

code {
  background: #f3f4f6;
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 10px;
}
</style>
