<script setup>
import { Link, Delete } from '@element-plus/icons-vue'
import Card from '@/components/card.vue'

defineProps({
  txList: Array,
  blockExplorer: String
})

const emit = defineEmits(['clear'])

function shortenHash(hash) {
  if (!hash) return ''
  return hash.slice(0, 10) + '...' + hash.slice(-8)
}

function formatTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
</script>

<template>
  <Card title="交易历史" icon="List">
    <template #header>
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span style="font-weight: 600; color: #2c5282;">交易历史</span>
        <el-button size="small" text @click="emit('clear')">
          <el-icon><Delete /></el-icon>
          清空
        </el-button>
      </div>
    </template>
    <el-table :data="txList" size="small" border stripe>
      <el-table-column prop="label" label="交易类型" width="140" />
      <el-table-column label="交易哈希" width="200">
        <template #default="{ row }">
          <el-text class="mono" size="small">{{ shortenHash(row.hash) }}</el-text>
        </template>
      </el-table-column>
      <el-table-column label="时间" width="170">
        <template #default="{ row }">
          <el-text size="small">{{ formatTime(row.timestamp) }}</el-text>
        </template>
      </el-table-column>
      <el-table-column label="详情" width="60">
        <template #default="{ row }">
          <el-link v-if="blockExplorer" :href="`${blockExplorer}/tx/${row.hash}`" target="_blank" size="small">
            <el-icon><Link /></el-icon>
          </el-link>
        </template>
      </el-table-column>
    </el-table>
  </Card>
</template>

<style scoped>
.mono { font-family: monospace; }
</style>
