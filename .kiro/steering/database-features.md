# Database Features Mapping Rules

## กฎการจัดการฐานข้อมูลและฟีเจอร์

### หลักการสำคัญ
1. **ทุกฟีเจอร์ต้องมีรหัสกำกับ** - ใช้รูปแบบ `F##` (เช่น F01, F02)
2. **ทุกฟีเจอร์ต้องระบุตาราง DB ที่เกี่ยวข้อง**
3. **ทุกฟีเจอร์ต้องระบุ Composable ที่รับผิดชอบ**
4. **เมื่อเพิ่มฟีเจอร์ใหม่ต้องอัพเดทเอกสารนี้**

---

## 🆔 Member UID System (กฎสำคัญ)

### หลักการใช้ Member UID
**ระบบใช้ Member UID เป็นตัวระบุหลักสำหรับลูกค้าทุกคน แทนการใช้อีเมล**

### รูปแบบ Member UID
- **Format**: `TRD-XXXXXXXX` (TRD = ThaiRide, X = ตัวอักษร/ตัวเลขสุ่ม 8 ตัว)
- **ตัวอย่าง**: `TRD-A1B2C3D4`, `TRD-XYZ12345`
- **Column**: `users.member_uid`
- **Migration**: 027_user_member_uid.sql

### กฎการใช้งาน Member UID

#### 1. การสมัครสมาชิก
- ✅ **อีเมลไม่บังคับ** - ลูกค้าสามารถสมัครโดยไม่ต้องมีอีเมล
- ✅ **UID สร้างอัตโนมัติ** - ทุกคนได้รับ Member UID ทันทีหลังสมัคร
- ✅ **UID ไม่ซ้ำกัน** - ระบบรับประกันความไม่ซ้ำกัน

#### 2. การติดตามข้อมูลลูกค้า
ใช้ Member UID ในการติดตามทุกอย่าง:
- 📦 ประวัติการสั่งอาหาร/เรียกรถ/ส่งของ
- 💰 ประวัติการเติมเงิน/ใช้จ่าย Wallet
- 🎁 แต้มสะสม Loyalty Points
- 🎫 การใช้โปรโมชั่น
- 📞 Support Tickets
- ⭐ การให้คะแนน/รีวิว

#### 3. Admin Dashboard
- ✅ ค้นหาลูกค้าด้วย Member UID
- ✅ แสดง Member UID ในรายการผู้ใช้
- ✅ ใช้ UID อ้างอิงในทุก transaction

#### 4. การแสดงผล
- แสดง Member UID ในหน้า Profile
- ใช้ monospace font สำหรับ UID
- มีปุ่ม Copy สำหรับคัดลอก UID

### Functions ที่เกี่ยวข้อง
| Function | รายละเอียด |
|----------|------------|
| `generate_member_uid()` | สร้าง UID ใหม่ (Database trigger) |
| `get_user_by_member_uid()` | ค้นหาผู้ใช้จาก UID |
| `generateMemberUid()` | สร้าง UID (Frontend - validation.ts) |
| `validateMemberUid()` | ตรวจสอบรูปแบบ UID |
| `formatMemberUid()` | จัดรูปแบบ UID |

### ⚠️ ข้อห้าม
- ❌ **ห้ามใช้อีเมลเป็นตัวระบุหลัก** - ใช้ Member UID แทน
- ❌ **ห้ามบังคับอีเมลในการสมัคร** - อีเมลเป็น optional
- ❌ **ห้ามแก้ไข Member UID** - เมื่อสร้างแล้วห้ามเปลี่ยน

---

## 📋 Feature Registry

### Core Features (F01-F10)

| รหัส | ฟีเจอร์ | Composable | ตาราง DB | Migration |
|------|---------|------------|----------|-----------|
| **F01** | User Authentication & Registration | `stores/auth.ts`, `useAdmin.ts` | `users` (first_name, last_name, national_id, phone_number, verification_status, verified_at, member_uid) | 001, 026, 027 |
| **F02** | Ride Booking | `useServices.ts`, `stores/ride.ts` | `ride_requests`, `service_providers` | 001, 006 |
| **F03** | Delivery Service | `useDelivery.ts` | `delivery_requests` | 001, 007 |
| **F04** | Shopping Service | `useShopping.ts` | `shopping_requests` | 001, 007 |
| **F05** | Wallet/Balance | `useWallet.ts` | `user_wallets`, `wallet_transactions` | 007 |
| **F06** | Referral System | `useReferral.ts` | `referral_codes`, `referrals` | 007 |
| **F07** | Notifications & Push | `useNotifications.ts`, `usePushNotifications.ts` | `user_notifications`, `push_subscriptions`, `push_notification_queue` | 007, 015 |
| **F08** | Payment Methods | `usePaymentMethods.ts` | `payment_methods` | 002 |
| **F09** | Saved Places | `useServices.ts` | `saved_places`, `recent_places` | 002 |
| **F10** | Promo Codes | `useServices.ts` | `promo_codes`, `user_promo_usage` | 002 |

### History & Communication (F11-F14)

| รหัส | ฟีเจอร์ | Composable | ตาราง DB | Migration |
|------|---------|------------|----------|-----------|
| **F11** | Ride History | `useRideHistory.ts` | `ride_requests`, `ride_ratings` | 001, 002 |
| **F12** | Chat/Messaging | `useChat.ts` | `chat_sessions`, `chat_messages` | 003 |
| **F13** | Safety/SOS | `useSafety.ts` | `emergency_contacts`, `trip_shares`, `safety_incidents` | 003, 004 |
| **F14** | Provider Dashboard | `useProvider.ts` | `service_providers`, `ride_requests` | 001, 006, 019 |

### Advanced Features (F15-F22)

| รหัส | ฟีเจอร์ | Composable | ตาราง DB | Migration |
|------|---------|------------|----------|-----------|
| **F15** | Scheduled Rides | `useAdvancedFeatures.ts` | `scheduled_rides` | 005 |
| **F16** | Multi-Stop Rides | `useAdvancedFeatures.ts` | `ride_stops` | 005 |
| **F17** | Fare Splitting | `useAdvancedFeatures.ts` | `fare_splits`, `fare_split_participants` | 005 |
| **F18** | Favorite Drivers | `useAdvancedFeatures.ts` | `favorite_drivers`, `blocked_drivers`, `driver_preferences` | 005 |
| **F19** | Voice Calls | `useAdvancedFeatures.ts` | `voice_calls` | 005 |
| **F20** | Ride Insurance | `useAdvancedFeatures.ts` | `insurance_plans`, `user_insurance`, `insurance_claims` | 005 |
| **F21** | Subscription Plans | `useAdvancedFeatures.ts` | `subscription_plans`, `user_subscriptions`, `subscription_usage` | 005 |
| **F22** | Corporate Accounts | `useCorporate.ts` | `companies`, `company_employees`, `corporate_policies`, `corporate_ride_requests` | 005 |

### Admin & System (F23-F26)

| รหัส | ฟีเจอร์ | Composable | ตาราง DB | Migration |
|------|---------|------------|----------|-----------|
| **F23** | Admin Dashboard | `useAdmin.ts` | ทุกตาราง | ทุก migration |
| **F24** | Support Tickets | `useAdmin.ts` | `support_tickets`, `complaints`, `refunds` | 003 |
| **F25** | Tracking System | `useTracking.ts` | `tracking_sequences` | 003 |
| **F26** | Service Ratings | `useServiceRatings.ts`, `useAdmin.ts` | `delivery_ratings`, `shopping_ratings` | 008 |

### Provider Features (F27-F28)

| รหัส | ฟีเจอร์ | Composable | ตาราง DB | Migration |
|------|---------|------------|----------|-----------|
| **F27** | Provider Earnings Withdrawal | `useProviderEarnings.ts` | `provider_bank_accounts`, `provider_withdrawals` | 017 |
| **F28** | Provider Online Hours Tracking | `useProviderEarnings.ts`, `useProvider.ts` | `provider_online_sessions`, `provider_daily_stats` | 017 |

### System Features (F29+)

| รหัส | ฟีเจอร์ | Composable | ตาราง DB | Migration |
|------|---------|------------|----------|-----------|
| **F29** | Internationalization (i18n) | `useI18n.ts` | - | - |
| **F30** | Status Change Audit Log | `useAuditLog.ts` | `status_audit_log` | 018 |
| **F31** | Real GPS Tracking for Provider | `useProviderTracking.ts` | `service_providers` (current_lat, current_lng) | - |
| **F32** | Error Monitoring (Sentry) | `lib/sentry.ts` | - | - |
| **F33** | Realtime Driver Location for Customer | `useDriverTracking.ts` | `service_providers` (realtime) | - |
| **F34** | Geofencing Alert for Provider | `useGeofencing.ts` | - | - |
| **F35** | Analytics Dashboard | `useAnalytics.ts` | `ride_requests`, `delivery_requests`, `shopping_requests` | - |
| **F36** | Surge Pricing System | `useSurgePricing.ts` | `app_settings` | - |
| **F37** | Provider Performance Score | `useProviderPerformance.ts` | `service_providers`, `ride_ratings` | - |
| **F38** | App Settings Management | `useAppSettings.ts` | `app_settings` | - |
| **F39** | Customer Feedback System | `useCustomerFeedback.ts` | `customer_feedback` | 021 |
| **F40** | Customer Feedback Widget | `FeedbackModal.vue`, `QuickRatingSheet.vue` | `customer_feedback` | 021 |
| **F41** | Quick Rating Component | `QuickRatingSheet.vue` | `ride_ratings` | - |
| **F42** | Service Area Management | `useServiceArea.ts` | `service_areas` | 022 |
| **F43** | Provider Heat Map | `useProviderHeatmap.ts` | `service_providers` | - |
| **F44** | Admin Live Map | `AdminLiveMapView.vue` | `service_providers` | - |
| **F45** | ETA Calculator | `useETA.ts` | - | - |
| **F46** | ETA Display Component | `ETADisplay.vue` | - | - |
| **F47** | Fare Estimator | `useFareEstimator.ts` | - | - |
| **F48** | Fare Estimate Display | `FareEstimateCard.vue` | - | - |
| **F49** | Ride Type Selector | `RideTypeSelector.vue` | - | - |
| **F50** | Trip Summary Component | `TripSummary.vue` | - | - |
| **F51** | Receipt Generator | `useReceipt.ts` | `ride_requests` | - |
| **F52** | Receipt Card Component | `ReceiptCard.vue` | - | - |
| **F53** | Cancellation System | `useCancellation.ts` | `ride_requests`, `delivery_requests`, `shopping_requests` | - |
| **F54** | Cancellation Modal | `CancellationModal.vue` | - | - |
| **F55** | Admin Cancellations View | `AdminCancellationsView.vue` | - | - |
| **F56** | Tip System | `useTip.ts` | `ride_requests`, `delivery_requests`, `shopping_requests` | - |
| **F57** | Tip Modal Component | `TipModal.vue` | - | - |
| **F58** | Ride Status Tracker | `RideStatusTracker.vue` | - | - |
| **F59** | Driver Info Card | `DriverInfoCard.vue` | - | - |
| **F60** | Admin Tips View | `AdminTipsView.vue` | - | - |
| **F61** | Booking Confirmation | `BookingConfirmation.vue` | - | - |
| **F62** | Search History | `useSearchHistory.ts` | `recent_places` | - |
| **F63** | Search History List | `SearchHistoryList.vue` | - | - |
| **F64** | Favorite Places | `FavoritePlaces.vue` | `saved_places` | - |
| **F65** | Loading States | `LoadingStates.vue` | - | - |
| **F66** | Empty State | `EmptyState.vue` | - | - |
| **F67** | Toast Notifications | `useToast.ts`, `ToastContainer.vue` | - | - |
| **F68** | Confirm Dialog | `ConfirmDialog.vue` | - | - |
| **F69** | Bottom Sheet | `BottomSheet.vue` | - | - |
| **F70** | Action Sheet | `ActionSheet.vue` | - | - |
| **F71** | Rating Stars | `RatingStars.vue` | - | - |
| **F72** | Price Display | `PriceDisplay.vue` | - | - |
| **F73** | Badge Component | `Badge.vue` | - | - |
| **F74** | Avatar Component | `Avatar.vue` | - | - |
| **F75** | Admin Reports View | `AdminReportsView.vue` | - | - |
| **F76** | Skeleton Loader | `SkeletonLoader.vue` | - | - |
| **F77** | Divider Component | `Divider.vue` | - | - |
| **F78** | Input Field | `InputField.vue` | - | - |
| **F79** | Select Field | `SelectField.vue` | - | - |
| **F80** | Switch Toggle | `SwitchToggle.vue` | - | - |
| **F81** | Checkbox | `Checkbox.vue` | - | - |
| **F82** | Radio Group | `RadioGroup.vue` | - | - |
| **F83** | Progress Bar | `ProgressBar.vue` | - | - |
| **F84** | Tabs Component | `TabsComponent.vue`, `TabPanel.vue` | - | - |
| **F85** | Accordion | `Accordion.vue` | - | - |
| **F86** | Tooltip | `Tooltip.vue` | - | - |
| **F87** | Popover | `Popover.vue` | - | - |
| **F88** | Card Component | `Card.vue` | - | - |
| **F89** | List Item | `ListItem.vue` | - | - |
| **F90** | Button Component | `Button.vue` | - | - |
| **F91** | Icon Button | `IconButton.vue` | - | - |
| **F92** | Modal Component | `Modal.vue` | - | - |
| **F93** | Notification Badge | `NotificationBadge.vue` | - | - |
| **F94** | Chip/Tag | `Chip.vue` | - | - |
| **F95** | Search Bar | `SearchBar.vue` | - | - |
| **F96** | Date Picker | `DatePicker.vue` | - | - |
| **F97** | Time Picker | `TimePicker.vue` | - | - |
| **F98** | Stepper | `Stepper.vue` | - | - |
| **F99** | Counter Input | `CounterInput.vue` | - | - |
| **F100** | Image Gallery | `ImageGallery.vue` | - | - |
| **F101** | File Upload | `FileUpload.vue` | - | - |
| **F102** | TextArea | `TextArea.vue` | - | - |
| **F103** | Pagination | `Pagination.vue` | - | - |
| **F104** | Data Table | `DataTable.vue` | - | - |
| **F105** | Alert Component | `Alert.vue` | - | - |
| **F106** | Stat Card | `StatCard.vue` | - | - |
| **F107** | Timeline | `Timeline.vue` | - | - |
| **F108** | Breadcrumb | `Breadcrumb.vue` | - | - |
| **F109** | Dropdown Menu | `DropdownMenu.vue` | - | - |
| **F110** | Floating Action Button | `FloatingActionButton.vue` | - | - |
| **F111** | Collapsible Section | `CollapsibleSection.vue` | - | - |
| **F112** | Info Row | `InfoRow.vue` | - | - |
| **F113** | Section Header | `SectionHeader.vue` | - | - |
| **F114** | Status Indicator | `StatusIndicator.vue` | - | - |
| **F115** | Phone Input | `PhoneInput.vue` | - | - |
| **F116** | OTP Input | `OTPInput.vue` | - | - |
| **F117** | Currency Input | `CurrencyInput.vue` | - | - |
| **F118** | Slider | `Slider.vue` | - | - |
| **F119** | Map Marker | `MapMarker.vue` | - | - |
| **F120** | Location Card | `LocationCard.vue` | - | - |
| **F121** | Notification Item | `NotificationItem.vue` | - | - |
| **F122** | Chat Bubble | `ChatBubble.vue` | - | - |
| **F123** | Vehicle Type Selector | `VehicleTypeSelector.vue` | - | - |
| **F124** | Route Line | `RouteLine.vue` | - | - |
| **F125** | Payment Method Card | `PaymentMethodCard.vue` | - | - |
| **F126** | Service Card | `ServiceCard.vue` | - | - |
| **F127** | Driver Card | `DriverCard.vue` | - | - |
| **F128** | Promo Card | `PromoCard.vue` | - | - |
| **F129** | Wallet Card | `WalletCard.vue` | - | - |
| **F130** | Transaction Item | `TransactionItem.vue` | - | - |
| **F131** | Address Input | `AddressInput.vue` | - | - |
| **F132** | Ride History Item | `RideHistoryItem.vue` | - | - |
| **F133** | Rating Input | `RatingInput.vue` | - | - |
| **F134** | Safety Button (SOS) | `SafetyButton.vue` | - | - |
| **F135** | Share Trip Card | `ShareTripCard.vue` | - | - |
| **F136** | Emergency Contact Card | `EmergencyContactCard.vue` | - | - |
| **F137** | Schedule Ride Card | `ScheduleRideCard.vue` | - | - |
| **F138** | Fare Split Card | `FareSplitCard.vue` | - | - |
| **F139** | Subscription Card | `SubscriptionCard.vue` | - | - |
| **F140** | Insurance Card | `InsuranceCard.vue` | - | - |
| **F141** | Corporate Account Card | `CorporateAccountCard.vue` | - | - |
| **F142** | Voice Call Card | `VoiceCallCard.vue` | - | - |
| **F143** | Support Ticket Card | `SupportTicketCard.vue` | - | - |
| **F144** | Referral Card | `ReferralCard.vue` | - | - |
| **F145** | Language Selector | `LanguageSelector.vue` | - | - |
| **F146** | Notification Settings | `NotificationSettings.vue` | - | - |
| **F147** | Privacy Settings | `PrivacySettings.vue` | - | - |
| **F148** | Profile Header | `ProfileHeader.vue` | - | - |
| **F149** | Menu List | `MenuList.vue` | - | - |
| **F150** | App Version | `AppVersion.vue` | - | - |
| **F151** | Admin Components View | `AdminComponentsView.vue` | - | - |
| **F152** | Provider Earnings Card | `provider/EarningsCard.vue` | - | - |
| **F153** | Provider Online Toggle | `provider/OnlineToggle.vue` | - | - |
| **F154** | Ride Request Card | `provider/RideRequestCard.vue` | - | - |
| **F155** | Trip Progress Card | `provider/TripProgressCard.vue` | - | - |
| **F156** | Customer Loyalty Program | `useLoyalty.ts`, `LoyaltyView.vue`, `AdminLoyaltyView.vue` | `user_loyalty`, `points_transactions`, `loyalty_rewards`, `user_rewards`, `loyalty_tiers`, `points_rules` | 023 |
| **F157** | Offline Mode | `useOfflineStorage.ts` | - (IndexedDB) | - |
| **F158** | Queue Booking | `useQueueBooking.ts`, `QueueBookingView.vue`, `QueueTrackingView.vue`, `AdminQueueView.vue` | `queue_bookings`, `queue_ratings` | 029, 031 |
| **F158a** | Queue Favorite Places & Wait Time | `useQueueFavorites.ts` | `queue_favorite_places`, `queue_place_stats` | 054 |
| **F159** | Moving Service | `useMoving.ts`, `MovingView.vue`, `MovingTrackingView.vue`, `AdminMovingView.vue` | `moving_requests`, `moving_ratings` | 029, 031 |
| **F160** | Laundry Service | `useLaundry.ts`, `LaundryView.vue`, `LaundryTrackingView.vue`, `AdminLaundryView.vue` | `laundry_requests`, `laundry_ratings` | 029, 031 |
| **F161** | Provider Daily Summary | `useProviderDailySummary.ts` | `provider_daily_stats` | 032 |
| **F162** | User Activity Log | `useActivityLog.ts` | `user_activity_log` | 033 |
| **F163** | Promo Usage Analytics | `usePromoAnalytics.ts` | `user_promo_usage` | 034 |
| **F164** | Revenue Dashboard | `useRevenueAnalytics.ts`, `AdminRevenueDashboardView.vue` | `ride_requests`, `delivery_requests`, `shopping_requests` | 035 |
| **F165** | Customer Retention Analytics | `useRetentionAnalytics.ts` | `users`, `ride_requests` | 036 |
| **F166** | Provider Rating Breakdown | `useProviderRatingBreakdown.ts` | `ride_ratings` | 038 |
| **F167** | User Segmentation | `useUserSegmentation.ts` | `user_segments` | 039 |
| **F168** | Fraud Detection | `useFraudDetection.ts`, `AdminFraudAlertsView.vue` | `fraud_alerts` | 040 |
| **F169** | Peak Hours Analysis | `usePeakHours.ts` | `ride_requests` | 041 |
| **F170** | Provider Incentives | `useProviderIncentives.ts`, `ProviderIncentivesView.vue`, `AdminIncentivesView.vue` | `provider_incentives`, `provider_incentive_progress` | 042 |
| **F171** | Service Quality Metrics | `useServiceQuality.ts` | `service_quality_metrics` | 043 |

### Delivery Enhancements (F03 Extensions)

| รหัส | ฟีเจอร์ | Composable/Component | ตาราง DB | Migration |
|------|---------|---------------------|----------|-----------|
| **F03a** | Delivery Proof Photo | `useProvider.ts` → `uploadDeliveryProof()`, `DeliveryProofCapture.vue` | `delivery_requests` (delivery_proof_photo, delivery_proof_lat, delivery_proof_lng, delivery_proof_timestamp, pickup_proof_*) | 051 |
| **F03b** | Image Quality Selector | `useDelivery.ts` → `compressImage()`, `QUALITY_PRESETS` | - | - |

### Performance Optimization (F172-F201)

| รหัส | ฟีเจอร์ | Composable/Component | รายละเอียด |
|------|---------|---------------------|------------|
| **F172** | Memory Management & Cleanup | `usePerformance.ts` → `useAutoCleanup` | Auto-cleanup subscriptions และ timers |
| **F173** | Debounce Utilities | `usePerformance.ts` → `useDebounce` | Debounce function with cancel |
| **F174** | Throttle Utilities | `usePerformance.ts` → `useThrottle` | Throttle with leading/trailing |
| **F175** | Lazy Loading | `usePerformance.ts` → `useLazyLoad` | Intersection observer lazy load |
| **F176** | Resource Preloading | `usePerformance.ts` → `usePreload` | Preload images, scripts, fonts |
| **F177** | Virtual Scrolling | `usePerformance.ts` → `useVirtualScroll` | Virtual scroll for large lists |
| **F178** | Memoization | `usePerformance.ts` → `useMemo` | Memoize expensive computations |
| **F179** | LRU Cache | `usePerformance.ts` → `useLRUCache` | LRU Cache implementation |
| **F180** | Request Queue | `usePerformance.ts` → `useRequestQueue` | Priority request queue |
| **F181** | Batch Requests | `usePerformance.ts` → `useBatchRequest` | Batch multiple requests |
| **F182** | Retry with Backoff | `usePerformance.ts` → `useRetry` | Exponential backoff retry |
| **F183** | Circuit Breaker | `usePerformance.ts` → `useCircuitBreaker` | Circuit breaker pattern |
| **F184** | Progressive Image | `usePerformance.ts` → `useProgressiveImage` | Progressive image loading |
| **F185** | Responsive Image | `usePerformance.ts` → `useResponsiveImage` | Srcset generator |
| **F186** | RAF Animation | `usePerformance.ts` → `useRAF` | RequestAnimationFrame hook |
| **F187** | Smooth Scroll | `usePerformance.ts` → `useSmoothScroll` | Smooth scroll with easing |
| **F188** | Web Workers | `usePerformance.ts` → `useWebWorker` | Web Worker wrapper |
| **F189** | Network Status | `usePerformance.ts` → `useNetworkStatus` | Network info & adaptive loading |
| **F190** | Idle Callback | `usePerformance.ts` → `useIdleCallback` | Idle callback for non-critical tasks |
| **F191** | Background Tasks | `usePerformance.ts` → `useBackgroundTasks` | Background task scheduler |
| **F192** | Persistent State | `usePerformance.ts` → `usePersistentState` | localStorage persistence |
| **F193** | Event Bus | `usePerformance.ts` → `useEventBus` | Global event bus |
| **F194** | Performance Metrics | `usePerformance.ts` → `usePerformanceMetrics` | Core Web Vitals collection |
| **F195** | Resource Hints | `usePerformance.ts` → `useResourceHints` | Preconnect, prefetch, preload |
| **F196** | Intersection Observer | `usePerformance.ts` → `useIntersectionObserver` | Visibility tracking |
| **F197** | Optimized Form | `usePerformance.ts` → `useOptimizedForm` | Form state management |
| **F198** | Infinite Scroll | `usePerformance.ts` → `useInfiniteScroll` | Infinite scroll implementation |
| **F199** | Touch Gestures | `usePerformance.ts` → `useTouchGestures` | Touch gesture detection |
| **F200** | Polling | `usePerformance.ts` → `usePolling` | Smart polling with adaptive interval |
| **F201** | Performance Dashboard | `AdminPerformanceView.vue` | Admin performance monitoring |

### Advanced System Features (F202-F251)

| รหัส | ฟีเจอร์ | Composable/Component | รายละเอียด |
|------|---------|---------------------|------------|
| **F202** | Feature Flags System | `useAdvancedSystem.ts` → `useFeatureFlags` | Feature flag management | `feature_flags` | 045 |
| **F203** | A/B Testing Framework | `useAdvancedSystem.ts` → `useABTesting` | A/B test management | `ab_tests`, `ab_test_variants`, `ab_test_assignments`, `ab_test_conversions` | 045 |
| **F204** | User Preferences Manager | `useAdvancedSystem.ts` → `useUserPreferences` | User preferences storage | `user_preferences` | 045 |
| **F205** | Smart Caching System | `useAdvancedSystem.ts` → `useSmartCache` | Intelligent caching |
| **F206** | Request Deduplication | `useAdvancedSystem.ts` → `useRequestDedup` | Prevent duplicate requests |
| **F207** | Optimistic Updates | `useAdvancedSystem.ts` → `useOptimisticUpdate` | Optimistic UI updates |
| **F208** | State Machine | `useAdvancedSystem.ts` → `useStateMachine` | State machine pattern |
| **F209** | Event Sourcing | `useAdvancedSystem.ts` → `useEventSourcing` | Event sourcing pattern |
| **F210** | Command Pattern | `useAdvancedSystem.ts` → `useCommand` | Command pattern |
| **F211** | Pub/Sub System | `useAdvancedSystem.ts` → `usePubSub` | Publish/Subscribe pattern |
| **F212** | Rate Limiter | `useAdvancedSystem.ts` → `useRateLimiter` | Rate limiting |
| **F213** | Retry Queue | `useAdvancedSystem.ts` → `useRetryQueue` | Retry failed operations |
| **F214** | Data Sync Manager | `useAdvancedSystem.ts` → `useDataSync` | Data synchronization |
| **F215** | Conflict Resolution | `useAdvancedSystem.ts` → `useConflictResolution` | Conflict resolution |
| **F216** | Schema Validator | `useAdvancedSystem.ts` → `useSchemaValidator` | Data validation |
| **F217** | Data Transformer | `useAdvancedSystem.ts` → `useDataTransformer` | Data transformation |
| **F218** | Query Builder | `useAdvancedSystem.ts` → `useQueryBuilder` | Dynamic query building |
| **F219** | Pagination Helper | `useAdvancedSystem.ts` → `usePagination` | Pagination utilities |
| **F220** | Search Engine | `useAdvancedSystem.ts` → `useSearch` | Search functionality |
| **F221** | Filter Builder | `useAdvancedSystem.ts` → `useFilterBuilder` | Dynamic filters |
| **F222** | Sort Manager | `useAdvancedSystem.ts` → `useSortManager` | Sorting utilities |
| **F223** | Export Manager | `useAdvancedSystem.ts` → `useExport` | Data export (CSV, Excel) |
| **F224** | Import Manager | `useAdvancedSystem.ts` → `useImport` | Data import |
| **F225** | Clipboard Manager | `useAdvancedSystem.ts` → `useClipboard` | Clipboard operations |
| **F226** | Keyboard Shortcuts | `useAdvancedSystem.ts` → `useKeyboardShortcuts` | Keyboard shortcuts |
| **F227** | Drag and Drop | `useAdvancedSystem.ts` → `useDragAndDrop` | Drag and drop |
| **F228** | Selection Manager | `useAdvancedSystem.ts` → `useSelection` | Multi-selection |
| **F229** | Undo/Redo Stack | `useAdvancedSystem.ts` → `useUndoRedo` | Undo/Redo functionality |
| **F230** | Form Wizard | `useAdvancedSystem.ts` → `useFormWizard` | Multi-step forms |
| **F231** | Multi-Step Form | `useAdvancedSystem.ts` → `useMultiStepForm` | Step-by-step forms |
| **F232** | Notification Queue | `useAdvancedSystem.ts` → `useNotificationQueue` | Notification queue |
| **F233** | Modal Manager | `useAdvancedSystem.ts` → `useModalManager` | Modal management |
| **F234** | Confirmation Dialog | `useAdvancedSystem.ts` → `useConfirmation` | Confirmation dialogs |
| **F235** | Loading State Manager | `useAdvancedSystem.ts` → `useLoadingState` | Loading states |
| **F236** | Error Boundary | `useAdvancedSystem.ts` → `useErrorBoundary` | Error handling |
| **F237** | Analytics Tracker | `useAdvancedSystem.ts` → `useAnalytics` | Analytics tracking | `analytics_events` | 045 |
| **F238** | Session Manager | `useAdvancedSystem.ts` → `useSessionManager` | Session management |
| **F239** | Permission Manager | `useAdvancedSystem.ts` → `usePermissions` | Permission management |
| **F240** | Theme Manager | `useAdvancedSystem.ts` → `useThemeManager` | Theme switching |
| **F241** | Locale Manager | `useAdvancedSystem.ts` → `useLocaleManager` | Localization |
| **F242** | Accessibility Manager | `useAdvancedSystem.ts` → `useAccessibility` | Accessibility features |
| **F243** | Device Detection | `useAdvancedSystem.ts` → `useDeviceDetection` | Device detection |
| **F244** | Geolocation Manager | `useAdvancedSystem.ts` → `useGeolocationManager` | Geolocation utilities |
| **F245** | Media Query Manager | `useAdvancedSystem.ts` → `useMediaQuery` | Responsive utilities |
| **F246** | Scroll Manager | `useAdvancedSystem.ts` → `useScrollManager` | Scroll management |
| **F247** | Focus Manager | `useAdvancedSystem.ts` → `useFocusManager` | Focus management |
| **F248** | Animation Controller | `useAdvancedSystem.ts` → `useAnimationController` | Animation control |
| **F249** | File Manager | `useAdvancedSystem.ts` → `useFileManager` | File operations |
| **F250** | Image Processor | `useAdvancedSystem.ts` → `useImageProcessor` | Image processing |
| **F251** | System Health Monitor | `useAdvancedSystem.ts` → `useSystemHealth` | System health monitoring | `system_health_log` | 045 |

### Admin Views for Advanced System (F202-F251)

| รหัส | Admin View | รายละเอียด | ตาราง DB |
|------|-----------|------------|----------|
| **F201** | `AdminPerformanceView.vue` | ดู Performance Metrics | - |
| **F202** | `AdminFeatureFlagsView.vue` | จัดการ Feature Flags | `feature_flags` |
| **F203** | `AdminABTestsView.vue` | จัดการ A/B Tests | `ab_tests`, `ab_test_variants` |
| **F237** | `AdminAnalyticsEventsView.vue` | ดู Analytics Events และ User Behavior | `analytics_events` |
| **F237b** | `AdminUserJourneyView.vue` | Funnel Analysis และ Conversion Rate | `users`, `ride_requests`, `ride_ratings` |
| **F251** | `AdminSystemHealthView.vue` | ตรวจสอบสุขภาพระบบ | `system_health_log` |

---

## 📁 Database Tables Reference

### ตารางหลัก (Core Tables)
```
users                    → F01 (Auth)
service_providers        → F02, F14 (Ride, Provider)
ride_requests           → F02, F11, F14 (Ride, History, Provider)
delivery_requests       → F03 (Delivery)
shopping_requests       → F04 (Shopping)
payments                → F08 (Payments)
```

### ตารางเสริม (Supporting Tables)
```
user_wallets            → F05 (Wallet)
wallet_transactions     → F05 (Wallet)
referral_codes          → F06 (Referral)
referrals               → F06 (Referral)
user_notifications      → F07 (Notifications)
payment_methods         → F08 (Payment Methods)
saved_places            → F09 (Saved Places)
recent_places           → F09 (Saved Places)
promo_codes             → F10 (Promos)
user_promo_usage        → F10 (Promos)
favorite_promos         → F10 (Promo Favorites)
ride_ratings            → F11 (History)
```

### ตาราง Chat & Safety
```
chat_sessions           → F12 (Chat)
chat_messages           → F12 (Chat)
emergency_contacts      → F13 (Safety)
trip_shares             → F13 (Safety)
safety_incidents        → F13 (Safety)
```

### ตาราง Advanced Features
```
scheduled_rides         → F15 (Scheduled)
ride_stops              → F16 (Multi-Stop)
fare_splits             → F17 (Fare Split)
fare_split_participants → F17 (Fare Split)
favorite_drivers        → F18 (Favorites)
blocked_drivers         → F18 (Favorites)
driver_preferences      → F18 (Favorites)
voice_calls             → F19 (Voice)
insurance_plans         → F20 (Insurance)
user_insurance          → F20 (Insurance)
insurance_claims        → F20 (Insurance)
subscription_plans      → F21 (Subscription)
user_subscriptions      → F21 (Subscription)
subscription_usage      → F21 (Subscription)
```

### ตาราง Corporate
```
companies               → F22 (Corporate)
company_employees       → F22 (Corporate)
corporate_policies      → F22 (Corporate)
corporate_ride_requests → F22 (Corporate)
```

### ตาราง System
```
support_tickets         → F24 (Support)
complaints              → F24 (Support)
refunds                 → F24 (Support)
tracking_sequences      → F25 (Tracking)
```

### ตาราง Provider Earnings (F27-F28)
```
provider_bank_accounts  → F27 (Withdrawal)
provider_withdrawals    → F27 (Withdrawal)
provider_online_sessions → F28 (Online Hours)
provider_daily_stats    → F28 (Online Hours)
```

### ตาราง Ratings (F26)
```
ride_ratings            → F11, F26 (History, Ratings)
delivery_ratings        → F26 (Service Ratings)
shopping_ratings        → F26 (Service Ratings)
```

### ตาราง Loyalty Program (F156)
```
loyalty_tiers           → F156 (Loyalty Tiers)
user_loyalty            → F156 (User Loyalty Status)
points_transactions     → F156 (Points History)
loyalty_rewards         → F156 (Available Rewards)
user_rewards            → F156 (Redeemed Rewards)
points_rules            → F156 (Points Earning Rules)
```

### ตาราง New Services (F158-F160)
```
queue_bookings          → F158 (Queue Booking)
queue_ratings           → F158 (Queue Ratings)
queue_favorite_places   → F158a (Queue Favorite Places)
queue_place_stats       → F158a (Queue Place Statistics & Wait Time)
moving_requests         → F159 (Moving Service)
moving_ratings          → F159 (Moving Ratings)
laundry_requests        → F160 (Laundry Service)
laundry_ratings         → F160 (Laundry Ratings)
```

### ตาราง Advanced System (F202-F251)
```
feature_flags           → F202 (Feature Flags) - key, name, enabled, rollout_percentage, target_users, target_roles
ab_tests                → F203 (A/B Testing) - name, status (draft/running/paused/completed), start_date, end_date
ab_test_variants        → F203 (A/B Testing) - test_id, name, weight, is_control
ab_test_assignments     → F203 (A/B Testing) - test_id, user_id, variant_id
ab_test_conversions     → F203 (A/B Testing) - test_id, variant_id, user_id, event_name, event_data
user_preferences        → F204 (User Preferences) - theme, language, notifications, privacy, accessibility, ride_preferences
analytics_events        → F237 (Analytics) - session_id, event_name, event_category, properties, page_url, device_type
system_health_log       → F251 (System Health) - status, uptime_ms, memory_used, network_online, storage_used
```

---

## 🔧 Database Functions Reference

| Function | ฟีเจอร์ | รหัส |
|----------|---------|------|
| `validate_thai_national_id()` | User validation | F01 |
| `find_nearby_providers()` | Find drivers | F02 |
| `get_ride_with_driver()` | Ride details | F02 |
| `get_pending_rides_for_provider()` | Provider requests | F14 |
| `accept_ride_request()` | Atomic ride acceptance | F14 |
| `update_ride_status()` | Update ride status with validation | F14 |
| `cancel_ride_by_provider()` | Provider cancels ride | F14 |
| `set_provider_availability()` | Toggle provider online/offline | F14 |
| `get_available_rides_for_provider()` | Get nearby pending rides | F14 |
| `get_provider_active_ride()` | Get provider's current ride | F14 |
| `notify_nearby_providers_new_ride()` | Push notify nearby providers | F14, F07 |
| `log_provider_cancellation()` | Log provider cancellation | F14 |
| `get_provider_cancellation_stats()` | Get cancellation stats | F14 |
| `validate_promo_code()` | Promo validation | F10 |
| `use_promo_code()` | Apply promo | F10 |
| `ensure_user_wallet()` | Wallet init | F05 |
| `add_wallet_transaction()` | Wallet transaction | F05 |
| `get_wallet_balance()` | Wallet balance | F05 |
| `generate_referral_code()` | Create referral | F06 |
| `apply_referral_code()` | Use referral | F06 |
| `send_notification()` | Send notification | F07 |
| `calculate_delivery_fee()` | Delivery pricing | F03 |
| `calculate_shopping_fee()` | Shopping pricing | F04 |
| `calculate_multistop_fare()` | Multi-stop pricing | F16 |
| `check_user_subscription()` | Check subscription | F21 |
| `apply_subscription_discount()` | Apply discount | F21 |
| `get_favorite_drivers()` | Get favorites | F18 |
| `is_driver_blocked()` | Check blocked | F18 |
| `generate_tracking_id()` | Create tracking ID | F25 |
| `lookup_by_tracking_id()` | Find by tracking | F25 |
| `submit_delivery_rating()` | Submit delivery rating | F26 |
| `submit_shopping_rating()` | Submit shopping rating | F26 |
| `get_provider_ratings_summary()` | Provider ratings summary | F26 |
| `send_rating_reminder_notification()` | Auto-send rating reminder | F07, F26 |
| `send_ride_rating_reminder()` | Auto-send ride rating reminder | F07, F26 |
| `use_notification_template()` | Use and track template usage | F07 |
| `get_users_by_segment()` | Get users by segment for targeting | F07 |
| `process_scheduled_notification()` | Process and send scheduled notification | F07 |
| `get_segment_user_count()` | Get user count for segment preview | F07 |
| `check_promo_expiry_notifications()` | Check and notify expiring promos | F10 |
| `notify_new_promo()` | Trigger for new promo notifications | F10 |
| `check_favorite_promo_alerts()` | Check and send favorite promo alerts | F10 |
| `notify_promo_low_stock()` | Trigger for low stock promo alerts | F10 |
| `save_push_subscription()` | Save push subscription | F07 |
| `remove_push_subscription()` | Remove push subscription | F07 |
| `get_user_push_subscriptions()` | Get user's push subscriptions | F07 |
| `queue_push_notification()` | Queue push notification | F07 |
| `auto_queue_push_notification()` | Auto-queue on notification insert | F07 |
| `start_provider_session()` | Start online session | F28 |
| `end_provider_session()` | End online session | F28 |
| `get_provider_balance()` | Get provider balance | F27 |
| `request_withdrawal()` | Request withdrawal | F27 |
| `get_provider_earnings_summary()` | Get earnings summary | F27, F28 |
| `get_provider_weekly_hours()` | Get weekly online hours | F28 |
| `get_feedback_stats()` | Get customer feedback statistics | F39 |
| `request_feedback_after_service()` | Auto-request feedback trigger | F39 |
| `get_loyalty_summary()` | Get user loyalty summary with tier | F156 |
| `add_loyalty_points()` | Add/deduct loyalty points | F156 |
| `redeem_reward()` | Redeem loyalty reward | F156 |
| `calculate_points_for_ride()` | Calculate points earned from ride | F156 |
| `auto_award_points()` | Auto-award points on service completion | F156 |
| `check_tier_upgrade()` | Check and upgrade user tier | F156 |
| `generate_member_uid()` | Auto-generate Member UID on user creation | F01 |
| `get_user_by_member_uid()` | Lookup user by Member UID | F01 |
| `generate_service_tracking_id()` | Generate tracking ID for new services (QUE/MOV/LAU) | F158, F159, F160 |
| `accept_queue_booking()` | Atomic acceptance of queue booking | F158 |
| `update_queue_status()` | Update queue booking status with validation | F158 |
| `accept_moving_request()` | Atomic acceptance of moving request | F159 |
| `update_moving_status()` | Update moving request status with validation | F159 |
| `calculate_moving_price()` | Calculate moving price based on service type and helpers | F159 |
| `accept_laundry_request()` | Atomic acceptance of laundry request | F160 |
| `update_laundry_status()` | Update laundry request status with validation | F160 |
| `calculate_laundry_price()` | Calculate laundry price based on services and weight | F160 |
| `notify_queue_booking_confirmed()` | Trigger: notify customer on queue confirmation | F158 |
| `notify_queue_booking_completed()` | Trigger: notify customer on queue completion | F158 |
| `notify_moving_matched()` | Trigger: notify customer when moving matched | F159 |
| `notify_moving_pickup()` | Trigger: notify customer when provider arrives | F159 |
| `notify_moving_completed()` | Trigger: notify customer on moving completion | F159 |
| `notify_laundry_matched()` | Trigger: notify customer when laundry matched | F160 |
| `notify_laundry_picked_up()` | Trigger: notify customer when laundry picked up | F160 |
| `notify_laundry_ready()` | Trigger: notify customer when laundry ready | F160 |
| `notify_laundry_delivered()` | Trigger: notify customer when laundry delivered | F160 |
| `notify_providers_new_queue_booking()` | Trigger: notify providers of new queue job | F158 |
| `notify_providers_new_moving_request()` | Trigger: notify providers of new moving job | F159 |
| `notify_providers_new_laundry_request()` | Trigger: notify providers of new laundry job | F160 |
| `get_feature_flag()` | Get feature flag status for user with rollout | F202 |
| `assign_ab_test_variant()` | Assign user to A/B test variant based on weight | F203 |
| `track_ab_conversion()` | Track A/B test conversion event | F203 |
| `get_ab_test_results()` | Get A/B test results with conversion rates | F203 |
| `get_analytics_summary()` | Get analytics summary for specified hours | F237 |

---

## 📝 Tracking ID Formats

| Prefix | Entity | ตัวอย่าง |
|--------|--------|----------|
| `CUS` | Customer | CUS-20251216-000001 |
| `DRV` | Driver | DRV-20251216-000001 |
| `RDR` | Rider (Delivery) | RDR-20251216-000001 |
| `RID` | Ride Request | RID-20251216-000001 |
| `DEL` | Delivery Request | DEL-20251216-000001 |
| `SHP` | Shopping Request | SHP-20251216-000001 |
| `PAY` | Payment | PAY-20251216-000001 |
| `TXN` | Transaction | TXN-20251216-000001 |
| `CHT` | Chat Session | CHT-20251216-000001 |
| `SUP` | Support Ticket | SUP-20251216-000001 |
| `CMP` | Complaint | CMP-20251216-000001 |
| `RFD` | Refund | RFD-20251216-000001 |
| `QUE` | Queue Booking | QUE-20251216-000001 |
| `MOV` | Moving Request | MOV-20251216-000001 |
| `LAU` | Laundry Request | LAU-20251216-000001 |

---

## ⚠️ กฎเมื่อเพิ่มฟีเจอร์ใหม่

### 1. สร้าง Migration ใหม่
```sql
-- ไฟล์: supabase/migrations/XXX_feature_name.sql
-- ระบุ Feature ID ใน comment
-- Feature: F## - Feature Name
```

### 2. สร้าง/อัพเดท Composable
```typescript
// ไฟล์: src/composables/useFeatureName.ts
// ระบุ Feature ID และตาราง DB ใน comment
/**
 * Feature: F## - Feature Name
 * Tables: table1, table2
 * Migration: XXX_feature_name.sql
 */
```

### 3. อัพเดท Admin Dashboard
- เพิ่มใน `useAdmin.ts` ถ้าต้องการจัดการจาก Admin
- เพิ่ม View ใน `src/views/Admin*.vue` ถ้าจำเป็น

### 4. อัพเดทเอกสารนี้
- เพิ่มรหัสฟีเจอร์ใหม่ในตาราง
- ระบุตาราง DB ที่เกี่ยวข้อง
- ระบุ Composable ที่รับผิดชอบ

---

## 🔄 Realtime Subscriptions

ตารางที่เปิด Realtime:
- `ride_requests` → F02, F14
- `service_providers` → F02, F14
- `chat_messages` → F12
- `user_notifications` → F07
- `wallet_transactions` → F05

---

## 📊 Migration Files

### Legacy Files (Supabase CLI Compatible)

| ไฟล์ | รายละเอียด | ฟีเจอร์ที่เกี่ยวข้อง |
|------|------------|---------------------|
| `001_initial_schema.sql` | Core tables | F01, F02, F03, F04, F08 |
| `002_additional_features.sql` | Promos, Places, Ratings | F09, F10, F11 |
| `003_tracking_ids.sql` | Tracking, Chat, Support | F12, F24, F25 |
| `004_safety_features.sql` | Emergency, Trip Share | F13 |
| `005_advanced_features.sql` | Advanced features | F15-F22 |
| `006_fix_services_flow.sql` | Fix providers, RLS | F02, F14 |
| `007_complete_system.sql` | Wallet, Referral, Notifications | F05, F06, F07 |
| `008_service_ratings.sql` | Delivery/Shopping Ratings | F26 |
| `009_rating_notifications.sql` | Rating Reminder Triggers | F07, F26 |
| `010_notification_templates.sql` | Notification Templates | F07 |
| `011_scheduled_notifications.sql` | Scheduled Notifications & User Segmentation | F07 |
| `012_provider_documents_storage.sql` | Provider Documents Storage | F14 |
| `013_promo_favorites_and_category.sql` | Promo Favorites & Categories | F10 |
| `014_promo_alerts.sql` | Promo Alerts for Favorites | F10 |
| `015_push_notifications.sql` | Push Subscriptions & Queue | F07 |
| `016_fix_provider_columns.sql` | Fix provider columns consistency | F14 |
| `017_provider_earnings_withdrawal.sql` | Provider Earnings & Withdrawal | F27, F28 |
| `018_status_audit_log.sql` | Status Change Audit Log | F30 |
| `019_production_provider_system.sql` | Atomic ride acceptance, Provider functions | F14 |
| `020_provider_push_and_cancellation.sql` | Provider push notifications, Cancellation tracking | F14, F07 |
| `021_customer_feedback.sql` | Customer Feedback System, NPS | F39, F40 |
| `022_service_areas.sql` | Service Area Management | F42 |
| `023_loyalty_program.sql` | Loyalty Program, Points, Rewards, Tiers | F156 |
| `024_fix_scheduled_rides_rls.sql` | Fix Scheduled Rides RLS policies | F15 |
| `025_fix_loyalty_functions.sql` | Fix Loyalty Functions (get_loyalty_summary, redeem_reward) | F156 |
| `026_registration_system_enhancement.sql` | Registration system enhancement | F01 |
| `027_user_member_uid.sql` | Member UID system for customer tracking | F01 |
| `029_new_services.sql` | New services (Queue Booking, Moving, Laundry) | F158-F160 |
| `031_new_services_notifications.sql` | Notification triggers for new services | F158-F160 |
| `030_fix_loyalty_and_promo_functions.sql` | Fix add_loyalty_points, validate_promo_code, check_tier_upgrade | F156, F10 |
| `031_auto_points_award_triggers.sql` | Auto-award loyalty points on service completion | F156 |
| `032_provider_daily_summary.sql` | Provider daily summary functions | F161 |
| `033_user_activity_log.sql` | User activity logging system | F162 |
| `034_promo_usage_analytics.sql` | Promo usage analytics functions | F163 |
| `035_revenue_dashboard.sql` | Revenue dashboard functions | F164 |
| `036_customer_retention.sql` | Customer retention analytics | F165 |
| `037_scheduled_notification_processor.sql` | Scheduled notification processor | F07 |
| `038_provider_rating_breakdown.sql` | Provider rating breakdown by category | F166 |
| `039_user_segmentation.sql` | User segmentation for marketing | F167 |
| `040_fraud_detection.sql` | Fraud detection alerts system | F168 |
| `041_peak_hours_analysis.sql` | Peak hours analysis functions | F169 |
| `042_provider_incentives.sql` | Provider incentive/bonus system | F170 |
| `043_service_quality_metrics.sql` | Service quality metrics | F171 |
| `044_performance_metrics.sql` | Performance metrics & monitoring | F172-F201 |
| `045_advanced_system.sql` | Feature flags, A/B testing, user preferences, analytics, system health | F202, F203, F204, F237, F251 |
| `054_queue_favorites_and_wait_time.sql` | Queue favorite places & estimated wait time | F158a |

---

## 📁 Modular Migration Structure (NEW)

### Core Module (`core/`)
| ไฟล์ | รายละเอียด | ฟีเจอร์ |
|------|------------|---------|
| `001_users_auth.sql` | Users & Authentication | F01 |

### Provider Module (`provider/`)
| ไฟล์ | รายละเอียด | ฟีเจอร์ |
|------|------------|---------|
| `001_service_providers.sql` | Service providers, find nearby | F14 |
| `002_earnings.sql` | Earnings & stats | F14 |

### Customer Module (`customer/`)
| ไฟล์ | รายละเอียด | ฟีเจอร์ |
|------|------------|---------|
| `001_rides.sql` | Ride requests | F02 |
| `002_delivery.sql` | Delivery service | F03 |
| `003_shopping.sql` | Shopping service | F04 |
| `004_ratings.sql` | All ratings (ride/delivery/shopping) | F11, F26 |
| `005_saved_places.sql` | Saved & recent places | F09 |
| `006_safety.sql` | Emergency, SOS, trip share | F13 |
| `007_chat.sql` | Chat/messaging | F12 |

### Shared Module (`shared/`)
| ไฟล์ | รายละเอียด | ฟีเจอร์ |
|------|------------|---------|
| `001_notifications.sql` | Notifications & push | F07 |
| `002_payments.sql` | Payments & methods | F08 |
| `003_wallet.sql` | Wallet system | F05 |
| `004_promos.sql` | Promo codes | F10 |
| `005_referral.sql` | Referral system | F06 |
| `006_tracking.sql` | Tracking system | F25 |
| `007_advanced_features.sql` | F15-F22 features | F15-F22 |

### Admin Module (`admin/`)
| ไฟล์ | รายละเอียด | ฟีเจอร์ |
|------|------------|---------|
| `001_admin_features.sql` | Support, complaints, refunds, activity log | F23, F24 |

---

## 🔗 Module Dependencies

```
core/001_users_auth
    ├── provider/001_service_providers
    │       └── provider/002_earnings
    │
    ├── customer/001_rides ─────────┐
    │       ├── customer/004_ratings│
    │       ├── customer/006_safety │
    │       └── customer/007_chat   │
    │                               │
    ├── customer/002_delivery ──────┤
    │       └── customer/004_ratings│
    │                               │
    ├── customer/003_shopping ──────┤
    │       └── customer/004_ratings│
    │                               │
    ├── customer/005_saved_places   │
    │                               │
    ├── shared/001_notifications    │
    ├── shared/002_payments         │
    ├── shared/003_wallet ──────────┤
    │       └── shared/005_referral │
    ├── shared/004_promos           │
    ├── shared/006_tracking         │
    ├── shared/007_advanced_features┘
    │
    └── admin/001_admin_features
```
