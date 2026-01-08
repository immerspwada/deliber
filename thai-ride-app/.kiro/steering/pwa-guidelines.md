---
inclusion: fileMatch
fileMatchPattern: "**/sw*.{js,ts},**/manifest.json,**/vite.config*.ts"
---

# PWA Guidelines

## Service Worker Configuration

```typescript
// vite.config.ts - PWA Plugin
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
        theme_color: "#3B82F6",
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
        ],
      },
    }),
  ],
});
```

## Offline Support

```typescript
// composables/useOfflineStatus.ts
export function useOfflineStatus() {
  const isOnline = ref(navigator.onLine);
  const pendingActions = ref<OfflineAction[]>([]);

  onMounted(() => {
    window.addEventListener("online", () => {
      isOnline.value = true;
      syncPendingActions();
    });
    window.addEventListener("offline", () => {
      isOnline.value = false;
    });
  });

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
  if (!("serviceWorker" in navigator)) return null;

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: import.meta.env.VITE_VAPID_PUBLIC_KEY,
  });

  // Save subscription to Supabase
  await supabase.from("push_subscriptions").upsert({
    user_id: currentUser.id,
    subscription: JSON.stringify(subscription),
  });

  return subscription;
}
```

## App Install Prompt

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

  async function install(): Promise<void> {
    if (!deferredPrompt.value) return;
    deferredPrompt.value.prompt();
    const { outcome } = await deferredPrompt.value.userChoice;
    if (outcome === "accepted") {
      deferredPrompt.value = null;
    }
  }

  return { canInstall, install };
}
```
