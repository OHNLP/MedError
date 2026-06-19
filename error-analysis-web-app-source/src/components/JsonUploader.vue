<template>
  <div class="json-uploader">
    <a-spin :spinning="jsonStore.isLoading" tip="Parsing JSON file...">
      <!-- Success state when JSON is loaded -->
      <div v-if="jsonStore.data && !jsonStore.error" class="json-success">
        <div class="json-result-card">
          <check-circle-outlined class="success-icon" />
          <span class="file-name">{{ jsonStore.fileName }}</span>
          <span class="file-subtitle">
            {{ jsonStore.isRawFormat ? 'Raw predictions loaded' : 'JSON file successfully loaded' }}
          </span>
          <a-button size="small" @click="exportResults">Export JSON</a-button>
          <a-button size="small" type="primary" @click="jsonStore.clearData()">Upload New File</a-button>
        </div>

        <!-- LLM Analysis Banner — always shown when FP/FN items exist -->
        <div v-if="fpFnCount > 0" class="llm-banner">
          <div class="llm-banner-left">
            <bulb-outlined class="llm-icon" />
            <div class="llm-banner-text">
              <template v-if="jsonStore.unanalyzedCount > 0">
                <strong>{{ jsonStore.unanalyzedCount }} of {{ fpFnCount }} item{{ fpFnCount !== 1 ? 's' : '' }} need LLM analysis</strong>
                <span v-if="!hasApiKey" class="llm-subtext">Configure the LLM provider in the sidebar to enable</span>
                <span v-else class="llm-subtext">Click to classify error types automatically</span>
              </template>
              <template v-else>
                <strong>{{ fpFnCount }} item{{ fpFnCount !== 1 ? 's' : '' }} already analysed</strong>
                <span class="llm-subtext">Re-run to reclassify with a different model or prompt</span>
              </template>
            </div>
          </div>
          <div class="llm-banner-right" style="display:flex; gap:6px; flex-shrink:0">
            <template v-if="!llmStore.isProcessing">
              <a-button
                v-if="jsonStore.unanalyzedCount > 0"
                type="primary"
                :disabled="!hasApiKey"
                @click="runLlmAnalysis(false)"
              >
                Run LLM Analysis
              </a-button>
              <a-button
                :disabled="!hasApiKey"
                @click="runLlmAnalysis(true)"
              >
                {{ jsonStore.unanalyzedCount > 0 ? 'Re-run All' : 'Re-run Analysis' }}
              </a-button>
            </template>
            <a-button v-else danger @click="stopAnalysis">Stop</a-button>
          </div>
        </div>

        <!-- Progress bar (while processing) -->
        <div v-if="llmStore.isProcessing" class="llm-progress">
          <a-progress
            :percent="progressPercent"
            status="active"
            :stroke-color="{ from: '#1890ff', to: '#52c41a' }"
          />
          <div class="progress-detail">
            <span>Analysing item {{ llmStore.progress }} / {{ llmStore.total }}</span>
            <span v-if="llmStore.currentError" class="progress-error">
              <alert-outlined /> {{ llmStore.currentError }}
            </span>
          </div>
        </div>

        <!-- Analysis Summary -->
        <AnalysisSummary :json-data="jsonStore.data" />

        <!-- Detailed Analysis -->
        <DetailedAnalysis :json-data="jsonStore.data" />
      </div>

      <!-- Upload state -->
      <div v-else class="upload-state">
        <!-- Show if YAML is not uploaded -->
        <div v-if="!isYamlUploaded" class="disabled-state">
          <div class="upload-content">
            <div class="upload-icon disabled">
              <file-text-outlined />
            </div>
            <h2>Upload Errors</h2>
            <p>Please upload a YAML file first before uploading JSON analysis results</p>
            <a-button disabled size="large" class="upload-button"> Select JSON File </a-button>
          </div>
        </div>

        <!-- Show if YAML is uploaded -->
        <div
          v-else
          class="drop-zone"
          :class="{ 'drag-over': isDragOver }"
          @dragover="handleDragOver"
          @dragleave="handleDragLeave"
          @drop="handleDrop"
        >
          <div class="upload-content">
            <div class="upload-icon">
              <file-text-outlined />
            </div>
            <h2>Upload Errors</h2>
            <p>Drag and drop a JSON or CSV file here, or click to select</p>
            <p class="format-hint">
              JSON: <code>{ "tags": [{ "uid", "sentence", "gold_standard", "original_prediction", "model_type", "error_class" }] }</code><br/>
              CSV: same column names as headers
            </p>
            <div class="example-download-row">
              <a-tag
                color="blue"
                class="example-tag"
                @click="downloadExample"
                title="Download a sample input file with 26 annotated examples"
              >
                ↓ Download example input
              </a-tag>
            </div>
            <input
              type="file"
              accept=".json,.csv"
              @change="handleFileSelect"
              class="file-input"
              ref="fileInputRef"
              id="json-file-input"
            />
            <a-button type="primary" size="large" @click="triggerFileInput" class="upload-button">
              Select JSON or CSV File
            </a-button>
          </div>
        </div>
      </div>
    </a-spin>

    <!-- Error Alert -->
    <a-alert
      v-if="jsonStore.error"
      :message="jsonStore.error"
      type="error"
      show-icon
      closable
      @close="jsonStore.clearData()"
      class="error-alert"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  FileTextOutlined,
  CheckCircleOutlined,
  BulbOutlined,
  AlertOutlined,
} from '@ant-design/icons-vue'
import exampleCsvRaw from '../data/errorInputExamples.csv?raw'
import { useJsonDataStore } from '../stores/jsonData'
import { useYamlDataStore } from '../stores/yamlData'
import { useLlmConfigStore } from '../stores/llmConfig'
import { useStudyConfigStore } from '../stores/studyConfig'
import { useAnnotationGuidelineStore } from '../stores/annotationGuideline'
import { buildSystemPrompt, callLlm, matchToYamlTaxonomy } from '../services/llmService'
import AnalysisSummary from './AnalysisSummary.vue'
import DetailedAnalysis from './DetailedAnalysis.vue'

const jsonStore = useJsonDataStore()
const yamlStore = useYamlDataStore()
const llmStore = useLlmConfigStore()
const studyStore = useStudyConfigStore()
const guidelineStore = useAnnotationGuidelineStore()
const isDragOver = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)
const shouldStop = ref(false)
const hasEverRun = ref(false)

const isYamlUploaded = computed(() => yamlStore.data !== null)
const hasApiKey = computed(() => {
  if (llmStore.provider === 'azure') return !!(llmStore.azureEndpoint && llmStore.azureDeployment && llmStore.azureApiKey)
  if (llmStore.provider === 'ollama') return !!llmStore.ollamaBaseUrl
  return false
})

const progressPercent = computed(() => {
  if (!llmStore.total) return 0
  return Math.round((llmStore.progress / llmStore.total) * 100)
})

const fpFnCount = computed(() => {
  if (!jsonStore.data) return 0
  return jsonStore.data.tags.filter(t => t.error_class === 'FP' || t.error_class === 'FN').length
})

function handleDragOver(e: DragEvent) {
  e.preventDefault()
  isDragOver.value = true
}

function handleDragLeave(e: DragEvent) {
  e.preventDefault()
  isDragOver.value = false
}

function handleDrop(e: DragEvent) {
  e.preventDefault()
  isDragOver.value = false
  const files = e.dataTransfer?.files
  if (files && files.length > 0) handleFileUpload(files[0])
}

async function handleFileUpload(file: File) {
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (ext === 'json') {
    try {
      await jsonStore.parseJsonFile(file)
      hasEverRun.value = false
    } catch (err) {
      console.error('Error processing JSON file:', err)
    }
  } else if (ext === 'csv') {
    try {
      await jsonStore.parseCsvFile(file)
      hasEverRun.value = false
    } catch (err) {
      console.error('Error processing CSV file:', err)
    }
  } else {
    jsonStore.error = 'Please select a JSON (.json) or CSV (.csv) file'
  }
}

function handleFileSelect(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files && input.files.length > 0) handleFileUpload(input.files[0])
}

function triggerFileInput() {
  fileInputRef.value?.click()
}

function downloadExample() {
  const blob = new Blob([exampleCsvRaw], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'error_input_examples.csv'
  a.click()
  URL.revokeObjectURL(url)
}

function stopAnalysis() {
  shouldStop.value = true
}

function exportResults() {
  if (!jsonStore.data) return
  const payload = {
    medError_version: '1.0',
    exportedAt: new Date().toISOString(),
    study: studyStore.toMetadata(),
    tags: jsonStore.data.tags,
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const baseName = jsonStore.fileName.replace(/\.[^.]+$/, '')
  const site = studyStore.siteName ? `_${studyStore.siteName.replace(/\s+/g, '-')}` : ''
  a.href = url
  a.download = `${baseName}${site}_mederror_export.json`
  a.click()
  URL.revokeObjectURL(url)
}

async function runLlmAnalysis(force = false) {
  if (!jsonStore.data) return

  const tagsToAnalyse = jsonStore.data.tags.filter(
    (t) => (t.error_class === 'FP' || t.error_class === 'FN') && (force || !t.llm_analyzed),
  )
  if (!tagsToAnalyse.length) return

  const systemPrompt = buildSystemPrompt(yamlStore.data, guidelineStore.data)

  llmStore.isProcessing = true
  llmStore.progress = 0
  llmStore.total = tagsToAnalyse.length
  llmStore.currentError = ''
  shouldStop.value = false
  hasEverRun.value = true

  for (const tag of tagsToAnalyse) {
    if (shouldStop.value) break

    try {
      const result = await callLlm(
        {
          provider: llmStore.provider,
          azureEndpoint: llmStore.azureEndpoint,
          azureDeployment: llmStore.azureDeployment,
          azureApiKey: llmStore.azureApiKey,
          azureApiVersion: llmStore.azureApiVersion,
          ollamaBaseUrl: llmStore.ollamaBaseUrl,
          ollamaModel: llmStore.ollamaModel,
        },
        systemPrompt,
        tag.sentence,
        tag.original_prediction,
        tag.error_class.toLowerCase(),
      )

      const matched = matchToYamlTaxonomy(result.errorClass, yamlStore.data)
      jsonStore.updateTagLlm(tag.uid, result.errorClass, result.reasoning, [matched])
      llmStore.currentError = ''
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      llmStore.currentError = `Item #${tag.uid}: ${msg}`
      // Rate limit: back off briefly then continue
      if (msg.includes('429') || msg.toLowerCase().includes('rate limit')) {
        await new Promise((r) => setTimeout(r, 5000))
      }
    }

    llmStore.progress++
  }

  llmStore.isProcessing = false
}
</script>

<style scoped>
.json-uploader {
  height: 100%;
  position: relative;
}

.upload-state {
  height: 100%;
}

.drop-zone {
  height: calc(100vh - 48px);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px dashed #d9d9d9;
  border-radius: 12px;
  background: #fafafa;
  transition: all 0.3s ease;
  cursor: pointer;
}

.drop-zone:hover {
  border-color: #1890ff;
  background: #f0f8ff;
}

.drop-zone.drag-over {
  border-color: #1890ff;
  background: #e6f7ff;
  transform: scale(1.02);
}

.upload-content {
  text-align: center;
  color: #8c8c8c;
}

.upload-icon {
  font-size: 48px;
  color: #1890ff;
  margin-bottom: 16px;
}

.upload-content h2 {
  font-size: 1.5rem;
  margin: 0 0 12px 0;
  color: #595959;
}

.upload-content p {
  font-size: 1rem;
  margin: 0 0 16px 0;
  color: #8c8c8c;
}

.format-hint {
  font-size: 0.8rem !important;
  color: #aaa !important;
  margin-bottom: 24px !important;
}

.format-hint code {
  background: #f0f0f0;
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 0.75rem;
}

.file-input {
  display: none;
}

.upload-button {
  cursor: pointer;
}

.example-download-row {
  margin-bottom: 20px;
}

.example-tag {
  cursor: pointer;
  font-size: 12px;
  user-select: none;
}

.example-tag:hover {
  opacity: 0.8;
}

.disabled-state {
  height: calc(100vh - 48px);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px dashed #d9d9d9;
  border-radius: 12px;
  background: #f9f9f9;
  opacity: 0.6;
}

.disabled-state .upload-content {
  text-align: center;
  color: #8c8c8c;
}

.disabled-state .upload-icon.disabled {
  font-size: 48px;
  color: #d9d9d9;
  margin-bottom: 16px;
}

.disabled-state h2 {
  font-size: 1.5rem;
  margin: 0 0 12px 0;
  color: #bfbfbf;
}

.disabled-state p {
  font-size: 1rem;
  margin: 0 0 24px 0;
  color: #8c8c8c;
}

.json-success {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.json-result-card {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border: 1px solid #b7eb8f;
  background: #f6ffed;
  border-radius: 6px;
}

.json-result-card .success-icon {
  color: #52c41a;
  font-size: 16px;
}

.json-result-card .file-name {
  font-weight: 600;
}

.json-result-card .file-subtitle {
  color: #888;
  flex: 1;
}

/* LLM Banner */
.llm-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border: 1px solid #91caff;
  background: #e6f4ff;
  border-radius: 8px;
  gap: 16px;
}

.llm-banner-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.llm-icon {
  font-size: 24px;
  color: #1890ff;
  flex-shrink: 0;
}

.llm-banner-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.llm-banner-text strong {
  font-size: 14px;
  color: #1d4ed8;
}

.llm-subtext {
  font-size: 12px;
  color: #4b5563;
}

.llm-banner-right {
  flex-shrink: 0;
}

/* Progress */
.llm-progress {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.progress-detail {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #6b7280;
}

.progress-error {
  color: #f5222d;
  display: flex;
  align-items: center;
  gap: 4px;
}

/* All done */
.all-done-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: #f6ffed;
  border: 1px solid #b7eb8f;
  border-radius: 8px;
  font-size: 13px;
  color: #389e0d;
}

.done-icon {
  color: #52c41a;
  font-size: 16px;
}

.error-alert {
  position: absolute;
  top: 24px;
  left: 24px;
  right: 24px;
  z-index: 10;
}
</style>
