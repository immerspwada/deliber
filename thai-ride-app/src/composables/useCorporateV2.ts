/**
 * useCorporateV2 - Enhanced Corporate Account Features
 * 
 * Feature: F22 - Corporate Account Features V2
 * Tables: company_departments, corporate_budgets, corporate_ride_approvals,
 *         corporate_reports, corporate_billing, corporate_settings
 * Migration: 070_corporate_v2.sql
 * 
 * @syncs-with
 * - Customer (Employee): Book rides, request approvals
 * - Corporate Admin: Manage departments, budgets, approvals
 * - Admin: Manage companies, billing
 */

import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'

// Types
export interface CompanyDepartment {
  id: string
  company_id: string
  name: string
  code?: string
  description?: string
  monthly_budget?: number
  current_month_spent: number
  budget_alert_threshold: number
  manager_id?: string
  require_approval: boolean
  approval_threshold?: number
  is_active: boolean
}

export interface CorporateBudget {
  id: string
  company_id: string
  department_id?: string
  budget_type: 'monthly' | 'quarterly' | 'annual' | 'project'
  budget_name: string
  total_amount: number
  spent_amount: number
  reserved_amount: number
  start_date: string
  end_date: string
  allow_overspend: boolean
  overspend_limit_pct: number
  status: 'active' | 'exhausted' | 'expired' | 'suspended'
}

export interface RideApproval {
  id: string
  company_id: string
  department_id?: string
  employee_id: string
  ride_request_id?: string
  estimated_fare: number
  purpose?: string
  destination?: string
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  approver_id?: string
  approved_at?: string
  rejection_reason?: string
  budget_id?: string
  created_at: string
  expires_at?: string
  employee?: any
  approver?: any
}

export interface CorporateReport {
  id: string
  company_id: string
  report_type: 'monthly' | 'quarterly' | 'annual' | 'custom'
  report_name: string
  period_start: string
  period_end: string
  summary_data: any
  department_breakdown?: any
  employee_breakdown?: any
  file_url?: string
  file_format?: string
  generated_at: string
}

export interface CorporateBilling {
  id: string
  company_id: string
  billing_period_start: string
  billing_period_end: string
  subtotal: number
  tax_amount: number
  discount_amount: number
  total_amount: number
  total_rides: number
  total_deliveries: number
  status: 'pending' | 'sent' | 'paid' | 'overdue' | 'cancelled'
  invoice_number?: string
  invoice_url?: string
  due_date?: string
  paid_at?: string
}

export interface CorporateSettings {
  id: string
  company_id: string
  allow_personal_rides: boolean
  require_purpose: boolean
  require_project_code: boolean
  max_fare_without_approval: number
  allowed_vehicle_types: string[]
  allowed_booking_hours?: { start: string; end: string }
  allowed_days: string[]
  notify_manager_on_booking: boolean
  notify_on_budget_threshold: boolean
  billing_email?: string
  billing_cycle: 'weekly' | 'biweekly' | 'monthly'
  payment_terms_days: number
}

export interface CorporateDashboard {
  total_employees: number
  active_employees: number
  total_rides_this_month: number
  total_spent_this_month: number
  budget_remaining: number
  pending_approvals: number
  departments_count: number
}

export function useCorporateV2() {
  const authStore = useAuthStore()
  const loading = ref(false)
  const error = ref<string | null>(null)

  // State
  const company = ref<any>(null)
  const employee = ref<any>(null)
  const departments = ref<CompanyDepartment[]>([])
  const budgets = ref<CorporateBudget[]>([])
  const approvals = ref<RideApproval[]>([])
  const reports = ref<CorporateReport[]>([])
  const billing = ref<CorporateBilling[]>([])
  const settings = ref<CorporateSettings | null>(null)
  const dashboard = ref<CorporateDashboard | null>(null)

  // Computed
  const activeBudgets = computed(() => 
    budgets.value.filter(b => b.status === 'active')
  )

  const pendingApprovals = computed(() => 
    approvals.value.filter(a => a.status === 'pending')
  )

  const totalBudgetRemaining = computed(() => 
    activeBudgets.value.reduce((sum, b) => sum + (b.total_amount - b.spent_amount), 0)
  )

  const isManager = computed(() => 
    employee.value?.can_approve || false
  )

  // =====================================================
  // EMPLOYEE FUNCTIONS
  // =====================================================

  /**
   * Fetch employee's company info
   */
  const fetchMyCompany = async () => {
    if (!authStore.user?.id) return

    try {
      // Get employee record
      const { data: empData, error: empErr } = await supabase
        .from('company_employees')
        .select('*, company:companies(*), department:company_departments(*)')
        .eq('user_id', authStore.user.id)
        .single()

      if (empErr && empErr.code !== 'PGRST116') throw empErr
      
      if (empData) {
        employee.value = empData
        company.value = empData.company

        // Fetch settings
        await fetchSettings(empData.company_id)
      }
    } catch (e: any) {
      console.error('Fetch company error:', e)
    }
  }

  /**
   * Check if ride needs approval
   */
  const checkApprovalRequired = async (estimatedFare: number): Promise<{
    requires: boolean
    reason?: string
    approverId?: string
  }> => {
    if (!employee.value?.id) return { requires: false }

    try {
      const { data, error: err } = await supabase
        .rpc('check_corporate_approval_required', {
          p_employee_id: employee.value.id,
          p_estimated_fare: estimatedFare
        })

      if (err) throw err
      
      const result = data?.[0]
      return {
        requires: result?.requires_approval || false,
        reason: result?.reason,
        approverId: result?.approver_id
      }
    } catch (e: any) {
      console.error('Check approval error:', e)
      return { requires: false }
    }
  }

  /**
   * Request ride approval
   */
  const requestApproval = async (
    estimatedFare: number,
    purpose: string,
    destination: string,
    budgetId?: string
  ): Promise<string | null> => {
    if (!employee.value?.id) return null

    try {
      const { data, error: err } = await supabase
        .rpc('request_corporate_approval', {
          p_employee_id: employee.value.id,
          p_estimated_fare: estimatedFare,
          p_purpose: purpose,
          p_destination: destination,
          p_budget_id: budgetId
        })

      if (err) throw err
      return data
    } catch (e: any) {
      console.error('Request approval error:', e)
      return null
    }
  }

  /**
   * Fetch my approval requests
   */
  const fetchMyApprovals = async () => {
    if (!employee.value?.id) return

    try {
      const { data, error: err } = await supabase
        .from('corporate_ride_approvals')
        .select('*, approver:company_employees!approver_id(*, user:users(name))')
        .eq('employee_id', employee.value.id)
        .order('created_at', { ascending: false })

      if (err) throw err
      approvals.value = data || []
    } catch (e: any) {
      console.error('Fetch approvals error:', e)
    }
  }

  /**
   * Cancel approval request
   */
  const cancelApproval = async (approvalId: string): Promise<boolean> => {
    try {
      const { error: err } = await supabase
        .from('corporate_ride_approvals')
        .update({ status: 'cancelled' })
        .eq('id', approvalId)
        .eq('status', 'pending')

      if (err) throw err
      await fetchMyApprovals()
      return true
    } catch (e: any) {
      console.error('Cancel approval error:', e)
      return false
    }
  }

  // =====================================================
  // MANAGER FUNCTIONS
  // =====================================================

  /**
   * Fetch pending approvals for manager
   */
  const fetchPendingForApproval = async () => {
    if (!employee.value?.id || !employee.value.can_approve) return

    try {
      const { data, error: err } = await supabase
        .from('corporate_ride_approvals')
        .select('*, employee:company_employees!employee_id(*, user:users(name))')
        .eq('company_id', company.value.id)
        .eq('status', 'pending')
        .order('created_at')

      if (err) throw err
      approvals.value = data || []
    } catch (e: any) {
      console.error('Fetch pending approvals error:', e)
    }
  }

  /**
   * Approve ride request
   */
  const approveRide = async (approvalId: string): Promise<boolean> => {
    if (!employee.value?.id) return false

    try {
      const { data, error: err } = await supabase
        .rpc('process_corporate_approval', {
          p_approval_id: approvalId,
          p_approver_id: employee.value.id,
          p_approved: true
        })

      if (err) throw err
      await fetchPendingForApproval()
      return data || false
    } catch (e: any) {
      console.error('Approve ride error:', e)
      return false
    }
  }

  /**
   * Reject ride request
   */
  const rejectRide = async (approvalId: string, reason: string): Promise<boolean> => {
    if (!employee.value?.id) return false

    try {
      const { data, error: err } = await supabase
        .rpc('process_corporate_approval', {
          p_approval_id: approvalId,
          p_approver_id: employee.value.id,
          p_approved: false,
          p_rejection_reason: reason
        })

      if (err) throw err
      await fetchPendingForApproval()
      return data || false
    } catch (e: any) {
      console.error('Reject ride error:', e)
      return false
    }
  }

  // =====================================================
  // CORPORATE ADMIN FUNCTIONS
  // =====================================================

  /**
   * Fetch departments
   */
  const fetchDepartments = async () => {
    if (!company.value?.id) return

    try {
      const { data, error: err } = await supabase
        .from('company_departments')
        .select('*')
        .eq('company_id', company.value.id)
        .order('name')

      if (err) throw err
      departments.value = data || []
    } catch (e: any) {
      console.error('Fetch departments error:', e)
    }
  }

  /**
   * Create department
   */
  const createDepartment = async (dept: Partial<CompanyDepartment>): Promise<CompanyDepartment | null> => {
    if (!company.value?.id) return null

    try {
      const { data, error: err } = await supabase
        .from('company_departments')
        .insert({ ...dept, company_id: company.value.id })
        .select()
        .single()

      if (err) throw err
      departments.value.push(data)
      return data
    } catch (e: any) {
      console.error('Create department error:', e)
      return null
    }
  }

  /**
   * Update department
   */
  const updateDepartment = async (id: string, updates: Partial<CompanyDepartment>): Promise<boolean> => {
    try {
      const { error: err } = await supabase
        .from('company_departments')
        .update(updates)
        .eq('id', id)

      if (err) throw err
      await fetchDepartments()
      return true
    } catch (e: any) {
      console.error('Update department error:', e)
      return false
    }
  }

  /**
   * Fetch budgets
   */
  const fetchBudgets = async () => {
    if (!company.value?.id) return

    try {
      const { data, error: err } = await supabase
        .from('corporate_budgets')
        .select('*, department:company_departments(name)')
        .eq('company_id', company.value.id)
        .order('start_date', { ascending: false })

      if (err) throw err
      budgets.value = data || []
    } catch (e: any) {
      console.error('Fetch budgets error:', e)
    }
  }

  /**
   * Create budget
   */
  const createBudget = async (budget: Partial<CorporateBudget>): Promise<CorporateBudget | null> => {
    if (!company.value?.id) return null

    try {
      const { data, error: err } = await supabase
        .from('corporate_budgets')
        .insert({ ...budget, company_id: company.value.id })
        .select()
        .single()

      if (err) throw err
      budgets.value.push(data)
      return data
    } catch (e: any) {
      console.error('Create budget error:', e)
      return null
    }
  }

  /**
   * Fetch settings
   */
  const fetchSettings = async (companyId?: string) => {
    const cid = companyId || company.value?.id
    if (!cid) return

    try {
      const { data, error: err } = await supabase
        .from('corporate_settings')
        .select('*')
        .eq('company_id', cid)
        .single()

      if (err && err.code !== 'PGRST116') throw err
      settings.value = data
    } catch (e: any) {
      console.error('Fetch settings error:', e)
    }
  }

  /**
   * Update settings
   */
  const updateSettings = async (updates: Partial<CorporateSettings>): Promise<boolean> => {
    if (!company.value?.id) return false

    try {
      const { error: err } = await supabase
        .from('corporate_settings')
        .upsert({
          company_id: company.value.id,
          ...updates,
          updated_at: new Date().toISOString()
        }, { onConflict: 'company_id' })

      if (err) throw err
      await fetchSettings()
      return true
    } catch (e: any) {
      console.error('Update settings error:', e)
      return false
    }
  }

  /**
   * Fetch dashboard stats
   */
  const fetchDashboard = async () => {
    if (!company.value?.id) return

    try {
      const { data, error: err } = await supabase
        .rpc('get_corporate_dashboard', { p_company_id: company.value.id })

      if (err) throw err
      dashboard.value = data?.[0] || null
    } catch (e: any) {
      console.error('Fetch dashboard error:', e)
    }
  }

  /**
   * Generate report
   */
  const generateReport = async (month: Date): Promise<string | null> => {
    if (!company.value?.id) return null

    try {
      const { data, error: err } = await supabase
        .rpc('generate_corporate_report', {
          p_company_id: company.value.id,
          p_month: month.toISOString().split('T')[0]
        })

      if (err) throw err
      await fetchReports()
      return data
    } catch (e: any) {
      console.error('Generate report error:', e)
      return null
    }
  }

  /**
   * Fetch reports
   */
  const fetchReports = async () => {
    if (!company.value?.id) return

    try {
      const { data, error: err } = await supabase
        .from('corporate_reports')
        .select('*')
        .eq('company_id', company.value.id)
        .order('generated_at', { ascending: false })

      if (err) throw err
      reports.value = data || []
    } catch (e: any) {
      console.error('Fetch reports error:', e)
    }
  }

  /**
   * Fetch billing
   */
  const fetchBilling = async () => {
    if (!company.value?.id) return

    try {
      const { data, error: err } = await supabase
        .from('corporate_billing')
        .select('*')
        .eq('company_id', company.value.id)
        .order('billing_period_start', { ascending: false })

      if (err) throw err
      billing.value = data || []
    } catch (e: any) {
      console.error('Fetch billing error:', e)
    }
  }

  /**
   * Initialize corporate features
   */
  const init = async () => {
    loading.value = true
    try {
      await fetchMyCompany()
      if (company.value) {
        await Promise.all([
          fetchDepartments(),
          fetchBudgets(),
          fetchDashboard()
        ])
      }
    } finally {
      loading.value = false
    }
  }

  return {
    // State
    loading,
    error,
    company,
    employee,
    departments,
    budgets,
    approvals,
    reports,
    billing,
    settings,
    dashboard,

    // Computed
    activeBudgets,
    pendingApprovals,
    totalBudgetRemaining,
    isManager,

    // Employee functions
    fetchMyCompany,
    checkApprovalRequired,
    requestApproval,
    fetchMyApprovals,
    cancelApproval,

    // Manager functions
    fetchPendingForApproval,
    approveRide,
    rejectRide,

    // Corporate admin functions
    fetchDepartments,
    createDepartment,
    updateDepartment,
    fetchBudgets,
    createBudget,
    fetchSettings,
    updateSettings,
    fetchDashboard,
    generateReport,
    fetchReports,
    fetchBilling,

    // Init
    init
  }
}
