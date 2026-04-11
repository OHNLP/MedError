import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useDisplayYamlDataStore = defineStore('displayYamlData', () => {
  const rawContent = ref<string>('')
  const fileName = ref<string>('')
  const isLoading = ref<boolean>(false)
  const error = ref<string>('')

  function readYamlFile(file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      isLoading.value = true
      error.value = ''

      const reader = new FileReader()

      reader.onload = (e) => {
        rawContent.value = e.target?.result as string
        fileName.value = file.name
        isLoading.value = false
        resolve()
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
    rawContent.value = ''
    fileName.value = ''
    error.value = ''
  }

  return {
    rawContent,
    fileName,
    isLoading,
    error,
    readYamlFile,
    clearData,
  }
})
