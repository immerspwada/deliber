/**
 * Navigation Integration Composable - Production Ready
 * Opens Google Maps/Waze with destination coordinates
 * 
 * Role Impact:
 * - Provider: Navigate to pickup/dropoff locations
 * - Customer: Navigate to pickup location (if needed)
 * - Admin: No access
 */

import { computed } from 'vue'

export type NavigationApp = 'google-maps' | 'waze' | 'apple-maps'

export interface NavigationOptions {
  lat: number
  lng: number
  label?: string
  app?: NavigationApp
}

export function useNavigation() {
  // Detect platform
  const isIOS = computed(() => {
    return /iPad|iPhone|iPod/.test(navigator.userAgent)
  })
  
  const isAndroid = computed(() => {
    return /Android/.test(navigator.userAgent)
  })
  
  /**
   * Open navigation app with coordinates
   */
  function navigate(options: NavigationOptions): void {
    const { lat, lng, label, app } = options
    
    // Validate coordinates
    if (!isValidCoordinate(lat, lng)) {
      console.error('[Navigation] Invalid coordinates:', { lat, lng })
      alert('พิกัดไม่ถูกต้อง')
      return
    }
    
    const appToUse = app || getDefaultApp()
    
    switch (appToUse) {
      case 'google-maps':
        openGoogleMaps(lat, lng, label)
        break
      case 'waze':
        openWaze(lat, lng)
        break
      case 'apple-maps':
        openAppleMaps(lat, lng, label)
        break
      default:
        openGoogleMaps(lat, lng, label)
    }
  }
  
  /**
   * Open Google Maps
   * Works on all platforms (web fallback)
   * Uses universal link approach for better compatibility
   */
  function openGoogleMaps(lat: number, lng: number, label?: string): void {
    // Use Google Maps universal link (works on all platforms)
    // This will open the app if installed, otherwise opens in browser
    const webUrl = label
      ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`
      : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`
    
    // On mobile, try intent-based approach for Android
    if (isAndroid.value) {
      // Use geo: URI which Android handles natively
      const geoUrl = `geo:${lat},${lng}?q=${lat},${lng}`
      
      // Try geo: first, fallback to web
      tryOpenApp(geoUrl, webUrl)
      return
    }
    
    // On iOS, try comgooglemaps:// scheme
    if (isIOS.value) {
      const iosUrl = `comgooglemaps://?daddr=${lat},${lng}&directionsmode=driving`
      tryOpenApp(iosUrl, webUrl)
      return
    }
    
    // Desktop/other - just open web URL
    window.open(webUrl, '_blank')
  }
  
  /**
   * Open Waze
   * Works on iOS and Android
   */
  function openWaze(lat: number, lng: number): void {
    const wazeUrl = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`
    
    // Waze uses universal link (works on all platforms)
    window.open(wazeUrl, '_blank')
  }
  
  /**
   * Open Apple Maps
   * iOS only
   */
  function openAppleMaps(lat: number, lng: number, label?: string): void {
    if (!isIOS.value) {
      // Fallback to Google Maps on non-iOS
      openGoogleMaps(lat, lng, label)
      return
    }
    
    const appleMapsUrl = label
      ? `maps://?daddr=${lat},${lng}&q=${encodeURIComponent(label)}`
      : `maps://?daddr=${lat},${lng}`
    
    window.location.href = appleMapsUrl
  }
  
  /**
   * Try to open native app, fallback to web
   * Uses a more reliable approach with timeout
   */
  function tryOpenApp(nativeUrl: string, webUrl: string): void {
    const startTime = Date.now()
    let didNavigate = false
    
    // Listen for visibility change (app opened)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        didNavigate = true
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    // Try to open native app
    const link = document.createElement('a')
    link.href = nativeUrl
    link.style.display = 'none'
    document.body.appendChild(link)
    
    try {
      link.click()
    } catch {
      // Scheme not supported, go to web directly
      window.open(webUrl, '_blank')
      document.body.removeChild(link)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      return
    }
    
    // Fallback to web after delay if app didn't open
    setTimeout(() => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      document.body.removeChild(link)
      
      // If we didn't navigate away and not much time passed, open web
      if (!didNavigate && Date.now() - startTime < 2000) {
        window.open(webUrl, '_blank')
      }
    }, 1500)
  }
  
  /**
   * Get default navigation app based on platform
   */
  function getDefaultApp(): NavigationApp {
    if (isIOS.value) {
      return 'apple-maps'
    }
    return 'google-maps'
  }
  
  /**
   * Validate coordinates
   */
  function isValidCoordinate(lat: number, lng: number): boolean {
    return (
      typeof lat === 'number' &&
      typeof lng === 'number' &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180 &&
      !isNaN(lat) &&
      !isNaN(lng)
    )
  }
  
  /**
   * Show navigation options dialog
   */
  function showNavigationOptions(lat: number, lng: number, label?: string): void {
    const apps: Array<{ name: string; app: NavigationApp; available: boolean }> = [
      { name: 'Google Maps', app: 'google-maps', available: true },
      { name: 'Waze', app: 'waze', available: true },
      { name: 'Apple Maps', app: 'apple-maps', available: isIOS.value }
    ]
    
    const availableApps = apps.filter(a => a.available)
    
    if (availableApps.length === 1) {
      // Only one option, open directly
      navigate({ lat, lng, label, app: availableApps[0].app })
      return
    }
    
    // Show options (you can create a modal component for this)
    const choice = confirm(
      `เลือกแอปนำทาง:\n\n` +
      availableApps.map((a, i) => `${i + 1}. ${a.name}`).join('\n') +
      `\n\nกด OK สำหรับ ${availableApps[0].name}`
    )
    
    if (choice) {
      navigate({ lat, lng, label, app: availableApps[0].app })
    }
  }
  
  /**
   * Calculate distance between two points (for display)
   */
  function calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 6371 // Earth radius in km
    const dLat = toRad(lat2 - lat1)
    const dLng = toRad(lng2 - lng1)
    
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2)
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }
  
  function toRad(degrees: number): number {
    return degrees * (Math.PI / 180)
  }
  
  return {
    // State
    isIOS,
    isAndroid,
    
    // Methods
    navigate,
    openGoogleMaps,
    openWaze,
    openAppleMaps,
    showNavigationOptions,
    calculateDistance,
    isValidCoordinate
  }
}
