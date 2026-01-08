<script setup lang="ts">
/**
 * ProviderLayout - Layout หลักสำหรับ Provider Dashboard
 * Feature: F14 - Provider Dashboard
 *
 * Production-Ready: January 2026
 * - Dual-Role support: สลับระหว่าง Customer และ Provider mode
 * - MUNEEF Style: สีเขียว #00A86B
 * - Proper cleanup and error handling
 */
import { ref, computed, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useAuthStore } from "../stores/auth";
import { supabase } from "../lib/supabase";

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

// Show role switcher modal
const showRoleSwitcher = ref(false);

// Provider info from database
const providerType = ref<string | null>(null);

// Get user role label
const userRole = computed(() => {
  const typeLabels: Record<string, string> = {
    driver: "คนขับรถ",
    rider: "ไรเดอร์",
    shopper: "ช้อปเปอร์",
    mover: "ขนย้าย",
    laundry: "ซักผ้า",
    multi: "หลายบริการ",
  };
  return typeLabels[providerType.value || ""] || "ผู้ให้บริการ";
});

// Fetch provider type on mount
onMounted(async () => {
  if (authStore.user?.id) {
    const { data } = await supabase
      .from("service_providers")
      .select("provider_type")
      .eq("user_id", authStore.user.id)
      .maybeSingle();

    if (data) {
      providerType.value = data.provider_type;
    }
  }
});

// Navigation items for provider - เพิ่ม Incentives
const navItems = [
  { name: "งาน", path: "/provider", icon: "work" },
  { name: "งานของฉัน", path: "/provider/my-jobs", icon: "jobs" },
  { name: "รายได้", path: "/provider/earnings", icon: "earnings" },
  { name: "โปรไฟล์", path: "/provider/profile", icon: "user" },
];

const isActive = (path: string) => {
  if (path === "/provider") {
    return (
      route.path === "/provider" ||
      route.path === "/provider/requests" ||
      route.path === "/provider/active"
    );
  }
  if (path === "/provider/my-jobs") {
    return (
      route.path === "/provider/my-jobs" || route.path === "/provider/history"
    );
  }
  return route.path === path;
};

const navigateTo = (path: string) => {
  router.push(path);
};

// Switch to Customer mode
const switchToCustomer = () => {
  showRoleSwitcher.value = false;
  router.push("/customer");
};

const logout = async () => {
  try {
    await authStore.logout();
    router.push("/login");
  } catch (err) {
    // Force redirect even if logout fails
    router.push("/login");
  }
};
</script>

<template>
  <div class="provider-layout">
    <!-- Header -->
    <header class="provider-header">
      <div class="header-content">
        <div class="header-left">
          <button class="logo-btn" @click="showRoleSwitcher = true">
            <span class="logo">GOBEAR</span>
            <span class="role-badge">{{ userRole }}</span>
            <svg
              class="switch-icon"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              width="14"
              height="14"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M8 9l4-4 4 4m0 6l-4 4-4-4"
              />
            </svg>
          </button>
        </div>
        <div class="header-right">
          <!-- Incentives Quick Link -->
          <button
            @click="navigateTo('/provider/incentives')"
            class="header-icon-btn"
            title="โบนัส"
          >
            <svg
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              width="20"
              height="20"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </button>
          <!-- Notifications -->
          <button
            @click="navigateTo('/provider/notifications')"
            class="header-icon-btn"
            title="แจ้งเตือน"
          >
            <svg
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              width="20"
              height="20"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
          </button>
        </div>
      </div>
    </header>

    <!-- Role Switcher Modal -->
    <Teleport to="body">
      <div
        v-if="showRoleSwitcher"
        class="role-modal-overlay"
        @click.self="showRoleSwitcher = false"
      >
        <div class="role-modal">
          <div class="role-modal-header">
            <h3>สลับโหมด</h3>
            <button class="close-btn" @click="showRoleSwitcher = false">
              <svg
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                width="24"
                height="24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <div class="role-options">
            <button class="role-option active">
              <div class="role-icon provider">
                <svg
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  width="24"
                  height="24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M8 17h.01M16 17h.01M9 11h6M5 11l1.5-4.5A2 2 0 018.4 5h7.2a2 2 0 011.9 1.5L19 11M5 11v6a1 1 0 001 1h1a1 1 0 001-1v-1h8v1a1 1 0 001 1h1a1 1 0 001-1v-6M5 11h14"
                  />
                </svg>
              </div>
              <div class="role-info">
                <span class="role-name">โหมดผู้ให้บริการ</span>
                <span class="role-desc">รับงาน เรียกรถ ส่งของ</span>
              </div>
              <div class="role-check">
                <svg
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  width="20"
                  height="20"
                >
                  <path
                    fill-rule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clip-rule="evenodd"
                  />
                </svg>
              </div>
            </button>
            <button class="role-option" @click="switchToCustomer">
              <div class="role-icon customer">
                <svg
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  width="24"
                  height="24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              <div class="role-info">
                <span class="role-name">โหมดลูกค้า</span>
                <span class="role-desc">เรียกรถ สั่งของ ใช้บริการ</span>
              </div>
              <svg
                class="role-arrow"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                width="20"
                height="20"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
          <div class="role-modal-footer">
            <button class="logout-link" @click="logout">
              <svg
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                width="18"
                height="18"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              ออกจากระบบ
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Main Content -->
    <main class="provider-main">
      <slot />
    </main>

    <!-- Bottom Navigation -->
    <nav class="provider-nav">
      <div class="nav-container">
        <button
          v-for="item in navItems"
          :key="item.path"
          @click="navigateTo(item.path)"
          :class="['nav-item', { active: isActive(item.path) }]"
        >
          <div class="nav-icon-wrapper">
            <!-- Work Icon -->
            <svg
              v-if="item.icon === 'work'"
              class="nav-icon"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
              />
            </svg>
            <!-- Jobs Icon -->
            <svg
              v-else-if="item.icon === 'jobs'"
              class="nav-icon"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            <!-- Earnings Icon -->
            <svg
              v-else-if="item.icon === 'earnings'"
              class="nav-icon"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <!-- History Icon -->
            <svg
              v-else-if="item.icon === 'history'"
              class="nav-icon"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <!-- User Icon -->
            <svg
              v-else-if="item.icon === 'user'"
              class="nav-icon"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            <!-- Default Icon -->
            <svg
              v-else
              class="nav-icon"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <circle cx="12" cy="12" r="10" stroke-width="2" />
            </svg>
            <span v-if="isActive(item.path)" class="active-dot"></span>
          </div>
          <span class="nav-label">{{ item.name }}</span>
        </button>
      </div>
    </nav>
  </div>
</template>

<style scoped>
.provider-layout {
  min-height: 100vh;
  background-color: #f6f6f6;
  display: flex;
  flex-direction: column;
}

/* Header */
.provider-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background-color: #000000;
  color: #ffffff;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  max-width: 480px;
  margin: 0 auto;
}

.header-left {
  display: flex;
  align-items: center;
}

.logo-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  background: none;
  border: none;
  color: #ffffff;
  cursor: pointer;
  padding: 4px 8px;
  margin: -4px -8px;
  border-radius: 8px;
  transition: background-color 0.2s;
}

.logo-btn:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.logo {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.5px;
}

.role-badge {
  padding: 4px 10px;
  background-color: rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.switch-icon {
  opacity: 0.6;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 4px;
}

.header-icon-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  color: #ffffff;
  cursor: pointer;
  border-radius: 50%;
  transition: background-color 0.2s;
}

.header-icon-btn:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

/* Role Switcher Modal */
.role-modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 1000;
}

.role-modal {
  width: 100%;
  max-width: 480px;
  background-color: #ffffff;
  border-radius: 20px 20px 0 0;
  overflow: hidden;
}

.role-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e5e5e5;
}

.role-modal-header h3 {
  font-size: 18px;
  font-weight: 600;
}

.close-btn {
  padding: 4px;
  background: none;
  border: none;
  cursor: pointer;
  color: #6b6b6b;
}

.role-options {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.role-option {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background-color: #f6f6f6;
  border: 2px solid transparent;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
  width: 100%;
}

.role-option:hover {
  background-color: #f0f0f0;
}

.role-option.active {
  border-color: #00a86b;
  background-color: #e8f5ef;
}

.role-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
}

.role-icon.provider {
  background-color: #000000;
  color: #ffffff;
}

.role-icon.customer {
  background-color: #00a86b;
  color: #ffffff;
}

.role-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.role-name {
  font-size: 16px;
  font-weight: 600;
}

.role-desc {
  font-size: 13px;
  color: #6b6b6b;
}

.role-check {
  color: #00a86b;
}

.role-arrow {
  color: #6b6b6b;
}

.role-modal-footer {
  padding: 16px 20px 24px;
  border-top: 1px solid #e5e5e5;
}

.logout-link {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 14px;
  background: none;
  border: 1px solid #e5e5e5;
  border-radius: 12px;
  font-size: 15px;
  color: #ef4444;
  cursor: pointer;
  transition: all 0.2s;
}

.logout-link:hover {
  background-color: #fef2f2;
  border-color: #ef4444;
}

/* Main Content */
.provider-main {
  flex: 1;
  padding-bottom: 90px;
}

/* Bottom Navigation */
.provider-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: #ffffff;
  border-top: 1px solid #e5e5e5;
  z-index: 100;
}

.nav-container {
  display: flex;
  justify-content: space-around;
  max-width: 480px;
  margin: 0 auto;
  padding: 6px 8px;
  padding-bottom: max(6px, env(safe-area-inset-bottom));
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px 16px;
  background: none;
  border: none;
  cursor: pointer;
  color: #6b6b6b;
  transition: all 0.2s ease;
  min-height: 56px;
  min-width: 64px;
  border-radius: 12px;
}

.nav-item:active {
  transform: scale(0.95);
}

.nav-item.active {
  color: #00a86b;
}

.nav-icon-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
}

.nav-item.active .nav-icon-wrapper {
  background-color: rgba(0, 168, 107, 0.1);
}

.nav-icon {
  width: 24px;
  height: 24px;
}

.nav-item.active .nav-icon {
  stroke-width: 2.5;
}

.active-dot {
  position: absolute;
  bottom: -4px;
  left: 50%;
  transform: translateX(-50%);
  width: 5px;
  height: 5px;
  background-color: #00a86b;
  border-radius: 50%;
}

.nav-label {
  font-size: 11px;
  font-weight: 500;
  margin-top: 4px;
}
</style>
