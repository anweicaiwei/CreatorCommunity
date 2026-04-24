import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/components/HomeView.vue'
import ManualView from '@/components/ManualView.vue'

const routes = [
  {
    path: '/CreatorCommunity/',
    name: 'home',
    component: HomeView
  },
  {
    path: '/CreatorCommunity/manual',
    redirect: '/CreatorCommunity/manual-zh'
  },
  {
    path: '/CreatorCommunity/manual-zh',
    name: 'manual-zh',
    component: ManualView,
    props: { lang: 'zh' }
  },
  {
    path: '/CreatorCommunity/manual-en',
    name: 'manual-en',
    component: ManualView,
    props: { lang: 'en' }
  },
  {
    path: '/CreatorCommunity/user-manual.zh.md',
    redirect: '/CreatorCommunity/manual-zh'
  },
  {
    path: '/CreatorCommunity/user-manual.en.md',
    redirect: '/CreatorCommunity/manual-en'
  },
  {
    path: '/CreatorCommunity/user-manual.md',
    redirect: '/CreatorCommunity/manual-zh'
  }
]

export const router = createRouter({
  history: createWebHistory(),
  routes
})