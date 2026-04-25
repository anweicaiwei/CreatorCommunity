import { inject, provide } from 'vue'

const communityAppKey = Symbol('community-app')

export function provideCommunityApp(context) {
  provide(communityAppKey, context)
}

export function useCommunityApp() {
  const context = inject(communityAppKey)
  if (!context) {
    throw new Error('Community app context is not available')
  }
  return context
}
