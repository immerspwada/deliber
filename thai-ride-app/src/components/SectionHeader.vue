<script setup lang="ts">
/**
 * Feature: F113 - Section Header
 * Section title with optional action
 */
interface Props {
  title: string
  subtitle?: string
  actionLabel?: string
}

const props = withDefaults(defineProps<Props>(), {
  subtitle: '',
  actionLabel: ''
})

const emit = defineEmits<{
  action: []
}>()
</script>

<template>
  <div class="section-header">
    <div class="section-text">
      <h2 class="section-title">{{ title }}</h2>
      <p v-if="subtitle" class="section-subtitle">{{ subtitle }}</p>
    </div>
    
    <button v-if="actionLabel" type="button" class="section-action" @click="emit('action')">
      {{ actionLabel }}
    </button>
    
    <slot name="action" />
  </div>
</template>

<style scoped>
.section-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.section-text {
  flex: 1;
  min-width: 0;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #000;
  margin: 0;
}

.section-subtitle {
  font-size: 14px;
  color: #6b6b6b;
  margin: 4px 0 0;
}

.section-action {
  background: none;
  border: none;
  font-size: 14px;
  font-weight: 500;
  color: #000;
  cursor: pointer;
  padding: 0;
  transition: opacity 0.2s;
}

.section-action:hover {
  opacity: 0.7;
}
</style>
