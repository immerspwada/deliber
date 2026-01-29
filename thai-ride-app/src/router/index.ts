import type { RouteRecordRaw } from 'vue-router'
import { createRouter, createWebHistory } from 'vue-router'
import { supabase } from '../lib/supabase'
import { canAccessAdminRoutes } from '../types/role'
import type { UserRole } from '../types/role'
import { adminRoutes } from '../admin/router'

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
  {
    path: '/suspended',
    name: 'Suspended',
    component: () => import('../views/SuspendedView.vue'),
    meta: { hideNavigation: true, public: true }
  },
  
  // Public tracking page (no auth required)
  {
    path: '/track/:token',
    name: 'SharedRideTracking',
    component: () => import('../views/public/SharedRideTrackingView.vue'),
    meta: { hideNavigation: true, public: true }
  },
  
  // Public delivery tracking by tracking ID (no auth required)
  {
    path: '/tracking/:trackingId',
    name: 'PublicTracking',
    component: () => import('../views/PublicTrackingView.vue'),
    meta: { hideNavigation: true, public: true }
  },
  
  // Root redirect
  {
    path: '/',
    redirect: '/customer'
  },
  
  // Customer Routes (accessible by all roles)
  {
    path: '/customer',
    name: 'CustomerHome',
    component: () => import('../views/CustomerHomeView.vue'),
    meta: { requiresAuth: true, allowedRoles: ['customer', 'provider', 'admin', 'super_admin', 'manager', 'worker', 'client'] }
  },
  {
    path: '/customer/services',
    name: 'CustomerServices',
    component: () => import('../views/CustomerServicesView.vue'),
    meta: { requiresAuth: true, allowedRoles: ['customer', 'provider', 'admin', 'super_admin', 'manager', 'worker', 'client'] }
  },
  {
    path: '/customer/ride',
    name: 'CustomerRide',
    component: () => import('../views/customer/RideViewRefactored.vue'),
    meta: { requiresAuth: true, hideNavigation: true, allowedRoles: ['customer', 'provider', 'admin', 'super_admin', 'manager', 'worker', 'client'] }
  },
  {
    path: '/customer/delivery',
    name: 'CustomerDelivery',
    component: () => import('../views/DeliveryView.vue'),
    meta: { requiresAuth: true, hideNavigation: true, allowedRoles: ['customer', 'provider', 'admin', 'super_admin', 'manager', 'worker', 'client'] }
  },
  {
    path: '/customer/shopping',
    name: 'CustomerShopping',
    component: () => import('../views/ShoppingView.vue'),
    meta: { requiresAuth: true, hideNavigation: true, allowedRoles: ['customer', 'provider', 'admin', 'super_admin', 'manager', 'worker', 'client'] }
  },
  {
    path: '/customer/profile',
    name: 'CustomerProfile',
    component: () => import('../views/ProfileView.vue'),
    meta: { requiresAuth: true, allowedRoles: ['customer', 'provider', 'admin', 'super_admin', 'manager', 'worker', 'client'] }
  },
  {
    path: '/customer/history',
    name: 'CustomerHistory',
    component: () => import('../views/HistoryView.vue'),
    meta: { requiresAuth: true, allowedRoles: ['customer', 'provider', 'admin', 'super_admin', 'manager', 'worker', 'client'] }
  },
  {
    path: '/customer/wallet',
    name: 'CustomerWallet',
    component: () => import('../views/WalletView.vue'),
    meta: { requiresAuth: true, allowedRoles: ['customer', 'provider', 'admin', 'super_admin', 'manager', 'worker', 'client'] }
  },
  {
    path: '/customer/saved-places',
    name: 'CustomerSavedPlaces',
    component: () => import('../views/SavedPlacesView.vue'),
    meta: { requiresAuth: true, allowedRoles: ['customer', 'provider', 'admin', 'super_admin', 'manager', 'worker', 'client'] }
  },
  {
    path: '/customer/queue-booking',
    name: 'CustomerQueueBooking',
    component: () => import('../views/QueueBookingView.vue'),
    meta: { requiresAuth: true, hideNavigation: true, allowedRoles: ['customer', 'provider', 'admin', 'super_admin', 'manager', 'worker', 'client'] }
  },
  {
    path: '/customer/queue-booking/:id',
    name: 'QueueBookingTracking',
    component: () => import('../views/QueueTrackingView.vue'),
    meta: { requiresAuth: true, hideNavigation: true, allowedRoles: ['customer', 'provider', 'admin', 'super_admin', 'manager', 'worker', 'client'] }
  },
  {
    path: '/customer/become-provider',
    redirect: '/provider/onboarding'
  },
  
  // Demo Routes
  // Demo routes removed - FloatingActionBarDemo deleted
  
  // Provider Routes - Onboarding (accessible by all roles)
  {
    path: '/provider/onboarding',
    name: 'ProviderOnboarding',
    component: () => import('../views/ProviderOnboardingView.vue'),
    meta: { requiresAuth: true, hideNavigation: true, allowWithoutProvider: true, allowedRoles: ['customer', 'provider', 'admin', 'super_admin', 'manager', 'worker'] }
  },
  {
    path: '/provider/register',
    name: 'ProviderRegister',
    component: () => import('../views/ProviderRegisterView.vue'),
    meta: { requiresAuth: true, hideNavigation: true, allowWithoutProvider: true, allowedRoles: ['customer', 'provider', 'admin', 'super_admin', 'manager', 'worker'] }
  },
  
  // Provider Routes - New Design (Green Theme)
  {
    path: '/provider',
    component: () => import('../components/ProviderLayoutNew.vue'),
    meta: { requiresAuth: true, hideNavigation: true, requiresProviderAccess: true },
    children: [
      {
        path: '',
        name: 'ProviderHome',
        component: () => import('../views/provider/ProviderHome.vue'),
        meta: { requiresAuth: true, requiresProviderAccess: true }
      },
      {
        path: 'orders',
        name: 'ProviderOrders',
        component: () => import('../views/provider/ProviderOrdersNew.vue'),
        meta: { requiresAuth: true, requiresProviderAccess: true }
      },
      {
        path: 'wallet',
        name: 'ProviderWallet',
        component: () => import('../views/provider/ProviderWalletView.vue'),
        meta: { requiresAuth: true, requiresProviderAccess: true }
      },
      {
        path: 'chat',
        name: 'ProviderChat',
        component: () => import('../views/provider/ProviderChatNew.vue'),
        meta: { requiresAuth: true, requiresProviderAccess: true }
      },
      {
        path: 'profile',
        name: 'ProviderProfile',
        component: () => import('../views/provider/ProviderProfileNew.vue'),
        meta: { requiresAuth: true, requiresProviderAccess: true }
      },
      {
        path: 'notifications',
        name: 'ProviderNotificationPreferences',
        component: () => import('../views/provider/NotificationPreferencesView.vue'),
        meta: { requiresAuth: true, requiresProviderAccess: true }
      },
      // Job Detail - Step-based routing
      {
        path: 'job/:id',
        name: 'ProviderJobDetail',
        component: () => import('../views/provider/job/ProviderJobLayout.vue'),
        meta: { requiresAuth: true, requiresProviderAccess: true, hideNavigation: true }
      },
      {
        path: 'job/:id/:step',
        name: 'ProviderJobStep',
        component: () => import('../views/provider/job/ProviderJobLayout.vue'),
        meta: { requiresAuth: true, requiresProviderAccess: true, hideNavigation: true }
      },
      // Legacy route (old design)
      {
        path: 'job-legacy/:id',
        name: 'ProviderJobDetailLegacy',
        component: () => import('../views/provider/ProviderJobDetailPro.vue'),
        meta: { requiresAuth: true, requiresProviderAccess: true, hideNavigation: true }
      },
      {
        path: 'job-minimal/:id',
        name: 'ProviderJobDetailMinimal',
        component: () => import('../views/provider/ProviderJobDetailMinimal.vue'),
        meta: { requiresAuth: true, requiresProviderAccess: true, hideNavigation: true }
      },
      // Legacy routes (redirect to new)
      {
        path: 'job',
        redirect: '/provider/orders'
      },
      {
        path: 'my-jobs',
        redirect: '/provider/orders'
      },
      {
        path: 'earnings',
        redirect: '/provider/wallet'
      },
      {
        path: 'dashboard',
        redirect: '/provider'
      }
    ]
  },
  
  // Admin Routes - Use Admin V2 System
  ...adminRoutes
]

// Create router instance
const router = createRouter({
  history: createWebHistory(),
  routes
})

// Navigation guard with comprehensive role checking
// PRODUCTION ONLY - No demo mode, uses real Supabase authentication
router.beforeEach(async (to, _from, next) => {
  console.log('[Router] Navigating to:', to.path, 'Meta:', to.meta)
  
  // ========================================
  // ADMIN ROUTES - Use Admin V2 Auth System
  // ========================================
  if (to.path.startsWith('/admin')) {
    // Admin routes use their own auth system (adminAuth.store.ts)
    // Check if this is the login page
    if (to.meta.public) {
      return next()
    }

    // For protected admin routes, check admin auth
    const { useAdminAuthStore } = await import('../admin/stores/adminAuth.store')
    const adminAuthStore = useAdminAuthStore()
    
    // Initialize admin auth if not already done
    const isAuthenticated = await adminAuthStore.initialize()
    
    if (!isAuthenticated) {
      console.log('[Router] Admin not authenticated, redirecting to login')
      return next('/admin/login')
    }
    
    console.log('[Router] Admin authenticated, allowing access')
    return next()
  }

  // ========================================
  // CUSTOMER/PROVIDER ROUTES - Use Supabase Auth
  // ========================================
  
  // Public routes - allow access
  if (to.meta.public) {
    return next()
  }

  // Check real Supabase authentication
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session && to.meta.requiresAuth) {
    console.log('[Router] No session, redirecting to login')
    return next('/login')
  }

  if (!session?.user) {
    console.log('[Router] No user in session, redirecting to login')
    return next('/login')
  }

  // Get user role and status from users table
  let userRole: UserRole = 'customer'
  let userStatus: string = 'active'
  try {
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role, status')
      .eq('id', session.user.id)
      .single()

    if (userError) {
      console.error('[Router] Error fetching user data:', userError)
    } else if (userData) {
      userRole = (userData.role as UserRole) || 'customer'
      userStatus = userData.status || 'active'
    }
  } catch (err) {
    console.error('[Router] Exception fetching user data:', err)
  }

  console.log('[Router] User role:', userRole, 'Status:', userStatus)

  // SECURITY CHECK: Block suspended users from accessing protected routes
  if (userStatus === 'suspended' && to.path !== '/suspended') {
    console.log('[Router] User is suspended, redirecting to suspended page')
    return next('/suspended')
  }
  
  // Allow suspended users to access suspended page
  if (to.path === '/suspended' && userStatus !== 'suspended') {
    console.log('[Router] User is not suspended, redirecting to customer home')
    return next('/customer')
  }

  // PHASE 1: Special handling for provider onboarding routes - ต้องมาก่อน provider access check
  if (to.path.includes('/provider/onboarding') || to.path.includes('/provider/register')) {
    console.log('[Router] Allowing access to provider onboarding for role:', userRole)
    return next()
  }

  // PHASE 2: Special handling for /customer/become-provider redirect
  if (to.path === '/customer/become-provider') {
    console.log('[Router] Redirecting become-provider to onboarding')
    return next('/provider/onboarding')
  }

  // PHASE 3: Provider routes - check provider access directly from providers_v2 table
  if (to.meta.requiresProviderAccess && !to.meta.allowWithoutProvider) {
    try {
      console.log('[Router] Checking provider access directly from providers_v2...')
      
      // Query providers_v2 table directly - only select columns that exist
      const { data: providerData, error: providerError } = await supabase
        .from('providers_v2')
        .select('id, status')
        .eq('user_id', session.user.id)
        .maybeSingle()

      if (providerError) {
        console.error('[Router] Provider query error:', providerError)
        // Allow access anyway - let the component handle the error
        console.log('[Router] Allowing access despite query error')
      } else if (!providerData) {
        console.log('[Router] No provider record found - allowing access to see empty state')
        // Allow access - the dashboard will show appropriate message
      } else {
        // Check provider status
        const status = (providerData as any).status
        if (status === 'approved' || status === 'active') {
          console.log('[Router] Provider access granted - status:', status)
        } else if (status === 'pending') {
          console.log('[Router] Provider pending approval - allowing access to see status')
        } else if (status === 'rejected') {
          console.log('[Router] Provider rejected - redirecting to onboarding')
          return next('/provider/onboarding')
        } else if (status === 'suspended') {
          console.log('[Router] Provider suspended - redirecting to onboarding')
          return next('/provider/onboarding')
        } else {
          console.log('[Router] Unknown provider status:', status)
        }
      }
    } catch (err) {
      console.error('[Router] Provider access check exception:', err)
      // Allow access anyway - let the component handle the error
      console.log('[Router] Allowing access despite exception')
    }
  }

  // Check role-based access (after provider access check)
  if (to.meta.allowedRoles && Array.isArray(to.meta.allowedRoles)) {
    if (!to.meta.allowedRoles.includes(userRole)) {
      console.log('[Router] Role not allowed:', userRole, 'Required:', to.meta.allowedRoles)
      
      // Special case: if user is trying to access provider routes and they're a customer, 
      // redirect to onboarding instead of customer page
      if (to.path.startsWith('/provider') && userRole === 'customer') {
        return next('/provider/onboarding')
      }
      
      return next('/customer')
    }
  }

  console.log('[Router] Navigation allowed')
  next()
})

export default router