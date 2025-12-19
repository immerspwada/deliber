// @ts-nocheck
/**
 * useBookingOptimization - Smart Booking Features
 * 
 * Feature: F02 - Customer Booking Flow Optimization
 * Tables: booking_templates, fare_predictions, booking_suggestions, booking_analytics
 * Migration: 058_booking_optimization.sql
 */

import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'

export interface BookingTemplate {
  id: string
  user_id: string
  name: string
  service_type: 'ride' | 'delivery' | 'shopping' | 'queue' | 'moving' | 'laundry'
  template_data: Record<string, any>
  pickup_location?: { lat: number; lng: number; address: string }
  destination_location?: { lat: number; lng: number; address: string }
  preferred_time?: string
  preferred_vehicle_type?: string
  notes?: string
  use_count: number
  last_used_at?: string
  is_favorite: boolean
  created_at: string
}

export interface FarePrediction {
  predicted_fare: number
  min_fare: number
  max_fare: number
  confidence: number
  surge_active: boolean
}

export interface BookingSuggestion {
  suggestion_type: 'frequent_route' | 'time_based' | 'location_based' | 'promo_based'
  suggestion_data: Record<string, any>
  relevance_score: number
}

export function useBookingOptimization() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  
  // Templates
  const templates = ref<BookingTemplate[]>([])
  const suggestions = ref<BookingSuggestion[]>([])
  const currentPrediction = ref<FarePrediction | null>(null)
  
  // Session tracking
  const sessionId = ref<string>(generateSessionId())
  const funnelStep = ref(0)

  // Computed
  const favoriteTemplates = computed(() => 
    templates.value.filter(t => t.is_favorite)
  )
  
  const recentTemplates = computed(() => 
    [...templates.value]
      .sort((a, b) => {
        if (!a.last_used_at) return 1
        if (!b.last_used_at) return -1
        return new Date(b.last_used_at).getTime() - new Date(a.last_used_at).getTime()
      })
      .slice(0, 5)
  )

  // Fetch user's booking templates
  const fetchTemplates = async (serviceType?: string) => {
    loading.value = true
    error.value = null
    
    try {
      let query = supabase
        .from('booking_templates')
        .select('*')
        .order('use_count', { ascending: false })
      
      if (serviceType) {
        query = query.eq('service_type', serviceType)
      }
      
      const { data, error: err } = await query
      
      if (err) throw err
      templates.value = data || []
    } catch (e: any) {
      error.value = e.message
      templates.value = []
    } finally {
      loading.value = false
    }
  }

  // Save new template
  const saveTemplate = async (
    name: string,
    serviceType: BookingTemplate['service_type'],
    templateData: Record<string, any>
  ) => {
    loading.value = true
    
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('Not authenticated')
      
      const { data, error: err } = await supabase
        .from('booking_templates')
        .insert({
          user_id: userData.user.id,
          name,
          service_type: serviceType,
          template_data: templateData,
          pickup_location: templateData.pickup,
          destination_location: templateData.destination,
          preferred_vehicle_type: templateData.vehicle_type,
          notes: templateData.notes
        })
        .select()
        .single()
      
      if (err) throw err
      
      templates.value.unshift(data)
      return { success: true, template: data }
    } catch (e: any) {
      error.value = e.message
      return { success: false, error: e.message }
    } finally {
      loading.value = false
    }
  }

  // Use template (apply and track)
  const useTemplate = async (templateId: string) => {
    try {
      const { data, error: err } = await (supabase.rpc as any)('use_booking_template', {
        p_template_id: templateId
      })
      
      if (err) throw err
      
      // Update local state
      const template = templates.value.find(t => t.id === templateId)
      if (template) {
        template.use_count++
        template.last_used_at = new Date().toISOString()
      }
      
      // Track event
      await trackEvent('template_used', { template_id: templateId })
      
      return { success: true, data }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  }

  // Toggle favorite
  const toggleFavorite = async (templateId: string) => {
    const template = templates.value.find(t => t.id === templateId)
    if (!template) return
    
    try {
      const { error: err } = await supabase
        .from('booking_templates')
        .update({ is_favorite: !template.is_favorite })
        .eq('id', templateId)
      
      if (err) throw err
      template.is_favorite = !template.is_favorite
    } catch (e: any) {
      error.value = e.message
    }
  }

  // Delete template
  const deleteTemplate = async (templateId: string) => {
    try {
      const { error: err } = await supabase
        .from('booking_templates')
        .delete()
        .eq('id', templateId)
      
      if (err) throw err
      templates.value = templates.value.filter(t => t.id !== templateId)
      return { success: true }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  }

  // Get smart suggestions
  const fetchSuggestions = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) return
      
      const { data, error: err } = await (supabase.rpc as any)('get_booking_suggestions', {
        p_user_id: userData.user.id,
        p_limit: 5
      })
      
      if (err) throw err
      suggestions.value = data || []
    } catch {
      // Generate mock suggestions
      suggestions.value = [
        {
          suggestion_type: 'frequent_route',
          suggestion_data: {
            pickup: 'บ้าน',
            destination: 'ที่ทำงาน',
            count: 15
          },
          relevance_score: 0.9
        },
        {
          suggestion_type: 'time_based',
          suggestion_data: {
            hour: new Date().getHours(),
            typical_destination: 'เซ็นทรัลเวิลด์'
          },
          relevance_score: 0.7
        }
      ]
    }
  }

  // Predict fare
  const predictFare = async (
    pickupArea: string,
    destinationArea: string,
    vehicleType: string = 'car'
  ) => {
    try {
      const { data, error: err } = await (supabase.rpc as any)('predict_fare', {
        p_pickup_area: pickupArea,
        p_destination_area: destinationArea,
        p_vehicle_type: vehicleType
      })
      
      if (err) throw err
      currentPrediction.value = data?.[0] || null
      return currentPrediction.value
    } catch {
      // Default prediction
      currentPrediction.value = {
        predicted_fare: 50,
        min_fare: 35,
        max_fare: 100,
        confidence: 0.3,
        surge_active: false
      }
      return currentPrediction.value
    }
  }

  // Track booking event
  const trackEvent = async (
    eventType: string,
    eventData: Record<string, any> = {},
    step?: number
  ) => {
    try {
      const { data: userData } = await supabase.auth.getUser()
      
      await (supabase.rpc as any)('track_booking_event', {
        p_user_id: userData.user?.id || null,
        p_session_id: sessionId.value,
        p_event_type: eventType,
        p_event_data: eventData,
        p_funnel_step: step ?? funnelStep.value
      })
    } catch {
      // Silent fail for analytics
    }
  }

  // Funnel tracking helpers
  const startBookingSession = () => {
    sessionId.value = generateSessionId()
    funnelStep.value = 1
    trackEvent('booking_started', {}, 1)
  }

  const trackFunnelStep = (step: number, eventType: string, data?: Record<string, any>) => {
    funnelStep.value = step
    trackEvent(eventType, data, step)
  }

  const completeBooking = (bookingId: string) => {
    trackEvent('booking_completed', { booking_id: bookingId }, 5)
    funnelStep.value = 0
  }

  const abandonBooking = (reason?: string) => {
    trackEvent('booking_abandoned', { reason, step: funnelStep.value })
    funnelStep.value = 0
  }

  // Helper
  function generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  return {
    // State
    loading,
    error,
    templates,
    suggestions,
    currentPrediction,
    sessionId,
    funnelStep,
    
    // Computed
    favoriteTemplates,
    recentTemplates,
    
    // Template methods
    fetchTemplates,
    saveTemplate,
    useTemplate,
    toggleFavorite,
    deleteTemplate,
    
    // Suggestions & Predictions
    fetchSuggestions,
    predictFare,
    
    // Analytics
    trackEvent,
    startBookingSession,
    trackFunnelStep,
    completeBooking,
    abandonBooking
  }
}
