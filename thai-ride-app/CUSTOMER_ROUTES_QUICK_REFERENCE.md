# Customer Routes - Quick Reference 🚀

## 📍 Main Routes

### Core Services

```
/customer              → Home (CustomerHomeView.vue)
/customer/ride         → Ride Booking (RideView.vue) ⭐ STABLE
/customer/ride-v2      → Ride Booking V2 (customer/RideBookingView.vue) 🆕 EXPERIMENTAL
/customer/delivery     → Delivery Service (DeliveryView.vue)
/customer/shopping     → Shopping Service (ShoppingView.vue)
```

### New Services

```
/customer/queue-booking     → Queue Booking (QueueBookingViewV2.vue)
/customer/moving            → Moving Service (MovingView.vue)
/customer/laundry           → Laundry Service (LaundryView.vue)
```

### Tracking (Dynamic Routes)

```
/customer/queue-booking/:id → Queue Tracking (QueueTrackingView.vue)
/customer/moving/:id        → Moving Tracking (MovingTrackingView.vue)
/customer/laundry/:id       → Laundry Tracking (LaundryTrackingView.vue)
/customer/receipt/:id       → Receipt View (ReceiptView.vue)
```

### User Management

```
/customer/profile       → Profile (ProfileView.vue)
/customer/wallet        → Wallet V3 (WalletViewV3.vue) ⭐ CURRENT
/customer/history       → Order History (HistoryView.vue)
/customer/notifications → Notifications (NotificationsView.vue)
/customer/settings      → Settings (SettingsView.vue)
```

### Features

```
/customer/saved-places      → Saved Places (SavedPlacesView.vue)
/customer/payment-methods   → Payment Methods (PaymentMethodsView.vue)
/customer/promotions        → Promotions (PromotionsView.vue)
/customer/referral          → Referral Program (ReferralView.vue)
/customer/loyalty           → Loyalty Program (LoyaltyView.vue)
/customer/subscription      → Subscriptions (SubscriptionView.vue)
/customer/scheduled-rides   → Scheduled Rides (ScheduledRidesView.vue)
/customer/insurance         → Insurance (InsuranceView.vue)
/customer/favorite-drivers  → Favorite Drivers (FavoriteDriversView.vue)
/customer/safety            → Safety Features (SafetyView.vue)
/customer/help              → Help Center (HelpView.vue)
```

---

## 🔄 Redirects

```
/saved-places              → /customer/saved-places
/customer/become-provider  → /provider/onboarding
```

---

## 📦 Legacy Routes (Backward Compatibility)

```
/customer/home-legacy      → HomeView.vue
/customer/services-legacy  → ServicesView.vue
/customer/delivery-legacy  → DeliveryView.vue
/customer/wallet-legacy    → WalletView.vue
```

---

## 🎯 Route Meta Tags

### Authentication

```typescript
meta: {
  requiresAuth: true;
} // Requires login
```

### Navigation

```typescript
meta: {
  hideNavigation: true;
} // Hide bottom nav bar
```

### Role

```typescript
meta: {
  isCustomerRoute: true;
} // Customer-only route
```

---

## 💡 Usage Examples

### Navigate to Ride Booking

```typescript
// Stable version
router.push("/customer/ride");

// New version (experimental)
router.push("/customer/ride-v2");
```

### Navigate to Tracking

```typescript
// With order ID
router.push(`/customer/moving/${orderId}`);
```

### Navigate with Query Params

```typescript
router.push({
  path: "/customer/ride",
  query: { from: "home" },
});
```

---

## 🔍 Finding Routes

### By Service Type

- **Ride:** `/customer/ride` or `/customer/ride-v2`
- **Delivery:** `/customer/delivery`
- **Shopping:** `/customer/shopping`
- **Queue:** `/customer/queue-booking`
- **Moving:** `/customer/moving`
- **Laundry:** `/customer/laundry`

### By Feature

- **Wallet:** `/customer/wallet`
- **Loyalty:** `/customer/loyalty`
- **Promotions:** `/customer/promotions`
- **Safety:** `/customer/safety`

### By Action

- **Book Service:** `/customer/{service}`
- **Track Order:** `/customer/{service}/:id`
- **View History:** `/customer/history`
- **Manage Profile:** `/customer/profile`

---

## ⚠️ Important Notes

1. **Ride Booking:** Use `/customer/ride` for production, `/customer/ride-v2` for testing
2. **Wallet:** Use `/customer/wallet` (V3), not legacy version
3. **Tracking:** Always include order ID in URL parameter
4. **Authentication:** All routes require login except public tracking
5. **Redirects:** Legacy paths automatically redirect to new structure

---

## 🚀 Quick Commands

### Check Route Exists

```bash
grep "path: '/customer/ride'" src/router/index.ts
```

### Find View File

```bash
find src/views -name "RideView.vue"
```

### Test Route

```bash
# In browser
http://localhost:5173/customer/ride
```

---

## 📞 Support

- **Router Config:** `src/router/index.ts`
- **View Files:** `src/views/`
- **Documentation:** `CUSTOMER_ROUTES_FINAL_REPORT.md`
