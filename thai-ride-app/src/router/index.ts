import type { RouteRecordRaw } from 'vue-router'

export const routes: RouteRecordRaw[] = [
  // Public routes (ไม่ต้อง login)
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

  // Protected routes (ต้อง login)
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/HomeView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/services',
    name: 'Services',
    component: () => import('../views/ServicesView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/ride',
    name: 'Ride',
    component: () => import('../views/RideView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/delivery',
    name: 'Delivery',
    component: () => import('../views/DeliveryView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/shopping',
    name: 'Shopping',
    component: () => import('../views/ShoppingView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('../views/ProfileView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/provider',
    name: 'Provider',
    component: () => import('../views/ProviderView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/provider/register',
    name: 'ProviderRegister',
    component: () => import('../views/ProviderRegisterView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/history',
    name: 'History',
    component: () => import('../views/HistoryView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/payment-methods',
    name: 'PaymentMethods',
    component: () => import('../views/PaymentMethodsView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/notifications',
    name: 'Notifications',
    component: () => import('../views/NotificationsView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/receipt/:id',
    name: 'Receipt',
    component: () => import('../views/ReceiptView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/saved-places',
    name: 'SavedPlaces',
    component: () => import('../views/SavedPlacesView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('../views/SettingsView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/help',
    name: 'Help',
    component: () => import('../views/HelpView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/wallet',
    name: 'Wallet',
    component: () => import('../views/WalletView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/promotions',
    name: 'Promotions',
    component: () => import('../views/PromotionsView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/referral',
    name: 'Referral',
    component: () => import('../views/ReferralView.vue'),
    meta: { requiresAuth: true }
  },

  // ========================================
  // Advanced Features (ฟีเจอร์ใหม่)
  // ========================================
  {
    path: '/subscription',
    name: 'Subscription',
    component: () => import('../views/SubscriptionView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/scheduled-rides',
    name: 'ScheduledRides',
    component: () => import('../views/ScheduledRidesView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/insurance',
    name: 'Insurance',
    component: () => import('../views/InsuranceView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/favorite-drivers',
    name: 'FavoriteDrivers',
    component: () => import('../views/FavoriteDriversView.vue'),
    meta: { requiresAuth: true }
  },

  // ========================================
  // Admin routes (แยกออกจากผู้ใช้ทั่วไป)
  // ========================================
  {
    path: '/admin/login',
    name: 'AdminLogin',
    component: () => import('../views/AdminLoginView.vue'),
    meta: { hideNavigation: true, public: true, isAdminRoute: true }
  },
  {
    path: '/admin',
    name: 'AdminDashboard',
    component: () => import('../views/AdminDashboardView.vue'),
    meta: { hideNavigation: true, requiresAdminAuth: true, isAdminRoute: true }
  },
  {
    path: '/admin/users',
    name: 'AdminUsers',
    component: () => import('../views/AdminUsersView.vue'),
    meta: { hideNavigation: true, requiresAdminAuth: true, isAdminRoute: true }
  },
  {
    path: '/admin/providers',
    name: 'AdminProviders',
    component: () => import('../views/AdminProvidersView.vue'),
    meta: { hideNavigation: true, requiresAdminAuth: true, isAdminRoute: true }
  },
  {
    path: '/admin/orders',
    name: 'AdminOrders',
    component: () => import('../views/AdminOrdersView.vue'),
    meta: { hideNavigation: true, requiresAdminAuth: true, isAdminRoute: true }
  },
  {
    path: '/admin/payments',
    name: 'AdminPayments',
    component: () => import('../views/AdminPaymentsView.vue'),
    meta: { hideNavigation: true, requiresAdminAuth: true, isAdminRoute: true }
  },
  {
    path: '/admin/support',
    name: 'AdminSupport',
    component: () => import('../views/AdminSupportView.vue'),
    meta: { hideNavigation: true, requiresAdminAuth: true, isAdminRoute: true }
  },
  {
    path: '/admin/promos',
    name: 'AdminPromos',
    component: () => import('../views/AdminPromosView.vue'),
    meta: { hideNavigation: true, requiresAdminAuth: true, isAdminRoute: true }
  },
  {
    path: '/admin/subscriptions',
    name: 'AdminSubscriptions',
    component: () => import('../views/AdminSubscriptionsView.vue'),
    meta: { hideNavigation: true, requiresAdminAuth: true, isAdminRoute: true }
  },
  {
    path: '/admin/insurance',
    name: 'AdminInsurance',
    component: () => import('../views/AdminInsuranceView.vue'),
    meta: { hideNavigation: true, requiresAdminAuth: true, isAdminRoute: true }
  },
  {
    path: '/admin/corporate',
    name: 'AdminCorporate',
    component: () => import('../views/AdminCorporateView.vue'),
    meta: { hideNavigation: true, requiresAdminAuth: true, isAdminRoute: true }
  },
  {
    path: '/admin/ratings',
    name: 'AdminRatings',
    component: () => import('../views/AdminRatingsView.vue'),
    meta: { hideNavigation: true, requiresAdminAuth: true, isAdminRoute: true }
  },
  {
    path: '/admin/notifications',
    name: 'AdminNotifications',
    component: () => import('../views/AdminNotificationsView.vue'),
    meta: { hideNavigation: true, requiresAdminAuth: true, isAdminRoute: true }
  }
]
