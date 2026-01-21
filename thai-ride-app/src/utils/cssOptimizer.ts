/**
 * CSS Performance Optimizer
 * MUNEEF Design System - Advanced CSS Management
 */

interface CSSOptimizationOptions {
  enableCriticalCSS?: boolean
  enableFontOptimization?: boolean
  enablePrefetch?: boolean
  enablePreload?: boolean
}

class CSSOptimizer {
  private static instance: CSSOptimizer
  private loadedFonts = new Set<string>()
  private criticalCSSLoaded = false
  private deferredStyles: HTMLLinkElement[] = []

  static getInstance(): CSSOptimizer {
    if (!CSSOptimizer.instance) {
      CSSOptimizer.instance = new CSSOptimizer()
    }
    return CSSOptimizer.instance
  }

  /**
   * Initialize CSS optimizations
   */
  init(options: CSSOptimizationOptions = {}): void {
    const {
      enableCriticalCSS = true,
      enableFontOptimization = true,
      enablePrefetch = true,
      enablePreload = true,
    } = options

    if (enableCriticalCSS) {
      this.loadCriticalCSS()
    }

    if (enableFontOptimization) {
      this.optimizeFontLoading()
    }

    if (enablePrefetch) {
      this.setupResourcePrefetch()
    }

    if (enablePreload) {
      this.setupResourcePreload()
    }

    // Remove loading class when CSS is ready
    this.onCSSReady(() => {
      document.documentElement.classList.remove('v-cloak')
      document.body.classList.add('css-loaded')
    })
  }

  /**
   * Load critical CSS inline for faster first paint
   */
  private loadCriticalCSS(): void {
    if (this.criticalCSSLoaded) return

    // Critical CSS is already inlined in index.html
    // This method can be extended for dynamic critical CSS loading
    this.criticalCSSLoaded = true
  }

  /**
   * Optimize font loading with font-display: swap
   */
  private optimizeFontLoading(): void {
    // Skip font optimization if already handled by CSS
    // The main font loading is handled by @import in style.css
    if (document.querySelector('link[href*="fonts.googleapis.com"]')) {
      return
    }

    // Only add font preload if not already present
    if (!this.loadedFonts.has('Sarabun') && !document.querySelector('link[href*="sarabun"]')) {
      const fontLink = document.createElement('link')
      fontLink.rel = 'preload'
      fontLink.as = 'font'
      fontLink.type = 'font/woff2'
      fontLink.crossOrigin = 'anonymous'
      fontLink.href = 'https://fonts.gstatic.com/s/sarabun/v13/DtVjJx26TKEqsc-lWJNJ.woff2'
      
      document.head.appendChild(fontLink)
      this.loadedFonts.add('Sarabun')
    }
  }

  /**
   * Setup resource prefetching for better performance
   */
  private setupResourcePrefetch(): void {
    const prefetchResources = [
      'https://a.basemaps.cartocdn.com',
      'https://b.basemaps.cartocdn.com',
      'https://c.basemaps.cartocdn.com',
      'https://nominatim.openstreetmap.org',
    ]

    prefetchResources.forEach(url => {
      const link = document.createElement('link')
      link.rel = 'dns-prefetch'
      link.href = url
      document.head.appendChild(link)
    })
  }

  /**
   * Setup resource preloading for critical assets
   */
  private setupResourcePreload(): void {
    // Preload critical CSS variables
    const style = document.createElement('style')
    style.textContent = `
      :root {
        --color-primary: #00A86B;
        --color-text-primary: #1A1A1A;
        --font-family-base: 'Sarabun', -apple-system, BlinkMacSystemFont, sans-serif;
      }
    `
    document.head.appendChild(style)
  }

  /**
   * Defer non-critical CSS loading
   */
  deferCSS(href: string, media = 'all'): void {
    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'style'
    link.href = href
    link.onload = () => {
      link.rel = 'stylesheet'
      link.media = media
    }
    
    document.head.appendChild(link)
    this.deferredStyles.push(link)
  }

  /**
   * Load CSS asynchronously
   */
  async loadCSS(href: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = href
      link.onload = () => resolve()
      link.onerror = () => reject(new Error(`Failed to load CSS: ${href}`))
      
      document.head.appendChild(link)
    })
  }

  /**
   * Optimize CSS for production
   */
  optimizeForProduction(): void {
    // Remove unused CSS classes (can be extended with PurgeCSS integration)
    this.removeUnusedStyles()
    
    // Minify inline styles
    this.minifyInlineStyles()
    
    // Setup CSS caching
    this.setupCSSCaching()
  }

  /**
   * Remove unused CSS styles
   */
  private removeUnusedStyles(): void {
    // This would integrate with PurgeCSS or similar tools
    // For now, we ensure only necessary styles are loaded
    console.log('[CSS Optimizer] Unused styles removal - placeholder for PurgeCSS integration')
  }

  /**
   * Minify inline styles
   */
  private minifyInlineStyles(): void {
    const styleElements = document.querySelectorAll('style')
    styleElements.forEach(style => {
      if (style.textContent) {
        style.textContent = style.textContent
          .replace(/\s+/g, ' ')
          .replace(/;\s*}/g, '}')
          .replace(/{\s*/g, '{')
          .replace(/;\s*/g, ';')
          .trim()
      }
    })
  }

  /**
   * Setup CSS caching strategies
   */
  private setupCSSCaching(): void {
    // Add cache headers for CSS files
    const links = document.querySelectorAll('link[rel="stylesheet"]')
    links.forEach(link => {
      const href = (link as HTMLLinkElement).href
      if (href && !href.includes('fonts.googleapis.com')) {
        // Add cache busting for local CSS files
        const url = new URL(href)
        url.searchParams.set('v', Date.now().toString())
        ;(link as HTMLLinkElement).href = url.toString()
      }
    })
  }

  /**
   * Callback when CSS is ready
   */
  private onCSSReady(callback: () => void): void {
    if (document.readyState === 'complete') {
      callback()
    } else {
      window.addEventListener('load', callback)
    }
  }

  /**
   * Get CSS performance metrics
   */
  getPerformanceMetrics(): {
    criticalCSSLoaded: boolean
    fontsLoaded: number
    deferredStylesCount: number
    loadTime: number
  } {
    return {
      criticalCSSLoaded: this.criticalCSSLoaded,
      fontsLoaded: this.loadedFonts.size,
      deferredStylesCount: this.deferredStyles.length,
      loadTime: performance.now(),
    }
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.deferredStyles.forEach(link => {
      if (link.parentNode) {
        link.parentNode.removeChild(link)
      }
    })
    this.deferredStyles = []
  }
}

// Export singleton instance
export const cssOptimizer = CSSOptimizer.getInstance()

// Auto-initialize on import
if (typeof window !== 'undefined') {
  cssOptimizer.init()
}

export default cssOptimizer