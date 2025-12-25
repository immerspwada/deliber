<script setup lang="ts">
/**
 * NotificationDropdown - Dropdown แสดงรายการแจ้งเตือนล่าสุด
 * MUNEEF Style: สีเขียว #00A86B, สะอาด ทันสมัย
 */
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
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
  getNotificationUrl,
  getNotificationIcon,
} = useNotifications();

const dropdownRef = ref<HTMLElement | null>(null);

// แสดงแค่ 5 รายการล่าสุด
const recentNotifications = computed(() => {
  return notifications.value.slice(0, 5);
});

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
          <div class="dropdown-content">
            <!-- Loading -->
            <div v-if="loading" class="loading-state">
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
              <button
                v-for="notification in recentNotifications"
                :key="notification.id"
                class="notification-item"
                :class="{ unread: !notification.is_read }"
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
                  <p class="notification-message">{{ notification.message }}</p>
                  <span class="notification-time">{{
                    formatTimeAgo(notification.created_at)
                  }}</span>
                </div>

                <!-- Unread Dot -->
                <div v-if="!notification.is_read" class="unread-dot"></div>
              </button>
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
  justify-content: flex-end;
  padding-top: calc(70px + env(safe-area-inset-top));
  padding-right: 16px;
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
  max-width: calc(100vw - 32px);
  max-height: 50vh;
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  display: flex;
  flex-direction: column;
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

/* Content */
.dropdown-content {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

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
  padding: 40px 20px;
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
