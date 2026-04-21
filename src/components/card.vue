<script setup>
defineProps({
  title: { type: String, default: '' },
  icon: { type: String, default: '' }
})

defineSlots()
</script>

<template>
  <el-card class="light-card" shadow="hover">
    <template v-if="title" #header>
      <div class="card-header">
        <el-icon v-if="icon" class="card-icon">
          <component :is="icon" />
        </el-icon>
        <span class="card-title">{{ title }}</span>
      </div>
    </template>
    <slot />
  </el-card>
</template>

<style scoped>
.light-card {
  --el-card-header-padding: 16px 20px;
  --el-card-padding: 20px;
  border: 1px solid #d0d7de;
  border-radius: 12px;
  background: #ffffff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: box-shadow 0.3s, border-color 0.3s, transform 0.3s;
  position: relative;
  overflow: hidden;
}

.light-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #409eff, #79b8ff);
  opacity: 0.85;
}

.light-card:hover {
  border-color: #409eff;
  box-shadow: 0 6px 20px rgba(64, 158, 255, 0.18);
  transform: translateY(-2px);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-icon {
  font-size: 20px;
  color: #409eff;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #2c5282;
}
</style>
