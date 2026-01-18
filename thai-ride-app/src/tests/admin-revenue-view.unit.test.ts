/**
 * Unit tests for AdminRevenueView
 * 
 * Tests:
 * - Component renders correctly
 * - Date range picker works
 * - Service type filter works
 * - Charts display data correctly
 * - Daily breakdown table displays
 * - Loading and empty states
 * 
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import AdminRevenueView from '@/admin/views/AdminRevenueView.vue'

// Mock the composable
vi.mock('@/admin/composables/useAdminRevenue', () => ({
  useAdminRevenue: () => ({
    loading: ref(false),
    revenueStats: ref({
      total_revenue: 50000,
      ride_revenue: 30000,
      delivery_revenue: 15000,
      shopping_revenue: 5000,
      platform_fee: 5000,
      provider_earnings: 45000,
      daily_breakdown: [
        {
          date: '2024-01-01',
          revenue: 1000,
          orders: 10,
          ride_revenue: 600,
          delivery_revenue: 300,
          shopping_revenue: 100
        },
        {
          date: '2024-01-02',
          revenue: 1500,
          orders: 15,
          ride_revenue: 900,
          delivery_revenue: 450,
          shopping_revenue: 150
        }
      ],
      payment_method_breakdown: {
        cash: 20000,
        wallet: 15000,
        card: 10000,
        promptpay: 3000,
        mobile_banking: 2000,
        other: 0
      },
      date_from: '2024-01-01',
      date_to: '2024-01-31',
      service_type_filter: null
    }),
    error: ref(null),
    totalRevenue: ref(50000),
    revenueByService: ref({
      ride: 30000,
      delivery: 15000,
      shopping: 5000
    }),
    platformFee: ref(5000),
    providerEarnings: ref(45000),
    dailyBreakdown: ref([]),
    paymentMethodBreakdown: ref({
      cash: 20000,
      wallet: 15000,
      card: 10000,
      promptpay: 3000,
      mobile_banking: 2000,
      other: 0
    }),
    fetchRevenueStats: vi.fn().mockResolvedValue({}),
    formatCurrency: (amount: number) => `฿${amount.toLocaleString()}`,
    formatDate: (date: string) => new Date(date).toLocaleDateString('th-TH'),
    formatPercentage: (value: number, total: number) => {
      if (total === 0) return '0%'
      return `${((value / total) * 100).toFixed(1)}%`
    },
    getServiceTypeLabel: (type: string) => type,
    getPaymentMethodLabel: (method: string) => method,
    getServiceRevenueChartData: () => [
      { name: 'รถรับส่ง', value: 30000, color: '#3b82f6' },
      { name: 'ส่งของ', value: 15000, color: '#10b981' },
      { name: 'ช้อปปิ้ง', value: 5000, color: '#f59e0b' }
    ],
    getPaymentMethodChartData: () => [
      { name: 'เงินสด', value: 20000, color: '#22c55e' },
      { name: 'กระเป๋าเงิน', value: 15000, color: '#3b82f6' },
      { name: 'บัตร', value: 10000, color: '#a855f7' },
      { name: 'พร้อมเพย์', value: 3000, color: '#f59e0b' },
      { name: 'แอปธนาคาร', value: 2000, color: '#06b6d4' }
    ],
    getDailyRevenueChartData: () => [
      {
        date: '1 ม.ค.',
        revenue: 1000,
        orders: 10,
        ride: 600,
        delivery: 300,
        shopping: 100
      },
      {
        date: '2 ม.ค.',
        revenue: 1500,
        orders: 15,
        ride: 900,
        delivery: 450,
        shopping: 150
      }
    ],
    getAverageDailyRevenue: () => 1250,
    getHighestRevenueDay: () => ({
      date: '2024-01-02',
      revenue: 1500,
      orders: 15,
      ride_revenue: 900,
      delivery_revenue: 450,
      shopping_revenue: 150
    }),
    getLowestRevenueDay: () => ({
      date: '2024-01-01',
      revenue: 1000,
      orders: 10,
      ride_revenue: 600,
      delivery_revenue: 300,
      shopping_revenue: 100
    })
  })
}))

describe('AdminRevenueView', () => {
  it('should render the component', () => {
    const wrapper = mount(AdminRevenueView)
    expect(wrapper.find('h1').text()).toBe('รายงานรายได้')
  })

  it('should display summary cards with revenue data', () => {
    const wrapper = mount(AdminRevenueView)
    
    // Check for summary cards
    const cards = wrapper.findAll('.bg-white.p-6.rounded-xl')
    expect(cards.length).toBeGreaterThan(0)
    
    // Check for total revenue
    expect(wrapper.text()).toContain('รายได้รวม')
    expect(wrapper.text()).toContain('฿50,000')
  })

  it('should display service type breakdown', () => {
    const wrapper = mount(AdminRevenueView)
    
    expect(wrapper.text()).toContain('รถรับส่ง')
    expect(wrapper.text()).toContain('ส่งของ')
    expect(wrapper.text()).toContain('ช้อปปิ้ง')
    expect(wrapper.text()).toContain('฿30,000')
    expect(wrapper.text()).toContain('฿15,000')
    expect(wrapper.text()).toContain('฿5,000')
  })

  it('should have date range picker inputs', () => {
    const wrapper = mount(AdminRevenueView)
    
    const dateFromInput = wrapper.find('#date-from')
    const dateToInput = wrapper.find('#date-to')
    
    expect(dateFromInput.exists()).toBe(true)
    expect(dateToInput.exists()).toBe(true)
    expect(dateFromInput.attributes('type')).toBe('date')
    expect(dateToInput.attributes('type')).toBe('date')
  })

  it('should have service type filter', () => {
    const wrapper = mount(AdminRevenueView)
    
    const serviceTypeSelect = wrapper.find('#service-type')
    expect(serviceTypeSelect.exists()).toBe(true)
    
    const options = serviceTypeSelect.findAll('option')
    expect(options.length).toBe(4) // All, ride, delivery, shopping
    expect(options[0].text()).toBe('ทุกประเภท')
    expect(options[1].text()).toBe('รถรับส่ง')
    expect(options[2].text()).toBe('ส่งของ')
    expect(options[3].text()).toBe('ช้อปปิ้ง')
  })

  it('should display pie chart for service revenue', () => {
    const wrapper = mount(AdminRevenueView)
    
    // Check for pie chart SVG
    const svgs = wrapper.findAll('svg')
    expect(svgs.length).toBeGreaterThan(0)
    
    // Check for chart title
    expect(wrapper.text()).toContain('สัดส่วนรายได้ตามประเภทบริการ')
  })

  it('should display payment method breakdown', () => {
    const wrapper = mount(AdminRevenueView)
    
    expect(wrapper.text()).toContain('รายได้ตามช่องทางชำระเงิน')
    expect(wrapper.text()).toContain('เงินสด')
    expect(wrapper.text()).toContain('กระเป๋าเงิน')
    expect(wrapper.text()).toContain('บัตร')
  })

  it('should display daily revenue chart', () => {
    const wrapper = mount(AdminRevenueView)
    
    expect(wrapper.text()).toContain('กราฟรายได้รายวัน')
    
    // Check for line chart SVG
    const polylines = wrapper.findAll('polyline')
    expect(polylines.length).toBeGreaterThan(0)
  })

  it('should display daily breakdown table', () => {
    const wrapper = mount(AdminRevenueView)
    
    expect(wrapper.text()).toContain('รายละเอียดรายได้รายวัน')
    
    // Check for table
    const table = wrapper.find('table')
    expect(table.exists()).toBe(true)
    
    // Check for table headers
    const headers = table.findAll('th')
    expect(headers.length).toBe(6) // Date, Total, Orders, Ride, Delivery, Shopping
  })

  it('should have refresh button', () => {
    const wrapper = mount(AdminRevenueView)
    
    const refreshButton = wrapper.find('button[aria-label="รีเฟรชข้อมูล"]')
    expect(refreshButton.exists()).toBe(true)
    expect(refreshButton.text()).toContain('รีเฟรช')
  })

  it('should display platform fee and provider earnings', () => {
    const wrapper = mount(AdminRevenueView)
    
    expect(wrapper.text()).toContain('ค่าธรรมเนียมแพลตฟอร์ม')
    expect(wrapper.text()).toContain('รายได้ผู้ให้บริการ')
    expect(wrapper.text()).toContain('฿5,000')
    expect(wrapper.text()).toContain('฿45,000')
  })

  it('should display highest revenue day', () => {
    const wrapper = mount(AdminRevenueView)
    
    expect(wrapper.text()).toContain('วันที่รายได้สูงสุด')
    expect(wrapper.text()).toContain('฿1,500')
  })

  it('should have 30 days quick filter button', () => {
    const wrapper = mount(AdminRevenueView)
    
    const quickFilterButton = wrapper.findAll('button').find(btn => 
      btn.text().includes('30 วันล่าสุด')
    )
    expect(quickFilterButton).toBeDefined()
  })
})

describe('AdminRevenueView - Loading State', () => {
  it('should show loading spinner when loading', () => {
    vi.mock('@/admin/composables/useAdminRevenue', () => ({
      useAdminRevenue: () => ({
        loading: ref(true),
        revenueStats: ref(null),
        error: ref(null),
        totalRevenue: ref(0),
        revenueByService: ref({ ride: 0, delivery: 0, shopping: 0 }),
        platformFee: ref(0),
        providerEarnings: ref(0),
        dailyBreakdown: ref([]),
        paymentMethodBreakdown: ref({}),
        fetchRevenueStats: vi.fn(),
        formatCurrency: (amount: number) => `฿${amount}`,
        formatDate: (date: string) => date,
        formatPercentage: () => '0%',
        getServiceTypeLabel: (type: string) => type,
        getPaymentMethodLabel: (method: string) => method,
        getServiceRevenueChartData: () => [],
        getPaymentMethodChartData: () => [],
        getDailyRevenueChartData: () => [],
        getAverageDailyRevenue: () => 0,
        getHighestRevenueDay: () => null,
        getLowestRevenueDay: () => null
      })
    }))

    const wrapper = mount(AdminRevenueView)
    expect(wrapper.text()).toContain('กำลังโหลดข้อมูล')
  })
})

describe('AdminRevenueView - Accessibility', () => {
  it('should have proper labels for form inputs', () => {
    const wrapper = mount(AdminRevenueView)
    
    const dateFromLabel = wrapper.find('label[for="date-from"]')
    const dateToLabel = wrapper.find('label[for="date-to"]')
    const serviceTypeLabel = wrapper.find('label[for="service-type"]')
    
    expect(dateFromLabel.exists()).toBe(true)
    expect(dateToLabel.exists()).toBe(true)
    expect(serviceTypeLabel.exists()).toBe(true)
  })

  it('should have aria-label for refresh button', () => {
    const wrapper = mount(AdminRevenueView)
    
    const refreshButton = wrapper.find('button[aria-label="รีเฟรชข้อมูล"]')
    expect(refreshButton.exists()).toBe(true)
  })
})
