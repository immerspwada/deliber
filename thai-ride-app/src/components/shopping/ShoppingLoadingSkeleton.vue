<script setup lang="ts">
/**
 * Shopping Loading Skeleton
 * Skeleton loader for shopping view
 */
interface Props {
  step?: 'store' | 'delivery' | 'items' | 'confirm'
}

const props = withDefaults(defineProps<Props>(), {
  step: 'store'
})
</script>

<template>
  <div class="skeleton-container">
    <!-- Step Indicator Skeleton -->
    <div class="skeleton-steps">
      <div v-for="i in 4" :key="i" class="skeleton-step">
        <div class="skeleton-circle"></div>
        <div class="skeleton-label"></div>
      </div>
    </div>

    <!-- Content Skeleton -->
    <div class="skeleton-content">
      <!-- Form Card Skeleton -->
      <div class="skeleton-card">
        <div class="skeleton-label-text"></div>
        <div class="skeleton-input"></div>
      </div>

      <!-- Quick Actions Skeleton -->
      <div class="skeleton-actions">
        <div v-for="i in 2" :key="i" class="skeleton-action-card">
          <div class="skeleton-action-icon"></div>
          <div class="skeleton-action-text">
            <div class="skeleton-action-title"></div>
            <div class="skeleton-action-subtitle"></div>
          </div>
        </div>
      </div>

      <!-- List Skeleton -->
      <div v-if="step === 'items'" class="skeleton-list">
        <div v-for="i in 3" :key="i" class="skeleton-list-item"></div>
      </div>

      <!-- Button Skeleton -->
      <div class="skeleton-button"></div>
    </div>
  </div>
</template>

<style scoped>
.skeleton-container {
  padding: 20px;
  animation: fadeIn 0.3s ease-in-out;
}

.skeleton-steps {
  display: flex;
  justify-content: space-between;
  margin-bottom: 24px;
  padding: 0 10px;
}

.skeleton-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.skeleton-circle {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.skeleton-label {
  width: 50px;
  height: 12px;
  border-radius: 6px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.skeleton-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.skeleton-card {
  background: white;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.skeleton-label-text {
  width: 120px;
  height: 14px;
  border-radius: 7px;
  margin-bottom: 12px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.skeleton-input {
  width: 100%;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.skeleton-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.skeleton-action-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.skeleton-action-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  flex-shrink: 0;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.skeleton-action-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.skeleton-action-title {
  width: 140px;
  height: 16px;
  border-radius: 8px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.skeleton-action-subtitle {
  width: 180px;
  height: 12px;
  border-radius: 6px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.skeleton-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.skeleton-list-item {
  width: 100%;
  height: 60px;
  border-radius: 12px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.skeleton-button {
  width: 100%;
  height: 56px;
  border-radius: 16px;
  margin-top: 8px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
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
