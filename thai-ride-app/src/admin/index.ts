/**
 * Admin Module Entry Point
 * ========================
 * Export all admin-related modules
 */

// Types
export * from './types'

// Stores
export { useAdminAuthStore } from './stores/adminAuth.store'
export { useAdminUIStore } from './stores/adminUI.store'

// Router
export { adminRoutes } from './router'

// Components - Layout
export { default as AdminShell } from './components/layout/AdminShell.vue'
export { default as AdminSidebar } from './components/layout/AdminSidebar.vue'
export { default as AdminHeader } from './components/layout/AdminHeader.vue'
export { default as AdminToasts } from './components/layout/AdminToasts.vue'

// Components - Common
export { default as AdminTable } from './components/common/AdminTable.vue'
export { default as AdminCard } from './components/common/AdminCard.vue'
export { default as AdminModal } from './components/common/AdminModal.vue'
export { default as AdminButton } from './components/common/AdminButton.vue'
export { default as AdminBadge } from './components/common/AdminBadge.vue'
export { default as AdminInput } from './components/common/AdminInput.vue'
export { default as AdminSelect } from './components/common/AdminSelect.vue'

// Views
export { default as AdminLoginView } from './views/LoginView.vue'
export { default as AdminDashboardView } from './views/DashboardView.vue'
