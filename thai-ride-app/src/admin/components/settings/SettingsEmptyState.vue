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
  @apply flex items-center justify-center py-12;
}

.empty-content {
  @apply flex flex-col items-center text-center max-w-md;
}

.empty-icon {
  @apply text-6xl mb-4;
}

.empty-title {
  @apply mb-2;
}

.empty-description {
  @apply text-gray-600 mb-6;
}

.btn {
  @apply px-6 py-3 rounded-lg font-medium transition-all duration-200;
  @apply focus:outline-none focus:ring-2 focus:ring-offset-2;
  @apply min-h-[44px] flex items-center justify-center;
}

.btn-primary {
  @apply bg-primary-600 text-white;
  @apply hover:bg-primary-700 active:scale-95;
  @apply focus:ring-primary-500;
}
</style>
