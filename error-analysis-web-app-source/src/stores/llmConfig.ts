import { ref } from 'vue'
import { defineStore } from 'pinia'

export type LlmProvider = 'azure' | 'ollama'

export const useLlmConfigStore = defineStore('llmConfig', () => {
  // Which provider to use
  const provider = ref<LlmProvider>('ollama')

  // Azure OpenAI
  const azureEndpoint = ref<string>('')        // e.g. https://my-resource.openai.azure.com
  const azureDeployment = ref<string>('')      // deployment name
  const azureApiKey = ref<string>('')
  const azureApiVersion = ref<string>('2024-12-01-preview')

  // Ollama (local)
  const ollamaBaseUrl = ref<string>('http://localhost:11434/v1')
  const ollamaModel = ref<string>('llama3.1')

  // Processing state
  const isProcessing = ref<boolean>(false)
  const progress = ref<number>(0)
  const total = ref<number>(0)
  const currentError = ref<string>('')

  // Connection test state
  const connectionStatus = ref<'idle' | 'testing' | 'ok' | 'error'>('idle')
  const connectionMessage = ref<string>('')

  function reset() {
    isProcessing.value = false
    progress.value = 0
    total.value = 0
    currentError.value = ''
  }

  return {
    provider,
    connectionStatus,
    connectionMessage,
    azureEndpoint,
    azureDeployment,
    azureApiKey,
    azureApiVersion,
    ollamaBaseUrl,
    ollamaModel,
    isProcessing,
    progress,
    total,
    currentError,
    reset,
  }
})
