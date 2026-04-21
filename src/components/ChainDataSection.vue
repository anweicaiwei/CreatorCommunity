<script setup>
import { computed } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import Card from '@/components/card.vue'

const props = defineProps({
  readData: Object,
  readError: String,
  readLoading: Boolean,
  labelMap: Object
})

const emit = defineEmits(['refresh'])

const formattedRows = computed(() =>
  Object.entries(props.readData).map(([key, val]) => ({
    label: props.labelMap[key] || key,
    value: typeof val === 'boolean' ? (val ? '是' : '否') : val
  }))
)
</script>

<template>
  <Card title="当前账户相关信息" icon="DataAnalysis">
    <el-button type="primary" size="small" :loading="readLoading" @click="emit('refresh')">
      <el-icon :class="{ isRotating: readLoading }"><Refresh /></el-icon>
      <span>{{ readLoading ? '加载中...' : '刷新数据' }}</span>
    </el-button>
    <el-text v-if="readError" type="danger" size="small">{{ readError }}</el-text>
    <el-table v-if="Object.keys(readData).length" :data="formattedRows" size="small" border style="margin-top: 12px;">
      <el-table-column prop="label" label="属性" width="160" />
      <el-table-column prop="value" label="值" />
    </el-table>
  </Card>
</template>

<style scoped>
.isRotating { animation: rotating 1s linear infinite; }
@keyframes rotating {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
