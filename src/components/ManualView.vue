<script setup>
import { ref, onMounted, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import MarkdownIt from 'markdown-it'
import { ArrowLeft, Sunny, Moon } from '@element-plus/icons-vue'
import { setLocale } from '@/locales'

const htmlContent = ref('')
const loading = ref(true)
const error = ref(null)
const manualCache = new Map()
const pendingFetches = new Map()
const route = useRoute()
const router = useRouter()
const { t, locale } = useI18n()
const currentLang = ref(locale.value)

const STORAGE_KEY = 'creatorcommunity-dark-mode'
const isDark = ref(localStorage.getItem(STORAGE_KEY) === 'true')

function toggleDark() {
  isDark.value = !isDark.value
  if (isDark.value) {
    document.documentElement.classList.add('dark')
    localStorage.setItem(STORAGE_KEY, 'true')
  } else {
    document.documentElement.classList.remove('dark')
    localStorage.setItem(STORAGE_KEY, 'false')
  }
} 

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\u4e00-\u9fa5-]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
    .replace(/^-+|-+$/g, '')
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

async function scrollToHash() {
  await nextTick()

  const hash = window.location.hash
  if (hash) {
    const id = decodeURIComponent(hash.slice(1))
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }
}

async function fetchManualHtml(lang) {
  if (manualCache.has(lang)) return manualCache.get(lang)
  if (pendingFetches.has(lang)) return pendingFetches.get(lang)

  const fileName = lang === 'zh' ? 'user-manual.zh.md' : 'user-manual.en.md'
  const request = fetch(`/CreatorCommunity/${fileName}`)
    .then(async (res) => {
      if (!res.ok) throw new Error(`加载失败 (${res.status})`)
      const markdownText = await res.text()
      const renderedHtml = md.render(markdownText)
      manualCache.set(lang, renderedHtml)
      return renderedHtml
    })
    .finally(() => {
      pendingFetches.delete(lang)
    })

  pendingFetches.set(lang, request)
  return request
}

async function prefetchManual(lang) {
  try {
    await fetchManualHtml(lang)
  } catch {
    // Background prefetch failures should not disturb the current view.
  }
}

// 加载对应语言的手册
async function loadManual(lang) {
  error.value = null

  if (manualCache.has(lang)) {
    htmlContent.value = manualCache.get(lang)
    loading.value = false
    await scrollToHash()
    return
  }

  loading.value = true

  try {
    htmlContent.value = await fetchManualHtml(lang)
    loading.value = false
    await scrollToHash()
    prefetchManual(lang === 'zh' ? 'en' : 'zh')
  } catch (e) {
    error.value = e.message
    loading.value = false
  }
}

// 处理内容点击（事件委托）
function handleContentClick(e) {
  const link = e.target.closest('a')
  if (!link) return
  
  const href = link.getAttribute('href')
  if (href === './user-manual.zh.md' || href === './user-manual.en.md') {
    e.preventDefault()
    const targetLang = href.includes('zh') ? 'zh' : 'en'
    setLocale(targetLang)
    router.push(`/CreatorCommunity/manual-${targetLang}`)
  }
}

function switchLocale(value) {
  setLocale(value)
  router.push(`/CreatorCommunity/manual-${value}`)
}

// 监听语言变化
watch(locale, (newLang) => {
  currentLang.value = newLang
  loadManual(newLang)
})

watch(() => route.path, (path) => {
  const routeLang = path.endsWith('manual-en') ? 'en' : path.endsWith('manual-zh') ? 'zh' : locale.value
  if (routeLang !== locale.value) setLocale(routeLang)
})

onMounted(() => {
  if (isDark.value) {
    document.documentElement.classList.add('dark')
  }
  const routeLang = route.path.endsWith('manual-en') ? 'en' : route.path.endsWith('manual-zh') ? 'zh' : locale.value
  setLocale(routeLang)
  loadManual(routeLang)
  prefetchManual(routeLang === 'zh' ? 'en' : 'zh')
})
</script>

<template>
  <div class="manual-page">
    <div class="manual-header">
      <router-link class="manual-link" to="/CreatorCommunity">
        <el-icon><ArrowLeft /></el-icon>
        <span>{{ t('modules.manual.back_home') }}</span>
      </router-link>
      <h1 class="manual-title">{{ t('modules.manual.title') }}</h1>
      <el-segmented
        class="language-switch"
        :model-value="locale"
        :options="[
          { label: t('common.language.zh'), value: 'zh' },
          { label: t('common.language.en'), value: 'en' }
        ]"
        @update:model-value="switchLocale"
      />
      <button class="theme-toggle" @click="toggleDark" :title="isDark ? t('common.button.switch_light') : t('common.button.switch_dark')">
        <el-icon size="18"><Sunny v-if="isDark" /><Moon v-else /></el-icon>
      </button>
    </div>

    <el-card class="manual-card">
      <div v-if="loading" class="manual-loading">
        <el-icon class="loading-icon" :size="32"><el-icon-loading /></el-icon>
        <span>{{ t('modules.manual.loading') }}</span>
      </div>

      <el-alert v-else-if="error" type="error" :title="error" :closable="false" show-icon>
        <p>{{ t('modules.manual.missing') }} <code>public/user-manual.{{ currentLang }}.md</code></p>
      </el-alert>

      <!-- eslint-disable-next-line vue/no-v-html -->
      <div 
        v-else 
        class="manual-content" 
        v-html="htmlContent"
        @click="handleContentClick"
      />
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

.theme-toggle {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: 1px solid rgba(99, 102, 241, 0.3);
  background: rgba(99, 102, 241, 0.06);
  color: #6366f1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.language-switch {
  --el-segmented-item-selected-bg-color: var(--color-primary);
  --el-segmented-item-selected-color: var(--color-text-inverse);
  flex-shrink: 0;
}

.theme-toggle:hover {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border-color: transparent;
  color: #fff;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.25);
}

html.dark .theme-toggle {
  background: rgba(99, 102, 241, 0.15);
  color: #a5b4fc;
  border-color: rgba(99, 102, 241, 0.3);
}

html.dark .theme-toggle:hover {
  background: linear-gradient(135deg, #818cf8, #a78bfa);
  color: #fff;
}

html.dark .manual-content {
  color: #e2e8f0;
}

html.dark .manual-content :deep(h1) {
  color: #a5b4fc;
  border-bottom-color: rgba(165, 180, 252, 0.2);
}

html.dark .manual-content :deep(h2) {
  color: #c4b5fd;
}

html.dark .manual-content :deep(h3) {
  color: #a5b4fc;
}

html.dark .manual-content :deep(h4) {
  color: #94a3b8;
}

html.dark .manual-content :deep(a) {
  color: #a5b4fc;
}

html.dark .manual-content :deep(code) {
  background: rgba(165, 180, 252, 0.1);
  color: #a5b4fc;
}

html.dark .manual-content :deep(pre) {
  background: #0f172a;
  color: #e2e8f0;
}

html.dark .manual-content :deep(th),
html.dark .manual-content :deep(td) {
  border-color: rgba(165, 180, 252, 0.2);
}

html.dark .manual-content :deep(th) {
  background: rgba(165, 180, 252, 0.06);
  color: #a5b4fc;
}

html.dark .manual-content :deep(tr:nth-child(even)) {
  background: rgba(165, 180, 252, 0.03);
}

html.dark .manual-content :deep(blockquote) {
  border-left-color: #818cf8;
  background: rgba(129, 140, 248, 0.06);
  color: #94a3b8;
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
