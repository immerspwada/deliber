/**
 * useAdminPaymentMethods - Admin Payment Methods Management
 * 
 * Feature: F08 - Payment Methods (Admin Side)
 * Tables: payment_methods, payments
 * 
 * @permissions
 * - View: ดู payment methods ของ users ทั้งหมด
 * - Edit: แก้ไข/ปิดการใช้งาน payment methods
 * - Delete: ลบ payment methods
 */

import { ref } from 'vue'
import { supabase } from '../lib/supabase'

export interface AdminPaymentMethod {
  id: string
  user_id: string
  type: 'credit_card' | 'debit_card' | 'promptpay' | 'mobile_banking'
  name: string
  last_four?: string
  brand?: string
  bank_name?: string
  is_default: boolean
  is_active: boolean
  metadata?: Record<string, unknown>
  created_at: string
  updated_at: string
  // Joined user info
  user?: {
    id: string
    name?: string
    first_name?: string
    last_name?: string
    phone_number?: string
    member_uid?: string
  }
}

export function useAdminPaymentMethods() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Fetch all payment methods with pagination
  const fetchPaymentMethods = async (
    page = 1,
    limit = 20,
    filter?: { userId?: string; type?: string; isActive?: boolean }
  ) => {
    loading.value = true
    error.value = null

    try {
      let query = (supabase
        .from('payment_methods') as any)
        .select(`
          *,
          user:user_id (id, first_name, last_name, phone_number, member_uid)
        `, { count: 'exact' })

      // Apply filters
      if (filter?.userId) {
        query = query.eq('user_id', filter.userId)
      }
      if (filter?.type) {
        query = query.eq('type', filter.type)
      }
      if (filter?.isActive !== undefined) {
        query = query.eq('is_active', filter.isActive)
      }

      const { data, count, error: fetchError } = await query
        .range((page - 1) * limit, page * limit - 1)
        .order('created_at', { ascending: false })

      if (fetchError) {
        console.error('[fetchPaymentMethods] Error:', fetchError)
        error.value = fetchError.message
        return { data: [], total: 0 }
      }

      // Transform data to include user name
      const transformedData = (data || []).map((pm: any) => ({
        ...pm,
        user: pm.user ? {
          ...pm.user,
          name: pm.user.first_name && pm.user.last_name 
            ? `${pm.user.first_name} ${pm.user.last_name}`
            : pm.user.first_name || pm.user.last_name || 'ไม่ระบุชื่อ'
        } : null
      }))

      return { data: transformedData, total: count || 0 }
    } catch (err) {
      console.error('[fetchPaymentMethods] Exception:', err)
      error.value = 'ไม่สามารถโหลดข้อมูลได้'
      return { data: [], total: 0 }
    } finally {
      loading.value = false
    }
  }

  // Fetch payment methods for a specific user
  const fetchUserPaymentMethods = async (userId: string) => {
    loading.value = true
    error.value = null

    try {
      const { data, error: fetchError } = await (supabase
        .from('payment_methods') as any)
        .select('*')
        .eq('user_id', userId)
        .order('is_default', { ascending: false })

      if (fetchError) {
        console.error('[fetchUserPaymentMethods] Error:', fetchError)
        error.value = fetchError.message
        return []
      }

      return data || []
    } catch (err) {
      console.error('[fetchUserPaymentMethods] Exception:', err)
      error.value = 'ไม่สามารถโหลดข้อมูลได้'
      return []
    } finally {
      loading.value = false
    }
  }

  // Toggle payment method active status
  const togglePaymentMethodStatus = async (id: string, isActive: boolean) => {
    try {
      const { error: updateError } = await (supabase
        .from('payment_methods') as any)
        .update({ 
          is_active: isActive,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (updateError) {
        console.error('[togglePaymentMethodStatus] Error:', updateError)
        return { success: false, error: updateError.message }
      }

      return { success: true }
    } catch (err: any) {
      console.error('[togglePaymentMethodStatus] Exception:', err)
      return { success: false, error: err.message }
    }
  }

  // Delete payment method (Admin only)
  const deletePaymentMethod = async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('payment_methods')
        .delete()
        .eq('id', id)

      if (deleteError) {
        console.error('[deletePaymentMethod] Error:', deleteError)
        return { success: false, error: deleteError.message }
      }

      return { success: true }
    } catch (err: any) {
      console.error('[deletePaymentMethod] Exception:', err)
      return { success: false, error: err.message }
    }
  }

  // Set default payment method for user
  const setDefaultPaymentMethod = async (userId: string, methodId: string) => {
    try {
      // Unset all defaults for user
      await (supabase
        .from('payment_methods') as any)
        .update({ is_default: false })
        .eq('user_id', userId)

      // Set new default
      const { error: updateError } = await (supabase
        .from('payment_methods') as any)
        .update({ 
          is_default: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', methodId)

      if (updateError) {
        console.error('[setDefaultPaymentMethod] Error:', updateError)
        return { success: false, error: updateError.message }
      }

      return { success: true }
    } catch (err: any) {
      console.error('[setDefaultPaymentMethod] Exception:', err)
      return { success: false, error: err.message }
    }
  }

  // Get payment methods statistics
  const fetchPaymentMethodsStats = async () => {
    try {
      const [
        { count: totalCount },
        { count: activeCount },
        { count: promptpayCount },
        { count: cardCount },
        { count: bankingCount }
      ] = await Promise.all([
        supabase.from('payment_methods').select('*', { count: 'exact', head: true }),
        supabase.from('payment_methods').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('payment_methods').select('*', { count: 'exact', head: true }).eq('type', 'promptpay'),
        supabase.from('payment_methods').select('*', { count: 'exact', head: true }).in('type', ['credit_card', 'debit_card']),
        supabase.from('payment_methods').select('*', { count: 'exact', head: true }).eq('type', 'mobile_banking')
      ])

      return {
        total: totalCount || 0,
        active: activeCount || 0,
        inactive: (totalCount || 0) - (activeCount || 0),
        byType: {
          promptpay: promptpayCount || 0,
          card: cardCount || 0,
          mobileBanking: bankingCount || 0
        }
      }
    } catch (err) {
      console.error('[fetchPaymentMethodsStats] Error:', err)
      return {
        total: 0,
        active: 0,
        inactive: 0,
        byType: { promptpay: 0, card: 0, mobileBanking: 0 }
      }
    }
  }

  // Format payment method type for display
  const formatPaymentType = (type: string): string => {
    const typeMap: Record<string, string> = {
      'credit_card': 'บัตรเครดิต',
      'debit_card': 'บัตรเดบิต',
      'promptpay': 'พร้อมเพย์',
      'mobile_banking': 'Mobile Banking'
    }
    return typeMap[type] || type
  }

  // Get payment method detail string
  const getPaymentDetail = (method: AdminPaymentMethod): string => {
    if (method.type === 'promptpay') {
      return method.metadata?.phone as string || 'พร้อมเพย์'
    }
    if (method.type === 'credit_card' || method.type === 'debit_card') {
      return method.last_four ? `**** **** **** ${method.last_four}` : 'บัตร'
    }
    if (method.type === 'mobile_banking') {
      return method.bank_name || 'Mobile Banking'
    }
    return method.name
  }

  return {
    loading,
    error,
    fetchPaymentMethods,
    fetchUserPaymentMethods,
    togglePaymentMethodStatus,
    deletePaymentMethod,
    setDefaultPaymentMethod,
    fetchPaymentMethodsStats,
    formatPaymentType,
    getPaymentDetail
  }
}
