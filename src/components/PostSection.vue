<script setup>
import { EditPen, Refresh, ChatLineSquare } from '@element-plus/icons-vue'
import Card from '@/components/card.vue'
import { computed } from 'vue'

defineProps({
  canInteract: Boolean,
  writeLoading: Boolean,
  postLoading: Boolean,
  postList: Array,
  readData: Object
})

const emit = defineEmits(['reward-post', 'reward-comment', 'refresh-posts'])
</script>

<template>
  <Card title="社区互动" icon="ChatDotRound">
    <div class="action-group">
      <h3>发帖奖励</h3>
      <el-button
        type="primary"
        :disabled="!canInteract || writeLoading"
        @click="emit('reward-post')"
      >
        <el-icon><EditPen /></el-icon>
        <span>发帖</span>
      </el-button>
      <el-text v-if="readData.postCooldown" size="small" type="info" style="margin-left: 8px;">
        {{ readData.postCooldown }}
      </el-text>
    </div>

    <div class="action-group" style="margin-top: 16px;">
      <h3>帖子列表</h3>
      <el-button size="small" :loading="postLoading" @click="emit('refresh-posts')">
        <el-icon :class="{ isRotating: postLoading }"><Refresh /></el-icon>
        <span>{{ postLoading ? '加载中...' : '刷新' }}</span>
      </el-button>

      <el-empty v-if="postList.length === 0 && !postLoading" description="暂无帖子" :image-size="40" />

      <div v-for="post in postList" :key="post.postId" class="post-item">
        <el-space>
          <el-tag size="small">#{{ post.postId }}</el-tag>
          <el-text size="small">{{ post.authorShort }}</el-text>
        </el-space>
        <el-button size="small" :disabled="!canInteract || writeLoading" @click="emit('reward-comment', post.author, post.postId)">
          <el-icon><ChatLineSquare /></el-icon>
          评论
        </el-button>
      </div>
    </div>
  </Card>
</template>

<style scoped>
.action-group h3 { margin: 0 0 8px 0; font-size: 14px; color: #2c5282; }
.post-item { display: flex; align-items: center; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e4f2fe; }
.post-item:last-child { border-bottom: none; }
.isRotating { animation: rotating 1s linear infinite; }
@keyframes rotating {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
