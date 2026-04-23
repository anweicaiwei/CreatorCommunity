<script setup>
import { EditPen, Refresh, ChatLineSquare, List } from '@element-plus/icons-vue'
import Card from '@/components/card.vue'

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
    <!-- 发帖奖励 -->
    <div class="reward-card">
      <div class="reward-card-header">
        <div class="reward-card-icon">
          <el-icon><EditPen /></el-icon>
        </div>
        <div class="reward-card-info">
          <span class="reward-card-title">发帖奖励</span>
          <span class="reward-card-desc">发布内容获得 CTK 奖励</span>
        </div>
      </div>
      <div class="reward-action-row">
        <el-button :disabled="!canInteract || writeLoading" @click="emit('reward-post')" class="post-action-btn">
          <el-icon><EditPen /></el-icon>
          <span>发帖</span>
        </el-button>
        <el-tag v-if="readData.postCooldown" type="info" effect="plain">
          {{ readData.postCooldown }}
        </el-tag>
      </div>
    </div>

    <!-- 帖子列表 -->
    <div class="reward-card">
      <div class="reward-card-header">
        <div class="reward-card-icon reward-card-icon--secondary">
          <el-icon><List /></el-icon>
        </div>
        <div class="reward-card-info">
          <span class="reward-card-title">帖子列表</span>
          <span class="reward-card-desc">浏览并参与社区互动</span>
        </div>
        <el-button size="small" :loading="postLoading" @click="emit('refresh-posts')" style="margin-left: auto;" class="post-refresh-btn">
          <span>{{ postLoading ? '加载中...' : '刷新' }}</span>
        </el-button>
      </div>
      
      <el-scrollbar v-if="postList.length > 0" class="post-scrollbar">
        <div class="post-list">
          <div v-for="post in postList" :key="post.postId" class="post-item">
            <div class="post-info">
              <el-tag size="small" type="info">POST_ID: {{ post.postId }}</el-tag>
              <el-text size="small" type="info">作者：{{ post.authorShort }}</el-text>
            </div>
            <el-button size="small" @click="emit('reward-comment', post.author, post.postId)" class="post-action-btn post-action-btn--small">
              <el-icon><ChatLineSquare /></el-icon>
              评论
            </el-button>
          </div>
        </div>
      </el-scrollbar>
      <el-empty v-else-if="!postLoading" description="暂无帖子" :image-size="40" />
    </div>
  </Card>
</template>

<style scoped>
.reward-card {
  background: #f8fafc;
  border: 1px solid rgba(99, 102, 241, 0.15);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 14px;
  transition: all 0.2s ease;
}

.reward-card:last-child {
  margin-bottom: 0;
}

.reward-card:hover {
  border-color: rgba(99, 102, 241, 0.3);
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.1);
}

.reward-card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}

.reward-card-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  background: rgba(99, 102, 241, 0.1);
  color: #6366f1;
}

.reward-card-icon--secondary {
  background: rgba(139, 92, 246, 0.1);
  color: #8b5cf6;
}

.reward-card-icon--accent {
  background: rgba(6, 182, 212, 0.1);
  color: #06b6d4;
}

.reward-card-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.reward-card-title {
  font-size: 14px;
  font-weight: 600;
  color: #1e1b4b;
}

.reward-card-desc {
  font-size: 12px;
  color: #64748b;
}

.reward-action-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.post-scrollbar {
  height: 0;
  flex: 1 1 auto;
  overflow: hidden;
  min-height: 200px;
}

.post-scrollbar :deep(.el-scrollbar__view) {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  height: 100%;
  padding: 4px;
  box-sizing: border-box;
}

.post-scrollbar :deep(.el-scrollbar__wrap) {
  overflow-x: hidden;
  overflow-y: auto;
  height: 100%;
}

.post-action-btn {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%) !important;
  border: none !important;
  color: #fff !important;
  font-weight: 500;
}

.post-action-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #818cf8 0%, #a78bfa 100%) !important;
}

.post-action-btn--small {
  background: rgba(99, 102, 241, 0.1) !important;
  border: 1px solid rgba(99, 102, 241, 0.2) !important;
  color: #6366f1 !important;
}

.post-action-btn--small:hover:not(:disabled) {
  background: rgba(99, 102, 241, 0.2) !important;
}

.post-refresh-btn {
  background: rgba(99, 102, 241, 0.1) !important;
  border: 1px solid rgba(99, 102, 241, 0.2) !important;
  color: #6366f1 !important;
}

.post-refresh-btn:hover:not(:disabled) {
  background: rgba(99, 102, 241, 0.2) !important;
}

.post-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.post-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  background: #fff;
  border: 1px solid rgba(99, 102, 241, 0.1);
  border-radius: 10px;
  transition: all 0.2s ease;
}

.post-item:hover {
  border-color: rgba(99, 102, 241, 0.3);
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.1);
  transform: translateY(-1px);
}

.post-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.isRotating { animation: rotating 1s linear infinite; }
@keyframes rotating {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>