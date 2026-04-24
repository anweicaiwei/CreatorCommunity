<script setup>
import { ref, onMounted, nextTick } from 'vue'
import MarkdownIt from 'markdown-it'
import { ArrowLeft } from '@element-plus/icons-vue'

const htmlContent = ref('')
const loading = ref(true)
const error = ref(null)

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\u4e00-\u9fa5-]+/g, '-') // 保留中文、字母、数字、连字符，其他替换为-
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
    .replace(/^-+|-+$/g, '') // 去掉首尾的连字符
}

const md = new MarkdownIt({
  breaks: true,
  html: true,
  linkify: true,
  typographer: true
})

const defaultRender = md.renderer.rules.heading_open || function(tokens, idx, options, env, self) {
  return self.renderToken(tokens, idx, options)
}

md.renderer.rules.heading_open = function(tokens, idx, options, env, self) {
  const token = tokens[idx]
  let text = ''
  
  for (let i = idx + 1; i < tokens.length; i++) {
    const t = tokens[i]
    if (t.type === 'heading_close') break
    if (t.type === 'inline' && t.children) {
      text = t.children.map(child => child.content || '').join('')
      break
    }
  }
  
  const slug = slugify(typeof text === 'string' ? text : '')
  if (slug) {
    token.attrSet('id', slug)
  }
  return defaultRender(tokens, idx, options, env, self)
}

onMounted(async () => {
  try {
    const res = await fetch('/CreatorCommunity/user-manual.md')
    if (!res.ok) throw new Error(`加载失败 (${res.status})`)
    const markdownText = await res.text()

    htmlContent.value = md.render(markdownText)
    loading.value = false

    await nextTick()
    const hash = window.location.hash
    if (hash) {
      const id = decodeURIComponent(hash.slice(1))
      const el = document.getElementById(id)
      if (el) el.scrollIntoView({ behavior: 'smooth' })
    }
  } catch (e) {
    error.value = e.message
    loading.value = false
  }
})
</script>

<template>
  <div class="manual-page">
    <div class="manual-header">
      <router-link class="manual-link" to="/CreatorCommunity">
        <el-icon><ArrowLeft /></el-icon>
        <span>返回首页</span>
      </router-link>
      <h1 class="manual-title">用户手册</h1>
      <span class="header-spacer"></span>
    </div>

    <el-card class="manual-card">
      <div v-if="loading" class="manual-loading">
        <el-icon class="loading-icon" :size="32"><el-icon-loading /></el-icon>
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
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

.manual-header {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 24px;
  padding: 16px 24px;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.06), rgba(139, 92, 246, 0.06));
  border: 1px solid rgba(99, 102, 241, 0.12);
  border-radius: 14px;
}

.manual-header .manual-title {
  flex: 1;
  text-align: center;
  margin: 0;
}

.header-spacer {
  width: 120px;
}

.manual-title {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.manual-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #6366f1;
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  padding: 8px 16px;
  border: 1px solid rgba(99, 102, 241, 0.3);
  border-radius: 8px;
  background: rgba(99, 102, 241, 0.06);
  transition: all 0.2s ease;
}

.manual-link:hover {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border-color: transparent;
  color: #fff;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.25);
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
  color: #666;
  font-size: 14px;
}

.loading-icon {
  color: #6366f1;
  animation: rotate 1s linear infinite;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.manual-content {
  line-height: 1.8;
  color: #303133;
}

.manual-content :deep(h1) {
  font-size: 28px;
  color: #6366f1;
  border-bottom: 2px solid rgba(99, 102, 241, 0.2);
  padding-bottom: 8px;
  margin-top: 40px;
  margin-bottom: 16px;
}

.manual-content :deep(h2) {
  font-size: 22px;
  color: #8b5cf6;
  margin-top: 32px;
  margin-bottom: 12px;
}

.manual-content :deep(h3) {
  font-size: 18px;
  color: #6366f1;
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
  background: rgba(99, 102, 241, 0.1);
  color: #6366f1;
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
  border: 1px solid rgba(99, 102, 241, 0.2);
  padding: 8px 12px;
  text-align: left;
}

.manual-content :deep(th) {
  background: rgba(99, 102, 241, 0.06);
  color: #6366f1;
  font-weight: 600;
}

.manual-content :deep(tr:nth-child(even)) {
  background: rgba(99, 102, 241, 0.02);
}

.manual-content :deep(hr) {
  border: none;
  border-top: 1px solid rgba(99, 102, 241, 0.2);
  margin: 24px 0;
}

.manual-content :deep(blockquote) {
  border-left: 4px solid #6366f1;
  margin: 12px 0;
  padding: 8px 16px;
  background: rgba(99, 102, 241, 0.06);
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
