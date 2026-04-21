<script setup>
import { CircleCheck, CircleClose, Loading } from '@element-plus/icons-vue'
import Card from '@/components/card.vue'

defineProps({
  writeResult: String,
  writeError: String,
  writeLoading: Boolean,
  txHash: String,
  txLoading: Boolean,
  blockExplorer: String
})
</script>

<template>
  <Card title="交易结果" icon="Document">
    <el-text v-if="writeLoading" type="warning">
      <el-icon class="is-loading" style="margin-right: 4px;"><Loading /></el-icon>
      交易提交中，等待确认...
    </el-text>
    <el-text v-if="writeResult" type="success" size="small">
      <el-icon><CircleCheck /></el-icon>
      {{ writeResult }}
    </el-text>
    <el-text v-if="writeError" type="danger" size="small">
      <el-icon><CircleClose /></el-icon>
      {{ writeError }}
    </el-text>
    <div v-if="txHash && blockExplorer" style="margin-top: 8px;">
      <el-link :href="`${blockExplorer}/tx/${txHash}`" target="_blank" type="primary" size="small">
        查看交易详情
      </el-link>
      <el-text v-if="txLoading" type="info" size="small" style="margin-left: 8px;">
        （交易尚未确认，Etherscan 可能暂未收录）
      </el-text>
    </div>
  </Card>
</template>
