<script setup lang="ts">
/**
 * Admin Sidebar Navigation
 */
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAdminAuthStore } from "../../stores/adminAuth.store";
import { useAdminUIStore } from "../../stores/adminUI.store";
import type { MenuItem } from "../../types";

const route = useRoute();
const router = useRouter();
const authStore = useAdminAuthStore();
const uiStore = useAdminUIStore();

// Menu structure
const menuItems = computed<MenuItem[]>(() => [
  {
    id: "dashboard",
    label: "Dashboard",
    labelTh: "แดชบอร์ด",
    icon: "dashboard",
    path: "/admin/dashboard",
    permission: "dashboard",
  },
  {
    id: "users",
    label: "Users",
    labelTh: "ผู้ใช้",
    icon: "users",
    permission: "users",
    children: [
      {
        id: "customers",
        label: "Customers",
        labelTh: "ลูกค้า",
        icon: "user",
        path: "/admin/customers",
        permission: "users",
      },
      {
        id: "providers",
        label: "Providers",
        labelTh: "ผู้ให้บริการ",
        icon: "car",
        path: "/admin/providers",
        permission: "users",
      },
      {
        id: "verification",
        label: "Verification",
        labelTh: "ตรวจสอบ",
        icon: "check",
        path: "/admin/verification-queue",
        permission: "users",
      },
    ],
  },
  {
    id: "orders",
    label: "Orders",
    labelTh: "ออเดอร์",
    icon: "orders",
    permission: "orders",
    children: [
      {
        id: "all-orders",
        label: "All Orders",
        labelTh: "ทั้งหมด",
        icon: "list",
        path: "/admin/orders",
        permission: "orders",
      },
      {
        id: "live-map",
        label: "Live Map",
        labelTh: "แผนที่สด",
        icon: "map",
        path: "/admin/live-map",
        permission: "orders",
      },
      {
        id: "scheduled",
        label: "Scheduled",
        labelTh: "นัดหมาย",
        icon: "clock",
        path: "/admin/scheduled-rides",
        permission: "orders",
      },
      {
        id: "cancellations",
        label: "Cancellations",
        labelTh: "ยกเลิก",
        icon: "x",
        path: "/admin/cancellations",
        permission: "orders",
      },
      {
        id: "service-bundles",
        label: "Service Bundles",
        labelTh: "แพ็คเกจบริการ",
        icon: "package",
        path: "/admin/service-bundles",
        permission: "orders",
      },
    ],
  },
  {
    id: "finance",
    label: "Finance",
    labelTh: "การเงิน",
    icon: "wallet",
    permission: "finance",
    children: [
      {
        id: "revenue",
        label: "Revenue",
        labelTh: "รายได้",
        icon: "chart",
        path: "/admin/revenue",
        permission: "finance",
      },
      {
        id: "payments",
        label: "Payments",
        labelTh: "ชำระเงิน",
        icon: "card",
        path: "/admin/payments",
        permission: "finance",
      },
      {
        id: "wallets",
        label: "Wallets",
        labelTh: "กระเป๋าเงิน",
        icon: "wallet",
        path: "/admin/wallets",
        permission: "finance",
      },
      {
        id: "topup",
        label: "Top-up",
        labelTh: "เติมเงิน",
        icon: "plus",
        path: "/admin/topup-requests",
        permission: "finance",
      },
      {
        id: "withdrawals",
        label: "Withdrawals",
        labelTh: "ถอนเงิน",
        icon: "download",
        path: "/admin/withdrawals",
        permission: "finance",
      },
      {
        id: "customer-withdrawals",
        label: "Customer Withdrawals",
        labelTh: "ถอนเงินลูกค้า",
        icon: "user-minus",
        path: "/admin/customer-withdrawals",
        permission: "finance",
      },
      {
        id: "refunds",
        label: "Refunds",
        labelTh: "คืนเงิน",
        icon: "refresh",
        path: "/admin/refunds",
        permission: "finance",
      },
      {
        id: "payment-accounts",
        label: "Payment Accounts",
        labelTh: "บัญชีรับเงิน",
        icon: "gear",
        path: "/admin/payment-accounts",
        permission: "finance",
      },
      {
        id: "payment-accounts",
        label: "Payment Accounts",
        labelTh: "บัญชีรับเงิน/QR",
        icon: "qr",
        path: "/admin/payment-accounts",
        permission: "finance",
      },
    ],
  },
  {
    id: "marketing",
    label: "Marketing",
    labelTh: "การตลาด",
    icon: "megaphone",
    permission: "marketing",
    children: [
      {
        id: "promos",
        label: "Promos",
        labelTh: "โปรโมชั่น",
        icon: "tag",
        path: "/admin/promos",
        permission: "marketing",
      },
      {
        id: "referrals",
        label: "Referrals",
        labelTh: "แนะนำเพื่อน",
        icon: "share",
        path: "/admin/referrals",
        permission: "marketing",
      },
      {
        id: "loyalty",
        label: "Loyalty",
        labelTh: "สะสมแต้ม",
        icon: "star",
        path: "/admin/loyalty",
        permission: "marketing",
      },
      {
        id: "incentives",
        label: "Incentives",
        labelTh: "โบนัส",
        icon: "gift",
        path: "/admin/incentives",
        permission: "marketing",
      },
    ],
  },
  {
    id: "support",
    label: "Support",
    labelTh: "ซัพพอร์ต",
    icon: "headset",
    permission: "support",
    children: [
      {
        id: "tickets",
        label: "Tickets",
        labelTh: "ตั๋ว",
        icon: "ticket",
        path: "/admin/support",
        permission: "support",
      },
      {
        id: "feedback",
        label: "Feedback",
        labelTh: "ความคิดเห็น",
        icon: "message",
        path: "/admin/feedback",
        permission: "support",
      },
      {
        id: "ratings",
        label: "Ratings",
        labelTh: "รีวิว",
        icon: "star",
        path: "/admin/ratings",
        permission: "support",
      },
      {
        id: "fraud",
        label: "Fraud Alerts",
        labelTh: "ทุจริต",
        icon: "alert",
        path: "/admin/fraud-alerts",
        permission: "support",
      },
    ],
  },
  {
    id: "analytics",
    label: "Analytics",
    labelTh: "วิเคราะห์",
    icon: "chart",
    permission: "analytics",
    children: [
      {
        id: "overview",
        label: "Overview",
        labelTh: "ภาพรวม",
        icon: "chart",
        path: "/admin/analytics",
        permission: "analytics",
      },
      {
        id: "reports",
        label: "Reports",
        labelTh: "รายงาน",
        icon: "file",
        path: "/admin/reports",
        permission: "analytics",
      },
      {
        id: "ux",
        label: "UX Analytics",
        labelTh: "UX",
        icon: "eye",
        path: "/admin/ux-analytics",
        permission: "analytics",
      },
      {
        id: "customer-ux",
        label: "Customer UX",
        labelTh: "Customer UX",
        icon: "sparkle",
        path: "/admin/customer-ux-analytics",
        permission: "analytics",
      },
      {
        id: "reorder",
        label: "Reorder Analytics",
        labelTh: "การสั่งซ้ำ",
        icon: "refresh",
        path: "/admin/reorder-analytics",
        permission: "analytics",
      },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    labelTh: "ตั้งค่า",
    icon: "gear",
    permission: "settings",
    children: [
      {
        id: "general",
        label: "General",
        labelTh: "ทั่วไป",
        icon: "gear",
        path: "/admin/settings",
        permission: "settings",
      },
      {
        id: "notifications",
        label: "Notifications",
        labelTh: "แจ้งเตือน",
        icon: "bell",
        path: "/admin/notifications",
        permission: "settings",
      },
      {
        id: "service-areas",
        label: "Service Areas",
        labelTh: "พื้นที่",
        icon: "map",
        path: "/admin/service-areas",
        permission: "settings",
      },
      {
        id: "service-zones",
        label: "Service Zones",
        labelTh: "โซนบริการ",
        icon: "zone",
        path: "/admin/service-zones",
        permission: "settings",
      },
      {
        id: "security",
        label: "Security",
        labelTh: "ความปลอดภัย",
        icon: "shield",
        path: "/admin/security",
        permission: "settings",
      },
      {
        id: "audit",
        label: "Audit Log",
        labelTh: "บันทึก",
        icon: "list",
        path: "/admin/audit-log",
        permission: "settings",
      },
      {
        id: "system-logs",
        label: "System Logs",
        labelTh: "ระบบ Logs",
        icon: "terminal",
        path: "/admin/system-logs",
        permission: "settings",
      },
    ],
  },
]);

// Filter menu by permissions
const visibleMenuItems = computed(() => {
  return menuItems.value.filter((item) => {
    if (!item.permission) return true;
    return authStore.canAccess(item.permission);
  });
});

// Track manually expanded/collapsed menus
const manuallyToggled = ref<Set<string>>(new Set());
const collapsedMenus = ref<Set<string>>(new Set());

// Auto-expand based on current route, but respect manual toggles
const expandedMenus = computed(() => {
  const current = route.path;
  const autoExpanded = menuItems.value
    .filter((item) =>
      item.children?.some((child) => current.startsWith(child.path || ""))
    )
    .map((item) => item.id);

  // Combine auto-expanded with manually expanded, minus collapsed
  const result = new Set([...autoExpanded, ...manuallyToggled.value]);
  collapsedMenus.value.forEach((id) => result.delete(id));

  return Array.from(result);
});

// Toggle menu expand/collapse
const toggleMenu = (menuId: string) => {
  if (expandedMenus.value.includes(menuId)) {
    // Currently expanded, collapse it
    collapsedMenus.value.add(menuId);
    manuallyToggled.value.delete(menuId);
  } else {
    // Currently collapsed, expand it
    collapsedMenus.value.delete(menuId);
    manuallyToggled.value.add(menuId);
  }
};

const isActive = (path?: string) => {
  if (!path) return false;
  return route.path === path || route.path.startsWith(path + "/");
};

const navigate = (path?: string) => {
  if (path) {
    router.push(path);
    uiStore.closeSidebar();
  }
};
</script>

<template>
  <aside
    class="admin-sidebar"
    :class="{ collapsed: uiStore.sidebarCollapsed, open: uiStore.sidebarOpen }"
  >
    <!-- Logo -->
    <div class="sidebar-header">
      <div class="logo">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
        <span v-if="!uiStore.sidebarCollapsed" class="logo-text">GOBEAR</span>
      </div>
      <button class="collapse-btn" @click="uiStore.toggleSidebar">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path v-if="uiStore.sidebarCollapsed" d="M9 18l6-6-6-6" />
          <path v-else d="M15 18l-6-6 6-6" />
        </svg>
      </button>
    </div>

    <!-- Navigation -->
    <nav class="sidebar-nav">
      <div v-for="item in visibleMenuItems" :key="item.id" class="nav-group">
        <!-- Parent item -->
        <button
          class="nav-item"
          :class="{
            active: isActive(item.path),
            expanded: expandedMenus.includes(item.id),
          }"
          @click="item.children ? toggleMenu(item.id) : navigate(item.path)"
        >
          <span class="nav-icon">
            <svg
              v-if="item.icon === 'dashboard'"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <rect x="3" y="3" width="7" height="9" rx="1" />
              <rect x="14" y="3" width="7" height="5" rx="1" />
              <rect x="14" y="12" width="7" height="9" rx="1" />
              <rect x="3" y="16" width="7" height="5" rx="1" />
            </svg>
            <svg
              v-else-if="item.icon === 'users'"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
            </svg>
            <svg
              v-else-if="item.icon === 'orders'"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"
              />
              <rect x="9" y="3" width="6" height="4" rx="1" />
              <path d="M9 12h6M9 16h6" />
            </svg>
            <svg
              v-else-if="item.icon === 'wallet'"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M21 12V7H5a2 2 0 010-4h14v4" />
              <path d="M3 5v14a2 2 0 002 2h16v-5" />
              <path d="M18 12a2 2 0 100 4h4v-4h-4z" />
            </svg>
            <svg
              v-else-if="item.icon === 'megaphone'"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M3 11l18-5v12L3 13v-2z" />
              <path d="M11.6 16.8a3 3 0 11-5.8-1.6" />
            </svg>
            <svg
              v-else-if="item.icon === 'headset'"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M3 18v-6a9 9 0 0118 0v6" />
              <path
                d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3z"
              />
            </svg>
            <svg
              v-else-if="item.icon === 'package'"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"
              />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
            <svg
              v-else-if="item.icon === 'chart'"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M18 20V10M12 20V4M6 20v-6" />
            </svg>
            <svg
              v-else
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <circle cx="12" cy="12" r="3" />
              <path
                d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"
              />
            </svg>
          </span>
          <span v-if="!uiStore.sidebarCollapsed" class="nav-label">{{
            item.labelTh || item.label
          }}</span>
          <span
            v-if="item.badge && !uiStore.sidebarCollapsed"
            class="nav-badge"
            >{{ item.badge }}</span
          >
          <svg
            v-if="item.children && !uiStore.sidebarCollapsed"
            class="nav-arrow"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        <!-- Children -->
        <Transition name="slide">
          <div
            v-if="
              item.children &&
              !uiStore.sidebarCollapsed &&
              expandedMenus.includes(item.id)
            "
            class="nav-children"
          >
            <button
              v-for="child in item.children"
              :key="child.id"
              class="nav-item child"
              :class="{ active: isActive(child.path) }"
              @click="navigate(child.path)"
            >
              <span class="nav-label">{{ child.labelTh || child.label }}</span>
            </button>
          </div>
        </Transition>
      </div>
    </nav>

    <!-- User Info -->
    <div class="sidebar-footer">
      <div class="user-info">
        <div class="user-avatar">
          {{ authStore.user?.name?.charAt(0) || "A" }}
        </div>
        <div v-if="!uiStore.sidebarCollapsed" class="user-details">
          <div class="user-name">{{ authStore.user?.name || "Admin" }}</div>
          <div class="user-role">{{ authStore.userRole }}</div>
        </div>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.admin-sidebar {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  width: 260px;
  background: #fff;
  border-right: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  z-index: 200;
  transition: width 0.3s ease, transform 0.3s ease;
}

.admin-sidebar.collapsed {
  width: 72px;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #00a86b;
}

.logo-text {
  font-size: 20px;
  font-weight: 700;
  color: #1f2937;
}

.collapse-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  color: #6b7280;
  transition: background 0.2s;
}

.collapse-btn:hover {
  background: #f3f4f6;
}

.sidebar-nav {
  flex: 1;
  padding: 12px;
  overflow-y: auto;
}

.nav-group {
  margin-bottom: 4px;
}

.nav-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: none;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  color: #4b5563;
  font-size: 14px;
  text-align: left;
  transition: all 0.2s;
}

.nav-item:hover {
  background: #f3f4f6;
}

.nav-item.active {
  background: #e8f5ef;
  color: #00a86b;
}

.nav-item.child {
  padding-left: 44px;
  font-size: 13px;
}

.nav-icon {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-label {
  flex: 1;
}

.nav-badge {
  padding: 2px 8px;
  background: #ef4444;
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  border-radius: 10px;
}

.nav-arrow {
  transition: transform 0.2s;
}

.nav-item.expanded .nav-arrow {
  transform: rotate(180deg);
}

.nav-children {
  margin-top: 4px;
  overflow: hidden;
}

/* Slide animation for collapsible sections */
.slide-enter-active,
.slide-leave-active {
  transition: all 0.25s ease;
  max-height: 500px;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  max-height: 0;
}

.sidebar-footer {
  padding: 16px;
  border-top: 1px solid #e5e7eb;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-avatar {
  width: 36px;
  height: 36px;
  background: #00a86b;
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
}

.user-details {
  flex: 1;
  min-width: 0;
}

.user-name {
  font-size: 14px;
  font-weight: 500;
  color: #1f2937;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-role {
  font-size: 12px;
  color: #6b7280;
  text-transform: capitalize;
}

/* Mobile */
@media (max-width: 1024px) {
  .admin-sidebar {
    transform: translateX(-100%);
  }

  .admin-sidebar.open {
    transform: translateX(0);
  }

  .admin-sidebar.collapsed {
    width: 260px;
  }

  .collapse-btn {
    display: none;
  }
}
</style>
