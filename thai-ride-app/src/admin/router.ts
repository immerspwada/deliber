/**
 * Admin Router Configuration
 * ==========================
 * Routes สำหรับ Admin Dashboard V2
 */

import type { RouteRecordRaw } from 'vue-router'

// Lazy load components
const AdminShell = () => import('./components/layout/AdminShell.vue')
const LoginView = () => import('./views/LoginView.vue')
const DashboardView = () => import('./views/DashboardView.vue')

// New V2 Views
const CustomersView = () => import('./views/CustomersViewEnhanced.vue')
const ProvidersView = () => import('./views/ProvidersView.vue')
const OrdersView = () => import('./views/OrdersView.vue')
const VerificationQueueView = () => import('./views/VerificationQueueView.vue')
const RevenueView = () => import('./views/RevenueView.vue')
const PaymentsView = () => import('./views/PaymentsView.vue')
const WalletsView = () => import('./views/WalletsView.vue')
const AdminTopupRequestsView = () => import('./views/AdminTopupRequestsView.vue')
const WithdrawalsView = () => import('./views/WithdrawalsView.vue')
// const CustomerWithdrawalsView = () => import('./views/CustomerWithdrawalsView.vue')
const AdminRefundsView = () => import('../views/AdminRefundsView.vue')
const PaymentSettingsView = () => import('./views/PaymentSettingsView.vue')
const PaymentAccountsView = () => import('./views/PaymentAccountsView.vue')
const AdminFinancialSettingsView = () => import('./views/AdminFinancialSettingsView.vue')
const PromosView = () => import('./views/PromosView.vue')
const PromoManagementView = () => import('./views/PromoManagementView.vue')
const AdminReferralsView = () => import('../views/AdminReferralsView.vue')
const AdminLoyaltyView = () => import('../views/AdminLoyaltyView.vue')
const AdminIncentivesView = () => import('../views/AdminIncentivesView.vue')
const SupportView = () => import('./views/SupportView.vue')
const AdminFeedbackView = () => import('../views/AdminFeedbackView.vue')
const AdminRatingsView = () => import('../views/AdminRatingsView.vue')
const AdminFraudAlertsView = () => import('../views/AdminFraudAlertsView.vue')
const AdminAnalyticsView = () => import('../views/AdminAnalyticsView.vue')
const AdminReportsView = () => import('../views/AdminReportsView.vue')
const AdminUXAnalyticsView = () => import('../views/AdminUXAnalyticsView.vue')
const CustomerUXAnalyticsView = () => import('./views/CustomerUXAnalyticsView.vue')
// Settings views - ใช้ไฟล์ใหม่ทั้งหมด
const AdminNotificationsView = () => import('../views/AdminNotificationsView.vue')
const AdminServiceAreasView = () => import('../views/AdminServiceAreaView.vue')
const AdminServiceZonesView = () => import('../views/AdminServiceZonesView.vue')
const AdminSecurityView = () => import('../views/AdminSecurityView.vue')
const AdminAuditLogView = () => import('../views/AdminAuditLogView.vue')
const AdminLiveMapView = () => import('../views/AdminLiveMapView.vue')
const AdminScheduledRidesView = () => import('./views/ScheduledRidesView.vue')
const AdminCancellationsView = () => import('../views/AdminCancellationsView.vue')

// Service Views
const DeliveryView = () => import('./views/DeliveryView.vue')
const ShoppingView = () => import('./views/ShoppingView.vue')
const QueueBookingsView = () => import('./views/QueueBookingsView.vue')
const ServiceBundlesView = () => import('./views/ServiceBundlesView.vue')
const MovingView = () => import('./views/MovingView.vue')
const LaundryView = () => import('./views/LaundryView.vue')
const CancellationsView = () => import('./views/CancellationsView.vue')
const DriverTrackingView = () => import('./views/DriverTrackingView.vue')
const ReorderAnalyticsView = () => import('./views/ReorderAnalyticsView.vue')
const SystemLogsView = () => import('./views/SystemLogsView.vue')
const PushAnalyticsView = () => import('./views/PushAnalyticsView.vue')
const CronJobMonitoringView = () => import('./views/CronJobMonitoringView.vue')
const ProviderHeatmapView = () => import('./views/ProviderHeatmapView.vue')

export const adminRoutes: RouteRecordRaw[] = [
  // Login (no shell)
  {
    path: '/admin/login',
    name: 'AdminLoginV2',
    component: LoginView,
    meta: { public: true, hideNavigation: true }
  },
  
  // Admin routes with shell
  {
    path: '/admin',
    component: AdminShell,
    meta: { requiresAdmin: true },
    children: [
      // Dashboard
      {
        path: '',
        redirect: '/admin/dashboard'
      },
      {
        path: 'dashboard',
        name: 'AdminDashboardV2',
        component: DashboardView,
        meta: { module: 'dashboard' }
      },
      
      // Users
      {
        path: 'customers',
        name: 'AdminCustomersV2',
        component: CustomersView,
        meta: { module: 'users' }
      },
      {
        path: 'providers',
        name: 'AdminProvidersV2',
        component: ProvidersView,
        meta: { module: 'users' }
      },
      {
        path: 'verification-queue',
        name: 'AdminVerificationQueueV2',
        component: VerificationQueueView,
        meta: { module: 'users' }
      },
      
      // Orders
      {
        path: 'orders',
        name: 'AdminOrdersV2',
        component: OrdersView,
        meta: { module: 'orders' }
      },
      {
        path: 'delivery',
        name: 'AdminDeliveryV2',
        component: DeliveryView,
        meta: { module: 'orders' }
      },
      {
        path: 'shopping',
        name: 'AdminShoppingV2',
        component: ShoppingView,
        meta: { module: 'orders' }
      },
      {
        path: 'queue-bookings',
        name: 'AdminQueueBookingsV2',
        component: QueueBookingsView,
        meta: { module: 'orders' }
      },
      {
        path: 'moving',
        name: 'AdminMovingV2',
        component: MovingView,
        meta: { module: 'orders' }
      },
      {
        path: 'laundry',
        name: 'AdminLaundryV2',
        component: LaundryView,
        meta: { module: 'orders' }
      },
      {
        path: 'live-map',
        name: 'AdminLiveMapV2',
        component: AdminLiveMapView,
        meta: { module: 'orders' }
      },
      {
        path: 'driver-tracking',
        name: 'AdminDriverTrackingV2',
        component: DriverTrackingView,
        meta: { module: 'orders' }
      },
      {
        path: 'scheduled-rides',
        name: 'AdminScheduledRidesV2',
        component: AdminScheduledRidesView,
        meta: { module: 'orders' }
      },
      {
        path: 'cancellations',
        name: 'AdminCancellationsV2',
        component: CancellationsView,
        meta: { module: 'orders' }
      },
      {
        path: 'service-bundles',
        name: 'AdminServiceBundlesV2',
        component: ServiceBundlesView,
        meta: { module: 'orders' }
      },
      
      // Finance
      {
        path: 'revenue',
        name: 'AdminRevenueV2',
        component: RevenueView,
        meta: { module: 'finance' }
      },
      {
        path: 'payments',
        name: 'AdminPaymentsV2',
        component: PaymentsView,
        meta: { module: 'finance' }
      },
      {
        path: 'wallets',
        name: 'AdminWalletsV2',
        component: WalletsView,
        meta: { module: 'finance' }
      },
      {
        path: 'topup-requests',
        name: 'AdminTopupRequestsV2',
        component: AdminTopupRequestsView,
        meta: { module: 'finance' }
      },
      {
        path: 'topup-requests/settings',
        name: 'AdminTopupSettingsV2',
        component: AdminTopupRequestsView,
        meta: { module: 'finance', tab: 'settings' }
      },
      {
        path: 'topup-requests/payment-info',
        name: 'AdminPaymentInfoV2',
        component: () => import('./views/PaymentInfoView.vue'),
        meta: { module: 'finance' }
      },
      {
        path: 'withdrawals',
        name: 'AdminWithdrawalsV2',
        component: WithdrawalsView,
        meta: { module: 'finance' }
      },
      // {
      //   path: 'customer-withdrawals',
      //   name: 'AdminCustomerWithdrawalsV2',
      //   component: CustomerWithdrawalsView,
      //   meta: { module: 'finance' }
      // },
      {
        path: 'refunds',
        name: 'AdminRefundsV2',
        component: AdminRefundsView,
        meta: { module: 'finance' }
      },
      {
        path: 'payment-accounts',
        name: 'AdminPaymentAccountsV2',
        component: PaymentAccountsView,
        meta: { module: 'finance' }
      },

      
      // Marketing
      {
        path: 'promos',
        name: 'AdminPromosV2',
        component: PromoManagementView,
        meta: { module: 'marketing' }
      },
      {
        path: 'promos-legacy',
        name: 'AdminPromosLegacy',
        component: PromosView,
        meta: { module: 'marketing' }
      },
      {
        path: 'referrals',
        name: 'AdminReferralsV2',
        component: AdminReferralsView,
        meta: { module: 'marketing' }
      },
      {
        path: 'loyalty',
        name: 'AdminLoyaltyV2',
        component: AdminLoyaltyView,
        meta: { module: 'marketing' }
      },
      {
        path: 'incentives',
        name: 'AdminIncentivesV2',
        component: AdminIncentivesView,
        meta: { module: 'marketing' }
      },
      
      // Support
      {
        path: 'support',
        name: 'AdminSupportV2',
        component: SupportView,
        meta: { module: 'support' }
      },
      {
        path: 'feedback',
        name: 'AdminFeedbackV2',
        component: AdminFeedbackView,
        meta: { module: 'support' }
      },
      {
        path: 'ratings',
        name: 'AdminRatingsV2',
        component: AdminRatingsView,
        meta: { module: 'support' }
      },
      {
        path: 'fraud-alerts',
        name: 'AdminFraudAlertsV2',
        component: AdminFraudAlertsView,
        meta: { module: 'support' }
      },
      
      // Analytics
      {
        path: 'analytics',
        name: 'AdminAnalyticsV2',
        component: AdminAnalyticsView,
        meta: { module: 'analytics' }
      },
      {
        path: 'reports',
        name: 'AdminReportsV2',
        component: AdminReportsView,
        meta: { module: 'analytics' }
      },
      {
        path: 'ux-analytics',
        name: 'AdminUXAnalyticsV2',
        component: AdminUXAnalyticsView,
        meta: { module: 'analytics' }
      },
      {
        path: 'customer-ux-analytics',
        name: 'AdminCustomerUXAnalyticsV2',
        component: CustomerUXAnalyticsView,
        meta: { module: 'analytics' }
      },
      {
        path: 'reorder-analytics',
        name: 'AdminReorderAnalyticsV2',
        component: ReorderAnalyticsView,
        meta: { module: 'analytics' }
      },
      {
        path: 'push-analytics',
        name: 'AdminPushAnalyticsV2',
        component: PushAnalyticsView,
        meta: { module: 'analytics' }
      },
      {
        path: 'cron-jobs',
        name: 'AdminCronJobsV2',
        component: CronJobMonitoringView,
        meta: { module: 'analytics' }
      },
      {
        path: 'provider-heatmap',
        name: 'AdminProviderHeatmapV2',
        component: ProviderHeatmapView,
        meta: { module: 'analytics' }
      },
      
      // Settings - ศูนย์กลางการตั้งค่า
      {
        path: 'settings',
        name: 'AdminSettingsV2',
        component: () => import('./views/AdminSettingsView.vue'), // Settings Hub (ใหม่)
        meta: { module: 'settings' }
      },
      {
        path: 'settings/system',
        name: 'AdminSystemSettingsV2',
        component: () => import('./views/SystemSettingsView.vue'), // System Settings (ใหม่)
        meta: { module: 'settings' }
      },
      {
        path: 'settings/financial',
        name: 'AdminFinancialSettingsV2',
        component: AdminFinancialSettingsView,
        meta: { module: 'settings' }
      },
      {
        path: 'settings/theme',
        name: 'AdminThemeSettingsV2',
        component: () => import('./views/ThemeSettingsView.vue'),
        meta: { module: 'settings' }
      },
      {
        path: 'settings/notifications',
        name: 'AdminNotificationSettingsV2',
        component: AdminNotificationsView,
        meta: { module: 'settings' }
      },
      {
        path: 'settings/service-areas',
        name: 'AdminServiceAreasSettingsV2',
        component: AdminServiceAreasView,
        meta: { module: 'settings' }
      },
      {
        path: 'settings/service-zones',
        name: 'AdminServiceZonesSettingsV2',
        component: AdminServiceZonesView,
        meta: { module: 'settings' }
      },
      {
        path: 'settings/security',
        name: 'AdminSecuritySettingsV2',
        component: AdminSecurityView,
        meta: { module: 'settings' }
      },
      {
        path: 'system-logs',
        name: 'AdminSystemLogsV2',
        component: SystemLogsView,
        meta: { module: 'settings' }
      },
      {
        path: 'audit-log',
        name: 'AdminAuditLogV2',
        component: AdminAuditLogView,
        meta: { module: 'settings' }
      }
    ]
  }
]

export default adminRoutes
