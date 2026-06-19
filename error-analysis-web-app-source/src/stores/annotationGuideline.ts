import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import * as yaml from 'js-yaml'

export interface GuidelineKeyword {
  definition: string
  examples: string[]
}

export interface AnnotationGuidelineStructure {
  keywords: Record<string, GuidelineKeyword>
}

export const useAnnotationGuidelineStore = defineStore('annotationGuideline', () => {
  const data = ref<AnnotationGuidelineStructure | null>(null)
  const rawContent = ref<string>('')
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
          rawContent.value = content
          const parsed = yaml.load(content) as AnnotationGuidelineStructure

          if (!parsed || typeof parsed !== 'object' || !parsed.keywords) {
            throw new Error('Expected a YAML file with a top-level "keywords" key.')
          }
          data.value = parsed
          fileName.value = file.name
          isLoading.value = false
          resolve()
        } catch (err) {
          error.value = `Error parsing guideline YAML: ${err instanceof Error ? err.message : 'Unknown error'}`
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

  /** Sorted list of concept category names (keys of keywords object) */
  const conceptCategories = computed(() =>
    data.value ? Object.keys(data.value.keywords).sort() : [],
  )

  function clearData() {
    data.value = null
    rawContent.value = ''
    fileName.value = ''
    error.value = ''
  }

  return { data, rawContent, fileName, isLoading, error, conceptCategories, parseYamlFile, clearData }
})
