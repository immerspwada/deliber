# PWA & Push Notification Testing Guide

## 🎯 Overview

คู่มือนี้อธิบายวิธีทดสอบ PWA และ Push Notification บนอุปกรณ์จริง

---

## 📋 Pre-requisites

### 1. Generate VAPID Keys

```bash
cd thai-ride-app
node scripts/generate-vapid-keys.js
```

Output จะแสดง keys ที่ต้องใช้:
- `VITE_VAPID_PUBLIC_KEY` - สำหรับ frontend (.env)
- `VAPID_PUBLIC_KEY` - สำหรับ Supabase secrets
- `VAPID_PRIVATE_KEY` - สำหรับ Supabase secrets
- `VAPID_SUBJECT` - mailto:admin@gobear.app

### 2. Configure Environment

**Frontend (.env):**
```env
VITE_VAPID_PUBLIC_KEY=<your_public_key>
```

**Supabase Dashboard > Settings > Edge Functions > Secrets:**
```
VAPID_PUBLIC_KEY = <your_public_key>
VAPID_PRIVATE_KEY = <your_private_key>
VAPID_SUBJECT = mailto:admin@gobear.app
```

### 3. Deploy Edge Function

```bash
cd thai-ride-app
supabase functions deploy send-push
```

---

## 🧪 Testing on Emulator

### Android Emulator (Android Studio)

1. **Start Emulator:**
   ```bash
   # List available emulators
   emulator -list-avds
   
   # Start emulator
   emulator -avd <emulator_name>
   ```

2. **Run Dev Server:**
   ```bash
   cd thai-ride-app
   npm run dev -- --host
   ```

3. **Access from Emulator:**
   - Open Chrome in emulator
   - Navigate to `http://10.0.2.2:5173` (Android emulator localhost)

4. **Install PWA:**
   - Click "Add to Home Screen" prompt
   - Or: Chrome menu > "Install app"

5. **Test Push:**
   - Go to Settings > Notifications
   - Enable push notifications
   - Click "Test Notification"

### iOS Simulator (Xcode)

1. **Start Simulator:**
   ```bash
   open -a Simulator
   ```

2. **Access from Simulator:**
   - Open Safari
   - Navigate to `http://localhost:5173`

3. **Note:** iOS Safari has limited PWA support
   - Push notifications require iOS 16.4+
   - Must be added to Home Screen first

---

## 📱 Testing on Real Devices

### Android Device

1. **Enable USB Debugging:**
   - Settings > Developer Options > USB Debugging

2. **Connect Device:**
   ```bash
   adb devices
   ```

3. **Port Forward:**
   ```bash
   adb reverse tcp:5173 tcp:5173
   ```

4. **Access App:**
   - Open Chrome
   - Navigate to `http://localhost:5173`

5. **Install PWA:**
   - Chrome will show install banner
   - Or: Menu > "Add to Home Screen"

### iOS Device

1. **Connect to Same Network:**
   - Device and computer on same WiFi

2. **Find Computer IP:**
   ```bash
   ifconfig | grep "inet " | grep -v 127.0.0.1
   ```

3. **Access App:**
   - Open Safari
   - Navigate to `http://<computer_ip>:5173`

4. **Add to Home Screen:**
   - Share button > "Add to Home Screen"

---

## ✅ Testing Checklist

### PWA Installation
- [ ] Install prompt appears on Android Chrome
- [ ] App installs to home screen
- [ ] App opens in standalone mode (no browser UI)
- [ ] App icon displays correctly
- [ ] Splash screen shows on launch
- [ ] App shortcuts work (long press icon)

### Offline Support
- [ ] App loads when offline
- [ ] Cached pages display correctly
- [ ] Map tiles cached and display offline
- [ ] Offline indicator shows
- [ ] Actions queue when offline
- [ ] Actions sync when back online

### Push Notifications
- [ ] Permission prompt appears
- [ ] Permission can be granted
- [ ] Test notification sends successfully
- [ ] Notification displays on device
- [ ] Notification click opens app
- [ ] Notification click navigates to correct page
- [ ] Badge updates on new notifications

### Service Worker
- [ ] SW registers successfully
- [ ] SW updates when new version available
- [ ] Update prompt shows to user
- [ ] Update applies correctly

---

## 🔧 Debugging

### Chrome DevTools (Android)

1. Connect device via USB
2. Open `chrome://inspect` in desktop Chrome
3. Click "inspect" on your app
4. Use Application tab to check:
   - Service Worker status
   - Cache storage
   - Push subscription

### Safari Web Inspector (iOS)

1. Enable Web Inspector on device:
   - Settings > Safari > Advanced > Web Inspector
2. Connect device via USB
3. Open Safari on Mac
4. Develop menu > [Device Name] > [Page]

### Common Issues

**Push not working:**
```javascript
// Check in browser console
navigator.serviceWorker.ready.then(reg => {
  reg.pushManager.getSubscription().then(sub => {
    console.log('Subscription:', sub)
  })
})
```

**SW not updating:**
```javascript
// Force update
navigator.serviceWorker.ready.then(reg => {
  reg.update()
})
```

**Clear all caches:**
```javascript
caches.keys().then(names => {
  names.forEach(name => caches.delete(name))
})
```

---

## 📊 Testing Matrix

| Feature | Android Chrome | iOS Safari | Desktop Chrome |
|---------|---------------|------------|----------------|
| PWA Install | ✅ | ✅ (16.4+) | ✅ |
| Offline Mode | ✅ | ✅ | ✅ |
| Push Notifications | ✅ | ✅ (16.4+) | ✅ |
| Background Sync | ✅ | ❌ | ✅ |
| Periodic Sync | ✅ | ❌ | ✅ |
| Badge API | ✅ | ❌ | ✅ |
| Share Target | ✅ | ❌ | ✅ |

---

## 🚀 Production Deployment

### Build for Production

```bash
cd thai-ride-app
npm run build
```

### Verify Build

```bash
# Serve production build locally
npm run preview
```

### Deploy to Vercel

```bash
vercel --prod
```

### Post-Deploy Checks

1. **Lighthouse Audit:**
   - Open Chrome DevTools
   - Lighthouse tab
   - Run PWA audit
   - Target score: 90+

2. **Push Test:**
   - Subscribe to push on production
   - Send test notification from Admin
   - Verify delivery

3. **Offline Test:**
   - Load app
   - Go offline (airplane mode)
   - Verify app still works

---

## 📞 Support

หากพบปัญหา:
1. ตรวจสอบ Console logs
2. ตรวจสอบ Network tab
3. ตรวจสอบ Application > Service Workers
4. ตรวจสอบ Supabase Edge Function logs
