import { computed } from 'vue'
import { createI18n } from 'vue-i18n'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import en from 'element-plus/es/locale/lang/en'

import zhCommon from './zh/common.json'
import zhWallet from './zh/modules/wallet.json'
import zhDeploy from './zh/modules/deploy.json'
import zhPost from './zh/modules/post.json'
import zhComment from './zh/modules/comment.json'
import zhReward from './zh/modules/reward.json'
import zhNft from './zh/modules/nft.json'
import zhTransfer from './zh/modules/transfer.json'
import zhAdmin from './zh/modules/admin.json'
import zhChainData from './zh/modules/chain_data.json'
import zhTxHistory from './zh/modules/tx_history.json'
import zhManual from './zh/modules/manual.json'

import enCommon from './en/common.json'
import enWallet from './en/modules/wallet.json'
import enDeploy from './en/modules/deploy.json'
import enPost from './en/modules/post.json'
import enComment from './en/modules/comment.json'
import enReward from './en/modules/reward.json'
import enNft from './en/modules/nft.json'
import enTransfer from './en/modules/transfer.json'
import enAdmin from './en/modules/admin.json'
import enChainData from './en/modules/chain_data.json'
import enTxHistory from './en/modules/tx_history.json'
import enManual from './en/modules/manual.json'

export const LOCALE_STORAGE_KEY = 'creatorcommunity_locale'
export const SUPPORTED_LOCALES = ['zh', 'en']

function getInitialLocale() {
  const saved = localStorage.getItem(LOCALE_STORAGE_KEY)
  return SUPPORTED_LOCALES.includes(saved) ? saved : 'zh'
}

const messages = {
  zh: {
    common: zhCommon,
    modules: {
      wallet: zhWallet,
      deploy: zhDeploy,
      post: zhPost,
      comment: zhComment,
      reward: zhReward,
      nft: zhNft,
      transfer: zhTransfer,
      admin: zhAdmin,
      chain_data: zhChainData,
      tx_history: zhTxHistory,
      manual: zhManual
    }
  },
  en: {
    common: enCommon,
    modules: {
      wallet: enWallet,
      deploy: enDeploy,
      post: enPost,
      comment: enComment,
      reward: enReward,
      nft: enNft,
      transfer: enTransfer,
      admin: enAdmin,
      chain_data: enChainData,
      tx_history: enTxHistory,
      manual: enManual
    }
  }
}

export const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: getInitialLocale(),
  fallbackLocale: 'zh',
  messages
})

export const elementPlusLocale = computed(() => i18n.global.locale.value === 'en' ? en : zhCn)

export function setLocale(locale) {
  if (!SUPPORTED_LOCALES.includes(locale)) return
  i18n.global.locale.value = locale
  localStorage.setItem(LOCALE_STORAGE_KEY, locale)
  document.documentElement.lang = locale === 'en' ? 'en' : 'zh-CN'
}

export function t(key, params) {
  return i18n.global.t(key, params)
}

setLocale(i18n.global.locale.value)
