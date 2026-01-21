/**
 * useDynamicPricing - Dynamic Pricing Rules
 * Feature: F205 - Dynamic Pricing
 */

import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'

export interface PricingRule {
  id: string
  name: string
  name_th: string
  rule_type: 'time' | 'demand' | 'weather' | 'event' | 'zone'
  multiplier: number
  conditions: { start_hour?: number; end_hour?: number; min_demand?: number; weather_type?: string; zone_id?: string }
  priority: number
  is_active: boolean
}

export interface PriceCalculation {
  base_fare: number
  distance_fare: number
  time_fare: number
  surge_multiplier: number
  applied_rules: string[]
  final_fare: number
}

export function useDynamicPricing() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const rules = ref<PricingRule[]>([])
  const currentMultiplier = ref(1.0)

  const activeRules = computed(() => rules.value.filter(r => r.is_active).sort((a, b) => b.priority - a.priority))

  const fetchRules = async () => {
    loading.value = true
    try {
      const { data, error: err } = await supabase.from('pricing_rules').select('*').order('priority', { ascending: false })
      if (err) throw err
      rules.value = data || []
    } catch (e: any) { error.value = e.message }
    finally { loading.value = false }
  }

  const calculatePrice = (baseFare: number, distance: number, duration: number, context?: { hour?: number; demand?: number; weather?: string; zone?: string }): PriceCalculation => {
    const distanceFare = distance * 10 // 10 THB per km
    const timeFare = duration * 2 // 2 THB per minute
    const appliedRules: string[] = []
    let multiplier = 1.0

    for (const rule of activeRules.value) {
      if (shouldApplyRule(rule, context)) {
        multiplier = Math.max(multiplier, rule.multiplier)
        appliedRules.push(rule.name_th)
      }
    }

    currentMultiplier.value = multiplier
    const finalFare = Math.round((baseFare + distanceFare + timeFare) * multiplier)

    return { base_fare: baseFare, distance_fare: distanceFare, time_fare: timeFare, surge_multiplier: multiplier, applied_rules: appliedRules, final_fare: finalFare }
  }

  const shouldApplyRule = (rule: PricingRule, context?: any): boolean => {
    if (!context) return false
    const { conditions } = rule
    if (rule.rule_type === 'time' && context.hour !== undefined) {
      return context.hour >= (conditions.start_hour || 0) && context.hour <= (conditions.end_hour || 23)
    }
    if (rule.rule_type === 'demand' && context.demand !== undefined) {
      return context.demand >= (conditions.min_demand || 0)
    }
    if (rule.rule_type === 'weather' && context.weather) {
      return context.weather === conditions.weather_type
    }
    if (rule.rule_type === 'zone' && context.zone) {
      return context.zone === conditions.zone_id
    }
    return false
  }

  const createRule = async (rule: Partial<PricingRule>): Promise<boolean> => {
    try {
      const { error: err } = await supabase.from('pricing_rules').insert(rule as never)
      if (err) throw err
      await fetchRules()
      return true
    } catch (e: any) { error.value = e.message; return false }
  }

  const getRuleTypeText = (t: string) => ({ time: 'ช่วงเวลา', demand: 'ความต้องการ', weather: 'สภาพอากาศ', event: 'อีเวนต์', zone: 'โซน' }[t] || t)

  return { loading, error, rules, currentMultiplier, activeRules, fetchRules, calculatePrice, createRule, getRuleTypeText }
}
