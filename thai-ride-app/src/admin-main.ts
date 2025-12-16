import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHashHistory } from 'vue-router'
import './style.css'
import AdminApp from './AdminApp.vue'
import type { RouteRecordRaw } from 'vue-router'

// Admin routes
const adminRoutes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/login'
  },
  {
    path: '/login',
    name: 'AdminLogin',
    component: () => import('./views/AdminLoginView.vue')
  },
  {
    path: '/dashboard',
    name: 'AdminDashboard',
    component: () => import('./views/AdminDashboardView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/users',
    name: 'AdminUsers',
    component: () => import('./views/AdminUsersView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/providers',
    name: 'AdminProviders',
    component: () => import('./views/AdminProvidersView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/orders',
    name: 'AdminOrders',
    component: () => import('./views/AdminOrdersView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/payments',
    name: 'AdminPayments',
    component: () => import('./views/AdminPaymentsView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/support',
    name: 'AdminSupport',
    component: () => import('./views/AdminSupportView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/promos',
    name: 'AdminPromos',
    component: () => import('./views/AdminPromosView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/subscriptions',
    name: 'AdminSubscriptions',
    component: () => import('./views/AdminSubscriptionsView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/insurance',
    name: 'AdminInsurance',
    component: () => import('./views/AdminInsuranceView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/corporate',
    name: 'AdminCorporate',
    component: () => import('./views/AdminCorporateView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/ratings',
    name: 'AdminRatings',
    component: () => import('./views/AdminRatingsView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/notifications',
    name: 'AdminNotifications',
    component: () => import('./views/AdminNotificationsView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/withdrawals',
    name: 'AdminWithdrawals',
    component: () => import('./views/AdminWithdrawalsView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/audit-log',
    name: 'AdminAuditLog',
    component: () => import('./views/AdminAuditLogView.vue'),
    meta: { requiresAuth: true }
  }
]

// Create router for admin - use hash history for multi-page app
const router = createRouter({
  history: createWebHashHistory(),
  routes: adminRoutes
})

// Navigation guard
router.beforeEach((to, _from, next) => {
  const adminToken = localStorage.getItem('admin_token')
  
  if (to.meta.requiresAuth && !adminToken) {
    next('/login')
  } else if (to.path === '/login' && adminToken) {
    next('/dashboard')
  } else {
    next()
  }
})

// Create Pinia store
const pinia = createPinia()

// Create and mount app
const app = createApp(AdminApp)
app.use(pinia)
app.use(router)
app.mount('#admin-app')
