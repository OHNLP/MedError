import { ref } from 'vue'
import { defineStore } from 'pinia'
import * as yaml from 'js-yaml'

export interface YamlDataStructure {
  [category: string]: Record<string, string>
}

export const useYamlDataStore = defineStore('yamlData', () => {
  const data = ref<YamlDataStructure | null>(null)
  const fileName = ref<string>('')
  const isLoading = ref<boolean>(false)
  const error = ref<string>('')

  function parseYamlFile(file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      isLoading.value = true
      error.value = ''

      const reader = new FileReader()

      reader.onload = (e) => {
        try {
          const content = e.target?.result as string
          const parsedData = yaml.load(content) as YamlDataStructure

          data.value = parsedData
          fileName.value = file.name
          isLoading.value = false
          resolve()
        } catch (err) {
          error.value = `Error parsing YAML: ${err instanceof Error ? err.message : 'Unknown error'}`
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
    parseYamlFile,
    clearData,
  }
})
