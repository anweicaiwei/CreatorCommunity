<script setup>
import { Promotion, Avatar } from '@element-plus/icons-vue'
import Card from '@/components/card.vue'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

defineProps({
  canInteract: Boolean,
  writeLoading: Boolean
})

const emit = defineEmits(['ctk-transfer', 'nft-transfer'])

const transferTo = ref('')
const transferAmount = ref('')
const nftTransferTo = ref('')
const nftTransferTokenId = ref(0)
</script>

<template>
  <Card :title="t('modules.transfer.title')" icon="Switch">
    <div class="action-group">
      <h3>{{ t('modules.transfer.ctk') }}</h3>
      <el-space wrap>
        <el-input v-model="transferTo" :placeholder="t('common.label.receiver_address')" size="small" style="width: 200px;" />
        <el-input v-model="transferAmount" :placeholder="t('common.label.amount_ctk')" size="small" style="width: 140px;" />
        <el-button type="primary" size="small" :disabled="!canInteract || writeLoading" @click="emit('ctk-transfer', transferTo, transferAmount)">
          <el-icon><Promotion /></el-icon>
          {{ t('modules.transfer.button.ctk_transfer') }}
        </el-button>
      </el-space>
    </div>

    <div class="action-group" style="margin-top: 16px;">
      <h3>{{ t('modules.transfer.nft') }}</h3>
      <el-space wrap>
        <el-input v-model="nftTransferTo" :placeholder="t('common.label.receiver_address')" size="small" style="width: 200px;" />
        <el-input-number v-model="nftTransferTokenId" :min="0" :precision="0" controls-position="right" size="small" :placeholder="t('common.label.token_id')" style="width: 160px;" />
        <el-button size="small" :disabled="!canInteract || writeLoading" @click="emit('nft-transfer', nftTransferTo, nftTransferTokenId)">
          <el-icon><Avatar /></el-icon>
          {{ t('modules.transfer.button.nft_transfer') }}
        </el-button>
      </el-space>
    </div>
  </Card>
</template>

<style scoped>
.action-group h3 { margin: 0 0 8px 0; font-size: 14px; color: var(--color-text); }
</style>
