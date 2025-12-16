<script setup lang="ts">
defineProps<{
  type?: 'card' | 'list' | 'text' | 'avatar' | 'button' | 'balance' | 'transaction' | 'history' | 'services' | 'quick-actions' | 'recent-trips' | 'more-features' | 'promo' | 'profile' | 'menu-list' | 'settings'
  count?: number
}>()
</script>

<template>
  <!-- Balance Card Skeleton -->
  <div v-if="type === 'balance'" class="skeleton-balance">
    <div class="skeleton skeleton-label"></div>
    <div class="skeleton skeleton-amount"></div>
    <div class="skeleton skeleton-btn"></div>
  </div>

  <!-- Transaction Item Skeleton -->
  <template v-else-if="type === 'transaction'">
    <div v-for="i in (count || 3)" :key="i" class="skeleton-transaction">
      <div class="skeleton skeleton-avatar"></div>
      <div class="skeleton-tx-info">
        <div class="skeleton skeleton-text-md"></div>
        <div class="skeleton skeleton-text-sm"></div>
      </div>
      <div class="skeleton skeleton-text-md"></div>
    </div>
  </template>

  <!-- History Card Skeleton -->
  <template v-else-if="type === 'history'">
    <div v-for="i in (count || 3)" :key="i" class="skeleton-history">
      <div class="skeleton-history-header">
        <div class="skeleton skeleton-badge"></div>
        <div class="skeleton skeleton-badge-sm"></div>
      </div>
      <div class="skeleton skeleton-tracking"></div>
      <div class="skeleton-route">
        <div class="skeleton skeleton-dot"></div>
        <div class="skeleton skeleton-text-lg"></div>
      </div>
      <div class="skeleton-route">
        <div class="skeleton skeleton-dot"></div>
        <div class="skeleton skeleton-text-lg"></div>
      </div>
      <div class="skeleton-history-footer">
        <div class="skeleton skeleton-text-sm"></div>
        <div class="skeleton skeleton-text-md"></div>
      </div>
    </div>
  </template>

  <!-- List Item Skeleton -->
  <template v-else-if="type === 'list'">
    <div v-for="i in (count || 3)" :key="i" class="skeleton-list-item">
      <div class="skeleton skeleton-icon"></div>
      <div class="skeleton-list-content">
        <div class="skeleton skeleton-text-md"></div>
        <div class="skeleton skeleton-text-sm"></div>
      </div>
    </div>
  </template>

  <!-- Card Skeleton -->
  <div v-else-if="type === 'card'" class="skeleton-card">
    <div class="skeleton skeleton-text-lg"></div>
    <div class="skeleton skeleton-text-md"></div>
    <div class="skeleton skeleton-text-sm"></div>
  </div>

  <!-- Avatar Skeleton -->
  <div v-else-if="type === 'avatar'" class="skeleton skeleton-avatar"></div>

  <!-- Button Skeleton -->
  <div v-else-if="type === 'button'" class="skeleton skeleton-button"></div>

  <!-- Services Grid Skeleton -->
  <template v-else-if="type === 'services'">
    <div class="skeleton-services-grid">
      <div v-for="i in 3" :key="i" class="skeleton-service-card">
        <div class="skeleton skeleton-service-icon"></div>
        <div class="skeleton skeleton-service-name"></div>
        <div class="skeleton skeleton-service-desc"></div>
      </div>
    </div>
  </template>

  <!-- Quick Actions Skeleton -->
  <template v-else-if="type === 'quick-actions'">
    <div class="skeleton-quick-row">
      <div v-for="i in 4" :key="i" class="skeleton-quick-item">
        <div class="skeleton skeleton-quick-icon"></div>
        <div class="skeleton skeleton-quick-text"></div>
      </div>
    </div>
  </template>

  <!-- Recent Trips Skeleton -->
  <template v-else-if="type === 'recent-trips'">
    <div v-for="i in (count || 2)" :key="i" class="skeleton-trip-card">
      <div class="skeleton skeleton-trip-icon"></div>
      <div class="skeleton-trip-info">
        <div class="skeleton skeleton-trip-route"></div>
        <div class="skeleton skeleton-trip-date"></div>
      </div>
      <div class="skeleton skeleton-trip-fare"></div>
    </div>
  </template>

  <!-- More Features Skeleton (same as quick-actions) -->
  <template v-else-if="type === 'more-features'">
    <div class="skeleton-quick-row">
      <div v-for="i in 4" :key="i" class="skeleton-quick-item">
        <div class="skeleton skeleton-quick-icon"></div>
        <div class="skeleton skeleton-quick-text"></div>
      </div>
    </div>
  </template>

  <!-- Promo Banner Skeleton -->
  <div v-else-if="type === 'promo'" class="skeleton-promo">
    <div class="skeleton skeleton-promo-icon"></div>
    <div class="skeleton-promo-content">
      <div class="skeleton skeleton-promo-title"></div>
      <div class="skeleton skeleton-promo-subtitle"></div>
    </div>
    <div class="skeleton skeleton-promo-badge"></div>
  </div>

  <!-- Profile Card Skeleton -->
  <div v-else-if="type === 'profile'" class="skeleton-profile">
    <div class="skeleton skeleton-profile-avatar"></div>
    <div class="skeleton-profile-info">
      <div class="skeleton skeleton-profile-name"></div>
      <div class="skeleton skeleton-profile-phone"></div>
      <div class="skeleton skeleton-profile-email"></div>
    </div>
  </div>

  <!-- Menu List Skeleton -->
  <template v-else-if="type === 'menu-list'">
    <div class="skeleton-menu-section">
      <div v-for="i in (count || 6)" :key="i" class="skeleton-menu-item">
        <div class="skeleton skeleton-menu-icon"></div>
        <div class="skeleton skeleton-menu-text"></div>
        <div class="skeleton skeleton-menu-arrow"></div>
      </div>
    </div>
  </template>

  <!-- Settings Skeleton -->
  <template v-else-if="type === 'settings'">
    <div class="skeleton-settings-section">
      <div class="skeleton skeleton-section-title"></div>
      <div v-for="i in (count || 4)" :key="i" class="skeleton-setting-item">
        <div class="skeleton-setting-info">
          <div class="skeleton skeleton-setting-label"></div>
          <div class="skeleton skeleton-setting-desc"></div>
        </div>
        <div class="skeleton skeleton-toggle"></div>
      </div>
    </div>
  </template>

  <!-- Text Skeleton (default) -->
  <div v-else class="skeleton skeleton-text"></div>
</template>

<style scoped>
.skeleton {
  background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 8px;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Balance Skeleton */
.skeleton-balance {
  background: #000;
  border-radius: 20px;
  padding: 28px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.skeleton-balance .skeleton {
  background: linear-gradient(90deg, rgba(255,255,255,0.1) 25%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.1) 75%);
  background-size: 200% 100%;
}

.skeleton-label {
  width: 100px;
  height: 16px;
}

.skeleton-amount {
  width: 180px;
  height: 48px;
  border-radius: 12px;
}

.skeleton-btn {
  width: 140px;
  height: 48px;
  border-radius: 24px;
  margin-top: 8px;
}

/* Transaction Skeleton */
.skeleton-transaction {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  background: #fff;
  border-radius: 12px;
  margin-bottom: 8px;
}

.skeleton-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  flex-shrink: 0;
}

.skeleton-tx-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.skeleton-text-sm {
  height: 12px;
  width: 60%;
  border-radius: 4px;
}

.skeleton-text-md {
  height: 16px;
  width: 80%;
  border-radius: 4px;
}

.skeleton-text-lg {
  height: 20px;
  width: 100%;
  border-radius: 4px;
}

/* History Skeleton */
.skeleton-history {
  background: #fff;
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 12px;
}

.skeleton-history-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
}

.skeleton-badge {
  width: 80px;
  height: 24px;
  border-radius: 12px;
}

.skeleton-badge-sm {
  width: 60px;
  height: 24px;
  border-radius: 12px;
}

.skeleton-tracking {
  height: 32px;
  width: 100%;
  border-radius: 6px;
  margin-bottom: 12px;
}

.skeleton-route {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.skeleton-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.skeleton-history-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid #E5E5E5;
  margin-top: 8px;
}

/* List Item Skeleton */
.skeleton-list-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #fff;
  border-radius: 12px;
  margin-bottom: 8px;
}

.skeleton-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  flex-shrink: 0;
}

.skeleton-list-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* Card Skeleton */
.skeleton-card {
  background: #fff;
  border-radius: 16px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Button Skeleton */
.skeleton-button {
  height: 52px;
  width: 100%;
  border-radius: 8px;
}

/* Text Skeleton */
.skeleton-text {
  height: 16px;
  width: 100%;
  border-radius: 4px;
}

/* Services Grid Skeleton */
.skeleton-services-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.skeleton-service-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 12px;
  background: #fff;
  border-radius: 16px;
  min-height: 120px;
}

.skeleton-service-icon {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  margin-bottom: 12px;
}

.skeleton-service-name {
  width: 60px;
  height: 16px;
  border-radius: 4px;
  margin-bottom: 6px;
}

.skeleton-service-desc {
  width: 80px;
  height: 12px;
  border-radius: 4px;
}

/* Quick Actions Skeleton */
.skeleton-quick-row {
  display: flex;
  gap: 8px;
}

.skeleton-quick-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 14px 8px;
  background: #fff;
  border-radius: 12px;
  min-height: 80px;
}

.skeleton-quick-icon {
  width: 44px;
  height: 44px;
  border-radius: 50%;
}

.skeleton-quick-text {
  width: 50px;
  height: 12px;
  border-radius: 4px;
}

/* Recent Trips Skeleton */
.skeleton-trip-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  background: #fff;
  border-radius: 12px;
  margin-bottom: 8px;
  min-height: 72px;
}

.skeleton-trip-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  flex-shrink: 0;
}

.skeleton-trip-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.skeleton-trip-route {
  width: 80%;
  height: 16px;
  border-radius: 4px;
}

.skeleton-trip-date {
  width: 50%;
  height: 12px;
  border-radius: 4px;
}

.skeleton-trip-fare {
  width: 50px;
  height: 20px;
  border-radius: 4px;
  flex-shrink: 0;
}

/* Promo Banner Skeleton */
.skeleton-promo {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  background: #000;
  border-radius: 16px;
}

.skeleton-promo .skeleton {
  background: linear-gradient(90deg, rgba(255,255,255,0.1) 25%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.1) 75%);
  background-size: 200% 100%;
}

.skeleton-promo-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  flex-shrink: 0;
}

.skeleton-promo-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.skeleton-promo-title {
  width: 120px;
  height: 18px;
  border-radius: 4px;
}

.skeleton-promo-subtitle {
  width: 160px;
  height: 14px;
  border-radius: 4px;
}

.skeleton-promo-badge {
  width: 70px;
  height: 36px;
  border-radius: 8px;
  flex-shrink: 0;
}

/* Profile Card Skeleton */
.skeleton-profile {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: #fff;
  border-radius: 16px;
  margin-bottom: 24px;
}

.skeleton-profile-avatar {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  flex-shrink: 0;
}

.skeleton-profile-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.skeleton-profile-name {
  width: 140px;
  height: 20px;
  border-radius: 4px;
}

.skeleton-profile-phone {
  width: 100px;
  height: 14px;
  border-radius: 4px;
}

.skeleton-profile-email {
  width: 160px;
  height: 14px;
  border-radius: 4px;
}

/* Menu List Skeleton */
.skeleton-menu-section {
  background: #fff;
  border-radius: 16px;
  overflow: hidden;
}

.skeleton-menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid #F6F6F6;
}

.skeleton-menu-item:last-child {
  border-bottom: none;
}

.skeleton-menu-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  flex-shrink: 0;
}

.skeleton-menu-text {
  flex: 1;
  height: 16px;
  border-radius: 4px;
}

.skeleton-menu-arrow {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  flex-shrink: 0;
}

/* Settings Skeleton */
.skeleton-settings-section {
  margin-bottom: 24px;
}

.skeleton-section-title {
  width: 100px;
  height: 14px;
  border-radius: 4px;
  margin-bottom: 12px;
}

.skeleton-setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: #fff;
  border-radius: 12px;
  margin-bottom: 8px;
}

.skeleton-setting-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.skeleton-setting-label {
  width: 120px;
  height: 16px;
  border-radius: 4px;
}

.skeleton-setting-desc {
  width: 160px;
  height: 12px;
  border-radius: 4px;
}

.skeleton-toggle {
  width: 52px;
  height: 32px;
  border-radius: 16px;
  flex-shrink: 0;
}
</style>
