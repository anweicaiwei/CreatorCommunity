<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { marked } from 'marked'
import { ArrowLeft } from '@element-plus/icons-vue'

const router = useRouter()
const htmlContent = ref('')
const loading = ref(true)
const error = ref(null)

onMounted(async () => {
  try {
    const res = await fetch('/CreatorCommunity/user-manual.md')
    if (!res.ok) throw new Error(`加载失败 (${res.status})`)
    const md = await res.text()

    marked.setOptions({
      breaks: true,
      gfm: true
    })

    htmlContent.value = marked.parse(md)
    loading.value = false
  } catch (e) {
    error.value = e.message
    loading.value = false
  }
})

function goBack() {
  router.replace('/CreatorCommunity')
}
</script>

<template>
  <div class="manual-page">
    <div class="manual-header">
      <el-button type="primary" plain size="small" @click="goBack">
        <el-icon><ArrowLeft /></el-icon>
        返回首页
      </el-button>
      <h1 class="manual-title">用户手册</h1>
    </div>

    <el-card class="manual-card">
      <div v-if="loading" class="manual-loading">
        <el-icon class="is-loading"><el-icon-loading /></el-icon>
        <span>加载手册中...</span>
      </div>

      <el-alert v-else-if="error" type="error" :title="error" :closable="false" show-icon>
        <p>请确保用户手册文件存在于 <code>public/user-manual.md</code></p>
      </el-alert>

      <!-- eslint-disable-next-line vue/no-v-html -->
      <div v-else class="manual-content" v-html="htmlContent" />
    </el-card>
  </div>
</template>

<style scoped>
.manual-page {
  max-width: 960px;
  margin: 0 auto;
  padding: 24px;
}

.manual-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.manual-title {
  margin: 0;
  font-size: 24px;
  color: #1e1b4b;
}

.manual-card {
  min-height: 60vh;
}

.manual-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 60px 0;
  color: #909399;
}

.manual-content {
  line-height: 1.8;
  color: #303133;
}

.manual-content :deep(h1) {
  font-size: 28px;
  color: #1a365d;
  border-bottom: 2px solid #e2e8f0;
  padding-bottom: 8px;
  margin-top: 40px;
  margin-bottom: 16px;
}

.manual-content :deep(h2) {
  font-size: 22px;
  color: #1e1b4b;
  margin-top: 32px;
  margin-bottom: 12px;
}

.manual-content :deep(h3) {
  font-size: 18px;
  color: #3182ce;
  margin-top: 24px;
  margin-bottom: 8px;
}

.manual-content :deep(h4) {
  font-size: 16px;
  color: #4a5568;
  margin-top: 20px;
  margin-bottom: 6px;
}

.manual-content :deep(p) {
  margin: 8px 0;
}

.manual-content :deep(a) {
  color: #6366f1;
  text-decoration: none;
}

.manual-content :deep(a:hover) {
  text-decoration: underline;
}

.manual-content :deep(ul),
.manual-content :deep(ol) {
  padding-left: 24px;
  margin: 8px 0;
}

.manual-content :deep(li) {
  margin: 4px 0;
}

.manual-content :deep(code) {
  background: #f0f4f8;
  color: #e53e3e;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 14px;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
}

.manual-content :deep(pre) {
  background: #1a202c;
  color: #e2e8f0;
  padding: 16px;
  border-radius: 8px;
  overflow-x: auto;
  margin: 12px 0;
}

.manual-content :deep(pre code) {
  background: none;
  color: inherit;
  padding: 0;
  font-size: 13px;
}

.manual-content :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 12px 0;
  font-size: 14px;
}

.manual-content :deep(th),
.manual-content :deep(td) {
  border: 1px solid #e2e8f0;
  padding: 8px 12px;
  text-align: left;
}

.manual-content :deep(th) {
  background: #f0f4f8;
  color: #2c5282;
  font-weight: 600;
}

.manual-content :deep(tr:nth-child(even)) {
  background: #fafbfc;
}

.manual-content :deep(hr) {
  border: none;
  border-top: 1px solid #e2e8f0;
  margin: 24px 0;
}

.manual-content :deep(blockquote) {
  border-left: 4px solid #6366f1;
  margin: 12px 0;
  padding: 8px 16px;
  background: #f0f4f8;
  border-radius: 0 4px 4px 0;
  color: #4a5568;
}

.manual-content :deep(img) {
  max-width: 100%;
  border-radius: 8px;
}

@media (max-width: 768px) {
  .manual-page {
    padding: 12px;
  }

  .manual-content :deep(table) {
    display: block;
    overflow-x: auto;
    white-space: nowrap;
  }
}
</style>
