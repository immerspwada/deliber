import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'

export interface PaymentMethod {
  id: string
  type: 'promptpay' | 'card' | 'bank' | 'cash'
  name: string
  detail: string
  card_brand?: string
  card_last4?: string
  is_default: boolean
  is_verified: boolean
}

export function usePaymentMethods() {
  const authStore = useAuthStore()
  const paymentMethods = ref<PaymentMethod[]>([])
  const loading = ref(false)

  const defaultMethod = computed(() => 
    paymentMethods.value.find(m => m.is_default) || paymentMethods.value[0]
  )

  // Fetch payment methods
  const fetchPaymentMethods = async () => {
    if (!authStore.user?.id) {
      // Demo payment methods
      paymentMethods.value = [
        {
          id: 'cash',
          type: 'cash',
          name: 'เงินสด',
          detail: 'ชำระเงินสดกับคนขับ',
          is_default: true,
          is_verified: true
        }
      ]
      return paymentMethods.value
    }

    loading.value = true
    try {
      const { data, error } = await (supabase
        .from('payment_methods') as any)
        .select('*')
        .eq('user_id', authStore.user.id)
        .order('is_default', { ascending: false })

      if (!error && data) {
        paymentMethods.value = data
      }

      // Always include cash option
      if (!paymentMethods.value.find(m => m.type === 'cash')) {
        paymentMethods.value.push({
          id: 'cash',
          type: 'cash',
          name: 'เงินสด',
          detail: 'ชำระเงินสดกับคนขับ',
          is_default: paymentMethods.value.length === 0,
          is_verified: true
        })
      }

      return paymentMethods.value
    } catch (err) {
      console.error('Error fetching payment methods:', err)
      return []
    } finally {
      loading.value = false
    }
  }

  // Add payment method
  const addPaymentMethod = async (method: Omit<PaymentMethod, 'id' | 'is_verified'>) => {
    if (!authStore.user?.id) return null

    try {
      // If setting as default, unset others
      if (method.is_default) {
        await (supabase
          .from('payment_methods') as any)
          .update({ is_default: false })
          .eq('user_id', authStore.user.id)
      }

      const { data, error } = await (supabase
        .from('payment_methods') as any)
        .insert({
          user_id: authStore.user.id,
          ...method,
          is_verified: method.type === 'cash'
        })
        .select()
        .single()

      if (!error && data) {
        if (method.is_default) {
          paymentMethods.value.forEach(m => m.is_default = false)
        }
        paymentMethods.value.push(data)
      }
      return data
    } catch (err) {
      console.error('Error adding payment method:', err)
      return null
    }
  }

  // Set default payment method
  const setDefaultMethod = async (id: string) => {
    paymentMethods.value.forEach(m => m.is_default = m.id === id)

    if (!authStore.user?.id || id === 'cash') return

    await (supabase
      .from('payment_methods') as any)
      .update({ is_default: false })
      .eq('user_id', authStore.user.id)

    await (supabase
      .from('payment_methods') as any)
      .update({ is_default: true })
      .eq('id', id)
  }

  // Remove payment method
  const removePaymentMethod = async (id: string) => {
    if (id === 'cash') return false

    paymentMethods.value = paymentMethods.value.filter(m => m.id !== id)

    if (!authStore.user?.id) return true

    await (supabase
      .from('payment_methods') as any)
      .delete()
      .eq('id', id)

    return true
  }

  return {
    paymentMethods,
    loading,
    defaultMethod,
    fetchPaymentMethods,
    addPaymentMethod,
    setDefaultMethod,
    removePaymentMethod
  }
}
