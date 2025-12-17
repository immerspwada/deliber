<script setup lang="ts">
/**
 * Feature: F88 - Card Component
 * Reusable card container
 */
interface Props {
  padding?: 'none' | 'sm' | 'md' | 'lg'
  shadow?: boolean
  hoverable?: boolean
  clickable?: boolean
}

withDefaults(defineProps<Props>(), {
  padding: 'md',
  shadow: false,
  hoverable: false,
  clickable: false
})

const emit = defineEmits<{
  click: []
}>()
</script>

<template>
  <div
    class="card"
    :class="[`padding-${padding}`, { shadow, hoverable, clickable }]"
    @click="clickable ? emit('click') : undefined"
  >
    <div v-if="$slots.header" class="card-header">
      <slot name="header" />
    </div>
    
    <div class="card-body">
      <slot />
    </div>
    
    <div v-if="$slots.footer" class="card-footer">
      <slot name="footer" />
    </div>
  </div>
</template>

<style scoped>
.card {
  background: #fff;
  border-radius: 16px;
  overflow: hidden;
}

.card.shadow {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.card.hoverable {
  transition: transform 0.2s, box-shadow 0.2s;
}

.card.hoverable:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
}

.card.clickable {
  cursor: pointer;
}

/* Padding variants */
.padding-none .card-body {
  padding: 0;
}

.padding-sm .card-body {
  padding: 12px;
}

.padding-md .card-body {
  padding: 20px;
}

.padding-lg .card-body {
  padding: 28px;
}

.card-header {
  padding: 16px 20px;
  border-bottom: 1px solid #e5e5e5;
}

.card-footer {
  padding: 16px 20px;
  border-top: 1px solid #e5e5e5;
  background: #f9f9f9;
}
</style>
