import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export interface AnnotationTag {
  uid: number
  sentence: string
  gold_standard: string
  original_prediction: string
  model_type: string
  /** FP | FN | TP | TN */
  error_class: string
  LLM_prediction: string
  LLM_reasoning: string
  errors?: Array<{
    category: string
    type: string
  }>
  /** True once LLM has returned a result for this tag */
  llm_analyzed?: boolean
  /** True once a human has accepted or overridden the LLM suggestion */
  human_reviewed?: boolean
  /** The final human-confirmed error class (may differ from LLM_prediction) */
  human_error_class?: string
  /** Clinical concept category (from annotation guideline keywords) */
  concept_category?: string
}

export interface JsonDataStructure {
  tags: AnnotationTag[]
}

// Raw format as described in the README / Python pipeline input
interface RawInputItem {
  input?: string
  sentence?: string
  prediction_label?: string | null
  original_prediction?: string | null
  gold_standard?: string | null
  model_type?: string
  // Support pre-labelled judgement field from annotation tools
  _judgement?: string
  error_class?: string
  // Already-processed fields (passthrough)
  LLM_prediction?: string
  LLM_reasoning?: string
  uid?: number
  errors?: Array<{ category: string; type: string }>
  concept_category?: string
}

function computeErrorClass(
  prediction: string | null | undefined,
  gold: string | null | undefined,
): string {
  const predNull = !prediction || prediction === 'null'
  const goldNull = !gold || gold === 'null'
  if (!predNull && goldNull) return 'FP'
  if (predNull && !goldNull) return 'FN'
  if (!predNull && !goldNull) return 'TP'
  return 'TN'
}

function normaliseTag(raw: RawInputItem, index: number): AnnotationTag {
  const sentence = raw.input ?? raw.sentence ?? ''
  const prediction = raw.prediction_label ?? raw.original_prediction ?? null
  const gold = raw.gold_standard ?? null
  const errorClass = raw._judgement ?? raw.error_class ?? computeErrorClass(prediction, gold)
  const alreadyAnalyzed = !!(raw.LLM_prediction && raw.LLM_prediction.trim())

  return {
    uid: raw.uid ?? index,
    sentence,
    gold_standard: gold ?? 'null',
    original_prediction: prediction ?? 'null',
    model_type: raw.model_type ?? 'Unknown',
    error_class: errorClass,
    LLM_prediction: raw.LLM_prediction ?? '',
    LLM_reasoning: raw.LLM_reasoning ?? '',
    errors: raw.errors ?? [],
    llm_analyzed: alreadyAnalyzed,
    // Initialize so Vue 3 reactivity tracks these from the start
    human_reviewed: false,
    human_error_class: '',
    // Default concept_category to gold_standard (the entity that was annotated)
    concept_category: raw.concept_category ?? (gold && gold !== 'null' ? gold : ''),
  }
}

export const useJsonDataStore = defineStore('jsonData', () => {
  const data = ref<JsonDataStructure | null>(null)
  const fileName = ref<string>('')
  const isLoading = ref<boolean>(false)
  const error = ref<string>('')

  /** True when the loaded JSON was the raw prediction format (not pre-analysed) */
  const isRawFormat = ref<boolean>(false)

  /** Number of FP/FN tags that have not yet been analysed by the LLM */
  const unanalyzedCount = computed(() => {
    if (!data.value) return 0
    return data.value.tags.filter(
      (t) => (t.error_class === 'FP' || t.error_class === 'FN') && !t.llm_analyzed,
    ).length
  })

  function readFileText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target?.result as string)
      reader.onerror = () => reject(new Error('Error reading file'))
      reader.readAsText(file)
    })
  }

  /** Parse a CSV row respecting quoted fields */
  function parseCsvRow(line: string): string[] {
    const fields: string[] = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
        else inQuotes = !inQuotes
      } else if (ch === ',' && !inQuotes) {
        fields.push(current.trim())
        current = ''
      } else {
        current += ch
      }
    }
    fields.push(current.trim())
    return fields
  }

  function ingestParsed(parsed: unknown, name: string) {
    if (Array.isArray(parsed)) {
      isRawFormat.value = true
      data.value = { tags: (parsed as RawInputItem[]).map((item, i) => normaliseTag(item, i)) }
    } else if (parsed && typeof parsed === 'object' && Array.isArray((parsed as { tags: unknown }).tags)) {
      isRawFormat.value = false
      data.value = { tags: ((parsed as { tags: RawInputItem[] }).tags).map((item, i) => normaliseTag(item, i)) }
    } else {
      throw new Error('Unrecognised format. Expected { tags: [...] } or a row array.')
    }
    fileName.value = name
  }

  function parseJsonFile(file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      isLoading.value = true
      error.value = ''
      readFileText(file).then((content) => {
        try {
          ingestParsed(JSON.parse(content), file.name)
          isLoading.value = false
          resolve()
        } catch (err) {
          error.value = `Error parsing JSON: ${err instanceof Error ? err.message : 'Invalid JSON'}`
          isLoading.value = false
          reject(err)
        }
      }).catch((err) => {
        error.value = 'Error reading file'
        isLoading.value = false
        reject(err)
      })
    })
  }

  /**
   * Parse a CSV whose header columns match the standard tag fields:
   * uid, sentence, gold_standard, original_prediction, model_type,
   * error_class, LLM_prediction, LLM_reasoning
   */
  function parseCsvFile(file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      isLoading.value = true
      error.value = ''
      readFileText(file).then((content) => {
        try {
          const lines = content.split(/\r?\n/).filter((l) => l.trim())
          if (lines.length < 2) throw new Error('CSV has no data rows.')

          const headers = parseCsvRow(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, '_'))
          const requiredCols = ['sentence']
          for (const col of requiredCols) {
            if (!headers.includes(col)) throw new Error(`CSV is missing required column: "${col}"`)
          }

          const rows: RawInputItem[] = lines.slice(1).map((line, i) => {
            const vals = parseCsvRow(line)
            const row: Record<string, string> = {}
            headers.forEach((h, idx) => { row[h] = vals[idx] ?? '' })
            return {
              uid: row.uid ? Number(row.uid) : i,
              sentence: row.sentence ?? '',
              gold_standard: row.gold_standard || 'null',
              original_prediction: row.original_prediction || row.prediction_label || 'null',
              model_type: row.model_type || 'Unknown',
              error_class: row.error_class || undefined,
              LLM_prediction: row.llm_prediction || row['llm_prediction'] || '',
              LLM_reasoning: row.llm_reasoning || row['llm_reasoning'] || '',
            } as RawInputItem
          })

          ingestParsed(rows, file.name)
          isLoading.value = false
          resolve()
        } catch (err) {
          error.value = `Error parsing CSV: ${err instanceof Error ? err.message : 'Invalid CSV'}`
          isLoading.value = false
          reject(err)
        }
      }).catch((err) => {
        error.value = 'Error reading file'
        isLoading.value = false
        reject(err)
      })
    })
  }

  /**
   * Update a tag with LLM analysis results.
   */
  function updateTagLlm(
    uid: number,
    llmPrediction: string,
    llmReasoning: string,
    errors: Array<{ category: string; type: string }>,
  ) {
    const tag = data.value?.tags.find((t) => t.uid === uid)
    if (!tag) return
    tag.LLM_prediction = llmPrediction
    tag.LLM_reasoning = llmReasoning
    tag.errors = errors
    tag.llm_analyzed = true
  }

  /**
   * Record a human review decision: accept or override the LLM's suggestion.
   * @param uid - tag uid
   * @param errorClass - the confirmed error class (LLM's or human override)
   * @param category - taxonomy category the class belongs to
   */
  function markReviewed(uid: number, errorClass: string, category: string) {
    const tag = data.value?.tags.find((t) => t.uid === uid)
    if (!tag) return
    tag.human_reviewed = true
    tag.human_error_class = errorClass
    tag.errors = [{ category, type: errorClass }]
  }

  /**
   * Tag a review item with a clinical concept category (from annotation guideline).
   */
  function updateConceptCategory(uid: number, category: string) {
    const tag = data.value?.tags.find((t) => t.uid === uid)
    if (tag) tag.concept_category = category
  }

  function clearData() {
    data.value = null
    fileName.value = ''
    error.value = ''
    isRawFormat.value = false
  }

  return {
    data,
    fileName,
    isLoading,
    error,
    isRawFormat,
    unanalyzedCount,
    parseJsonFile,
    parseCsvFile,
    updateTagLlm,
    markReviewed,
    updateConceptCategory,
    clearData,
  }
})
