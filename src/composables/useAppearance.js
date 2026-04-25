import { ref } from 'vue'

const STORAGE_KEY = 'creatorcommunity-dark-mode'
const isDark = ref(localStorage.getItem(STORAGE_KEY) === 'true')

function applyTheme(value) {
  document.documentElement.classList.toggle('dark', value)
  localStorage.setItem(STORAGE_KEY, value ? 'true' : 'false')
}

function toggleDark() {
  isDark.value = !isDark.value
  applyTheme(isDark.value)
}

function syncDarkMode() {
  applyTheme(isDark.value)
}

export function useAppearance() {
  return {
    isDark,
    toggleDark,
    syncDarkMode
  }
}
