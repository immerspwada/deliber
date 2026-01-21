<script setup lang="ts">
/**
 * NotificationDropdown - Dropdown แสดงรายการแจ้งเตือนล่าสุด
 * MUNEEF Style: สีเขียว #00A86B, สะอาด ทันสมัย
 *
 * Features:
 * - Swipe-to-dismiss: ปัดซ้ายเพื่อลบ notification
 * - Pull-to-refresh: ดึงลงเพื่อรีเฟรช
 */
import { ref, computed, onUnmounted, watch } from "vue";
import { useRouter } from "vue-router";
import {
  useNotifications,
  type UserNotification,
} from "../../composables/useNotifications";

interface Props {
  show: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  close: [];
  "view-all": [];
}>();

const router = useRouter();
const {
  notifications,
  loading,
  unreadCount,
  fetchNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getNotificationUrl,
  getNotificationIcon,
} = useNotifications();

const dropdownRef = ref<HTMLElement | null>(null);
const contentRef = ref<HTMLElement | null>(null);

// ========== Pull-to-Refresh State ==========
const isPulling = ref(false);
const isRefreshing = ref(false);
const pullDistance = ref(0);
const pullStartY = ref(0);
const PULL_THRESHOLD = 60;

// ========== Swipe-to-Dismiss State ==========
const swipeStates = ref<
  Record<string, { x: number; swiping: boolean; startX: number }>
>({});
const SWIPE_THRESHOLD = 80;

// แสดงแค่ 5 รายการล่าสุด
const recentNotifications = computed(() => {
  return notifications.value.slice(0, 5);
});

// ========== Pull-to-Refresh Functions ==========
const handlePullStart = (e: TouchEvent) => {
  if (!contentRef.value || contentRef.value.scrollTop > 0) return;
  pullStartY.value = e.touches[0].clientY;
  isPulling.value = true;
};

const handlePullMove = (e: TouchEvent) => {
  if (!isPulling.value || isRefreshing.value) return;
  if (!contentRef.value || contentRef.value.scrollTop > 0) {
    isPulling.value = false;
    pullDistance.value = 0;
    return;
  }

  const currentY = e.touches[0].clientY;
  const diff = currentY - pullStartY.value;

  if (diff > 0) {
    e.preventDefault();
    // Apply resistance
    pullDistance.value = Math.min(diff * 0.5, PULL_THRESHOLD * 1.5);
  }
};

const handlePullEnd = async () => {
  if (!isPulling.value) return;
  isPulling.value = false;

  if (pullDistance.value >= PULL_THRESHOLD) {
    isRefreshing.value = true;
    pullDistance.value = PULL_THRESHOLD;

    await fetchNotifications(10);

    // Small delay for UX
    await new Promise((resolve) => setTimeout(resolve, 300));
    isRefreshing.value = false;
  }

  pullDistance.value = 0;
};

// ========== Swipe-to-Dismiss Functions ==========
const initSwipeState = (id: string) => {
  if (!swipeStates.value[id]) {
    swipeStates.value[id] = { x: 0, swiping: false, startX: 0 };
  }
};

const handleSwipeStart = (e: TouchEvent, id: string) => {
  initSwipeState(id);
  swipeStates.value[id].startX = e.touches[0].clientX;
  swipeStates.value[id].swiping = true;
};

const handleSwipeMove = (e: TouchEvent, id: string) => {
  const state = swipeStates.value[id];
  if (!state?.swiping) return;

  const currentX = e.touches[0].clientX;
  const diff = currentX - state.startX;

  // Only allow left swipe (negative)
  if (diff < 0) {
    state.x = Math.max(diff, -SWIPE_THRESHOLD * 1.5);
  } else {
    state.x = Math.min(diff * 0.3, 20); // Small resistance for right swipe
  }
};

const handleSwipeEnd = async (id: string) => {
  const state = swipeStates.value[id];
  if (!state) return;

  state.swiping = false;

  if (state.x <= -SWIPE_THRESHOLD) {
    // Delete notification
    state.x = -300; // Animate out
    await new Promise((resolve) => setTimeout(resolve, 200));
    await deleteNotification(id);
    delete swipeStates.value[id];
  } else {
    // Reset position
    state.x = 0;
  }
};

const getSwipeStyle = (id: string) => {
  const state = swipeStates.value[id];
  if (!state) return {};
  return {
    transform: `translateX(${state.x}px)`,
    transition: state.swiping ? "none" : "transform 0.2s ease-out",
  };
};

const getDeleteIconOpacity = (id: string) => {
  const state = swipeStates.value[id];
  if (!state) return 0;
  return Math.min(Math.abs(state.x) / SWIPE_THRESHOLD, 1);
};

// Format time ago
const formatTimeAgo = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "เมื่อสักครู่";
  if (diffMins < 60) return `${diffMins} นาทีที่แล้ว`;
  if (diffHours < 24) return `${diffHours} ชั่วโมงที่แล้ว`;
  if (diffDays < 7) return `${diffDays} วันที่แล้ว`;
  return date.toLocaleDateString("th-TH", { day: "numeric", month: "short" });
};

// Get notification type color
const getTypeColor = (type: string): string => {
  const colors: Record<string, string> = {
    promo: "#F5A623",
    ride: "#00A86B",
    delivery: "#2196F3",
    shopping: "#E53935",
    payment: "#9C27B0",
    system: "#666666",
    sos: "#E53935",
    referral: "#00BCD4",
    subscription: "#FF9800",
    rating: "#FFD700",
  };
  return colors[type] || "#666666";
};

// Handle notification click
const handleNotificationClick = async (notification: UserNotification) => {
  if (!notification.is_read) {
    await markAsRead(notification.id);
  }
  emit("close");
  const url = getNotificationUrl(notification);
  router.push(url);
};

// Handle mark all as read
const handleMarkAllRead = async () => {
  await markAllAsRead();
};

// Handle view all
const handleViewAll = () => {
  emit("close");
  emit("view-all");
  router.push("/customer/notifications");
};

// Close on click outside
const handleClickOutside = (e: MouseEvent) => {
  if (dropdownRef.value && !dropdownRef.value.contains(e.target as Node)) {
    emit("close");
  }
};

// Close on escape key
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === "Escape") {
    emit("close");
  }
};

// Fetch notifications when dropdown opens
watch(
  () => props.show,
  (newVal) => {
    if (newVal) {
      fetchNotifications(10);
      document.addEventListener("click", handleClickOutside);
      document.addEventListener("keydown", handleKeydown);
    } else {
      document.removeEventListener("click", handleClickOutside);
      document.removeEventListener("keydown", handleKeydown);
    }
  }
);

onUnmounted(() => {
  document.removeEventListener("click", handleClickOutside);
  document.removeEventListener("keydown", handleKeydown);
});
</script>

<template>
  <Teleport to="body">
    <Transition name="dropdown">
      <div
        v-if="show"
        ref="dropdownRef"
        class="notification-dropdown"
        @click.stop
      >
        <!-- Backdrop -->
        <div class="dropdown-backdrop" @click="emit('close')"></div>

        <!-- Dropdown Content -->
        <div class="dropdown-panel">
          <!-- Header -->
          <div class="dropdown-header">
            <h3 class="dropdown-title">การแจ้งเตือน</h3>
            <button
              v-if="unreadCount > 0"
              class="mark-read-btn"
              @click="handleMarkAllRead"
            >
              อ่านทั้งหมด
            </button>
          </div>

          <!-- Content -->
          <div
            ref="contentRef"
            class="dropdown-content"
            @touchstart="handlePullStart"
            @touchmove="handlePullMove"
            @touchend="handlePullEnd"
          >
            <!-- Pull-to-Refresh Indicator -->
            <div
              class="pull-indicator"
              :style="{
                height: `${pullDistance}px`,
                opacity: pullDistance / PULL_THRESHOLD,
              }"
            >
              <div class="pull-spinner" :class="{ spinning: isRefreshing }">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </div>
              <span class="pull-text">{{
                isRefreshing ? "กำลังรีเฟรช..." : "ปล่อยเพื่อรีเฟรช"
              }}</span>
            </div>

            <!-- Loading -->
            <div v-if="loading && !isRefreshing" class="loading-state">
              <div v-for="i in 3" :key="i" class="skeleton-item">
                <div class="skeleton-icon"></div>
                <div class="skeleton-text">
                  <div class="skeleton-line short"></div>
                  <div class="skeleton-line"></div>
                </div>
              </div>
            </div>

            <!-- Empty State -->
            <div
              v-else-if="recentNotifications.length === 0"
              class="empty-state"
            >
              <div class="empty-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                >
                  <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 01-3.46 0" />
                </svg>
              </div>
              <p class="empty-text">ไม่มีการแจ้งเตือน</p>
            </div>

            <!-- Notifications List -->
            <div v-else class="notifications-list">
              <div
                v-for="notification in recentNotifications"
                :key="notification.id"
                class="notification-wrapper"
              >
                <!-- Notification Item -->
                <button
                  class="notification-item"
                  :class="{ unread: !notification.is_read }"
                  :style="getSwipeStyle(notification.id)"
                  @touchstart="handleSwipeStart($event, notification.id)"
                  @touchmove="handleSwipeMove($event, notification.id)"
                  @touchend="handleSwipeEnd(notification.id)"
                  @click="handleNotificationClick(notification)"
                >
                  <!-- Icon -->
                  <div
                    class="notification-icon"
                    :style="{
                      backgroundColor: getTypeColor(notification.type) + '15',
                      color: getTypeColor(notification.type),
                    }"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <path :d="getNotificationIcon(notification.type)" />
                    </svg>
                  </div>

                  <!-- Content -->
                  <div class="notification-content">
                    <p class="notification-title">{{ notification.title }}</p>
                    <p class="notification-message">
                      {{ notification.message }}
                    </p>
                    <span class="notification-time">{{
                      formatTimeAgo(notification.created_at)
                    }}</span>
                  </div>

                  <!-- Unread Dot -->
                  <div v-if="!notification.is_read" class="unread-dot"></div>
                </button>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="dropdown-footer">
            <button class="view-all-btn" @click="handleViewAll">
              <span>ดูทั้งหมด</span>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.notification-dropdown {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 99999;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  padding-top: calc(60px + env(safe-area-inset-top));
  padding-right: 16px;
  padding-left: 16px;
}

.dropdown-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: -1;
}

.dropdown-panel {
  width: 340px;
  max-width: 100%;
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* Content wrapper */
.dropdown-content {
  overflow-y: auto;
  max-height: 400px;
}

/* Header */
.dropdown-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 16px 12px;
  border-bottom: 1px solid #f0f0f0;
}

.dropdown-title {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
}

.mark-read-btn {
  padding: 6px 12px;
  background: #e8f5ef;
  border: none;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  color: #00a86b;
  cursor: pointer;
  transition: all 0.2s ease;
}

.mark-read-btn:active {
  transform: scale(0.95);
  background: #d0ebe0;
}

/* Content - ลบ duplicate เพราะย้ายไปรวมกับ dropdown-panel แล้ว */

/* Loading State */
.loading-state {
  padding: 12px;
}

.skeleton-item {
  display: flex;
  gap: 12px;
  padding: 12px;
}

.skeleton-icon {
  width: 40px;
  height: 40px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  border-radius: 10px;
  animation: shimmer 1.5s infinite;
}

.skeleton-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.skeleton-line {
  height: 12px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  border-radius: 4px;
  animation: shimmer 1.5s infinite;
}

.skeleton-line.short {
  width: 60%;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 20px;
  min-height: 120px;
}

.empty-icon {
  width: 48px;
  height: 48px;
  color: #cccccc;
  margin-bottom: 12px;
}

.empty-icon svg {
  width: 100%;
  height: 100%;
}

.empty-text {
  font-size: 14px;
  color: #999999;
}

/* Notifications List */
.notifications-list {
  display: flex;
  flex-direction: column;
  padding-bottom: 4px;
}

.notification-wrapper {
  position: relative;
  overflow: hidden;
}

.notification-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  background: transparent;
  border: none;
  text-align: left;
  cursor: pointer;
  transition: background 0.2s ease;
  position: relative;
}

.notification-item:not(:last-child) {
  border-bottom: 1px solid #f5f5f5;
}

.notification-item:hover {
  background: #fafafa;
}

.notification-item:active {
  background: #f5f5f5;
}

.notification-item.unread {
  background: #f8fdf9;
}

.notification-item.unread:hover {
  background: #f0faf3;
}

/* Icon */
.notification-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  flex-shrink: 0;
}

.notification-icon svg {
  width: 20px;
  height: 20px;
}

/* Content */
.notification-content {
  flex: 1;
  min-width: 0;
}

.notification-title {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.notification-message {
  font-size: 13px;
  color: #666666;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 4px;
}

.notification-time {
  font-size: 11px;
  color: #999999;
}

/* Unread Dot */
.unread-dot {
  width: 8px;
  height: 8px;
  background: #00a86b;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 6px;
}

/* Footer */
.dropdown-footer {
  padding: 12px 16px;
  border-top: 1px solid #f0f0f0;
}

.view-all-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 12px;
  background: #00a86b;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  color: #ffffff;
  cursor: pointer;
  transition: all 0.2s ease;
}

.view-all-btn:hover {
  background: #008f5b;
}

.view-all-btn:active {
  transform: scale(0.98);
}

.view-all-btn svg {
  width: 18px;
  height: 18px;
}

/* Transition */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: opacity 0.2s ease;
}

.dropdown-enter-active .dropdown-panel,
.dropdown-leave-active .dropdown-panel {
  transition: all 0.2s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
}

.dropdown-enter-from .dropdown-panel,
.dropdown-leave-to .dropdown-panel {
  transform: translateY(-10px);
  opacity: 0;
}
</style>
