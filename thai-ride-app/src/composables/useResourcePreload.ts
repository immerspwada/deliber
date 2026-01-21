/**
 * Resource Preloading Composable
 * Feature: F255 - Resource Preloading & Prefetching
 * 
 * Optimizes resource loading with preload, prefetch, and preconnect
 */

import { onMounted } from 'vue'

interface PreloadOptions {
  as: 'script' | 'style' | 'image' | 'font' | 'fetch'
  crossorigin?: 'anonymous' | 'use-credentials'
  type?: string
}

interface PrefetchOptions {
  priority?: 'high' | 'low'
}

export function useResourcePreload() {
  /**
   * Preload a resource (high priority, needed soon)
   */
  const preload = (href: string, options: PreloadOptions) => {
    const link = document.createElement('link')
    link.rel = 'preload'
    link.href = href
    link.as = options.as
    
    if (options.crossorigin) {
      link.crossOrigin = options.crossorigin
    }
    
    if (options.type) {
      link.type = options.type
    }
    
    document.head.appendChild(link)
  }

  /**
   * Prefetch a resource (low priority, might be needed later)
   */
  const prefetch = (href: string, options: PrefetchOptions = {}) => {
    const link = document.createElement('link')
    link.rel = 'prefetch'
    link.href = href
    
    if (options.priority === 'high') {
      link.setAttribute('importance', 'high')
    }
    
    document.head.appendChild(link)
  }

  /**
   * Preconnect to an origin (establish connection early)
   */
  const preconnect = (origin: string, crossorigin = false) => {
    const link = document.createElement('link')
    link.rel = 'preconnect'
    link.href = origin
    
    if (crossorigin) {
      link.crossOrigin = 'anonymous'
    }
    
    document.head.appendChild(link)
  }

  /**
   * DNS prefetch (resolve DNS early)
   */
  const dnsPrefetch = (origin: string) => {
    const link = document.createElement('link')
    link.rel = 'dns-prefetch'
    link.href = origin
    document.head.appendChild(link)
  }

  /**
   * Preload critical fonts
   */
  const preloadFonts = (fonts: string[]) => {
    fonts.forEach(font => {
      preload(font, {
        as: 'font',
        type: 'font/woff2',
        crossorigin: 'anonymous'
      })
    })
  }

  /**
   * Preload critical images
   */
  const preloadImages = (images: string[]) => {
    images.forEach(image => {
      preload(image, { as: 'image' })
    })
  }

  /**
   * Prefetch route chunks (for Vue Router)
   */
  const prefetchRoute = (routeName: string) => {
    // This will be populated by the build process
    // For now, we'll just log it
    console.log(`Prefetching route: ${routeName}`)
  }

  /**
   * Preconnect to critical origins
   */
  const preconnectCriticalOrigins = () => {
    // Supabase
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    if (supabaseUrl) {
      preconnect(supabaseUrl, true)
    }

    // Google Fonts
    preconnect('https://fonts.googleapis.com')
    preconnect('https://fonts.gstatic.com', true)

    // Map tiles (OpenStreetMap)
    preconnect('https://a.tile.openstreetmap.org')
    preconnect('https://b.tile.openstreetmap.org')
    preconnect('https://c.tile.openstreetmap.org')
  }

  /**
   * Preload critical resources for the app
   */
  const preloadCriticalResources = () => {
    // Preload Sarabun font (MUNEEF Style)
    preloadFonts([
      'https://fonts.gstatic.com/s/sarabun/v13/DtVjJx26TKEr37c9YHZJmnYI5gnOpg.woff2'
    ])

    // Preconnect to critical origins
    preconnectCriticalOrigins()
  }

  /**
   * Prefetch resources for likely next navigation
   */
  const prefetchLikelyRoutes = (currentRoute: string) => {
    // Define likely next routes based on current route
    const likelyRoutes: Record<string, string[]> = {
      '/': ['/customer/services', '/customer/ride', '/wallet'],
      '/customer/services': ['/customer/ride', '/customer/delivery', '/customer/shopping'],
      '/customer/ride': ['/customer/history', '/wallet'],
      '/provider': ['/provider/jobs', '/provider/earnings'],
      '/admin': ['/admin/orders', '/admin/providers', '/admin/customers']
    }

    const routes = likelyRoutes[currentRoute] || []
    routes.forEach(route => prefetchRoute(route))
  }

  /**
   * Intelligent prefetching based on user behavior
   */
  const intelligentPrefetch = () => {
    // Prefetch on hover (for desktop)
    document.addEventListener('mouseover', (e) => {
      const target = e.target as HTMLElement
      const link = target.closest('a[href]') as HTMLAnchorElement
      
      if (link && link.href && link.origin === window.location.origin) {
        prefetch(link.href)
      }
    }, { passive: true, once: false })

    // Prefetch on touch start (for mobile)
    document.addEventListener('touchstart', (e) => {
      const target = e.target as HTMLElement
      const link = target.closest('a[href]') as HTMLAnchorElement
      
      if (link && link.href && link.origin === window.location.origin) {
        prefetch(link.href, { priority: 'high' })
      }
    }, { passive: true, once: false })
  }

  /**
   * Preload images in viewport
   */
  const preloadViewportImages = () => {
    const images = document.querySelectorAll('img[data-preload]')
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement
          const src = img.dataset.src
          
          if (src) {
            preload(src, { as: 'image' })
          }
          
          observer.unobserve(img)
        }
      })
    }, {
      rootMargin: '50px' // Start loading 50px before entering viewport
    })

    images.forEach(img => observer.observe(img))
  }

  return {
    // Core methods
    preload,
    prefetch,
    preconnect,
    dnsPrefetch,
    
    // Convenience methods
    preloadFonts,
    preloadImages,
    prefetchRoute,
    
    // Smart preloading
    preloadCriticalResources,
    prefetchLikelyRoutes,
    intelligentPrefetch,
    preloadViewportImages
  }
}

/**
 * Auto-setup hook for app initialization
 */
export function useResourcePreloadSetup() {
  const {
    preloadCriticalResources,
    intelligentPrefetch,
    preloadViewportImages
  } = useResourcePreload()

  onMounted(() => {
    // Preload critical resources immediately
    preloadCriticalResources()

    // Setup intelligent prefetching
    intelligentPrefetch()

    // Preload viewport images
    preloadViewportImages()
  })
}

/**
 * Usage Example:
 * 
 * In main.ts:
 * ```typescript
 * import { useResourcePreloadSetup } from '@/composables/useResourcePreload'
 * 
 * const app = createApp(App)
 * app.mount('#app')
 * 
 * // Setup resource preloading
 * useResourcePreloadSetup()
 * ```
 * 
 * In components:
 * ```vue
 * <script setup>
 * import { useResourcePreload } from '@/composables/useResourcePreload'
 * 
 * const { preloadImages, prefetchRoute } = useResourcePreload()
 * 
 * // Preload images
 * preloadImages(['/hero.jpg', '/logo.png'])
 * 
 * // Prefetch next route
 * prefetchRoute('/customer/ride')
 * </script>
 * ```
 */
