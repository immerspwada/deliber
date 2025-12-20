<script setup lang="ts">
/**
 * Feature: F151 - Admin Components View
 * Admin view to browse all UI components
 * 
 * Memory Optimization: Task 36
 * - Cleans up search and filter state on unmount
 */
import { ref } from 'vue'
import { useAdminCleanup } from '../composables/useAdminCleanup'

const { addCleanup } = useAdminCleanup()

const searchQuery = ref('')
const selectedCategory = ref('all')

// Cleanup on unmount
addCleanup(() => {
  searchQuery.value = ''
  selectedCategory.value = 'all'
  console.log('[AdminComponentsView] Cleanup complete')
})

const categories = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'form', label: 'Form' },
  { key: 'display', label: 'Display' },
  { key: 'feedback', label: 'Feedback' },
  { key: 'navigation', label: 'Navigation' },
  { key: 'layout', label: 'Layout' },
  { key: 'ride', label: 'Ride' },
  { key: 'payment', label: 'Payment' },
  { key: 'user', label: 'User' },
  { key: 'provider', label: 'Provider' },
  { key: 'delivery', label: 'Delivery' }
]

const components = [
  // Form Components
  { name: 'InputField', code: 'F78', category: 'form', desc: 'Text input field' },
  { name: 'SelectField', code: 'F79', category: 'form', desc: 'Dropdown select' },
  { name: 'SwitchToggle', code: 'F80', category: 'form', desc: 'Toggle switch' },
  { name: 'Checkbox', code: 'F81', category: 'form', desc: 'Checkbox input' },
  { name: 'RadioGroup', code: 'F82', category: 'form', desc: 'Radio button group' },
  { name: 'TextArea', code: 'F102', category: 'form', desc: 'Multi-line text input' },
  { name: 'DatePicker', code: 'F96', category: 'form', desc: 'Date selection' },
  { name: 'TimePicker', code: 'F97', category: 'form', desc: 'Time selection' },
  { name: 'PhoneInput', code: 'F115', category: 'form', desc: 'Phone number input' },
  { name: 'OTPInput', code: 'F116', category: 'form', desc: 'OTP verification input' },
  { name: 'CurrencyInput', code: 'F117', category: 'form', desc: 'Currency amount input' },
  { name: 'SearchBar', code: 'F95', category: 'form', desc: 'Search input' },
  { name: 'AddressInput', code: 'F131', category: 'form', desc: 'Location search input' },
  { name: 'RatingInput', code: 'F133', category: 'form', desc: 'Star rating input' },
  { name: 'Slider', code: 'F118', category: 'form', desc: 'Range slider' },
  { name: 'CounterInput', code: 'F99', category: 'form', desc: 'Number counter' },
  { name: 'FileUpload', code: 'F101', category: 'form', desc: 'File upload' },
  
  // Display Components
  { name: 'Badge', code: 'F73', category: 'display', desc: 'Status badge' },
  { name: 'Avatar', code: 'F74', category: 'display', desc: 'User avatar' },
  { name: 'Chip', code: 'F94', category: 'display', desc: 'Tag/chip' },
  { name: 'PriceDisplay', code: 'F72', category: 'display', desc: 'Price formatting' },
  { name: 'RatingStars', code: 'F71', category: 'display', desc: 'Star rating display' },
  { name: 'ProgressBar', code: 'F83', category: 'display', desc: 'Progress indicator' },
  { name: 'StatusIndicator', code: 'F114', category: 'display', desc: 'Status dot' },
  { name: 'Timeline', code: 'F107', category: 'display', desc: 'Timeline display' },
  { name: 'StatCard', code: 'F106', category: 'display', desc: 'Statistics card' },
  { name: 'ImageGallery', code: 'F100', category: 'display', desc: 'Image gallery' },
  { name: 'SkeletonLoader', code: 'F76', category: 'display', desc: 'Loading skeleton' },
  { name: 'NotificationBadge', code: 'F93', category: 'display', desc: 'Notification count' },
  
  // Feedback Components
  { name: 'Alert', code: 'F105', category: 'feedback', desc: 'Alert message' },
  { name: 'ToastContainer', code: 'F67', category: 'feedback', desc: 'Toast notifications' },
  { name: 'ConfirmDialog', code: 'F68', category: 'feedback', desc: 'Confirmation dialog' },
  { name: 'Modal', code: 'F92', category: 'feedback', desc: 'Modal dialog' },
  { name: 'BottomSheet', code: 'F69', category: 'feedback', desc: 'Bottom sheet' },
  { name: 'ActionSheet', code: 'F70', category: 'feedback', desc: 'Action sheet' },
  { name: 'Tooltip', code: 'F86', category: 'feedback', desc: 'Tooltip' },
  { name: 'Popover', code: 'F87', category: 'feedback', desc: 'Popover' },
  { name: 'EmptyState', code: 'F66', category: 'feedback', desc: 'Empty state' },
  { name: 'LoadingStates', code: 'F65', category: 'feedback', desc: 'Loading states' },
  
  // Navigation Components
  { name: 'TabsComponent', code: 'F84', category: 'navigation', desc: 'Tab navigation' },
  { name: 'Breadcrumb', code: 'F108', category: 'navigation', desc: 'Breadcrumb' },
  { name: 'Pagination', code: 'F103', category: 'navigation', desc: 'Pagination' },
  { name: 'Stepper', code: 'F98', category: 'navigation', desc: 'Step indicator' },
  { name: 'DropdownMenu', code: 'F109', category: 'navigation', desc: 'Dropdown menu' },
  { name: 'MenuList', code: 'F149', category: 'navigation', desc: 'Menu list' },
  
  // Layout Components
  { name: 'Card', code: 'F88', category: 'layout', desc: 'Card container' },
  { name: 'ListItem', code: 'F89', category: 'layout', desc: 'List item' },
  { name: 'Divider', code: 'F77', category: 'layout', desc: 'Divider line' },
  { name: 'Accordion', code: 'F85', category: 'layout', desc: 'Accordion' },
  { name: 'CollapsibleSection', code: 'F111', category: 'layout', desc: 'Collapsible section' },
  { name: 'InfoRow', code: 'F112', category: 'layout', desc: 'Info row' },
  { name: 'SectionHeader', code: 'F113', category: 'layout', desc: 'Section header' },
  { name: 'DataTable', code: 'F104', category: 'layout', desc: 'Data table' },
  
  // Ride Components
  { name: 'VehicleTypeSelector', code: 'F123', category: 'ride', desc: 'Vehicle selection' },
  { name: 'RouteLine', code: 'F124', category: 'ride', desc: 'Route display' },
  { name: 'RideHistoryItem', code: 'F132', category: 'ride', desc: 'Ride history item' },
  { name: 'DriverCard', code: 'F127', category: 'ride', desc: 'Driver info card' },
  { name: 'FareEstimateCard', code: 'F48', category: 'ride', desc: 'Fare estimate' },
  { name: 'RideStatusTracker', code: 'F58', category: 'ride', desc: 'Ride status' },
  { name: 'ScheduleRideCard', code: 'F137', category: 'ride', desc: 'Scheduled ride' },
  { name: 'FareSplitCard', code: 'F138', category: 'ride', desc: 'Fare splitting' },
  { name: 'InsuranceCard', code: 'F140', category: 'ride', desc: 'Ride insurance' },
  { name: 'SafetyButton', code: 'F134', category: 'ride', desc: 'SOS button' },
  { name: 'ShareTripCard', code: 'F135', category: 'ride', desc: 'Share trip' },
  { name: 'MapMarker', code: 'F119', category: 'ride', desc: 'Map marker' },
  { name: 'LocationCard', code: 'F120', category: 'ride', desc: 'Location card' },
  
  // Payment Components
  { name: 'PaymentMethodCard', code: 'F125', category: 'payment', desc: 'Payment method' },
  { name: 'WalletCard', code: 'F129', category: 'payment', desc: 'Wallet balance' },
  { name: 'TransactionItem', code: 'F130', category: 'payment', desc: 'Transaction item' },
  { name: 'PromoCard', code: 'F128', category: 'payment', desc: 'Promo code card' },
  { name: 'SubscriptionCard', code: 'F139', category: 'payment', desc: 'Subscription plan' },
  { name: 'TipModal', code: 'F57', category: 'payment', desc: 'Tip modal' },
  { name: 'ReceiptCard', code: 'F52', category: 'payment', desc: 'Receipt card' },
  
  // User Components
  { name: 'ProfileHeader', code: 'F148', category: 'user', desc: 'Profile header' },
  { name: 'NotificationItem', code: 'F121', category: 'user', desc: 'Notification item' },
  { name: 'ChatBubble', code: 'F122', category: 'user', desc: 'Chat message' },
  { name: 'EmergencyContactCard', code: 'F136', category: 'user', desc: 'Emergency contact' },
  { name: 'ReferralCard', code: 'F144', category: 'user', desc: 'Referral card' },
  { name: 'CorporateAccountCard', code: 'F141', category: 'user', desc: 'Corporate account' },
  { name: 'SupportTicketCard', code: 'F143', category: 'user', desc: 'Support ticket' },
  { name: 'VoiceCallCard', code: 'F142', category: 'user', desc: 'Voice call UI' },
  { name: 'LanguageSelector', code: 'F145', category: 'user', desc: 'Language selection' },
  { name: 'NotificationSettings', code: 'F146', category: 'user', desc: 'Notification prefs' },
  { name: 'PrivacySettings', code: 'F147', category: 'user', desc: 'Privacy settings' },
  { name: 'AppVersion', code: 'F150', category: 'user', desc: 'App version info' },
  
  // Provider Components
  { name: 'EarningsCard', code: 'F152', category: 'provider', desc: 'Provider earnings' },
  { name: 'OnlineToggle', code: 'F153', category: 'provider', desc: 'Online status toggle' },
  { name: 'RideRequestCard', code: 'F154', category: 'provider', desc: 'Ride request card' },
  { name: 'TripProgressCard', code: 'F155', category: 'provider', desc: 'Trip progress' },
  { name: 'ProviderStatsCard', code: 'F163', category: 'provider', desc: 'Provider statistics' },
  
  // Delivery/Shopping Components
  { name: 'DeliveryItemCard', code: 'F156', category: 'delivery', desc: 'Delivery item' },
  { name: 'ShoppingItemCard', code: 'F157', category: 'delivery', desc: 'Shopping item' },
  { name: 'OrderSummaryCard', code: 'F158', category: 'delivery', desc: 'Order summary' },
  { name: 'DeliveryStatusCard', code: 'F159', category: 'delivery', desc: 'Delivery status' },
  { name: 'ShoppingCartSummary', code: 'F160', category: 'delivery', desc: 'Shopping cart' },
  { name: 'ShoppingStatusCard', code: 'F161', category: 'delivery', desc: 'Shopping status' },
  
  // Booking Components
  { name: 'RideConfirmCard', code: 'F162', category: 'ride', desc: 'Ride confirmation' },
  { name: 'QuickActionGrid', code: 'F164', category: 'navigation', desc: 'Quick actions' },
  { name: 'ServiceTypeCard', code: 'F165', category: 'ride', desc: 'Service type selection' },
  { name: 'RideOptionCard', code: 'F172', category: 'ride', desc: 'Ride option' },
  { name: 'DestinationSearch', code: 'F170', category: 'ride', desc: 'Destination search' },
  { name: 'PlaceSuggestionList', code: 'F171', category: 'ride', desc: 'Place suggestions' },
  { name: 'LiveTrackingCard', code: 'F169', category: 'ride', desc: 'Live tracking' },
  
  // User/Notification Components
  { name: 'NotificationCenter', code: 'F166', category: 'user', desc: 'Notification center' },
  { name: 'UserProfileCard', code: 'F167', category: 'user', desc: 'User profile card' },
  { name: 'PaymentSummary', code: 'F168', category: 'payment', desc: 'Payment summary' },
  { name: 'PromoBanner', code: 'F173', category: 'payment', desc: 'Promo banner' },
  { name: 'WelcomeHeader', code: 'F174', category: 'layout', desc: 'Welcome header' },
  { name: 'HomeServiceGrid', code: 'F175', category: 'navigation', desc: 'Home services' },
  { name: 'RecentRideCard', code: 'F176', category: 'ride', desc: 'Recent ride rebooking' },
  { name: 'DriverArrivalCard', code: 'F177', category: 'ride', desc: 'Driver arrival notification' },
  { name: 'RideCompletedCard', code: 'F178', category: 'ride', desc: 'Ride completion summary' },
  { name: 'SearchingDriverCard', code: 'F179', category: 'ride', desc: 'Searching driver animation' },
  { name: 'BottomNavigation', code: 'F180', category: 'navigation', desc: 'Bottom nav bar' },
  { name: 'TopUpCard', code: 'F181', category: 'payment', desc: 'Wallet top up' },
  { name: 'WithdrawCard', code: 'F182', category: 'payment', desc: 'Provider withdrawal' },
  { name: 'EarningsChart', code: 'F183', category: 'provider', desc: 'Earnings chart' },
  { name: 'OnlineHoursCard', code: 'F184', category: 'provider', desc: 'Online hours' },
  { name: 'TripHistoryCard', code: 'F185', category: 'provider', desc: 'Trip history item' },
  { name: 'HeatmapLegend', code: 'F186', category: 'display', desc: 'Heatmap legend' },
  { name: 'MapControls', code: 'F187', category: 'navigation', desc: 'Map controls' },
  { name: 'FilterChips', code: 'F188', category: 'form', desc: 'Filter chips' },
  { name: 'SortDropdown', code: 'F189', category: 'form', desc: 'Sort dropdown' },
  { name: 'DateRangePicker', code: 'F190', category: 'form', desc: 'Date range picker' },
  { name: 'ExportButton', code: 'F191', category: 'form', desc: 'Export data button' },
  { name: 'RefreshButton', code: 'F192', category: 'form', desc: 'Refresh button' },
  { name: 'StatusFilter', code: 'F193', category: 'form', desc: 'Status filter' },
  { name: 'QuickStats', code: 'F194', category: 'display', desc: 'Quick statistics' },
  { name: 'AdminHeader', code: 'F195', category: 'layout', desc: 'Admin page header' },
  { name: 'UserCard', code: 'F196', category: 'user', desc: 'User info card' },
  { name: 'ProviderCard', code: 'F197', category: 'provider', desc: 'Provider info card' },
  { name: 'OrderCard', code: 'F198', category: 'delivery', desc: 'Order info card' },
  { name: 'ActivityLog', code: 'F199', category: 'display', desc: 'Activity log list' },
  { name: 'SystemStatus', code: 'F200', category: 'display', desc: 'System health status' },
  
  // Admin Form Components (F201-F205)
  { name: 'PromoForm', code: 'F201', category: 'form', desc: 'Promo creation form' },
  { name: 'SettingsForm', code: 'F202', category: 'form', desc: 'Settings management form' },
  { name: 'NotificationComposer', code: 'F203', category: 'form', desc: 'Notification composer' },
  { name: 'ReportChart', code: 'F204', category: 'display', desc: 'Report chart component' },
  { name: 'MapOverlay', code: 'F205', category: 'navigation', desc: 'Map overlay controls' },
  
  // Provider Profile Components (F206-F210)
  { name: 'VehicleCard', code: 'F206', category: 'provider', desc: 'Vehicle info card' },
  { name: 'DocumentCard', code: 'F207', category: 'provider', desc: 'Document status card' },
  { name: 'BankAccountCard', code: 'F208', category: 'provider', desc: 'Bank account card' },
  { name: 'IncomeBreakdown', code: 'F209', category: 'provider', desc: 'Income breakdown' },
  { name: 'PerformanceMetric', code: 'F210', category: 'provider', desc: 'Performance metric' },
  
  // Provider Trip Components (F211-F216)
  { name: 'RideRequestList', code: 'F211', category: 'provider', desc: 'Ride request list' },
  { name: 'NavigationCard', code: 'F212', category: 'provider', desc: 'Navigation info card' },
  { name: 'CustomerCard', code: 'F213', category: 'provider', desc: 'Customer info card' },
  { name: 'TripActionButtons', code: 'F214', category: 'provider', desc: 'Trip action buttons' },
  { name: 'DailyGoalCard', code: 'F215', category: 'provider', desc: 'Daily goal progress' },
  { name: 'HotspotCard', code: 'F216', category: 'provider', desc: 'Demand hotspot card' },
  
  // Communication Components (F217-F221)
  { name: 'AnnouncementBanner', code: 'F217', category: 'feedback', desc: 'Announcement banner' },
  { name: 'QuickReplyButtons', code: 'F218', category: 'form', desc: 'Quick reply buttons' },
  { name: 'ChatInput', code: 'F219', category: 'form', desc: 'Chat message input' },
  { name: 'RatingBreakdown', code: 'F220', category: 'display', desc: 'Rating breakdown' },
  { name: 'ReviewCard', code: 'F221', category: 'display', desc: 'Review/rating card' },
  
  // Support Components (F222-F225)
  { name: 'SupportChatHeader', code: 'F222', category: 'layout', desc: 'Support chat header' },
  { name: 'FAQItem', code: 'F223', category: 'display', desc: 'FAQ expandable item' },
  { name: 'HelpCategoryCard', code: 'F224', category: 'navigation', desc: 'Help category card' },
  { name: 'ContactOptionCard', code: 'F225', category: 'navigation', desc: 'Contact option card' },
  
  // Utility Components (F226-F235)
  { name: 'VerificationBadge', code: 'F226', category: 'display', desc: 'Verification status badge' },
  { name: 'OnlineStatusDot', code: 'F227', category: 'display', desc: 'Online status indicator' },
  { name: 'CountdownTimer', code: 'F228', category: 'display', desc: 'Countdown timer' },
  { name: 'PulseLoader', code: 'F229', category: 'feedback', desc: 'Pulse loading animation' },
  { name: 'DistanceDisplay', code: 'F230', category: 'display', desc: 'Distance formatter' },
  { name: 'DurationDisplay', code: 'F231', category: 'display', desc: 'Duration formatter' },
  { name: 'CopyButton', code: 'F232', category: 'form', desc: 'Copy to clipboard button' },
  { name: 'ShareButton', code: 'F233', category: 'form', desc: 'Share content button' },
  { name: 'RefundStatusCard', code: 'F234', category: 'payment', desc: 'Refund status card' },
  { name: 'ComplaintCard', code: 'F235', category: 'user', desc: 'Complaint/report card' },
  { name: 'TripRouteCard', code: 'F236', category: 'ride', desc: 'Trip route display' },
  { name: 'PaymentStatusBadge', code: 'F237', category: 'payment', desc: 'Payment status badge' },
  { name: 'ServiceTypeBadge', code: 'F238', category: 'display', desc: 'Service type badge' },
  { name: 'RatingDisplay', code: 'F239', category: 'display', desc: 'Compact rating display' },
  { name: 'PriceBreakdown', code: 'F240', category: 'payment', desc: 'Price breakdown list' },
  { name: 'TripTypeIcon', code: 'F241', category: 'ride', desc: 'Trip type icon' },
  { name: 'PromotionBadge', code: 'F242', category: 'payment', desc: 'Promotion badge' },
  { name: 'PointsDisplay', code: 'F243', category: 'display', desc: 'Loyalty points display' },
  { name: 'TierBadge', code: 'F244', category: 'display', desc: 'Membership tier badge' },
  { name: 'NotificationDot', code: 'F245', category: 'display', desc: 'Notification indicator' },
  { name: 'ScheduleDisplay', code: 'F246', category: 'display', desc: 'Schedule date/time' },
  { name: 'VehicleInfo', code: 'F247', category: 'ride', desc: 'Vehicle info display' },
  { name: 'ContactInfo', code: 'F248', category: 'user', desc: 'Contact information' },
  { name: 'AddressDisplay', code: 'F249', category: 'ride', desc: 'Address display' },
  { name: 'DateDisplay', code: 'F250', category: 'display', desc: 'Date formatter' },
  
  // State & Feedback Components (F251-F260)
  { name: 'TimeAgo', code: 'F251', category: 'display', desc: 'Relative time display' },
  { name: 'EmptyList', code: 'F252', category: 'feedback', desc: 'Empty list state' },
  { name: 'ErrorMessage', code: 'F253', category: 'feedback', desc: 'Error message display' },
  { name: 'SuccessMessage', code: 'F254', category: 'feedback', desc: 'Success message display' },
  { name: 'LoadingOverlay', code: 'F255', category: 'feedback', desc: 'Full screen loading' },
  { name: 'ConfirmButton', code: 'F256', category: 'form', desc: 'Button with confirmation' },
  { name: 'ExpandableText', code: 'F257', category: 'display', desc: 'Show more/less text' },
  { name: 'PasswordInput', code: 'F258', category: 'form', desc: 'Password input field' },
  { name: 'NumberInput', code: 'F259', category: 'form', desc: 'Number input with controls' },
  { name: 'TagInput', code: 'F260', category: 'form', desc: 'Tag/chip input' },
  
  // Advanced Input Components (F261-F265)
  { name: 'ImagePreview', code: 'F261', category: 'display', desc: 'Image preview with zoom' },
  { name: 'StarRating', code: 'F262', category: 'form', desc: 'Interactive star rating' },
  { name: 'ToggleGroup', code: 'F263', category: 'form', desc: 'Toggle button group' },
  { name: 'ColorPicker', code: 'F264', category: 'form', desc: 'Color selection picker' },
  { name: 'RangeSlider', code: 'F265', category: 'form', desc: 'Range slider input' },
  
  // Auth & Verification Components (F266-F273)
  { name: 'AutocompleteInput', code: 'F266', category: 'form', desc: 'Autocomplete suggestions' },
  { name: 'PhoneVerification', code: 'F267', category: 'form', desc: 'Phone OTP verification' },
  { name: 'LocationPicker', code: 'F268', category: 'form', desc: 'Map location picker' },
  { name: 'SignaturePad', code: 'F269', category: 'form', desc: 'Signature capture' },
  { name: 'QRCodeDisplay', code: 'F270', category: 'display', desc: 'QR code display' },
  { name: 'QRScanner', code: 'F271', category: 'form', desc: 'QR code scanner' },
  { name: 'BiometricAuth', code: 'F272', category: 'form', desc: 'Biometric authentication' },
  { name: 'PinInput', code: 'F273', category: 'form', desc: 'PIN code input' },
  
  // App Flow Components (F274-F277)
  { name: 'SplashScreen', code: 'F274', category: 'layout', desc: 'App splash screen' },
  { name: 'OnboardingSlide', code: 'F275', category: 'layout', desc: 'Onboarding slide' },
  { name: 'OnboardingCarousel', code: 'F276', category: 'layout', desc: 'Onboarding carousel' },
  { name: 'PermissionRequest', code: 'F277', category: 'feedback', desc: 'Permission request UI' },
  
  // Device Status Components (F278-F280)
  { name: 'NetworkStatus', code: 'F278', category: 'feedback', desc: 'Network connectivity' },
  { name: 'BatteryStatus', code: 'F279', category: 'display', desc: 'Battery level indicator' },
  { name: 'GPSAccuracy', code: 'F280', category: 'display', desc: 'GPS signal accuracy' },
  
  // Navigation Components (F281-F285)
  { name: 'SpeedDisplay', code: 'F281', category: 'display', desc: 'Speed display' },
  { name: 'CompassHeading', code: 'F282', category: 'display', desc: 'Compass direction' },
  { name: 'TurnByTurn', code: 'F283', category: 'navigation', desc: 'Turn-by-turn navigation' },
  { name: 'LaneGuidance', code: 'F284', category: 'navigation', desc: 'Lane guidance display' },
  { name: 'TrafficIndicator', code: 'F285', category: 'display', desc: 'Traffic congestion' },
  
  // Ride Booking Components (F286-F300)
  { name: 'ArrivalTime', code: 'F286', category: 'ride', desc: 'ETA display' },
  { name: 'RouteOverview', code: 'F287', category: 'ride', desc: 'Route summary' },
  { name: 'FareBreakdownModal', code: 'F288', category: 'payment', desc: 'Fare breakdown' },
  { name: 'PaymentMethodSelector', code: 'F289', category: 'payment', desc: 'Payment selection' },
  { name: 'PromoCodeInput', code: 'F290', category: 'form', desc: 'Promo code input' },
  { name: 'RideReceipt', code: 'F291', category: 'ride', desc: 'Ride receipt' },
  { name: 'DriverRating', code: 'F292', category: 'ride', desc: 'Driver rating form' },
  { name: 'VehicleAnimation', code: 'F293', category: 'display', desc: 'Vehicle animation' },
  { name: 'RideTypeCard', code: 'F294', category: 'ride', desc: 'Ride type selection' },
  { name: 'PickupNote', code: 'F295', category: 'form', desc: 'Pickup note input' },
  { name: 'DriverLocation', code: 'F296', category: 'ride', desc: 'Driver location card' },
  { name: 'CancelRideSheet', code: 'F297', category: 'ride', desc: 'Cancel ride sheet' },
  { name: 'SafetyToolkit', code: 'F298', category: 'ride', desc: 'Safety features panel' },
  { name: 'TripProgress', code: 'F299', category: 'ride', desc: 'Trip progress timeline' },
  { name: 'WaitingTimer', code: 'F300', category: 'ride', desc: 'Waiting time display' },
  
  // Booking Flow Components (F301-F310)
  { name: 'DestinationCard', code: 'F301', category: 'ride', desc: 'Destination selection card' },
  { name: 'RideHistoryFilter', code: 'F302', category: 'form', desc: 'History filter sheet' },
  { name: 'ServiceSelector', code: 'F303', category: 'navigation', desc: 'Service type selector' },
  { name: 'SchedulePicker', code: 'F304', category: 'form', desc: 'Schedule date/time picker' },
  { name: 'PassengerCount', code: 'F305', category: 'form', desc: 'Passenger count selector' },
  { name: 'LuggageSelector', code: 'F306', category: 'form', desc: 'Luggage size selector' },
  { name: 'StopsList', code: 'F307', category: 'ride', desc: 'Multi-stop list' },
  { name: 'RidePreferences', code: 'F308', category: 'form', desc: 'Ride preferences sheet' },
  { name: 'DriverMessage', code: 'F309', category: 'ride', desc: 'Message to driver' },
  { name: 'RideConfirmSheet', code: 'F310', category: 'ride', desc: 'Ride confirmation sheet' },
  
  // Delivery Components (F311-F315)
  { name: 'DeliveryTracking', code: 'F311', category: 'delivery', desc: 'Delivery tracking timeline' },
  { name: 'PackageDetails', code: 'F312', category: 'delivery', desc: 'Package info form' },
  { name: 'DeliveryInstructions', code: 'F313', category: 'delivery', desc: 'Delivery instructions input' },
  { name: 'RecipientInfo', code: 'F314', category: 'delivery', desc: 'Recipient information form' },
  { name: 'ShoppingList', code: 'F315', category: 'delivery', desc: 'Shopping items list' },
  
  // Delivery/Shopping Flow (F316-F330)
  { name: 'DeliveryConfirmSheet', code: 'F316', category: 'delivery', desc: 'Delivery confirmation sheet' },
  { name: 'ShoppingConfirmSheet', code: 'F317', category: 'delivery', desc: 'Shopping confirmation sheet' },
  { name: 'ItemAddModal', code: 'F318', category: 'delivery', desc: 'Add item modal' },
  { name: 'StoreSelector', code: 'F319', category: 'delivery', desc: 'Store selection' },
  { name: 'DeliveryTimeSlot', code: 'F320', category: 'delivery', desc: 'Time slot picker' },
  { name: 'CourierTypeSelector', code: 'F321', category: 'delivery', desc: 'Courier type selection' },
  { name: 'PackageSizeSelector', code: 'F322', category: 'delivery', desc: 'Package size selection' },
  { name: 'DeliveryProofUpload', code: 'F323', category: 'delivery', desc: 'Proof photo upload' },
  { name: 'DeliveryNotes', code: 'F324', category: 'delivery', desc: 'Delivery notes input' },
  { name: 'DeliveryFeeBreakdown', code: 'F325', category: 'delivery', desc: 'Fee breakdown display' },
  { name: 'ShoppingItemInput', code: 'F326', category: 'delivery', desc: 'Shopping item input' },
  { name: 'ShoppingItemRow', code: 'F327', category: 'delivery', desc: 'Shopping item row' },
  { name: 'ShoppingProgress', code: 'F328', category: 'delivery', desc: 'Shopping progress tracker' },
  { name: 'ShopperCard', code: 'F329', category: 'delivery', desc: 'Shopper info card' },
  { name: 'SubstituteModal', code: 'F330', category: 'delivery', desc: 'Item substitute approval' },
  
  // Order Management (F331-F340)
  { name: 'OrderTrackingMap', code: 'F331', category: 'delivery', desc: 'Order tracking map' },
  { name: 'OrderStatusTimeline', code: 'F332', category: 'delivery', desc: 'Order status timeline' },
  { name: 'OrderContactCard', code: 'F333', category: 'delivery', desc: 'Order contact card' },
  { name: 'OrderActionButtons', code: 'F334', category: 'delivery', desc: 'Order action buttons' },
  { name: 'OrderReceiptCard', code: 'F335', category: 'delivery', desc: 'Order receipt card' },
  { name: 'OrderRatingForm', code: 'F336', category: 'delivery', desc: 'Order rating form' },
  { name: 'OrderHistoryCard', code: 'F337', category: 'delivery', desc: 'Order history card' },
  { name: 'OrderFilterSheet', code: 'F338', category: 'delivery', desc: 'Order filter sheet' },
  { name: 'OrderEmptyState', code: 'F339', category: 'delivery', desc: 'Order empty state' },
  { name: 'OrderSummarySheet', code: 'F340', category: 'delivery', desc: 'Order summary sheet' },
  
  // Provider Components (F341-F346)
  { name: 'ProviderOrderCard', code: 'F341', category: 'provider', desc: 'Provider order card' },
  { name: 'ProviderDeliveryProgress', code: 'F342', category: 'provider', desc: 'Provider delivery progress' },
  { name: 'ProviderShoppingList', code: 'F343', category: 'provider', desc: 'Provider shopping list' },
  { name: 'ProviderEarningsSummary', code: 'F344', category: 'provider', desc: 'Provider earnings summary' },
  { name: 'ProviderNavigationBar', code: 'F345', category: 'provider', desc: 'Provider navigation bar' },
  { name: 'ProviderStatusToggle', code: 'F346', category: 'provider', desc: 'Provider status toggle' },
  
  // Provider Extended (F347-F357)
  { name: 'ProviderOrderHistory', code: 'F347', category: 'provider', desc: 'Provider order history' },
  { name: 'ProviderNotificationList', code: 'F348', category: 'provider', desc: 'Provider notifications' },
  { name: 'ProviderSettingsForm', code: 'F349', category: 'provider', desc: 'Provider settings form' },
  { name: 'ProviderDocumentUpload', code: 'F350', category: 'provider', desc: 'Document upload' },
  { name: 'ProviderVehicleForm', code: 'F351', category: 'provider', desc: 'Vehicle info form' },
  { name: 'ProviderBankForm', code: 'F352', category: 'provider', desc: 'Bank account form' },
  { name: 'ProviderWithdrawSheet', code: 'F353', category: 'provider', desc: 'Withdrawal sheet' },
  { name: 'ProviderScheduleCard', code: 'F354', category: 'provider', desc: 'Work schedule card' },
  { name: 'ProviderReviewCard', code: 'F355', category: 'provider', desc: 'Customer review card' },
  { name: 'ProviderSupportCard', code: 'F356', category: 'provider', desc: 'Support options card' },
  { name: 'ProviderAchievementCard', code: 'F357', category: 'provider', desc: 'Achievement badge card' },
  
  // Utility Components (F358-F360)
  { name: 'PullToRefresh', code: 'F358', category: 'feedback', desc: 'Pull to refresh' },
  { name: 'SwipeableCard', code: 'F359', category: 'layout', desc: 'Swipeable card' },
  { name: 'InfiniteScroll', code: 'F360', category: 'layout', desc: 'Infinite scroll loader' },
  
  // Animation Components (F361-F368)
  { name: 'AnimatedCounter', code: 'F361', category: 'display', desc: 'Animated number counter' },
  { name: 'Confetti', code: 'F362', category: 'feedback', desc: 'Celebration confetti' },
  { name: 'Shimmer', code: 'F363', category: 'feedback', desc: 'Shimmer loading effect' },
  { name: 'Ripple', code: 'F364', category: 'feedback', desc: 'Material ripple effect' },
  { name: 'Typewriter', code: 'F365', category: 'display', desc: 'Typewriter text animation' },
  { name: 'Marquee', code: 'F366', category: 'display', desc: 'Scrolling marquee text' },
  { name: 'Skeleton', code: 'F367', category: 'feedback', desc: 'Skeleton loading placeholder' },
  { name: 'Spotlight', code: 'F368', category: 'feedback', desc: 'Spotlight onboarding overlay' },
  
  // Layout Components (F369-F377)
  { name: 'Carousel', code: 'F369', category: 'layout', desc: 'Image/content carousel' },
  { name: 'Masonry', code: 'F370', category: 'layout', desc: 'Masonry grid layout' },
  { name: 'VirtualList', code: 'F371', category: 'layout', desc: 'Virtualized list' },
  { name: 'Draggable', code: 'F372', category: 'layout', desc: 'Draggable wrapper' },
  { name: 'Resizable', code: 'F373', category: 'layout', desc: 'Resizable container' },
  { name: 'Sortable', code: 'F374', category: 'layout', desc: 'Sortable list' },
  { name: 'Collapsible', code: 'F375', category: 'layout', desc: 'Collapsible panel' },
  { name: 'Drawer', code: 'F376', category: 'layout', desc: 'Side drawer' },
  { name: 'Splitview', code: 'F377', category: 'layout', desc: 'Split view panel' },
  
  // Advanced Components (F378-F384)
  { name: 'Watermark', code: 'F378', category: 'display', desc: 'Watermark overlay' },
  { name: 'Affix', code: 'F379', category: 'layout', desc: 'Sticky/affix element' },
  { name: 'BackTop', code: 'F380', category: 'navigation', desc: 'Back to top button' },
  { name: 'Segmented', code: 'F381', category: 'form', desc: 'Segmented control' },
  { name: 'Rate', code: 'F382', category: 'form', desc: 'Star rating input' },
  { name: 'Transfer', code: 'F383', category: 'form', desc: 'Transfer list' },
  { name: 'TreeSelect', code: 'F384', category: 'form', desc: 'Tree selection dropdown' },
  
  // Form & Display Components (F385-F392)
  { name: 'Cascader', code: 'F385', category: 'form', desc: 'Cascading selection' },
  { name: 'Mentions', code: 'F386', category: 'form', desc: 'Mention input' },
  { name: 'ColorInput', code: 'F387', category: 'form', desc: 'Color input with presets' },
  { name: 'InputNumber', code: 'F388', category: 'form', desc: 'Number input with controls' },
  { name: 'Descriptions', code: 'F389', category: 'display', desc: 'Description list' },
  { name: 'Result', code: 'F390', category: 'feedback', desc: 'Result/status page' },
  { name: 'Steps', code: 'F391', category: 'navigation', desc: 'Step indicator' },
  { name: 'Empty', code: 'F392', category: 'feedback', desc: 'Empty state' },
  
  // Data Display Components (F393-F400)
  { name: 'Comment', code: 'F393', category: 'display', desc: 'Comment/reply component' },
  { name: 'Statistic', code: 'F394', category: 'display', desc: 'Statistic display' },
  { name: 'Countdown', code: 'F395', category: 'display', desc: 'Countdown timer' },
  { name: 'QRCode', code: 'F396', category: 'display', desc: 'QR code generator' },
  { name: 'Calendar', code: 'F397', category: 'display', desc: 'Calendar component' },
  { name: 'Tag', code: 'F398', category: 'display', desc: 'Tag/label component' },
  { name: 'Space', code: 'F399', category: 'layout', desc: 'Spacing layout' },
  { name: 'Grid', code: 'F400', category: 'layout', desc: 'Grid layout' }
]

const filteredComponents = () => {
  return components.filter(c => {
    const matchCategory = selectedCategory.value === 'all' || c.category === selectedCategory.value
    const matchSearch = !searchQuery.value || 
      c.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      c.code.toLowerCase().includes(searchQuery.value.toLowerCase())
    return matchCategory && matchSearch
  })
}
</script>


<template>
  <div class="admin-components">
    <div class="page-header">
      <h1 class="page-title">Component Library</h1>
      <p class="page-desc">{{ components.length }} components พร้อมใช้งาน</p>
    </div>
    
    <div class="filters">
      <div class="search-box">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
        </svg>
        <input v-model="searchQuery" type="text" placeholder="ค้นหา component..." />
      </div>
      
      <div class="category-tabs">
        <button
          v-for="cat in categories"
          :key="cat.key"
          type="button"
          class="tab-btn"
          :class="{ active: selectedCategory === cat.key }"
          @click="selectedCategory = cat.key"
        >
          {{ cat.label }}
        </button>
      </div>
    </div>
    
    <div class="components-grid">
      <div v-for="comp in filteredComponents()" :key="comp.code" class="component-card">
        <div class="card-header">
          <span class="comp-code">{{ comp.code }}</span>
          <span class="comp-category">{{ comp.category }}</span>
        </div>
        <h3 class="comp-name">{{ comp.name }}</h3>
        <p class="comp-desc">{{ comp.desc }}</p>
      </div>
    </div>
    
    <div v-if="filteredComponents().length === 0" class="empty-state">
      <p>ไม่พบ component ที่ค้นหา</p>
    </div>
  </div>
</template>

<style scoped>
.admin-components {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 24px;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  color: #000;
  margin: 0 0 4px;
}

.page-desc {
  font-size: 14px;
  color: #6b6b6b;
  margin: 0;
}

.filters {
  margin-bottom: 24px;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #fff;
  border: 1px solid #e5e5e5;
  border-radius: 12px;
  margin-bottom: 16px;
}

.search-box svg {
  color: #6b6b6b;
}

.search-box input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 15px;
  outline: none;
}

.category-tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.tab-btn {
  padding: 8px 16px;
  background: #f6f6f6;
  border: none;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
  color: #6b6b6b;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-btn:hover {
  background: #e5e5e5;
}

.tab-btn.active {
  background: #000;
  color: #fff;
}

.components-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}

.component-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  border: 1px solid #e5e5e5;
  transition: all 0.2s;
}

.component-card:hover {
  border-color: #000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.card-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.comp-code {
  font-size: 11px;
  font-weight: 600;
  color: #fff;
  background: #000;
  padding: 2px 8px;
  border-radius: 4px;
}

.comp-category {
  font-size: 11px;
  color: #6b6b6b;
  text-transform: capitalize;
}

.comp-name {
  font-size: 16px;
  font-weight: 600;
  color: #000;
  margin: 0 0 4px;
}

.comp-desc {
  font-size: 13px;
  color: #6b6b6b;
  margin: 0;
}

.empty-state {
  text-align: center;
  padding: 48px;
  color: #6b6b6b;
}
</style>
