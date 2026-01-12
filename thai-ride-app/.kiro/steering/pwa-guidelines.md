---
inclusion: fileMatch
fileMatchPattern: "**/*{sw,pwa,manifest,offline}*"
---

# PWA Guidelines

## Vite PWA Configuration

```typescript
// vite.config.ts
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "pwa-*.png"],
      manifest: {
        name: "Thai Ride App",
        short_name: "ThaiRide",
        description: "แอปเรียกรถในประเทศไทย",
        theme_color: "#00a86b",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        icons: [
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          {
            src: "pwa-maskable-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-api",
              expiration: { maxEntries: 50, maxAgeSeconds: 300 },
            },
          },
          {
            urlPattern: /^https:\/\/.*\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-maps",
              expiration: { maxEntries: 100, maxAgeSeconds: 86400 },
            },
          },
        ],
      },
    }),
  ],
});
```

## Offline Status

```typescript
// composables/useOfflineStatus.ts
export function useOfflineStatus() {
  const isOnline = ref(navigator.onLine);
  const pendingActions = ref<QueuedAction[]>([]);

  onMounted(() => {
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
  });

  onUnmounted(() => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
  });

  function handleOnline(): void {
    isOnline.value = true;
    syncPendingActions();
  }

  function handleOffline(): void {
    isOnline.value = false;
  }

  async function syncPendingActions(): Promise<void> {
    for (const action of pendingActions.value) {
      await executeAction(action);
    }
    pendingActions.value = [];
  }

  return { isOnline, pendingActions };
}
```

## Push Notifications

```typescript
// services/pushNotification.ts
export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return null;
  }

  const registration = await navigator.serviceWorker.ready;

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: import.meta.env.VITE_VAPID_PUBLIC_KEY,
  });

  // Save to database
  await supabase.from("push_subscriptions").upsert({
    user_id: currentUser.id,
    subscription: JSON.stringify(subscription),
  });

  return subscription;
}
```

## Install Prompt

```typescript
// composables/useInstallPrompt.ts
export function useInstallPrompt() {
  const deferredPrompt = ref<BeforeInstallPromptEvent | null>(null);
  const canInstall = computed(() => deferredPrompt.value !== null);

  onMounted(() => {
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferredPrompt.value = e as BeforeInstallPromptEvent;
    });
  });

  async function install(): Promise<boolean> {
    if (!deferredPrompt.value) return false;

    deferredPrompt.value.prompt();
    const { outcome } = await deferredPrompt.value.userChoice;
    deferredPrompt.value = null;

    return outcome === "accepted";
  }

  return { canInstall, install };
}
```

## Offline UI Indicator

```vue
<template>
  <Transition name="slide">
    <div
      v-if="!isOnline"
      class="fixed top-0 inset-x-0 bg-amber-500 text-white text-center py-2 z-50"
    >
      ⚠️ ออฟไลน์ - บางฟีเจอร์อาจไม่พร้อมใช้งาน
    </div>
  </Transition>
</template>
```
