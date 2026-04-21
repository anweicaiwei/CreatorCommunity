import { ref } from 'vue'
import { shortenAddress } from '@/utils/format'

const posts = ref([])
const loading = ref(false)
const cacheLoaded = ref(false)

function getCacheKey(chainId, tokenAddr) {
  return `creatorcommunity_${chainId}_${tokenAddr}_posts`
}

function savePostsCache(chainId, tokenAddr) {
  if (!chainId || !tokenAddr) return
  const key = getCacheKey(chainId, tokenAddr)
  try {
    localStorage.setItem(key, JSON.stringify({ data: posts.value, ts: Date.now() }))
  } catch {}
}

function loadPostsCache(chainId, tokenAddr) {
  if (!chainId || !tokenAddr) return null
  const key = getCacheKey(chainId, tokenAddr)
  try {
    const raw = localStorage.getItem(key)
    if (raw) return JSON.parse(raw)
  } catch {}
  return null
}

export function usePostList() {
  async function fetchPosts(tokenContractRead) {
    if (!tokenContractRead) return
    loading.value = true
    try {
      const total = Number(await tokenContractRead.postIdCounter())
      if (total === 0) {
        posts.value = []
        return
      }
      const list = []
      for (let i = 0; i < total; i++) {
        const author = await tokenContractRead.postAuthor(i)
        list.push({
          postId: i,
          author: author,
          authorShort: shortenAddress(author)
        })
      }
      posts.value = list.reverse()
    } catch (e) {
      console.error('fetchPosts error:', e)
    } finally {
      loading.value = false
    }
  }

  function clearPosts() {
    posts.value = []
  }

  return { posts, loading, cacheLoaded, fetchPosts, clearPosts, savePostsCache, loadPostsCache }
}
