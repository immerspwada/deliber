/**
 * useCustomerManagement - Advanced Customer Management Composable
 * 
 * Feature: F23 - Admin Dashboard (Customer Management)
 * Tables: users, ride_requests, delivery_requests, shopping_requests, user_wallets, user_loyalty
 * 
 * @architecture
 * - Smart Caching: LRU cache with TTL for customer data
 * - URL Sync: Pagination, filters, and search in URL params
 * - Race Condition Prevention: Request cancellation with AbortController
 * - Optimistic Updates: Instant UI feedback with rollback
 * - Memory Management: Auto-cleanup on unmount
 * 
 * @50-session-rule
 * - Handles 50+ admin actions without memory leaks
 * - Instant cache hits for revisited customers
 * - Proper cleanup of subscriptions and timers
 */

import { ref, computed, watch, onUnmounted, shallowRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

// Types
export interface Customer {
  id: string
  member_uid: string | null
  name: string
  first_name: string | null
  last_name: string | null
  email: string
  phone: string | null
  phone_number: string | null
  role: string
  is_active: boolean
  verification_status: 'pending' | 'verified' | 'rejected' | 'suspended'
  verified_at: string | null
  national_id: string | null
  gender: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
  // Computed/joined fields
  total_rides?: number
  total_spent?: number
  wallet_balance?: number
  loyalty_points?: number
  last_activity?: string
}

export interface CustomerFilters {
  status?: 'active' | 'inactive' | ''
  verification_status?: 'pending' | 'verified' | 'rejected' | 'suspended' | ''
  role?: 'customer' | 'driver' | 'rider' | 'admin' | ''
  search?: string
  sort?: string
  order?: 'asc' | 'desc'
}

export interface CustomerStats {
  total: number
  active: number
  inactive: number
  pending: number
  verified: number
  rejected: number
  newThisMonth: number
}

// Customer Tags & Notes Types
export interface CustomerTag {
  id: string
  name: string
  name_th: string | null
  color: string
  bg_color: string
  icon: string | null
  description: string | null
  is_system: boolean
  sort_order: number
}

export interface CustomerTagAssignment {
  tag_id: string
  name: string
  name_th: string | null
  color: string
  bg_color: string
  icon: string | null
  assigned_at: string
}

export interface CustomerNote {
  id: string
  user_id: string
  admin_id: string
  admin_name?: string
  note: string
  is_pinned: boolean
  is_important: boolean
  created_at: string
  updated_at: string
}

export interface CustomerQuickStats {
  rides_this_month: number
  spent_this_month: number
  deliveries_this_month: number
  shopping_this_month: number
  total_rides: number
  total_spent: number
  avg_ride_fare: number
  last_ride_at: string | null
  first_ride_at: string | null
  days_since_last_ride: number | null
  activity_level: 'high' | 'medium' | 'low'
}

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

// LRU Cache implementation
class LRUCache<K, V> {
  private cache = new Map<K, CacheEntry<V>>()
  private maxSize: number
  private defaultTTL: number

  constructor(maxSize = 100, defaultTTL = 5 * 60 * 1000) { // 5 min default TTL
    this.maxSize = maxSize
    this.defaultTTL = defaultTTL
  }

  get(key: K): V | null {
    const entry = this.cache.get(key)
    if (!entry) return null
    
    // Check TTL
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }
    
    // Move to end (most recently used)
    this.cache.delete(key)
    this.cache.set(key, entry)
    return entry.data
  }

  set(key: K, value: V, ttl = this.defaultTTL): void {
    // Remove oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      if (firstKey !== undefined) {
        this.cache.delete(firstKey)
      }
    }
    
    this.cache.set(key, {
      data: value,
      timestamp: Date.now(),
      ttl
    })
  }

  invalidate(key: K): void {
    this.cache.delete(key)
  }

  invalidateAll(): void {
    this.cache.clear()
  }

  has(key: K): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return false
    }
    return true
  }
}

// Global cache instances (shared across component instances)
const customerCache = new LRUCache<string, Customer>(200, 5 * 60 * 1000)
const listCache = new LRUCache<string, { data: Customer[]; total: number }>(50, 2 * 60 * 1000)
const statsCache = new LRUCache<string, CustomerStats>(1, 60 * 1000)

export function useCustomerManagement() {
  const route = useRoute()
  const router = useRouter()

  // State
  const customers = shallowRef<Customer[]>([])
  const selectedCustomer = ref<Customer | null>(null)
  const stats = ref<CustomerStats>({
    total: 0,
    active: 0,
    inactive: 0,
    pending: 0,
    verified: 0,
    rejected: 0,
    newThisMonth: 0
  })
  
  // Loading states
  const loading = ref(false)
  const loadingCustomer = ref(false)
  const loadingStats = ref(false)
  const error = ref<string | null>(null)
  
  // Pagination
  const page = ref(1)
  const pageSize = ref(50)
  const total = ref(0)
  const totalPages = computed(() => Math.ceil(total.value / pageSize.value))
  
  // Filters (synced with URL)
  const filters = ref<CustomerFilters>({
    status: '',
    verification_status: '',
    role: '',
    search: '',
    sort: 'created_at',
    order: 'desc'
  })

  // Request management
  let currentAbortController: AbortController | null = null
  let realtimeChannel: RealtimeChannel | null = null
  const pendingRequests = new Set<AbortController>()

  // Debounce timer
  let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null

  // =====================================================
  // URL SYNCHRONIZATION
  // =====================================================
  
  const syncFromURL = () => {
    const query = route.query
    page.value = parseInt(query.page as string) || 1
    pageSize.value = parseInt(query.limit as string) || 50
    filters.value = {
      status: (query.status as CustomerFilters['status']) || '',
      verification_status: (query.verification as CustomerFilters['verification_status']) || '',
      role: (query.role as CustomerFilters['role']) || '',
      search: (query.search as string) || '',
      sort: (query.sort as string) || 'created_at',
      order: (query.order as 'asc' | 'desc') || 'desc'
    }
  }

  const syncToURL = () => {
    const query: Record<string, string> = {}
    
    if (page.value > 1) query.page = String(page.value)
    if (pageSize.value !== 50) query.limit = String(pageSize.value)
    if (filters.value.status) query.status = filters.value.status
    if (filters.value.verification_status) query.verification = filters.value.verification_status
    if (filters.value.role) query.role = filters.value.role
    if (filters.value.search) query.search = filters.value.search
    if (filters.value.sort && filters.value.sort !== 'created_at') query.sort = filters.value.sort
    if (filters.value.order && filters.value.order !== 'desc') query.order = filters.value.order
    
    // Only update if different
    const currentQuery = { ...route.query }
    const hasChanges = Object.keys(query).some(k => query[k] !== currentQuery[k]) ||
                       Object.keys(currentQuery).some(k => !query[k] && currentQuery[k])
    
    if (hasChanges) {
      router.replace({ query })
    }
  }

  // Generate cache key from current filters
  const getCacheKey = (): string => {
    return JSON.stringify({
      page: page.value,
      pageSize: pageSize.value,
      ...filters.value
    })
  }

  // =====================================================
  // DATA FETCHING WITH CACHING
  // =====================================================

  const fetchCustomers = async (forceRefresh = false): Promise<void> => {
    // Cancel any pending request
    if (currentAbortController) {
      currentAbortController.abort()
      pendingRequests.delete(currentAbortController)
    }
    
    const cacheKey = getCacheKey()
    
    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = listCache.get(cacheKey)
      if (cached) {
        customers.value = cached.data
        total.value = cached.total
        return
      }
    }
    
    loading.value = true
    error.value = null
    currentAbortController = new AbortController()
    pendingRequests.add(currentAbortController)
    
    try {
      let query = supabase
        .from('users')
        .select('*', { count: 'exact' })
      
      // Apply filters
      if (filters.value.status === 'active') {
        query = query.eq('is_active', true)
      } else if (filters.value.status === 'inactive') {
        query = query.eq('is_active', false)
      }
      
      if (filters.value.verification_status) {
        query = query.eq('verification_status', filters.value.verification_status)
      }
      
      if (filters.value.role) {
        query = query.eq('role', filters.value.role)
      }
      
      // Search with OR conditions
      if (filters.value.search) {
        const searchTerm = filters.value.search.trim()
        query = query.or(
          `name.ilike.%${searchTerm}%,` +
          `email.ilike.%${searchTerm}%,` +
          `phone.ilike.%${searchTerm}%,` +
          `phone_number.ilike.%${searchTerm}%,` +
          `first_name.ilike.%${searchTerm}%,` +
          `last_name.ilike.%${searchTerm}%,` +
          `member_uid.ilike.%${searchTerm}%`
        )
      }
      
      // Sorting
      const sortField = (filters.value.sort || 'created_at') as string
      const sortOrder = filters.value.order === 'asc'
      query = query.order(sortField as any, { ascending: sortOrder })
      
      // Pagination
      const from = (page.value - 1) * pageSize.value
      const to = from + pageSize.value - 1
      query = query.range(from, to)
      
      const { data, count, error: fetchError } = await query
      
      // Check if request was aborted
      if (currentAbortController?.signal.aborted) {
        return
      }
      
      if (fetchError) throw fetchError
      
      // Transform data
      const transformedData: Customer[] = (data || []).map(transformCustomer)
      
      // Update state
      customers.value = transformedData
      total.value = count || 0
      
      // Cache the result
      listCache.set(cacheKey, { data: transformedData, total: count || 0 })
      
      // Also cache individual customers
      transformedData.forEach(c => customerCache.set(c.id, c))
      
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        error.value = err.message || 'Failed to fetch customers'
        console.error('Fetch customers error:', err)
      }
    } finally {
      loading.value = false
      if (currentAbortController) {
        pendingRequests.delete(currentAbortController)
      }
    }
  }

  const fetchCustomerById = async (id: string, forceRefresh = false): Promise<Customer | null> => {
    // Check cache first
    if (!forceRefresh) {
      const cached = customerCache.get(id)
      if (cached) {
        selectedCustomer.value = cached
        return cached
      }
    }
    
    loadingCustomer.value = true
    
    try {
      // Fetch customer with related data
      const { data, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single()
      
      if (fetchError) throw fetchError
      if (!data) return null
      
      const customer = transformCustomer(data)
      
      // Fetch additional stats in parallel
      // Use maybeSingle() instead of single() to avoid 406 errors when records don't exist
      const [ridesResult, walletResult, loyaltyResult] = await Promise.allSettled([
        supabase
          .from('ride_requests')
          .select('id, final_fare', { count: 'exact' })
          .eq('user_id', id)
          .eq('status', 'completed'),
        supabase
          .from('user_wallets')
          .select('balance')
          .eq('user_id', id)
          .maybeSingle(),
        supabase
          .from('user_loyalty')
          .select('current_points')
          .eq('user_id', id)
          .maybeSingle()
      ])
      
      // Safely extract results
      if (ridesResult.status === 'fulfilled') {
        const ridesValue = ridesResult.value as any
        if (ridesValue?.data) {
          customer.total_rides = ridesValue.count || 0
          customer.total_spent = ridesValue.data.reduce(
            (sum: number, r: any) => sum + (r.final_fare || 0), 0
          )
        }
      }
      
      if (walletResult.status === 'fulfilled') {
        const walletValue = walletResult.value as any
        if (walletValue?.data) {
          customer.wallet_balance = walletValue.data.balance || 0
        }
      }
      
      if (loyaltyResult.status === 'fulfilled') {
        const loyaltyValue = loyaltyResult.value as any
        if (loyaltyValue?.data) {
          customer.loyalty_points = loyaltyValue.data.current_points || 0
        }
      }
      
      // Cache and return
      customerCache.set(id, customer)
      selectedCustomer.value = customer
      return customer
      
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch customer'
      console.error('Fetch customer error:', err)
      return null
    } finally {
      loadingCustomer.value = false
    }
  }

  const fetchStats = async (forceRefresh = false): Promise<void> => {
    // Check cache
    if (!forceRefresh) {
      const cached = statsCache.get('stats')
      if (cached) {
        stats.value = cached
        return
      }
    }
    
    loadingStats.value = true
    
    try {
      // Parallel queries for stats
      const [
        totalResult,
        activeResult,
        pendingResult,
        verifiedResult,
        rejectedResult,
        newThisMonthResult
      ] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('verification_status', 'pending'),
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('verification_status', 'verified'),
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('verification_status', 'rejected'),
        supabase.from('users').select('*', { count: 'exact', head: true })
          .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
      ])
      
      const newStats: CustomerStats = {
        total: totalResult.count || 0,
        active: activeResult.count || 0,
        inactive: (totalResult.count || 0) - (activeResult.count || 0),
        pending: pendingResult.count || 0,
        verified: verifiedResult.count || 0,
        rejected: rejectedResult.count || 0,
        newThisMonth: newThisMonthResult.count || 0
      }
      
      stats.value = newStats
      statsCache.set('stats', newStats)
      
    } catch (err: any) {
      console.error('Fetch stats error:', err)
    } finally {
      loadingStats.value = false
    }
  }

  // =====================================================
  // MUTATIONS WITH OPTIMISTIC UPDATES
  // =====================================================

  const updateCustomerStatus = async (
    customerId: string, 
    isActive: boolean
  ): Promise<boolean> => {
    // Optimistic update
    const previousCustomers = [...customers.value]
    const previousSelected = selectedCustomer.value ? { ...selectedCustomer.value } : null
    
    // Update local state immediately
    customers.value = customers.value.map(c => 
      c.id === customerId ? { ...c, is_active: isActive } : c
    )
    if (selectedCustomer.value?.id === customerId) {
      selectedCustomer.value = { ...selectedCustomer.value, is_active: isActive }
    }
    
    try {
      const { error: updateError } = await (supabase as any)
        .from('users')
        .update({ 
          is_active: isActive,
          updated_at: new Date().toISOString()
        })
        .eq('id', customerId)
      
      if (updateError) throw updateError
      
      // Invalidate caches
      customerCache.invalidate(customerId)
      listCache.invalidateAll()
      statsCache.invalidateAll()
      
      // Refresh stats
      fetchStats(true)
      
      return true
    } catch (err: any) {
      // Rollback on error
      customers.value = previousCustomers
      if (previousSelected) {
        selectedCustomer.value = previousSelected
      }
      error.value = err.message || 'Failed to update status'
      return false
    }
  }

  const verifyCustomer = async (
    customerId: string,
    status: 'verified' | 'rejected',
    reason?: string
  ): Promise<boolean> => {
    // Optimistic update
    const previousCustomers = [...customers.value]
    const previousSelected = selectedCustomer.value ? { ...selectedCustomer.value } : null
    
    const updates = {
      verification_status: status,
      is_active: status === 'verified',
      verified_at: status === 'verified' ? new Date().toISOString() : null
    }
    
    // Update local state immediately
    customers.value = customers.value.map(c => 
      c.id === customerId ? { ...c, ...updates } : c
    )
    if (selectedCustomer.value?.id === customerId) {
      selectedCustomer.value = { ...selectedCustomer.value, ...updates }
    }
    
    try {
      const { error: updateError } = await (supabase as any)
        .from('users')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', customerId)
      
      if (updateError) throw updateError
      
      // Send notification to user
      await (supabase as any).from('user_notifications').insert({
        user_id: customerId,
        type: 'system',
        title: status === 'verified' ? 'ยืนยันตัวตนสำเร็จ' : 'การยืนยันตัวตนถูกปฏิเสธ',
        message: status === 'verified' 
          ? 'บัญชีของคุณได้รับการยืนยันแล้ว สามารถใช้งานได้เต็มรูปแบบ'
          : reason || 'กรุณาตรวจสอบข้อมูลและลองใหม่อีกครั้ง',
        data: { verification_status: status }
      })
      
      // Invalidate caches
      customerCache.invalidate(customerId)
      listCache.invalidateAll()
      statsCache.invalidateAll()
      
      // Refresh stats
      fetchStats(true)
      
      return true
    } catch (err: any) {
      // Rollback on error
      customers.value = previousCustomers
      if (previousSelected) {
        selectedCustomer.value = previousSelected
      }
      error.value = err.message || 'Failed to verify customer'
      return false
    }
  }

  // =====================================================
  // SEARCH WITH DEBOUNCE
  // =====================================================

  const setSearch = (searchTerm: string) => {
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer)
    }
    
    searchDebounceTimer = setTimeout(() => {
      filters.value.search = searchTerm
      page.value = 1 // Reset to first page on search
      syncToURL()
      fetchCustomers()
    }, 300) // 300ms debounce
  }

  // =====================================================
  // PAGINATION & FILTERS
  // =====================================================

  const setPage = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages.value) return
    page.value = newPage
    syncToURL()
    fetchCustomers()
  }

  const setFilter = <K extends keyof CustomerFilters>(
    key: K, 
    value: CustomerFilters[K]
  ) => {
    filters.value[key] = value
    page.value = 1 // Reset to first page on filter change
    syncToURL()
    fetchCustomers()
  }

  const resetFilters = () => {
    filters.value = {
      status: '',
      verification_status: '',
      role: '',
      search: '',
      sort: 'created_at',
      order: 'desc'
    }
    page.value = 1
    syncToURL()
    fetchCustomers()
  }

  const setSort = (field: string) => {
    if (filters.value.sort === field) {
      // Toggle order
      filters.value.order = filters.value.order === 'asc' ? 'desc' : 'asc'
    } else {
      filters.value.sort = field
      filters.value.order = 'desc'
    }
    syncToURL()
    fetchCustomers()
  }

  // =====================================================
  // REALTIME SUBSCRIPTION
  // =====================================================

  const setupRealtimeSubscription = () => {
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel)
    }
    
    realtimeChannel = supabase
      .channel('admin-customers')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'users' },
        (payload) => {
          // Invalidate caches on any change
          if (payload.new && typeof payload.new === 'object' && 'id' in payload.new) {
            customerCache.invalidate(payload.new.id as string)
          }
          listCache.invalidateAll()
          statsCache.invalidateAll()
          
          // Refresh current view
          fetchCustomers()
          fetchStats()
        }
      )
      .subscribe()
  }

  // =====================================================
  // ACTIVITY TIMELINE
  // =====================================================

  interface ActivityItem {
    id: string
    type: 'ride' | 'delivery' | 'shopping' | 'payment' | 'wallet' | 'loyalty'
    title: string
    description: string
    amount?: number
    status: string
    created_at: string
    icon: string
    color: string
  }

  const activityTimeline = ref<ActivityItem[]>([])
  const loadingTimeline = ref(false)

  const fetchActivityTimeline = async (customerId: string, limit = 20): Promise<ActivityItem[]> => {
    loadingTimeline.value = true
    const activities: ActivityItem[] = []

    try {
      // Fetch all activity types in parallel
      const [ridesResult, deliveriesResult, shoppingResult, walletResult] = await Promise.allSettled([
        supabase
          .from('ride_requests')
          .select('id, status, pickup_address, destination_address, final_fare, created_at')
          .eq('user_id', customerId)
          .order('created_at', { ascending: false })
          .limit(limit),
        supabase
          .from('delivery_requests')
          .select('id, status, sender_address, recipient_address, estimated_fee, created_at')
          .eq('user_id', customerId)
          .order('created_at', { ascending: false })
          .limit(limit),
        supabase
          .from('shopping_requests')
          .select('id, status, store_name, service_fee, created_at')
          .eq('user_id', customerId)
          .order('created_at', { ascending: false })
          .limit(limit),
        supabase
          .from('wallet_transactions')
          .select('id, type, amount, description, created_at')
          .eq('user_id', customerId)
          .order('created_at', { ascending: false })
          .limit(limit)
      ])

      // Process rides
      if (ridesResult.status === 'fulfilled' && ridesResult.value.data) {
        ridesResult.value.data.forEach((r: any) => {
          activities.push({
            id: r.id,
            type: 'ride',
            title: 'เรียกรถ',
            description: `${r.pickup_address?.split(',')[0] || ''} → ${r.destination_address?.split(',')[0] || ''}`,
            amount: r.final_fare,
            status: r.status,
            created_at: r.created_at,
            icon: 'car',
            color: '#00A86B'
          })
        })
      }

      // Process deliveries
      if (deliveriesResult.status === 'fulfilled' && deliveriesResult.value.data) {
        deliveriesResult.value.data.forEach((d: any) => {
          activities.push({
            id: d.id,
            type: 'delivery',
            title: 'ส่งของ',
            description: `${d.sender_address?.split(',')[0] || ''} → ${d.recipient_address?.split(',')[0] || ''}`,
            amount: d.estimated_fee,
            status: d.status,
            created_at: d.created_at,
            icon: 'package',
            color: '#F5A623'
          })
        })
      }

      // Process shopping
      if (shoppingResult.status === 'fulfilled' && shoppingResult.value.data) {
        shoppingResult.value.data.forEach((s: any) => {
          activities.push({
            id: s.id,
            type: 'shopping',
            title: 'ซื้อของ',
            description: s.store_name || 'ร้านค้า',
            amount: s.service_fee,
            status: s.status,
            created_at: s.created_at,
            icon: 'shopping',
            color: '#E53935'
          })
        })
      }

      // Process wallet transactions
      if (walletResult.status === 'fulfilled' && walletResult.value.data) {
        walletResult.value.data.forEach((w: any) => {
          activities.push({
            id: w.id,
            type: 'wallet',
            title: w.type === 'topup' ? 'เติมเงิน' : w.type === 'payment' ? 'ชำระเงิน' : 'ธุรกรรม',
            description: w.description || '',
            amount: w.amount,
            status: 'completed',
            created_at: w.created_at,
            icon: 'wallet',
            color: '#2196F3'
          })
        })
      }

      // Sort by date descending
      activities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      
      // Limit total results
      activityTimeline.value = activities.slice(0, limit)
      return activityTimeline.value

    } catch (err: any) {
      console.error('Fetch activity timeline error:', err)
      return []
    } finally {
      loadingTimeline.value = false
    }
  }

  // =====================================================
  // EXPORT CSV/EXCEL
  // =====================================================

  const exportingCSV = ref(false)

  const exportToCSV = async (): Promise<void> => {
    exportingCSV.value = true

    try {
      // Fetch all customers matching current filters (no pagination)
      let query = supabase.from('users').select('*')

      if (filters.value.status === 'active') {
        query = query.eq('is_active', true)
      } else if (filters.value.status === 'inactive') {
        query = query.eq('is_active', false)
      }

      if (filters.value.verification_status) {
        query = query.eq('verification_status', filters.value.verification_status)
      }

      if (filters.value.role) {
        query = query.eq('role', filters.value.role)
      }

      if (filters.value.search) {
        const searchTerm = filters.value.search.trim()
        query = query.or(
          `name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,member_uid.ilike.%${searchTerm}%`
        )
      }

      const sortField = filters.value.sort || 'created_at'
      const sortOrder = filters.value.order === 'asc'
      query = query.order(sortField, { ascending: sortOrder })

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      // Transform to CSV
      const headers = [
        'Member ID',
        'ชื่อ',
        'นามสกุล',
        'อีเมล',
        'เบอร์โทร',
        'บทบาท',
        'สถานะ',
        'การยืนยัน',
        'วันที่สมัคร'
      ]

      const rows = (data || []).map((c: any) => [
        c.member_uid || '',
        c.first_name || c.name?.split(' ')[0] || '',
        c.last_name || c.name?.split(' ')[1] || '',
        c.email || '',
        c.phone || c.phone_number || '',
        c.role || 'customer',
        c.is_active ? 'ใช้งาน' : 'ระงับ',
        c.verification_status === 'verified' ? 'ยืนยันแล้ว' : 
          c.verification_status === 'rejected' ? 'ปฏิเสธ' : 'รอตรวจสอบ',
        new Date(c.created_at).toLocaleDateString('th-TH')
      ])

      // Create CSV content with BOM for Thai characters
      const BOM = '\uFEFF'
      const csvContent = BOM + [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n')

      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `customers_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

    } catch (err: any) {
      error.value = err.message || 'Failed to export CSV'
      console.error('Export CSV error:', err)
    } finally {
      exportingCSV.value = false
    }
  }

  const exportToExcel = async (): Promise<void> => {
    // For Excel, we'll create an HTML table that Excel can open
    exportingCSV.value = true

    try {
      let query = supabase.from('users').select('*')

      if (filters.value.status === 'active') {
        query = query.eq('is_active', true)
      } else if (filters.value.status === 'inactive') {
        query = query.eq('is_active', false)
      }

      if (filters.value.verification_status) {
        query = query.eq('verification_status', filters.value.verification_status)
      }

      if (filters.value.role) {
        query = query.eq('role', filters.value.role)
      }

      const { data, error: fetchError } = await query.order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      // Create HTML table for Excel
      const html = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
        <head><meta charset="UTF-8"></head>
        <body>
        <table border="1">
          <tr>
            <th>Member ID</th>
            <th>ชื่อ</th>
            <th>นามสกุล</th>
            <th>อีเมล</th>
            <th>เบอร์โทร</th>
            <th>บทบาท</th>
            <th>สถานะ</th>
            <th>การยืนยัน</th>
            <th>วันที่สมัคร</th>
          </tr>
          ${(data || []).map((c: any) => `
            <tr>
              <td>${c.member_uid || ''}</td>
              <td>${c.first_name || c.name?.split(' ')[0] || ''}</td>
              <td>${c.last_name || c.name?.split(' ')[1] || ''}</td>
              <td>${c.email || ''}</td>
              <td>${c.phone || c.phone_number || ''}</td>
              <td>${c.role || 'customer'}</td>
              <td>${c.is_active ? 'ใช้งาน' : 'ระงับ'}</td>
              <td>${c.verification_status === 'verified' ? 'ยืนยันแล้ว' : c.verification_status === 'rejected' ? 'ปฏิเสธ' : 'รอตรวจสอบ'}</td>
              <td>${new Date(c.created_at).toLocaleDateString('th-TH')}</td>
            </tr>
          `).join('')}
        </table>
        </body>
        </html>
      `

      const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `customers_${new Date().toISOString().split('T')[0]}.xls`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

    } catch (err: any) {
      error.value = err.message || 'Failed to export Excel'
    } finally {
      exportingCSV.value = false
    }
  }

  // =====================================================
  // BULK ACTIONS
  // =====================================================

  const selectedIds = ref<Set<string>>(new Set())
  const bulkActionLoading = ref(false)

  const toggleSelection = (id: string) => {
    if (selectedIds.value.has(id)) {
      selectedIds.value.delete(id)
    } else {
      selectedIds.value.add(id)
    }
    // Trigger reactivity
    selectedIds.value = new Set(selectedIds.value)
  }

  const selectAll = () => {
    if (selectedIds.value.size === customers.value.length) {
      selectedIds.value = new Set()
    } else {
      selectedIds.value = new Set(customers.value.map(c => c.id))
    }
  }

  const clearSelection = () => {
    selectedIds.value = new Set()
  }

  const isSelected = (id: string): boolean => {
    return selectedIds.value.has(id)
  }

  const isAllSelected = computed(() => {
    return customers.value.length > 0 && selectedIds.value.size === customers.value.length
  })

  const selectedCount = computed(() => selectedIds.value.size)

  const bulkUpdateStatus = async (isActive: boolean): Promise<{ success: number; failed: number }> => {
    if (selectedIds.value.size === 0) return { success: 0, failed: 0 }

    bulkActionLoading.value = true
    let success = 0
    let failed = 0

    try {
      const ids = Array.from(selectedIds.value)
      
      // Update in batches of 10
      const batchSize = 10
      for (let i = 0; i < ids.length; i += batchSize) {
        const batch = ids.slice(i, i + batchSize)
        
        const { error: updateError } = await (supabase as any)
          .from('users')
          .update({ 
            is_active: isActive,
            updated_at: new Date().toISOString()
          })
          .in('id', batch)

        if (updateError) {
          failed += batch.length
        } else {
          success += batch.length
        }
      }

      // Invalidate caches and refresh
      listCache.invalidateAll()
      statsCache.invalidateAll()
      ids.forEach(id => customerCache.invalidate(id))
      
      await Promise.all([fetchCustomers(true), fetchStats(true)])
      clearSelection()

      return { success, failed }

    } catch (err: any) {
      error.value = err.message || 'Bulk update failed'
      return { success, failed: selectedIds.value.size - success }
    } finally {
      bulkActionLoading.value = false
    }
  }

  const bulkVerify = async (status: 'verified' | 'rejected'): Promise<{ success: number; failed: number }> => {
    if (selectedIds.value.size === 0) return { success: 0, failed: 0 }

    bulkActionLoading.value = true
    let success = 0
    let failed = 0

    try {
      const ids = Array.from(selectedIds.value)
      const updates = {
        verification_status: status,
        is_active: status === 'verified',
        verified_at: status === 'verified' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      }

      // Update in batches
      const batchSize = 10
      for (let i = 0; i < ids.length; i += batchSize) {
        const batch = ids.slice(i, i + batchSize)
        
        const { error: updateError } = await (supabase as any)
          .from('users')
          .update(updates)
          .in('id', batch)

        if (updateError) {
          failed += batch.length
        } else {
          success += batch.length
          
          // Send notifications
          const notifications = batch.map(userId => ({
            user_id: userId,
            type: 'system',
            title: status === 'verified' ? 'ยืนยันตัวตนสำเร็จ' : 'การยืนยันตัวตนถูกปฏิเสธ',
            message: status === 'verified' 
              ? 'บัญชีของคุณได้รับการยืนยันแล้ว'
              : 'กรุณาตรวจสอบข้อมูลและลองใหม่อีกครั้ง',
            data: { verification_status: status }
          }))
          
          await (supabase as any).from('user_notifications').insert(notifications)
        }
      }

      // Invalidate caches and refresh
      listCache.invalidateAll()
      statsCache.invalidateAll()
      ids.forEach(id => customerCache.invalidate(id))
      
      await Promise.all([fetchCustomers(true), fetchStats(true)])
      clearSelection()

      return { success, failed }

    } catch (err: any) {
      error.value = err.message || 'Bulk verify failed'
      return { success, failed: selectedIds.value.size - success }
    } finally {
      bulkActionLoading.value = false
    }
  }

  // =====================================================
  // CUSTOMER TAGS
  // =====================================================

  const availableTags = ref<CustomerTag[]>([])
  const customerTags = ref<CustomerTagAssignment[]>([])
  const loadingTags = ref(false)

  const fetchAvailableTags = async (): Promise<CustomerTag[]> => {
    try {
      const { data, error: fetchError } = await supabase
        .from('customer_tags')
        .select('*')
        .order('sort_order')

      if (fetchError) throw fetchError
      availableTags.value = data || []
      return availableTags.value
    } catch (err: any) {
      console.error('Fetch tags error:', err)
      return []
    }
  }

  const fetchCustomerTags = async (customerId: string): Promise<CustomerTagAssignment[]> => {
    loadingTags.value = true
    try {
      const { data, error: fetchError } = await supabase
        .rpc('get_customer_tags', { p_user_id: customerId } as any)

      if (fetchError) throw fetchError
      customerTags.value = (data as CustomerTagAssignment[]) || []
      return customerTags.value
    } catch (err: any) {
      console.error('Fetch customer tags error:', err)
      return []
    } finally {
      loadingTags.value = false
    }
  }

  const assignTag = async (customerId: string, tagId: string): Promise<boolean> => {
    try {
      const adminUser = JSON.parse(localStorage.getItem('admin_user') || '{}')
      const { error: assignError } = await supabase
        .rpc('assign_customer_tag', {
          p_user_id: customerId,
          p_tag_id: tagId,
          p_admin_id: adminUser.id || null
        } as any)

      if (assignError) throw assignError
      
      // Refresh tags
      await fetchCustomerTags(customerId)
      return true
    } catch (err: any) {
      error.value = err.message || 'Failed to assign tag'
      return false
    }
  }

  const removeTag = async (customerId: string, tagId: string): Promise<boolean> => {
    try {
      const { error: removeError } = await supabase
        .rpc('remove_customer_tag', {
          p_user_id: customerId,
          p_tag_id: tagId
        } as any)

      if (removeError) throw removeError
      
      // Refresh tags
      await fetchCustomerTags(customerId)
      return true
    } catch (err: any) {
      error.value = err.message || 'Failed to remove tag'
      return false
    }
  }

  // =====================================================
  // CUSTOMER NOTES
  // =====================================================

  const customerNotes = ref<CustomerNote[]>([])
  const loadingNotes = ref(false)

  const fetchCustomerNotes = async (customerId: string): Promise<CustomerNote[]> => {
    loadingNotes.value = true
    try {
      const { data, error: fetchError } = await supabase
        .from('customer_notes')
        .select(`
          *,
          admin:admin_id(name, first_name, last_name)
        `)
        .eq('user_id', customerId)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      
      customerNotes.value = (data || []).map((note: any) => ({
        ...note,
        admin_name: note.admin?.name || 
          `${note.admin?.first_name || ''} ${note.admin?.last_name || ''}`.trim() || 
          'Admin'
      }))
      return customerNotes.value
    } catch (err: any) {
      console.error('Fetch notes error:', err)
      return []
    } finally {
      loadingNotes.value = false
    }
  }

  const addNote = async (
    customerId: string, 
    note: string, 
    options?: { is_pinned?: boolean; is_important?: boolean }
  ): Promise<boolean> => {
    try {
      const adminUser = JSON.parse(localStorage.getItem('admin_user') || '{}')
      
      const { error: insertError } = await supabase
        .from('customer_notes')
        .insert({
          user_id: customerId,
          admin_id: adminUser.id,
          note,
          is_pinned: options?.is_pinned || false,
          is_important: options?.is_important || false
        } as any)

      if (insertError) throw insertError
      
      // Refresh notes
      await fetchCustomerNotes(customerId)
      return true
    } catch (err: any) {
      error.value = err.message || 'Failed to add note'
      return false
    }
  }

  const updateNote = async (
    noteId: string, 
    updates: { note?: string; is_pinned?: boolean; is_important?: boolean }
  ): Promise<boolean> => {
    try {
      const { error: updateError } = await (supabase as any)
        .from('customer_notes')
        .update(updates)
        .eq('id', noteId)

      if (updateError) throw updateError
      
      // Update local state
      const index = customerNotes.value.findIndex(n => n.id === noteId)
      if (index !== -1) {
        customerNotes.value[index] = { 
          ...customerNotes.value[index], 
          ...updates 
        } as CustomerNote
      }
      return true
    } catch (err: any) {
      error.value = err.message || 'Failed to update note'
      return false
    }
  }

  const deleteNote = async (noteId: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('customer_notes')
        .delete()
        .eq('id', noteId)

      if (deleteError) throw deleteError
      
      // Remove from local state
      customerNotes.value = customerNotes.value.filter(n => n.id !== noteId)
      return true
    } catch (err: any) {
      error.value = err.message || 'Failed to delete note'
      return false
    }
  }

  // =====================================================
  // CUSTOMER QUICK STATS
  // =====================================================

  const quickStats = ref<CustomerQuickStats | null>(null)
  const loadingQuickStats = ref(false)

  const fetchQuickStats = async (customerId: string): Promise<CustomerQuickStats | null> => {
    loadingQuickStats.value = true
    try {
      const { data, error: fetchError } = await supabase
        .rpc('get_customer_quick_stats', { p_user_id: customerId } as any)

      if (fetchError) throw fetchError
      
      quickStats.value = (data as CustomerQuickStats) || null
      return quickStats.value
    } catch (err: any) {
      console.error('Fetch quick stats error:', err)
      // Fallback: calculate manually
      try {
        const now = new Date()
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

        const [ridesMonth, ridesAll] = await Promise.all([
          supabase
            .from('ride_requests')
            .select('id, final_fare, estimated_fare')
            .eq('user_id', customerId)
            .eq('status', 'completed')
            .gte('created_at', monthStart),
          supabase
            .from('ride_requests')
            .select('id, final_fare, estimated_fare, created_at')
            .eq('user_id', customerId)
            .eq('status', 'completed')
            .order('created_at', { ascending: false })
        ])

        const monthRides = (ridesMonth.data || []) as any[]
        const allRides = (ridesAll.data || []) as any[]

        const totalSpent = allRides.reduce((sum: number, r: any) => sum + (r.final_fare || r.estimated_fare || 0), 0)
        const avgFare = allRides.length > 0 ? totalSpent / allRides.length : 0
        const lastRide = allRides[0]?.created_at || null
        const daysSince = lastRide ? Math.floor((Date.now() - new Date(lastRide).getTime()) / (1000 * 60 * 60 * 24)) : null

        quickStats.value = {
          rides_this_month: monthRides.length,
          spent_this_month: monthRides.reduce((sum: number, r: any) => sum + (r.final_fare || r.estimated_fare || 0), 0),
          deliveries_this_month: 0,
          shopping_this_month: 0,
          total_rides: allRides.length,
          total_spent: totalSpent,
          avg_ride_fare: avgFare,
          last_ride_at: lastRide,
          first_ride_at: allRides[allRides.length - 1]?.created_at || null,
          days_since_last_ride: daysSince,
          activity_level: allRides.length >= 20 ? 'high' : allRides.length >= 5 ? 'medium' : 'low'
        }
        return quickStats.value
      } catch {
        return null
      }
    } finally {
      loadingQuickStats.value = false
    }
  }

  // =====================================================
  // HELPERS
  // =====================================================

  const transformCustomer = (data: any): Customer => ({
    id: data.id,
    member_uid: data.member_uid || null,
    name: data.name || `${data.first_name || ''} ${data.last_name || ''}`.trim() || data.email?.split('@')[0] || 'ไม่ระบุ',
    first_name: data.first_name || null,
    last_name: data.last_name || null,
    email: data.email || '',
    phone: data.phone || data.phone_number || null,
    phone_number: data.phone_number || data.phone || null,
    role: data.role || 'customer',
    is_active: data.is_active !== false,
    verification_status: data.verification_status || 'pending',
    verified_at: data.verified_at || null,
    national_id: data.national_id || null,
    gender: data.gender || null,
    avatar_url: data.avatar_url || null,
    created_at: data.created_at,
    updated_at: data.updated_at || data.created_at
  })

  const clearSelectedCustomer = () => {
    selectedCustomer.value = null
  }

  const refreshAll = async () => {
    listCache.invalidateAll()
    customerCache.invalidateAll()
    statsCache.invalidateAll()
    await Promise.all([
      fetchCustomers(true),
      fetchStats(true)
    ])
  }

  // =====================================================
  // LIFECYCLE & CLEANUP
  // =====================================================

  const initialize = () => {
    syncFromURL()
    setupRealtimeSubscription()
    fetchCustomers()
    fetchStats()
  }

  const cleanup = () => {
    // Cancel all pending requests
    pendingRequests.forEach(controller => controller.abort())
    pendingRequests.clear()
    
    // Clear debounce timer
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer)
    }
    
    // Remove realtime subscription
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel)
      realtimeChannel = null
    }
  }

  // Watch for route changes
  watch(
    () => route.query,
    () => {
      if (route.path.includes('/admin/customers')) {
        syncFromURL()
      }
    },
    { deep: true }
  )

  // Auto cleanup on unmount
  onUnmounted(cleanup)

  return {
    // State
    customers,
    selectedCustomer,
    stats,
    loading,
    loadingCustomer,
    loadingStats,
    error,
    
    // Pagination
    page,
    pageSize,
    total,
    totalPages,
    
    // Filters
    filters,
    
    // Actions
    fetchCustomers,
    fetchCustomerById,
    fetchStats,
    updateCustomerStatus,
    verifyCustomer,
    setSearch,
    setPage,
    setFilter,
    resetFilters,
    setSort,
    clearSelectedCustomer,
    refreshAll,
    
    // Activity Timeline
    activityTimeline,
    loadingTimeline,
    fetchActivityTimeline,
    
    // Export
    exportingCSV,
    exportToCSV,
    exportToExcel,
    
    // Bulk Actions
    selectedIds,
    bulkActionLoading,
    toggleSelection,
    selectAll,
    clearSelection,
    isSelected,
    isAllSelected,
    selectedCount,
    bulkUpdateStatus,
    bulkVerify,
    
    // Customer Tags
    availableTags,
    customerTags,
    loadingTags,
    fetchAvailableTags,
    fetchCustomerTags,
    assignTag,
    removeTag,
    
    // Customer Notes
    customerNotes,
    loadingNotes,
    fetchCustomerNotes,
    addNote,
    updateNote,
    deleteNote,
    
    // Quick Stats
    quickStats,
    loadingQuickStats,
    fetchQuickStats,
    
    // Lifecycle
    initialize,
    cleanup
  }
}
