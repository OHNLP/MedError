<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import YamlUploader from './components/YamlUploader.vue'
import JsonUploader from './components/JsonUploader.vue'
import LlmConfig from './components/LlmConfig.vue'
import StudyConfig from './components/StudyConfig.vue'
import MultiSiteComparison from './components/MultiSiteComparison.vue'
import AnnotationGuidelineUploader from './components/AnnotationGuidelineUploader.vue'
import AnnotationGuidelineView from './components/AnnotationGuidelineView.vue'
import ErrorVisualization from './components/ErrorVisualization.vue'
import TaxonomyView from './components/TaxonomyView.vue'
import { useYamlDataStore } from './stores/yamlData'
import { useJsonDataStore } from './stores/jsonData'
import { useAnnotationGuidelineStore } from './stores/annotationGuideline'

const yamlStore = useYamlDataStore()
const jsonStore = useJsonDataStore()
const guidelineStore = useAnnotationGuidelineStore()
const yamlData = computed(() => yamlStore.data)
const hasAnalyzed = computed(() =>
  jsonStore.data?.tags.some(t => t.llm_analyzed) ?? false,
)

const activeTab = ref('analysis')

watch(yamlData, async (val) => {
  if (val) {
    await nextTick()
    activeTab.value = 'yaml'
  }
})
</script>

<template>
  <div id="app">
    <a-layout class="layout">
      <a-layout-sider class="sider" width="400">
        <div class="sider-content">
          <div class="header-section">
            <h1>MedError Interface</h1>
            <p>Configure study context, upload guidelines and taxonomy, then analyse predictions</p>
          </div>
          <StudyConfig />
          <AnnotationGuidelineUploader style="margin-top: 16px" />
          <YamlUploader style="margin-top: 16px" />
          <LlmConfig style="margin-top: 16px" />
        </div>
      </a-layout-sider>

      <a-layout-content class="main-content">
        <a-tabs v-model:activeKey="activeTab" class="main-tabs">
          <a-tab-pane v-if="guidelineStore.data" key="guideline" tab="Concept Extraction Guideline">
            <AnnotationGuidelineView />
          </a-tab-pane>
          <a-tab-pane v-if="yamlData" key="taxonomy" tab="Error Taxonomy">
            <TaxonomyView />
          </a-tab-pane>
          <a-tab-pane key="analysis" tab="Error Analysis">
            <JsonUploader />
          </a-tab-pane>
          <a-tab-pane v-if="hasAnalyzed" key="visualization" tab="Error Interpretation">
            <ErrorVisualization />
          </a-tab-pane>
          <a-tab-pane v-if="jsonStore.data" key="multisite" tab="Multi-Site Comparison">
            <MultiSiteComparison />
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
</style>
