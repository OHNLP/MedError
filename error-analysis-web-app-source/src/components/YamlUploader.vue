<template>
  <div class="yaml-uploader">
    <a-card class="upload-card" size="small">
      <template #title>
        <span>Error Taxonomy</span>
        <a-tag v-if="yamlStore.data" color="blue" size="small" style="margin-left: 8px; font-size: 10px">
          {{ activePresetLabel || yamlStore.fileName }}
        </a-tag>
      </template>

      <a-spin :spinning="yamlStore.isLoading" tip="Parsing taxonomy...">

        <!-- Loaded state -->
        <div v-if="yamlStore.data" class="loaded-state">
          <div class="loaded-row">
            <check-circle-outlined class="ok-icon" />
            <span class="file-label">{{ activePresetLabel || yamlStore.fileName }}</span>
            <span class="count-hint">{{ categoryCount }} categories</span>
            <a-button size="small" @click="clearAll">Change</a-button>
          </div>

          <!-- Collapsed taxonomy preview -->
          <a-collapse v-model:activeKey="activeKeys" size="small" class="taxonomy-collapse">
            <a-collapse-panel
              v-for="(items, category) in yamlStore.data"
              :key="String(category)"
              :header="`${category} (${Object.keys(items).length})`"
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

        <!-- Upload / select state -->
        <div v-else class="select-state">
          <!-- Pre-built presets -->
          <div class="preset-section">
            <div class="preset-label">Use pre-built taxonomy</div>
            <div class="preset-buttons">
              <a-button
                v-for="preset in presets"
                :key="preset.id"
                size="small"
                class="preset-btn"
                @click="loadPreset(preset)"
              >
                <template #icon><database-outlined /></template>
                {{ preset.label }}
              </a-button>
            </div>
          </div>

          <a-divider style="margin: 10px 0; font-size: 11px; color: #9ca3af">or upload custom</a-divider>

          <!-- Custom upload -->
          <a-upload-dragger
            :before-upload="handleFileUpload"
            accept=".yaml,.yml"
            :show-upload-list="false"
            :multiple="false"
          >
            <p class="ant-upload-drag-icon" style="margin: 4px 0">
              <inbox-outlined style="font-size: 24px" />
            </p>
            <p class="ant-upload-text" style="font-size: 13px">Drop custom taxonomy YAML</p>
            <p class="ant-upload-hint" style="font-size: 11px">
              Format: <code>category: &#123; ErrorClass: description &#125;</code>
            </p>
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
      style="margin-top: 8px"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { InboxOutlined, CheckCircleOutlined, DatabaseOutlined } from '@ant-design/icons-vue'
import { useYamlDataStore } from '../stores/yamlData'
import { TAXONOMY_PRESETS } from '../data/taxonomyPresets'
import type { TaxonomyPreset } from '../data/taxonomyPresets'

const yamlStore = useYamlDataStore()
const activeKeys = ref<string[]>([])
const activePresetId = ref<string | null>(null)
const presets = TAXONOMY_PRESETS

const activePresetLabel = computed(() => {
  if (!activePresetId.value) return null
  return presets.find(p => p.id === activePresetId.value)?.label ?? null
})

const categoryCount = computed(() =>
  yamlStore.data ? Object.keys(yamlStore.data).length : 0,
)

function loadPreset(preset: TaxonomyPreset) {
  yamlStore.loadPreset(preset.data, `${preset.label} (built-in)`)
  activePresetId.value = preset.id
  activeKeys.value = Object.keys(preset.data)
}

function clearAll() {
  yamlStore.clearData()
  activePresetId.value = null
  activeKeys.value = []
}

async function handleFileUpload(file: File): Promise<boolean> {
  const ext = '.' + file.name.split('.').pop()?.toLowerCase()
  if (ext !== '.yaml' && ext !== '.yml') {
    yamlStore.error = 'Please select a valid YAML file (.yaml or .yml)'
    return false
  }
  try {
    await yamlStore.parseYamlFile(file)
    activePresetId.value = null
    if (yamlStore.data) activeKeys.value = Object.keys(yamlStore.data)
  } catch {
    // error set in store
  }
  return false
}
</script>

<style scoped>
.yaml-uploader {
  display: flex;
  flex-direction: column;
  gap: 0;
  width: 100%;
}

.upload-card {
  border-radius: 8px;
}

.loaded-state {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.loaded-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ok-icon {
  color: #52c41a;
  font-size: 14px;
  flex-shrink: 0;
}

.file-label {
  font-size: 12px;
  font-weight: 600;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.count-hint {
  font-size: 11px;
  color: #9ca3af;
  white-space: nowrap;
}

.taxonomy-collapse {
  font-size: 12px;
}

.item-tag {
  margin: 2px 2px 2px 0;
  font-size: 11px;
}

.select-state {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.preset-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.preset-label {
  font-size: 11px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.preset-buttons {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.preset-btn {
  text-align: left;
  justify-content: flex-start;
}

code {
  background: #f3f4f6;
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 10px;
}

:deep(.ant-collapse) {
  background: #fafafa;
  border-radius: 6px;
  font-size: 12px;
}

:deep(.ant-collapse-content-box) {
  padding: 8px 12px;
}
</style>
