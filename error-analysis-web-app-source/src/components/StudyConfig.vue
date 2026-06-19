<template>
  <a-card class="study-config-card" size="small">
    <template #title>
      <span>Study Context</span>
      <a-tag v-if="isConfigured" color="green" size="small" style="margin-left: 8px; font-size: 10px">Configured</a-tag>
      <a-tag v-else color="default" size="small" style="margin-left: 8px; font-size: 10px">Optional</a-tag>
    </template>

    <div class="config-form">
      <a-alert
        message="Fill in study context to support federated analysis and reproducibility."
        type="info"
        show-icon
        :banner="false"
        class="info-notice"
      />

      <div class="field">
        <label class="field-label">Site / Institution</label>
        <a-input
          v-model:value="studyStore.siteName"
          placeholder="e.g. Mayo Clinic, UTHealth"
          size="small"
          allow-clear
        />
      </div>

      <div class="field">
        <label class="field-label">Clinical Setting</label>
        <a-input
          v-model:value="studyStore.clinicalSetting"
          placeholder="e.g. ICU, ED, Inpatient, Outpatient"
          size="small"
          allow-clear
        />
      </div>

      <div class="field">
        <label class="field-label">Concept Extraction Task</label>
        <a-input
          v-model:value="studyStore.conceptExtractionTask"
          placeholder="e.g. Cognitive Status, Functional Status"
          size="small"
          allow-clear
        />
      </div>

      <div class="field">
        <label class="field-label">Note Type</label>
        <a-input
          v-model:value="studyStore.noteType"
          placeholder="e.g. Progress Note, Discharge Summary"
          size="small"
          allow-clear
        />
      </div>

      <div class="field">
        <label class="field-label">EHR System</label>
        <a-input
          v-model:value="studyStore.ehrSystem"
          placeholder="e.g. Epic, Cerner, MEDITECH"
          size="small"
          allow-clear
        />
      </div>

      <div class="field">
        <label class="field-label">Model Description</label>
        <a-input
          v-model:value="studyStore.modelDescription"
          placeholder="e.g. Rule-based NER v2.1"
          size="small"
          allow-clear
        />
      </div>

      <div class="field">
        <label class="field-label">Evaluator</label>
        <a-input
          v-model:value="studyStore.evaluatorName"
          placeholder="Name or role"
          size="small"
          allow-clear
        />
      </div>

      <div class="field">
        <label class="field-label">Notes</label>
        <a-textarea
          v-model:value="studyStore.notes"
          placeholder="Sampling strategy, annotation notes, etc."
          :rows="2"
          size="small"
          allow-clear
        />
      </div>
    </div>
  </a-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useStudyConfigStore } from '../stores/studyConfig'

const studyStore = useStudyConfigStore()

const isConfigured = computed(() =>
  !!(studyStore.siteName || studyStore.clinicalSetting || studyStore.ehrSystem),
)
</script>

<style scoped>
.study-config-card {
  border-radius: 8px;
}

.config-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field-label {
  font-size: 12px;
  font-weight: 600;
  color: #4b5563;
}

.info-notice {
  font-size: 12px;
  padding: 6px 10px;
}
</style>
