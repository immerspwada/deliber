<script setup lang="ts">
/**
 * Feature: F195 - Admin Header
 * Admin page header with title and actions
 */

interface Props {
  title: string
  subtitle?: string
  showBack?: boolean
}

withDefaults(defineProps<Props>(), {
  showBack: false
})

const emit = defineEmits<{
  back: []
}>()
</script>

<template>
  <div class="admin-header">
    <div class="header-left">
      <button v-if="showBack" type="button" class="back-btn" @click="emit('back')">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
      </button>
      <div class="header-text">
        <h1 class="header-title">{{ title }}</h1>
        <p v-if="subtitle" class="header-subtitle">{{ subtitle }}</p>
      </div>
    </div>
    <div class="header-actions">
      <slot name="actions"></slot>
    </div>
  </div>
</template>

<style scoped>
.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.header-left {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.back-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f6f6f6;
  border: none;
  border-radius: 10px;
  color: #000;
  cursor: pointer;
  margin-top: 4px;
}

.back-btn:hover {
  background: #e5e5e5;
}

.header-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.header-title {
  font-size: 28px;
  font-weight: 700;
  color: #000;
  margin: 0;
}

.header-subtitle {
  font-size: 14px;
  color: #6b6b6b;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}
</style>