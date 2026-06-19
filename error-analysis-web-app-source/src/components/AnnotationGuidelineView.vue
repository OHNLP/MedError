<template>
  <div class="guideline-view">
    <div class="view-header">
      <h3>Annotation Guideline — {{ guidelineStore.fileName }}</h3>
      <span class="hint-muted">{{ keywordCount }} clinical concept{{ keywordCount !== 1 ? 's' : '' }} defined</span>
    </div>

    <div class="concepts-grid">
      <div
        v-for="(kw, name) in guidelineStore.data?.keywords"
        :key="name"
        class="concept-card"
      >
        <div class="concept-header">
          <tag-outlined class="concept-icon" />
          <span class="concept-name">{{ name }}</span>
        </div>
        <p class="concept-def">{{ kw.definition }}</p>
        <div v-if="kw.examples?.length" class="examples">
          <span class="examples-label">Examples</span>
          <ul class="examples-list">
            <li v-for="(ex, i) in kw.examples" :key="i" class="example-item">
              "{{ ex }}"
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { TagOutlined } from '@ant-design/icons-vue'
import { useAnnotationGuidelineStore } from '../stores/annotationGuideline'

const guidelineStore = useAnnotationGuidelineStore()
const keywordCount = computed(() =>
  guidelineStore.data ? Object.keys(guidelineStore.data.keywords).length : 0,
)
</script>

<style scoped>
.guideline-view {
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

.concepts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
}

.concept-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 14px;
  background: #fff;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.concept-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.concept-icon {
  color: #1890ff;
  font-size: 14px;
}

.concept-name {
  font-weight: 600;
  font-size: 14px;
  color: #1f2937;
}

.concept-def {
  margin: 0;
  font-size: 12px;
  color: #4b5563;
  line-height: 1.5;
}

.examples-label {
  font-size: 11px;
  font-weight: 600;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.examples-list {
  margin: 4px 0 0 0;
  padding-left: 16px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.example-item {
  font-size: 11px;
  color: #6b7280;
  font-style: italic;
  line-height: 1.4;
}
</style>
