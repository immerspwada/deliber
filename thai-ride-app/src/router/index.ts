import type { RouteRecordRaw } from 'vue-router'
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { supabase } from '../lib/supabase'
import { adminRoutes } from '../admin/router'

// ========================================
// Admin V2 Auth Check (uses adminAuth.store)
// ========================================
const ADMIN_SESSION_KEY = 'admin_v2_session'

const isAdminV2SessionValid = (): boolean => {
  try {
    const stored = localStorage.getItem(ADMIN_SESSION_KEY)
    if (!stored) return false
    const session = JSON.parse(stored)
    return session && Date.now() < session.expiresAt
  } catch {
    return false
  }
}

/**
 * Clear admin session cache (call when logging out)
 */
export const clearAdminSessionCache = () => {
  localStorage.removeItem(ADMIN_SESSION_KEY)
}

export const routes: RouteRecordRaw[] = [
  // ========================================
  // Public routes (ไม่ต้อง login)
  // ========================================
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
  {
    path: '/verify-email',
    name: 'VerifyEmail',
    component: () => import('../views/EmailVerificationView.vue'),
    meta: { hideNavigation: true, public: true }
  },
  {
    path: '/auth/callback',
    name: 'AuthCallback',
    component: () => import('../views/AuthCallbackView.vue'),
    meta: { hideNavigation: true, public: true }
  },
  {
    path: '/onboarding',
    name: 'Onboarding',
    component: () => import('../views/OnboardingView.vue'),
    meta: { hideNavigation: true, public: true }
  },
  {
    path: '/track/:shareCode',
    name: 'TripTrack',
    component: () => import('../views/TripTrackView.vue'),
    meta: { hideNavigation: true, public: true }
  },
  {
    path: '/tracking',
    name: 'TrackingLanding',
    component: () => import('../views/TrackingLandingView.vue'),
    meta: { hideNavigation: true, public: true }
  },
  {
    path: '/tracking/:trackingId',
    name: 'OrderTracking',
    component: () => import('../views/OrderTrackingView.vue'),
    meta: { hideNavigation: true, public: true }
  },

  // ========================================
  // Root redirect based on role
  // ========================================
  {
    path: '/',
    redirect: '/customer'
  },
  // Legacy/shortcut redirects
  {
    path: '/saved-places',
    redirect: (to) => ({
      path: '/customer/saved-places',
      query: to.query
    })
  },

  // ========================================
  // Customer Routes (ลูกค้า)
  // ========================================
  {
    path: '/customer',
    name: 'CustomerHome',
    component: () => import('../views/CustomerHomeView.vue'),
    meta: { requiresAuth: true, isCustomerRoute: true }
  },
  {
    path: '/customer/home-legacy',
    name: 'CustomerHomeLegacy',
    component: () => import('../views/HomeView.vue'),
    meta: { requiresAuth: true, isCustomerRoute: true }
  },
  {
    path: '/customer/services',
    name: 'CustomerServices',
    component: () => import('../views/CustomerServicesView.vue'),
    meta: { requiresAuth: true, isCustomerRoute: true }
  },
  {
    path: '/customer/services-legacy',
    name: 'CustomerServicesLegacy',
    component: () => import('../views/ServicesView.vue'),
    meta: { requiresAuth: true, isCustomerRoute: true }
  },

  {
    path: '/customer/ride',
    name: 'CustomerRide',
    component: () => import('../views/RideView.vue'),
    meta: { requiresAuth: true, isCustomerRoute: true }
  },
  {
    path: '/customer/ride-v2',
    name: 'CustomerRideV2',
    component: () => import('../views/customer/RideBookingView.vue'),
    meta: { requiresAuth: true, isCustomerRoute: true, hideNavigation: true }
  },
  {
    path: '/customer/delivery',
    name: 'CustomerDelivery',
    component: () => import('../views/DeliveryView.vue'),
    meta: { requiresAuth: true, isCustomerRoute: true, hideNavigation: true }
  },
  {
    path: '/customer/delivery-legacy',
    name: 'CustomerDeliveryLegacy',
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
    path: '/customer/payment-methods',
    name: 'CustomerPaymentMethods',
    component: () => import('../views/PaymentMethodsView.vue'),
    meta: { requiresAuth: true, isCustomerRoute: true }
  },
  {
    path: '/customer/notifications',
    name: 'CustomerNotifications',
    component: () => import('../views/NotificationsView.vue'),
    meta: { requiresAuth: true, isCustomerRoute: true }
  },
  {
    path: '/customer/receipt/:id',
    name: 'CustomerReceipt',
    component: () => import('../views/ReceiptView.vue'),
    meta: { requiresAuth: true, isCustomerRoute: true }
  },
  {
    path: '/customer/saved-places',
    name: 'CustomerSavedPlaces',
    component: () => import('../views/SavedPlacesView.vue'),
    meta: { requiresAuth: true, isCustomerRoute: true }
  },
  {
    path: '/customer/settings',
    name: 'CustomerSettings',
    component: () => import('../views/SettingsView.vue'),
    meta: { requiresAuth: true, isCustomerRoute: true }
  },
  {
    path: '/customer/help',
    name: 'CustomerHelp',
    component: () => import('../views/HelpView.vue'),
    meta: { requiresAuth: true, isCustomerRoute: true }
  },
  {
    path: '/customer/wallet',
    name: 'CustomerWallet',
    component: () => import('../views/WalletView.vue'),
    meta: { requiresAuth: true, isCustomerRoute: true }
  },
  {
    path: '/customer/promotions',
    name: 'CustomerPromotions',
    component: () => import('../views/PromotionsView.vue'),
    meta: { requiresAuth: true, isCustomerRoute: true }
  },
  {
    path: '/customer/referral',
    name: 'CustomerReferral',
    component: () => import('../views/ReferralView.vue'),
    meta: { requiresAuth: true, isCustomerRoute: true }
  },
  {
    path: '/customer/subscription',
    name: 'CustomerSubscription',
    component: () => import('../views/SubscriptionView.vue'),
    meta: { requiresAuth: true, isCustomerRoute: true }
  },
  {
    path: '/customer/scheduled-rides',
    name: 'CustomerScheduledRides',
    component: () => import('../views/ScheduledRidesView.vue'),
    meta: { requiresAuth: true, isCustomerRoute: true }
  },
  {
    path: '/customer/insurance',
    name: 'CustomerInsurance',
    component: () => import('../views/InsuranceView.vue'),
    meta: { requiresAuth: true, isCustomerRoute: true }
  },
  {
    path: '/customer/favorite-drivers',
    name: 'CustomerFavoriteDrivers',
    component: () => import('../views/FavoriteDriversView.vue'),
    meta: { requiresAuth: true, isCustomerRoute: true }
  },
  {
    path: '/customer/safety',
    name: 'CustomerSafety',
    component: () => import('../views/SafetyView.vue'),
    meta: { requiresAuth: true, isCustomerRoute: true }
  },
  {
    path: '/customer/loyalty',
    name: 'CustomerLoyalty',
    component: () => import('../views/LoyaltyView.vue'),
    meta: { requiresAuth: true, isCustomerRoute: true }
  },
  {
    path: '/customer/queue-booking',
    name: 'CustomerQueueBooking',
    component: () => import('../views/QueueBookingViewV2.vue'),
    meta: { requiresAuth: true, isCustomerRoute: true }
  },
  {
    path: '/customer/queue-history',
    name: 'CustomerQueueHistory',
    component: () => import('../views/CustomerServicesView.vue'),
    meta: { requiresAuth: true, isCustomerRoute: true }
  },
  {
    path: '/customer/moving',
    name: 'CustomerMoving',
    component: () => import('../views/MovingView.vue'),
    meta: { requiresAuth: true, isCustomerRoute: true }
  },
  {
    path: '/customer/laundry',
    name: 'CustomerLaundry',
    component: () => import('../views/LaundryView.vue'),
    meta: { requiresAuth: true, isCustomerRoute: true }
  },
  {
    path: '/customer/become-provider',
    redirect: '/provider/onboarding'
  },
  // Tracking Views for New Services
  {
    path: '/customer/queue-booking/:id',
    name: 'queue-tracking',
    component: () => import('../views/QueueTrackingView.vue'),
    meta: { requiresAuth: true, isCustomerRoute: true }
  },
  {
    path: '/customer/moving/:id',
    name: 'moving-tracking',
    component: () => import('../views/MovingTrackingView.vue'),
    meta: { requiresAuth: true, isCustomerRoute: true }
  },
  {
    path: '/customer/laundry/:id',
    name: 'laundry-tracking',
    component: () => import('../views/LaundryTrackingView.vue'),
    meta: { requiresAuth: true, isCustomerRoute: true }
  },

  // ========================================
  // Provider Routes (ไรเดอร์/คนขับ)
  // ========================================
  {
    path: '/provider',
    name: 'ProviderDashboard',
    component: () => import('../views/provider/ProviderDashboardView.vue'),
    meta: { requiresAuth: true, hideNavigation: true, isProviderRoute: true }
  },
  {
    path: '/provider/wallet',
    redirect: '/customer/wallet'  // Shared wallet - redirect to main wallet page
  },
  {
    path: '/provider/earnings',
    name: 'ProviderEarnings',
    component: () => import('../views/provider/ProviderEarningsView.vue'),
    meta: { requiresAuth: true, hideNavigation: true, isProviderRoute: true }
  },
  {
    path: '/provider/history',
    name: 'ProviderHistory',
    component: () => import('../views/provider/ProviderHistoryView.vue'),
    meta: { requiresAuth: true, hideNavigation: true, isProviderRoute: true }
  },
  {
    path: '/provider/profile',
    name: 'ProviderProfile',
    component: () => import('../views/provider/ProviderProfileView.vue'),
    meta: { requiresAuth: true, hideNavigation: true, isProviderRoute: true }
  },
  {
    path: '/provider/onboarding',
    name: 'ProviderOnboarding',
    component: () => import('../views/ProviderOnboardingView.vue'),
    meta: { requiresAuth: true, hideNavigation: true, isProviderRoute: true }
  },
  {
    path: '/provider/register',
    name: 'ProviderRegister',
    component: () => import('../views/ProviderRegisterView.vue'),
    meta: { requiresAuth: true, hideNavigation: true, isProviderRoute: true }
  },
  {
    path: '/provider/vehicle',
    name: 'ProviderVehicle',
    component: () => import('../views/provider/ProviderVehicleView.vue'),
    meta: { requiresAuth: true, hideNavigation: true, isProviderRoute: true }
  },
  {
    path: '/provider/documents',
    name: 'ProviderDocuments',
    component: () => import('../views/provider/ProviderDocumentsView.vue'),
    meta: { requiresAuth: true, hideNavigation: true, isProviderRoute: true }
  },
  {
    path: '/provider/bank',
    name: 'ProviderBank',
    component: () => import('../views/provider/ProviderBankView.vue'),
    meta: { requiresAuth: true, hideNavigation: true, isProviderRoute: true }
  },
  {
    path: '/provider/performance',
    name: 'ProviderPerformance',
    component: () => import('../views/provider/ProviderPerformanceView.vue'),
    meta: { requiresAuth: true, hideNavigation: true, isProviderRoute: true }
  },
  {
    path: '/provider/jobs',
    name: 'ProviderJobs',
    component: () => import('../views/provider/ProviderJobsView.vue'),
    meta: { requiresAuth: true, hideNavigation: true, isProviderRoute: true }
  },
  {
    path: '/provider/my-jobs',
    name: 'ProviderMyJobs',
    component: () => import('../views/provider/ProviderMyJobsView.vue'),
    meta: { requiresAuth: true, hideNavigation: true, isProviderRoute: true }
  },
  {
    path: '/provider/scheduled-rides',
    name: 'ProviderScheduledRides',
    component: () => import('../views/provider/ProviderScheduledRidesView.vue'),
    meta: { requiresAuth: true, hideNavigation: true, isProviderRoute: true }
  },
  {
    path: '/provider/notifications',
    name: 'ProviderNotifications',
    component: () => import('../views/NotificationsView.vue'),
    meta: { requiresAuth: true, hideNavigation: true, isProviderRoute: true }
  },
  {
    path: '/provider/settings',
    name: 'ProviderSettings',
    component: () => import('../views/SettingsView.vue'),
    meta: { requiresAuth: true, hideNavigation: true, isProviderRoute: true }
  },
  {
    path: '/provider/help',
    name: 'ProviderHelp',
    component: () => import('../views/HelpView.vue'),
    meta: { requiresAuth: true, hideNavigation: true, isProviderRoute: true }
  },
  {
    path: '/provider/incentives',
    name: 'ProviderIncentives',
    component: () => import('../views/provider/ProviderIncentivesView.vue'),
    meta: { requiresAuth: true, hideNavigation: true, isProviderRoute: true }
  },
  {
    path: '/provider/notification-settings',
    name: 'ProviderNotificationSettings',
    component: () => import('../views/provider/ProviderNotificationSettingsView.vue'),
    meta: { requiresAuth: true, hideNavigation: true, isProviderRoute: true }
  },

  // ========================================
  // Admin V2 Routes (integrated from admin/router.ts)
  // ========================================
  ...adminRoutes,

  // ========================================
  // Multi-Role Ride Booking System V3
  // ========================================
]


// Create router instance
const router = createRouter({
  history: createWebHistory(),
  routes
})

// Navigation guard - ADMIN FIRST, then customer/provider
router.beforeEach(async (to, _from, next) => {
  // ========================================
  // 1. ADMIN ROUTES - Completely separate from customer auth
  // Admin uses adminAuth.store.ts (Demo Mode with localStorage)
  // ========================================
  const isAdminRoute = to.path.startsWith('/admin')
  
  if (isAdminRoute) {
    // Admin login page - always accessible
    if (to.path === '/admin/login') {
      // If already logged in, redirect to dashboard
      if (isAdminV2SessionValid()) {
        return next('/admin/dashboard')
      }
      return next()
    }
    
    // Other admin routes - require admin session
    if (to.meta.requiresAdmin) {
      if (!isAdminV2SessionValid()) {
        console.warn('[Router] Admin session invalid, redirecting to admin login')
        return next('/admin/login')
      }
    }
    
    // Admin route with valid session - proceed WITHOUT touching customer auth
    return next()
  }
  
  // ========================================
  // 2. PUBLIC ROUTES - No auth needed
  // ========================================
  if (to.meta.public) {
    return next()
  }
  
  // ========================================
  // 3. CUSTOMER/PROVIDER ROUTES - Need customer auth
  // Only initialize customer auth for non-admin routes
  // ========================================
  
  // Lazy import auth store to avoid loading for admin routes
  const { useAuthStore } = await import('../stores/auth')
  const authStore = useAuthStore()
  
  // Wait for auth to initialize if needed
  if (authStore.loading && !authStore.user) {
    console.log('[Router] Waiting for customer auth to initialize...')
    await new Promise(resolve => {
      const unwatch = authStore.$subscribe(() => {
        if (!authStore.loading) {
          unwatch()
          resolve(true)
        }
      })
      // Timeout after 3 seconds
      setTimeout(() => {
        unwatch()
        resolve(true)
      }, 3000)
    })
  }
  
  // Check if route requires authentication (customer or provider routes)
  if (to.meta.requiresAuth || to.meta.isCustomerRoute || to.meta.isProviderRoute) {
    if (!authStore.isAuthenticated) {
      console.warn('[Router] Route requires authentication, redirecting to login')
      return next('/login')
    }
  }
  
  // Check if route requires provider access
  if (to.meta.isProviderRoute) {
    // Allow access to onboarding/registration pages without provider check
    const allowedWithoutProvider = [
      '/provider/onboarding',
      '/provider/register',
      '/provider/documents'
    ]
    
    // For onboarding page, let the view handle the redirect logic
    if (allowedWithoutProvider.includes(to.path)) {
      return next()
    }

    // Check if user has provider account and can access
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)('can_access_provider_routes', {
        p_user_id: authStore.user?.id
      })

      if (error) {
        console.error('[Router] Provider check error:', error)
        return next('/provider/onboarding')
      }

      if (!data) {
        console.warn('[Router] No data returned from provider check')
        return next('/provider/onboarding')
      }

      // Handle both array and object responses
      const result = Array.isArray(data) ? data[0] : data as { can_access: boolean; message?: string; status?: string }

      const canAccess = result?.can_access === true
      const providerStatus = result?.status || 'unknown'

      if (!canAccess) {
        console.warn('[Router] Provider access denied:', result?.message, 'status:', providerStatus)
        return next('/provider/onboarding')
      }

      // For pending providers, redirect to onboarding (not dashboard)
      if (providerStatus === 'pending' && to.path === '/provider') {
        return next('/provider/onboarding')
      }
    } catch (err) {
      console.error('[Router] Provider check exception:', err)
      return next('/provider/onboarding')
    }
  }

  next()
})

// ========================================
// Global afterEach guard for cleanup
// ========================================
router.afterEach((to, from) => {
  if (from.path !== to.path) {
    // Dispatch cleanup event for previous route
    window.dispatchEvent(new CustomEvent('route-cleanup', {
      detail: { from: from.path, to: to.path }
    }))
    
    // Clear session cache if leaving admin routes
    if (from.path.startsWith('/admin') && !to.path.startsWith('/admin')) {
      clearAdminSessionCache()
    }
  }
})

export default router
