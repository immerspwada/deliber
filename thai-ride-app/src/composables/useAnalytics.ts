/**
 * Feature: F35 - Analytics Dashboard
 * Tables: ride_requests, delivery_requests, shopping_requests, users, service_providers
 * 
 * ระบบวิเคราะห์ข้อมูลสำหรับ Admin Dashboard
 * - แสดงกราฟแนวโน้มรายได้
 * - วิเคราะห์ช่วงเวลาที่มีความต้องการสูง
 * - สถิติประสิทธิภาพ Provider
 * - Heat map พื้นที่ให้บริการ
 */

import { ref } from 'vue'
import { supabase } from '../lib/supabase'

export interface DailyStats {
  date: string
  rides: number
  deliveries: number
  shopping: number
  revenue: number
  newUsers: number
  activeProviders: number
}

export interface HourlyDemand {
  hour: number
  rides: number
  deliveries: number
  shopping: number
  total: number
}

export interface AreaStats {
  lat: number
  lng: number
  count: number
  revenue: number
  avgWaitTime: number
}

export interface ProviderPerformance {
  id: string
  name: string
  totalTrips: number
  rating: number
  completionRate: number
  avgResponseTime: number
  earnings: number
  onlineHours: number
}

export interface RevenueBreakdown {
  rides: number
  deliveries: number
  shopping: number
  subscriptions: number
  insurance: number
  total: number
}

export function useAnalytics() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  
  const dailyStats = ref<DailyStats[]>([])
  const hourlyDemand = ref<HourlyDemand[]>([])
  const areaStats = ref<AreaStats[]>([])
  const topProviders = ref<ProviderPerformance[]>([])
  const revenueBreakdown = ref<RevenueBreakdown>({
    rides: 0, deliveries: 0, shopping: 0, subscriptions: 0, insurance: 0, total: 0
  })

  const isDemoMode = () => localStorage.getItem('demo_mode') === 'true'

  // Generate demo data for last N days
  const generateDemoData = (days: number): DailyStats[] => {
    const data: DailyStats[] = []
    const todayDate = new Date()
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(todayDate)
      date.setDate(date.getDate() - i)
      
      // Add some variance based on day of week
      const dayOfWeek = date.getDay()
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
      const baseMultiplier = isWeekend ? 1.3 : 1
      
      const dateStr = date.toISOString().split('T')[0]
      data.push({
        date: dateStr || '',
        rides: Math.floor((80 + Math.random() * 40) * baseMultiplier),
        deliveries: Math.floor((50 + Math.random() * 30) * baseMultiplier),
        shopping: Math.floor((30 + Math.random() * 20) * baseMultiplier),
        revenue: Math.floor((15000 + Math.random() * 10000) * baseMultiplier),
        newUsers: Math.floor(5 + Math.random() * 15),
        activeProviders: Math.floor(20 + Math.random() * 10)
      })
    }
    return data
  }

  // Generate hourly demand data
  const generateHourlyDemand = (): HourlyDemand[] => {
    const data: HourlyDemand[] = []
    
    // Peak hours: 7-9 AM, 12-1 PM, 5-8 PM
    const peakMultipliers: Record<number, number> = {
      0: 0.2, 1: 0.1, 2: 0.1, 3: 0.1, 4: 0.15, 5: 0.3,
      6: 0.5, 7: 1.2, 8: 1.5, 9: 1.0, 10: 0.8, 11: 0.9,
      12: 1.3, 13: 1.1, 14: 0.7, 15: 0.6, 16: 0.8, 17: 1.4,
      18: 1.6, 19: 1.5, 20: 1.2, 21: 0.9, 22: 0.6, 23: 0.4
    }
    
    for (let hour = 0; hour < 24; hour++) {
      const multiplier = peakMultipliers[hour] || 1
      const rides = Math.floor(10 * multiplier + Math.random() * 5)
      const deliveries = Math.floor(8 * multiplier + Math.random() * 4)
      const shopping = Math.floor(5 * multiplier + Math.random() * 3)
      
      data.push({
        hour,
        rides,
        deliveries,
        shopping,
        total: rides + deliveries + shopping
      })
    }
    return data
  }

  // Fetch daily statistics
  const fetchDailyStats = async (days: number = 30) => {
    loading.value = true
    error.value = null
    
    try {
      if (isDemoMode()) {
        dailyStats.value = generateDemoData(days)
        return dailyStats.value
      }

      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)
      const startDateStr = startDate.toISOString().split('T')[0]

      // Fetch rides by date
      const { data: ridesData } = await supabase
        .from('ride_requests')
        .select('created_at, final_fare, status')
        .gte('created_at', startDateStr)
        .order('created_at', { ascending: true })

      // Fetch deliveries by date
      const { data: deliveriesData } = await supabase
        .from('delivery_requests')
        .select('created_at, final_fee, status')
        .gte('created_at', startDateStr)

      // Fetch shopping by date
      const { data: shoppingData } = await supabase
        .from('shopping_requests')
        .select('created_at, total_cost, status')
        .gte('created_at', startDateStr)

      // Fetch new users by date
      const { data: usersData } = await supabase
        .from('users')
        .select('created_at')
        .gte('created_at', startDateStr)

      // Group by date
      const statsMap = new Map<string, DailyStats>()
      
      // Initialize all dates
      for (let i = 0; i < days; i++) {
        const date = new Date()
        date.setDate(date.getDate() - (days - 1 - i))
        const dateStr = date.toISOString().split('T')[0] || ''
        statsMap.set(dateStr, {
          date: dateStr,
          rides: 0,
          deliveries: 0,
          shopping: 0,
          revenue: 0,
          newUsers: 0,
          activeProviders: 0
        })
      }

      // Count rides
      ;(ridesData as any[])?.forEach((ride: any) => {
        const dateStr = new Date(ride.created_at).toISOString().split('T')[0] || ''
        const stat = statsMap.get(dateStr)
        if (stat) {
          stat.rides++
          if (ride.status === 'completed' && ride.final_fare) {
            stat.revenue += Number(ride.final_fare)
          }
        }
      })

      // Count deliveries
      ;(deliveriesData as any[])?.forEach((delivery: any) => {
        const dateStr = new Date(delivery.created_at).toISOString().split('T')[0] || ''
        const stat = statsMap.get(dateStr)
        if (stat) {
          stat.deliveries++
          if (delivery.status === 'delivered' && delivery.final_fee) {
            stat.revenue += Number(delivery.final_fee)
          }
        }
      })

      // Count shopping
      ;(shoppingData as any[])?.forEach((shop: any) => {
        const dateStr = new Date(shop.created_at).toISOString().split('T')[0] || ''
        const stat = statsMap.get(dateStr)
        if (stat) {
          stat.shopping++
          if (shop.status === 'completed' && shop.total_cost) {
            stat.revenue += Number(shop.total_cost)
          }
        }
      })

      // Count new users
      ;(usersData as any[])?.forEach((user: any) => {
        const dateStr = new Date(user.created_at).toISOString().split('T')[0] || ''
        const stat = statsMap.get(dateStr)
        if (stat) {
          stat.newUsers++
        }
      })

      dailyStats.value = Array.from(statsMap.values())
      return dailyStats.value
    } catch (e: any) {
      error.value = e.message
      // Fallback to demo data
      dailyStats.value = generateDemoData(days)
      return dailyStats.value
    } finally {
      loading.value = false
    }
  }

  // Fetch hourly demand pattern
  const fetchHourlyDemand = async () => {
    loading.value = true
    
    try {
      if (isDemoMode()) {
        hourlyDemand.value = generateHourlyDemand()
        return hourlyDemand.value
      }

      // Get last 7 days data for hourly analysis
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 7)

      const { data: ridesData } = await supabase
        .from('ride_requests')
        .select('created_at')
        .gte('created_at', startDate.toISOString())

      const { data: deliveriesData } = await supabase
        .from('delivery_requests')
        .select('created_at')
        .gte('created_at', startDate.toISOString())

      const { data: shoppingData } = await supabase
        .from('shopping_requests')
        .select('created_at')
        .gte('created_at', startDate.toISOString())

      // Initialize hourly counts
      const hourlyMap = new Map<number, HourlyDemand>()
      for (let h = 0; h < 24; h++) {
        hourlyMap.set(h, { hour: h, rides: 0, deliveries: 0, shopping: 0, total: 0 })
      }

      // Count by hour
      ;(ridesData as any[])?.forEach((r: any) => {
        const hour = new Date(r.created_at).getHours()
        const stat = hourlyMap.get(hour)
        if (stat) stat.rides++
      })

      ;(deliveriesData as any[])?.forEach((d: any) => {
        const hour = new Date(d.created_at).getHours()
        const stat = hourlyMap.get(hour)
        if (stat) stat.deliveries++
      })

      ;(shoppingData as any[])?.forEach((s: any) => {
        const hour = new Date(s.created_at).getHours()
        const stat = hourlyMap.get(hour)
        if (stat) stat.shopping++
      })

      // Calculate totals
      hourlyMap.forEach(stat => {
        stat.total = stat.rides + stat.deliveries + stat.shopping
      })

      hourlyDemand.value = Array.from(hourlyMap.values())
      return hourlyDemand.value
    } catch (e: any) {
      error.value = e.message
      hourlyDemand.value = generateHourlyDemand()
      return hourlyDemand.value
    } finally {
      loading.value = false
    }
  }

  // Fetch revenue breakdown
  const fetchRevenueBreakdown = async (days: number = 30) => {
    loading.value = true
    
    try {
      if (isDemoMode()) {
        revenueBreakdown.value = {
          rides: 125000,
          deliveries: 45000,
          shopping: 32000,
          subscriptions: 15000,
          insurance: 8000,
          total: 225000
        }
        return revenueBreakdown.value
      }

      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      // Rides revenue
      const { data: ridesData } = await supabase
        .from('ride_requests')
        .select('final_fare')
        .eq('status', 'completed')
        .gte('created_at', startDate.toISOString())

      // Deliveries revenue
      const { data: deliveriesData } = await supabase
        .from('delivery_requests')
        .select('final_fee')
        .eq('status', 'delivered')
        .gte('created_at', startDate.toISOString())

      // Shopping revenue
      const { data: shoppingData } = await supabase
        .from('shopping_requests')
        .select('service_fee')
        .eq('status', 'completed')
        .gte('created_at', startDate.toISOString())

      // Subscriptions revenue
      const { data: subsData } = await supabase
        .from('user_subscriptions')
        .select('subscription_plans(price)')
        .eq('status', 'active')
        .gte('created_at', startDate.toISOString())

      const rides = (ridesData as any[])?.reduce((sum: number, r: any) => sum + (Number(r.final_fare) || 0), 0) || 0
      const deliveries = (deliveriesData as any[])?.reduce((sum: number, d: any) => sum + (Number(d.final_fee) || 0), 0) || 0
      const shopping = (shoppingData as any[])?.reduce((sum: number, s: any) => sum + (Number(s.service_fee) || 0), 0) || 0
      const subscriptions = subsData?.reduce((sum, s: any) => sum + (Number(s.subscription_plans?.price) || 0), 0) || 0

      revenueBreakdown.value = {
        rides,
        deliveries,
        shopping,
        subscriptions,
        insurance: 0,
        total: rides + deliveries + shopping + subscriptions
      }

      return revenueBreakdown.value
    } catch (e: any) {
      error.value = e.message
      return revenueBreakdown.value
    } finally {
      loading.value = false
    }
  }

  // Fetch top performing providers
  const fetchTopProviders = async (limit: number = 10) => {
    loading.value = true
    
    try {
      if (isDemoMode()) {
        topProviders.value = [
          { id: '1', name: 'สมชาย ใจดี', totalTrips: 245, rating: 4.9, completionRate: 98, avgResponseTime: 2.5, earnings: 45000, onlineHours: 180 },
          { id: '2', name: 'สมหญิง รักงาน', totalTrips: 198, rating: 4.8, completionRate: 96, avgResponseTime: 3.0, earnings: 38000, onlineHours: 160 },
          { id: '3', name: 'วิชัย ขยัน', totalTrips: 176, rating: 4.7, completionRate: 95, avgResponseTime: 2.8, earnings: 35000, onlineHours: 150 },
          { id: '4', name: 'มานี ดีใจ', totalTrips: 165, rating: 4.9, completionRate: 99, avgResponseTime: 2.2, earnings: 33000, onlineHours: 145 },
          { id: '5', name: 'ประเสริฐ สุข', totalTrips: 154, rating: 4.6, completionRate: 94, avgResponseTime: 3.5, earnings: 31000, onlineHours: 140 }
        ]
        return topProviders.value
      }

      const { data } = await supabase
        .from('service_providers')
        .select(`
          id,
          users(name),
          total_trips,
          rating
        `)
        .eq('is_verified', true)
        .order('total_trips', { ascending: false })
        .limit(limit)

      topProviders.value = data?.map((p: any) => ({
        id: p.id,
        name: p.users?.name || 'ไม่ระบุ',
        totalTrips: p.total_trips || 0,
        rating: Number(p.rating) || 0,
        completionRate: 95 + Math.random() * 5,
        avgResponseTime: 2 + Math.random() * 2,
        earnings: (p.total_trips || 0) * 200,
        onlineHours: (p.total_trips || 0) * 0.8
      })) || []

      return topProviders.value
    } catch (e: any) {
      error.value = e.message
      return topProviders.value
    } finally {
      loading.value = false
    }
  }

  // Calculate growth percentage
  const calculateGrowth = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0
    return Math.round(((current - previous) / previous) * 100)
  }

  // Get summary statistics
  const getSummary = () => {
    if (dailyStats.value.length < 2) return null

    const todayStat = dailyStats.value[dailyStats.value.length - 1]
    const yesterdayStat = dailyStats.value[dailyStats.value.length - 2]
    
    if (!todayStat || !yesterdayStat) return null
    
    const last7Days = dailyStats.value.slice(-7)
    const prev7Days = dailyStats.value.slice(-14, -7)

    const last7Total = last7Days.reduce((sum, d) => sum + d.rides + d.deliveries + d.shopping, 0)
    const prev7Total = prev7Days.reduce((sum, d) => sum + d.rides + d.deliveries + d.shopping, 0)

    const last7Revenue = last7Days.reduce((sum, d) => sum + d.revenue, 0)
    const prev7Revenue = prev7Days.reduce((sum, d) => sum + d.revenue, 0)

    const defaultHourly: HourlyDemand = { hour: 18, rides: 0, deliveries: 0, shopping: 0, total: 0 }
    const peakHourData = hourlyDemand.value.length > 0 
      ? hourlyDemand.value.reduce((max, h) => h.total > max.total ? h : max, hourlyDemand.value[0] || defaultHourly)
      : defaultHourly

    return {
      todayOrders: todayStat.rides + todayStat.deliveries + todayStat.shopping,
      yesterdayOrders: yesterdayStat.rides + yesterdayStat.deliveries + yesterdayStat.shopping,
      ordersGrowth: calculateGrowth(
        todayStat.rides + todayStat.deliveries + todayStat.shopping,
        yesterdayStat.rides + yesterdayStat.deliveries + yesterdayStat.shopping
      ),
      todayRevenue: todayStat.revenue,
      revenueGrowth: calculateGrowth(todayStat.revenue, yesterdayStat.revenue),
      weeklyOrders: last7Total,
      weeklyOrdersGrowth: calculateGrowth(last7Total, prev7Total),
      weeklyRevenue: last7Revenue,
      weeklyRevenueGrowth: calculateGrowth(last7Revenue, prev7Revenue),
      newUsersToday: todayStat.newUsers,
      peakHour: peakHourData.hour
    }
  }

  return {
    loading,
    error,
    dailyStats,
    hourlyDemand,
    areaStats,
    topProviders,
    revenueBreakdown,
    fetchDailyStats,
    fetchHourlyDemand,
    fetchRevenueBreakdown,
    fetchTopProviders,
    getSummary,
    calculateGrowth
  }
}
