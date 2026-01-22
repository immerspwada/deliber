<template>
  <div class="empty-state" role="status">
    <div class="empty-content">
      <div class="empty-icon" aria-hidden="true">
        {{ icon }}
      </div>
      
      <h3 :class="typography.h3" class="empty-title">
        {{ title }}
      </h3>
      
      <p :class="typography.body" class="empty-description">
        {{ description }}
      </p>
      
      <button
        v-if="actionText"
        type="button"
        class="btn btn-primary"
        @click="$emit('action')"
      >
        {{ actionText }}
      </button>
      
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { typography } from '@/admin/styles/design-tokens'

interface Props {
  icon?: string
  title: string
  description: string
  actionText?: string
}

withDefaults(defineProps<Props>(), {
  icon: '📭'
})

defineEmits<{
  action: []
}>()
</script>

<style scoped>
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3rem 0;
}

.empty-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  max-width: 28rem;
}

.empty-icon {
  font-size: 3.75rem;
  margin-bottom: 1rem;
}

.empty-title {
  margin-bottom: 0.5rem;
}

.empty-description {
  color: #4b5563;
  margin-bottom: 1.5rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 500;
  transition: all 0.2s;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn:focus {
  outline: none;
  ring: 2px;
  ring-offset: 2px;
}

.btn-primary {
  background-color: #3b82f6;
  color: white;
}

.btn-primary:hover {
  background-color: #2563eb;
}

.btn-primary:active {
  transform: scale(0.95);
}

.btn-primary:focus {
  ring-color: #3b82f6;
}
</style>
