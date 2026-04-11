<script setup lang="ts">
import { ref, computed } from 'vue'
import YamlUploader from './components/YamlUploader.vue'
import JsonUploader from './components/JsonUploader.vue'
import DisplayYamlUploader from './components/DisplayYamlUploader.vue'
import { useDisplayYamlDataStore } from './stores/displayYamlData'

const displayYamlStore = useDisplayYamlDataStore()
const displayYamlRawContent = computed(() => displayYamlStore.rawContent)
const displayYamlFileName = computed(() => displayYamlStore.fileName)

const activeTab = ref('analysis')
</script>

<template>
  <div id="app">
    <a-layout class="layout">
      <a-layout-sider class="sider" width="400">
        <div class="sider-content">
          <div class="header-section">
            <h1>MedError Interface</h1>
            <p>Upload your YAML file to get started with error analysis</p>
          </div>
          <a-card class="uploaders-card">
            <div class="uploaders-group">
              <DisplayYamlUploader />
              <div class="uploaders-divider" />
              <YamlUploader />
            </div>
          </a-card>
        </div>
      </a-layout-sider>

      <a-layout-content class="main-content">
        <a-tabs v-model:activeKey="activeTab" class="main-tabs">
          <a-tab-pane key="analysis" tab="Analysis Results">
            <JsonUploader />
          </a-tab-pane>
          <a-tab-pane v-if="displayYamlRawContent" key="displayYaml" :tab="displayYamlFileName">
            <pre class="yaml-raw-content">{{ displayYamlRawContent }}</pre>
          </a-tab-pane>
        </a-tabs>
      </a-layout-content>
    </a-layout>
  </div>
</template>

<style>
/* Global overrides */
body {
  margin: 0 !important;
  padding: 0 !important;
  min-height: 100vh !important;
  height: 100vh !important;
  display: block !important;
  place-items: unset !important;
}

#app {
  height: 100vh !important;
  width: 100vw !important;
  background: #f5f5f5 !important;
  max-width: none !important;
  margin: 0 !important;
  padding: 0 !important;
  display: block !important;
  grid-template-columns: none !important;
}
</style>

<style scoped>
.layout {
  height: 100vh;
  background: #f5f5f5;
}

.sider {
  background: #ffffff;
  border-right: 1px solid #e8e8e8;
  overflow-y: auto;
}

.sider-content {
  padding: 24px;
  height: 100%;
}

.header-section {
  margin-bottom: 24px;
}

.header-section h1 {
  font-size: 1.5rem;
  margin: 0 0 8px 0;
  color: #1f2937;
  font-weight: 600;
}

.header-section p {
  font-size: 0.9rem;
  margin: 0;
  color: #6b7280;
  line-height: 1.4;
}

.main-content {
  background: #ffffff;
  overflow-y: auto;
  height: 100vh;
}

.main-tabs {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.main-tabs :deep(.ant-tabs-nav) {
  padding: 0 24px;
  margin-bottom: 0;
}

.main-tabs :deep(.ant-tabs-content-holder) {
  flex: 1;
  overflow-y: auto;
}

.main-tabs :deep(.ant-tabs-content) {
  height: 100%;
}

.main-tabs :deep(.ant-tabs-tabpane) {
  height: 100%;
  padding: 24px;
  box-sizing: border-box;
  overflow-y: auto;
}

.yaml-raw-content {
  margin: 0;
  font-family: monospace;
  font-size: 13px;
  white-space: pre;
  overflow-x: auto;
}

.uploaders-card {
  border-radius: 8px;
}

.uploaders-card :deep(.ant-card-body) {
  padding: 12px;
}

.uploaders-group {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.uploaders-divider {
  height: 1px;
  background: #e8e8e8;
  margin: 10px 0;
}
</style>
