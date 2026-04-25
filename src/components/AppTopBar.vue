<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  QuestionFilled,
  ArrowLeft,
  Sunny,
  Moon
} from '@element-plus/icons-vue'
import languageSwitchIconRaw from '@/assets/icons/LanguageSwitch.svg?raw'
import githubIconRaw from '@/assets/icons/github.svg?raw'

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  navTo: {
    type: String,
    required: true
  },
  navLabel: {
    type: String,
    required: true
  },
  navIcon: {
    type: String,
    default: 'manual'
  },
  locale: {
    type: String,
    required: true
  },
  isDark: {
    type: Boolean,
    required: true
  },
  githubUrl: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['switch-locale', 'toggle-dark'])

const { t } = useI18n()
const languageMenuOpen = ref(false)

const navIconComponent = computed(() => {
  return props.navIcon === 'back' ? ArrowLeft : QuestionFilled
})

function normalizeSvgMarkup(svg) {
  return svg
    .replace(/<\?xml[\s\S]*?\?>/gi, '')
    .replace(/<!DOCTYPE[\s\S]*?>/gi, '')
    .replace(/\s(?:width|height)="[^"]*"/gi, '')
    .replace(/\sfill="[^"]*"/gi, '')
    .replace(/<svg\b/gi, '<svg aria-hidden="true" focusable="false"')
}

const localeOptions = computed(() => ([
  { label: t('common.language.zh'), value: 'zh' },
  { label: t('common.language.en'), value: 'en' }
]))

const languageSwitchSvg = computed(() => normalizeSvgMarkup(languageSwitchIconRaw))
const githubSvg = computed(() => normalizeSvgMarkup(githubIconRaw))
const themeActionLabel = computed(() => (
  props.isDark ? t('common.button.switch_light') : t('common.button.switch_dark')
))
const languageActionLabel = computed(() => t('common.button.switch_language'))
const githubActionLabel = computed(() => t('common.button.open_repository'))

function handleLocaleSwitch(value) {
  emit('switch-locale', value)
  languageMenuOpen.value = false
}

function openGithub() {
  if (!props.githubUrl) return
  window.open(props.githubUrl, '_blank', 'noopener,noreferrer')
}
</script>

<template>
  <header class="app-topbar">
    <div class="topbar-leading">
      <router-link class="nav-link" :to="navTo">
        <el-icon><component :is="navIconComponent" /></el-icon>
        <span>{{ navLabel }}</span>
      </router-link>
      <h1 class="app-title">{{ title }}</h1>
    </div>

    <div class="header-actions">
      <button
        class="theme-toggle"
        type="button"
        :aria-label="themeActionLabel"
        @click="emit('toggle-dark')"
      >
        <span class="theme-toggle__thumb">
          <el-icon><Moon v-if="isDark" /><Sunny v-else /></el-icon>
        </span>
      </button>

      <el-popover
        v-model:visible="languageMenuOpen"
        placement="bottom-end"
        trigger="click"
        :width="220"
        popper-class="topbar-popover"
      >
        <template #reference>
          <button
            class="icon-action"
            type="button"
            :aria-label="languageActionLabel"
          >
            <span class="icon-action__svg" v-html="languageSwitchSvg" />
          </button>
        </template>

        <div class="locale-menu">
          <button
            v-for="option in localeOptions"
            :key="option.value"
            type="button"
            class="locale-menu__item"
            :class="{ 'is-active': option.value === locale }"
            @click="handleLocaleSwitch(option.value)"
          >
            {{ option.label }}
          </button>
        </div>
      </el-popover>

      <button
        class="icon-action"
        :class="{ 'is-disabled': !githubUrl }"
        type="button"
        :aria-label="githubActionLabel"
        @click="openGithub"
      >
        <span class="icon-action__svg" v-html="githubSvg" />
      </button>
    </div>
  </header>
</template>

<style scoped>
.app-topbar {
  position: sticky;
  top: 12px;
  z-index: 40;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 20px;
  margin-bottom: 24px;
  padding: 14px 18px;
  background: var(--gradient-surface);
  border: 1px solid var(--color-border);
  border-radius: 14px;
  box-shadow: var(--shadow-sm);
  backdrop-filter: blur(16px);
  transition: background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
}

.topbar-leading {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 16px;
  min-width: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  min-width: fit-content;
}

.app-title {
  margin: 0;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 0;
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.nav-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  padding: 8px 16px;
  border: 1px solid var(--color-border-hover);
  border-radius: 8px;
  background: rgba(99, 102, 241, 0.06);
  color: var(--color-primary);
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  transition: all 0.2s ease;
}

.nav-link:hover {
  background: var(--gradient-primary);
  border-color: transparent;
  color: var(--color-text-inverse);
  transform: translateY(-1px);
  box-shadow: var(--shadow-primary);
}

.theme-toggle {
  position: relative;
  width: 64px;
  height: 34px;
  padding: 0;
  border: 1px solid var(--color-border-hover);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.5);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.55);
  cursor: pointer;
  transition: all 0.2s ease;
}

.theme-toggle__thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #ffffff;
  color: var(--color-text-soft);
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.12);
  transform: translateX(0);
  transition: transform 0.2s ease, color 0.2s ease, background 0.2s ease;
}

.theme-toggle:hover {
  border-color: var(--color-border-active);
  box-shadow: var(--shadow-sm);
}

.theme-toggle .el-icon {
  font-size: 15px;
}

.icon-action {
  position: relative;
  width: 34px;
  height: 34px;
  padding: 0;
  border: none;
  background: transparent;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-soft);
  text-decoration: none;
  cursor: pointer;
  border-radius: 10px;
  transition: color 0.2s ease, background 0.2s ease, transform 0.2s ease;
}

.icon-action .el-icon {
  font-size: 24px;
}

.icon-action__svg {
  width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 0;
  color: inherit;
}

.icon-action__svg :deep(svg) {
  width: 22px;
  height: 22px;
  display: block;
}

.icon-action__svg :deep(path) {
  fill: currentColor;
}

.icon-action:hover {
  color: var(--color-primary);
  background: rgba(99, 102, 241, 0.08);
  transform: translateY(-1px);
}

.icon-action.is-disabled {
  opacity: 0.5;
  cursor: default;
}

.locale-menu {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.locale-menu__item {
  width: 100%;
  padding: 10px 0;
  border: none;
  background: transparent;
  text-align: left;
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text);
  cursor: pointer;
  transition: color 0.2s ease;
}

.locale-menu__item:hover,
.locale-menu__item.is-active {
  color: var(--color-primary);
}

html.dark .app-topbar {
  border-color: var(--color-border-hover);
  box-shadow: var(--shadow-md);
}

html.dark .nav-link {
  color: var(--color-primary-hover);
  border-color: rgba(167, 139, 250, 0.4);
  background: rgba(167, 139, 250, 0.12);
}

html.dark .nav-link:hover {
  color: var(--color-text-inverse);
}

html.dark .theme-toggle {
  background: rgba(30, 41, 59, 0.72);
  border-color: rgba(167, 139, 250, 0.35);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

html.dark .theme-toggle__thumb {
  transform: translateX(30px);
  background: rgba(167, 139, 250, 0.18);
  color: var(--color-primary-hover);
  box-shadow: 0 2px 8px rgba(2, 6, 23, 0.32);
}

html.dark .icon-action {
  color: var(--color-text-soft);
}

html.dark .icon-action:hover {
  color: var(--color-primary-hover);
  background: rgba(167, 139, 250, 0.12);
}

@media (max-width: 900px) {
  .app-topbar {
    top: 8px;
    grid-template-columns: 1fr;
    align-items: start;
  }

  .topbar-leading {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .header-actions {
    justify-content: flex-start;
  }
}

@media (max-width: 640px) {
  .app-topbar {
    gap: 14px;
    padding: 14px;
  }

  .topbar-leading {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .app-title {
    width: 100%;
    font-size: 20px;
    white-space: normal;
    overflow: visible;
    text-overflow: clip;
  }
}

:global(.topbar-popover.el-popper) {
  padding: 14px 18px;
  border-radius: 18px;
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-lg);
  background: color-mix(in srgb, var(--color-background-elevated) 94%, white);
}

html.dark :global(.topbar-popover.el-popper) {
  background: color-mix(in srgb, var(--color-background-elevated) 96%, black);
  border-color: var(--color-border-hover);
}
</style>
