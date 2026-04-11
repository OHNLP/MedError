<template>
  <div class="display-yaml-uploader">
    <a-spin :spinning="displayYamlStore.isLoading" tip="Reading file...">
      <div v-if="displayYamlStore.rawContent" class="success-content">
        <check-circle-outlined class="success-icon" />
        <span class="success-name">{{ displayYamlStore.fileName }}</span>
        <a-button size="small" @click="displayYamlStore.clearData()">Replace</a-button>
      </div>

      <div v-else>
        <a-upload-dragger
          :before-upload="handleFileUpload"
          accept=".yaml,.yml"
          :show-upload-list="false"
          :multiple="false"
          class="compact-dragger"
        >
          <p class="ant-upload-drag-icon"><file-text-outlined /></p>
          <p class="ant-upload-text">Click or drag YAML file to display as a guideline</p>
        </a-upload-dragger>
      </div>
    </a-spin>

    <a-alert
      v-if="displayYamlStore.error"
      :message="displayYamlStore.error"
      type="error"
      show-icon
      closable
      @close="displayYamlStore.clearData()"
    />
  </div>
</template>

<script setup lang="ts">
import { FileTextOutlined, CheckCircleOutlined } from '@ant-design/icons-vue'
import { useDisplayYamlDataStore } from '../stores/displayYamlData'

const displayYamlStore = useDisplayYamlDataStore()

async function handleFileUpload(file: File): Promise<boolean> {
  const validExtensions = ['.yaml', '.yml']
  const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()

  if (!validExtensions.includes(fileExtension)) {
    displayYamlStore.error = 'Please select a valid YAML file (.yaml or .yml)'
    return false
  }

  try {
    await displayYamlStore.readYamlFile(file)
  } catch (error) {
    console.error('Error reading file:', error)
  }

  return false
}
</script>

<style scoped>
.display-yaml-uploader {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
}

.success-content {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background: #f6ffed;
  border: 1px solid #b7eb8f;
  border-radius: 6px;
}

.success-icon {
  color: #52c41a;
  font-size: 14px;
  flex-shrink: 0;
}

.success-name {
  flex: 1;
  font-size: 13px;
  color: #374151;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:deep(.compact-dragger.ant-upload-drag) {
  padding: 0;
  border-radius: 6px;
}

:deep(.compact-dragger .ant-upload-drag-container) {
  padding: 10px 8px;
}

:deep(.compact-dragger .ant-upload-drag-icon) {
  margin-bottom: 4px;
}

:deep(.compact-dragger .ant-upload-drag-icon .anticon) {
  font-size: 20px;
  color: #9ca3af;
}

:deep(.compact-dragger .ant-upload-text) {
  font-size: 12px;
  color: #6b7280;
  margin: 0;
}
</style>
