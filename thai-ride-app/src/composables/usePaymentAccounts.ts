/**
 * Composable for managing payment receiving accounts
 * Handles CRUD operations for payment accounts in admin panel
 */

import { ref } from 'vue'
import { supabase } from '@/lib/supabase'

export interface PaymentAccount {
  id: string
  account_type: 'bank_transfer' | 'promptpay'
  account_name: string
  account_number: string
  bank_code?: string
  bank_name?: string
  qr_code_url?: string
  display_name?: string
  description?: string
  is_active: boolean
  is_default: boolean
  sort_order: number
}

export function usePaymentAccounts() {
  const accounts = ref<PaymentAccount[]>([])
  const loading = ref(false)

  async function loadAccounts() {
    loading.value = true
    try {
      const { data, error } = await supabase
        .from('payment_receiving_accounts')
        .select('*')
        .order('sort_order', { ascending: true })

      if (error) throw error
      accounts.value = data || []
      return { success: true, data }
    } catch (err) {
      console.error('[usePaymentAccounts] Load error:', err)
      return { success: false, error: err }
    } finally {
      loading.value = false
    }
  }

  async function createAccount(account: Omit<PaymentAccount, 'id'>) {
    loading.value = true
    try {
      const { data, error } = await supabase
        .from('payment_receiving_accounts')
        .insert([account])
        .select()
        .single()

      if (error) throw error
      
      accounts.value.push(data)
      return { success: true, data }
    } catch (err) {
      console.error('[usePaymentAccounts] Create error:', err)
      return { success: false, error: err }
    } finally {
      loading.value = false
    }
  }

  async function updateAccount(id: string, updates: Partial<PaymentAccount>) {
    loading.value = true
    try {
      const { data, error } = await supabase
        .from('payment_receiving_accounts')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      const index = accounts.value.findIndex(a => a.id === id)
      if (index !== -1) {
        accounts.value[index] = data
      }
      
      return { success: true, data }
    } catch (err) {
      console.error('[usePaymentAccounts] Update error:', err)
      return { success: false, error: err }
    } finally {
      loading.value = false
    }
  }

  async function deleteAccount(id: string) {
    loading.value = true
    try {
      const { error } = await supabase
        .from('payment_receiving_accounts')
        .delete()
        .eq('id', id)

      if (error) throw error

      accounts.value = accounts.value.filter(a => a.id !== id)
      return { success: true }
    } catch (err) {
      console.error('[usePaymentAccounts] Delete error:', err)
      return { success: false, error: err }
    } finally {
      loading.value = false
    }
  }

  async function uploadQRCode(file: File, accountId: string): Promise<string | null> {
    try {
      // Compress image if it's too large
      let fileToUpload = file;
      
      if (file.size > 2 * 1024 * 1024) { // If larger than 2MB
        // Create a canvas to compress the image
        const img = new Image();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = URL.createObjectURL(file);
        });
        
        // Calculate new dimensions (max 1024x1024)
        let width = img.width;
        let height = img.height;
        const maxSize = 1024;
        
        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = (height / width) * maxSize;
            width = maxSize;
          } else {
            width = (width / height) * maxSize;
            height = maxSize;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Convert to blob with compression
        const blob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.8);
        });
        
        fileToUpload = new File([blob], file.name, { type: 'image/jpeg' });
        URL.revokeObjectURL(img.src);
      }

      const fileExt = fileToUpload.name.split('.').pop() || 'jpg'
      const fileName = `qr_${accountId}_${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('payment-qr')
        .upload(fileName, fileToUpload, {
          upsert: false,
          contentType: fileToUpload.type
        })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('payment-qr')
        .getPublicUrl(fileName)

      return urlData.publicUrl
    } catch (err) {
      console.error('[usePaymentAccounts] Upload QR error:', err)
      return null
    }
  }

  return {
    accounts,
    loading,
    loadAccounts,
    createAccount,
    updateAccount,
    deleteAccount,
    uploadQRCode
  }
}
