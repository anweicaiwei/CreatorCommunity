import { ethers } from 'ethers'
import { DECIMALS } from './constants'
import { t } from '@/locales'

/**
 * @param {bigint|string|number} amount - 链上原始值 (wei)
 * @param {number} displayDecimals - 展示保留小数位数
 * @returns {string}
 */
export function formatTokenAmount(amount, displayDecimals = 2) {
  const formatted = ethers.formatUnits(amount, DECIMALS)
  const num = parseFloat(formatted)
  if (displayDecimals === 0) return Math.round(num).toString()
  return num.toFixed(displayDecimals)
}

/**
 * @param {string|number} value - 用户输入值 (如 "1.5")
 * @returns {bigint}
 */
export function parseTokenAmount(value) {
  return ethers.parseUnits(String(value), DECIMALS)
}

/**
 * @param {string} address - 完整地址
 * @returns {string} 缩略格式 0x1234...5678
 */
export function shortenAddress(address) {
  if (!address) return ''
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

/**
 * @param {bigint|string|number} timestamp - Unix 时间戳 (秒)
 * @returns {string} 本地时间字符串
 */
export function formatTimestamp(timestamp) {
  if (!timestamp) return ''
  const num = Number(timestamp)
  if (num === 0) return ''
  return new Date(num * 1000).toLocaleString()
}

/**
 * @param {bigint|string|number} lastTime - 上次操作时间戳 (秒)
 * @param {number} cooldownMs - 冷却时间 (毫秒)
 * @returns {{ remaining: number, ready: boolean }}
 */
export function getCooldownStatus(lastTime, cooldownMs) {
  const num = Number(lastTime) || 0
  const elapsed = Date.now() - num * 1000
  const remaining = Math.max(0, cooldownMs - elapsed)
  return { remaining, ready: remaining === 0 }
}

/**
 * @param {number} ms - 毫秒
 * @returns {string} 格式化倒计时 mm:ss 或 hh:mm:ss
 */
export function formatCooldown(ms) {
  if (ms <= 0) return '00:00'
  const totalSec = Math.ceil(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  if (min >= 60) {
    const hr = Math.floor(min / 60)
    const remainMin = min % 60
    return `${String(hr).padStart(2, '0')}:${String(remainMin).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

/**
 * @param {number} rank - NFT等级枚举值 (0/1/2)
 * @returns {string}
 */
export function formatNFTRank(rank) {
  const labels = {
    0: t('modules.nft.tier.bronze'),
    1: t('modules.nft.tier.silver'),
    2: t('modules.nft.tier.gold')
  }
  return labels[Number(rank)] || t('modules.nft.tier.unknown')
}
