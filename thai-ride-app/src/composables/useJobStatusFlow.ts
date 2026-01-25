/**
 * Job Status Flow Composable
 * Handles flexible status mapping between database values and UI flow
 * Supports multiple database status values per flow step
 */
import { computed, type Ref } from 'vue'

export interface StatusStep {
  key: string
  label: string
  icon: string
  action: string
  dbStatus: string[] // Support multiple database status values
}

// Status aliases for backward compatibility and flexibility
// Maps alternative status values to actual database enum values
const STATUS_ALIASES: Record<string, string> = {
  // Map alternatives to 'matched' (database value)
  'accepted': 'matched',
  'confirmed': 'matched',
  'offered': 'matched',
  
  // Map alternatives to 'pickup' (database value)
  'arrived': 'pickup',
  'arriving': 'pickup',
  'at_pickup': 'pickup',
  
  // Map alternatives to 'in_progress'
  'picked_up': 'in_progress',
  'ongoing': 'in_progress',
  'started': 'in_progress',
  
  // Map alternatives to 'completed'
  'finished': 'completed',
  'done': 'completed'
}

// Status flow with flexible database status mapping
// CRITICAL: Database CHECK constraint = 'pending', 'matched', 'pickup', 'in_progress', 'completed', 'cancelled'
// Flow keys MUST match ACTUAL database enum values
export const STATUS_FLOW: StatusStep[] = [
  {
    key: 'matched',  // ✅ ACTUAL database value
    label: 'รับงานแล้ว',
    icon: '✅',
    action: 'ถึงจุดรับแล้ว',
    dbStatus: ['matched', 'accepted', 'offered', 'confirmed']  // รองรับ aliases
  },
  {
    key: 'pickup',  // ✅ ACTUAL database value
    label: 'ถึงจุดรับแล้ว',
    icon: '📍',
    action: 'รับลูกค้าแล้ว',
    dbStatus: ['pickup', 'arrived', 'arriving', 'at_pickup']  // รองรับ aliases
  },
  {
    key: 'in_progress',  // ✅ ACTUAL database value
    label: 'กำลังเดินทาง',
    icon: '🛣️',
    action: 'ส่งลูกค้าสำเร็จ',
    dbStatus: ['in_progress', 'picked_up', 'ongoing', 'started']
  },
  {
    key: 'completed',  // ✅ ACTUAL database value
    label: 'เสร็จสิ้น',
    icon: '🎉',
    action: 'เสร็จสิ้น',
    dbStatus: ['completed', 'finished', 'done']
  }
] as const

/**
 * Normalize status value using aliases
 * Handles whitespace and case sensitivity
 */
function normalizeStatus(status: string): string {
  const trimmed = status.trim().toLowerCase()
  const normalized = STATUS_ALIASES[trimmed] || trimmed
  console.log('[StatusFlow] Normalizing:', { original: status, trimmed, normalized })
  return normalized
}

/**
 * Composable for managing job status flow
 * @param jobStatus - Reactive reference to current job status from database
 */
export function useJobStatusFlow(jobStatus: Ref<string | undefined>) {
  /**
   * Find current status index by matching database status
   * Uses normalization for backward compatibility
   * Supports case-insensitive matching
   */
  const currentStatusIndex = computed(() => {
    if (!jobStatus.value) {
      console.warn('[StatusFlow] No job status provided')
      return -1
    }

    // Normalize status first (trim + lowercase)
    const normalized = normalizeStatus(jobStatus.value)

    // Try exact match with normalized status
    const index = STATUS_FLOW.findIndex(step => 
      step.dbStatus.some(s => s.toLowerCase() === normalized) || 
      step.key.toLowerCase() === normalized
    )

    if (index === -1) {
      console.error('[StatusFlow] Unknown status:', {
        original: jobStatus.value,
        normalized,
        availableStatuses: STATUS_FLOW.flatMap(s => s.dbStatus),
        aliases: STATUS_ALIASES,
        flowKeys: STATUS_FLOW.map(s => s.key)
      })
    } else {
      console.log('[StatusFlow] Status found:', {
        original: jobStatus.value,
        normalized,
        index,
        step: STATUS_FLOW[index].key
      })
    }

    return index
  })

  /**
   * Current status step
   */
  const currentStep = computed(() => {
    const idx = currentStatusIndex.value
    return idx >= 0 ? STATUS_FLOW[idx] : null
  })

  /**
   * Next status step in the flow
   */
  const nextStep = computed(() => {
    const idx = currentStatusIndex.value
    if (idx < 0 || idx >= STATUS_FLOW.length - 1) {
      return null
    }
    return STATUS_FLOW[idx + 1]
  })

  /**
   * Can progress to next status
   */
  const canProgress = computed(() => {
    return nextStep.value !== null
  })

  /**
   * Is job completed
   */
  const isCompleted = computed(() => {
    if (!jobStatus.value) return false
    const lastStep = STATUS_FLOW[STATUS_FLOW.length - 1]
    return lastStep.dbStatus.includes(jobStatus.value)
  })

  /**
   * Is job cancelled
   */
  const isCancelled = computed(() => {
    return jobStatus.value === 'cancelled'
  })

  /**
   * Get next database status value to update to
   * CRITICAL: Returns ACTUAL database enum value, not alias
   */
  const nextDbStatus = computed(() => {
    if (!nextStep.value) return null
    // Use the key (which is the actual database value)
    return nextStep.value.key
  })

  /**
   * Debug info for troubleshooting
   */
  const debugInfo = computed(() => ({
    currentStatus: jobStatus.value,
    currentIndex: currentStatusIndex.value,
    currentStep: currentStep.value?.key,
    nextStep: nextStep.value?.key,
    nextDbStatus: nextDbStatus.value,
    canProgress: canProgress.value,
    isCompleted: isCompleted.value,
    isCancelled: isCancelled.value,
    allSteps: STATUS_FLOW.map(s => ({
      key: s.key,
      dbStatus: s.dbStatus,
      label: s.label
    }))
  }))

  return {
    STATUS_FLOW,
    currentStatusIndex,
    currentStep,
    nextStep,
    nextDbStatus,
    canProgress,
    isCompleted,
    isCancelled,
    debugInfo
  }
}
