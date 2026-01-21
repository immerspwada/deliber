/**
 * useCorporateAccount - Corporate Account Management
 * Feature: F207 - Corporate Accounts
 */

import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'

export interface CorporateAccount {
  id: string
  company_name: string
  tax_id: string
  contact_email: string
  credit_limit: number
  current_balance: number
  status: 'active' | 'suspended' | 'pending'
}

export interface CorporateEmployee {
  id: string
  corporate_id: string
  user_id: string
  employee_id: string
  department: string
  monthly_limit: number
  is_active: boolean
}

export function useCorporateAccount() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const accounts = ref<CorporateAccount[]>([])
  const employees = ref<CorporateEmployee[]>([])

  const activeAccounts = computed(() => accounts.value.filter(a => a.status === 'active'))

  const fetchAccounts = async () => {
    loading.value = true
    try {
      const { data, error: err } = await supabase.from('corporate_accounts').select('*').order('company_name')
      if (err) throw err
      accounts.value = data || []
    } catch (e: any) { error.value = e.message }
    finally { loading.value = false }
  }

  const fetchEmployees = async (corporateId: string) => {
    try {
      const { data, error: err } = await supabase.from('corporate_employees').select('*').eq('corporate_id', corporateId)
      if (err) throw err
      employees.value = data || []
    } catch (e: any) { error.value = e.message }
  }

  const createAccount = async (account: Partial<CorporateAccount>): Promise<CorporateAccount | null> => {
    try {
      const { data, error: err } = await supabase.from('corporate_accounts').insert({ ...account, status: 'pending', current_balance: 0 } as never).select().single()
      if (err) throw err
      accounts.value.push(data)
      return data
    } catch (e: any) { error.value = e.message; return null }
  }

  const getStatusText = (s: string) => ({ active: 'ใช้งาน', suspended: 'ระงับ', pending: 'รอตรวจสอบ' }[s] || s)

  return { loading, error, accounts, employees, activeAccounts, fetchAccounts, fetchEmployees, createAccount, getStatusText }
}
