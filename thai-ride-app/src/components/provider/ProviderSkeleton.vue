<script setup lang="ts">
/**
 * ProviderSkeleton - Skeleton Loading for Provider Dashboard
 * Feature: F14 - Provider Dashboard UX Enhancement
 * MUNEEF Style: Clean skeleton with subtle animation
 */
defineProps<{
  type?: 'dashboard' | 'request-card' | 'stats' | 'earnings'
}>()
</script>

<template>
  <!-- Dashboard Skeleton -->
  <div v-if="type === 'dashboard'" class="skeleton-dashboard">
    <!-- Status Card Skeleton -->
    <div class="skeleton-card status-skeleton">
      <div class="skeleton-row">
        <div class="skeleton-circle small"></div>
        <div class="skeleton-text-group">
          <div class="skeleton-text medium"></div>
          <div class="skeleton-text short"></div>
        </div>
      </div>
      <div class="skeleton-toggle"></div>
    </div>

    <!-- Stats Row Skeleton -->
    <div class="skeleton-stats-row">
      <div class="skeleton-stat-card">
        <div class="skeleton-circle"></div>
        <div class="skeleton-text-group">
          <div class="skeleton-text short"></div>
          <div class="skeleton-text tiny"></div>
        </div>
      </div>
      <div class="skeleton-stat-card">
        <div class="skeleton-circle"></div>
        <div class="skeleton-text-group">
          <div class="skeleton-text short"></div>
          <div class="skeleton-text tiny"></div>
        </div>
      </div>
    </div>

    <!-- Rating Card Skeleton -->
    <div class="skeleton-card rating-skeleton">
      <div class="skeleton-row">
        <div class="skeleton-circle small"></div>
        <div class="skeleton-text medium"></div>
      </div>
      <div class="skeleton-text short"></div>
    </div>

    <!-- Section Title Skeleton -->
    <div class="skeleton-section-title">
      <div class="skeleton-text medium"></div>
    </div>

    <!-- Request Cards Skeleton -->
    <div class="skeleton-requests">
      <div v-for="i in 2" :key="i" class="skeleton-request-card">
        <div class="skeleton-row spread">
          <div class="skeleton-badge"></div>
          <div class="skeleton-text short"></div>
        </div>
        <div class="skeleton-row">
          <div class="skeleton-circle small"></div>
          <div class="skeleton-text medium"></div>
        </div>
        <div class="skeleton-route">
          <div class="skeleton-route-point"></div>
          <div class="skeleton-route-point"></div>
        </div>
        <div class="skeleton-row spread">
          <div class="skeleton-button"></div>
          <div class="skeleton-button primary"></div>
        </div>
      </div>
    </div>
  </div>

  <!-- Single Request Card Skeleton -->
  <div v-else-if="type === 'request-card'" class="skeleton-request-card">
    <div class="skeleton-row spread">
      <div class="skeleton-badge"></div>
      <div class="skeleton-text short"></div>
    </div>
    <div class="skeleton-row">
      <div class="skeleton-circle small"></div>
      <div class="skeleton-text medium"></div>
    </div>
    <div class="skeleton-route">
      <div class="skeleton-route-point"></div>
      <div class="skeleton-route-point"></div>
    </div>
    <div class="skeleton-row spread">
      <div class="skeleton-button"></div>
      <div class="skeleton-button primary"></div>
    </div>
  </div>

  <!-- Stats Skeleton -->
  <div v-else-if="type === 'stats'" class="skeleton-stats-row">
    <div class="skeleton-stat-card">
      <div class="skeleton-circle"></div>
      <div class="skeleton-text-group">
        <div class="skeleton-text short"></div>
        <div class="skeleton-text tiny"></div>
      </div>
    </div>
    <div class="skeleton-stat-card">
      <div class="skeleton-circle"></div>
      <div class="skeleton-text-group">
        <div class="skeleton-text short"></div>
        <div class="skeleton-text tiny"></div>
      </div>
    </div>
  </div>

  <!-- Earnings Skeleton -->
  <div v-else-if="type === 'earnings'" class="skeleton-earnings">
    <div class="skeleton-card">
      <div class="skeleton-text large"></div>
      <div class="skeleton-text tiny"></div>
    </div>
    <div class="skeleton-chart"></div>
  </div>
</template>


<style scoped>
/* Base Skeleton Styles */
.skeleton-dashboard {
  padding: 16px;
  max-width: 480px;
  margin: 0 auto;
}

/* Shimmer Animation */
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.skeleton-text,
.skeleton-circle,
.skeleton-toggle,
.skeleton-badge,
.skeleton-button,
.skeleton-chart {
  background: linear-gradient(
    90deg,
    #F0F0F0 25%,
    #E8E8E8 50%,
    #F0F0F0 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
}

/* Card Skeleton */
.skeleton-card {
  background: #FFFFFF;
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 16px;
}

.status-skeleton {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.rating-skeleton {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

/* Row Layout */
.skeleton-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.skeleton-row.spread {
  justify-content: space-between;
}

/* Text Skeleton */
.skeleton-text {
  height: 14px;
}

.skeleton-text.large {
  height: 28px;
  width: 120px;
}

.skeleton-text.medium {
  width: 100px;
}

.skeleton-text.short {
  width: 60px;
}

.skeleton-text.tiny {
  width: 40px;
  height: 12px;
}

.skeleton-text-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* Circle Skeleton */
.skeleton-circle {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  flex-shrink: 0;
}

.skeleton-circle.small {
  width: 36px;
  height: 36px;
}

/* Toggle Skeleton */
.skeleton-toggle {
  width: 56px;
  height: 32px;
  border-radius: 16px;
}

/* Badge Skeleton */
.skeleton-badge {
  width: 60px;
  height: 24px;
  border-radius: 6px;
}

/* Button Skeleton */
.skeleton-button {
  flex: 1;
  height: 44px;
  border-radius: 10px;
  max-width: 48%;
}

.skeleton-button.primary {
  background: linear-gradient(
    90deg,
    #E8F5EF 25%,
    #D4EDE3 50%,
    #E8F5EF 75%
  );
  background-size: 200% 100%;
}

/* Stats Row */
.skeleton-stats-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.skeleton-stat-card {
  background: #FFFFFF;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
}

/* Section Title */
.skeleton-section-title {
  margin: 24px 0 16px;
}

/* Request Card Skeleton */
.skeleton-requests {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.skeleton-request-card {
  background: #FFFFFF;
  border-radius: 16px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Route Skeleton */
.skeleton-route {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 0;
}

.skeleton-route-point {
  display: flex;
  align-items: center;
  gap: 10px;
}

.skeleton-route-point::before {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #E0E0E0;
  flex-shrink: 0;
}

.skeleton-route-point::after {
  content: '';
  height: 14px;
  flex: 1;
  background: linear-gradient(
    90deg,
    #F0F0F0 25%,
    #E8E8E8 50%,
    #F0F0F0 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
}

/* Earnings Skeleton */
.skeleton-earnings {
  padding: 16px;
}

.skeleton-chart {
  height: 200px;
  border-radius: 12px;
  margin-top: 16px;
}
</style>
