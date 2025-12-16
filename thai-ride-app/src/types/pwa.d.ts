// PWA Virtual Module Types
declare module 'virtual:pwa-register' {
  export interface RegisterSWOptions {
    immediate?: boolean
    onNeedRefresh?: () => void
    onOfflineReady?: () => void
    onRegistered?: (registration: ServiceWorkerRegistration | undefined) => void
    onRegisterError?: (error: any) => void
  }

  export function registerSW(options?: RegisterSWOptions): (reloadPage?: boolean) => Promise<void>
}

declare module 'virtual:pwa-register/vue' {
  import type { Ref } from 'vue'
  
  export interface UseRegisterSWReturn {
    needRefresh: Ref<boolean>
    offlineReady: Ref<boolean>
    updateServiceWorker: (reloadPage?: boolean) => Promise<void>
  }

  export function useRegisterSW(options?: {
    immediate?: boolean
    onNeedRefresh?: () => void
    onOfflineReady?: () => void
    onRegistered?: (registration: ServiceWorkerRegistration | undefined) => void
    onRegisterError?: (error: any) => void
  }): UseRegisterSWReturn
}

// Extend Window interface for PWA events
declare global {
  interface WindowEventMap {
    'pwa-update-available': CustomEvent
    'pwa-offline-ready': CustomEvent
    'pwa-update-request': CustomEvent
    'pwa-sync-action': CustomEvent<{ type: string; payload: any; id: string }>
  }
}

export {}
