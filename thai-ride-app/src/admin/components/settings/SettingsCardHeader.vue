<template>
  <div class="px-6 py-4 bg-gray-50 border-b border-gray-200">
    <div class="flex items-start justify-between">
      <div>
        <h2 class="text-base font-semibold text-gray-900 mb-1">
          {{ title }}
        </h2>
        <p class="text-sm text-gray-600">
          {{ description }}
        </p>
      </div>
      <div v-if="$slots.actions" class="ml-4 flex-shrink-0">
        <slot name="actions" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  title: string
  description: string
}

defineProps<Props>()
</script>
