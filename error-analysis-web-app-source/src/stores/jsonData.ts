import { ref } from 'vue'
import { defineStore } from 'pinia'

export interface AnnotationTag {
  uid: number
  sentence: string
  gold_standard: string
  predication_label: string
  LLM_prediction: string
  LLM_reasoning: string
  errors?: Array<{
    category: string
    type: string
  }>
}

export interface JsonDataStructure {
  tags: AnnotationTag[]
}

export const useJsonDataStore = defineStore('jsonData', () => {
  const data = ref<JsonDataStructure | null>(null)
  const fileName = ref<string>('')
  const isLoading = ref<boolean>(false)
  const error = ref<string>('')

  function parseJsonFile(file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      isLoading.value = true
      error.value = ''

      const reader = new FileReader()

      reader.onload = (e) => {
        try {
          const content = e.target?.result as string
          const parsedData = JSON.parse(content) as JsonDataStructure

          data.value = parsedData
          fileName.value = file.name
          isLoading.value = false
          resolve()
        } catch (err) {
          error.value = `Error parsing JSON: ${err instanceof Error ? err.message : 'Invalid JSON format'}`
          isLoading.value = false
          reject(err)
        }
      }

      reader.onerror = () => {
        error.value = 'Error reading file'
        isLoading.value = false
        reject(new Error('Error reading file'))
      }

      reader.readAsText(file)
    })
  }

  function clearData() {
    data.value = null
    fileName.value = ''
    error.value = ''
  }

  return {
    data,
    fileName,
    isLoading,
    error,
    parseJsonFile,
    clearData,
  }
})
