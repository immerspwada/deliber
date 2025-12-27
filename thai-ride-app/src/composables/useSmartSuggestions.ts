/**
 * useSmartSuggestions - AI-Powered Smart Suggestions Engine
 * Feature: F270 - Intelligent Customer Suggestions
 * 
 * วิเคราะห์พฤติกรรมผู้ใช้และแนะนำบริการที่เหมาะสม
 * - Time-based suggestions (เช้า/เย็น commute)
 * - Location-based recommendations
 * - Usage pattern learning
 * - Weather-aware suggestions
 * - Event-based promotions
 */

import { ref, computed, onMounted, watch } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'

export interface SmartSuggestion {
  id: string
  type: 'destination' | 'service' | 'promo' | 'action' | 'reminder'
  priority: number // 1-10, higher = more important
  title: string
  subtitle: string
  icon: string
  iconColor: string
  action: {
    type: 'navigate' | 'prefill' | 'apply_promo' | 'call'
    route?: string
    data?: Record<string, any>
  }
  context: {
    timeRelevant: boolean
    locationRelevant: boolean
    weatherRelevant: boolean
  }
  expiresAt?: Date
  confidence: number // 0-1, how confident we are in this suggestion
}

export interface UserPattern {
  weekdayMorningDestination?: { name: string; lat: number; lng: number; address: string }
  weekdayEveningDestination?: { name: string; lat: number; lng: number; address: string }
  weekendDestinations: Array<{ name: string; lat: number; lng: number; frequency: number }>
  preferredServices: Array<{ service: string; frequency: number; avgSpend: number }>
  peakUsageHours: number[]
  averageRideDistance: number
  preferredPaymentMethod?: string
  loyaltyTier?: string
}

export interface ContextData {
  currentHour: number
  dayOfWeek: number
  isWeekend: boolean
  currentLocation?: { lat: number; lng: number }
  weather?: { condition: string; temperature: number }
  hasActiveOrder: boolean
  lastOrderTime?: Date
  walletBalance: number
}

// Cache keys
const CACHE_KEYS = {
  patterns: 'smart_suggestions_patterns',
  suggestions: 'smart_suggestions_cache',
  lastAnalysis: 'smart_suggestions_last_analysis'
}

export function useSmartSuggestions() {
  const authStore = useAuthStore()
  
  const suggestions = ref<SmartSuggestion[]>([])
  const userPatterns = ref<UserPattern | null>(null)
  const contextData = ref<ContextData | null>(null)
  const isAnalyzing = ref(false)
  const lastUpdate = ref<Date | null>(null)
  
  // Top suggestions (max 3)
  const topSuggestions = computed(() => 
    suggestions.value
      .filter(s => !s.expiresAt || new Date(s.expiresAt) > new Date())
      .sort((a, b) => b.priority * b.confidence - a.priority * a.confidence)
      .slice(0, 3)
  )
  
  // Destination suggestions
  const destinationSuggestions = computed(() =>
    suggestions.value.filter(s => s.type === 'destination')
  )
  
  // Service suggestions
  const serviceSuggestions = computed(() =>
    suggestions.value.filter(s => s.type === 'service')
  )
  
  // Promo suggestions
  const promoSuggestions = computed(() =>
    suggestions.value.filter(s => s.type === 'promo')
  )

  /**
   * Initialize context data
   */
  const initializeContext = async (): Promise<ContextData> => {
    const now = new Date()
    const context: ContextData = {
      currentHour: now.getHours(),
      dayOfWeek: now.getDay(),
      isWeekend: now.getDay() === 0 || now.getDay() === 6,
      hasActiveOrder: false,
      walletBalance: 0
    }
    
    // Get current location
    if ('geolocation' in navigator) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 5000,
            maximumAge: 60000
          })
        })
        context.currentLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        }
      } catch {
        // Location not available
      }
    }
    
    // Check for active orders
    if (authStore.user?.id) {
      const { data: activeOrders } = await supabase
        .from('ride_requests')
        .select('id')
        .eq('user_id', authStore.user.id)
        .in('status', ['pending', 'matched', 'in_progress'])
        .limit(1)
      
      context.hasActiveOrder = (activeOrders?.length || 0) > 0
      
      // Get wallet balance
      const { data: wallet } = await supabase
        .from('user_wallets')
        .select('balance')
        .eq('user_id', authStore.user.id)
        .single()
      
      context.walletBalance = wallet?.balance || 0
    }
    
    contextData.value = context
    return context
  }

  /**
   * Analyze user patterns from history
   */
  const analyzeUserPatterns = async (): Promise<UserPattern> => {
    if (!authStore.user?.id) {
      return getDefaultPatterns()
    }
    
    // Check cache first
    const cached = localStorage.getItem(CACHE_KEYS.patterns)
    const lastAnalysis = localStorage.getItem(CACHE_KEYS.lastAnalysis)
    
    if (cached && lastAnalysis) {
      const lastTime = new Date(lastAnalysis)
      const hoursSinceAnalysis = (Date.now() - lastTime.getTime()) / (1000 * 60 * 60)
      
      // Use cache if less than 6 hours old
      if (hoursSinceAnalysis < 6) {
        userPatterns.value = JSON.parse(cached)
        return userPatterns.value!
      }
    }
    
    isAnalyzing.value = true
    
    try {
      // Fetch ride history for pattern analysis
      const { data: rides } = await supabase
        .from('ride_requests')
        .select('pickup_address, destination_address, destination_lat, destination_lng, created_at, status, actual_fare')
        .eq('user_id', authStore.user.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(50)
      
      const patterns: UserPattern = {
        weekendDestinations: [],
        preferredServices: [],
        peakUsageHours: [],
        averageRideDistance: 0
      }
      
      if (rides && rides.length > 0) {
        // Analyze weekday patterns
        const weekdayMorningRides = rides.filter(r => {
          const date = new Date(r.created_at)
          const hour = date.getHours()
          const day = date.getDay()
          return day >= 1 && day <= 5 && hour >= 6 && hour <= 10
        })
        
        const weekdayEveningRides = rides.filter(r => {
          const date = new Date(r.created_at)
          const hour = date.getHours()
          const day = date.getDay()
          return day >= 1 && day <= 5 && hour >= 16 && hour <= 20
        })
        
        // Find most common morning destination
        if (weekdayMorningRides.length >= 3) {
          const destCounts = new Map<string, { count: number; lat: number; lng: number; address: string }>()
          weekdayMorningRides.forEach(r => {
            if (r.destination_address) {
              const key = r.destination_address.split(',')[0]
              const existing = destCounts.get(key)
              if (existing) {
                existing.count++
              } else {
                destCounts.set(key, {
                  count: 1,
                  lat: r.destination_lat,
                  lng: r.destination_lng,
                  address: r.destination_address
                })
              }
            }
          })
          
          const topDest = Array.from(destCounts.entries())
            .sort((a, b) => b[1].count - a[1].count)[0]
          
          if (topDest && topDest[1].count >= 3) {
            patterns.weekdayMorningDestination = {
              name: topDest[0],
              lat: topDest[1].lat,
              lng: topDest[1].lng,
              address: topDest[1].address
            }
          }
        }
        
        // Find most common evening destination (likely home)
        if (weekdayEveningRides.length >= 3) {
          const destCounts = new Map<string, { count: number; lat: number; lng: number; address: string }>()
          weekdayEveningRides.forEach(r => {
            if (r.destination_address) {
              const key = r.destination_address.split(',')[0]
              const existing = destCounts.get(key)
              if (existing) {
                existing.count++
              } else {
                destCounts.set(key, {
                  count: 1,
                  lat: r.destination_lat,
                  lng: r.destination_lng,
                  address: r.destination_address
                })
              }
            }
          })
          
          const topDest = Array.from(destCounts.entries())
            .sort((a, b) => b[1].count - a[1].count)[0]
          
          if (topDest && topDest[1].count >= 3) {
            patterns.weekdayEveningDestination = {
              name: topDest[0],
              lat: topDest[1].lat,
              lng: topDest[1].lng,
              address: topDest[1].address
            }
          }
        }
        
        // Analyze peak usage hours
        const hourCounts = new Array(24).fill(0)
        rides.forEach(r => {
          const hour = new Date(r.created_at).getHours()
          hourCounts[hour]++
        })
        
        patterns.peakUsageHours = hourCounts
          .map((count, hour) => ({ hour, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 3)
          .map(h => h.hour)
        
        // Calculate average spend
        const totalFare = rides.reduce((sum, r) => sum + (r.actual_fare || 0), 0)
        patterns.averageRideDistance = totalFare / rides.length
      }
      
      // Cache patterns
      localStorage.setItem(CACHE_KEYS.patterns, JSON.stringify(patterns))
      localStorage.setItem(CACHE_KEYS.lastAnalysis, new Date().toISOString())
      
      userPatterns.value = patterns
      return patterns
    } catch (err) {
      console.error('Error analyzing patterns:', err)
      return getDefaultPatterns()
    } finally {
      isAnalyzing.value = false
    }
  }

  /**
   * Generate suggestions based on context and patterns
   */
  const generateSuggestions = async (): Promise<SmartSuggestion[]> => {
    const context = await initializeContext()
    const patterns = await analyzeUserPatterns()
    
    const newSuggestions: SmartSuggestion[] = []
    
    // 1. Time-based destination suggestions
    if (!context.hasActiveOrder) {
      // Morning commute (weekday 6-10 AM)
      if (!context.isWeekend && context.currentHour >= 6 && context.currentHour <= 10) {
        if (patterns.weekdayMorningDestination) {
          newSuggestions.push({
            id: 'morning-commute',
            type: 'destination',
            priority: 9,
            title: `ไป${patterns.weekdayMorningDestination.name}?`,
            subtitle: 'เส้นทางประจำตอนเช้า',
            icon: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
            iconColor: '#00A86B',
            action: {
              type: 'prefill',
              route: '/customer/ride',
              data: {
                destination: patterns.weekdayMorningDestination
              }
            },
            context: { timeRelevant: true, locationRelevant: false, weatherRelevant: false },
            confidence: 0.85
          })
        }
      }
      
      // Evening commute (weekday 4-8 PM)
      if (!context.isWeekend && context.currentHour >= 16 && context.currentHour <= 20) {
        if (patterns.weekdayEveningDestination) {
          newSuggestions.push({
            id: 'evening-commute',
            type: 'destination',
            priority: 9,
            title: 'กลับบ้าน?',
            subtitle: patterns.weekdayEveningDestination.name,
            icon: 'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z',
            iconColor: '#F5A623',
            action: {
              type: 'prefill',
              route: '/customer/ride',
              data: {
                destination: patterns.weekdayEveningDestination
              }
            },
            context: { timeRelevant: true, locationRelevant: false, weatherRelevant: false },
            confidence: 0.9
          })
        }
      }
      
      // Lunch time suggestion (11 AM - 1 PM)
      if (context.currentHour >= 11 && context.currentHour <= 13) {
        newSuggestions.push({
          id: 'lunch-delivery',
          type: 'service',
          priority: 7,
          title: 'สั่งอาหารกลางวัน',
          subtitle: 'ส่งถึงที่ภายใน 30 นาที',
          icon: 'M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3',
          iconColor: '#E53935',
          action: {
            type: 'navigate',
            route: '/customer/delivery'
          },
          context: { timeRelevant: true, locationRelevant: false, weatherRelevant: false },
          confidence: 0.7
        })
      }
    }
    
    // 2. Wallet balance suggestions
    if (context.walletBalance < 100) {
      newSuggestions.push({
        id: 'low-balance',
        type: 'action',
        priority: 6,
        title: 'เติมเงินกระเป๋า',
        subtitle: `เหลือ ฿${context.walletBalance.toLocaleString()}`,
        icon: 'M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6',
        iconColor: '#00A86B',
        action: {
          type: 'navigate',
          route: '/customer/wallet'
        },
        context: { timeRelevant: false, locationRelevant: false, weatherRelevant: false },
        confidence: 0.95
      })
    }
    
    // 3. Weekend suggestions
    if (context.isWeekend) {
      newSuggestions.push({
        id: 'weekend-shopping',
        type: 'service',
        priority: 5,
        title: 'ฝากซื้อของวันหยุด',
        subtitle: 'ให้เราช่วยซื้อของให้',
        icon: 'M6 6h15l-1.5 9h-12L6 6zM9 20a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM18 20a1.5 1.5 0 100-3 1.5 1.5 0 000 3z',
        iconColor: '#9C27B0',
        action: {
          type: 'navigate',
          route: '/customer/shopping'
        },
        context: { timeRelevant: true, locationRelevant: false, weatherRelevant: false },
        confidence: 0.6
      })
    }
    
    // 4. Fetch active promos
    try {
      const { data: promos } = await supabase
        .from('promo_codes')
        .select('id, code, discount_type, discount_value, description')
        .eq('is_active', true)
        .gt('valid_until', new Date().toISOString())
        .limit(2)
      
      if (promos && promos.length > 0) {
        promos.forEach((promo, index) => {
          const discountText = promo.discount_type === 'percentage' 
            ? `${promo.discount_value}%` 
            : `฿${promo.discount_value}`
          
          newSuggestions.push({
            id: `promo-${promo.id}`,
            type: 'promo',
            priority: 4 - index,
            title: `ลด ${discountText}`,
            subtitle: promo.description || `ใช้โค้ด ${promo.code}`,
            icon: 'M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7',
            iconColor: '#F5A623',
            action: {
              type: 'apply_promo',
              data: { code: promo.code }
            },
            context: { timeRelevant: false, locationRelevant: false, weatherRelevant: false },
            confidence: 0.8
          })
        })
      }
    } catch {
      // Promos not available
    }
    
    suggestions.value = newSuggestions
    lastUpdate.value = new Date()
    
    return newSuggestions
  }

  /**
   * Get default patterns for new users
   */
  const getDefaultPatterns = (): UserPattern => ({
    weekendDestinations: [],
    preferredServices: [
      { service: 'ride', frequency: 0, avgSpend: 0 }
    ],
    peakUsageHours: [8, 18, 12],
    averageRideDistance: 0
  })

  /**
   * Dismiss a suggestion
   */
  const dismissSuggestion = (suggestionId: string) => {
    suggestions.value = suggestions.value.filter(s => s.id !== suggestionId)
    
    // Store dismissed suggestions to not show again for a while
    const dismissed = JSON.parse(localStorage.getItem('dismissed_suggestions') || '{}')
    dismissed[suggestionId] = Date.now()
    localStorage.setItem('dismissed_suggestions', JSON.stringify(dismissed))
  }

  /**
   * Track suggestion interaction
   */
  const trackSuggestionClick = async (suggestion: SmartSuggestion) => {
    if (!authStore.user?.id) return
    
    try {
      await supabase.from('analytics_events').insert({
        user_id: authStore.user.id,
        event_name: 'suggestion_clicked',
        event_category: 'smart_suggestions',
        properties: {
          suggestion_id: suggestion.id,
          suggestion_type: suggestion.type,
          confidence: suggestion.confidence
        }
      })
    } catch {
      // Silent fail
    }
  }

  /**
   * Refresh suggestions
   */
  const refreshSuggestions = async () => {
    await generateSuggestions()
  }

  // Auto-refresh suggestions every 15 minutes
  let refreshInterval: ReturnType<typeof setInterval> | null = null

  onMounted(() => {
    generateSuggestions()
    
    refreshInterval = setInterval(() => {
      generateSuggestions()
    }, 15 * 60 * 1000)
  })

  // Cleanup
  const cleanup = () => {
    if (refreshInterval) {
      clearInterval(refreshInterval)
      refreshInterval = null
    }
  }

  return {
    // State
    suggestions,
    userPatterns,
    contextData,
    isAnalyzing,
    lastUpdate,
    
    // Computed
    topSuggestions,
    destinationSuggestions,
    serviceSuggestions,
    promoSuggestions,
    
    // Methods
    generateSuggestions,
    refreshSuggestions,
    dismissSuggestion,
    trackSuggestionClick,
    analyzeUserPatterns,
    cleanup
  }
}
