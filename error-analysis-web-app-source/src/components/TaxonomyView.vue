<template>
  <div class="taxonomy-view">
    <div class="view-header">
      <h3>{{ yamlStore.fileName }}</h3>
      <span class="hint-muted">{{ totalClasses }} error class{{ totalClasses !== 1 ? 'es' : '' }} across {{ categoryCount }} categories</span>
    </div>

    <div v-for="(types, category) in yamlStore.data" :key="String(category)" class="category-section">
      <div class="category-header">
        <span class="category-name">{{ category }}</span>
        <a-tag color="blue" size="small">{{ Object.keys(types).length }}</a-tag>
      </div>
      <div class="class-grid">
        <div v-for="(description, name) in types" :key="String(name)" class="class-card">
          <div class="class-name">{{ name }}</div>
          <div class="class-desc">{{ description }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useYamlDataStore } from '../stores/yamlData'

const yamlStore = useYamlDataStore()

const categoryCount = computed(() =>
  yamlStore.data ? Object.keys(yamlStore.data).length : 0,
)

const totalClasses = computed(() =>
  yamlStore.data
    ? Object.values(yamlStore.data).reduce((sum, types) => sum + Object.keys(types).length, 0)
    : 0,
)
</script>

<style scoped>
.taxonomy-view {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.view-header h3 {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.hint-muted {
  font-size: 12px;
  color: #9ca3af;
}

.category-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.category-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 6px;
  border-bottom: 2px solid #e5e7eb;
}

.category-name {
  font-size: 14px;
  font-weight: 700;
  color: #1d4ed8;
}

.class-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 8px;
}

.class-card {
  border: 1px solid #e5e7eb;
  border-radius: 7px;
  padding: 10px 12px;
  background: #fff;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.class-name {
  font-size: 12px;
  font-weight: 700;
  color: #1f2937;
}

.class-desc {
  font-size: 11px;
  color: #6b7280;
  line-height: 1.5;
}
</style>
