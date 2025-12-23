# 🚀 Cleanup Quick Reference

**Quick guide for developers working on the cleanup**

---

## 📋 Current Status

✅ **Phase 1 Complete**: Migrations fixed, analysis done  
🟡 **Phase 2 Ready**: Version consolidation ready to start  
⚪ **Phase 3-7**: Planned

---

## 🔧 Available Scripts

### 1. Fix Duplicate Migrations (✅ Done)
```bash
cd thai-ride-app
./scripts/fix-duplicate-migrations.sh
```

### 2. Analyze Version Duplicates
```bash
cd thai-ride-app
./scripts/consolidate-versions.sh --dry-run  # Analysis only
./scripts/consolidate-versions.sh            # Full report
```

### 3. Generate Types (Ready to run)
```bash
cd thai-ride-app
./scripts/generate-types.sh
```

---

## 📁 Key Documents

| Document | Purpose | When to Use |
|----------|---------|-------------|
| [PROJECT_CLEANUP_REPORT.md](PROJECT_CLEANUP_REPORT.md) | Overview & status | Start here |
| [CONSOLIDATION_PLAN.md](CONSOLIDATION_PLAN.md) | Detailed roadmap | Planning work |
| [CLEANUP_PROGRESS_SUMMARY.md](CLEANUP_PROGRESS_SUMMARY.md) | Progress tracking | Check status |
| [CODE_QUALITY_GUIDE.md](CODE_QUALITY_GUIDE.md) | Best practices | Writing code |
| [CLEANUP_QUICK_REFERENCE.md](CLEANUP_QUICK_REFERENCE.md) | Quick guide | This file! |

---

## 🎯 Quick Wins (Do These First)

### 1. Remove Duplicate Versions (~2 hours)
**Impact**: -18 files, -18,000 lines

```bash
# Step 1: Update router imports
# Edit src/router/index.ts:
# - RideViewV2 → RideView
# - WalletViewV3 → WalletView
# - ProviderDashboardV4 → ProviderDashboardView
# - RideBookingViewV3 → RideBookingView

# Step 2: Rename latest versions
mv src/views/WalletViewV3.vue src/views/WalletView.vue
mv src/views/provider/ProviderDashboardV4.vue src/views/provider/ProviderDashboardView.vue
mv src/views/RideBookingViewV3.vue src/views/RideBookingView.vue
mv src/composables/useRideBookingV3.ts src/composables/useRideBooking.ts
mv src/composables/useProviderDashboardV3.ts src/composables/useProviderDashboard.ts

# Step 3: Update imports in components
# Search and replace in all files:
# - useRideBookingV3 → useRideBooking
# - useProviderDashboardV3 → useProviderDashboard

# Step 4: Test
npm run dev
# Test: ride booking, provider dashboard, wallet

# Step 5: Remove old files (see list below)
```

### 2. Generate Types (~30 minutes)
**Impact**: Better type safety, fewer bugs

```bash
cd thai-ride-app
./scripts/generate-types.sh
```

---

## 📦 Files to Remove (After Testing)

### V2 Composables
- [ ] `src/composables/useRideBookingV2.ts` (1,370 lines)
- [ ] `src/composables/useServiceAreaV2.ts` (595 lines)

### V2 Views
- [ ] `src/views/RideViewV2.vue` (2,201 lines)
- [ ] `src/views/WalletViewV2.vue` (721 lines)
- [ ] `src/views/DeliveryViewV2.vue` (1,989 lines)

### Old Provider Dashboards
- [ ] `src/views/provider/ProviderDashboardView.vue` (1,292 lines)
- [ ] `src/views/provider/ProviderDashboardViewV2.vue` (1,267 lines)
- [ ] `src/composables/useProviderDashboard.ts` (1,620 lines)

### V3 Admin Views
- [ ] `src/views/AdminProviderCancellationsViewV3.vue` (623 lines)
- [ ] `src/views/AdminRideDetailViewV3.vue` (632 lines)
- [ ] `src/views/AdminRideMonitoringViewV3.vue` (587 lines)

### V3 Provider Views
- [ ] `src/views/provider/ProviderActiveRideV3.vue` (757 lines)
- [ ] `src/views/provider/ProviderAvailableRidesV3.vue` (500 lines)

### Other V2/V3 Views
- [ ] `src/views/ProviderOnboardingViewV2.vue` (473 lines)
- [ ] `src/views/QueueBookingViewV2.vue` (1,669 lines)
- [ ] `src/views/RideBookingViewV3.vue` (435 lines)
- [ ] `src/views/RideTrackingViewV3.vue` (588 lines)
- [ ] `src/views/AdminSettingsViewV2.vue` (811 lines)

**Total**: 18 files, ~18,000 lines

---

## 🔍 Large Files to Split

### Priority 1: Critical (>3000 lines)
```
useAdvancedSystem.ts  (3,942 lines) → 9 modules
useAdmin.ts           (3,373 lines) → 9 modules  
usePerformance.ts     (3,225 lines) → 11 modules
```

### Priority 2: High (>1500 lines)
```
useProvider.ts              (1,722 lines) → 6 modules
useCustomerManagement.ts    (1,635 lines) → 4 modules
useProviderDashboard.ts     (1,620 lines) → 5 modules
useRoleAwareNotifications.ts (1,412 lines) → Keep (complex)
```

---

## ✅ Testing Checklist

Before removing any file, test these flows:

### Customer Flows
- [ ] Register/Login
- [ ] Book a ride
- [ ] Track ride status
- [ ] Complete ride & rate
- [ ] Check wallet balance
- [ ] Use promo code

### Provider Flows
- [ ] Login as provider
- [ ] Toggle online/offline
- [ ] See available jobs
- [ ] Accept a job
- [ ] Update job status
- [ ] Complete job
- [ ] Check earnings

### Admin Flows
- [ ] Login as admin
- [ ] View all orders
- [ ] View all providers
- [ ] View all customers
- [ ] Approve provider
- [ ] Manage promos
- [ ] View analytics

---

## 🚨 Common Issues & Solutions

### Issue: Import errors after renaming
**Solution**: Search and replace all imports
```bash
# Find all files importing the old name
grep -r "useRideBookingV3" src/

# Replace in all files
find src/ -type f -name "*.vue" -o -name "*.ts" | xargs sed -i '' 's/useRideBookingV3/useRideBooking/g'
```

### Issue: Router not finding component
**Solution**: Check router imports match file names
```typescript
// Make sure these match:
component: () => import('../views/RideView.vue')  // File must exist
```

### Issue: Type errors after removing files
**Solution**: Update imports and regenerate types
```bash
./scripts/generate-types.sh
npm run type-check
```

---

## 📊 Progress Tracking

### Week 1: Version Consolidation
- [ ] Day 1-2: RideBooking consolidation
- [ ] Day 3-4: ProviderDashboard consolidation
- [ ] Day 5: Wallet & ServiceArea consolidation
- [ ] Day 6-7: Testing & cleanup

### Week 2: Large File Splitting (Part 1)
- [ ] Day 1-3: Split useAdvancedSystem.ts
- [ ] Day 4-5: Split useAdmin.ts
- [ ] Day 6-7: Testing

### Week 3: Large File Splitting (Part 2)
- [ ] Day 1-3: Split usePerformance.ts
- [ ] Day 4-5: Split useProvider.ts
- [ ] Day 6-7: Testing

### Week 4: Type Safety
- [ ] Day 1: Generate types
- [ ] Day 2-4: Remove `as any`
- [ ] Day 5-6: Add missing types
- [ ] Day 7: Testing

### Week 5: Testing
- [ ] Day 1-2: Unit tests
- [ ] Day 3-4: Integration tests
- [ ] Day 5-6: E2E tests
- [ ] Day 7: Final validation

---

## 💡 Pro Tips

1. **Always backup before major changes**
   ```bash
   git checkout -b cleanup/version-consolidation
   ```

2. **Test incrementally**
   - Don't remove all files at once
   - Test after each change
   - Commit working states

3. **Use search & replace carefully**
   ```bash
   # Dry run first
   grep -r "oldName" src/
   
   # Then replace
   find src/ -type f | xargs sed -i '' 's/oldName/newName/g'
   ```

4. **Keep documentation updated**
   - Update this file as you progress
   - Note any issues encountered
   - Share learnings with team

5. **Ask for help**
   - If stuck, check documentation
   - Review consolidation plan
   - Ask team members

---

## 🎯 Success Criteria

### Code Quality
- ✅ No backup files
- ✅ No duplicate migrations
- ⚪ No duplicate versions (18 pending)
- ⚪ No files >1000 lines (4 pending)
- ⚪ Type coverage >95%
- ⚪ Test coverage >70%

### Performance
- ⚪ Bundle <500KB
- ⚪ Lighthouse >90
- ⚪ FCP <1.5s
- ⚪ LCP <2.5s

---

## 📞 Need Help?

1. **Check docs first**: [PROJECT_CLEANUP_REPORT.md](PROJECT_CLEANUP_REPORT.md)
2. **Review plan**: [CONSOLIDATION_PLAN.md](CONSOLIDATION_PLAN.md)
3. **Check progress**: [CLEANUP_PROGRESS_SUMMARY.md](CLEANUP_PROGRESS_SUMMARY.md)
4. **Ask team**: Share issues in team chat

---

**Last Updated**: December 23, 2025  
**Quick Reference Version**: 1.0
