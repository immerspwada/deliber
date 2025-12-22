/**
 * useAutoSurgePricing - Automatic Surge Pricing System
 * 
 * Feature: F178 - Auto Surge Pricing
 * Tables: surge_pricing_rules, surge_pricing_history, service_zones
 * 
 * @features
 * - Auto calculate surge based on demand/supply ratio
 * - Time-based surge rules (peak hours)
 * - Weather-based surge
 * - Event-based surge
 * - Admin override capability
 */

import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'

export interface SurgeRule {
  id: string
  zone_id: string | null
  rule_name: string
  rule_name_th: string
  rule_type: 'demand' | 'time' | 'weather' | 'event' | 'manual'
  conditions: SurgeConditions
  multiplier: number
  max_multiplier: number
  is_active: boolean
  priority: number
  valid_from?: string
  valid_until?: string
  created_at: string
}

export interface SurgeConditions {
  demand_ratio_min?: number
  demand_ratio_max?: number
  time_start?: string
  time_end?: string
  days_of_week?: number[]
  weather_conditions?: string[]
  event_ids?: string[]
}

export interface SurgeHistory {
  id: string
  zone_id: string
  applied_multiplier: number
  base_multiplier: number
  demand_ratio: number
  pending_requests: number
  available_providers: number
  triggered_rules: string[]
  recorded_at: string
}

export interface CurrentSurge {
  zone_id: string
  zone_name: string
  multiplier: number
  reason: string
  triggered_rules: SurgeRule[]
  expires_at?: string
}

export function useAutoSurgePricing() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  
  // State
  const surgeRules = ref<SurgeRule[]>([])
  const surgeHistory = ref<SurgeHistory[]>([])
  const currentSurges = ref<CurrentSurge[]>([])
  const globalSurgeEnabled = ref(true)

  // Default surge thresholds
  const SURGE_THRESHOLDS = {
    low: { ratio: 1.5, multiplier: 1.0 },
    medium: { ratio: 2.0, multiplier: 1.2 },
    high: { ratio: 3.0, multiplier: 1.5 },
    surge: { ratio: 5.0, multiplier: 2.0 },
    extreme: { ratio: 10.0, multiplier: 2.5 }
  }

  // Computed
  const activeRules = computed(() => 
    surgeRules.value.filter(r => r.is_active)
  )

  const zonesWithSurge = computed(() => 
    currentSurges.value.filter(s => s.multiplier > 1.0)
  )

  const avgSurgeMultiplier = computed(() => {
    if (currentSurges.value.length === 0) return 1.0
    const sum = currentSurges.value.reduce((acc, s) => acc + s.multiplier, 0)
    return Math.round((sum / currentSurges.value.length) * 100) / 100
  })

  /**
   * Calculate surge multiplier for a zone
   */
  const calculateSurge = async (
    zoneId: string,
    pendingRequests: number,
    availableProviders: number
  ): Promise<{ multiplier: number; reason: string; rules: SurgeRule[] }> => {
    if (!globalSurgeEnabled.value) {
      return { multiplier: 1.0, reason: 'Surge disabled', rules: [] }
    }

    const triggeredRules: SurgeRule[] = []
    let finalMultiplier = 1.0
    let reason = 'Normal pricing'

    // Calculate demand ratio
    const demandRatio = availableProviders > 0 
      ? pendingRequests / availableProviders 
      : pendingRequests > 0 ? 10 : 0

    // Get applicable rules for this zone
    const applicableRules = surgeRules.value
      .filter(r => r.is_active && (r.zone_id === null || r.zone_id === zoneId))
      .sort((a, b) => b.priority - a.priority)

    for (const rule of applicableRules) {
      const isTriggered = checkRuleConditions(rule, demandRatio)
      
      if (isTriggered) {
        triggeredRules.push(rule)
        if (rule.multiplier > finalMultiplier) {
          finalMultiplier = Math.min(rule.multiplier, rule.max_multiplier)
          reason = rule.rule_name_th
        }
      }
    }

    // Apply demand-based surge if no rules triggered
    if (triggeredRules.length === 0 && demandRatio > SURGE_THRESHOLDS.low.ratio) {
      const demandSurge = calculateDemandSurge(demandRatio)
      finalMultiplier = demandSurge.multiplier
      reason = demandSurge.reason
    }

    return { multiplier: finalMultiplier, reason, rules: triggeredRules }
  }

  /**
   * Check if rule conditions are met
   */
  const checkRuleConditions = (rule: SurgeRule, demandRatio: number): boolean => {
    const { conditions } = rule
    const now = new Date()
    const currentHour = now.getHours()
    const currentDay = now.getDay()

    // Check demand ratio
    if (rule.rule_type === 'demand') {
      if (conditions.demand_ratio_min && demandRatio < conditions.demand_ratio_min) return false
      if (conditions.demand_ratio_max && demandRatio > conditions.demand_ratio_max) return false
      return true
    }

    // Check time-based rules
    if (rule.rule_type === 'time') {
      if (conditions.days_of_week && !conditions.days_of_week.includes(currentDay)) return false
      
      if (conditions.time_start && conditions.time_end) {
        const [startHour] = conditions.time_start.split(':').map(Number)
        const [endHour] = conditions.time_end.split(':').map(Number)
        
        if (startHour <= endHour) {
          if (currentHour < startHour || currentHour >= endHour) return false
        } else {
          // Overnight range (e.g., 22:00 - 06:00)
          if (currentHour < startHour && currentHour >= endHour) return false
        }
      }
      return true
    }

    // Check validity period
    if (rule.valid_from && new Date(rule.valid_from) > now) return false
    if (rule.valid_until && new Date(rule.valid_until) < now) return false

    return true
  }

  /**
   * Calculate demand-based surge
   */
  const calculateDemandSurge = (demandRatio: number): { multiplier: number; reason: string } => {
    if (demandRatio >= SURGE_THRESHOLDS.extreme.ratio) {
      return { multiplier: SURGE_THRESHOLDS.extreme.multiplier, reason: 'Demand สูงมาก' }
    }
    if (demandRatio >= SURGE_THRESHOLDS.surge.ratio) {
      return { multiplier: SURGE_THRESHOLDS.surge.multiplier, reason: 'Surge pricing' }
    }
    if (demandRatio >= SURGE_THRESHOLDS.high.ratio) {
      return { multiplier: SURGE_THRESHOLDS.high.multiplier, reason: 'Demand สูง' }
    }
    if (demandRatio >= SURGE_THRESHOLDS.medium.ratio) {
      return { multiplier: SURGE_THRESHOLDS.medium.multiplier, reason: 'Demand ปานกลาง' }
    }
    return { multiplier: 1.0, reason: 'Normal' }
  }

  /**
   * Fetch all surge rules
   */
  const fetchSurgeRules = async () => {
    loading.value = true
    try {
      const { data, error: err } = await supabase
        .from('surge_pricing_rules')
        .select('*')
        .order('priority', { ascending: false })

      if (err) throw err
      surgeRules.value = data || []
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Unknown error'
    } finally {
      loading.value = false
    }
  }

  /**
   * Create surge rule
   */
  const createSurgeRule = async (rule: Partial<SurgeRule>): Promise<SurgeRule | null> => {
    try {
      const { data, error: err } = await supabase
        .from('surge_pricing_rules')
        .insert(rule)
        .select()
        .single()

      if (err) throw err
      surgeRules.value.push(data)
      return data
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Unknown error'
      return null
    }
  }

  /**
   * Update surge rule
   */
  const updateSurgeRule = async (id: string, updates: Partial<SurgeRule>): Promise<boolean> => {
    try {
      const { error: err } = await supabase
        .from('surge_pricing_rules')
        .update(updates)
        .eq('id', id)

      if (err) throw err
      
      const idx = surgeRules.value.findIndex(r => r.id === id)
      if (idx !== -1) {
        surgeRules.value[idx] = { ...surgeRules.value[idx], ...updates }
      }
      return true
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Unknown error'
      return false
    }
  }

  /**
   * Delete surge rule
   */
  const deleteSurgeRule = async (id: string): Promise<boolean> => {
    try {
      const { error: err } = await supabase
        .from('surge_pricing_rules')
        .delete()
        .eq('id', id)

      if (err) throw err
      surgeRules.value = surgeRules.value.filter(r => r.id !== id)
      return true
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Unknown error'
      return false
    }
  }

  /**
   * Record surge history
   */
  const recordSurgeHistory = async (
    zoneId: string,
    multiplier: number,
    demandRatio: number,
    pendingRequests: number,
    availableProviders: number,
    triggeredRules: string[]
  ) => {
    try {
      await supabase.from('surge_pricing_history').insert({
        zone_id: zoneId,
        applied_multiplier: multiplier,
        base_multiplier: 1.0,
        demand_ratio: demandRatio,
        pending_requests: pendingRequests,
        available_providers: availableProviders,
        triggered_rules: triggeredRules
      })
    } catch (e) {
      console.error('Failed to record surge history:', e)
    }
  }

  /**
   * Fetch surge history
   */
  const fetchSurgeHistory = async (zoneId?: string, hoursBack: number = 24) => {
    loading.value = true
    try {
      const fromDate = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString()
      
      let query = supabase
        .from('surge_pricing_history')
        .select('*')
        .gte('recorded_at', fromDate)
        .order('recorded_at', { ascending: false })

      if (zoneId) query = query.eq('zone_id', zoneId)

      const { data, error: err } = await query
      if (err) throw err
      surgeHistory.value = data || []
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Unknown error'
    } finally {
      loading.value = false
    }
  }

  /**
   * Update current surges for all zones
   */
  const updateAllZoneSurges = async () => {
    try {
      // Get all active zones with their demand data
      const { data: zones } = await supabase
        .from('service_zones')
        .select('id, name, name_th')
        .eq('is_active', true)

      if (!zones) return

      const surges: CurrentSurge[] = []

      for (const zone of zones) {
        // Get pending requests count
        const { count: pendingCount } = await supabase
          .from('ride_requests')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending')

        // Get available providers count
        const { count: providerCount } = await supabase
          .from('service_providers')
          .select('*', { count: 'exact', head: true })
          .eq('is_available', true)
          .eq('status', 'active')

        const result = await calculateSurge(
          zone.id,
          pendingCount || 0,
          providerCount || 0
        )

        surges.push({
          zone_id: zone.id,
          zone_name: zone.name_th || zone.name,
          multiplier: result.multiplier,
          reason: result.reason,
          triggered_rules: result.rules
        })

        // Record history if surge is active
        if (result.multiplier > 1.0) {
          await recordSurgeHistory(
            zone.id,
            result.multiplier,
            (pendingCount || 0) / Math.max(providerCount || 1, 1),
            pendingCount || 0,
            providerCount || 0,
            result.rules.map(r => r.id)
          )
        }
      }

      currentSurges.value = surges
    } catch (e) {
      console.error('Failed to update zone surges:', e)
    }
  }

  /**
   * Admin: Set manual surge override
   */
  const setManualSurge = async (
    zoneId: string,
    multiplier: number,
    reason: string,
    durationMinutes: number = 60
  ): Promise<boolean> => {
    const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString()
    
    return await createSurgeRule({
      zone_id: zoneId,
      rule_name: `Manual Override - ${reason}`,
      rule_name_th: `ปรับราคาด้วยตนเอง - ${reason}`,
      rule_type: 'manual',
      conditions: {},
      multiplier,
      max_multiplier: multiplier,
      is_active: true,
      priority: 100,
      valid_until: expiresAt
    }) !== null
  }

  /**
   * Toggle global surge pricing
   */
  const toggleGlobalSurge = (enabled: boolean) => {
    globalSurgeEnabled.value = enabled
  }

  /**
   * Get surge color based on multiplier
   */
  const getSurgeColor = (multiplier: number): string => {
    if (multiplier >= 2.0) return '#E53935'
    if (multiplier >= 1.5) return '#FF6B35'
    if (multiplier >= 1.2) return '#F5A623'
    return '#00A86B'
  }

  /**
   * Format multiplier display
   */
  const formatMultiplier = (multiplier: number): string => {
    return `${multiplier.toFixed(1)}x`
  }

  return {
    // State
    loading,
    error,
    surgeRules,
    surgeHistory,
    currentSurges,
    globalSurgeEnabled,
    
    // Computed
    activeRules,
    zonesWithSurge,
    avgSurgeMultiplier,
    
    // Methods
    calculateSurge,
    fetchSurgeRules,
    createSurgeRule,
    updateSurgeRule,
    deleteSurgeRule,
    fetchSurgeHistory,
    updateAllZoneSurges,
    setManualSurge,
    toggleGlobalSurge,
    getSurgeColor,
    formatMultiplier
  }
}
