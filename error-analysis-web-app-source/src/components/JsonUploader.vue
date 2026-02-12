<template>
  <div class="json-uploader">
    <a-spin :spinning="jsonStore.isLoading" tip="Parsing JSON file...">
      <!-- Success state when JSON is loaded -->
      <div v-if="jsonStore.data && !jsonStore.error" class="json-success">
        <a-card class="json-result-card">
          <a-result
            status="success"
            :title="jsonStore.fileName"
            sub-title="JSON file successfully loaded"
          >
            <template #extra>
              <a-button type="primary" @click="jsonStore.clearData()"> Upload New File </a-button>
            </template>
          </a-result>
        </a-card>

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
            <h2>Analysis Results</h2>
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
            <h2>Analysis Results</h2>
            <p>Drag and drop a JSON file here, or click to select</p>
            <input
              type="file"
              accept=".json"
              @change="handleFileSelect"
              class="file-input"
              ref="fileInputRef"
              id="json-file-input"
            />
            <a-button type="primary" size="large" @click="triggerFileInput" class="upload-button">
              Select JSON File
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
import { FileTextOutlined } from '@ant-design/icons-vue'
import { useJsonDataStore } from '../stores/jsonData'
import { useYamlDataStore } from '../stores/yamlData'
import AnalysisSummary from './AnalysisSummary.vue'
import DetailedAnalysis from './DetailedAnalysis.vue'

const jsonStore = useJsonDataStore()
const yamlStore = useYamlDataStore()
const isDragOver = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

const isYamlUploaded = computed(() => yamlStore.data !== null)

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
  if (files && files.length > 0) {
    const file = files[0]
    handleFileUpload(file)
  }
}

async function handleFileUpload(file: File) {
  // Validate file type
  const validExtensions = ['.json']
  const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()

  if (!validExtensions.includes(fileExtension)) {
    jsonStore.error = 'Please select a valid JSON file (.json)'
    return
  }

  try {
    await jsonStore.parseJsonFile(file)
  } catch (error) {
    console.error('Error processing JSON file:', error)
  }
}

function handleFileSelect(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files && input.files.length > 0) {
    handleFileUpload(input.files[0])
  }
}

function triggerFileInput() {
  fileInputRef.value?.click()
}

// Analysis functions (moved to individual components)
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
  margin: 0 0 24px 0;
  color: #8c8c8c;
}

.file-input {
  display: none;
}

.upload-button {
  cursor: pointer;
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
  gap: 24px;
}

.json-result-card {
  border-radius: 8px;
}

.json-result-card :deep(.ant-result) {
  padding: 16px 0;
}

.json-result-card :deep(.ant-result-title) {
  margin-bottom: 8px;
  font-size: 16px;
}

.json-result-card :deep(.ant-result-subtitle) {
  margin-bottom: 16px;
}

.error-alert {
  position: absolute;
  top: 24px;
  left: 24px;
  right: 24px;
  z-index: 10;
}
</style>
