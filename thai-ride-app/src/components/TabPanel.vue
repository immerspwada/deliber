<script setup lang="ts">
/**
 * Feature: F84 - Tab Panel
 * Content panel for tabs
 */
import { inject, computed, type Ref } from 'vue'

interface Props {
  id: string
}

const props = defineProps<Props>()

const activeTab = inject<Ref<string>>('activeTab')

const isActive = computed(() => activeTab?.value === props.id)
</script>

<template>
  <div v-show="isActive" class="tab-panel" role="tabpanel">
    <slot />
  </div>
</template>

<style scoped>
.tab-panel {
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>
