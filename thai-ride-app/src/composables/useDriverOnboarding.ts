/**
 * useDriverOnboarding - Driver Onboarding Flow
 * Feature: F218 - Driver Onboarding
 */

import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'

export interface OnboardingStep {
  id: string
  step_number: number
  title: string
  title_th: string
  description: string
  required_fields: string[]
  is_required: boolean
}

export interface OnboardingProgress {
  provider_id: string
  current_step: number
  completed_steps: number[]
  data: Record<string, any>
  started_at: string
  completed_at?: string
}

export function useDriverOnboarding() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const steps = ref<OnboardingStep[]>([])
  const progress = ref<OnboardingProgress | null>(null)

  const currentStep = computed(() => steps.value.find(s => s.step_number === progress.value?.current_step))
  const completionPercent = computed(() => steps.value.length ? ((progress.value?.completed_steps.length || 0) / steps.value.length) * 100 : 0)
  const isComplete = computed(() => progress.value?.completed_at !== undefined)

  const fetchSteps = async () => {
    loading.value = true
    try {
      const { data, error: err } = await supabase.from('onboarding_steps').select('*').order('step_number')
      if (err) throw err
      steps.value = data || []
    } catch (e: any) { error.value = e.message }
    finally { loading.value = false }
  }

  const fetchProgress = async (providerId: string) => {
    try {
      const { data, error: err } = await supabase.from('onboarding_progress').select('*').eq('provider_id', providerId).single()
      if (err && err.code !== 'PGRST116') throw err
      progress.value = data || null
    } catch (e: any) { error.value = e.message }
  }

  const startOnboarding = async (providerId: string): Promise<boolean> => {
    try {
      const { data, error: err } = await supabase.from('onboarding_progress').insert({ provider_id: providerId, current_step: 1, completed_steps: [], data: {}, started_at: new Date().toISOString() } as never).select().single()
      if (err) throw err
      progress.value = data
      return true
    } catch (e: any) { error.value = e.message; return false }
  }

  const completeStep = async (stepNumber: number, stepData: Record<string, any>): Promise<boolean> => {
    if (!progress.value) return false
    try {
      const completedSteps = [...progress.value.completed_steps, stepNumber]
      const nextStep = stepNumber + 1
      const isLastStep = nextStep > steps.value.length
      const updates: any = { current_step: isLastStep ? stepNumber : nextStep, completed_steps: completedSteps, data: { ...progress.value.data, ...stepData } }
      if (isLastStep) updates.completed_at = new Date().toISOString()
      const { error: err } = await supabase.from('onboarding_progress').update(updates).eq('provider_id', progress.value.provider_id)
      if (err) throw err
      progress.value = { ...progress.value, ...updates }
      return true
    } catch (e: any) { error.value = e.message; return false }
  }

  return { loading, error, steps, progress, currentStep, completionPercent, isComplete, fetchSteps, fetchProgress, startOnboarding, completeStep }
}
