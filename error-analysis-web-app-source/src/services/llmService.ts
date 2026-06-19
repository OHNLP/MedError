/**
 * LLM service for MedError: builds prompts, calls LLM providers, parses responses.
 * Supports OpenAI, Azure OpenAI (HIPAA-eligible with BAA), and Ollama (local/private).
 */

import type { LlmProvider } from '../stores/llmConfig'

export interface LlmResult {
  errorClass: string
  reasoning: string
}

export interface LlmCallConfig {
  provider: LlmProvider
  // Azure OpenAI
  azureEndpoint?: string
  azureDeployment?: string
  azureApiKey?: string
  azureApiVersion?: string
  // Ollama
  ollamaBaseUrl?: string
  ollamaModel?: string
}

// ---------------------------------------------------------------------------
// Prompt building
// ---------------------------------------------------------------------------

const DEFAULT_SYSTEM_PROMPT = `## Background

You are an expert in clinical information extraction. Your task is to perform error analysis, defined as a process used to document errors that appear after an NLP model run.

## Task Definition

The objective for this IE task is to extract delirium, functional status (basic or instrumental activities of daily living), or fall associated mentions from unstructured clinical notes. Clinical concepts are defined as Altered mental status, Confusion, Disconnected, Disorganized Thinking, Disorientation, Fall, Hallucination, Delirium, Encephalopathy, Agitation, Fluctuation, Inattention, Reorientation, Indeterminant, Drowsy.

The task is to analyze the given input sentence or text phrase and NLP prediction result to identify the error classes of the NLP predictions, defined as Absence_of_Context, Certainty, Differential_Diagnosis, Exclusion, History, Homonym, Hypothetical, Implied_Inference, Medical_Evaluation, Medical_Grading, Medical_Instruction, Medical_Question, Medical_Risk, Morphological, Negation, Orthographic, Patient_Education, Possible, Section, Subject, Synonym, Syntactic.

## Error Class Definitions

Absence_of_Context: NLP model falsely or partially captures concepts due to lack of enough context to determine the certainty, status, and subject of the expression.
  Example (delirium): 'Confusion' (occurs as a single concept without context)
  Correction: Patient has a constant confused look displayed on his/her face.

Certainty: NLP model falsely captures concepts due to incorrectly judging grade (within the power or capacity of someone or something), possible, probable-related terms or expressions.

Differential_Diagnosis: Description that documents a process where clinicians consider various possible conditions or diseases that could explain a patient's symptoms before making a final diagnosis.
  Example (SBI): One potential differential diagnosis for silent infarction could include other causes of neurological symptoms such as migraine with aura, transient ischemic attack (TIA), or small fiber neuropathy.

Hypothetical: Hypothesis-related concepts or expressions.
  Example (delirium): Patient would have delirium if the CAM screening test come out positive.

Medical_Grading: A model incorrectly classifies concepts due to an erroneous assessment of grade, which pertains to the ability or capacity of someone or something.
  Example (ADL): change ADL from 95 to 105; gait is significantly improved.

Negation: NLP model falsely captures concepts due to incorrectly judging negation-related (contradiction or denial of something) terms or expressions.
  Example (delirium): Not able to be easily aroused; Patient does not have encephalopathy.; No history of confusion.
  Example (ADL): ADLs: Able to do activities of daily living without limitations.

Possible: NLP model falsely captures concepts due to incorrectly possible, probable-related terms or expressions.
  Example (delirium): Could be related to prednisone, medication-induced confusion.

Exclusion: NLP model falsely captures concepts due to the concepts occurring in a wrong context.
  Example (dressing): has hearing aids not wearing concerned about was.
  Example (ADL): reviewed their function ADL/IADL problem list.

Medical_Evaluation: A description of a patient presenting to a clinic for evaluation and assessment of their condition. The concepts need to be excluded because they do not reflect patient's disease status.
  Example (delirium): I was called to evaluate the patient for an episode of confusion; Patient was screened for confusion.

Medical_Instruction: Communication of medical information, advice, and instructions to individuals seeking healthcare or treatment.
  Example (delirium): When to Call Your Doctor – Call your doctor right away if you have any of the following: Confusion or forgetfulness; Muscle spasms, cramping, or twitching; Seizures; Gait disturbances.

Medical_Risk: Communication about the likelihood and severity of harm or negative consequences that can result from medical decisions or actions.
  Example (fall): High risk for falls; I am worried about falling.

Patient_Education: Clinical language about providing patients with information, knowledge, and resources to help them understand their medical conditions, treatment options, and self-care practices.
  Example (fall, delirium): Fall prevention education; The nurse disconnected the call.

Section: Section errors occur when NLP models falsely capture the pre-defined concepts that belong to the wrong section (e.g., Clinical Document Architecture HL7 standard).
  Example (delirium): Family History (Section ID) — Hypertension: Yes; Diabetes: Yes.

History: Temporal status refers to the current condition or state of a patient's medical or health-related information. It is used to distinguish between historical information (past status) and information that reflects the patient's current state (present status).

Subject: An individual or entity that is the focus of attention or observation to be identified within a specific clinical context. Most common scenario is to refer to an individual who is receiving medical treatment. Family member can be subjects of the study when their medical history, genetic information, or other factors are relevant to the research or medical care of the patient.
  Example (delirium): Patient's grandpa has hypertension and diabetes (FP); Daughter/Son called and states patient has continued to be confused (TP).
  Other subject — Example (delirium): The character of symptoms is agitated.; The course/duration of symptoms is fluctuating in intensity.

Morphological: Morphologic errors occur when NLP models fail to capture the pre-defined concepts due to the variation in structure and formation of words (prefixes, suffixes and base words).
  Example (delirium): Hallucinates; Hallucination; Altered; Alteration; Alter.

Orthographic: Orthographic errors occur when NLP models fail to capture the pre-defined concepts due to the variation in language conventions including special characters, spelling, hyphenation, capitalization, word breaks, emphasis, and punctuation.
  Example (delirium; fall): Decresed (Decreased) responsiveness; ell (Fell) last night.

Homonym: Words that are spelled and pronounced the same but have different meanings.
  Example (fall): Fall asleep; Redwood falls; Water falls.

Implied_Inference: Missing paraphrase and implication — concepts or expressions that can directly/indirectly infer the target concept of interest.
  Example (fall): landing flat on his back; missed the last step while going down the stairs; patient went down with a sudden knee flexion.
  Example (delirium): Becoming more forgetful; Difficulty with his/her speech particularly with word finding.

Synonym: Missing new lexicon and synonym not in the original NLP ruleset.
  Example (delirium): Disorganized thinking: fuzziness; obtunded; forgetful. Difficulty concentrating: inattention. Disconnected: obtunded; fatigue; somnolence.

Syntactic: A syntactic error occurs when violating the grammatical structure or rules of the language especially when the system fails to parse or understand the grammatical structure of sentences or phrases correctly. Sentence boundary detection is a task of segmenting individual sentences within a block of clinical text.
  Example (fall): Patient did not have dementia; but had several syncope events.

Medical_Question: Questions posed about medical conditions, diagnoses, or treatments in clinical text.

## Instructions

1. Carefully read the input sentence, NLP prediction, and the type of error (fp: false positive or fn: false negative) of the NLP prediction.
2. Assign the correct error class to the given input. The error class MUST be a specific error type from the taxonomy above (e.g., Negation, Implied_Inference, Synonym). NEVER output "FP", "FN", "False Positive", "False Negative", "True Positive", or any error-direction term as the Error class — those describe which direction the error went, not what kind of error it is.
3. Be as detailed and verbose as possible in your reasoning.

## Reasoning

Provide your step-by-step reasoning here. Discuss the error assigned to each sentence and NLP prediction input, including any relevant context or considerations.

## Input Format

Sentence[TAB]NLP prediction[TAB]type of error

## Output Format

Generate the Error class and Reasoning in the following format.

Final Answer:
Error class: <specific error class from taxonomy — never FP or FN>
Reasoning: <detailed explanation>

## Few-Shot Examples

Input: author: fell, nancy a pa	Fall	fp
Final Answer:
Error class: Homonym
Reasoning: "Fell" is a surname here (Nancy A. Fell), not a fall event. The model misinterprets the homonym — the word has multiple meanings and without context indicating a physical fall, this is a false positive driven by a homonym error.

Input: No evidence of delirium during today's examination.	Delirium	fp
Final Answer:
Error class: Negation
Reasoning: The sentence explicitly negates delirium with "No evidence of." The NLP model incorrectly extracts Delirium without recognising the negation modifier. The correct interpretation is that delirium was assessed and ruled out.

Input: Differential Diagnosis: Confusion, cerebral vascular accident, delirium drug withdrawal.	Delirium	fp
Final Answer:
Error class: Differential_Diagnosis
Reasoning: "Delirium" appears within a differential diagnosis list — it is being considered as a possible but unconfirmed condition. The model incorrectly treats a potential diagnosis as a confirmed finding.

Input: Patient was screened for confusion.	Confusion	fp
Final Answer:
Error class: Medical_Evaluation
Reasoning: The sentence describes a screening event, not a confirmed clinical finding. The model incorrectly extracts Confusion as positive; the sentence only documents that screening occurred.

Input: He is forgetful, more than confused.	Confusion	fp
Final Answer:
Error class: Synonym
Reasoning: The sentence uses "forgetful" as a near-synonym, which the ruleset does not distinguish from clinical confusion. This results in a false positive via synonym overgeneralization.

Input: HALLUCINATIONS	Hallucination	fp
Final Answer:
Error class: Absence_of_Context
Reasoning: The term appears as a single isolated word without surrounding clinical context to determine certainty, negation, or subject. Insufficient context makes it impossible to confirm this as a true positive.

Input: Patient did not have dementia; but had several syncope events.	Fall	fp
Final Answer:
Error class: Syntactic
Reasoning: The model incorrectly parses across a sentence boundary (semicolon), associating "syncope events" with a fall concept. Proper sentence segmentation would prevent this cross-boundary false positive.`

export interface GuidelineKeyword {
  definition: string
  examples?: string[]
}

export function buildSystemPrompt(
  yamlData?: Record<string, Record<string, string>> | null,
  guidelineData?: { keywords: Record<string, GuidelineKeyword> } | null,
): string {
  // No uploads at all — use the rich default
  if (!yamlData && !guidelineData) return DEFAULT_SYSTEM_PROMPT

  // --- Annotation guideline section (concept definitions + examples) ---
  const guidelineSection = guidelineData?.keywords
    ? `## Annotation Guideline: Clinical Concepts to Extract

The NLP model was configured to extract the following clinical concepts. Use these definitions to understand what constitutes a true positive vs. a model error.

${Object.entries(guidelineData.keywords)
        .map(([concept, kw]) => {
          const exLines = kw.examples?.length
            ? '\n  Examples: ' + kw.examples.slice(0, 3).map(e => `"${e}"`).join('; ')
            : ''
          return `- ${concept}: ${kw.definition}${exLines}`
        })
        .join('\n')}`
    : ''

  // --- Taxonomy section ---
  const taxonomySection = yamlData
    ? `## Error Taxonomy

${Object.entries(yamlData)
        .map(([category, types]) => {
          const typeLines = Object.entries(types)
            .map(([name, desc]) => `  - ${name}: ${desc}`)
            .join('\n')
          return `${category}:\n${typeLines}`
        })
        .join('\n\n')}`
    : `## Error Taxonomy

${DEFAULT_SYSTEM_PROMPT.split('## Error Class Definitions')[1]?.split('## Instructions')[0] ?? '(see error class definitions in system context)'}`

  return `## Background

You are an expert in clinical information extraction. Your task is to perform error analysis on NLP model outputs from clinical text.

${guidelineSection ? guidelineSection + '\n\n' : ''}${taxonomySection}

## Direction-Based Candidate Narrowing

The error direction (FP or FN) is provided in the input. Use it to pre-filter candidate error classes BEFORE selecting one.

If FP (the model extracted something it should NOT have — over-extraction):
  Strongly consider: Negation, Possible_and_Probable_Language, Hypothetical_Language,
  Differential_Diagnosis, Absence_of_Context, History, Section,
  Family_Member, Family_History, Other_Subject,
  Medical_Evaluation, Medical_Instruction, Medical_Risk, Patient_Education,
  Homonyms, Medical_Grading, Certainty, Medical_Question, Overextraction, Distortion

If FN (the model MISSED something it should have extracted — under-extraction):
  Strongly consider: Implied_Inference, Synonym, Morphological_Error,
  Spelling_Error, Abbreviation_Error, Typographical_Error, Sentence_Boundaries,
  Incomplete_Extraction, Dictionary_Error

Note on Orthographic errors: these can go BOTH directions.
  - FN: the model misses a concept because the text contains a misspelling or non-standard abbreviation
  - FP: the model matches a misspelled non-concept token against a known keyword trigger

## Confusable Class Decision Rules

### Negation vs. Medical_Evaluation vs. Differential_Diagnosis
All three involve "no confirmed finding," but the PRIMARY framing decides:
- Negation: a negation modifier directly cancels the concept.
  Trigger words: no, not, without, never, denies, denied, rules out, ruled out,
  does not meet criteria, absent, negative [as NLP result term].
  Example: "Patient denies falls" → Negation (not Absence_of_Context).
- Medical_Evaluation: the sentence primarily describes a clinical assessment ACT.
  Even if the result is negated ("screening was negative"), when the main framing
  is evaluation/screening/assessment, prefer Medical_Evaluation.
  Example: "Screening for food insecurity was negative" → Medical_Evaluation.
- Differential_Diagnosis: the concept appears in a list of conditions being
  actively considered, not yet confirmed or excluded.
  Example: "Differential includes delirium vs. dementia" → Differential_Diagnosis.
When explicit negation AND evaluation context co-occur, ask: is the sentence
  primarily about the assessment act, or about denying the concept? If the negation
  is the most salient element (e.g., "does not meet criteria for delirium"),
  choose Negation.

### Hypothetical_Language vs. Possible_and_Probable_Language vs. Medical_Risk
- Hypothetical_Language: conditional or counterfactual framing.
  Trigger words: if, when [conditional], should [conditional], were to, would,
  in the event of, had the patient.
  Example: "If the patient attempts to ambulate... risk of a future fall" → Hypothetical_Language.
- Possible_and_Probable_Language: epistemic uncertainty about whether an event
  occurred or a condition exists.
  Trigger words: possible, possibly, probable, probably, likely, may have, might,
  cannot rule out, could represent, suspected, uncertain whether.
  Example: "It is possible that the patient may have had an unwitnessed fall" → Possible_and_Probable_Language.
- Medical_Risk: states risk level without conditional or epistemic framing.
  Trigger words: high/low/moderate risk, risk for, risk of [no if/may qualifier].
  Example: "Patient is at high risk for falls" → Medical_Risk.
When conditional framing ("if") and risk language co-occur, prefer Hypothetical_Language.

### Implied_Inference vs. Partially_Correct
- Implied_Inference: the gold concept has NO direct textual representation —
  it must be inferred entirely from behavioral or situational description.
  Example: "found on the floor" → Fall (zero lexical overlap with target concept).
- Partially_Correct: the text DOES express part of the target concept, but the
  extraction is incomplete or imprecise relative to the gold standard.
  Example: "confused and restless" → gold=Delirium (confusion is a component of
  Delirium; the extraction is a partial but real representation of the concept).

## Instructions

1. Identify the error direction (FP or FN) and use the candidate list above to narrow your search space.
2. Apply the confusable class decision rules above before finalising your choice.
3. Use the annotation guideline above to understand what the NLP model was configured to extract.
4. Assign the most specific error class from the taxonomy. The error class MUST be a specific class name (e.g., Negation, Implied_Inference). NEVER output "FP", "FN", "False Positive", "False Negative", or any error-direction term as the Error class.
5. Be detailed and verbose in your reasoning.

## Input Format

Sentence[TAB]NLP prediction[TAB]type of error

## Output Format

Final Answer:
Error class: <specific error class from taxonomy — never FP or FN>
Reasoning: <detailed explanation>

## Few-Shot Examples

### FN examples — model missed a concept it should have extracted

Input: He landed flat on the floor after losing his balance.	Fall	fn
Final Answer:
Error class: Implied_Inference
Reasoning: The word "fall" does not appear. However, landing flat on the floor after losing balance directly implies a fall event. The model failed to infer the target concept from its physical description and consequence. This is a false negative driven by Implied_Inference — the concept is present but expressed indirectly rather than named explicitly.

Input: Patient was speaking to people who were not in the room.	Hallucination	fn
Final Answer:
Error class: Implied_Inference
Reasoning: The term "hallucination" is absent, but speaking to non-existent people is a canonical clinical description of a visual or auditory hallucination. The model did not capture this concept because its trigger vocabulary requires the explicit term. The concept is fully supported by the text through clinical implication.

Input: She kept asking where she was, even after being told multiple times.	Disoriented	fn
Final Answer:
Error class: Implied_Inference
Reasoning: "Disoriented" does not appear, but repeatedly asking where one is despite being told is a behavioral manifestation of disorientation to place. The model missed this because the concept is communicated through behavior rather than a named clinical term.

Input: Patient was combative and uncooperative with nursing staff overnight.	Agitated	fn
Final Answer:
Error class: Synonym
Reasoning: "Combative" is a clinical synonym for agitation commonly used in nursing notes, but it is not in the model's keyword list. The model failed to extract the concept because it does not recognize this synonym variant, producing a false negative.

Input: Patient appeared obtunded and difficult to arouse.	Confusion	fn
Final Answer:
Error class: Synonym
Reasoning: "Obtunded" describes a state of reduced alertness overlapping clinically with altered mental status and confusion, but the model's lexicon does not include it. This is a synonym false negative — the concept is present under a different clinical term the model was not trained to recognize.

Input: Pt. c/o feeling foggy and not herself since last noc.	AMS	fn
Final Answer:
Error class: Abbreviation_Error
Reasoning: "Pt." (patient), "c/o" (complains of), and "noc" (night) are standard clinical abbreviations. The model failed to parse the sentence correctly due to unresolved abbreviations, causing a false negative for altered mental status.

Input: Patient did not seem confused; however, she was clearly not herself.	Confusion	fn
Final Answer:
Error class: Negation
Reasoning: This is an atypical FN for Negation. The first clause negates confusion, but the second clause ("not herself") is an implicit positive indicator the model should have captured. The model's negation logic applied scope too broadly, suppressing the positive extraction from the second clause. The net result is a missed extraction.

### FP examples — model extracted something it should NOT have

Input: No evidence of delirium on today's assessment.	Delirium	fp
Final Answer:
Error class: Negation
Reasoning: The phrase "No evidence of" is an explicit negation modifier. The model extracted Delirium without recognising this negation, producing a false positive. The correct interpretation is that delirium was assessed and ruled out.

Input: Patient was screened for delirium using the CAM instrument.	Delirium	fp
Final Answer:
Error class: Medical_Evaluation
Reasoning: The sentence describes a screening or evaluation event, not a confirmed clinical finding. Extracting Delirium here is a false positive — the concept is mentioned only in the context of assessment, not as a positive result.

Input: Fall asleep; patient denies any recent falls.	Fall	fp
Final Answer:
Error class: Homonyms
Reasoning: "Fall asleep" uses "fall" as a verb with a completely different meaning from a physical fall event. The model matched the keyword without resolving the homonym, producing a false positive.

Input: Possible delirium vs. dementia exacerbation — will monitor.	Delirium	fp
Final Answer:
Error class: Possible_and_Probable_Language
Reasoning: The word "possible" indicates epistemic uncertainty — the clinician has not confirmed a diagnosis. The model ignored this hedge and extracted Delirium as a confirmed finding, which is incorrect.`
}

// ---------------------------------------------------------------------------
// Unified LLM call — routes to the correct provider
// ---------------------------------------------------------------------------

export async function callLlm(
  config: LlmCallConfig,
  systemPrompt: string,
  sentence: string,
  prediction: string,
  errorType: string,
): Promise<LlmResult> {
  const userInput = `${sentence}\t${prediction}\t${errorType}`
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userInput },
  ]

  switch (config.provider) {
    case 'azure':
      return callAzure(config, messages)

    case 'ollama':
      return callOpenAiCompatible(
        `${(config.ollamaBaseUrl ?? 'http://localhost:11434/v1').replace(/\/$/, '')}/chat/completions`,
        {},  // Ollama requires no auth header
        config.ollamaModel ?? 'llama3.1',
        messages,
        'Ollama',
      )

    default:
      throw new Error(`Unknown provider: ${config.provider}`)
  }
}

// ---------------------------------------------------------------------------
// OpenAI-compatible endpoint (OpenAI + Ollama share this format)
// ---------------------------------------------------------------------------

async function callOpenAiCompatible(
  url: string,
  extraHeaders: Record<string, string>,
  model: string,
  messages: Array<{ role: string; content: string }>,
  providerName: string,
): Promise<LlmResult> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
    body: JSON.stringify({ model, messages, temperature: 0, max_tokens: 512 }),
  })

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}))
    const msg = (errBody as { error?: { message?: string } })?.error?.message
    throw new Error(msg || `${providerName} API error: ${response.status} ${response.statusText}`)
  }

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string } }>
  }
  return parseResponse(data.choices[0]?.message?.content ?? '')
}

// ---------------------------------------------------------------------------
// Azure OpenAI — different URL pattern and uses api-key header
// ---------------------------------------------------------------------------

async function callAzure(
  config: LlmCallConfig,
  messages: Array<{ role: string; content: string }>,
): Promise<LlmResult> {
  const endpoint = (config.azureEndpoint ?? '').replace(/\/$/, '')
  const deployment = config.azureDeployment ?? ''
  const apiVersion = config.azureApiVersion ?? '2024-12-01-preview'

  if (!endpoint || !deployment) {
    throw new Error('Azure OpenAI requires an endpoint URL and deployment name.')
  }

  const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': config.azureApiKey ?? '',
    },
    body: JSON.stringify({ messages, temperature: 0, max_tokens: 512 }),
  })

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}))
    const msg = (errBody as { error?: { message?: string } })?.error?.message
    throw new Error(msg || `Azure OpenAI error: ${response.status} ${response.statusText}`)
  }

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string } }>
  }
  return parseResponse(data.choices[0]?.message?.content ?? '')
}

// ---------------------------------------------------------------------------
// Response parsing
// ---------------------------------------------------------------------------

/** Terms that indicate the LLM confused error direction with error class. */
const ERROR_DIRECTION_TERMS = new Set([
  'fp', 'fn', 'tp', 'tn',
  'falsepositive', 'falsenegative', 'truepositive', 'truenegative',
  'false positive', 'false negative', 'true positive', 'true negative',
])

/**
 * Known taxonomy class names (normalised) used to recover a class from
 * reasoning text when the LLM returns an error-direction term.
 */
const KNOWN_CLASS_PATTERNS = [
  'Negation', 'Implied_Inference', 'Synonym', 'Morphological_Error', 'Orthographic_Error',
  'Spelling_Error', 'Abbreviation_Error', 'Typographical_Error', 'Homonyms', 'Conflation',
  'Partially_Correct', 'Statistical_Inference', 'Sentence_Boundaries',
  'Differential_Diagnosis', 'Hypothetical_Language', 'Medical_Grading',
  'Possible_and_Probable_Language', 'Distortion',
  'Medical_Evaluation', 'Medical_Instruction', 'Medical_Risk', 'Patient_Education',
  'Absence_of_Context', 'Context_Length', 'Section',
  'History', 'Present', 'Family_Member', 'Family_History', 'Other_Subject',
  'Missing_Annotation', 'Guideline_Error', 'Misclassification', 'Omission',
  'Complete_Hallucination', 'Logic_Pattern_and_Rule', 'Instruction_Following_Failure', 'Overextraction',
  'Verbosity_and_Format_Error', 'Consistency_Error', 'Sycophantic_Error',
  'Incomplete_Extraction', 'Dictionary_Error', 'Normalization_Error',
  // Legacy names still in default prompt
  'Hypothetical', 'Morphological', 'Orthographic', 'Homonym', 'Syntactic',
  'Possible', 'Exclusion', 'Certainty', 'Subject', 'Medical_Question', 'Risk_Assessment',
  'Semantic_Error', 'Syntactic_Error', 'Temporal_Status',
]

function isErrorDirection(raw: string): boolean {
  return ERROR_DIRECTION_TERMS.has(raw.toLowerCase().replace(/[_\s-]/g, ''))
}

/** Scan reasoning text for a known class name when the LLM gave an error-direction term. */
function recoverClassFromReasoning(reasoning: string): string {
  for (const cls of KNOWN_CLASS_PATTERNS) {
    const pattern = new RegExp(`\\b${cls.replace(/_/g, '[_ ]')}\\b`, 'i')
    if (pattern.test(reasoning)) return cls
  }
  return 'Unknown'
}

export function parseResponse(text: string): LlmResult {
  const cleaned = text.replace(/\*\*/g, '')
  const finalMatch = cleaned.match(/Final Answer\s*:?\s*\n([\s\S]+)/i)
  const body = finalMatch ? finalMatch[1] : cleaned

  const errorClassMatch = body.match(/Error class\s*:\s*(.+?)(?:\n|$)/i)
  const reasoningMatch = body.match(/Reasoning\s*:\s*([\s\S]+)/i)

  const rawClass = errorClassMatch?.[1]?.trim() ?? 'Unknown'
  const reasoning = reasoningMatch?.[1]?.trim() ?? body.trim()

  // If the LLM returned an error-direction term instead of a class name,
  // attempt to recover the intended class from the reasoning text.
  const errorClass = isErrorDirection(rawClass)
    ? recoverClassFromReasoning(reasoning)
    : rawClass

  return { errorClass, reasoning }
}

// ---------------------------------------------------------------------------
// Connection test
// ---------------------------------------------------------------------------

export interface ConnectionResult {
  ok: boolean
  message: string
}

export async function testConnection(config: LlmCallConfig): Promise<ConnectionResult> {
  try {
    if (config.provider === 'ollama') {
      const base = (config.ollamaBaseUrl ?? 'http://localhost:11434/v1').replace(/\/$/, '')
      const res = await fetch(`${base}/models`, { signal: AbortSignal.timeout(5000) })
      if (!res.ok) throw new Error(`Server responded ${res.status}`)
      const data = await res.json() as { data: Array<{ id: string }> }
      const models = data.data?.map((m) => m.id) ?? []
      const target = config.ollamaModel ?? ''
      const found = models.some((id) => id.startsWith(target.split(':')[0]))
      if (!found && models.length > 0) {
        return { ok: true, message: `Connected — model "${target}" not found. Available: ${models.join(', ')}` }
      }
      return { ok: true, message: `Connected — ${target} is ready` }
    }

    if (config.provider === 'azure') {
      const endpoint = (config.azureEndpoint ?? '').replace(/\/$/, '')
      const deployment = config.azureDeployment ?? ''
      const version = config.azureApiVersion ?? '2024-12-01-preview'
      const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${version}`
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'api-key': config.azureApiKey ?? '' },
        body: JSON.stringify({ messages: [{ role: 'user', content: 'hi' }], max_tokens: 1 }),
        signal: AbortSignal.timeout(10000),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: { message?: string } }
        throw new Error(err?.error?.message ?? `HTTP ${res.status}`)
      }
      return { ok: true, message: `Connected — Azure deployment "${deployment}" is ready` }
    }

    return { ok: false, message: 'Unknown provider' }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { ok: false, message: msg.includes('fetch') || msg.includes('Failed') ? 'Cannot reach server — is Ollama running?' : msg }
  }
}

// ---------------------------------------------------------------------------
// Error taxonomy matching: map LLM error class → YAML category + type
// ---------------------------------------------------------------------------

export function matchToYamlTaxonomy(
  errorClass: string,
  yamlData: Record<string, Record<string, string>> | null,
): { category: string; type: string } {
  if (!yamlData) return { category: 'Other', type: errorClass }

  const normalised = errorClass.toLowerCase().replace(/[_\s-]/g, '')

  for (const [category, types] of Object.entries(yamlData)) {
    for (const typeName of Object.keys(types)) {
      const normType = typeName.toLowerCase().replace(/[_\s-]/g, '')
      if (normType === normalised || normalised.includes(normType) || normType.includes(normalised)) {
        return { category, type: typeName }
      }
    }
  }

  for (const [category] of Object.entries(yamlData)) {
    const normCat = category.toLowerCase().replace(/[_\s-]/g, '')
    if (normalised.includes(normCat) || normCat.includes(normalised)) {
      const firstType = Object.keys(yamlData[category])[0] ?? errorClass
      return { category, type: firstType }
    }
  }

  return { category: 'Other', type: errorClass }
}
