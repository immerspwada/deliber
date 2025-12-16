/**
 * Feature: Optimistic Updates
 * อัพเดท UI ทันทีก่อน API response แล้ว rollback ถ้า error
 */

import { ref, type Ref } from 'vue'
import { useToast } from './useToast'

interface OptimisticState<T> {
  data: T
  previousData: T | null
  isPending: boolean
  error: string | null
}

export function useOptimisticUpdate<T>(initialData: T) {
  const toast = useToast()
  
  const state = ref<OptimisticState<T>>({
    data: initialData,
    previousData: null,
    isPending: false,
    error: null
  }) as Ref<OptimisticState<T>>

  /**
   * Execute optimistic update
   * @param optimisticData - Data to show immediately
   * @param asyncFn - Async function to execute
   * @param options - Options for rollback behavior
   */
  const execute = async <R>(
    optimisticData: T,
    asyncFn: () => Promise<R>,
    options: {
      onSuccess?: (result: R) => void
      onError?: (error: Error) => void
      rollbackOnError?: boolean
      successMessage?: string
      errorMessage?: string
    } = {}
  ): Promise<R | null> => {
    const {
      onSuccess,
      onError,
      rollbackOnError = true,
      successMessage,
      errorMessage = 'เกิดข้อผิดพลาด กรุณาลองใหม่'
    } = options

    // Store previous data for rollback
    state.value.previousData = JSON.parse(JSON.stringify(state.value.data))
    
    // Apply optimistic update immediately
    state.value.data = optimisticData
    state.value.isPending = true
    state.value.error = null

    try {
      const result = await asyncFn()
      
      // Success - keep optimistic data
      state.value.isPending = false
      state.value.previousData = null
      
      if (successMessage) {
        toast.success(successMessage)
      }
      
      onSuccess?.(result)
      return result
    } catch (err: any) {
      // Error - rollback if enabled
      state.value.isPending = false
      state.value.error = err.message || errorMessage
      
      if (rollbackOnError && state.value.previousData !== null) {
        state.value.data = state.value.previousData
      }
      state.value.previousData = null
      
      toast.error(errorMessage)
      onError?.(err)
      return null
    }
  }

  /**
   * Manual rollback
   */
  const rollback = () => {
    if (state.value.previousData !== null) {
      state.value.data = state.value.previousData
      state.value.previousData = null
    }
  }

  /**
   * Update data directly (without optimistic behavior)
   */
  const setData = (newData: T) => {
    state.value.data = newData
    state.value.previousData = null
    state.value.error = null
  }

  /**
   * Clear error
   */
  const clearError = () => {
    state.value.error = null
  }

  return {
    state,
    execute,
    rollback,
    setData,
    clearError
  }
}

/**
 * Optimistic list operations
 * สำหรับจัดการ list data (add, update, remove)
 */
export function useOptimisticList<T extends { id: string }>(initialItems: T[] = []) {
  const toast = useToast()
  
  const items = ref(initialItems) as Ref<T[]>
  const pendingIds = ref<Set<string>>(new Set())
  const previousItems = ref<T[] | null>(null) as Ref<T[] | null>

  /**
   * Optimistically add item
   */
  const addItem = async (
    item: T,
    asyncFn: () => Promise<T>,
    options: { successMessage?: string; errorMessage?: string } = {}
  ): Promise<T | null> => {
    const { successMessage, errorMessage = 'ไม่สามารถเพิ่มได้' } = options
    
    // Store previous state
    previousItems.value = [...items.value]
    
    // Add optimistically
    items.value = [...items.value, item]
    pendingIds.value.add(item.id)

    try {
      const result = await asyncFn()
      
      // Replace temp item with real item
      items.value = items.value.map(i => i.id === item.id ? result : i)
      pendingIds.value.delete(item.id)
      previousItems.value = null
      
      if (successMessage) toast.success(successMessage)
      return result
    } catch (err: any) {
      // Rollback
      if (previousItems.value) {
        items.value = previousItems.value
      }
      pendingIds.value.delete(item.id)
      previousItems.value = null
      
      toast.error(errorMessage)
      return null
    }
  }

  /**
   * Optimistically update item
   */
  const updateItem = async (
    id: string,
    updates: Partial<T>,
    asyncFn: () => Promise<T>,
    options: { successMessage?: string; errorMessage?: string } = {}
  ): Promise<T | null> => {
    const { successMessage, errorMessage = 'ไม่สามารถอัพเดทได้' } = options
    
    // Store previous state
    previousItems.value = [...items.value]
    
    // Update optimistically
    items.value = items.value.map(item => 
      item.id === id ? { ...item, ...updates } : item
    )
    pendingIds.value.add(id)

    try {
      const result = await asyncFn()
      
      // Replace with real data
      items.value = items.value.map(item => item.id === id ? result : item)
      pendingIds.value.delete(id)
      previousItems.value = null
      
      if (successMessage) toast.success(successMessage)
      return result
    } catch (err: any) {
      // Rollback
      if (previousItems.value) {
        items.value = previousItems.value
      }
      pendingIds.value.delete(id)
      previousItems.value = null
      
      toast.error(errorMessage)
      return null
    }
  }

  /**
   * Optimistically remove item
   */
  const removeItem = async (
    id: string,
    asyncFn: () => Promise<void>,
    options: { successMessage?: string; errorMessage?: string } = {}
  ): Promise<boolean> => {
    const { successMessage, errorMessage = 'ไม่สามารถลบได้' } = options
    
    // Store previous state
    previousItems.value = [...items.value]
    
    // Remove optimistically
    items.value = items.value.filter(item => item.id !== id)
    pendingIds.value.add(id)

    try {
      await asyncFn()
      
      pendingIds.value.delete(id)
      previousItems.value = null
      
      if (successMessage) toast.success(successMessage)
      return true
    } catch (err: any) {
      // Rollback
      if (previousItems.value) {
        items.value = previousItems.value
      }
      pendingIds.value.delete(id)
      previousItems.value = null
      
      toast.error(errorMessage)
      return false
    }
  }

  /**
   * Check if item is pending
   */
  const isPending = (id: string): boolean => {
    return pendingIds.value.has(id)
  }

  /**
   * Set items directly
   */
  const setItems = (newItems: T[]) => {
    items.value = newItems
    pendingIds.value.clear()
    previousItems.value = null
  }

  return {
    items,
    pendingIds,
    addItem,
    updateItem,
    removeItem,
    isPending,
    setItems
  }
}
