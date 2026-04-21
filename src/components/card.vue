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
  --el-card-border-color: #e4f2fe;
  --el-card-header-padding: 16px 20px;
  --el-card-padding: 20px;
  border: 1px solid #e4f2fe;
  border-radius: 12px;
  background: linear-gradient(135deg, #f0f8ff 0%, #ffffff 100%);
  transition: box-shadow 0.3s, border-color 0.3s;
}

.light-card:hover {
  border-color: #b0d8ff;
  box-shadow: 0 4px 16px rgba(176, 216, 255, 0.35);
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
