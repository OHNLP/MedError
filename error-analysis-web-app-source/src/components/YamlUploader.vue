<template>
  <div class="yaml-uploader">
    <a-card class="upload-card">
      <a-spin :spinning="yamlStore.isLoading" tip="Parsing YAML file...">
        <div v-if="yamlStore.data" class="success-content">
          <a-result
            status="success"
            :title="yamlStore.fileName"
            sub-title="YAML file successfully loaded"
          >
            <template #extra>
              <a-button type="primary" @click="yamlStore.clearData()"> Upload New File </a-button>
            </template>
          </a-result>
        </div>

        <div v-else class="upload-content">
          <a-upload-dragger
            :before-upload="handleFileUpload"
            accept=".yaml,.yml"
            :show-upload-list="false"
            :multiple="false"
          >
            <p class="ant-upload-drag-icon">
              <inbox-outlined />
            </p>
            <p class="ant-upload-text">Click or drag YAML file to this area to upload</p>
            <p class="ant-upload-hint">Supported formats: .yaml, .yml</p>
          </a-upload-dragger>
        </div>
      </a-spin>
    </a-card>

    <a-alert
      v-if="yamlStore.error"
      :message="yamlStore.error"
      type="error"
      show-icon
      closable
      @close="yamlStore.clearData()"
      class="error-alert"
    />

    <!-- Display parsed data -->
    <a-card
      v-if="yamlStore.data && !yamlStore.error"
      title="Parsed Data Preview"
      class="data-preview"
    >
      <div class="data-structure">
        <a-collapse v-model:activeKey="activeKeys" size="small">
          <a-collapse-panel
            v-for="(items, category) in yamlStore.data"
            :key="category"
            :header="`${category} (${items.length} items)`"
          >
            <a-tag v-for="item in items" :key="item" color="blue" class="item-tag">
              {{ item }}
            </a-tag>
          </a-collapse-panel>
        </a-collapse>
      </div>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { InboxOutlined } from '@ant-design/icons-vue'
import { useYamlDataStore } from '../stores/yamlData'

const yamlStore = useYamlDataStore()
const activeKeys = ref<string[]>([])

async function handleFileUpload(file: File): Promise<boolean> {
  // Validate file type
  const validExtensions = ['.yaml', '.yml']
  const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()

  if (!validExtensions.includes(fileExtension)) {
    yamlStore.error = 'Please select a valid YAML file (.yaml or .yml)'
    return false
  }

  try {
    await yamlStore.parseYamlFile(file)
    // Expand all categories by default when data is loaded
    if (yamlStore.data) {
      activeKeys.value = Object.keys(yamlStore.data)
    }
  } catch (error) {
    console.error('Error processing file:', error)
  }

  return false // Prevent default upload behavior
}
</script>

<style scoped>
.yaml-uploader {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
}

.upload-card {
  border-radius: 8px;
}

.upload-content {
  padding: 16px 0;
}

.success-content {
  padding: 8px 0;
}

:deep(.ant-result) {
  padding: 16px 0;
}

:deep(.ant-result-title) {
  margin-bottom: 8px;
  font-size: 16px;
}

:deep(.ant-result-subtitle) {
  margin-bottom: 16px;
}

.error-alert {
  margin-top: 16px;
}

.data-preview {
  border-radius: 8px;
}

.data-structure {
  margin-top: 8px;
}

.item-tag {
  margin: 4px 4px 4px 0;
}

:deep(.ant-upload-drag) {
  border-radius: 8px;
}

:deep(.ant-collapse) {
  background: #fafafa;
  border-radius: 6px;
}

:deep(.ant-collapse-item) {
  border-bottom: 1px solid #e8e8e8;
}

:deep(.ant-collapse-item:last-child) {
  border-bottom: none;
}

:deep(.ant-collapse-content-box) {
  padding: 12px 16px;
}
</style>
