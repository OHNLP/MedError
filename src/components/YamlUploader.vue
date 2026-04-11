<template>
  <div class="yaml-uploader">
    <a-spin :spinning="yamlStore.isLoading" tip="Parsing YAML file...">
      <div v-if="yamlStore.data" class="success-content">
        <check-circle-outlined class="success-icon" />
        <span class="success-name">{{ yamlStore.fileName }}</span>
        <a-button size="small" @click="yamlStore.clearData()">Replace</a-button>
      </div>

      <div v-else>
        <a-upload-dragger
          :before-upload="handleFileUpload"
          accept=".yaml,.yml"
          :show-upload-list="false"
          :multiple="false"
          class="compact-dragger"
        >
          <p class="ant-upload-drag-icon"><inbox-outlined /></p>
          <p class="ant-upload-text">Click or drag YAML file to upload as a taxonomy</p>
        </a-upload-dragger>
      </div>
    </a-spin>

    <a-alert
      v-if="yamlStore.error"
      :message="yamlStore.error"
      type="error"
      show-icon
      closable
      @close="yamlStore.clearData()"
    />

    <div v-if="yamlStore.data && !yamlStore.error" class="data-preview">
      <a-collapse v-model:activeKey="activeKeys" size="small">
        <a-collapse-panel
          v-for="(items, category) in yamlStore.data"
          :key="category"
          :header="`${category} (${Object.keys(items).length} items)`"
        >
          <a-tooltip
            v-for="[name, description] in Object.entries(items)"
            :key="name"
            :title="description"
          >
            <a-tag color="blue" class="item-tag">{{ name }}</a-tag>
          </a-tooltip>
        </a-collapse-panel>
      </a-collapse>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { InboxOutlined, CheckCircleOutlined } from '@ant-design/icons-vue'
import { useYamlDataStore } from '../stores/yamlData'

const yamlStore = useYamlDataStore()
const activeKeys = ref<string[]>([])

async function handleFileUpload(file: File): Promise<boolean> {
  const validExtensions = ['.yaml', '.yml']
  const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()

  if (!validExtensions.includes(fileExtension)) {
    yamlStore.error = 'Please select a valid YAML file (.yaml or .yml)'
    return false
  }

  try {
    await yamlStore.parseYamlFile(file)
    if (yamlStore.data) {
      activeKeys.value = Object.keys(yamlStore.data)
    }
  } catch (error) {
    console.error('Error processing file:', error)
  }

  return false
}
</script>

<style scoped>
.yaml-uploader {
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

.data-preview {
  margin-top: 6px;
}

.item-tag {
  margin: 3px 3px 3px 0;
}

:deep(.ant-collapse) {
  background: #fafafa;
  border-radius: 6px;
}

:deep(.ant-collapse-item:last-child) {
  border-bottom: none;
}

:deep(.ant-collapse-content-box) {
  padding: 8px 12px;
}
</style>
