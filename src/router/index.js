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
    name: 'manual',
    component: ManualView
  }
]

export const router = createRouter({
  history: createWebHistory(),
  routes
})