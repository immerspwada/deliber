/**
 * useAdmin - Admin Dashboard Composable
 * 
 * Feature: F23 - Admin Dashboard
 * Tables: ทุกตารางในระบบ (full access)
 * 
 * @syncs-with
 * - Provider: useProvider.ts (อนุมัติ/ระงับ, ดูสถานะ)
 * - Customer: stores/ride.ts, useDelivery.ts, useShopping.ts (ดู/จัดการออเดอร์)
 * - Database: Direct access to all tables
 * - Notifications: ส่ง notification ถึง users/providers
 * 
 * @permissions
 * - View: ดูข้อมูลทั้งหมด
 * - Edit: แก้ไขสถานะ, อนุมัติ, ปฏิเสธ
 * - Delete: ระงับ users/providers
 * - Refund: คืนเงินให้ลูกค้า
 */

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

  // Check if admin demo mode
  const isAdminDemoMode = () => localStorage.getItem('admin_demo_mode') === 'true'

  // Fetch dashboard overview stats
  const fetchDashboardStats = async () => {
    loading.value = true
    
    // Demo mode - use mock data immediately
    if (isAdminDemoMode()) {
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
      loading.value = false
      return
    }
    
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
    // Demo mode - use mock data
    if (isAdminDemoMode()) {
      recentOrders.value = generateMockOrders()
      return
    }
    
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

      recentOrders.value = allOrders.length > 0 ? allOrders : generateMockOrders()
    } catch {
      // Mock data
      recentOrders.value = generateMockOrders()
    }
  }

  // Fetch users list
  const fetchUsers = async (page = 1, limit = 20, filter?: { 
    status?: string
    search?: string
    role?: string
    verification_status?: string 
  }) => {
    try {
      let query = supabase.from('users').select('*', { count: 'exact' })
      
      // Status filter (is_active)
      if (filter?.status === 'active') query = query.eq('is_active', true)
      if (filter?.status === 'inactive') query = query.eq('is_active', false)
      
      // Verification status filter
      if (filter?.verification_status) query = query.eq('verification_status', filter.verification_status)
      
      // Role filter
      if (filter?.role) query = query.eq('role', filter.role)
      
      // Search filter
      if (filter?.search) {
        query = query.or(`name.ilike.%${filter.search}%,email.ilike.%${filter.search}%,phone.ilike.%${filter.search}%,first_name.ilike.%${filter.search}%,last_name.ilike.%${filter.search}%,phone_number.ilike.%${filter.search}%`)
      }
      
      const { data, count } = await query.range((page - 1) * limit, page * limit - 1).order('created_at', { ascending: false })
      
      // Transform data to match expected format
      const transformedData = (data || []).map((u: any) => ({
        ...u,
        name: u.name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email?.split('@')[0],
        phone: u.phone || u.phone_number,
        is_active: u.is_active !== false,
        verification_status: u.verification_status || 'pending'
      }))
      
      return { data: transformedData, total: count || 0 }
    } catch (err) {
      console.error('Fetch users error:', err)
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

  // Update user verification status
  const updateUserStatus = async (userId: string, isActive: boolean) => {
    try {
      const status = isActive ? 'verified' : 'rejected'
      // @ts-ignore - Supabase types not fully configured
      await supabase.from('users').update({ 
        verification_status: status,
        is_active: isActive,
        verified_at: isActive ? new Date().toISOString() : null
      }).eq('id', userId)
      return true
    } catch { return false }
  }

  // Verify user identity (F01 - Registration System)
  const verifyUser = async (userId: string, status: 'verified' | 'rejected', reason?: string) => {
    try {
      const updates: Record<string, any> = {
        verification_status: status,
        is_active: status === 'verified'
      }
      
      if (status === 'verified') {
        updates.verified_at = new Date().toISOString()
      }
      
      // @ts-ignore - Supabase types not fully configured
      await supabase.from('users').update(updates).eq('id', userId)
      
      // Send notification to user
      const notificationTitle = status === 'verified' 
        ? 'ยืนยันตัวตนสำเร็จ' 
        : 'การยืนยันตัวตนถูกปฏิเสธ'
      const notificationMessage = status === 'verified'
        ? 'บัญชีของคุณได้รับการยืนยันแล้ว สามารถใช้งานได้เต็มรูปแบบ'
        : reason || 'กรุณาตรวจสอบข้อมูลและลองใหม่อีกครั้ง'
      
      // @ts-ignore
      await supabase.from('user_notifications').insert({
        user_id: userId,
        type: 'system',
        title: notificationTitle,
        message: notificationMessage,
        data: { verification_status: status }
      })
      
      return true
    } catch (err) {
      console.error('Verify user error:', err)
      return false
    }
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

  // Update promo code
  const updatePromoCode = async (id: string, updates: Record<string, any>) => {
    try {
      // @ts-ignore - Supabase types not fully configured
      const { data } = await supabase.from('promo_codes').update(updates).eq('id', id).select().single()
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

  // =====================================================
  // F26 - SERVICE RATINGS ADMIN FUNCTIONS
  // =====================================================

  // Fetch all delivery ratings
  const fetchDeliveryRatings = async (page = 1, limit = 20, filter?: { minRating?: number; providerId?: string }) => {
    try {
      let query = supabase.from('delivery_ratings').select(`
        *,
        user:user_id (name, email),
        provider:provider_id (vehicle_type, vehicle_plate, users(name)),
        delivery:delivery_id (tracking_id, sender_address, recipient_address)
      `, { count: 'exact' })
      
      if (filter?.minRating) query = query.gte('rating', filter.minRating)
      if (filter?.providerId) query = query.eq('provider_id', filter.providerId)
      
      const { data, count } = await query
        .range((page - 1) * limit, page * limit - 1)
        .order('created_at', { ascending: false })
      
      return { data: data || [], total: count || 0 }
    } catch {
      return { data: generateMockDeliveryRatings(), total: 50 }
    }
  }

  // Fetch all shopping ratings
  const fetchShoppingRatings = async (page = 1, limit = 20, filter?: { minRating?: number; providerId?: string }) => {
    try {
      let query = supabase.from('shopping_ratings').select(`
        *,
        user:user_id (name, email),
        provider:provider_id (vehicle_type, vehicle_plate, users(name)),
        shopping:shopping_id (tracking_id, store_name, delivery_address)
      `, { count: 'exact' })
      
      if (filter?.minRating) query = query.gte('rating', filter.minRating)
      if (filter?.providerId) query = query.eq('provider_id', filter.providerId)
      
      const { data, count } = await query
        .range((page - 1) * limit, page * limit - 1)
        .order('created_at', { ascending: false })
      
      return { data: data || [], total: count || 0 }
    } catch {
      return { data: generateMockShoppingRatings(), total: 50 }
    }
  }

  // Fetch all ride ratings
  const fetchRideRatings = async (page = 1, limit = 20, filter?: { minRating?: number; providerId?: string }) => {
    try {
      let query = supabase.from('ride_ratings').select(`
        *,
        user:user_id (name, email),
        provider:provider_id (vehicle_type, vehicle_plate, users(name)),
        ride:ride_id (tracking_id, pickup_address, destination_address)
      `, { count: 'exact' })
      
      if (filter?.minRating) query = query.gte('rating', filter.minRating)
      if (filter?.providerId) query = query.eq('provider_id', filter.providerId)
      
      const { data, count } = await query
        .range((page - 1) * limit, page * limit - 1)
        .order('created_at', { ascending: false })
      
      return { data: data || [], total: count || 0 }
    } catch {
      return { data: generateMockRideRatings(), total: 50 }
    }
  }

  // Get ratings statistics
  const fetchRatingsStats = async () => {
    try {
      const [rideStats, deliveryStats, shoppingStats] = await Promise.all([
        supabase.from('ride_ratings').select('rating'),
        supabase.from('delivery_ratings').select('rating'),
        supabase.from('shopping_ratings').select('rating')
      ])

      const calcStats = (data: any[]) => {
        if (!data || data.length === 0) return { count: 0, avg: 0, distribution: [0, 0, 0, 0, 0] }
        const count = data.length
        const avg = data.reduce((sum, r) => sum + r.rating, 0) / count
        const distribution = [1, 2, 3, 4, 5].map(star => data.filter(r => r.rating === star).length)
        return { count, avg: Math.round(avg * 10) / 10, distribution }
      }

      return {
        ride: calcStats(rideStats.data || []),
        delivery: calcStats(deliveryStats.data || []),
        shopping: calcStats(shoppingStats.data || []),
        total: {
          count: (rideStats.data?.length || 0) + (deliveryStats.data?.length || 0) + (shoppingStats.data?.length || 0),
          avg: 0
        }
      }
    } catch {
      return {
        ride: { count: 523, avg: 4.7, distribution: [5, 12, 28, 156, 322] },
        delivery: { count: 234, avg: 4.5, distribution: [3, 8, 18, 89, 116] },
        shopping: { count: 156, avg: 4.6, distribution: [2, 5, 12, 62, 75] },
        total: { count: 913, avg: 4.6 }
      }
    }
  }

  // Delete rating (admin only)
  const deleteRating = async (type: 'ride' | 'delivery' | 'shopping', ratingId: string) => {
    try {
      const table = type === 'ride' ? 'ride_ratings' : type === 'delivery' ? 'delivery_ratings' : 'shopping_ratings'
      await (supabase.from(table) as any).delete().eq('id', ratingId)
      return true
    } catch {
      return false
    }
  }

  // Mock data for ratings
  const generateMockDeliveryRatings = () => [
    { id: '1', rating: 5, speed_rating: 5, care_rating: 5, communication_rating: 5, comment: 'ส่งเร็วมาก ดูแลพัสดุดี', tip_amount: 20, tags: ['ส่งเร็วมาก', 'ดูแลพัสดุดี'], created_at: new Date().toISOString(), user: { name: 'สมชาย ใจดี' }, provider: { users: { name: 'วีระ ส่งไว' } }, delivery: { tracking_id: 'DEL-20251216-000001' } },
    { id: '2', rating: 4, speed_rating: 4, care_rating: 5, communication_rating: 4, comment: 'บริการดี', tip_amount: 0, tags: ['สุภาพ'], created_at: new Date(Date.now() - 86400000).toISOString(), user: { name: 'สมหญิง รักดี' }, provider: { users: { name: 'สมศักดิ์ เร็วมาก' } }, delivery: { tracking_id: 'DEL-20251215-000023' } }
  ]

  const generateMockShoppingRatings = () => [
    { id: '1', rating: 5, item_selection_rating: 5, freshness_rating: 5, communication_rating: 5, delivery_rating: 5, comment: 'เลือกของดีมาก ของสดทุกอย่าง', tip_amount: 30, tags: ['เลือกของดี', 'ของสด'], created_at: new Date().toISOString(), user: { name: 'นภา สวยงาม' }, provider: { users: { name: 'วีระ ส่งไว' } }, shopping: { tracking_id: 'SHP-20251216-000001', store_name: 'Big C' } },
    { id: '2', rating: 4, item_selection_rating: 4, freshness_rating: 4, communication_rating: 5, delivery_rating: 4, comment: 'โอเค', tip_amount: 0, tags: ['ครบตามสั่ง'], created_at: new Date(Date.now() - 86400000).toISOString(), user: { name: 'วิชัย มั่งมี' }, provider: { users: { name: 'สมศักดิ์ เร็วมาก' } }, shopping: { tracking_id: 'SHP-20251215-000015', store_name: 'Lotus' } }
  ]

  const generateMockRideRatings = () => [
    { id: '1', rating: 5, comment: 'ขับดี ปลอดภัย', tip_amount: 20, created_at: new Date().toISOString(), user: { name: 'สมชาย ใจดี' }, provider: { users: { name: 'ประยุทธ์ ขับดี' } }, ride: { tracking_id: 'RID-20251216-000001', pickup_address: 'สยามพารากอน' } },
    { id: '2', rating: 4, comment: 'โอเค', tip_amount: 0, created_at: new Date(Date.now() - 86400000).toISOString(), user: { name: 'นภา สวยงาม' }, provider: { users: { name: 'สมศักดิ์ เร็วมาก' } }, ride: { tracking_id: 'RID-20251215-000089', pickup_address: 'เซ็นทรัลเวิลด์' } }
  ]

  // =====================================================
  // NOTIFICATION MANAGEMENT (Admin)
  // =====================================================

  // Fetch all notifications (admin view)
  const fetchAllNotifications = async (page = 1, limit = 50, filter?: { type?: string; userId?: string }) => {
    try {
      let query = supabase.from('user_notifications').select(`
        *,
        user:user_id (name, email)
      `, { count: 'exact' })
      
      if (filter?.type) query = query.eq('type', filter.type)
      if (filter?.userId) query = query.eq('user_id', filter.userId)
      
      const { data, count } = await query
        .range((page - 1) * limit, page * limit - 1)
        .order('created_at', { ascending: false })
      
      return { data: data || [], total: count || 0 }
    } catch {
      return { data: [], total: 0 }
    }
  }

  // Get notification stats
  const fetchNotificationStats = async () => {
    try {
      const { count: totalCount } = await supabase.from('user_notifications').select('*', { count: 'exact', head: true })
      const { count: unreadCount } = await supabase.from('user_notifications').select('*', { count: 'exact', head: true }).eq('is_read', false)
      const { count: ratingCount } = await supabase.from('user_notifications').select('*', { count: 'exact', head: true }).eq('type', 'rating')
      
      return {
        total: totalCount || 0,
        unread: unreadCount || 0,
        ratingReminders: ratingCount || 0
      }
    } catch {
      return { total: 0, unread: 0, ratingReminders: 0 }
    }
  }

  // Send bulk notification to users
  const sendBulkNotification = async (params: {
    userIds: string[]
    type: string
    title: string
    message: string
    actionUrl?: string
  }) => {
    try {
      const notifications = params.userIds.map(userId => ({
        user_id: userId,
        type: params.type,
        title: params.title,
        message: params.message,
        action_url: params.actionUrl,
        is_read: false
      }))
      
      await (supabase.from('user_notifications') as any).insert(notifications)
      return true
    } catch {
      return false
    }
  }

  // Delete notification
  const deleteNotification = async (notificationId: string) => {
    try {
      await supabase.from('user_notifications').delete().eq('id', notificationId)
      return true
    } catch {
      return false
    }
  }

  // =====================================================
  // NOTIFICATION TEMPLATES
  // =====================================================

  // Fetch all notification templates
  const fetchNotificationTemplates = async () => {
    try {
      const { data } = await supabase
        .from('notification_templates')
        .select('*')
        .order('usage_count', { ascending: false })
      return data || generateMockTemplates()
    } catch {
      return generateMockTemplates()
    }
  }

  // Create notification template
  const createNotificationTemplate = async (template: {
    name: string
    type: string
    title: string
    message: string
    actionUrl?: string
  }) => {
    try {
      const { data, error } = await (supabase.from('notification_templates') as any).insert({
        name: template.name,
        type: template.type,
        title: template.title,
        message: template.message,
        action_url: template.actionUrl
      }).select().single()
      
      if (error) throw error
      return data
    } catch {
      return null
    }
  }

  // Update notification template
  const updateNotificationTemplate = async (id: string, updates: {
    name?: string
    type?: string
    title?: string
    message?: string
    actionUrl?: string
    isActive?: boolean
  }) => {
    try {
      const updateData: Record<string, any> = { updated_at: new Date().toISOString() }
      if (updates.name) updateData.name = updates.name
      if (updates.type) updateData.type = updates.type
      if (updates.title) updateData.title = updates.title
      if (updates.message) updateData.message = updates.message
      if (updates.actionUrl !== undefined) updateData.action_url = updates.actionUrl
      if (updates.isActive !== undefined) updateData.is_active = updates.isActive
      
      await (supabase.from('notification_templates') as any).update(updateData).eq('id', id)
      return true
    } catch {
      return false
    }
  }

  // Delete notification template
  const deleteNotificationTemplate = async (id: string) => {
    try {
      await supabase.from('notification_templates').delete().eq('id', id)
      return true
    } catch {
      return false
    }
  }

  // Use template (increment usage count)
  const useNotificationTemplate = async (templateId: string) => {
    try {
      const { data } = await (supabase.rpc as any)('use_notification_template', { p_template_id: templateId })
      return data
    } catch {
      return null
    }
  }

  // Mock templates for demo
  const generateMockTemplates = () => [
    { id: '1', name: 'โปรโมชั่นใหม่', type: 'promo', title: 'โปรโมชั่นพิเศษสำหรับ {{user_name}}!', message: 'รับส่วนลด {{discount}}% สำหรับการเดินทางครั้งต่อไป ใช้โค้ด {{promo_code}}', action_url: '/promotions', is_active: true, usage_count: 45 },
    { id: '2', name: 'ยินดีต้อนรับ', type: 'system', title: 'ยินดีต้อนรับ {{user_name}} สู่ Thai Ride!', message: 'ขอบคุณที่เลือกใช้บริการ Thai Ride', action_url: '/', is_active: true, usage_count: 120 },
    { id: '3', name: 'อัพเดทระบบ', type: 'system', title: 'อัพเดทระบบใหม่', message: 'เราได้ปรับปรุงระบบเพื่อประสบการณ์ที่ดีขึ้น', action_url: '/settings', is_active: true, usage_count: 15 },
    { id: '4', name: 'แนะนำเพื่อน', type: 'referral', title: 'แนะนำเพื่อน รับเครดิต!', message: 'แนะนำเพื่อนมาใช้ Thai Ride รับเครดิตฟรี {{referral_bonus}} บาท', action_url: '/referral', is_active: true, usage_count: 30 },
    { id: '5', name: 'เติมเงิน', type: 'payment', title: 'เติมเงินรับโบนัส', message: 'เติมเงินวันนี้ รับโบนัสเพิ่ม {{bonus_percent}}%', action_url: '/wallet', is_active: true, usage_count: 25 }
  ]

  // Available template variables
  const TEMPLATE_VARIABLES = [
    { key: 'user_name', label: 'ชื่อผู้ใช้', example: 'สมชาย' },
    { key: 'promo_code', label: 'โค้ดโปรโมชั่น', example: 'SAVE50' },
    { key: 'discount', label: 'ส่วนลด (%)', example: '20' },
    { key: 'referral_bonus', label: 'โบนัสแนะนำเพื่อน', example: '50' },
    { key: 'bonus_percent', label: 'โบนัส (%)', example: '10' },
    { key: 'app_name', label: 'ชื่อแอพ', example: 'Thai Ride' },
    { key: 'date', label: 'วันที่', example: '16 ธ.ค. 2567' },
    { key: 'amount', label: 'จำนวนเงิน', example: '100' }
  ]

  // User segments for targeting
  const USER_SEGMENTS = [
    { key: 'all', label: 'ผู้ใช้ทั้งหมด', icon: 'users' },
    { key: 'new_users', label: 'ผู้ใช้ใหม่ (30 วัน)', icon: 'user-plus', config: { registered_within_days: 30 } },
    { key: 'inactive', label: 'ไม่ได้ใช้งาน 7 วัน', icon: 'user-clock', config: { inactive_days: 7 } },
    { key: 'subscribers', label: 'สมาชิก Subscription', icon: 'crown' },
    { key: 'non_subscribers', label: 'ยังไม่เป็นสมาชิก', icon: 'user' },
    { key: 'high_value', label: 'ลูกค้าประจำ (10+ trips)', icon: 'star', config: { min_rides: 10 } }
  ]

  // =====================================================
  // PUSH NOTIFICATIONS MANAGEMENT (Admin)
  // =====================================================

  // Fetch push subscriptions
  const fetchPushSubscriptions = async (page = 1, limit = 20) => {
    try {
      const { data, count } = await supabase
        .from('push_subscriptions')
        .select('*, users(name, email)', { count: 'exact' })
        .eq('is_active', true)
        .range((page - 1) * limit, page * limit - 1)
        .order('created_at', { ascending: false })
      return { data: data || [], total: count || 0 }
    } catch {
      return { data: [], total: 0 }
    }
  }

  // Fetch push notification queue
  const fetchPushQueue = async (page = 1, limit = 50, filter?: { status?: string }) => {
    try {
      let query = supabase.from('push_notification_queue').select('*, users(name, email)', { count: 'exact' })
      if (filter?.status) query = query.eq('status', filter.status)
      const { data, count } = await query
        .range((page - 1) * limit, page * limit - 1)
        .order('created_at', { ascending: false })
      return { data: data || [], total: count || 0 }
    } catch {
      return { data: [], total: 0 }
    }
  }

  // Get push notification stats
  const fetchPushStats = async () => {
    try {
      const [subsCount, pendingCount, sentCount, failedCount] = await Promise.all([
        supabase.from('push_subscriptions').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('push_notification_queue').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('push_notification_queue').select('*', { count: 'exact', head: true }).eq('status', 'sent'),
        supabase.from('push_notification_queue').select('*', { count: 'exact', head: true }).eq('status', 'failed')
      ])
      return {
        activeSubscriptions: subsCount.count || 0,
        pendingQueue: pendingCount.count || 0,
        sentToday: sentCount.count || 0,
        failedToday: failedCount.count || 0
      }
    } catch {
      return { activeSubscriptions: 0, pendingQueue: 0, sentToday: 0, failedToday: 0 }
    }
  }

  // Send push notification to user via Edge Function
  const sendPushToUser = async (userId: string, payload: { title: string; body: string; icon?: string; url?: string }) => {
    try {
      const { data, error } = await supabase.functions.invoke('send-push', {
        body: { action: 'send_to_user', userId, payload }
      })
      if (error) throw error
      return data
    } catch {
      return null
    }
  }

  // Process push queue via Edge Function
  const processPushQueue = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('send-push', {
        body: { action: 'process_queue' }
      })
      if (error) throw error
      return data
    } catch {
      return null
    }
  }

  // Queue push notification for user
  const queuePushNotification = async (params: {
    userId: string
    title: string
    body: string
    icon?: string
    url?: string
    scheduledFor?: string
  }) => {
    try {
      const { data, error } = await (supabase.from('push_notification_queue') as any).insert({
        user_id: params.userId,
        title: params.title,
        body: params.body,
        icon: params.icon || '/pwa-192x192.png',
        url: params.url,
        scheduled_for: params.scheduledFor || new Date().toISOString(),
        status: 'pending'
      }).select().single()
      if (error) throw error
      return data
    } catch {
      return null
    }
  }

  // Send broadcast push to all subscribers
  const sendBroadcastPush = async (payload: { title: string; body: string; icon?: string; url?: string }) => {
    try {
      // Get all active subscriptions
      const { data: subs } = await supabase
        .from('push_subscriptions')
        .select('user_id')
        .eq('is_active', true)
      
      if (!subs || subs.length === 0) return { sent: 0, total: 0 }
      
      // Get unique user IDs
      const userIds = [...new Set(subs.map((s: { user_id: string }) => s.user_id))]
      
      // Queue notifications for all users
      const notifications = userIds.map(userId => ({
        user_id: userId,
        title: payload.title,
        body: payload.body,
        icon: payload.icon || '/pwa-192x192.png',
        url: payload.url,
        scheduled_for: new Date().toISOString(),
        status: 'pending'
      }))
      
      await (supabase.from('push_notification_queue') as any).insert(notifications)
      
      // Process queue immediately
      const result = await processPushQueue()
      
      return { sent: result?.processed || 0, total: userIds.length }
    } catch {
      return { sent: 0, total: 0 }
    }
  }

  // =====================================================
  // SCHEDULED NOTIFICATIONS
  // =====================================================

  // Fetch scheduled notifications
  const fetchScheduledNotifications = async (page = 1, limit = 20, filter?: { status?: string }) => {
    try {
      let query = supabase.from('scheduled_notifications').select('*', { count: 'exact' })
      if (filter?.status) query = query.eq('status', filter.status)
      const { data, count } = await query
        .range((page - 1) * limit, page * limit - 1)
        .order('scheduled_at', { ascending: true })
      return { data: data || [], total: count || 0 }
    } catch {
      return { data: generateMockScheduledNotifications(), total: 5 }
    }
  }

  // Create scheduled notification
  const createScheduledNotification = async (notification: {
    title: string
    message: string
    type: string
    actionUrl?: string
    scheduledAt: string
    segment: string
    segmentConfig?: Record<string, any>
    templateVariables?: Record<string, string>
  }) => {
    try {
      const { data, error } = await (supabase.from('scheduled_notifications') as any).insert({
        title: notification.title,
        message: notification.message,
        type: notification.type,
        action_url: notification.actionUrl,
        scheduled_at: notification.scheduledAt,
        segment: notification.segment,
        segment_config: notification.segmentConfig || {},
        template_variables: notification.templateVariables || {},
        status: 'scheduled'
      }).select().single()
      
      if (error) throw error
      return data
    } catch {
      return null
    }
  }

  // Cancel scheduled notification
  const cancelScheduledNotification = async (id: string) => {
    try {
      await (supabase.from('scheduled_notifications') as any)
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', id)
      return true
    } catch {
      return false
    }
  }

  // Get segment user count preview
  const getSegmentUserCount = async (segment: string, config: Record<string, any> = {}) => {
    try {
      const { data } = await (supabase.rpc as any)('get_segment_user_count', {
        p_segment: segment,
        p_config: config
      })
      return data || 0
    } catch {
      // Return mock counts for demo
      const mockCounts: Record<string, number> = {
        all: 1247,
        new_users: 156,
        inactive: 234,
        subscribers: 89,
        non_subscribers: 1158,
        high_value: 67
      }
      return mockCounts[segment] || 0
    }
  }

  // Get users by segment (for preview)
  const getUsersBySegment = async (segment: string, config: Record<string, any> = {}, limit = 10) => {
    try {
      // For custom segment, just return the user_ids from config
      if (segment === 'custom' && config.user_ids) {
        const { data } = await supabase.from('users').select('id, name, email').in('id', config.user_ids).limit(limit)
        return data || []
      }
      
      // For other segments, we'd need to call the DB function
      // For now, return mock data
      return generateMockUsers().slice(0, limit)
    } catch {
      return []
    }
  }

  // Mock scheduled notifications
  const generateMockScheduledNotifications = () => [
    { id: '1', title: 'โปรโมชั่นวันหยุด', message: 'รับส่วนลด 20% ทุกเที่ยว', type: 'promo', scheduled_at: new Date(Date.now() + 86400000).toISOString(), segment: 'all', status: 'scheduled', sent_count: 0 },
    { id: '2', title: 'คิดถึงคุณ!', message: 'กลับมาใช้บริการ รับส่วนลด 50 บาท', type: 'promo', scheduled_at: new Date(Date.now() + 172800000).toISOString(), segment: 'inactive', status: 'scheduled', sent_count: 0 },
    { id: '3', title: 'ขอบคุณสมาชิก', message: 'สิทธิพิเศษสำหรับสมาชิก', type: 'system', scheduled_at: new Date(Date.now() - 86400000).toISOString(), segment: 'subscribers', status: 'sent', sent_count: 89 }
  ]

  // Replace template variables with actual values
  const replaceTemplateVariables = (text: string, variables: Record<string, string>): string => {
    let result = text
    // Replace custom variables
    Object.entries(variables).forEach(([key, value]) => {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value)
    })
    // Replace default variables
    result = result.replace(/\{\{app_name\}\}/g, 'Thai Ride')
    result = result.replace(/\{\{date\}\}/g, new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }))
    return result
  }

  // Extract variables from template text
  const extractTemplateVariables = (text: string): string[] => {
    const matches = text.match(/\{\{(\w+)\}\}/g) || []
    return [...new Set(matches.map(m => m.replace(/\{\{|\}\}/g, '')))]
  }

  return {
    loading, error, stats, recentOrders, recentUsers, recentPayments,
    fetchDashboardStats, fetchRecentOrders, fetchUsers, fetchProviders,
    fetchPayments, fetchSupportTickets, fetchPromoCodes,
    updateUserStatus, updateProviderStatus, updateTicketStatus, createPromoCode, updatePromoCode,
    verifyUser,
    getRevenueChartData, getOrdersChartData,
    // Advanced features
    fetchSubscriptions, fetchSubscriptionPlans, updateSubscriptionPlan,
    fetchInsuranceClaims, updateInsuranceClaim, fetchInsurancePlans,
    fetchCompanies, updateCompanyStatus, fetchCompanyEmployees,
    fetchScheduledRides,
    // F26 - Service Ratings
    fetchDeliveryRatings, fetchShoppingRatings, fetchRideRatings,
    fetchRatingsStats, deleteRating,
    // Notifications Management
    fetchAllNotifications, fetchNotificationStats, sendBulkNotification,
    deleteNotification,
    // Notification Templates
    fetchNotificationTemplates, createNotificationTemplate,
    updateNotificationTemplate, deleteNotificationTemplate, useNotificationTemplate,
    // Template Variables
    TEMPLATE_VARIABLES, replaceTemplateVariables, extractTemplateVariables,
    // User Segments
    USER_SEGMENTS,
    // Scheduled Notifications
    fetchScheduledNotifications, createScheduledNotification, cancelScheduledNotification,
    getSegmentUserCount, getUsersBySegment,
    // Push Notifications
    fetchPushSubscriptions, fetchPushQueue, fetchPushStats,
    sendPushToUser, processPushQueue, queuePushNotification, sendBroadcastPush,
    // Provider Cancellations
    fetchProviderCancellations, fetchProviderCancellationStats
  }
}

// =====================================================
// PROVIDER CANCELLATION FUNCTIONS (F14 Enhancement)
// =====================================================

// Fetch provider cancellations
async function fetchProviderCancellations(page = 1, limit = 20, filter?: { providerId?: string; requestType?: string }) {
  try {
    let query = supabase.from('provider_cancellations').select(`
      *,
      provider:provider_id (vehicle_type, vehicle_plate, users(name)),
      ride:ride_id (tracking_id, pickup_address)
    `, { count: 'exact' })
    
    if (filter?.providerId) query = query.eq('provider_id', filter.providerId)
    if (filter?.requestType) query = query.eq('request_type', filter.requestType)
    
    const { data, count } = await query
      .range((page - 1) * limit, page * limit - 1)
      .order('cancelled_at', { ascending: false })
    
    return { data: data || [], total: count || 0 }
  } catch {
    return { data: [], total: 0 }
  }
}

// Fetch cancellation stats for a provider
async function fetchProviderCancellationStats(providerId: string, days = 30) {
  try {
    const { data } = await (supabase.rpc as any)('get_provider_cancellation_stats', {
      p_provider_id: providerId,
      p_days: days
    })
    return data?.[0] || { total_cancellations: 0, cancellation_rate: 0, total_completed: 0, penalty_total: 0, is_flagged: false }
  } catch {
    return { total_cancellations: 0, cancellation_rate: 0, total_completed: 0, penalty_total: 0, is_flagged: false }
  }
}
