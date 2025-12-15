import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'
import type {
  Company,
  CompanyEmployee,
  CorporatePolicy,
  CorporateRideRequest
} from '../types/database'

export function useCorporate() {
  const authStore = useAuthStore()
  const loading = ref(false)
  const error = ref<string | null>(null)

  // State
  const company = ref<Company | null>(null)
  const employeeProfile = ref<CompanyEmployee | null>(null)
  const companyPolicies = ref<CorporatePolicy[]>([])
  const pendingApprovals = ref<CorporateRideRequest[]>([])

  // Check if user is corporate employee
  const checkCorporateStatus = async () => {
    if (!authStore.user?.id) return null
    try {
      const { data, error: err } = await (supabase
        .from('company_employees') as any)
        .select(`
          *,
          company:companies(*)
        `)
        .eq('user_id', authStore.user.id)
        .eq('status', 'active')
        .single()

      if (err && err.code !== 'PGRST116') throw err
      
      if (data) {
        employeeProfile.value = data
        company.value = data.company
        await fetchCompanyPolicies()
      }
      
      return data
    } catch (e: any) {
      error.value = e.message
      return null
    }
  }

  // Fetch company policies
  const fetchCompanyPolicies = async () => {
    if (!company.value?.id) return []
    try {
      const { data, error: err } = await (supabase
        .from('corporate_policies') as any)
        .select('*')
        .eq('company_id', company.value.id)
        .eq('is_active', true)

      if (err) throw err
      companyPolicies.value = data || []
      return data || []
    } catch (e: any) {
      error.value = e.message
      return []
    }
  }

  // Create corporate ride request
  const createCorporateRide = async (rideId: string, params: {
    purpose?: string
    projectCode?: string
    costCenter?: string
    policyId?: string
  }) => {
    if (!employeeProfile.value || !company.value) return null
    try {
      // Check if approval is required
      const policy = params.policyId 
        ? companyPolicies.value.find(p => p.id === params.policyId)
        : companyPolicies.value.find(p => p.is_default)

      const { data, error: err } = await (supabase
        .from('corporate_ride_requests') as any)
        .insert({
          company_id: company.value.id,
          employee_id: employeeProfile.value.id,
          ride_id: rideId,
          policy_id: policy?.id,
          purpose: params.purpose,
          project_code: params.projectCode,
          cost_center: params.costCenter,
          requires_approval: !!policy?.require_approval_above
        })
        .select()
        .single()

      if (err) throw err
      return data
    } catch (e: any) {
      error.value = e.message
      return null
    }
  }

  // Get pending approvals (for managers)
  const fetchPendingApprovals = async () => {
    if (!employeeProfile.value || !['admin', 'manager'].includes(employeeProfile.value.role || '')) {
      return []
    }
    try {
      const { data, error: err } = await (supabase
        .from('corporate_ride_requests') as any)
        .select(`
          *,
          employee:company_employees(*, user:users(*)),
          ride:ride_requests(*)
        `)
        .eq('company_id', company.value?.id)
        .eq('status', 'pending')
        .eq('requires_approval', true)

      if (err) throw err
      pendingApprovals.value = data || []
      return data || []
    } catch (e: any) {
      error.value = e.message
      return []
    }
  }

  // Approve/Reject ride request
  const handleApproval = async (requestId: string, approve: boolean) => {
    if (!employeeProfile.value) return false
    try {
      const { error: err } = await (supabase
        .from('corporate_ride_requests') as any)
        .update({
          status: approve ? 'approved' : 'rejected',
          approved_by: employeeProfile.value.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', requestId)

      if (err) throw err
      await fetchPendingApprovals()
      return true
    } catch (e: any) {
      error.value = e.message
      return false
    }
  }

  // Get employee ride history
  const getEmployeeRideHistory = async (limit = 20) => {
    if (!employeeProfile.value) return []
    try {
      const { data, error: err } = await (supabase
        .from('corporate_ride_requests') as any)
        .select(`
          *,
          ride:ride_requests(*),
          policy:corporate_policies(name)
        `)
        .eq('employee_id', employeeProfile.value.id)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (err) throw err
      return data || []
    } catch (e: any) {
      error.value = e.message
      return []
    }
  }

  // Check if ride is within policy
  const checkPolicyCompliance = (fare: number, rideType: string, policyId?: string) => {
    const policy = policyId 
      ? companyPolicies.value.find(p => p.id === policyId)
      : companyPolicies.value.find(p => p.is_default)

    if (!policy) return { compliant: true, requiresApproval: false }

    const issues: string[] = []
    let requiresApproval = false

    // Check ride type
    if (policy.allowed_ride_types && !policy.allowed_ride_types.includes(rideType)) {
      issues.push(`ประเภทรถ ${rideType} ไม่อยู่ในนโยบาย`)
    }

    // Check max fare
    if (policy.max_fare_per_ride && fare > policy.max_fare_per_ride) {
      issues.push(`ค่าโดยสารเกินกำหนด (สูงสุด ฿${policy.max_fare_per_ride})`)
    }

    // Check if approval required
    if (policy.require_approval_above && fare > policy.require_approval_above) {
      requiresApproval = true
    }

    // Check time restrictions
    if (policy.allowed_hours_start && policy.allowed_hours_end) {
      const now = new Date()
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
      if (currentTime < policy.allowed_hours_start || currentTime > policy.allowed_hours_end) {
        issues.push(`นอกเวลาที่กำหนด (${policy.allowed_hours_start} - ${policy.allowed_hours_end})`)
      }
    }

    // Check day restrictions
    if (policy.allowed_days && policy.allowed_days.length > 0) {
      const today = new Date().getDay() || 7 // Convert Sunday from 0 to 7
      if (!policy.allowed_days.includes(String(today))) {
        issues.push('ไม่อยู่ในวันที่อนุญาต')
      }
    }

    return {
      compliant: issues.length === 0,
      requiresApproval,
      issues
    }
  }

  // Computed
  const isCorporateUser = computed(() => !!employeeProfile.value)
  const isManager = computed(() => ['admin', 'manager'].includes(employeeProfile.value?.role || ''))
  const monthlyLimit = computed(() => employeeProfile.value?.monthly_limit || 0)
  const canBookForOthers = computed(() => employeeProfile.value?.can_book_for_others || false)

  return {
    loading,
    error,
    company,
    employeeProfile,
    companyPolicies,
    pendingApprovals,
    isCorporateUser,
    isManager,
    monthlyLimit,
    canBookForOthers,
    checkCorporateStatus,
    fetchCompanyPolicies,
    createCorporateRide,
    fetchPendingApprovals,
    handleApproval,
    getEmployeeRideHistory,
    checkPolicyCompliance
  }
}
