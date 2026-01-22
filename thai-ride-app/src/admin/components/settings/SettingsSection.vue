<template>
  <section 
    class="settings-section"
    :aria-labelledby="headerId"
  >
    <div v-if="title || description || $slots.header" class="section-header">
      <slot name="header">
        <h3 
          v-if="title" 
          :id="headerId"
          :class="typography.h3"
        >
          {{ title }}
        </h3>
        <p 
          v-if="description" 
          :class="typography.body"
          class="mt-1"
        >
          {{ description }}
        </p>
      </slot>
    </div>
    
    <div class="section-content">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { typography } from '@/admin/styles/design-tokens'

interface Props {
  title?: string
  description?: string
}

const props = defineProps<Props>()

// Generate unique ID for accessibility
const headerId = computed(() => 
  props.title ? `section-${props.title.toLowerCase().replace(/\s+/g, '-')}` : undefined
)
</script>

<style scoped>
.settings-section {
  margin-bottom: 2rem;
}

.section-header {
  margin-bottom: 1.5rem;
}

.section-content > * + * {
  margin-top: 1rem;
}
</style>
