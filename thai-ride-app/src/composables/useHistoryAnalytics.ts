/**
 * useHistoryAnalytics - Smart Analytics for Order History
 * 
 * Features:
 * - Real-time statistics
 * - Spending insights
 * - Usage patterns
 * - Recommendations
 */

import { computed, ref } from 'vue'
import type { RideHistoryItem } from './useRideHistory'

export interface HistoryStats {
  totalOrders: number
  completedOrders: number
  cancelledOrders: number
  totalSpent: number
  avgFare: number
  maxFare: number
  minFare: number
  completionRate: number
  mostUsedService: { type: string; count: number; percentage: number } | null
  byType: Record<string, { count: number; spent: number; avgFare: number }>
  byMonth: Array<{ month: string; count: number; spent: number }>
  topDestinations: Array<{ destination: string; count: number }>
  topRoutes: Array<{ route: string; count: number; avgFare: number }>
  peakHours: Array<{ hour: number; count: number }>
  peakDays: Array<{ day: string; count: number }>
}

export interface SpendingInsight {
  type: 'warning' | 'info' | 'success'
  title: string
  message: string
  icon: string
}

export function useHistoryAnalytics(history: Ref<RideHistoryItem[]>) {
  const loading = ref(false)

  // Calculate comprehensive statistics
  const stats = computed<HistoryStats>(() => {
    const items = history.value
    const completed = items.filter(h => h.status === 'completed')
    const cancelled = items.filter(h => h.status === 'cancelled')

    // Basic stats
    const totalSpent = completed.reduce((sum, h) => sum + h.fare, 0)
    const avgFare = completed.length > 0 ? totalSpent / completed.length : 0
    const maxFare = completed.length > 0 ? Math.max(...completed.map(h => h.fare)) : 0
    const minFare = completed.length > 0 ? Math.min(...completed.map(h => h.fare)) : 0
    const completionRate = items.length > 0 ? (completed.length / items.length) * 100 : 0

    // By service type
    const byType = items.reduce((acc, item) => {
      if (!acc[item.type]) {
        acc[item.type] = { count: 0, spent: 0, avgFare: 0 }
      }
      acc[item.type].count++
      if (item.status === 'completed') {
        acc[item.type].spent += item.fare
      }
      return acc
    }, {} as Record<string, { count: number; spent: number; avgFare: number }>)

    // Calculate average fare per type
    Object.keys(byType).forEach(type => {
      const typeCompleted = completed.filter(h => h.type === type)
      byType[type].avgFare = typeCompleted.length > 0 
        ? byType[type].spent / typeCompleted.length 
        : 0
    })

    // Most used service
    const sortedTypes = Object.entries(byType).sort((a, b) => b[1].count - a[1].count)
    const mostUsedService = sortedTypes.length > 0 
      ? {
          type: sortedTypes[0][0],
          count: sortedTypes[0][1].count,
          percentage: (sortedTypes[0][1].count / items.length) * 100
        }
      : null

    // By month
    const byMonth = completed.reduce((acc, item) => {
      const date = new Date(item.created_at || 0)
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      if (!acc[month]) {
        acc[month] = { month, count: 0, spent: 0 }
      }
      acc[month].count++
      acc[month].spent += item.fare
      return acc
    }, {} as Record<string, { month: string; count: number; spent: number }>)

    const monthlyData = Object.values(byMonth).sort((a, b) => b.month.localeCompare(a.month)).slice(0, 6)

    // Top destinations
    const destinations = completed.reduce((acc, item) => {
      acc[item.to] = (acc[item.to] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const topDestinations = Object.entries(destinations)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([destination, count]) => ({ destination, count }))

    // Top routes
    const routes = completed.reduce((acc, item) => {
      const route = `${item.from} → ${item.to}`
      if (!acc[route]) {
        acc[route] = { count: 0, totalFare: 0 }
      }
      acc[route].count++
      acc[route].totalFare += item.fare
      return acc
    }, {} as Record<string, { count: number; totalFare: number }>)

    const topRoutes = Object.entries(routes)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([route, data]) => ({
        route,
        count: data.count,
        avgFare: Math.round(data.totalFare / data.count)
      }))

    // Peak hours
    const hours = completed.reduce((acc, item) => {
      const date = new Date(item.created_at || 0)
      const hour = date.getHours()
      acc[hour] = (acc[hour] || 0) + 1
      return acc
    }, {} as Record<number, number>)

    const peakHours = Object.entries(hours)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([hour, count]) => ({ hour: parseInt(hour), count }))

    // Peak days
    const days = completed.reduce((acc, item) => {
      const date = new Date(item.created_at || 0)
      const dayNames = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์']
      const day = dayNames[date.getDay()]
      acc[day] = (acc[day] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const peakDays = Object.entries(days)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([day, count]) => ({ day, count }))

    return {
      totalOrders: items.length,
      completedOrders: completed.length,
      cancelledOrders: cancelled.length,
      totalSpent: Math.round(totalSpent),
      avgFare: Math.round(avgFare),
      maxFare,
      minFare,
      completionRate: Math.round(completionRate),
      mostUsedService,
      byType,
      byMonth: monthlyData,
      topDestinations,
      topRoutes,
      peakHours,
      peakDays
    }
  })

  // Generate spending insights
  const insights = computed<SpendingInsight[]>(() => {
    const result: SpendingInsight[] = []
    const s = stats.value

    // High spending warning
    if (s.totalSpent > 5000) {
      result.push({
        type: 'warning',
        title: 'การใช้จ่ายสูง',
        message: `คุณใช้จ่ายไปแล้ว ฿${s.totalSpent.toLocaleString()} ในเดือนนี้`,
        icon: 'alert-circle'
      })
    }

    // Completion rate insight
    if (s.completionRate < 80) {
      result.push({
        type: 'warning',
        title: 'อัตราการยกเลิกสูง',
        message: `${s.cancelledOrders} รายการถูกยกเลิก (${100 - s.completionRate}%)`,
        icon: 'x-circle'
      })
    } else if (s.completionRate >= 95) {
      result.push({
        type: 'success',
        title: 'อัตราความสำเร็จสูง',
        message: `${s.completionRate}% ของรายการสำเร็จ`,
        icon: 'check-circle'
      })
    }

    // Frequent user badge
    if (s.totalOrders >= 50) {
      result.push({
        type: 'success',
        title: 'ผู้ใช้งานประจำ',
        message: `คุณใช้บริการไปแล้ว ${s.totalOrders} ครั้ง`,
        icon: 'star'
      })
    }

    // Savings opportunity
    if (s.mostUsedService && s.mostUsedService.percentage > 60) {
      result.push({
        type: 'info',
        title: 'โอกาสประหยัด',
        message: `คุณใช้บริการ${getServiceName(s.mostUsedService.type)} บ่อย ลองใช้โปรโมชั่นประจำ`,
        icon: 'gift'
      })
    }

    // Peak hour insight
    if (s.peakHours.length > 0) {
      const hour = s.peakHours[0].hour
      result.push({
        type: 'info',
        title: 'เวลาที่ใช้บริการบ่อย',
        message: `คุณมักใช้บริการช่วง ${hour}:00-${hour + 1}:00 น.`,
        icon: 'clock'
      })
    }

    return result
  })

  // Get service name in Thai
  const getServiceName = (type: string): string => {
    const names: Record<string, string> = {
      ride: 'เรียกรถ',
      delivery: 'ส่งของ',
      shopping: 'ซื้อของ',
      queue: 'จองคิว',
      moving: 'ขนย้าย',
      laundry: 'ซักรีด'
    }
    return names[type] || type
  }

  // Compare with previous period
  const compareWithPrevious = (currentPeriod: RideHistoryItem[], previousPeriod: RideHistoryItem[]) => {
    const currentSpent = currentPeriod
      .filter(h => h.status === 'completed')
      .reduce((sum, h) => sum + h.fare, 0)
    
    const previousSpent = previousPeriod
      .filter(h => h.status === 'completed')
      .reduce((sum, h) => sum + h.fare, 0)

    const change = previousSpent > 0 
      ? ((currentSpent - previousSpent) / previousSpent) * 100 
      : 0

    return {
      currentSpent,
      previousSpent,
      change: Math.round(change),
      trend: change > 0 ? 'up' : change < 0 ? 'down' : 'stable'
    }
  }

  return {
    stats,
    insights,
    loading,
    compareWithPrevious
  }
}
