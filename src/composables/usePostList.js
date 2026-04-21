import { ref } from 'vue'
import { shortenAddress } from '@/utils/format'

const posts = ref([])
const loading = ref(false)

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

  return { posts, loading, fetchPosts, clearPosts }
}
