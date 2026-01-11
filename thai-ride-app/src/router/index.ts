import type { RouteRecordRaw } from 'vue-router'
import { createRouter, createWebHistory } from 'vue-router'

export const routes: RouteRecordRaw[] = [
  // Public routes
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/LoginView.vue'),
    meta: { hideNavigation: true, public: true }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('../views/RegisterView.vue'),
    meta: { hideNavigation: true, public: true }
  },
  
  // Root redirect
  {
    path: '/',
    redirect: '/customer'
  },
  
  // Customer Routes
  {
    path: '/customer',
    name: 'CustomerHome',
    component: () => import('../views/CustomerHomeView.vue'),
    meta: { requiresAuth: true, isCustomerRoute: true }
  },
  {
    path: '/customer/ride',
    name: 'CustomerRide',
    component: () => import('../views/customer/RideViewRefactored.vue'),
    meta: { requiresAuth: true, isCustomerRoute: true, hideNavigation: true }
  },
  {
    path: '/customer/delivery',
    name: 'CustomerDelivery',
    component: () => import('../views/DeliveryView.vue'),
    meta: { requiresAuth: true, isCustomerRoute: true, hideNavigation: true }
  },
  {
    path: '/customer/shopping',
    name: 'CustomerShopping',
    component: () => import('../views/ShoppingView.vue'),
    meta: { requiresAuth: true, isCustomerRoute: true }
  },
  {
    path: '/customer/profile',
    name: 'CustomerProfile',
    component: () => import('../views/ProfileView.vue'),
    meta: { requiresAuth: true, isCustomerRoute: true }
  },
  {
    path: '/customer/history',
    name: 'CustomerHistory',
    component: () => import('../views/HistoryView.vue'),
    meta: { requiresAuth: true, isCustomerRoute: true }
  },
  {
    path: '/customer/wallet',
    name: 'CustomerWallet',
    component: () => import('../views/WalletView.vue'),
    meta: { requiresAuth: true, isCustomerRoute: true }
  },
  {
    path: '/customer/saved-places',
    name: 'CustomerSavedPlaces',
    component: () => import('../views/SavedPlacesView.vue'),
    meta: { requiresAuth: true, isCustomerRoute: true }
  },
  
  // Provider Routes V2 - Main Version
  {
    path: '/provider',
    name: 'ProviderDashboard',
    component: () => import('../views/provider/ProviderDashboardV2.vue'),
    meta: { requiresAuth: true, hideNavigation: true, isProviderRoute: true }
  },
]

// Create router instance
const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router