<template>
  <a-card title="Analysis Summary" class="summary-card">
    <a-row :gutter="16">
      <a-col :span="8">
        <a-statistic
          title="Total Annotations"
          :value="jsonData?.tags?.length || 0"
          :value-style="{ color: '#1890ff' }"
        />
      </a-col>
      <a-col :span="8">
        <a-statistic
          title="False Positives"
          :value="getFalsePositives()"
          :value-style="{ color: '#f5222d' }"
        />
      </a-col>
      <a-col :span="8">
        <a-statistic
          title="False Negatives"
          :value="getFalseNegatives()"
          :value-style="{ color: '#fa8c16' }"
        />
      </a-col>
    </a-row>
  </a-card>
</template>

<script setup lang="ts">
interface Tag {
  _judgement: string
  tag: string
  errors?: Array<{
    category: string
    type: string
  }>
}

interface JsonData {
  tags?: Tag[]
}

interface Props {
  jsonData: JsonData | null
}

const props = defineProps<Props>()

// Analysis functions
function getFalsePositives(): number {
  return props.jsonData?.tags?.filter((tag) => tag._judgement === 'FP').length || 0
}

function getFalseNegatives(): number {
  return props.jsonData?.tags?.filter((tag) => tag._judgement === 'FN').length || 0
}
</script>

<style scoped>
.summary-card {
  border-radius: 8px;
}

:deep(.ant-statistic-title) {
  font-size: 14px;
  color: #6b7280;
}

:deep(.ant-statistic-content) {
  font-size: 24px;
  font-weight: 600;
}
</style>
