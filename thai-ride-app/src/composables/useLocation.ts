import { ref, onUnmounted } from 'vue'

export interface GeoLocation {
  lat: number
  lng: number
  address: string
  accuracy?: number
}

export interface PlacePrediction {
  placeId: string
  description: string
  mainText: string
  secondaryText: string
}

export type PermissionStatus = 'granted' | 'denied' | 'prompt' | 'unknown'

// Bangkok center as default
const BANGKOK_CENTER = { lat: 13.7563, lng: 100.5018 }

// Storage key for permission preference
const PERMISSION_ASKED_KEY = 'location_permission_asked'

export function useLocation() {
  const currentLocation = ref<GeoLocation | null>(null)
  const isLocating = ref(false)
  const locationError = ref<string | null>(null)
  const watchId = ref<number | null>(null)
  const permissionStatus = ref<PermissionStatus>('unknown')
  const retryCount = ref(0)
  const maxRetries = 2

  // Check if permission modal was already shown
  const wasPermissionAsked = (): boolean => {
    return localStorage.getItem(PERMISSION_ASKED_KEY) === 'true'
  }

  // Mark permission as asked
  const markPermissionAsked = () => {
    localStorage.setItem(PERMISSION_ASKED_KEY, 'true')
  }

  // Check current permission status
  const checkPermissionStatus = async (): Promise<PermissionStatus> => {
    if (!navigator.permissions) {
      return 'unknown'
    }

    try {
      const result = await navigator.permissions.query({ name: 'geolocation' })
      permissionStatus.value = result.state as PermissionStatus
      return result.state as PermissionStatus
    } catch {
      return 'unknown'
    }
  }

  // Should show permission modal?
  const shouldShowPermissionModal = async (): Promise<boolean> => {
    if (!navigator.geolocation) return false
    if (wasPermissionAsked()) return false
    
    const status = await checkPermissionStatus()
    return status === 'prompt' || status === 'unknown'
  }

  // Internal function to get position (single attempt)
  const getPositionOnce = (timeout: number = 10000): Promise<GeoLocation> => {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const location: GeoLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            address: '',
            accuracy: position.coords.accuracy
          }
          
          // Try to get address from coordinates
          try {
            location.address = await reverseGeocode(location.lat, location.lng)
          } catch {
            location.address = `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`
          }
          
          currentLocation.value = location
          resolve(location)
        },
        (error) => {
          reject(error)
        },
        {
          enableHighAccuracy: true,
          timeout,
          maximumAge: 60000
        }
      )
    })
  }

  // Get current position with retry mechanism
  const getCurrentPosition = async (): Promise<GeoLocation> => {
    if (!navigator.geolocation) {
      throw new Error('เบราว์เซอร์ไม่รองรับ GPS')
    }

    isLocating.value = true
    locationError.value = null
    retryCount.value = 0

    // Mark that we've asked for permission
    markPermissionAsked()

    while (retryCount.value <= maxRetries) {
      try {
        // Increase timeout on retries
        const timeout = 10000 + (retryCount.value * 5000)
        const location = await getPositionOnce(timeout)
        isLocating.value = false
        retryCount.value = 0
        return location
      } catch (error: any) {
        retryCount.value++
        
        // Don't retry on permission denied
        if (error.code === 1) { // PERMISSION_DENIED
          isLocating.value = false
          locationError.value = 'กรุณาอนุญาตการเข้าถึงตำแหน่ง'
          permissionStatus.value = 'denied'
          throw new Error('กรุณาอนุญาตการเข้าถึงตำแหน่ง')
        }

        // Retry on timeout or position unavailable
        if (retryCount.value <= maxRetries) {
          console.log(`GPS retry ${retryCount.value}/${maxRetries}...`)
          await new Promise(r => setTimeout(r, 1000)) // Wait 1s before retry
          continue
        }

        // All retries failed
        isLocating.value = false
        let message = 'ไม่สามารถระบุตำแหน่งได้'
        
        if (error.code === 2) { // POSITION_UNAVAILABLE
          message = 'ไม่สามารถระบุตำแหน่งได้ กรุณาตรวจสอบ GPS'
        } else if (error.code === 3) { // TIMEOUT
          message = 'หมดเวลาในการระบุตำแหน่ง กรุณาลองใหม่'
        }
        
        locationError.value = message
        throw new Error(message)
      }
    }

    isLocating.value = false
    throw new Error('ไม่สามารถระบุตำแหน่งได้')
  }

  // Watch position continuously
  const watchPosition = (callback: (location: GeoLocation) => void) => {
    if (!navigator.geolocation) {
      locationError.value = 'เบราว์เซอร์ไม่รองรับ GPS'
      return
    }

    watchId.value = navigator.geolocation.watchPosition(
      async (position) => {
        const location: GeoLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          address: currentLocation.value?.address || '',
          accuracy: position.coords.accuracy
        }
        currentLocation.value = location
        callback(location)
      },
      (error) => {
        locationError.value = 'ไม่สามารถติดตามตำแหน่งได้'
        console.error('Watch position error:', error)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000
      }
    )
  }

  // Stop watching position
  const stopWatching = () => {
    if (watchId.value !== null) {
      navigator.geolocation.clearWatch(watchId.value)
      watchId.value = null
    }
  }

  // Reverse geocode coordinates to address using Nominatim (OpenStreetMap)
  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=th`,
        {
          headers: {
            'User-Agent': 'ThaiRideApp/1.0'
          }
        }
      )
      
      if (!response.ok) {
        throw new Error('Geocoding failed')
      }
      
      const data = await response.json()
      return data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`
    } catch {
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`
    }
  }

  // Geocode address to coordinates using Nominatim (OpenStreetMap)
  const geocodeAddress = async (address: string): Promise<GeoLocation> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&countrycodes=th&limit=1&accept-language=th`,
        {
          headers: {
            'User-Agent': 'ThaiRideApp/1.0'
          }
        }
      )
      
      if (!response.ok) {
        throw new Error('Geocoding failed')
      }
      
      const data = await response.json()
      
      if (data.length === 0) {
        throw new Error('ไม่พบที่อยู่นี้')
      }
      
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
        address: data[0].display_name
      }
    } catch (error) {
      throw new Error('ไม่พบที่อยู่นี้')
    }
  }

  // Calculate distance between two points (Haversine formula)
  const calculateDistance = (
    lat1: number, lng1: number,
    lat2: number, lng2: number
  ): number => {
    const R = 6371 // Earth's radius in km
    const dLat = toRad(lat2 - lat1)
    const dLng = toRad(lng2 - lng1)
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  const toRad = (deg: number): number => deg * (Math.PI / 180)

  // Calculate estimated travel time (rough estimate)
  const calculateTravelTime = (distanceKm: number, trafficMultiplier: number = 1.3): number => {
    // Average speed in Bangkok: ~20 km/h with traffic
    const avgSpeedKmh = 20 / trafficMultiplier
    return Math.ceil((distanceKm / avgSpeedKmh) * 60) // minutes
  }

  // Get default location (Bangkok)
  const getDefaultLocation = (): GeoLocation => ({
    ...BANGKOK_CENTER,
    address: 'กรุงเทพมหานคร'
  })

  // Cleanup on unmount
  onUnmounted(() => {
    stopWatching()
  })

  return {
    currentLocation,
    isLocating,
    locationError,
    permissionStatus,
    retryCount,
    getCurrentPosition,
    watchPosition,
    stopWatching,
    reverseGeocode,
    geocodeAddress,
    calculateDistance,
    calculateTravelTime,
    getDefaultLocation,
    checkPermissionStatus,
    shouldShowPermissionModal,
    markPermissionAsked,
    BANGKOK_CENTER
  }
}


