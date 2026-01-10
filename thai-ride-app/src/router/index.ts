import type { RouteRecordRaw } from 'vue-router'
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { supabase } from '../lib/supabase'
import { adminRoutes } from '../admin/router'

// ========================================
// Admin V2 Auth Check (uses adminAuth.store)
// SECURITY FIX: Use sessionStorage instead of localStorage for admin sessions
// ========================================
const ADMIN_SESSION_KEY = 'admin_v2_session'

const isAdminV2SessionValid = (): boolean => {
  try {
    // FIXED: Check localStorage where admin auth actually stores the session
    const stored = localStorage.getItem(ADMIN_SESSION_KEY)
    if (!stored) {
      console.log('[Router] No admin session found in localStorage')
      return false
    }
    
    const session = JSON.parse(stored)
    console.log('[Router] Raw admin session data:', session)
    
    // FIXED: Validate correct session structure from adminAuth.store.ts
    // Session structure: { token, user: { id, email, name, role, permissions }, loginTime, expiresAt, isDemoMode }
    if (!session || !session.expiresAt || !session.user || !session.user.id) {
      console.log('[Router] Invalid admin session structure:', {
        hasSession: !!session,
        hasExpiresAt: !!session?.expiresAt,
        hasUser: !!session?.user,
        hasUserId: !!session?.user?.id,
        sessionKeys: session ? Object.keys(session) : [],
        userKeys: session?.user ? Object.keys(session.user) : []
      })
      return false
    }
    
    const isValid = Date.now() < session.expiresAt
    console.log('[Router] Admin session validation:', {
      hasSession: true,
      userId: session.user.id,
      userEmail: session.user.email,
      userRole: session.user.role,
      expiresAt: new Date(session.expiresAt).toLocaleString(),
      isValid,
      timeRemaining: Math.round((session.expiresAt - Date.now()) / 1000 / 60) + ' minutes'
    })
    
    return isValid
  } catch (error) {
    console.error('[Router] Error validating admin session:', error)
    return false
  }
}

/**
 * Clear admin session cache (call when logging out)
 */
export const clearAdminSessionCache = (): void => {
  // FIXED: Clear from localStorage where admin session is actually stored
  localStorage.removeItem(ADMIN_SESSION_KEY)
  console.log('[Router] Admin session cache cleared')
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
    component: () => import('../views/customer/RideViewUber.vue'),
    meta: { requiresAuth: true, isCustomerRoute: true, hideNavigation: true }
  },
  {
    path: '/customer/ride-legacy',
    name: 'CustomerRideLegacy',
    component: () => import('../views/RideView.vue'),
    meta: { requiresAuth: true, isCustomerRoute: true }
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
    component: () => import('../views/provider/ProviderDashboard.vue'),
    meta: { requiresAuth: true, hideNavigation: true, isProviderRoute: true }
  },
  {
    path: '/provider/job/:id',
    name: 'ProviderJobDetail',
    component: () => import('../views/provider/JobDetailView.vue'),
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
  console.log('[Router] Navigation to:', to.path)
  
  // ========================================
  // 1. ADMIN ROUTES - Completely separate from customer auth
  // Admin uses adminAuth.store.ts (Demo Mode with localStorage)
  // ========================================
  const isAdminRoute = to.path.startsWith('/admin')
  
  if (isAdminRoute) {
    console.log('[Router] Admin route detected:', to.path)
    
    // Admin login page - always accessible
    if (to.path === '/admin/login') {
      // If already logged in, redirect to dashboard
      const isValidSession = isAdminV2SessionValid()
      console.log('[Router] Admin login page, session valid:', isValidSession)
      if (isValidSession) {
        console.log('[Router] Redirecting to admin dashboard (already logged in)')
        return next('/admin/dashboard')
      }
      return next()
    }
    
    // Other admin routes - require admin session
    if (to.meta.requiresAdmin) {
      const isValidSession = isAdminV2SessionValid()
      console.log('[Router] Admin route requires auth, session valid:', isValidSession)
      if (!isValidSession) {
        console.warn('[Router] Admin session invalid, redirecting to admin login')
        return next('/admin/login')
      }
    }
    
    // Admin route with valid session - proceed WITHOUT touching customer auth
    console.log('[Router] Admin route access granted')
    return next()
  }
  
  // ========================================
  // 2. PUBLIC ROUTES - No auth needed
  // ========================================
  if (to.meta.public) {
    console.log('[Router] Public route, allowing access')
    return next()
  }
  
  // ========================================
  // 3. CUSTOMER/PROVIDER ROUTES - Need customer auth
  // Only initialize customer auth for non-admin routes
  // ========================================
  
  console.log('[Router] Checking customer auth for protected route')
  
  // Lazy import auth store to avoid loading for admin routes
  const { useAuthStore } = await import('../stores/auth')
  const authStore = useAuthStore()
  
  // IMPROVED: Force initialization if not done yet
  if (!authStore.user && !authStore.session && !authStore.isDemoMode) {
    console.log('[Router] Auth not initialized, forcing initialization...')
    try {
      await authStore.initialize()
    } catch (error) {
      console.error('[Router] Auth initialization failed:', error)
    }
  }
  
  // Wait for auth to initialize if needed - IMPROVED VERSION
  if (authStore.loading) {
    console.log('[Router] Waiting for customer auth to initialize...')
    await new Promise<void>(resolve => {
      const maxWait = 8000 // เพิ่มเป็น 8 วินาที
      const startTime = Date.now()
      
      const checkAuth = () => {
        // ตรวจสอบทั้ง loading และ session
        const isReady = !authStore.loading || authStore.session || authStore.isDemoMode || authStore.user
        const isTimeout = (Date.now() - startTime) > maxWait
        
        console.log('[Router] Auth check progress:', {
          loading: authStore.loading,
          hasSession: !!authStore.session,
          hasUser: !!authStore.user,
          isDemoMode: authStore.isDemoMode,
          isReady,
          isTimeout,
          elapsed: Math.round((Date.now() - startTime) / 1000) + 's'
        })
        
        if (isReady || isTimeout) {
          console.log('[Router] Auth check complete:', { 
            isReady, 
            isTimeout, 
            hasSession: !!authStore.session,
            hasUser: !!authStore.user,
            isDemoMode: authStore.isDemoMode,
            loading: authStore.loading 
          })
          resolve()
        } else {
          setTimeout(checkAuth, 100) // ลดเวลาตรวจสอบเป็น 100ms
        }
      }
      
      checkAuth()
    })
  }
  
  console.log('[Router] Auth ready, user:', authStore.user?.id, 'session:', !!authStore.session, 'isAuthenticated:', authStore.isAuthenticated, 'isDemoMode:', authStore.isDemoMode)
  
  // Check if route requires authentication (customer or provider routes)
  if (to.meta.requiresAuth || to.meta.isCustomerRoute || to.meta.isProviderRoute) {
    // FINAL FIX: Comprehensive authentication check
    const hasValidSession = !!authStore.session
    const hasUser = !!authStore.user
    const isDemoMode = authStore.isDemoMode
    const isAuthenticatedComputed = authStore.isAuthenticated
    
    // Additional fallback: Check if we have Supabase tokens in storage
    const hasSupabaseToken = (() => {
      try {
        // Check both localStorage and sessionStorage for Supabase tokens
        const storages = [localStorage, sessionStorage]
        
        for (const storage of storages) {
          const keys = Object.keys(storage)
          const hasToken = keys.some(key => {
            if (key.includes('supabase') || key.includes('sb-')) {
              const value = storage.getItem(key)
              if (value) {
                try {
                  const parsed = JSON.parse(value)
                  const hasAccessToken = !!(parsed.access_token || parsed.session?.access_token)
                  if (hasAccessToken) {
                    console.log('[Router] Found Supabase token in', storage === localStorage ? 'localStorage' : 'sessionStorage', 'key:', key)
                    return true
                  }
                } catch {
                  return false
                }
              }
            }
            return false
          })
          
          if (hasToken) return true
        }
        
        return false
      } catch {
        return false
      }
    })()
    
    // Additional fallback: Try to get current Supabase session directly
    const hasDirectSupabaseSession = (() => {
      try {
        // This is a synchronous check of current session
        const { data: { session } } = supabase.auth.getSession()
        return !!session?.access_token
      } catch {
        return false
      }
    })()
    
    console.log('[Router] Auth check details:', {
      hasValidSession,
      hasUser,
      isDemoMode,
      isAuthenticatedComputed,
      hasSupabaseToken,
      hasDirectSupabaseSession,
      route: to.path
    })
    
    // Consider user authenticated if ANY of these conditions are true
    const isUserAuthenticated = hasValidSession || hasUser || isDemoMode || hasSupabaseToken || hasDirectSupabaseSession
    
    if (!isUserAuthenticated) {
      console.warn('[Router] Route requires authentication, redirecting to login. Auth state:', {
        session: !!authStore.session,
        user: !!authStore.user,
        isDemoMode,
        isAuthenticated: authStore.isAuthenticated,
        hasSupabaseToken,
        hasDirectSupabaseSession,
        route: to.path
      })
      return next('/login')
    }
    
    console.log('[Router] Authentication check passed for route:', to.path)
  }
  
  // ========================================
  // MULTI-ROLE SUPPORT: Customer routes accessible by all authenticated users
  // All roles (customer, driver, rider, admin) can use customer features
  // ========================================
  if (to.meta.isCustomerRoute) {
    // Allow all authenticated users to access customer routes
    // This enables drivers/riders to also book rides as customers
    return next()
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

    // Check if user has provider account in service_providers table
    try {
      // Make sure we have user_id
      if (!authStore.user?.id) {
        console.warn('[Router] No user ID available')
        return next('/login')
      }

      const { data: providerData, error: providerError } = await supabase
        .from('providers_v2')
        .select('id, status')
        .eq('user_id', authStore.user.id)
        .maybeSingle()

      if (providerError) {
        console.error('[Router] Provider check error:', providerError)
        return next('/provider/onboarding')
      }

      // No provider account found
      if (!providerData) {
        console.warn('[Router] No provider account found')
        return next('/provider/onboarding')
      }

      const providerStatus = (providerData as any).status

      // Check provider status
      if (providerStatus === 'pending') {
        console.log('[Router] Provider status pending, redirecting to onboarding')
        return next('/provider/onboarding')
      }

      if (providerStatus === 'rejected' || providerStatus === 'suspended') {
        console.warn('[Router] Provider status:', providerStatus)
        return next('/provider/onboarding')
      }

      // Only approved/active providers can access
      if (providerStatus !== 'approved' && providerStatus !== 'active') {
        console.warn('[Router] Invalid provider status:', providerStatus)
        return next('/provider/onboarding')
      }

      // Provider is approved/active, allow access
      console.log('[Router] Provider access granted, status:', providerStatus)
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
