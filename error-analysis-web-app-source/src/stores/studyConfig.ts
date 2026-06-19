import { ref } from 'vue'
import { defineStore } from 'pinia'

export interface StudyMetadata {
  siteName: string
  clinicalSetting: string
  conceptExtractionTask: string
  noteType: string
  ehrSystem: string
  modelDescription: string
  evaluatorName: string
  notes: string
}

export const useStudyConfigStore = defineStore('studyConfig', () => {
  const siteName = ref<string>('')
  const clinicalSetting = ref<string>('')
  const conceptExtractionTask = ref<string>('')
  const noteType = ref<string>('')
  const ehrSystem = ref<string>('')
  const modelDescription = ref<string>('')
  const evaluatorName = ref<string>('')
  const notes = ref<string>('')

  function toMetadata(): StudyMetadata {
    return {
      siteName: siteName.value,
      clinicalSetting: clinicalSetting.value,
      conceptExtractionTask: conceptExtractionTask.value,
      noteType: noteType.value,
      ehrSystem: ehrSystem.value,
      modelDescription: modelDescription.value,
      evaluatorName: evaluatorName.value,
      notes: notes.value,
    }
  }

  function fromMetadata(m: Partial<StudyMetadata>) {
    if (m.siteName !== undefined) siteName.value = m.siteName
    if (m.clinicalSetting !== undefined) clinicalSetting.value = m.clinicalSetting
    if (m.conceptExtractionTask !== undefined) conceptExtractionTask.value = m.conceptExtractionTask
    if (m.noteType !== undefined) noteType.value = m.noteType
    if (m.ehrSystem !== undefined) ehrSystem.value = m.ehrSystem
    if (m.modelDescription !== undefined) modelDescription.value = m.modelDescription
    if (m.evaluatorName !== undefined) evaluatorName.value = m.evaluatorName
    if (m.notes !== undefined) notes.value = m.notes
  }

  return {
    siteName, clinicalSetting, conceptExtractionTask, noteType,
    ehrSystem, modelDescription, evaluatorName, notes,
    toMetadata, fromMetadata,
  }
})
