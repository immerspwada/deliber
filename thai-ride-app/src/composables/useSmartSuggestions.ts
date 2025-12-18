/**
 * useSmartSuggestions - Smart Location Suggestions Composable
 * 
 * แนะนำสถานที่ตามเวลา พฤติกรรม และบริบทของผู้ใช้
 * ทำให้การใช้งานเร็วขึ้นและ personalized มากขึ้น
 */

import { ref, computed } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useServices } from './useServices'

export interface SmartSuggestion {
  id: string
  name: string
  address: string
  lat: number
  lng: number
  type: 'home' | 'work' | 'frequent' | 'recent' | 'predicted' | 'contextual'
  reason: string
  icon: string
  priority: number
  confidence: number
}

export interface TimeContext {
  hour: number
  dayOfWeek: number
  isWeekend: boolean
  isRushHour: boolean
  isMorning: boolean
  isEvening: boolean
  isNight: boolean
}

export function useSmartSuggestions() {
  const authStore = useAuthStore()
  const { homePlace, workPlace, recentPlaces, fetchSavedPlaces, fetchRecentPlaces } = useServices()
  
  const suggestions = ref<SmartSuggestion[]>([])
  const isLoading = ref(false)
  
  /**
   * Get current time context
   */
  const getTimeContext = (): TimeContext => {
    const now = new Date()
    const hour = now.getHours()
    const dayOfWeek = now.getDay()
    
    return {
      hour,
      dayOfWeek,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      isRushHour: (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19),
      isMorning: hour >= 6 && hour < 12,
      isEvening: hour >= 17 && hour < 21,
      isNight: hour >= 21 || hour < 6
    }
  }
  
  const timeContext = computed(() => getTimeContext())
  
  /**
   * Generate contextual suggestions based on time and behavior
   */
  const generateContextualSuggestions = async (): Promise<SmartSuggestion[]> => {
    const ctx = timeContext.value
    const result: SmartSuggestion[] = []
    
    // Fetch saved places if not loaded
    await fetchSavedPlaces()
    await fetchRecentPlaces()
    
    // Morning weekday = suggest work
    if (!ctx.isWeekend && ctx.isMorning && workPlace.value) {
      result.push({
        id: 'ctx-work-morning',
        name: workPlace.value.name || 'ที่ทำงาน',
        address: workPlace.value.address || '',
        lat: workPlace.value.lat,
        lng: workPlace.value.lng,
        type: 'predicted',
        reason: 'เวลาไปทำงาน',
        icon: 'work',
        priority: 100,
        confidence: 0.9
      })
    }
    
    // Evening weekday = suggest home
    if (!ctx.isWeekend && ctx.isEvening && homePlace.value) {
      result.push({
        id: 'ctx-home-evening',
        name: homePlace.value.name || 'บ้าน',
        address: homePlace.value.address || '',
        lat: homePlace.value.lat,
        lng: homePlace.value.lng,
        type: 'predicted',
        reason: 'เวลากลับบ้าน',
        icon: 'home',
        priority: 100,
        confidence: 0.9
      })
    }
    
    // Rush hour = suggest scheduling
    if (ctx.isRushHour) {
      // Add rush hour context to suggestions
      result.forEach(s => {
        s.reason += ' (ช่วงเวลาเร่งด่วน)'
      })
    }
    
    // Weekend = suggest leisure places from recent
    if (ctx.isWeekend && recentPlaces.value.length > 0) {
      const leisurePlaces = recentPlaces.value.slice(0, 2)
      leisurePlaces.forEach((place, index) => {
        if (place.lat && place.lng) {
          result.push({
            id: `ctx-weekend-${index}`,
            name: place.name,
            address: place.address || '',
            lat: place.lat,
            lng: place.lng,
            type: 'contextual',
            reason: 'สถานที่ที่คุณไปบ่อย',
            icon: 'star',
            priority: 80 - index * 10,
            confidence: 0.7
          })
        }
      })
    }
    
    return result
  }
  
  /**
   * Generate suggestions from saved places
   */
  const generateSavedPlaceSuggestions = (): SmartSuggestion[] => {
    const result: SmartSuggestion[] = []
    
    if (homePlace.value) {
      result.push({
        id: 'saved-home',
        name: homePlace.value.name || 'บ้าน',
        address: homePlace.value.address || '',
        lat: homePlace.value.lat,
        lng: homePlace.value.lng,
        type: 'home',
        reason: 'สถานที่บันทึกไว้',
        icon: 'home',
        priority: 90,
        confidence: 1.0
      })
    }
    
    if (workPlace.value) {
      result.push({
        id: 'saved-work',
        name: workPlace.value.name || 'ที่ทำงาน',
        address: workPlace.value.address || '',
        lat: workPlace.value.lat,
        lng: workPlace.value.lng,
        type: 'work',
        reason: 'สถานที่บันทึกไว้',
        icon: 'work',
        priority: 85,
        confidence: 1.0
      })
    }
    
    return result
  }
  
  /**
   * Generate suggestions from recent places
   */
  const generateRecentSuggestions = (): SmartSuggestion[] => {
    return recentPlaces.value
      .filter(place => place.lat && place.lng)
      .slice(0, 5)
      .map((place, index) => ({
        id: `recent-${index}`,
        name: place.name,
        address: place.address || '',
        lat: place.lat!,
        lng: place.lng!,
        type: 'recent' as const,
        reason: 'ใช้งานล่าสุด',
        icon: 'history',
        priority: 70 - index * 5,
        confidence: 0.8 - index * 0.1
      }))
  }
  
  /**
   * Get all suggestions sorted by priority
   */
  const getSuggestions = async (limit = 5): Promise<SmartSuggestion[]> => {
    isLoading.value = true
    
    try {
      const contextual = await generateContextualSuggestions()
      const saved = generateSavedPlaceSuggestions()
      const recent = generateRecentSuggestions()
      
      // Combine and deduplicate
      const allSuggestions = [...contextual, ...saved, ...recent]
      const uniqueSuggestions = allSuggestions.reduce((acc, curr) => {
        const exists = acc.find(s => 
          s.lat === curr.lat && s.lng === curr.lng ||
          s.name.toLowerCase() === curr.name.toLowerCase()
        )
        if (!exists) {
          acc.push(curr)
        } else if (curr.priority > exists.priority) {
          // Replace with higher priority
          const index = acc.indexOf(exists)
          acc[index] = curr
        }
        return acc
      }, [] as SmartSuggestion[])
      
      // Sort by priority
      uniqueSuggestions.sort((a, b) => b.priority - a.priority)
      
      suggestions.value = uniqueSuggestions.slice(0, limit)
      return suggestions.value
    } finally {
      isLoading.value = false
    }
  }
  
  /**
   * Get pickup suggestions (from current location context)
   */
  const getPickupSuggestions = async (): Promise<SmartSuggestion[]> => {
    const ctx = timeContext.value
    const result: SmartSuggestion[] = []
    
    // Morning = suggest home as pickup
    if (ctx.isMorning && homePlace.value) {
      result.push({
        id: 'pickup-home',
        name: homePlace.value.name || 'บ้าน',
        address: homePlace.value.address || '',
        lat: homePlace.value.lat,
        lng: homePlace.value.lng,
        type: 'predicted',
        reason: 'จุดรับที่แนะนำ',
        icon: 'home',
        priority: 100,
        confidence: 0.85
      })
    }
    
    // Evening = suggest work as pickup
    if (ctx.isEvening && workPlace.value) {
      result.push({
        id: 'pickup-work',
        name: workPlace.value.name || 'ที่ทำงาน',
        address: workPlace.value.address || '',
        lat: workPlace.value.lat,
        lng: workPlace.value.lng,
        type: 'predicted',
        reason: 'จุดรับที่แนะนำ',
        icon: 'work',
        priority: 100,
        confidence: 0.85
      })
    }
    
    return result
  }
  
  /**
   * Get destination suggestions based on pickup
   */
  const getDestinationSuggestions = async (pickupLat?: number, pickupLng?: number): Promise<SmartSuggestion[]> => {
    const ctx = timeContext.value
    const result: SmartSuggestion[] = []
    
    // If pickup is near home, suggest work
    if (homePlace.value && pickupLat && pickupLng) {
      const distanceToHome = Math.sqrt(
        Math.pow(pickupLat - homePlace.value.lat, 2) + 
        Math.pow(pickupLng - homePlace.value.lng, 2)
      )
      
      if (distanceToHome < 0.01 && workPlace.value) { // ~1km
        result.push({
          id: 'dest-work',
          name: workPlace.value.name || 'ที่ทำงาน',
          address: workPlace.value.address || '',
          lat: workPlace.value.lat,
          lng: workPlace.value.lng,
          type: 'predicted',
          reason: 'จุดหมายที่แนะนำ',
          icon: 'work',
          priority: 100,
          confidence: 0.9
        })
      }
    }
    
    // If pickup is near work, suggest home
    if (workPlace.value && pickupLat && pickupLng) {
      const distanceToWork = Math.sqrt(
        Math.pow(pickupLat - workPlace.value.lat, 2) + 
        Math.pow(pickupLng - workPlace.value.lng, 2)
      )
      
      if (distanceToWork < 0.01 && homePlace.value) {
        result.push({
          id: 'dest-home',
          name: homePlace.value.name || 'บ้าน',
          address: homePlace.value.address || '',
          lat: homePlace.value.lat,
          lng: homePlace.value.lng,
          type: 'predicted',
          reason: 'จุดหมายที่แนะนำ',
          icon: 'home',
          priority: 100,
          confidence: 0.9
        })
      }
    }
    
    // Add recent places
    const recent = generateRecentSuggestions()
    result.push(...recent)
    
    return result.slice(0, 5)
  }
  
  /**
   * Get predictive action based on context
   */
  const getPredictiveAction = computed(() => {
    const ctx = timeContext.value
    
    // Monday morning = go to work
    if (ctx.dayOfWeek === 1 && ctx.hour >= 7 && ctx.hour <= 9) {
      return {
        primary: { action: 'ride-to-work', text: 'ไปทำงาน', icon: 'work' },
        secondary: { action: 'schedule-return', text: 'นัดรถกลับ', icon: 'schedule' }
      }
    }
    
    // Friday evening = weekend plans
    if (ctx.dayOfWeek === 5 && ctx.hour >= 16) {
      return {
        primary: { action: 'ride-home', text: 'กลับบ้าน', icon: 'home' },
        secondary: { action: 'weekend-trip', text: 'วางแผนเที่ยว', icon: 'trip' }
      }
    }
    
    // Rush hour = schedule ahead
    if (ctx.isRushHour) {
      return {
        primary: { action: 'book-now', text: 'เรียกรถเลย', icon: 'car' },
        secondary: { action: 'schedule-ride', text: 'จองล่วงหน้า', icon: 'schedule' }
      }
    }
    
    // Default
    return {
      primary: { action: 'book-ride', text: 'เรียกรถ', icon: 'car' },
      secondary: null
    }
  })
  
  return {
    // State
    suggestions,
    isLoading,
    timeContext,
    
    // Functions
    getSuggestions,
    getPickupSuggestions,
    getDestinationSuggestions,
    generateContextualSuggestions,
    
    // Computed
    getPredictiveAction
  }
}

export default useSmartSuggestions
