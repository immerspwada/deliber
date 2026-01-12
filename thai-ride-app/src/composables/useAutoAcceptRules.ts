/**
 * Auto-Accept Rules Composable
 * ให้ provider ตั้งกฎรับงานอัตโนมัติ
 * 
 * Features:
 * - ตั้งกฎตามระยะทาง (เช่น < 3km)
 * - ตั้งกฎตามราคา (เช่น > 100฿)
 * - ตั้งกฎตามประเภทงาน
 * - เปิด/ปิดการรับงานอัตโนมัติ
 * - บันทึกลง localStorage
 */
import { ref, computed, watch } from 'vue'

export interface AutoAcceptRule {
  id: string
  name: string
  enabled: boolean
  conditions: {
    maxDistance?: number      // km
    minFare?: number          // baht
    jobTypes?: ('ride' | 'delivery' | 'shopping')[]
    timeRange?: {
      start: string           // HH:mm
      end: string             // HH:mm
    }
  }
  priority: number            // Higher = checked first
  createdAt: string
}

export interface Job {
  id: string
  type: 'ride' | 'delivery' | 'shopping'
  fare: number
  distance?: number
}

const STORAGE_KEY = 'provider_auto_accept_rules'
const AUTO_ACCEPT_ENABLED_KEY = 'provider_auto_accept_enabled'

export function useAutoAcceptRules() {
  // State
  const rules = ref<AutoAcceptRule[]>([])
  const autoAcceptEnabled = ref(false)
  const loading = ref(false)

  // Load from localStorage
  function loadRules(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        rules.value = JSON.parse(stored)
      } else {
        // Default rules
        rules.value = [
          {
            id: 'default-nearby',
            name: 'งานใกล้บ้าน',
            enabled: false,
            conditions: {
              maxDistance: 3,
              minFare: 50
            },
            priority: 1,
            createdAt: new Date().toISOString()
          },
          {
            id: 'default-premium',
            name: 'งานราคาดี',
            enabled: false,
            conditions: {
              minFare: 150
            },
            priority: 2,
            createdAt: new Date().toISOString()
          }
        ]
      }
      
      const enabledStored = localStorage.getItem(AUTO_ACCEPT_ENABLED_KEY)
      autoAcceptEnabled.value = enabledStored === 'true'
    } catch (err) {
      console.error('[AutoAccept] Load error:', err)
    }
  }

  // Save to localStorage
  function saveRules(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rules.value))
      localStorage.setItem(AUTO_ACCEPT_ENABLED_KEY, String(autoAcceptEnabled.value))
    } catch (err) {
      console.error('[AutoAccept] Save error:', err)
    }
  }

  // Toggle auto-accept
  function toggleAutoAccept(): void {
    autoAcceptEnabled.value = !autoAcceptEnabled.value
    saveRules()
  }

  // Add new rule
  function addRule(rule: Omit<AutoAcceptRule, 'id' | 'createdAt'>): AutoAcceptRule {
    const newRule: AutoAcceptRule = {
      ...rule,
      id: `rule-${Date.now()}`,
      createdAt: new Date().toISOString()
    }
    rules.value.push(newRule)
    saveRules()
    return newRule
  }

  // Update rule
  function updateRule(id: string, updates: Partial<AutoAcceptRule>): boolean {
    const index = rules.value.findIndex(r => r.id === id)
    if (index === -1) return false
    
    rules.value[index] = { ...rules.value[index], ...updates }
    saveRules()
    return true
  }

  // Delete rule
  function deleteRule(id: string): boolean {
    const index = rules.value.findIndex(r => r.id === id)
    if (index === -1) return false
    
    rules.value.splice(index, 1)
    saveRules()
    return true
  }

  // Toggle rule enabled
  function toggleRule(id: string): boolean {
    const rule = rules.value.find(r => r.id === id)
    if (!rule) return false
    
    rule.enabled = !rule.enabled
    saveRules()
    return true
  }

  // Check if job matches a rule
  function checkJobAgainstRule(job: Job, rule: AutoAcceptRule): boolean {
    const { conditions } = rule
    
    // Check distance
    if (conditions.maxDistance !== undefined && job.distance !== undefined) {
      if (job.distance > conditions.maxDistance) return false
    }
    
    // Check fare
    if (conditions.minFare !== undefined) {
      if (job.fare < conditions.minFare) return false
    }
    
    // Check job type
    if (conditions.jobTypes && conditions.jobTypes.length > 0) {
      if (!conditions.jobTypes.includes(job.type)) return false
    }
    
    // Check time range
    if (conditions.timeRange) {
      const now = new Date()
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
      
      if (currentTime < conditions.timeRange.start || currentTime > conditions.timeRange.end) {
        return false
      }
    }
    
    return true
  }

  // Check if job should be auto-accepted
  function shouldAutoAccept(job: Job): { accept: boolean; matchedRule?: AutoAcceptRule } {
    if (!autoAcceptEnabled.value) {
      return { accept: false }
    }
    
    // Sort by priority (higher first)
    const enabledRules = rules.value
      .filter(r => r.enabled)
      .sort((a, b) => b.priority - a.priority)
    
    for (const rule of enabledRules) {
      if (checkJobAgainstRule(job, rule)) {
        return { accept: true, matchedRule: rule }
      }
    }
    
    return { accept: false }
  }

  // Get active rules count
  const activeRulesCount = computed(() => 
    rules.value.filter(r => r.enabled).length
  )

  // Watch for changes and save
  watch(rules, saveRules, { deep: true })

  // Initialize
  loadRules()

  return {
    rules,
    autoAcceptEnabled,
    loading,
    activeRulesCount,
    toggleAutoAccept,
    addRule,
    updateRule,
    deleteRule,
    toggleRule,
    shouldAutoAccept,
    loadRules,
    saveRules
  }
}