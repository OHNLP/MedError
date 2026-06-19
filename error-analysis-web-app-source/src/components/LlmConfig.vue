<template>
  <a-card class="llm-config-card" size="small">
    <template #title>
      <span>LLM Configuration</span>
      <a-tag :color="providerColor" size="small" style="margin-left: 8px; font-size: 10px">
        {{ providerLabel }}
      </a-tag>
    </template>

    <div class="config-form">

      <!-- Provider selector -->
      <div class="field">
        <label class="field-label">Provider</label>
        <a-radio-group v-model:value="llmStore.provider" size="small" button-style="solid" style="width:100%">
          <a-radio-button value="azure" style="width:50%;text-align:center">Azure</a-radio-button>
          <a-radio-button value="ollama" style="width:50%;text-align:center">Ollama (Local)</a-radio-button>
        </a-radio-group>
      </div>

      <!-- ── Azure OpenAI fields ── -->
      <template v-if="llmStore.provider === 'azure'">
        <a-alert
          message="Azure OpenAI is HIPAA-eligible with a signed BAA from Microsoft."
          type="info"
          show-icon
          :banner="false"
          class="hipaa-notice"
        />
        <div class="field">
          <label class="field-label">Endpoint URL</label>
          <a-input
            v-model:value="llmStore.azureEndpoint"
            placeholder="https://my-resource.openai.azure.com"
            size="small"
            allow-clear
          />
        </div>
        <div class="field">
          <label class="field-label">Deployment Name</label>
          <a-input
            v-model:value="llmStore.azureDeployment"
            placeholder="my-gpt4o-deployment"
            size="small"
            allow-clear
          />
        </div>
        <div class="field">
          <label class="field-label">API Key</label>
          <a-input-password
            v-model:value="llmStore.azureApiKey"
            placeholder="Azure OpenAI key"
            size="small"
            allow-clear
          />
        </div>
        <div class="field">
          <label class="field-label">API Version</label>
          <a-select v-model:value="llmStore.azureApiVersion" size="small" style="width:100%">
            <a-select-option value="2024-12-01-preview">2024-12-01-preview</a-select-option>
            <a-select-option value="2024-08-01-preview">2024-08-01-preview</a-select-option>
            <a-select-option value="2024-02-01">2024-02-01 (stable)</a-select-option>
          </a-select>
        </div>
      </template>

      <!-- ── Ollama fields ── -->
      <template v-if="llmStore.provider === 'ollama'">
        <a-alert
          message="Ollama runs fully locally — no data leaves your machine."
          type="success"
          show-icon
          :banner="false"
          class="hipaa-notice"
        />
        <div class="field">
          <label class="field-label">Base URL</label>
          <a-input
            v-model:value="llmStore.ollamaBaseUrl"
            placeholder="http://localhost:11434/v1"
            size="small"
            allow-clear
          />
        </div>
        <div class="field">
          <label class="field-label">Model</label>
          <a-input
            v-model:value="llmStore.ollamaModel"
            placeholder="llama3.1"
            size="small"
            allow-clear
          />
          <span class="hint hint-muted">Must be pulled via <code>ollama pull &lt;model&gt;</code></span>
        </div>
        <div class="ollama-models">
          <span class="field-label">Quick select:</span>
          <div class="model-chips">
            <a-tag
              v-for="m in ollamaPresets"
              :key="m.value"
              :color="llmStore.ollamaModel === m.value ? 'blue' : 'default'"
              class="model-chip"
              @click="llmStore.ollamaModel = m.value"
            >
              {{ m.label }}
            </a-tag>
          </div>
        </div>
      </template>

      <!-- ── Test Connection ── -->
      <div class="test-row">
        <a-button size="small" :loading="llmStore.connectionStatus === 'testing'" @click="testConn">
          Test Connection
        </a-button>
        <span v-if="llmStore.connectionStatus === 'ok'" class="hint hint-ok">
          <check-circle-outlined /> {{ llmStore.connectionMessage }}
        </span>
        <span v-else-if="llmStore.connectionStatus === 'error'" class="hint hint-error">
          <alert-outlined /> {{ llmStore.connectionMessage }}
        </span>
      </div>

      <!-- Processing status (shared) -->
      <div v-if="llmStore.isProcessing" class="processing-status">
        <a-progress :percent="progressPercent" size="small" status="active" />
        <span class="hint hint-muted">Analysing {{ llmStore.progress }} / {{ llmStore.total }}…</span>
      </div>

      <div v-if="llmStore.currentError" class="hint hint-error">
        <alert-outlined /> {{ llmStore.currentError }}
      </div>

    </div>
  </a-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { AlertOutlined, CheckCircleOutlined } from '@ant-design/icons-vue'
import { useLlmConfigStore } from '../stores/llmConfig'
import { testConnection } from '../services/llmService'

const llmStore = useLlmConfigStore()

async function testConn() {
  llmStore.connectionStatus = 'testing'
  llmStore.connectionMessage = ''
  const result = await testConnection({
    provider: llmStore.provider,
    azureEndpoint: llmStore.azureEndpoint,
    azureDeployment: llmStore.azureDeployment,
    azureApiKey: llmStore.azureApiKey,
    azureApiVersion: llmStore.azureApiVersion,
    ollamaBaseUrl: llmStore.ollamaBaseUrl,
    ollamaModel: llmStore.ollamaModel,
  })
  llmStore.connectionStatus = result.ok ? 'ok' : 'error'
  llmStore.connectionMessage = result.message
}

const progressPercent = computed(() =>
  llmStore.total ? Math.round((llmStore.progress / llmStore.total) * 100) : 0,
)

const providerLabel = computed(() => ({
  openai: 'OpenAI',
  azure: 'Azure (HIPAA-eligible)',
  ollama: 'Local / Private',
}[llmStore.provider]))

const providerColor = computed(() => ({
  openai: 'blue',
  azure: 'purple',
  ollama: 'green',
}[llmStore.provider]))

const ollamaPresets = [
  { label: 'llama3.1', value: 'llama3.1' },
  { label: 'llama3.2', value: 'llama3.2' },
  { label: 'mistral', value: 'mistral' },
  { label: 'phi4', value: 'phi4' },
  { label: 'gemma2', value: 'gemma2' },
]
</script>

<style scoped>
.llm-config-card {
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

.hint {
  font-size: 11px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.hint-ok    { color: #52c41a; }
.hint-warn  { color: #fa8c16; }
.hint-muted { color: #9ca3af; }
.hint-error { color: #f5222d; }

.hipaa-notice {
  font-size: 12px;
  padding: 6px 10px;
}

.processing-status {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.ollama-models {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.model-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.model-chip {
  cursor: pointer;
  font-size: 11px;
  margin: 0;
}

.test-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

code {
  background: #f3f4f6;
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 10px;
}
</style>
