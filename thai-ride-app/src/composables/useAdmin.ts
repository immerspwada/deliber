import { ref } from 'vue'
import { supabase } from '../lib/supabase'

// Admin Dashboard Composable
export function useAdmin() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Dashboard Stats
  const stats = ref({
    totalUsers: 0,
    totalProviders: 0,
    totalRides: 0,
    totalDeliveries: 0,
    totalShopping: 0,
    totalRevenue: 0,
    activeRides: 0,
    onlineProviders: 0,
    pendingVerifications: 0,
    openTickets: 0,
    // Advanced features stats
    activeSubscriptions: 0,
    pendingInsuranceClaims: 0,
    scheduledRides: 0,
    activeCompanies: 0
  })

  // Recent data
  const recentOrders = ref<any[]>([])
  const recentUsers = ref<any[]>([])
  const recentPayments = ref<any[]>([])

  // Fetch dashboard overview stats
  const fetchDashboardStats = async () => {
    loading.value = true
    try {
      // Users count
      const { count: usersCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
      
      // Providers count
      const { count: providersCount } = await supabase
        .from('service_providers')
        .select('*', { count: 'exact', head: true })

      // Available providers
      const { count: onlineCount } = await supabase
        .from('service_providers')
        .select('*', { count: 'exact', head: true })
        .eq('is_available', true)

      // Rides count
      const { count: ridesCount } = await supabase
        .from('ride_requests')
        .select('*', { count: 'exact', head: true })

      // Active rides
      const { count: activeRidesCount } = await supabase
        .from('ride_requests')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending', 'matched', 'pickup', 'in_progress'])

      // Deliveries count
      const { count: deliveriesCount } = await supabase
        .from('delivery_requests')
        .select('*', { count: 'exact', head: true })

      // Shopping count
      const { count: shoppingCount } = await supabase
        .from('shopping_requests')
        .select('*', { count: 'exact', head: true })

      // Pending verifications (providers not verified)
      const { count: pendingCount } = await supabase
        .from('service_providers')
        .select('*', { count: 'exact', head: true })
        .eq('is_verified', false)

      // Total revenue from completed payments
      const { data: revenueData } = await supabase
        .from('payments')
        .select('amount')
        .eq('status', 'completed')

      const totalRevenue = (revenueData as any[])?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0

      // Open support tickets
      const { count: ticketsCount } = await supabase
        .from('support_tickets')
        .select('*', { count: 'exact', head: true })
        .in('status', ['open', 'in_progress'])

      // Active subscriptions
      const { count: subscriptionsCount } = await supabase
        .from('user_subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')

      // Pending insurance claims
      const { count: insuranceClaimsCount } = await supabase
        .from('insurance_claims')
        .select('*', { count: 'exact', head: true })
        .in('status', ['submitted', 'under_review'])

      // Scheduled rides
      const { count: scheduledCount } = await supabase
        .from('scheduled_rides')
        .select('*', { count: 'exact', head: true })
        .in('status', ['scheduled', 'confirmed'])

      // Active companies
      const { count: companiesCount } = await supabase
        .from('companies')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')

      stats.value = {
        totalUsers: usersCount || 0,
        totalProviders: providersCount || 0,
        totalRides: ridesCount || 0,
        totalDeliveries: deliveriesCount || 0,
        totalShopping: shoppingCount || 0,
        totalRevenue,
        activeRides: activeRidesCount || 0,
        onlineProviders: onlineCount || 0,
        pendingVerifications: pendingCount || 0,
        openTickets: ticketsCount || 0,
        activeSubscriptions: subscriptionsCount || 0,
        pendingInsuranceClaims: insuranceClaimsCount || 0,
        scheduledRides: scheduledCount || 0,
        activeCompanies: companiesCount || 0
      }
    } catch (err: any) {
      error.value = err.message
      // Use mock data for demo
      stats.value = {
        totalUsers: 1247,
        totalProviders: 89,
        totalRides: 5832,
        totalDeliveries: 1456,
        totalShopping: 723,
        totalRevenue: 2847500,
        activeRides: 23,
        onlineProviders: 34,
        pendingVerifications: 12,
        openTickets: 8,
        activeSubscriptions: 156,
        pendingInsuranceClaims: 5,
        scheduledRides: 18,
        activeCompanies: 12
      }
    } finally {
      loading.value = false
    }
  }

  // Fetch recent orders (all types)
  const fetchRecentOrders = async (limit = 10) => {
    try {
      const [rides, deliveries, shopping] = await Promise.all([
        supabase.from('ride_requests').select('*, users(name)').order('created_at', { ascending: false }).limit(limit),
        supabase.from('delivery_requests').select('*, users(name)').order('created_at', { ascending: false }).limit(limit),
        supabase.from('shopping_requests').select('*, users(name)').order('created_at', { ascending: false }).limit(limit)
      ])

      const allOrders = [
        ...(rides.data || []).map((r: any) => ({ ...r, type: 'ride' })),
        ...(deliveries.data || []).map((d: any) => ({ ...d, type: 'delivery' })),
        ...(shopping.data || []).map((s: any) => ({ ...s, type: 'shopping' }))
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, limit)

      recentOrders.value = allOrders
    } catch {
      // Mock data
      recentOrders.value = generateMockOrders()
    }
  }

  // Fetch users list
  const fetchUsers = async (page = 1, limit = 20, filter?: { status?: string; search?: string }) => {
    try {
      let query = supabase.from('users').select('*', { count: 'exact' })
      
      if (filter?.status === 'active') query = query.eq('is_active', true)
      if (filter?.status === 'inactive') query = query.eq('is_active', false)
      if (filter?.search) query = query.or(`name.ilike.%${filter.search}%,email.ilike.%${filter.search}%,phone.ilike.%${filter.search}%`)
      
      const { data, count } = await query.range((page - 1) * limit, page * limit - 1).order('created_at', { ascending: false })
      return { data: data || [], total: count || 0 }
    } catch {
      return { data: generateMockUsers(), total: 50 }
    }
  }

  // Fetch providers list
  const fetchProviders = async (page = 1, limit = 20, filter?: { type?: string; status?: string }) => {
    try {
      let query = supabase.from('service_providers').select('*, users(name, email, phone)', { count: 'exact' })
      
      if (filter?.type) query = query.eq('provider_type', filter.type)
      if (filter?.status === 'verified') query = query.eq('is_verified', true)
      if (filter?.status === 'pending') query = query.eq('is_verified', false)
      
      const { data, count } = await query.range((page - 1) * limit, page * limit - 1).order('created_at', { ascending: false })
      return { data: data || [], total: count || 0 }
    } catch {
      return { data: generateMockProviders(), total: 30 }
    }
  }

  // Fetch payments - using ride_requests with estimated_fare as payment proxy
  const fetchPayments = async (page = 1, limit = 20, filter?: { status?: string; method?: string }) => {
    try {
      let query = supabase.from('ride_requests').select('*, users(name)', { count: 'exact' })
      
      if (filter?.status) query = query.eq('status', filter.status)
      
      const { data, count } = await query.range((page - 1) * limit, page * limit - 1).order('created_at', { ascending: false })
      // Transform to payment-like format
      const payments = (data || []).map((r: any) => ({
        id: r.id,
        amount: r.estimated_fare || r.final_fare || 0,
        status: r.status === 'completed' ? 'completed' : 'pending',
        request_type: 'ride',
        created_at: r.created_at,
        users: r.users
      }))
      return { data: payments, total: count || 0 }
    } catch {
      return { data: generateMockPayments(), total: 100 }
    }
  }

  // Fetch support tickets
  const fetchSupportTickets = async (page = 1, limit = 20, filter?: { status?: string; priority?: string }) => {
    try {
      let query = supabase.from('support_tickets').select('*, users(name)', { count: 'exact' })
      
      if (filter?.status) query = query.eq('status', filter.status)
      if (filter?.priority) query = query.eq('priority', filter.priority)
      
      const { data, count } = await query.range((page - 1) * limit, page * limit - 1).order('created_at', { ascending: false })
      return { data: data || [], total: count || 0 }
    } catch {
      return { data: generateMockTickets(), total: 25 }
    }
  }

  // Fetch promo codes
  const fetchPromoCodes = async () => {
    try {
      const { data } = await supabase.from('promo_codes').select('*').order('created_at', { ascending: false })
      return data || []
    } catch {
      return generateMockPromos()
    }
  }

  // Update user active status
  const updateUserStatus = async (userId: string, isActive: boolean) => {
    try {
      // @ts-ignore - Supabase types not fully configured
      await supabase.from('users').update({ is_active: isActive }).eq('id', userId)
      return true
    } catch { return false }
  }

  // Update provider verification status
  const updateProviderStatus = async (providerId: string, isVerified: boolean) => {
    try {
      // @ts-ignore - Supabase types not fully configured
      await supabase.from('service_providers').update({ is_verified: isVerified }).eq('id', providerId)
      return true
    } catch { return false }
  }

  // Update ticket status
  const updateTicketStatus = async (ticketId: string, status: string, resolution?: string) => {
    try {
      const update: Record<string, any> = { status }
      if (resolution) update.resolution = resolution
      if (status === 'resolved') update.resolved_at = new Date().toISOString()
      // @ts-ignore - Supabase types not fully configured
      await supabase.from('support_tickets').update(update).eq('id', ticketId)
      return true
    } catch { return false }
  }

  // Create promo code
  const createPromoCode = async (promo: Record<string, any>) => {
    try {
      // @ts-ignore - Supabase types not fully configured
      const { data } = await supabase.from('promo_codes').insert(promo).select().single()
      return data
    } catch { return null }
  }

  // Mock data generators for demo
  const generateMockOrders = () => [
    { id: '1', type: 'ride', status: 'completed', estimated_fare: 85, pickup_address: 'สยามพารากอน', destination_address: 'อโศก', created_at: new Date().toISOString(), users: { name: 'สมชาย ใจดี' } },
    { id: '2', type: 'delivery', status: 'in_transit', estimated_fee: 59, sender_address: 'ลาดพร้าว', recipient_address: 'บางนา', created_at: new Date(Date.now() - 3600000).toISOString(), users: { name: 'สมหญิง รักดี' } },
    { id: '3', type: 'shopping', status: 'shopping', service_fee: 35, store_name: 'Big C', delivery_address: 'รามคำแหง', created_at: new Date(Date.now() - 7200000).toISOString(), users: { name: 'วิชัย มั่งมี' } },
    { id: '4', type: 'ride', status: 'in_progress', estimated_fare: 120, pickup_address: 'เซ็นทรัลเวิลด์', destination_address: 'สีลม', created_at: new Date(Date.now() - 1800000).toISOString(), users: { name: 'นภา สวยงาม' } },
    { id: '5', type: 'ride', status: 'pending', estimated_fare: 65, pickup_address: 'MBK', destination_address: 'พระราม 9', created_at: new Date(Date.now() - 900000).toISOString(), users: { name: 'ธนา รวยมาก' } }
  ]

  const generateMockUsers = () => [
    { id: '1', name: 'สมชาย ใจดี', email: 'somchai@email.com', phone: '0812345678', role: 'customer', is_active: true, created_at: '2025-12-01T10:00:00Z' },
    { id: '2', name: 'สมหญิง รักดี', email: 'somying@email.com', phone: '0823456789', role: 'customer', is_active: true, created_at: '2025-12-05T14:30:00Z' },
    { id: '3', name: 'วิชัย มั่งมี', email: 'wichai@email.com', phone: '0834567890', role: 'rider', is_active: true, created_at: '2025-12-10T09:15:00Z' },
    { id: '4', name: 'นภา สวยงาม', email: 'napa@email.com', phone: '0845678901', role: 'customer', is_active: false, created_at: '2025-12-12T16:45:00Z' },
    { id: '5', name: 'ธนา รวยมาก', email: 'thana@email.com', phone: '0856789012', role: 'admin', is_active: true, created_at: '2025-12-14T11:20:00Z' }
  ]

  const generateMockProviders = () => [
    { id: '1', provider_type: 'driver', vehicle_type: 'Toyota Vios', vehicle_plate: 'กข 1234', rating: 4.8, total_trips: 523, is_available: true, is_verified: true, users: { name: 'ประยุทธ์ ขับดี', email: 'prayut@email.com', phone: '0867890123' } },
    { id: '2', provider_type: 'driver', vehicle_type: 'Honda City', vehicle_plate: 'ขค 5678', rating: 4.5, total_trips: 234, is_available: true, is_verified: true, users: { name: 'สมศักดิ์ เร็วมาก', email: 'somsak@email.com', phone: '0878901234' } },
    { id: '3', provider_type: 'delivery', vehicle_type: 'Honda PCX', vehicle_plate: 'คง 9012', rating: 4.9, total_trips: 892, is_available: false, is_verified: true, users: { name: 'วีระ ส่งไว', email: 'weera@email.com', phone: '0889012345' } },
    { id: '4', provider_type: 'driver', vehicle_type: 'Nissan Almera', vehicle_plate: 'งจ 3456', rating: 0, total_trips: 0, is_available: false, is_verified: false, users: { name: 'อนุชา ใหม่มาก', email: 'anucha@email.com', phone: '0890123456' } }
  ]

  const generateMockPayments = () => [
    { id: '1', amount: 85, payment_method: 'promptpay', status: 'completed', request_type: 'ride', created_at: new Date().toISOString(), users: { name: 'สมชาย ใจดี' } },
    { id: '2', amount: 120, payment_method: 'credit_card', status: 'completed', request_type: 'ride', created_at: new Date(Date.now() - 3600000).toISOString(), users: { name: 'นภา สวยงาม' } },
    { id: '3', amount: 59, payment_method: 'cash', status: 'pending', request_type: 'delivery', created_at: new Date(Date.now() - 7200000).toISOString(), users: { name: 'สมหญิง รักดี' } },
    { id: '4', amount: 250, payment_method: 'mobile_banking', status: 'completed', request_type: 'shopping', created_at: new Date(Date.now() - 86400000).toISOString(), users: { name: 'วิชัย มั่งมี' } }
  ]

  const generateMockTickets = () => [
    { id: '1', subject: 'ไม่ได้รับเงินคืน', category: 'payment', priority: 'high', status: 'open', created_at: new Date().toISOString(), users: { name: 'สมชาย ใจดี' } },
    { id: '2', subject: 'คนขับไม่สุภาพ', category: 'driver', priority: 'normal', status: 'in_progress', created_at: new Date(Date.now() - 86400000).toISOString(), users: { name: 'นภา สวยงาม' } },
    { id: '3', subject: 'แอปค้าง', category: 'app', priority: 'low', status: 'resolved', created_at: new Date(Date.now() - 172800000).toISOString(), users: { name: 'วิชัย มั่งมี' } }
  ]

  const generateMockPromos = () => [
    { id: '1', code: 'FIRST50', description: 'ส่วนลดผู้ใช้ใหม่', discount_type: 'fixed', discount_value: 50, used_count: 234, usage_limit: 1000, is_active: true, valid_until: '2025-12-31' },
    { id: '2', code: 'SAVE20', description: 'ลด 20 บาท', discount_type: 'fixed', discount_value: 20, used_count: 567, usage_limit: null, is_active: true, valid_until: '2025-06-30' },
    { id: '3', code: 'RIDE10', description: 'ลด 10%', discount_type: 'percentage', discount_value: 10, max_discount: 100, used_count: 123, usage_limit: 500, is_active: true, valid_until: '2025-03-31' },
    { id: '4', code: 'WEEKEND', description: 'โปรวันหยุด', discount_type: 'percentage', discount_value: 15, max_discount: 80, used_count: 89, usage_limit: 200, is_active: false, valid_until: '2025-01-31' }
  ]

  // Chart data for analytics
  const getRevenueChartData = () => ({
    labels: ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'],
    datasets: [
      { label: 'รายได้ (บาท)', data: [180000, 220000, 195000, 280000, 310000, 290000, 350000, 380000, 420000, 450000, 480000, 520000] }
    ]
  })

  const getOrdersChartData = () => ({
    labels: ['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.', 'อา.'],
    datasets: [
      { label: 'เรียกรถ', data: [120, 145, 132, 156, 189, 210, 178] },
      { label: 'ส่งของ', data: [45, 52, 48, 61, 72, 85, 68] },
      { label: 'ซื้อของ', data: [23, 28, 25, 32, 38, 45, 35] }
    ]
  })

  // =====================================================
  // ADVANCED FEATURES ADMIN FUNCTIONS
  // =====================================================

  // Fetch subscriptions
  const fetchSubscriptions = async (page = 1, limit = 20, filter?: { status?: string }) => {
    try {
      let query = supabase.from('user_subscriptions').select('*, users(name), subscription_plans(name, name_th, price)', { count: 'exact' })
      if (filter?.status) query = query.eq('status', filter.status)
      const { data, count } = await query.range((page - 1) * limit, page * limit - 1).order('created_at', { ascending: false })
      return { data: data || [], total: count || 0 }
    } catch {
      return { data: [], total: 0 }
    }
  }

  // Fetch subscription plans
  const fetchSubscriptionPlans = async () => {
    try {
      const { data } = await supabase.from('subscription_plans').select('*').order('sort_order')
      return data || []
    } catch {
      return []
    }
  }

  // Update subscription plan
  const updateSubscriptionPlan = async (planId: string, updates: Record<string, any>) => {
    try {
      await (supabase.from('subscription_plans') as any).update(updates).eq('id', planId)
      return true
    } catch { return false }
  }

  // Fetch insurance claims
  const fetchInsuranceClaims = async (page = 1, limit = 20, filter?: { status?: string }) => {
    try {
      let query = supabase.from('insurance_claims').select('*, users(name)', { count: 'exact' })
      if (filter?.status) query = query.eq('status', filter.status)
      const { data, count } = await query.range((page - 1) * limit, page * limit - 1).order('created_at', { ascending: false })
      return { data: data || [], total: count || 0 }
    } catch {
      return { data: [], total: 0 }
    }
  }

  // Update insurance claim
  const updateInsuranceClaim = async (claimId: string, status: string, approvedAmount?: number, notes?: string) => {
    try {
      const update: Record<string, any> = { status, reviewed_at: new Date().toISOString() }
      if (approvedAmount !== undefined) update.approved_amount = approvedAmount
      if (notes) update.reviewer_notes = notes
      await (supabase.from('insurance_claims') as any).update(update).eq('id', claimId)
      return true
    } catch { return false }
  }

  // Fetch insurance plans
  const fetchInsurancePlans = async () => {
    try {
      const { data } = await supabase.from('insurance_plans').select('*').order('price_per_ride')
      return data || []
    } catch {
      return []
    }
  }

  // Fetch companies
  const fetchCompanies = async (page = 1, limit = 20, filter?: { status?: string }) => {
    try {
      let query = supabase.from('companies').select('*', { count: 'exact' })
      if (filter?.status) query = query.eq('status', filter.status)
      const { data, count } = await query.range((page - 1) * limit, page * limit - 1).order('created_at', { ascending: false })
      return { data: data || [], total: count || 0 }
    } catch {
      return { data: [], total: 0 }
    }
  }

  // Update company status
  const updateCompanyStatus = async (companyId: string, status: string) => {
    try {
      await (supabase.from('companies') as any).update({ status }).eq('id', companyId)
      return true
    } catch { return false }
  }

  // Fetch company employees
  const fetchCompanyEmployees = async (companyId: string) => {
    try {
      const { data } = await supabase.from('company_employees').select('*, users(name, email)').eq('company_id', companyId)
      return data || []
    } catch {
      return []
    }
  }

  // Fetch scheduled rides
  const fetchScheduledRides = async (page = 1, limit = 20) => {
    try {
      const { data, count } = await supabase.from('scheduled_rides').select('*, users(name)', { count: 'exact' })
        .order('scheduled_datetime', { ascending: true })
        .range((page - 1) * limit, page * limit - 1)
      return { data: data || [], total: count || 0 }
    } catch {
      return { data: [], total: 0 }
    }
  }

  return {
    loading, error, stats, recentOrders, recentUsers, recentPayments,
    fetchDashboardStats, fetchRecentOrders, fetchUsers, fetchProviders,
    fetchPayments, fetchSupportTickets, fetchPromoCodes,
    updateUserStatus, updateProviderStatus, updateTicketStatus, createPromoCode,
    getRevenueChartData, getOrdersChartData,
    // Advanced features
    fetchSubscriptions, fetchSubscriptionPlans, updateSubscriptionPlan,
    fetchInsuranceClaims, updateInsuranceClaim, fetchInsurancePlans,
    fetchCompanies, updateCompanyStatus, fetchCompanyEmployees,
    fetchScheduledRides
  }
}
