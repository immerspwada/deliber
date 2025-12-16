import type { RouteRecordRaw } from 'vue-router'

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
    component: () => import('../views/EmailVerificationView.vue'),
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

  // ========================================
  // Root redirect based on role
  // ========================================
  {
    path: '/',
    redirect: '/customer'
  },

  // ========================================
  // Customer Routes (ลูกค้า)
  // ========================================
  {
    path: '/customer',
    name: 'CustomerHome',
    component: () => import('../views/HomeView.vue'),
    meta: { requiresAuth: true, isCustomerRoute: true }
  },
  {
    path: '/customer/services',
    name: 'CustomerServices',
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
    path: '/customer/delivery',
    name: 'CustomerDelivery',
    component: () => import('../views/DeliveryView.vue'),
    meta: { requiresAuth: true, isCustomerRoute: true }
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
    path: '/provider/register',
    name: 'ProviderRegister',
    component: () => import('../views/ProviderRegisterView.vue'),
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
  }
]
