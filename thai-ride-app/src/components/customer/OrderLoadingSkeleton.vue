<script setup lang="ts">
/**
 * OrderLoadingSkeleton - Loading skeleton for order cards
 * Shows animated placeholder while orders are loading
 */
</script>

<template>
  <div class="order-skeleton" aria-busy="true" aria-label="กำลังโหลดรายการ">
    <!-- Icon placeholder -->
    <div class="skeleton-icon" aria-hidden="true"></div>
    
    <!-- Content placeholder -->
    <div class="skeleton-content">
      <div class="skeleton-title"></div>
      <div class="skeleton-subtitle"></div>
      <div class="skeleton-route">
        <div class="skeleton-location"></div>
        <div class="skeleton-arrow"></div>
        <div class="skeleton-location"></div>
      </div>
    </div>
    
    <!-- Status badge placeholder -->
    <div class="skeleton-badge" aria-hidden="true"></div>
  </div>
</template>

<style scoped>
.order-skeleton {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #ffffff;
  border-radius: 18px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.skeleton-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  flex-shrink: 0;
}

.skeleton-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.skeleton-title {
  width: 80px;
  height: 14px;
  border-radius: 4px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.skeleton-subtitle {
  width: 120px;
  height: 12px;
  border-radius: 4px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  animation-delay: 0.1s;
}

.skeleton-route {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}

.skeleton-location {
  width: 60px;
  height: 10px;
  border-radius: 4px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  animation-delay: 0.2s;
}

.skeleton-arrow {
  width: 16px;
  height: 10px;
  border-radius: 4px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  animation-delay: 0.15s;
}

.skeleton-badge {
  width: 70px;
  height: 24px;
  border-radius: 12px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  animation-delay: 0.3s;
  flex-shrink: 0;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .order-skeleton {
    background: #1a1a1a;
  }
  
  .skeleton-icon,
  .skeleton-title,
  .skeleton-subtitle,
  .skeleton-location,
  .skeleton-arrow,
  .skeleton-badge {
    background: linear-gradient(90deg, #2a2a2a 25%, #333333 50%, #2a2a2a 75%);
    background-size: 200% 100%;
  }
}
</style>
