# 🚀 Advanced Features - Quick Start

## ⚡ 3 New Features (1 hour setup)

### 1️⃣ Push Notifications (20 min)

**Generate VAPID Keys**:

```bash
npx web-push generate-vapid-keys
```

**Add to .env**:

```bash
VITE_VAPID_PUBLIC_KEY=your_public_key_here
```

**Apply Migration**:

```bash
npx supabase db push --local
```

**Test**:

1. Go to http://localhost:5173/provider
2. Allow notifications when prompted
3. Create ride as customer
4. See notification appear

---

### 2️⃣ Navigation Integration (15 min)

**Add to JobCard**:

```vue
<script setup>
import { useNavigation } from "@/composables/useNavigation";

const { navigate } = useNavigation();
</script>

<template>
  <button
    @click="
      navigate({
        lat: job.pickup_location.lat,
        lng: job.pickup_location.lng,
        label: job.pickup_address,
      })
    "
  >
    📍 นำทาง
  </button>
</template>
```

**Test**:

1. Accept a job
2. Click "นำทาง" button
3. Google Maps/Waze opens with destination

---

### 3️⃣ Earnings Dashboard (25 min)

**Add Route**:

```typescript
// src/router/index.ts
{
  path: '/provider/earnings',
  component: () => import('@/views/provider/ProviderEarningsView.vue')
}
```

**Create View**:

```vue
<!-- src/views/provider/ProviderEarningsView.vue -->
<template>
  <EarningsDashboard />
</template>

<script setup>
import EarningsDashboard from "@/components/provider/EarningsDashboard.vue";
</script>
```

**Test**:

1. Go to http://localhost:5173/provider/earnings
2. See earnings summary
3. Switch between views (Overview/Breakdown/Trends)

---

## ✅ Verification

**Push Notifications**:

- [ ] Permission granted
- [ ] Subscription saved to database
- [ ] Notification appears on new job
- [ ] Works when app is closed

**Navigation**:

- [ ] Button appears on job card
- [ ] Opens Google Maps/Waze
- [ ] Correct destination
- [ ] Works on mobile

**Earnings Dashboard**:

- [ ] Shows correct earnings
- [ ] Period selector works
- [ ] Charts display properly
- [ ] Service breakdown accurate

---

## 🐛 Quick Fixes

**Notifications not working**:

```bash
# Check VAPID key is set
echo $VITE_VAPID_PUBLIC_KEY

# Check Service Worker is registered
# Open DevTools → Application → Service Workers
```

**Navigation not opening**:

- Check coordinates are valid
- Try different app (Google Maps/Waze)
- Check browser allows popups

**Dashboard not loading**:

- Check provider has earnings data
- Check `useProviderEarnings` composable
- Check database connection

---

## 📊 What's New

### Composables

- `usePushNotification.ts` (enhanced)
- `useNavigation.ts` (new)

### Components

- `EarningsDashboard.vue` (new)

### Database

- `push_subscriptions` table (new)

---

## 🎯 Next Features

1. **Offline Job Queue** - Save jobs when offline
2. **Voice Navigation** - Turn-by-turn voice guidance
3. **Earnings Export** - PDF/Excel reports

---

**Need Help?** Check `PROVIDER_ADVANCED_FEATURES.md` for detailed guide.
