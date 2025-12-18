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
    component: () => import('../views/QueueBookingView.vue'),
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

  // ========================================
  // Admin Routes
  // ========================================
  {
    path: '/admin/login',
    name: 'AdminLogin',
    component: () => import('../views/AdminLoginView.vue'),
    meta: { hideNavigation: true, public: true }
  },
  {
    path: '/admin',
    redirect: '/admin/dashboard'
  },
  {
    path: '/admin/dashboard',
    name: 'AdminDashboard',
    component: () => import('../views/AdminDashboardView.vue'),
    meta: { requiresAdmin: true, hideNavigation: true }
  },
  {
    path: '/admin/users',
    name: 'AdminUsers',
    component: () => import('../views/AdminUsersView.vue'),
    meta: { requiresAdmin: true, hideNavigation: true }
  },
  {
    path: '/admin/providers',
    name: 'AdminProviders',
    component: () => import('../views/AdminProvidersView.vue'),
    meta: { requiresAdmin: true, hideNavigation: true }
  },
  {
    path: '/admin/orders',
    name: 'AdminOrders',
    component: () => import('../views/AdminOrdersView.vue'),
    meta: { requiresAdmin: true, hideNavigation: true }
  },
  {
    path: '/admin/ratings',
    name: 'AdminRatings',
    component: () => import('../views/AdminRatingsView.vue'),
    meta: { requiresAdmin: true, hideNavigation: true }
  },
  {
    path: '/admin/notifications',
    name: 'AdminNotifications',
    component: () => import('../views/AdminNotificationsView.vue'),
    meta: { requiresAdmin: true, hideNavigation: true }
  },
  {
    path: '/admin/payments',
    name: 'AdminPayments',
    component: () => import('../views/AdminPaymentsView.vue'),
    meta: { requiresAdmin: true, hideNavigation: true }
  },
  {
    path: '/admin/withdrawals',
    name: 'AdminWithdrawals',
    component: () => import('../views/AdminWithdrawalsView.vue'),
    meta: { requiresAdmin: true, hideNavigation: true }
  },
  {
    path: '/admin/support',
    name: 'AdminSupport',
    component: () => import('../views/AdminSupportView.vue'),
    meta: { requiresAdmin: true, hideNavigation: true }
  },
  {
    path: '/admin/promos',
    name: 'AdminPromos',
    component: () => import('../views/AdminPromosView.vue'),
    meta: { requiresAdmin: true, hideNavigation: true }
  },
  {
    path: '/admin/subscriptions',
    name: 'AdminSubscriptions',
    component: () => import('../views/AdminSubscriptionsView.vue'),
    meta: { requiresAdmin: true, hideNavigation: true }
  },
  {
    path: '/admin/insurance',
    name: 'AdminInsurance',
    component: () => import('../views/AdminInsuranceView.vue'),
    meta: { requiresAdmin: true, hideNavigation: true }
  },
  {
    path: '/admin/corporate',
    name: 'AdminCorporate',
    component: () => import('../views/AdminCorporateView.vue'),
    meta: { requiresAdmin: true, hideNavigation: true }
  },
  {
    path: '/admin/audit-log',
    name: 'AdminAuditLog',
    component: () => import('../views/AdminAuditLogView.vue'),
    meta: { requiresAdmin: true, hideNavigation: true }
  },
  {
    path: '/admin/analytics',
    name: 'AdminAnalytics',
    component: () => import('../views/AdminAnalyticsView.vue'),
    meta: { requiresAdmin: true, hideNavigation: true }
  },
  {
    path: '/admin/surge',
    name: 'AdminSurge',
    component: () => import('../views/AdminSurgeView.vue'),
    meta: { requiresAdmin: true, hideNavigation: true }
  },
  {
    path: '/admin/settings',
    name: 'AdminSettings',
    component: () => import('../views/AdminSettingsView.vue'),
    meta: { requiresAdmin: true, hideNavigation: true }
  },
  {
    path: '/admin/feedback',
    name: 'AdminFeedback',
    component: () => import('../views/AdminFeedbackView.vue'),
    meta: { requiresAdmin: true, hideNavigation: true }
  },
  {
    path: '/admin/service-areas',
    name: 'AdminServiceAreas',
    component: () => import('../views/AdminServiceAreaView.vue'),
    meta: { requiresAdmin: true, hideNavigation: true }
  },
  {
    path: '/admin/live-map',
    name: 'AdminLiveMap',
    component: () => import('../views/AdminLiveMapView.vue'),
    meta: { requiresAdmin: true, hideNavigation: true }
  },
  {
    path: '/admin/cancellations',
    name: 'AdminCancellations',
    component: () => import('../views/AdminCancellationsView.vue'),
    meta: { requiresAdmin: true, hideNavigation: true }
  },
  {
    path: '/admin/tips',
    name: 'AdminTips',
    component: () => import('../views/AdminTipsView.vue'),
    meta: { requiresAdmin: true, hideNavigation: true }
  },
  {
    path: '/admin/reports',
    name: 'AdminReports',
    component: () => import('../views/AdminReportsView.vue'),
    meta: { requiresAdmin: true, hideNavigation: true }
  },
  {
    path: '/admin/components',
    name: 'AdminComponents',
    component: () => import('../views/AdminComponentsView.vue'),
    meta: { requiresAdmin: true, hideNavigation: true }
  },
  {
    path: '/admin/loyalty',
    name: 'AdminLoyalty',
    component: () => import('../views/AdminLoyaltyView.vue'),
    meta: { requiresAdmin: true, hideNavigation: true }
  },
  {
    path: '/admin/wallets',
    name: 'AdminWallets',
    component: () => import('../views/AdminWalletsView.vue'),
    meta: { requiresAdmin: true, hideNavigation: true }
  },
  {
    path: '/admin/scheduled-rides',
    name: 'AdminScheduledRides',
    component: () => import('../views/AdminScheduledRidesView.vue'),
    meta: { requiresAdmin: true, hideNavigation: true }
  },
  {
    path: '/admin/referrals',
    name: 'AdminReferrals',
    component: () => import('../views/AdminReferralsView.vue'),
    meta: { requiresAdmin: true, hideNavigation: true }
  },
  {
    path: '/admin/wallet-transactions',
    name: 'AdminWalletTransactions',
    component: () => import('../views/AdminWalletTransactionsView.vue'),
    meta: { requiresAdmin: true, hideNavigation: true }
  },
  {
    path: '/admin/revenue',
    name: 'AdminRevenue',
    component: () => import('../views/AdminRevenueDashboardView.vue'),
    meta: { requiresAdmin: true, hideNavigation: true }
  },
  {
    path: '/admin/fraud-alerts',
    name: 'AdminFraudAlerts',
    component: () => import('../views/AdminFraudAlertsView.vue'),
    meta: { requiresAdmin: true, hideNavigation: true }
  },
  {
    path: '/admin/incentives',
    name: 'AdminIncentives',
    component: () => import('../views/AdminIncentivesView.vue'),
    meta: { requiresAdmin: true, hideNavigation: true }
  },
  // New Services Admin (F158, F159, F160)
  {
    path: '/admin/queue-bookings',
    name: 'AdminQueueBookings',
    component: () => import('../views/AdminQueueView.vue'),
    meta: { requiresAdmin: true, hideNavigation: true }
  },
  {
    path: '/admin/moving',
    name: 'AdminMoving',
    component: () => import('../views/AdminMovingView.vue'),
    meta: { requiresAdmin: true, hideNavigation: true }
  },
  {
    path: '/admin/laundry',
    name: 'AdminLaundry',
    component: () => import('../views/AdminLaundryView.vue'),
    meta: { requiresAdmin: true, hideNavigation: true }
  },
  {
    path: '/admin/performance',
    name: 'AdminPerformance',
    component: () => import('../views/AdminPerformanceView.vue'),
    meta: { requiresAdmin: true, hideNavigation: true }
  },
  // New Advanced Features (F33, F194, F236)
  {
    path: '/admin/driver-tracking',
    name: 'AdminDriverTracking',
    component: () => import('../views/AdminDriverTrackingView.vue'),
    meta: { requiresAdmin: true, hideNavigation: true }
  },
  {
    path: '/admin/error-recovery',
    name: 'AdminErrorRecovery',
    component: () => import('../views/AdminErrorRecoveryView.vue'),
    meta: { requiresAdmin: true, hideNavigation: true }
  },
  // Advanced System Features (F202-F251)
  {
    path: '/admin/feature-flags',
    name: 'AdminFeatureFlags',
    component: () => import('../views/AdminFeatureFlagsView.vue'),
    meta: { requiresAdmin: true, hideNavigation: true }
  },
  {
    path: '/admin/ab-tests',
    name: 'AdminABTests',
    component: () => import('../views/AdminABTestsView.vue'),
    meta: { requiresAdmin: true, hideNavigation: true }
  },
  {
    path: '/admin/system-health',
    name: 'AdminSystemHealth',
    component: () => import('../views/AdminSystemHealthView.vue'),
    meta: { requiresAuth: true, isAdminRoute: true }
  },

  {
    path: '/admin/analytics-events',
    name: 'AdminAnalyticsEvents',
    component: () => import('../views/AdminAnalyticsEventsView.vue'),
    meta: { requiresAdmin: true, hideNavigation: true }
  },
  {
    path: '/admin/user-journey',
    name: 'AdminUserJourney',
    component: () => import('../views/AdminUserJourneyView.vue'),
    meta: { requiresAdmin: true, hideNavigation: true }
  },
  {
    path: '/admin/ux-analytics',
    name: 'AdminUXAnalytics',
    component: () => import('../views/AdminUXAnalyticsView.vue'),
    meta: { requiresAdmin: true, hideNavigation: true }
  }
]
