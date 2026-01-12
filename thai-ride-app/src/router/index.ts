import type { RouteRecordRaw } from 'vue-router'
import { createRouter, createWebHistory } from 'vue-router'
import { supabase } from '../lib/supabase'
import { canAccessProviderRoutes, canAccessAdminRoutes } from '../types/role'
import type { UserRole } from '../types/role'

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
    meta: { requiresAuth: true, allowedRoles: ['customer', 'provider', 'admin', 'super_admin', 'manager', 'worker', 'client'] }
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
    path: '/customer/become-provider',
    redirect: '/provider/onboarding'
  },
  
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
  
  // Provider Routes - With Layout (requires provider access)
  {
    path: '/provider',
    component: () => import('../components/ProviderLayout.vue'),
    meta: { requiresAuth: true, hideNavigation: true, requiresProviderAccess: true },
    children: [
      {
        path: '',
        name: 'ProviderJobs',
        component: () => import('../views/provider/ProviderJobsView.vue'),
        meta: { requiresAuth: true, requiresProviderAccess: true }
      },
      {
        path: 'my-jobs',
        name: 'ProviderMyJobs',
        component: () => import('../views/provider/ProviderMyJobsView.vue'),
        meta: { requiresAuth: true, requiresProviderAccess: true }
      },
      {
        path: 'job/:id',
        name: 'ProviderJobDetail',
        component: () => import('../views/provider/ProviderJobDetailView.vue'),
        meta: { requiresAuth: true, requiresProviderAccess: true }
      },
      {
        path: 'earnings',
        name: 'ProviderEarnings',
        component: () => import('../views/provider/ProviderEarningsView.vue'),
        meta: { requiresAuth: true, requiresProviderAccess: true }
      },
      {
        path: 'profile',
        name: 'ProviderProfile',
        component: () => import('../views/provider/ProviderProfileView.vue'),
        meta: { requiresAuth: true, requiresProviderAccess: true }
      },
      {
        path: 'dashboard',
        name: 'ProviderDashboard',
        component: () => import('../views/provider/ProviderDashboardV2.vue'),
        meta: { requiresAuth: true, requiresProviderAccess: true }
      }
    ]
  },
  
  // Admin Routes (requires admin access)
  {
    path: '/admin',
    component: () => import('../components/AdminLayout.vue'),
    meta: { requiresAuth: true, hideNavigation: true, requiresAdminAccess: true },
    children: [
      {
        path: '',
        name: 'AdminDashboard',
        component: () => import('../views/admin/AdminDashboardView.vue'),
        meta: { requiresAuth: true, requiresAdminAccess: true }
      },
      {
        path: 'users',
        name: 'AdminUsers',
        component: () => import('../views/admin/AdminUsersView.vue'),
        meta: { requiresAuth: true, requiresAdminAccess: true }
      },
      {
        path: 'providers',
        name: 'AdminProviders',
        component: () => import('../views/admin/AdminProvidersView.vue'),
        meta: { requiresAuth: true, requiresAdminAccess: true }
      },
      {
        path: 'jobs',
        name: 'AdminJobs',
        component: () => import('../views/admin/AdminJobsView.vue'),
        meta: { requiresAuth: true, requiresAdminAccess: true }
      },
      {
        path: 'analytics',
        name: 'AdminAnalytics',
        component: () => import('../views/admin/AdminAnalyticsView.vue'),
        meta: { requiresAuth: true, requiresAdminAccess: true }
      }
    ]
  }
]

// Create router instance
const router = createRouter({
  history: createWebHistory(),
  routes
})

// Navigation guard with comprehensive role checking
router.beforeEach(async (to, _from, next) => {
  console.log('[Router] Navigating to:', to.path, 'Meta:', to.meta)
  
  // Public routes - allow access
  if (to.meta.public) {
    return next()
  }

  // Check authentication
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session && to.meta.requiresAuth) {
    console.log('[Router] No session, redirecting to login')
    return next('/login')
  }

  if (!session?.user) {
    console.log('[Router] No user in session, redirecting to login')
    return next('/login')
  }

  // Get user role from users table
  let userRole: UserRole = 'customer'
  try {
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (userError) {
      console.error('[Router] Error fetching user role:', userError)
    } else if (userData) {
      userRole = (userData.role as UserRole) || 'customer'
    }
  } catch (err) {
    console.error('[Router] Exception fetching user role:', err)
  }

  console.log('[Router] User role:', userRole)

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
        return next('/provider/onboarding')
      }

      console.log('[Router] Provider data:', providerData)

      if (!providerData) {
        console.log('[Router] No provider record found')
        return next('/provider/onboarding')
      }

      // Check provider status
      if (providerData.status === 'approved' || providerData.status === 'active') {
        console.log('[Router] Provider access granted - status:', providerData.status)
        // Continue to next() - access granted
      } else if (providerData.status === 'pending') {
        console.log('[Router] Provider pending approval')
        return next('/provider/onboarding')
      } else if (providerData.status === 'rejected') {
        console.log('[Router] Provider rejected')
        return next('/provider/onboarding')
      } else if (providerData.status === 'suspended') {
        console.log('[Router] Provider suspended')
        return next('/provider/onboarding')
      } else {
        console.log('[Router] Unknown provider status:', providerData.status)
        return next('/provider/onboarding')
      }
    } catch (err) {
      console.error('[Router] Provider access check exception:', err)
      return next('/provider/onboarding')
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

  // Admin routes - check admin access
  if (to.meta.requiresAdminAccess) {
    if (!canAccessAdminRoutes(userRole)) {
      console.log('[Router] Admin access denied for role:', userRole)
      return next('/customer')
    }
    console.log('[Router] Admin access granted for role:', userRole)
  }

  console.log('[Router] Navigation allowed')
  next()
})

export default router