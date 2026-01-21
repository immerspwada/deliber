<script setup lang="ts">
/**
 * WelcomeHeader - Header ต้อนรับลูกค้าแบบน่ารัก
 * MUNEEF Style: สีเขียว #00A86B, ภาพประกอบน่ารัก
 */
import { ref, computed } from "vue";
import NotificationDropdown from "./NotificationDropdown.vue";

interface Props {
  userName?: string;
  walletBalance?: number;
  loyaltyPoints?: number;
  unreadNotifications?: number;
}

const props = withDefaults(defineProps<Props>(), {
  userName: "คุณ",
  walletBalance: 0,
  loyaltyPoints: 0,
  unreadNotifications: 0,
});

const emit = defineEmits<{
  "wallet-click": [];
  "notification-click": [];
  "profile-click": [];
}>();

// Notification dropdown state
const showNotificationDropdown = ref(false);

const toggleNotificationDropdown = () => {
  showNotificationDropdown.value = !showNotificationDropdown.value;
};

const closeNotificationDropdown = () => {
  showNotificationDropdown.value = false;
};

const greeting = computed(() => {
  const hour = new Date().getHours();
  if (hour < 6) return { text: "สวัสดียามดึก", emoji: "🌙" };
  if (hour < 12) return { text: "สวัสดีตอนเช้า", emoji: "☀️" };
  if (hour < 17) return { text: "สวัสดีตอนบ่าย", emoji: "🌤️" };
  if (hour < 21) return { text: "สวัสดีตอนเย็น", emoji: "🌅" };
  return { text: "สวัสดียามค่ำ", emoji: "🌙" };
});

const firstName = computed(() => {
  if (props.userName && props.userName !== "คุณ") {
    return props.userName.split(" ")[0];
  }
  return "คุณ";
});
</script>

<template>
  <header class="welcome-header">
    <!-- Background Pattern -->
    <div class="header-bg">
      <svg class="pattern" viewBox="0 0 400 200" preserveAspectRatio="none">
        <defs>
          <linearGradient id="headerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color: #00a86b; stop-opacity: 1" />
            <stop offset="100%" style="stop-color: #008f5b; stop-opacity: 1" />
          </linearGradient>
        </defs>
        <rect fill="url(#headerGrad)" width="400" height="200" />
        <circle cx="350" cy="30" r="80" fill="rgba(255,255,255,0.08)" />
        <circle cx="50" cy="150" r="60" fill="rgba(255,255,255,0.05)" />
        <circle cx="300" cy="180" r="40" fill="rgba(255,255,255,0.06)" />
      </svg>
    </div>

    <!-- Top Row -->
    <div class="header-top">
      <div class="logo-section">
        <div class="logo">
          <svg viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="18" fill="rgba(255,255,255,0.2)" />
            <circle cx="20" cy="20" r="14" fill="#FFFFFF" />
            <path d="M20 10L26 22H14L20 10Z" fill="#00A86B" />
            <circle cx="20" cy="20" r="4" fill="#00A86B" />
          </svg>
        </div>
        <span class="brand">GOBEAR</span>
      </div>

      <div class="header-actions">
        <!-- Notifications with Dropdown -->
        <div class="notification-wrapper">
          <button
            class="action-btn"
            @click.stop="toggleNotificationDropdown"
            aria-label="การแจ้งเตือน"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 01-3.46 0" />
            </svg>
            <span v-if="unreadNotifications > 0" class="badge">
              {{ unreadNotifications > 9 ? "9+" : unreadNotifications }}
            </span>
          </button>

          <!-- Notification Dropdown -->
          <NotificationDropdown
            :show="showNotificationDropdown"
            @close="closeNotificationDropdown"
            @view-all="emit('notification-click')"
          />
        </div>

        <!-- Profile -->
        <button
          class="action-btn profile"
          @click="emit('profile-click')"
          aria-label="โปรไฟล์"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <circle cx="12" cy="8" r="4" />
            <path d="M20 21a8 8 0 10-16 0" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Greeting Section -->
    <div class="greeting-section">
      <div class="greeting-content">
        <p class="greeting-text">{{ greeting.text }}</p>
        <h1 class="user-name">{{ firstName }}</h1>
        <p class="greeting-subtitle">วันนี้ต้องการไปไหน?</p>
      </div>

      <!-- Cute Illustration -->
      <div class="illustration">
        <svg viewBox="0 0 120 100" fill="none">
          <!-- Car Body -->
          <rect x="20" y="45" width="80" height="35" rx="8" fill="#FFFFFF" />
          <rect x="30" y="35" width="60" height="25" rx="6" fill="#FFFFFF" />
          <!-- Windows -->
          <rect x="35" y="38" width="20" height="16" rx="3" fill="#E8F5EF" />
          <rect x="60" y="38" width="20" height="16" rx="3" fill="#E8F5EF" />
          <!-- Wheels -->
          <circle cx="40" cy="80" r="10" fill="#333" />
          <circle cx="40" cy="80" r="5" fill="#666" />
          <circle cx="80" cy="80" r="10" fill="#333" />
          <circle cx="80" cy="80" r="5" fill="#666" />
          <!-- Headlights -->
          <rect x="95" y="55" width="8" height="6" rx="2" fill="#FFD700" />
          <rect x="17" y="55" width="8" height="6" rx="2" fill="#FFD700" />
          <!-- Cute Face -->
          <circle cx="50" cy="60" r="3" fill="#333" />
          <circle cx="70" cy="60" r="3" fill="#333" />
          <path
            d="M55 68 Q60 73 65 68"
            stroke="#333"
            stroke-width="2"
            fill="none"
            stroke-linecap="round"
          />
          <!-- Motion Lines -->
          <path
            d="M5 50 L15 50"
            stroke="rgba(255,255,255,0.5)"
            stroke-width="2"
            stroke-linecap="round"
          />
          <path
            d="M8 60 L18 60"
            stroke="rgba(255,255,255,0.4)"
            stroke-width="2"
            stroke-linecap="round"
          />
          <path
            d="M3 70 L13 70"
            stroke="rgba(255,255,255,0.3)"
            stroke-width="2"
            stroke-linecap="round"
          />
        </svg>
      </div>
    </div>

    <!-- Quick Stats -->
    <div class="quick-stats">
      <button class="stat-card wallet" @click="emit('wallet-click')">
        <div class="stat-icon">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <rect x="2" y="5" width="20" height="14" rx="2" />
            <path d="M2 10h20" />
          </svg>
        </div>
        <div class="stat-info">
          <span class="stat-label">กระเป๋าเงิน</span>
          <span class="stat-value">฿{{ walletBalance.toLocaleString() }}</span>
        </div>
      </button>

      <div class="stat-card points">
        <div class="stat-icon">
          <svg viewBox="0 0 24 24" fill="none">
            <polygon
              points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
              fill="#FFD700"
            />
          </svg>
        </div>
        <div class="stat-info">
          <span class="stat-label">แต้มสะสม</span>
          <span class="stat-value">{{ loyaltyPoints.toLocaleString() }}</span>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
.welcome-header {
  position: relative;
  padding: 0 0 24px;
  overflow: hidden;
}

.header-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 200px;
  z-index: 0;
}

.header-bg .pattern {
  width: 100%;
  height: 100%;
}

/* Top Row */
.header-top {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  padding-top: calc(12px + env(safe-area-inset-top));
}

.logo-section {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo {
  width: 40px;
  height: 40px;
}

.logo svg {
  width: 100%;
  height: 100%;
}

.brand {
  font-size: 18px;
  font-weight: 800;
  color: #ffffff;
  letter-spacing: 1px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.notification-wrapper {
  position: relative;
}

.action-btn {
  position: relative;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:active {
  transform: scale(0.95);
  background: rgba(255, 255, 255, 0.3);
}

.action-btn svg {
  width: 22px;
  height: 22px;
  color: #ffffff;
}

.action-btn .badge {
  position: absolute;
  top: 6px;
  right: 6px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  background: #e53935;
  border-radius: 9px;
  font-size: 10px;
  font-weight: 700;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Greeting Section */
.greeting-section {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px 24px;
}

.greeting-content {
  flex: 1;
}

.greeting-text {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 4px;
}

.user-name {
  font-size: 28px;
  font-weight: 700;
  color: #ffffff;
  margin-bottom: 4px;
}

.greeting-subtitle {
  font-size: 15px;
  color: rgba(255, 255, 255, 0.9);
}

.illustration {
  width: 100px;
  height: 80px;
  flex-shrink: 0;
}

.illustration svg {
  width: 100%;
  height: 100%;
}

/* Quick Stats */
.quick-stats {
  position: relative;
  z-index: 1;
  display: flex;
  gap: 12px;
  padding: 0 20px;
  margin-top: -8px;
}

.stat-card {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: #ffffff;
  border: none;
  border-radius: 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;
}

.stat-card:active {
  transform: scale(0.98);
}

.stat-card.wallet {
  cursor: pointer;
}

.stat-card.points {
  cursor: default;
}

.stat-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e8f5ef;
  border-radius: 12px;
  flex-shrink: 0;
}

.stat-card.wallet .stat-icon {
  background: #e8f5ef;
}

.stat-card.points .stat-icon {
  background: #fff8e1;
}

.stat-icon svg {
  width: 22px;
  height: 22px;
  color: #00a86b;
}

.stat-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.stat-label {
  font-size: 11px;
  color: #999999;
}

.stat-value {
  font-size: 16px;
  font-weight: 700;
  color: #1a1a1a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
