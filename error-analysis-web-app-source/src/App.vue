<script setup lang="ts">
import YamlUploader from './components/YamlUploader.vue'
import JsonUploader from './components/JsonUploader.vue'
</script>

<template>
  <div id="app">
    <a-layout class="layout">
      <a-layout-sider class="sider" width="400">
        <div class="sider-content">
          <div class="header-section">
            <h1>Error Analysis Visualization</h1>
            <p>Upload your YAML file to get started with error analysis</p>
          </div>
          <YamlUploader />
        </div>
      </a-layout-sider>

      <a-layout-content class="main-content">
        <JsonUploader />
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
  padding: 24px;
  overflow-y: auto;
  height: 100vh;
}
</style>
