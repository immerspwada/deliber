<template>
  <div 
    class="px-6 py-4 border-b border-gray-200"
    :class="gradientClass"
  >
    <div class="flex items-center gap-3">
      <div 
        class="w-10 h-10 rounded-full flex items-center justify-center"
        :class="iconBgClass"
      >
        <slot name="icon" />
      </div>
      <div>
        <h2 class="text-lg font-semibold text-gray-900">
          {{ title }}
        </h2>
        <p class="text-xs text-gray-500">
          {{ description }}
        </p>
      </div>
      <div v-if="$slots.actions" class="ml-auto">
        <slot name="actions" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  title: string
  description: string
  color?: 'blue' | 'green' | 'purple' | 'gray'
}

const props = withDefaults(defineProps<Props>(), {
  color: 'blue'
})

const gradientClass = computed(() => {
  const gradients = {
    blue: 'bg-gradient-to-r from-blue-50 to-transparent',
    green: 'bg-gradient-to-r from-green-50 to-transparent',
    purple: 'bg-gradient-to-r from-purple-50 to-transparent',
    gray: 'bg-white'
  }
  return gradients[props.color]
})

const iconBgClass = computed(() => {
  const backgrounds = {
    blue: 'bg-blue-100',
    green: 'bg-green-100',
    purple: 'bg-purple-100',
    gray: 'bg-gray-100'
  }
  return backgrounds[props.color]
})
</script>
