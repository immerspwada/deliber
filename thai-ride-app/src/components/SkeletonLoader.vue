<script setup lang="ts">
/**
 * Feature: F76 - Skeleton Loader
 * Loading placeholder with shimmer effect
 */
interface Props {
  variant?: 'text' | 'circle' | 'rect' | 'card'
  width?: string
  height?: string
  lines?: number
}

withDefaults(defineProps<Props>(), {
  variant: 'text',
  width: '100%',
  height: 'auto',
  lines: 1
})
</script>

<template>
  <div class="skeleton-wrapper">
    <!-- Text skeleton -->
    <template v-if="variant === 'text'">
      <div
        v-for="i in lines"
        :key="i"
        class="skeleton skeleton-text"
        :style="{ 
          width: i === lines && lines > 1 ? '70%' : width,
          height: height === 'auto' ? '16px' : height
        }"
      />
    </template>
    
    <!-- Circle skeleton -->
    <div
      v-else-if="variant === 'circle'"
      class="skeleton skeleton-circle"
      :style="{ width, height: width }"
    />
    
    <!-- Rectangle skeleton -->
    <div
      v-else-if="variant === 'rect'"
      class="skeleton skeleton-rect"
      :style="{ width, height }"
    />
    
    <!-- Card skeleton -->
    <div v-else-if="variant === 'card'" class="skeleton-card">
      <div class="skeleton skeleton-rect" style="height: 120px" />
      <div class="skeleton-card-content">
        <div class="skeleton skeleton-text" style="width: 60%; height: 18px" />
        <div class="skeleton skeleton-text" style="width: 80%; height: 14px" />
        <div class="skeleton skeleton-text" style="width: 40%; height: 14px" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.skeleton-wrapper {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.skeleton {
  background: linear-gradient(
    90deg,
    #f0f0f0 25%,
    #e0e0e0 50%,
    #f0f0f0 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
}

.skeleton-text {
  border-radius: 4px;
}

.skeleton-circle {
  border-radius: 50%;
}

.skeleton-rect {
  border-radius: 8px;
}

.skeleton-card {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
}

.skeleton-card-content {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
</style>
