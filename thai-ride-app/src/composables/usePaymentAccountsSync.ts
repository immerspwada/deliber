import { ref, watch } from 'vue'
import { supabase } from '@/lib/supabase'
import { useWalletStore } from '@/stores/wallet'

export interface PromptPayAccount {
  id: string
  phone: string
  name: string
  qr_code_url?: string
}

export interface BankAccount {
  id: string
  bank_code: string
  bank_name: string
  account_number: string
  account_name: string
  qr_code_url?: string
}

export function usePaymentAccountsSync() {
  const walletStore = useWalletStore()
  const promptPayAccounts = ref<PromptPayAccount[]>([])
  const bankAccounts = ref<BankAccount[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // โหลดบัญชีพร้อมเพย์และธนาคารจากการตั้งค่า
  async function loadPromptPayAccounts() {
    loading.value = true
    error.value = null

    try {
      // @ts-ignore
      const { data, error: rpcError } = await supabase.rpc(
        'get_system_settings',
        { 
          p_category: 'topup',
          p_key: 'topup_settings' 
        }
      ) as any

      if (rpcError) throw rpcError

      if (data && data.length > 0) {
        const settings = data[0]?.value
        if (settings?.promptpay_accounts) {
          promptPayAccounts.value = settings.promptpay_accounts
        }
        if (settings?.bank_accounts) {
          bankAccounts.value = settings.bank_accounts
        }
        // ซิงค์ไปยัง wallet store
        await syncToWalletStore()
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'เกิดข้อผิดพลาด'
      console.error('[usePaymentAccountsSync] Error loading accounts:', e)
    } finally {
      loading.value = false
    }
  }

  // ซิงค์บัญชีพร้อมเพย์และธนาคารไปยัง wallet store
  async function syncToWalletStore() {
    try {
      // แปลงข้อมูลพร้อมเพย์
      const promptPayPaymentAccounts = promptPayAccounts.value.map((account) => ({
        id: account.id,
        account_type: 'promptpay' as const,
        account_name: account.name,
        account_number: account.phone,
        bank_code: null,
        bank_name: null,
        qr_code_url: account.qr_code_url || null,
        display_name: account.name,
        description: `พร้อมเพย์: ${account.phone}`,
      }))

      // แปลงข้อมูลธนาคาร
      const bankPaymentAccounts = bankAccounts.value.map((account) => ({
        id: account.id,
        account_type: 'bank_transfer' as const,
        account_name: account.account_name,
        account_number: account.account_number,
        bank_code: account.bank_code,
        bank_name: account.bank_name,
        qr_code_url: account.qr_code_url || null,
        display_name: account.bank_name,
        description: `${account.bank_name}: ${account.account_number}`,
      }))

      // รวมทั้งสองประเภท
      const allPaymentAccounts = [...promptPayPaymentAccounts, ...bankPaymentAccounts]

      // อัปเดต wallet store
      walletStore.paymentAccounts.value = allPaymentAccounts

      // บันทึกลงฐานข้อมูล (ถ้าจำเป็น)
      await savePaymentAccountsToDatabase(allPaymentAccounts)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'เกิดข้อผิดพลาด'
      console.error('[usePaymentAccountsSync] Error syncing to wallet store:', e)
    }
  }

  // บันทึกบัญชีการชำระเงินลงฐานข้อมูล
  async function savePaymentAccountsToDatabase(accounts: any[]) {
    try {
      // @ts-ignore
      const { error: rpcError } = await supabase.rpc(
        'set_system_settings',
        {
          p_category: 'wallet',
          p_key: 'payment_accounts',
          p_value: accounts,
          p_updated_by: (await supabase.auth.getUser()).data.user?.id,
        }
      ) as any

      if (rpcError) throw rpcError
    } catch (e) {
      console.error('[usePaymentAccountsSync] Error saving to database:', e)
    }
  }

  // ดึงข้อมูลบัญชีพร้อมเพย์ที่ใช้งาน
  async function getActivePromptPayAccounts() {
    await loadPromptPayAccounts()
    return promptPayAccounts.value
  }

  // ดึงข้อมูลบัญชีธนาคารที่ใช้งาน
  async function getActiveBankAccounts() {
    await loadPromptPayAccounts()
    return bankAccounts.value
  }

  // ตรวจสอบว่ามีบัญชีพร้อมเพย์ที่ใช้งานหรือไม่
  function hasActivePromptPayAccounts(): boolean {
    return promptPayAccounts.value.length > 0
  }

  // ตรวจสอบว่ามีบัญชีธนาคารที่ใช้งานหรือไม่
  function hasActiveBankAccounts(): boolean {
    return bankAccounts.value.length > 0
  }

  // ดึงบัญชีพร้อมเพย์แรก
  function getFirstPromptPayAccount(): PromptPayAccount | null {
    return promptPayAccounts.value.length > 0 ? promptPayAccounts.value[0] : null
  }

  // ดึงบัญชีธนาคารแรก
  function getFirstBankAccount(): BankAccount | null {
    return bankAccounts.value.length > 0 ? bankAccounts.value[0] : null
  }

  return {
    promptPayAccounts,
    bankAccounts,
    loading,
    error,
    loadPromptPayAccounts,
    syncToWalletStore,
    getActivePromptPayAccounts,
    getActiveBankAccounts,
    hasActivePromptPayAccounts,
    hasActiveBankAccounts,
    getFirstPromptPayAccount,
    getFirstBankAccount,
  }
}
