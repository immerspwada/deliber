# 🚀 Quick Test: Customer Ride Page

**Status:** ✅ READY  
**URL:** http://localhost:5173/customer/ride  
**Test File:** `test-customer-ride-page.html`

## ⚡ Quick Start

### Option 1: Direct Browser Test

```bash
# Dev server is already running
# Just open in browser:
open http://localhost:5173/customer/ride
```

### Option 2: Test Page

```bash
# Open the test page
open test-customer-ride-page.html
```

## 📋 Test Checklist

### 1. Basic Flow (2 minutes)

- [ ] Page loads without errors
- [ ] Current location detected automatically
- [ ] Map displays correctly
- [ ] Search box is functional
- [ ] Can type and see autocomplete

### 2. Location Selection (3 minutes)

- [ ] Search for "สยาม" - see results
- [ ] Select a destination from results
- [ ] Map shows route from pickup to destination
- [ ] Fare estimation appears
- [ ] Distance and time displayed

### 3. Vehicle Selection (1 minute)

- [ ] See vehicle options (bike, car, premium)
- [ ] Can select different vehicles
- [ ] Fare updates based on vehicle type
- [ ] ETA shows for each vehicle

### 4. Booking Panel (2 minutes)

- [ ] "จองเลย" button is enabled
- [ ] Can add notes
- [ ] Payment method selection works
- [ ] Balance check works
- [ ] Promo code input available

### 5. Advanced Features (3 minutes)

- [ ] Pull-to-refresh works (pull down on map)
- [ ] Saved places section visible
- [ ] Recent places section visible
- [ ] Nearby places loading
- [ ] Can click on nearby places

### 6. Mobile UX (2 minutes)

- [ ] Touch targets are large enough (44px+)
- [ ] Haptic feedback on interactions
- [ ] Smooth scrolling
- [ ] No layout shifts
- [ ] Safe area insets respected

## 🎯 Expected Behavior

### On Page Load

```
1. Show header with "กำลังหาตำแหน่ง..."
2. Request geolocation permission
3. Update to actual address
4. Load nearby places in background
5. Show map with current location
```

### On Destination Search

```
1. Type in search box
2. See autocomplete results after 2 characters
3. Results include:
   - Saved places (if any)
   - Recent places (if any)
   - External search results
4. Click result → map updates with route
```

### On Booking

```
1. Click "จองเลย"
2. Check balance (if wallet payment)
3. Create ride request
4. Show searching animation
5. (Mock) Match with driver
6. Show tracking view
```

## 🐛 Common Issues & Solutions

### Issue: Location not detected

**Solution:**

- Check browser permissions
- Use HTTPS in production
- Fallback to Bangkok coordinates

### Issue: Search not working

**Solution:**

- Check internet connection
- Nominatim API might be slow
- Fallback to saved/recent places

### Issue: Map not loading

**Solution:**

- Check Leaflet CDN
- Check internet connection
- Map tiles might be slow

### Issue: Booking fails

**Solution:**

- Check Supabase connection
- Check user authentication
- Check RLS policies

## 📊 Performance Metrics

### Target Metrics

- **LCP:** < 2.5s (Largest Contentful Paint)
- **FID:** < 100ms (First Input Delay)
- **CLS:** < 0.1 (Cumulative Layout Shift)
- **TTI:** < 3.5s (Time to Interactive)

### Check Performance

```javascript
// Open DevTools Console
// Run this:
performance.getEntriesByType("navigation")[0].loadEventEnd;
// Should be < 3500ms
```

## 🔍 Debug Mode

### Enable Debug Logs

```javascript
// In browser console:
localStorage.setItem("DEBUG", "ride:*");
// Reload page
```

### Check State

```javascript
// In Vue DevTools:
// 1. Select RideViewRefactored component
// 2. Check state:
//    - currentStep
//    - pickup
//    - destination
//    - selectedVehicle
//    - estimatedFare
```

## ✅ Success Criteria

### Must Have

- ✅ Page loads without errors
- ✅ Location detection works
- ✅ Search works
- ✅ Map displays correctly
- ✅ Booking flow works

### Nice to Have

- ✅ Pull-to-refresh works
- ✅ Haptic feedback works
- ✅ Animations smooth
- ✅ Loading states clear
- ✅ Error handling graceful

## 🎨 Visual Checklist

### Colors

- ✅ Primary: #00a86b (green)
- ✅ Background: #f5f5f5 (light gray)
- ✅ Text: #1a1a1a (dark)
- ✅ Border: #e8e8e8 (light gray)

### Typography

- ✅ Font: Sarabun
- ✅ Sizes: 13px-16px
- ✅ Weights: 400, 500, 600
- ✅ Line height: 1.5

### Spacing

- ✅ Padding: 12px-16px
- ✅ Gap: 10px-14px
- ✅ Border radius: 12px-16px
- ✅ Safe areas respected

## 📱 Device Testing

### Desktop (Chrome)

```bash
# Open DevTools
# Toggle device toolbar (Cmd+Shift+M)
# Test on:
- iPhone 14 Pro (393x852)
- iPhone SE (375x667)
- iPad Air (820x1180)
```

### Mobile (Real Device)

```bash
# Get local IP
ifconfig | grep "inet " | grep -v 127.0.0.1

# Access from phone:
http://192.168.x.x:5173/customer/ride
```

## 🚨 Emergency Fixes

### If page crashes:

```bash
# 1. Check console for errors
# 2. Clear browser cache
# 3. Restart dev server
npm run dev

# 4. Check TypeScript
npm run type-check

# 5. Check for missing dependencies
npm install
```

### If booking fails:

```bash
# 1. Check Supabase connection
# 2. Check user is logged in
# 3. Check RLS policies
# 4. Check ride_requests table exists
```

## 📝 Test Report Template

```markdown
## Test Report: Customer Ride Page

**Date:** 2026-01-14
**Tester:** [Your Name]
**Browser:** Chrome 120
**Device:** MacBook Pro

### Results

- [ ] All tests passed
- [ ] Some issues found (see below)
- [ ] Major issues found

### Issues Found

1. [Issue description]
   - Severity: High/Medium/Low
   - Steps to reproduce
   - Expected vs Actual

### Performance

- LCP: [X]ms
- FID: [X]ms
- CLS: [X]

### Notes

[Any additional observations]
```

## 🎉 Next Steps

After successful testing:

1. ✅ Mark as production-ready
2. ✅ Deploy to staging
3. ✅ User acceptance testing
4. ✅ Deploy to production
5. ✅ Monitor analytics

## 📞 Support

If you encounter issues:

1. Check console for errors
2. Check network tab
3. Check Vue DevTools
4. Review CUSTOMER_RIDE_WORKING_STATUS.md
5. Ask for help with specific error messages

---

**Ready to test?** Open http://localhost:5173/customer/ride 🚀
