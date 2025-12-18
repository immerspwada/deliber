/**
 * useProgressiveLoading - Progressive Loading States Composable
 * 
 * แสดง loading states ที่มีความหมายและบอกความคืบหน้า
 * ลดความกังวลของผู้ใช้ด้วยการบอกว่ากำลังทำอะไรอยู่
 */

import { ref, computed, watch } from 'vue'

export interface LoadingStep {
  id: string
  label: string
  description?: string
  duration?: number // estimated duration in ms
}

export interface LoadingState {
  isLoading: boolean
  currentStep: number
  totalSteps: number
  progress: number
  currentLabel: string
  currentDescription: string
  estimatedTimeRemaining: number
}

export function useProgressiveLoading(steps: LoadingStep[] = []) {
  const isLoading = ref(false)
  const currentStepIndex = ref(0)
  const progress = ref(0)
  const startTime = ref<number | null>(null)
  const stepStartTime = ref<number | null>(null)
  
  const loadingSteps = ref<LoadingStep[]>(steps)
  
  // Default steps for common operations
  const defaultSteps = {
    booking: [
      { id: 'validate', label: 'ตรวจสอบข้อมูล', description: 'กำลังตรวจสอบข้อมูลการจอง', duration: 500 },
      { id: 'calculate', label: 'คำนวณเส้นทาง', description: 'กำลังคำนวณระยะทางและเวลา', duration: 1000 },
      { id: 'pricing', label: 'คำนวณค่าโดยสาร', description: 'กำลังคำนวณค่าบริการ', duration: 500 },
      { id: 'submit', label: 'ส่งคำขอ', description: 'กำลังส่งคำขอไปยังระบบ', duration: 1000 },
      { id: 'matching', label: 'กำลังหาคนขับ', description: 'กำลังค้นหาคนขับที่ใกล้ที่สุด', duration: 3000 }
    ],
    search: [
      { id: 'searching', label: 'กำลังค้นหา', description: 'กำลังค้นหาสถานที่', duration: 500 },
      { id: 'filtering', label: 'กรองผลลัพธ์', description: 'กำลังกรองผลลัพธ์ที่เกี่ยวข้อง', duration: 300 },
      { id: 'sorting', label: 'จัดเรียง', description: 'กำลังจัดเรียงตามความเกี่ยวข้อง', duration: 200 }
    ],
    payment: [
      { id: 'validate', label: 'ตรวจสอบข้อมูล', description: 'กำลังตรวจสอบข้อมูลการชำระเงิน', duration: 500 },
      { id: 'processing', label: 'ดำเนินการ', description: 'กำลังดำเนินการชำระเงิน', duration: 2000 },
      { id: 'confirming', label: 'ยืนยัน', description: 'กำลังยืนยันการชำระเงิน', duration: 1000 }
    ],
    upload: [
      { id: 'preparing', label: 'เตรียมไฟล์', description: 'กำลังเตรียมไฟล์สำหรับอัพโหลด', duration: 300 },
      { id: 'uploading', label: 'อัพโหลด', description: 'กำลังอัพโหลดไฟล์', duration: 2000 },
      { id: 'processing', label: 'ประมวลผล', description: 'กำลังประมวลผลไฟล์', duration: 1000 }
    ]
  }
  
  const currentStep = computed(() => loadingSteps.value[currentStepIndex.value])
  const totalSteps = computed(() => loadingSteps.value.length)
  
  const currentLabel = computed(() => currentStep.value?.label || 'กำลังโหลด...')
  const currentDescription = computed(() => currentStep.value?.description || '')
  
  const progressPercentage = computed(() => {
    if (totalSteps.value === 0) return 0
    const baseProgress = (currentStepIndex.value / totalSteps.value) * 100
    const stepProgress = (progress.value / 100) * (100 / totalSteps.value)
    return Math.min(baseProgress + stepProgress, 100)
  })
  
  const estimatedTimeRemaining = computed(() => {
    if (!startTime.value || currentStepIndex.value >= totalSteps.value) return 0
    
    const remainingSteps = loadingSteps.value.slice(currentStepIndex.value)
    const remainingTime = remainingSteps.reduce((acc, step) => acc + (step.duration || 1000), 0)
    
    // Adjust based on current step progress
    const currentStepRemaining = (currentStep.value?.duration || 1000) * (1 - progress.value / 100)
    
    return Math.max(0, remainingTime - (currentStep.value?.duration || 0) + currentStepRemaining)
  })
  
  const state = computed<LoadingState>(() => ({
    isLoading: isLoading.value,
    currentStep: currentStepIndex.value,
    totalSteps: totalSteps.value,
    progress: progressPercentage.value,
    currentLabel: currentLabel.value,
    currentDescription: currentDescription.value,
    estimatedTimeRemaining: estimatedTimeRemaining.value
  }))
  
  /**
   * Set loading steps
   */
  const setSteps = (steps: LoadingStep[]) => {
    loadingSteps.value = steps
  }
  
  /**
   * Use preset steps
   */
  const usePreset = (preset: keyof typeof defaultSteps) => {
    loadingSteps.value = defaultSteps[preset] || []
  }
  
  /**
   * Start loading
   */
  const start = (steps?: LoadingStep[]) => {
    if (steps) {
      loadingSteps.value = steps
    }
    
    isLoading.value = true
    currentStepIndex.value = 0
    progress.value = 0
    startTime.value = Date.now()
    stepStartTime.value = Date.now()
  }
  
  /**
   * Move to next step
   */
  const nextStep = () => {
    if (currentStepIndex.value < totalSteps.value - 1) {
      currentStepIndex.value++
      progress.value = 0
      stepStartTime.value = Date.now()
    }
  }
  
  /**
   * Go to specific step
   */
  const goToStep = (index: number) => {
    if (index >= 0 && index < totalSteps.value) {
      currentStepIndex.value = index
      progress.value = 0
      stepStartTime.value = Date.now()
    }
  }
  
  /**
   * Update progress within current step (0-100)
   */
  const updateProgress = (value: number) => {
    progress.value = Math.min(100, Math.max(0, value))
  }
  
  /**
   * Complete loading
   */
  const complete = () => {
    progress.value = 100
    currentStepIndex.value = totalSteps.value - 1
    
    setTimeout(() => {
      isLoading.value = false
      currentStepIndex.value = 0
      progress.value = 0
      startTime.value = null
      stepStartTime.value = null
    }, 300)
  }
  
  /**
   * Cancel/reset loading
   */
  const reset = () => {
    isLoading.value = false
    currentStepIndex.value = 0
    progress.value = 0
    startTime.value = null
    stepStartTime.value = null
  }
  
  /**
   * Auto-progress through steps with timing
   */
  const autoProgress = async (onComplete?: () => void) => {
    start()
    
    for (let i = 0; i < loadingSteps.value.length; i++) {
      const step = loadingSteps.value[i]
      const duration = step.duration || 1000
      const interval = duration / 100
      
      for (let p = 0; p <= 100; p += 5) {
        if (!isLoading.value) return // cancelled
        updateProgress(p)
        await new Promise(resolve => setTimeout(resolve, interval * 5))
      }
      
      if (i < loadingSteps.value.length - 1) {
        nextStep()
      }
    }
    
    complete()
    onComplete?.()
  }
  
  /**
   * Execute async function with loading states
   */
  const withLoading = async <T>(
    fn: () => Promise<T>,
    steps?: LoadingStep[]
  ): Promise<T> => {
    start(steps)
    
    try {
      // Auto-progress simulation
      const progressInterval = setInterval(() => {
        if (progress.value < 90) {
          updateProgress(progress.value + 5)
        }
      }, 200)
      
      const result = await fn()
      
      clearInterval(progressInterval)
      complete()
      
      return result
    } catch (error) {
      reset()
      throw error
    }
  }
  
  return {
    // State
    isLoading,
    currentStepIndex,
    progress,
    state,
    
    // Computed
    currentStep,
    totalSteps,
    currentLabel,
    currentDescription,
    progressPercentage,
    estimatedTimeRemaining,
    
    // Actions
    setSteps,
    usePreset,
    start,
    nextStep,
    goToStep,
    updateProgress,
    complete,
    reset,
    autoProgress,
    withLoading,
    
    // Presets
    defaultSteps
  }
}

export default useProgressiveLoading
