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

  /** Minimal RFC-4180 CSV row parser — handles double-quoted fields with commas inside. */
  function parseCsvRow(line: string): string[] {
    const cols: string[] = []
    let cur = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++ }   // escaped quote
        else if (ch === '"') { inQuotes = false }
        else { cur += ch }
      } else {
        if (ch === '"') { inQuotes = true }
        else if (ch === ',') { cols.push(cur); cur = '' }
        else { cur += ch }
      }
    }
    cols.push(cur)
    return cols
  }

  /**
   * Parse a CSV guideline file.
   * Required column: concept (or keyword)
   * Optional columns: definition, examples (pipe-separated: "ex1|ex2|ex3")
   * Handles UTF-8 BOM from Excel exports.
   */
  function parseCsvFile(file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      isLoading.value = true
      error.value = ''
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          // Strip UTF-8 BOM that Excel sometimes adds (﻿)
          let content = (e.target?.result as string).replace(/^﻿/, '')
          rawContent.value = content

          const lines = content.split(/\r?\n/).filter(l => l.trim() !== '')
          if (lines.length < 2) throw new Error('CSV must have a header row and at least one data row.')

          const headers = parseCsvRow(lines[0]).map(h => h.toLowerCase().trim())

          // Accept "concept" or "keyword" as the concept column
          let colConcept = headers.indexOf('concept')
          if (colConcept === -1) colConcept = headers.indexOf('keyword')
          const colDef      = headers.indexOf('definition')
          const colExamples = headers.indexOf('examples')

          if (colConcept === -1) {
            throw new Error(`CSV must have a "concept" column. Found: ${headers.join(', ')}`)
          }
          if (colDef === -1 && colExamples === -1) {
            throw new Error('CSV must have at least a "definition" or "examples" column.')
          }

          const keywords: Record<string, GuidelineKeyword> = {}
          for (let i = 1; i < lines.length; i++) {
            const cols = parseCsvRow(lines[i])
            const concept = cols[colConcept]?.trim()
            if (!concept) continue
            const definition   = colDef      !== -1 ? (cols[colDef]      ?? '').trim() : ''
            const examplesRaw  = colExamples !== -1 ? (cols[colExamples] ?? '').trim() : ''
            const examples = examplesRaw
              ? examplesRaw.split('|').map(s => s.trim()).filter(Boolean)
              : []
            keywords[concept] = { definition, examples }
          }

          if (Object.keys(keywords).length === 0) {
            throw new Error('No concepts found — check that the "concept" column has values.')
          }

          data.value = { keywords }
          fileName.value = file.name
          isLoading.value = false
          resolve()
        } catch (err) {
          error.value = `Error parsing CSV: ${err instanceof Error ? err.message : String(err)}`
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

  return { data, rawContent, fileName, isLoading, error, conceptCategories, parseYamlFile, parseCsvFile, clearData }
})
