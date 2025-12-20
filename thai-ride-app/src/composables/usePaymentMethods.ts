import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'

// Database schema types (matches payment_methods table)
export interface PaymentMethodDB {
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
  created_at?: string
  updated_at?: string
}

// UI display types (includes virtual cash option)
export interface PaymentMethod {
  id: string
  type: 'promptpay' | 'card' | 'bank' | 'cash' | 'credit_card' | 'debit_card' | 'mobile_banking'
  name: string
  detail: string
  card_brand?: string
  card_last4?: string
  is_default: boolean
  is_verified: boolean
}

// Validation helpers
const validatePhone = (phone: string): boolean => {
  const cleaned = phone.replace(/\D/g, '')
  return cleaned.length === 10 && cleaned.startsWith('0')
}

const validateCardNumber = (cardNumber: string): boolean => {
  const cleaned = cardNumber.replace(/\D/g, '')
  return cleaned.length >= 13 && cleaned.length <= 19
}

const formatPhoneDisplay = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)}-XXX-${cleaned.slice(-4)}`
  }
  return phone
}

// Map DB type to UI type
function mapDBToUI(dbMethod: PaymentMethodDB): PaymentMethod {
  const typeMap: Record<string, PaymentMethod['type']> = {
    'credit_card': 'card',
    'debit_card': 'card',
    'promptpay': 'promptpay',
    'mobile_banking': 'bank'
  }
  
  let detail = ''
  if (dbMethod.type === 'promptpay') {
    const phone = dbMethod.metadata?.phone as string
    detail = phone ? formatPhoneDisplay(phone) : 'พร้อมเพย์'
  } else if (dbMethod.type === 'credit_card' || dbMethod.type === 'debit_card') {
    detail = dbMethod.last_four ? `**** **** **** ${dbMethod.last_four}` : 'บัตร'
  } else if (dbMethod.type === 'mobile_banking') {
    detail = dbMethod.bank_name || 'Mobile Banking'
  }
  
  return {
    id: dbMethod.id,
    type: typeMap[dbMethod.type] || dbMethod.type,
    name: dbMethod.name,
    detail,
    card_brand: dbMethod.brand,
    card_last4: dbMethod.last_four,
    is_default: dbMethod.is_default,
    is_verified: dbMethod.is_active
  }
}

export function usePaymentMethods() {
  const authStore = useAuthStore()
  const paymentMethods = ref<PaymentMethod[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const tableExists = ref(true)

  const defaultMethod = computed(() => 
    paymentMethods.value.find(m => m.is_default) || paymentMethods.value[0]
  )

  // Cash option (virtual - not stored in DB)
  const cashOption: PaymentMethod = {
    id: 'cash',
    type: 'cash',
    name: 'เงินสด',
    detail: 'ชำระเงินสดกับคนขับ',
    is_default: false,
    is_verified: true
  }

  // Check if table exists
  const checkTableExists = async (): Promise<boolean> => {
    try {
      const { error: checkError } = await (supabase
        .from('payment_methods') as any)
        .select('id')
        .limit(1)
      
      // If error contains "does not exist" or similar, table doesn't exist
      if (checkError?.message?.includes('does not exist') || 
          checkError?.message?.includes('relation') ||
          checkError?.code === '42P01') {
        tableExists.value = false
        return false
      }
      tableExists.value = true
      return true
    } catch {
      tableExists.value = false
      return false
    }
  }

  // Fetch payment methods
  const fetchPaymentMethods = async () => {
    // Not logged in - show only cash
    if (!authStore.user?.id) {
      paymentMethods.value = [{ ...cashOption, is_default: true }]
      return paymentMethods.value
    }

    loading.value = true
    error.value = null
    
    try {
      // Check if table exists first
      const exists = await checkTableExists()
      if (!exists) {
        console.warn('[usePaymentMethods] Table does not exist, showing cash only')
        paymentMethods.value = [{ ...cashOption, is_default: true }]
        return paymentMethods.value
      }

      const { data, error: fetchError } = await (supabase
        .from('payment_methods') as any)
        .select('*')
        .eq('user_id', authStore.user.id)
        .eq('is_active', true)
        .order('is_default', { ascending: false })

      if (fetchError) {
        console.error('[usePaymentMethods] Fetch error:', fetchError)
        // Don't show error to user, just fallback to cash
        paymentMethods.value = [{ ...cashOption, is_default: true }]
        return paymentMethods.value
      }

      // Map DB records to UI format
      const mappedMethods = (data || []).map(mapDBToUI)
      
      // Always include cash option at the end
      const hasCash = mappedMethods.some(m => m.type === 'cash')
      if (!hasCash) {
        mappedMethods.push({
          ...cashOption,
          is_default: mappedMethods.length === 0
        })
      }

      paymentMethods.value = mappedMethods
      return paymentMethods.value
    } catch (err) {
      console.error('[usePaymentMethods] Exception:', err)
      paymentMethods.value = [{ ...cashOption, is_default: true }]
      return paymentMethods.value
    } finally {
      loading.value = false
    }
  }

  // Add payment method
  const addPaymentMethod = async (method: Omit<PaymentMethod, 'id' | 'is_verified'>) => {
    if (!authStore.user?.id) {
      error.value = 'กรุณาเข้าสู่ระบบก่อน'
      return null
    }

    // Validate input
    if (method.type === 'promptpay') {
      if (!method.detail || !validatePhone(method.detail)) {
        error.value = 'กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง (10 หลัก)'
        return null
      }
    } else if (method.type === 'card') {
      if (!method.card_last4 || method.card_last4.length !== 4) {
        error.value = 'กรุณากรอกหมายเลขบัตรให้ถูกต้อง'
        return null
      }
    }

    // Check if table exists
    if (!tableExists.value) {
      const exists = await checkTableExists()
      if (!exists) {
        error.value = 'ระบบยังไม่พร้อมใช้งาน กรุณาลองใหม่ภายหลัง'
        return null
      }
    }

    loading.value = true
    error.value = null

    try {
      // Map UI type to DB type
      const typeMap: Record<string, PaymentMethodDB['type']> = {
        'card': 'credit_card',
        'promptpay': 'promptpay',
        'bank': 'mobile_banking'
      }
      
      const dbType = typeMap[method.type] || 'credit_card'

      // If setting as default, unset others first
      if (method.is_default) {
        await (supabase
          .from('payment_methods') as any)
          .update({ is_default: false })
          .eq('user_id', authStore.user.id)
      }

      // Prepare insert data
      const insertData: Partial<PaymentMethodDB> = {
        user_id: authStore.user.id,
        type: dbType,
        name: method.name,
        is_default: method.is_default,
        is_active: true
      }

      // Add type-specific fields
      if (method.type === 'card' && method.card_last4) {
        insertData.last_four = method.card_last4
        insertData.brand = method.card_brand
      } else if (method.type === 'promptpay') {
        // Store clean phone number
        const cleanPhone = method.detail.replace(/\D/g, '')
        insertData.metadata = { phone: cleanPhone }
      } else if (method.type === 'bank') {
        insertData.bank_name = method.detail
      }

      const { data, error: insertError } = await (supabase
        .from('payment_methods') as any)
        .insert(insertData)
        .select()
        .maybeSingle()

      if (insertError) {
        console.error('[usePaymentMethods] Insert error:', insertError)
        error.value = 'ไม่สามารถเพิ่มวิธีการชำระเงินได้'
        return null
      }

      if (data) {
        // Update local state
        if (method.is_default) {
          paymentMethods.value.forEach(m => m.is_default = false)
        }
        // Insert at beginning (before cash)
        const cashIndex = paymentMethods.value.findIndex(m => m.type === 'cash')
        if (cashIndex > 0) {
          paymentMethods.value.splice(cashIndex, 0, mapDBToUI(data))
        } else {
          paymentMethods.value.unshift(mapDBToUI(data))
        }
      }
      
      return data
    } catch (err) {
      console.error('[usePaymentMethods] Add exception:', err)
      error.value = 'ไม่สามารถเพิ่มวิธีการชำระเงินได้'
      return null
    } finally {
      loading.value = false
    }
  }

  // Set default payment method
  const setDefaultMethod = async (id: string) => {
    // Update local state immediately (optimistic update)
    paymentMethods.value.forEach(m => m.is_default = m.id === id)

    // Cash is virtual, no DB update needed
    if (!authStore.user?.id || id === 'cash') return true

    try {
      // Unset all defaults
      await (supabase
        .from('payment_methods') as any)
        .update({ is_default: false })
        .eq('user_id', authStore.user.id)

      // Set new default
      const { error: updateError } = await (supabase
        .from('payment_methods') as any)
        .update({ is_default: true })
        .eq('id', id)

      if (updateError) {
        console.error('Error setting default:', updateError)
        // Revert on error
        await fetchPaymentMethods()
        return false
      }

      return true
    } catch (err) {
      console.error('Error setting default payment method:', err)
      await fetchPaymentMethods()
      return false
    }
  }

  // Remove payment method
  const removePaymentMethod = async (id: string) => {
    // Can't remove cash
    if (id === 'cash') return false

    // Optimistic update
    const removedMethod = paymentMethods.value.find(m => m.id === id)
    paymentMethods.value = paymentMethods.value.filter(m => m.id !== id)

    // If removed was default, set first remaining as default
    if (removedMethod?.is_default && paymentMethods.value.length > 0) {
      paymentMethods.value[0].is_default = true
    }

    if (!authStore.user?.id) return true

    try {
      const { error: deleteError } = await (supabase
        .from('payment_methods') as any)
        .delete()
        .eq('id', id)

      if (deleteError) {
        console.error('Error removing payment method:', deleteError)
        // Revert on error
        await fetchPaymentMethods()
        return false
      }

      return true
    } catch (err) {
      console.error('Error removing payment method:', err)
      await fetchPaymentMethods()
      return false
    }
  }

  return {
    paymentMethods,
    loading,
    error,
    defaultMethod,
    tableExists,
    fetchPaymentMethods,
    addPaymentMethod,
    setDefaultMethod,
    removePaymentMethod,
    // Validation helpers
    validatePhone,
    validateCardNumber
  }
}
