<template>
  <button
    type="button"
    class="setting-card"
    @click="$emit('click')"
    :aria-label="`ไปยัง ${title}`"
  >
    <div class="icon" aria-hidden="true">{{ icon }}</div>
    <div class="content">
      <h3 :class="typography.h4" class="title">{{ title }}</h3>
      <p :class="typography.body" class="description">{{ description }}</p>
    </div>
    <div class="arrow" aria-hidden="true">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
      </svg>
    </div>
  </button>
</template>

<script setup lang="ts">
import { typography, colors, spacing, borderRadius, shadows, transitions } from '@/admin/styles/design-tokens'

interface Props {
  icon: string
  title: string
  description: string
}

defineProps<Props>()
defineEmits<{
  click: []
}>()
</script>

<style scoped>
.setting-card {
  display: flex;
  align-items: flex-start;
  gap: v-bind('spacing.md');
  padding: v-bind('spacing.lg');
  background: white;
  border: 1px solid v-bind('colors.gray[200]');
  border-radius: v-bind('borderRadius.lg');
  text-align: left;
  transition: all v-bind('transitions.base');
  cursor: pointer;
  width: 100%;
  min-height: 44px;
}

.setting-card:hover {
  border-color: v-bind('colors.primary[500]');
  box-shadow: v-bind('shadows.md');
  transform: translateY(-2px);
}

.setting-card:focus-visible {
  outline: 2px solid v-bind('colors.primary[500]');
  outline-offset: 2px;
}

.setting-card:active {
  transform: translateY(0);
}

.icon {
  font-size: 2rem;
  flex-shrink: 0;
  line-height: 1;
}

.content {
  flex: 1;
  min-width: 0;
}

.title {
  margin-bottom: v-bind('spacing.xs');
}

.description {
  color: v-bind('colors.gray[600]');
  line-height: 1.5;
}

.arrow {
  flex-shrink: 0;
  color: v-bind('colors.gray[400]');
  transition: all v-bind('transitions.fast');
}

.setting-card:hover .arrow {
  color: v-bind('colors.primary[500]');
  transform: translateX(4px);
}

@media (max-width: 640px) {
  .setting-card {
    padding: v-bind('spacing.md');
  }
  
  .icon {
    font-size: 1.5rem;
  }
}
</style>
