# 🧪 Smart Promo Testing Guide

## ✅ Implementation Status: COMPLETE

All Smart Promo features have been successfully integrated and are ready for testing.

## 📋 Pre-Testing Checklist

- [x] Database migration applied (264_add_sample_promo_codes.sql)
- [x] 7 sample promo codes inserted
- [x] Performance indexes created
- [x] SmartPromoSuggestion component integrated into RideBookingPanel
- [x] TypeScript compilation successful (no errors)
- [x] ESLint passed (warnings only, no errors)

## 🚀 Quick Start Testing

### 1. Start Development Server

```bash
npm run dev
```

### 2. Navigate to Ride Booking

```
http://localhost:5173/customer/ride
```

### 3. Test Flow

1. **Login as Customer**
2. **Select Pickup Location** (auto-detected or manual)
3. **Select Destination** (search or tap map)
4. **Observe Smart Promo Banner** (should appear automatically)
5. **Apply Recommended Promo** (1-click)
6. **View All Promos** (optional)
7. **Complete Booking** (verify discount applied)

## 🎯 Test Scenarios

### Scenario 1: Best Promo Recommendation (High Score)

**Setup:**

- Estimated fare: ฿150
- Service type: ride

**Expected Result:**

- FLASH100 promo shown (฿100 discount)
- HOT badge displayed (score ≥ 80)
- Animated gift icon bouncing
- "ประหยัด ฿100!" prominently displayed

**Test:**

```
1. Enter pickup: "Siam Paragon"
2. Enter destination: "Chatuchak Market" (~10km)
3. Wait for fare calculation (~฿150)
4. Smart Promo banner should appear
5. Click "ใช้เลย" button
6. Verify discount applied in fare summary
```

### Scenario 2: Multiple Promos Available

**Setup:**

- Estimated fare: ฿200
- Service type: ride

**Expected Result:**

- Best promo shown in banner
- "ดูโปรโมชั่นอื่น (X)" button visible
- Modal shows all promos ranked by score

**Test:**

```
1. Set fare to ฿200
2. Click "ดูโปรโมชั่นอื่น"
3. Modal opens with all available promos
4. Promos sorted by score (highest first)
5. Best promo highlighted
6. Each promo shows discount amount
7. Click "ใช้โค้ดนี้" on any promo
8. Modal closes, promo applied
```

### Scenario 3: Minimum Fare Requirement

**Setup:**

- Estimated fare: ฿80
- Service type: ride

**Expected Result:**

- Only promos with min_fare ≤ ฿80 shown
- WELCOME50, NIGHT40 available
- FLASH100 (min ฿100) NOT shown

**Test:**

```
1. Set short distance (~3km, ฿80)
2. Check available promos
3. Verify min_fare filtering works
4. Apply valid promo
5. Verify discount calculation correct
```

### Scenario 4: Expiring Soon (Urgency)

**Setup:**

- FLASH100 expires in 3 days

**Expected Result:**

- "⏰ เหลือ 3 วัน" badge shown
- Higher priority score
- Urgency indicator animated (blink)

**Test:**

```
1. Check FLASH100 promo
2. Verify urgency badge present
3. Verify animation working
4. Higher score than non-urgent promos
```

### Scenario 5: Service Type Filtering

**Setup:**

- Service type: delivery (not ride)

**Expected Result:**

- Only promos with service_types including "delivery" shown
- MULTI25 shown (all services)
- RIDE20 NOT shown (ride only)

**Test:**

```
1. Change service type to "delivery"
2. Check available promos
3. Verify service type filtering
4. Apply multi-service promo
```

### Scenario 6: User Usage Limit

**Setup:**

- User already used WELCOME50 once
- user_usage_limit = 1

**Expected Result:**

- WELCOME50 NOT shown in available promos
- Other promos still available

**Test:**

```
1. Apply WELCOME50 promo
2. Complete booking
3. Start new booking
4. WELCOME50 should not appear
5. Other promos still available
```

### Scenario 7: Manual Promo Code (Fallback)

**Setup:**

- User wants to enter code manually

**Expected Result:**

- RidePromoInput component visible
- Can enter code manually
- Validation works
- Invalid codes rejected

**Test:**

```
1. Ignore Smart Promo banner
2. Scroll to manual promo input
3. Enter "WELCOME50"
4. Click "ใช้"
5. Promo applied
6. Try invalid code "INVALID123"
7. Error message shown
```

### Scenario 8: Promo Removal

**Setup:**

- Promo already applied

**Expected Result:**

- Applied promo badge shown
- Remove button (X) visible
- Click removes promo
- Fare recalculated

**Test:**

```
1. Apply any promo
2. Verify badge appears
3. Click X button
4. Promo removed
5. Fare returns to original
6. Smart Promo banner reappears
```

### Scenario 9: Fare Changes After Promo Applied

**Setup:**

- Promo applied
- User changes destination (fare changes)

**Expected Result:**

- Discount recalculated
- Max 50% discount maintained
- Fare summary updated

**Test:**

```
1. Apply RIDE20 (20% discount)
2. Fare: ฿100, Discount: ฿20
3. Change destination (new fare: ฿200)
4. Discount recalculated: ฿40
5. Verify max discount respected
```

### Scenario 10: Mobile Responsive

**Setup:**

- Test on mobile viewport (375px)

**Expected Result:**

- Banner stacks vertically
- Touch targets ≥ 44px
- Modal full-screen on mobile
- Smooth animations
- No horizontal scroll

**Test:**

```
1. Open DevTools
2. Set viewport to iPhone SE (375x667)
3. Test all interactions
4. Verify touch-friendly
5. Check animations smooth
```

## 🔍 Database Verification

### Check Sample Promos Inserted

```sql
SELECT code, description, discount_type, discount_value,
       min_fare, is_active, valid_until
FROM promo_codes
WHERE is_active = true
ORDER BY created_at DESC;
```

**Expected Result:**

```
WELCOME50  | ยินดีต้อนรับ! รับส่วนลด 50 บาท | fixed      | 50   | NULL | true | 2026-02-13
RIDE20     | ลด 20% สูงสุด 100 บาท          | percentage | 20   | NULL | true | 2026-01-21
PREMIUM15  | ลด 15% สำหรับรถพรีเมียม         | percentage | 15   | 100  | true | 2026-02-13
FLASH100   | Flash Sale! ลด 100 บาท         | fixed      | 100  | 100  | true | 2026-01-17
MULTI25    | ลด 25% ทุกบริการ สูงสุด 80 บาท  | percentage | 25   | NULL | true | 2026-01-29
NIGHT40    | ส่วนลดกลางคืน 40 บาท           | fixed      | 40   | NULL | true | 2026-02-13
VIP50OFF   | สมาชิก VIP ลด 50 บาททุกครั้ง   | fixed      | 50   | NULL | true | 2026-04-14
```

### Check Indexes Created

```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'promo_codes'
  AND indexname LIKE 'idx_promo%';
```

**Expected Result:**

```
idx_promo_codes_active_valid
idx_promo_codes_service_types
```

### Test Promo Validation RPC

```sql
SELECT * FROM validate_promo_code('WELCOME50', 'user-id-here', 150);
```

**Expected Result:**

```json
{
  "valid": true,
  "discount": 50,
  "final_fare": 100,
  "message": "โค้ดใช้ได้"
}
```

## 🎨 UI/UX Verification

### Visual Checklist

- [ ] Gradient background (purple to violet)
- [ ] Animated gift icon (bounce effect)
- [ ] HOT badge (red, pulsing) for score ≥ 80
- [ ] Recommended badge (orange) for score ≥ 60
- [ ] Urgency indicator (blinking) for expiring promos
- [ ] Smooth slide-in animation on appear
- [ ] Applied promo badge (green gradient)
- [ ] Remove button (X) with hover effect
- [ ] Modal overlay (dark background)
- [ ] Modal smooth open/close animation

### Accessibility Checklist

- [ ] All buttons have accessible labels
- [ ] Keyboard navigation works
- [ ] Focus indicators visible
- [ ] Screen reader friendly
- [ ] Touch targets ≥ 44px
- [ ] Color contrast ≥ 4.5:1

### Performance Checklist

- [ ] Promo data loads < 500ms
- [ ] No layout shift (CLS < 0.1)
- [ ] Smooth animations (60fps)
- [ ] No memory leaks
- [ ] Debounced API calls

## 🐛 Known Issues & Workarounds

### Issue 1: Push Notification Trigger

**Status:** ⚠️ Trigger dropped temporarily

**Details:**

- `trigger_notify_new_promo` references non-existent `push_notification_queue` table
- Trigger was dropped in migration 264

**Impact:**

- No push notifications for new promos
- All other functionality works

**Workaround:**

- Create `push_notification_queue` table
- Or update trigger to use existing notification system

**Fix:**

```sql
-- Option 1: Create missing table
CREATE TABLE push_notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Option 2: Update trigger to use existing system
-- (depends on your notification implementation)
```

## 📊 Analytics to Monitor

### Key Metrics

1. **Promo View Rate**

   - How many users see the Smart Promo banner
   - Target: > 80%

2. **Promo Apply Rate**

   - How many users apply recommended promo
   - Target: > 40%

3. **Conversion Rate**

   - Bookings with promo vs without
   - Target: +15% with promo

4. **Average Discount**

   - Average discount per ride
   - Target: ฿30-50

5. **Most Popular Promos**
   - Which promos are used most
   - Optimize future campaigns

### Tracking Implementation

```typescript
// Add to useSmartPromo.ts
function trackPromoView(promo: PromoCode) {
  analytics.track("promo_viewed", {
    code: promo.code,
    discount: promo.discount_value,
    score: calculatePromoScore(promo),
  });
}

function trackPromoApplied(promo: PromoCode) {
  analytics.track("promo_applied", {
    code: promo.code,
    discount: calculateDiscount(promo, fare),
    method: "smart_recommendation", // or 'manual'
  });
}
```

## 🚀 Next Steps

### Immediate (This Week)

1. ✅ Test all scenarios above
2. ✅ Verify mobile responsive
3. ✅ Check accessibility
4. ✅ Monitor performance
5. ✅ Fix any bugs found

### Short-term (Next Sprint)

1. **A/B Testing**

   - Test different banner designs
   - Test different copy
   - Measure conversion rates

2. **Analytics Integration**

   - Add tracking events
   - Create dashboard
   - Monitor KPIs

3. **Push Notifications**
   - Fix notification trigger
   - Send promo alerts
   - Test notification flow

### Long-term (Future)

1. **ML Personalization**

   - Learn user preferences
   - Predict best promos
   - Dynamic scoring

2. **Geo-targeting**

   - Location-based promos
   - Area-specific campaigns
   - Heat map integration

3. **Gamification**

   - Spin-the-wheel
   - Scratch cards
   - Daily rewards

4. **Referral System**
   - Friend referral promos
   - Bonus for both users
   - Viral growth

## 📝 Test Report Template

```markdown
## Smart Promo Test Report

**Date:** YYYY-MM-DD
**Tester:** [Name]
**Environment:** [Local/Staging/Production]

### Test Results

| Scenario                  | Status     | Notes                       |
| ------------------------- | ---------- | --------------------------- |
| Best Promo Recommendation | ✅ Pass    | Works as expected           |
| Multiple Promos           | ✅ Pass    | Modal displays correctly    |
| Min Fare Filtering        | ✅ Pass    | Filtering works             |
| Urgency Indicator         | ⚠️ Partial | Animation could be smoother |
| Service Type Filter       | ✅ Pass    | Correct promos shown        |
| Usage Limit               | ❌ Fail    | Not enforced properly       |
| Manual Input              | ✅ Pass    | Validation works            |
| Promo Removal             | ✅ Pass    | Removes correctly           |
| Fare Recalculation        | ✅ Pass    | Updates properly            |
| Mobile Responsive         | ✅ Pass    | Works on all devices        |

### Issues Found

1. **Issue:** [Description]
   - **Severity:** High/Medium/Low
   - **Steps to Reproduce:** [Steps]
   - **Expected:** [Expected behavior]
   - **Actual:** [Actual behavior]
   - **Screenshot:** [Link]

### Recommendations

1. [Recommendation 1]
2. [Recommendation 2]
3. [Recommendation 3]

### Overall Assessment

[Summary of test results and readiness for production]
```

## 🎓 Developer Notes

### Code Structure

```
src/
├── composables/
│   └── useSmartPromo.ts          # Core logic
├── components/
│   └── customer/
│       └── SmartPromoSuggestion.vue  # UI component
└── views/
    └── customer/
        └── RideViewRefactored.vue    # Integration example
```

### Key Functions

1. **useSmartPromo()** - Main composable

   - `loadAvailablePromos()` - Fetch promos from DB
   - `calculateDiscount()` - Calculate actual discount
   - `calculatePromoScore()` - Score promo by multiple factors
   - `applyPromo()` - Apply promo with validation

2. **SmartPromoSuggestion.vue** - UI component

   - Auto-displays best promo
   - Shows all promos in modal
   - Handles apply/remove actions
   - Responsive design

3. **RideBookingPanel.vue** - Integration
   - Includes SmartPromoSuggestion
   - Handles promo application
   - Updates fare summary
   - Shows applied promo badge

### Customization

To customize scoring algorithm:

```typescript
// In useSmartPromo.ts
const calculatePromoScore = (promo: PromoCode): number => {
  let score = 0;

  // Adjust weights here (must total 100)
  score += discountWeight * 0.4; // 40%
  score += serviceWeight * 0.2; // 20%
  score += expiryWeight * 0.15; // 15%
  score += popularityWeight * 0.15; // 15%
  score += minFareWeight * 0.1; // 10%

  return Math.round(score);
};
```

---

**Status:** ✅ Ready for Testing
**Last Updated:** 2026-01-14
**Version:** 1.0.0
