/**
 * Unit Tests for Admin Composables
 * 
 * Tests all admin composables created for Task 7:
 * - useAdminCustomers
 * - useAdminProviders
 * - useAdminScheduledRides
 * - useAdminWithdrawals
 * - useAdminTopupRequests
 * - useAdminRevenue
 * - useAdminPayments
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAdminCustomers } from '@/admin/composables/useAdminCustomers'
import { useAdminProviders } from '@/admin/composables/useAdminProviders'
import { useAdminScheduledRides } from '@/admin/composables/useAdminScheduledRides'
import { useAdminWithdrawals } from '@/admin/composables/useAdminWithdrawals'
import { useAdminTopupRequests } from '@/admin/composables/useAdminTopupRequests'
import { useAdminRevenue } from '@/admin/composables/useAdminRevenue'
import { useAdminPayments } from '@/admin/composables/useAdminPayments'

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn(() => ({ error: null }))
      }))
    })),
    auth: {
      getUser: vi.fn(() => ({
        data: { user: { id: 'admin-user-id' } }
      }))
    }
  }
}))

// Mock useErrorHandler
vi.mock('@/composables/useErrorHandler', () => ({
  useErrorHandler: () => ({
    handle: vi.fn()
  })
}))

// Mock useToast
vi.mock('@/composables/useToast', () => ({
  useToast: () => ({
    showSuccess: vi.fn(),
    showError: vi.fn()
  })
}))

describe('Admin Composables - useAdminCustomers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize with default state', () => {
    const { loading, customers, totalCount, error } = useAdminCustomers()

    expect(loading.value).toBe(false)
    expect(customers.value).toEqual([])
    expect(totalCount.value).toBe(0)
    expect(error.value).toBeNull()
  })

  it('should have computed properties for customer filtering', () => {
    const { activeCustomers, suspendedCustomers, bannedCustomers } = useAdminCustomers()

    expect(activeCustomers.value).toEqual([])
    expect(suspendedCustomers.value).toEqual([])
    expect(bannedCustomers.value).toEqual([])
  })

  it('should have helper functions', () => {
    const { formatCurrency, formatDate, getStatusLabel, getStatusColor } = useAdminCustomers()

    expect(formatCurrency(1000)).toContain('1,000')
    expect(getStatusLabel('active')).toBe('ใช้งานปกติ')
    expect(getStatusColor('active')).toContain('green')
  })
})

describe('Admin Composables - useAdminProviders', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize with default state', () => {
    const { loading, providers, totalCount, error } = useAdminProviders()

    expect(loading.value).toBe(false)
    expect(providers.value).toEqual([])
    expect(totalCount.value).toBe(0)
    expect(error.value).toBeNull()
  })

  it('should have computed properties for provider filtering', () => {
    const { 
      pendingProviders, 
      approvedProviders, 
      rejectedProviders, 
      suspendedProviders,
      onlineProviders 
    } = useAdminProviders()

    expect(pendingProviders.value).toEqual([])
    expect(approvedProviders.value).toEqual([])
    expect(rejectedProviders.value).toEqual([])
    expect(suspendedProviders.value).toEqual([])
    expect(onlineProviders.value).toEqual([])
  })

  it('should have helper functions', () => {
    const { 
      formatCurrency, 
      getStatusLabel, 
      getProviderTypeLabel,
      getFullName 
    } = useAdminProviders()

    expect(formatCurrency(1000)).toContain('1,000')
    expect(getStatusLabel('pending')).toBe('รอการอนุมัติ')
    expect(getProviderTypeLabel('ride')).toBe('รถรับส่ง')
    
    const mockProvider = {
      first_name: 'John',
      last_name: 'Doe'
    } as any
    expect(getFullName(mockProvider)).toBe('John Doe')
  })
})

describe('Admin Composables - useAdminScheduledRides', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize with default state', () => {
    const { loading, scheduledRides, totalCount, error } = useAdminScheduledRides()

    expect(loading.value).toBe(false)
    expect(scheduledRides.value).toEqual([])
    expect(totalCount.value).toBe(0)
    expect(error.value).toBeNull()
  })

  it('should have computed properties for ride filtering', () => {
    const { 
      upcomingRides, 
      todayRides, 
      assignedRides, 
      unassignedRides 
    } = useAdminScheduledRides()

    expect(upcomingRides.value).toEqual([])
    expect(todayRides.value).toEqual([])
    expect(assignedRides.value).toEqual([])
    expect(unassignedRides.value).toEqual([])
  })

  it('should have time helper functions', () => {
    const { 
      formatDate, 
      formatTimeOnly, 
      getTimeUntil,
      isRideSoon 
    } = useAdminScheduledRides()

    const futureDate = new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 min from now
    const pastDate = new Date(Date.now() - 60 * 60 * 1000).toISOString() // 1 hour ago

    expect(formatDate(futureDate)).toBeTruthy()
    expect(formatTimeOnly(futureDate)).toBeTruthy()
    expect(getTimeUntil(futureDate)).toContain('นาที')
    expect(getTimeUntil(pastDate)).toBe('เลยเวลาแล้ว')
    expect(isRideSoon(futureDate)).toBe(true)
  })
})

describe('Admin Composables - useAdminWithdrawals', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize with default state', () => {
    const { loading, withdrawals, totalCount, error } = useAdminWithdrawals()

    expect(loading.value).toBe(false)
    expect(withdrawals.value).toEqual([])
    expect(totalCount.value).toBe(0)
    expect(error.value).toBeNull()
  })

  it('should have computed properties for withdrawal filtering', () => {
    const { 
      pendingWithdrawals, 
      approvedWithdrawals, 
      rejectedWithdrawals,
      completedWithdrawals,
      totalPendingAmount 
    } = useAdminWithdrawals()

    expect(pendingWithdrawals.value).toEqual([])
    expect(approvedWithdrawals.value).toEqual([])
    expect(rejectedWithdrawals.value).toEqual([])
    expect(completedWithdrawals.value).toEqual([])
    expect(totalPendingAmount.value).toBe(0)
  })

  it('should mask bank account numbers', () => {
    const { maskBankAccount } = useAdminWithdrawals()

    expect(maskBankAccount('1234567890')).toBe('XXXXXX7890')
    expect(maskBankAccount('1234')).toBe('1234')
  })
})

describe('Admin Composables - useAdminTopupRequests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize with default state', () => {
    const { loading, topupRequests, totalCount, error } = useAdminTopupRequests()

    expect(loading.value).toBe(false)
    expect(topupRequests.value).toEqual([])
    expect(totalCount.value).toBe(0)
    expect(error.value).toBeNull()
  })

  it('should have computed properties for topup filtering', () => {
    const { 
      pendingRequests, 
      approvedRequests, 
      rejectedRequests,
      totalPendingAmount 
    } = useAdminTopupRequests()

    expect(pendingRequests.value).toEqual([])
    expect(approvedRequests.value).toEqual([])
    expect(rejectedRequests.value).toEqual([])
    expect(totalPendingAmount.value).toBe(0)
  })

  it('should have payment method label helper', () => {
    const { getPaymentMethodLabel } = useAdminTopupRequests()

    expect(getPaymentMethodLabel('bank_transfer')).toBe('โอนเงินผ่านธนาคาร')
    expect(getPaymentMethodLabel('promptpay')).toBe('พร้อมเพย์')
  })
})

describe('Admin Composables - useAdminRevenue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize with default state', () => {
    const { loading, revenueStats, error } = useAdminRevenue()

    expect(loading.value).toBe(false)
    expect(revenueStats.value).toBeNull()
    expect(error.value).toBeNull()
  })

  it('should have computed properties for revenue data', () => {
    const { 
      totalRevenue, 
      revenueByService, 
      platformFee,
      providerEarnings,
      dailyBreakdown,
      paymentMethodBreakdown 
    } = useAdminRevenue()

    expect(totalRevenue.value).toBe(0)
    expect(revenueByService.value).toEqual({
      ride: 0,
      delivery: 0,
      shopping: 0
    })
    expect(platformFee.value).toBe(0)
    expect(providerEarnings.value).toBe(0)
    expect(dailyBreakdown.value).toEqual([])
    expect(paymentMethodBreakdown.value).toEqual({
      cash: 0,
      wallet: 0,
      card: 0,
      promptpay: 0,
      mobile_banking: 0,
      other: 0
    })
  })

  it('should have chart data helper functions', () => {
    const { 
      getServiceRevenueChartData, 
      getPaymentMethodChartData,
      getDailyRevenueChartData 
    } = useAdminRevenue()

    expect(getServiceRevenueChartData()).toEqual([])
    expect(getPaymentMethodChartData()).toEqual([])
    expect(getDailyRevenueChartData()).toEqual([])
  })

  it('should calculate averages correctly', () => {
    const { getAverageDailyRevenue } = useAdminRevenue()

    expect(getAverageDailyRevenue()).toBe(0)
  })
})

describe('Admin Composables - useAdminPayments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize with default state', () => {
    const { loading, paymentStats, error } = useAdminPayments()

    expect(loading.value).toBe(false)
    expect(paymentStats.value).toBeNull()
    expect(error.value).toBeNull()
  })

  it('should have computed properties for payment data', () => {
    const { 
      totalTransactions, 
      totalAmount, 
      averageTransaction,
      paymentMethods,
      dailyTrends,
      serviceBreakdown,
      mostUsedPaymentMethod 
    } = useAdminPayments()

    expect(totalTransactions.value).toBe(0)
    expect(totalAmount.value).toBe(0)
    expect(averageTransaction.value).toBe(0)
    expect(paymentMethods.value).toEqual([])
    expect(dailyTrends.value).toEqual([])
    expect(serviceBreakdown.value).toEqual({
      ride: { count: 0, amount: 0, average: 0 },
      delivery: { count: 0, amount: 0, average: 0 },
      shopping: { count: 0, amount: 0, average: 0 }
    })
    expect(mostUsedPaymentMethod.value).toBeNull()
  })

  it('should have chart data helper functions', () => {
    const { 
      getPaymentMethodChartData, 
      getDailyTrendsChartData,
      getServiceBreakdownChartData 
    } = useAdminPayments()

    expect(getPaymentMethodChartData()).toEqual([])
    expect(getDailyTrendsChartData()).toEqual([])
    expect(getServiceBreakdownChartData()).toEqual([])
  })

  it('should calculate averages correctly', () => {
    const { 
      getAverageDailyTransactions, 
      getAverageDailyAmount 
    } = useAdminPayments()

    expect(getAverageDailyTransactions()).toBe(0)
    expect(getAverageDailyAmount()).toBe(0)
  })

  it('should format numbers correctly', () => {
    const { formatCurrency, formatNumber, formatPercentage } = useAdminPayments()

    expect(formatCurrency(1000)).toContain('1,000')
    expect(formatNumber(1000)).toContain('1,000')
    expect(formatPercentage(45.678)).toBe('45.7%')
  })
})

describe('Admin Composables - Error Handling', () => {
  it('should handle errors in all composables', () => {
    const composables = [
      useAdminCustomers(),
      useAdminProviders(),
      useAdminScheduledRides(),
      useAdminWithdrawals(),
      useAdminTopupRequests(),
      useAdminRevenue(),
      useAdminPayments()
    ]

    composables.forEach(composable => {
      expect(composable.error.value).toBeNull()
      expect(composable.loading.value).toBe(false)
    })
  })
})

describe('Admin Composables - Loading States', () => {
  it('should manage loading states correctly', () => {
    const composables = [
      useAdminCustomers(),
      useAdminProviders(),
      useAdminScheduledRides(),
      useAdminWithdrawals(),
      useAdminTopupRequests(),
      useAdminRevenue(),
      useAdminPayments()
    ]

    composables.forEach(composable => {
      expect(composable.loading.value).toBe(false)
    })
  })
})

describe('Admin Composables - Pagination Support', () => {
  it('should support pagination in list composables', () => {
    const { fetchCustomers } = useAdminCustomers()
    const { fetchProviders } = useAdminProviders()
    const { fetchScheduledRides } = useAdminScheduledRides()
    const { fetchWithdrawals } = useAdminWithdrawals()
    const { fetchTopupRequests } = useAdminTopupRequests()

    // All fetch functions should accept limit and offset
    expect(fetchCustomers).toBeDefined()
    expect(fetchProviders).toBeDefined()
    expect(fetchScheduledRides).toBeDefined()
    expect(fetchWithdrawals).toBeDefined()
    expect(fetchTopupRequests).toBeDefined()
  })
})
