<script setup>
import { SwitchButton, Connection } from '@element-plus/icons-vue'
import Card from '@/components/card.vue'

defineProps({
  isConnected: Boolean,
  isInitializing: Boolean,
  isCorrectNetwork: Boolean,
  isOwner: Boolean,
  currentNetwork: Object,
  account: String,
  error: String
})

const emit = defineEmits(['connect', 'disconnect', 'switch-network'])
</script>

<template>
  <Card title="钱包" icon="Wallet">
    <div v-if="!isConnected">
      <el-button
        type="primary"
        :loading="isInitializing"
        @click="emit('connect')"
      >
        {{ isInitializing ? '连接中...' : '连接 MetaMask' }}
      </el-button>
      <el-text v-if="error" type="danger" size="small">{{ error }}</el-text>
    </div>
    <div v-else>
      <el-descriptions :column="3" border size="small">
        <el-descriptions-item label="地址" class="mono">{{ account }}</el-descriptions-item>
        <el-descriptions-item label="网络">
          <el-tag :type="isCorrectNetwork ? 'success' : 'danger'" size="small">
            {{ currentNetwork?.name }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="管理员">
          <el-tag :type="isOwner ? 'warning' : 'info'" size="small">
            {{ isOwner ? '是' : '否' }}
          </el-tag>
        </el-descriptions-item>
      </el-descriptions>
      <el-space class="wallet-actions" style="margin-top: 12px;">
        <el-button
          v-if="!isCorrectNetwork"
          type="warning"
          size="small"
          @click="emit('switch-network')"
        >
          <el-icon><SwitchButton /></el-icon>
          <span>切换网络</span>
        </el-button>
        <el-button size="small" @click="emit('disconnect')">
          <el-icon><Connection /></el-icon>
          <span>断开连接</span>
        </el-button>
      </el-space>
      <el-text v-if="error" type="danger" size="small">{{ error }}</el-text>
    </div>
  </Card>
</template>

<style scoped>
.mono { font-family: monospace; word-break: break-all; }
.wallet-actions { justify-content: flex-end; }
</style>
