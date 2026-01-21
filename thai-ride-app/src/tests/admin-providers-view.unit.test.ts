/**
 * Admin Providers View Component Tests
 * ======================================
 * Tests for ProvidersView.vue component
 * 
 * Requirements: 8.2, 9.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import ProvidersView from '@/admin/views/ProvidersView.vue'
import { useAdminProviders } from '@/admin/composables/useAdminProviders'
import { useErrorHandler } from '@/composables/useErrorHandler'
import { useToast } from '@/composables/useToast'

// Mock composables
vi.mock('@/admin/composables/useAdminProviders')
vi.mock('@/composables/useErrorHandler')
vi.mock('@/composables/useToast')
vi.mock('@/admin/stores/adminUI.store', () => ({
  useAdminUIStore: () => ({
    setBreadcrumbs: vi.fn()
  })
}))

describe('ProvidersView', () => {
  const mockProviders = [
    {
      id: 'provider-1',
      first_name: 'John',
      last_name: 'Driver',
      email: 'john.driver@example.com',
      phone_number: '0812345678',
      provider_type: 'ride',
      status: 'pending',
      is_online: false,
      rating: 4.5,
      total_trips: 10,
      total_earnings: 5000,
      wallet_balance: 1000,
      documents_verified: false,
      created_at: '2024-01-01T00:00:00Z'
    },
    {
      id: 'provider-2',
      first_name: 'Jane',
      last_name: 'Delivery',
      email: 'jane.delivery@example.com',
      phone_number: '0823456789',
      provider_type: 'delivery',
      status: 'approved',
      is_online: true,
      rating: 4.8,
      total_trips: 50,
      total_earnings: 25000,
      wallet_balance: 5000,
      documents_verified: true,
      created_at: '2024-01-02T00:00:00Z'
    }
  ]

  const mockComposable = {
    providers: { value: mockProviders },
    totalCount: { value: 2 },
    loading: { value: false },
    error: { value: null },
    fetchProviders: vi.fn(),
    fetchCount: vi.fn(),
    approveProvider: vi.fn(),
    rejectProvider: vi.fn(),
    suspendProvider: vi.fn(),
    formatCurrency: vi.fn((amount: number) => `฿${amount.toLocaleString()}`),
    formatDate: vi.fn((date: string) => new Date(date).toLocaleDateString('th-TH')),
    getStatusLabel: vi.fn((status: string) => {
      const labels: Record<string, string> = {
        pending: 'รอตรวจสอบ',
        approved: 'อนุมัติแล้ว',
        rejected: 'ปฏิเสธ',
        suspended: 'ระงับ'
      }
      return labels[status] || status
    }),
    getStatusColor: vi.fn((status: string) => {
      const colors: Record<string, string> = {
        pending: '#F59E0B',
        approved: '#10B981',
        rejected: '#EF4444',
        suspended: '#7F1D1D'
      }
      return colors[status] || '#6B7280'
    }),
    getProviderTypeLabel: vi.fn((type: string) => {
      const labels: Record<string, string> = {
        ride: 'รถรับส่ง',
        delivery: 'จัดส่งสินค้า',
        shopping: 'ช้อปปิ้ง',
        all: 'ทั้งหมด'
      }
      return labels[type] || type
    }),
    pendingProviders: { value: [mockProviders[0]] },
    approvedProviders: { value: [mockProviders[1]] },
    rejectedProviders: { value: [] },
    suspendedProviders: { value: [] },
    onlineProviders: { value: [mockProviders[1]] }
  }

  const mockErrorHandler = {
    handle: vi.fn()
  }

  const mockToast = {
    success: vi.fn(),
    error: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAdminProviders).mockReturnValue(mockComposable as any)
    vi.mocked(useErrorHandler).mockReturnValue(mockErrorHandler as any)
    vi.mocked(useToast).mockReturnValue(mockToast as any)
  })

  describe('Rendering', () => {
    it('should render page title and total count', () => {
      const wrapper = mount(ProvidersView)
      
      expect(wrapper.find('.page-title').text()).toBe('ผู้ให้บริการ')
      expect(wrapper.find('.total-count').text()).toBe('2 คน')
    })

    it('should render stat badges with correct counts', () => {
      const wrapper = mount(ProvidersView)
      
      const statBadges = wrapper.findAll('.stat-badge')
      expect(statBadges).toHaveLength(3)
      
      // Pending badge
      expect(statBadges[0].find('.stat-label').text()).toBe('รอตรวจสอบ')
      expect(statBadges[0].find('.stat-value').text()).toBe('1')
      
      // Approved badge
      expect(statBadges[1].find('.stat-label').text()).toBe('อนุมัติแล้ว')
      expect(statBadges[1].find('.stat-value').text()).toBe('1')
      
      // Online badge
      expect(statBadges[2].find('.stat-label').text()).toBe('ออนไลน์')
      expect(statBadges[2].find('.stat-value').text()).toBe('1')
    })

    it('should render search input', () => {
      const wrapper = mount(ProvidersView)
      
      const searchInput = wrapper.find('.search-input')
      expect(searchInput.exists()).toBe(true)
      expect(searchInput.attributes('placeholder')).toBe('ค้นหาชื่อ, เบอร์โทร...')
      expect(searchInput.attributes('aria-label')).toBe('ค้นหาผู้ให้บริการ')
    })

    it('should render status filter dropdown', () => {
      const wrapper = mount(ProvidersView)
      
      const filterSelects = wrapper.findAll('.filter-select')
      expect(filterSelects.length).toBeGreaterThanOrEqual(1)
      
      const statusFilter = filterSelects[0]
      expect(statusFilter.attributes('aria-label')).toBe('กรองตามสถานะ')
      
      const options = statusFilter.findAll('option')
      expect(options[0].text()).toBe('ทุกสถานะ')
      expect(options[1].text()).toBe('รอตรวจสอบ')
      expect(options[2].text()).toBe('อนุมัติแล้ว')
      expect(options[3].text()).toBe('ปฏิเสธ')
      expect(options[4].text()).toBe('ระงับ')
    })

    it('should render provider type filter dropdown', () => {
      const wrapper = mount(ProvidersView)
      
      const filterSelects = wrapper.findAll('.filter-select')
      const typeFilter = filterSelects[1]
      expect(typeFilter.attributes('aria-label')).toBe('กรองตามประเภท')
      
      const options = typeFilter.findAll('option')
      expect(options[0].text()).toBe('ทุกประเภท')
      expect(options[1].text()).toBe('Ride')
      expect(options[2].text()).toBe('Delivery')
      expect(options[3].text()).toBe('Shopping')
    })

    it('should render data table with correct headers', () => {
      const wrapper = mount(ProvidersView)
      
      const table = wrapper.find('.data-table')
      expect(table.exists()).toBe(true)
      
      const headers = table.findAll('th')
      expect(headers).toHaveLength(7)
      expect(headers[0].text()).toBe('ผู้ให้บริการ')
      expect(headers[1].text()).toBe('ประเภท')
      expect(headers[2].text()).toBe('สถานะ')
      expect(headers[3].text()).toBe('ออนไลน์')
      expect(headers[4].text()).toBe('คะแนน')
      expect(headers[5].text()).toBe('รายได้')
    })

    it('should render provider rows with correct data', () => {
      const wrapper = mount(ProvidersView)
      
      const rows = wrapper.findAll('.data-table tbody tr')
      expect(rows).toHaveLength(2)
      
      // First provider
      expect(rows[0].find('.name').text()).toBe('John Driver')
      expect(rows[0].find('.phone').text()).toBe('0812345678')
      expect(rows[0].text()).toContain('รถรับส่ง')
      expect(rows[0].text()).toContain('ออฟไลน์')
      
      // Second provider
      expect(rows[1].find('.name').text()).toBe('Jane Delivery')
      expect(rows[1].text()).toContain('ออนไลน์')
    })

    it('should render online status correctly', () => {
      const wrapper = mount(ProvidersView)
      
      const rows = wrapper.findAll('.data-table tbody tr')
      
      // Offline provider
      const offlineStatus = rows[0].find('.online-status')
      expect(offlineStatus.text()).toBe('ออฟไลน์')
      expect(offlineStatus.classes()).not.toContain('online')
      
      // Online provider
      const onlineStatus = rows[1].find('.online-status')
      expect(onlineStatus.text()).toBe('ออนไลน์')
      expect(onlineStatus.classes()).toContain('online')
    })
  })

  describe('Loading State', () => {
    it('should show loading skeleton when loading', () => {
      const loadingComposable = {
        ...mockComposable,
        loading: { value: true },
        providers: { value: [] }
      }
      vi.mocked(useAdminProviders).mockReturnValue(loadingComposable as any)
      
      const wrapper = mount(ProvidersView)
      
      expect(wrapper.find('.loading-state').exists()).toBe(true)
      expect(wrapper.findAll('.skeleton')).toHaveLength(10)
    })
  })

  describe('Error State', () => {
    it('should show error message when error occurs', () => {
      const errorComposable = {
        ...mockComposable,
        loading: { value: false },
        error: { value: new Error('Failed to load') },
        providers: { value: [] }
      }
      vi.mocked(useAdminProviders).mockReturnValue(errorComposable as any)
      
      const wrapper = mount(ProvidersView)
      
      expect(wrapper.find('.error-state').exists()).toBe(true)
      expect(wrapper.find('.error-state p').text()).toBe('เกิดข้อผิดพลาดในการโหลดข้อมูล')
    })
  })

  describe('Empty State', () => {
    it('should show empty state when no providers', () => {
      const emptyComposable = {
        ...mockComposable,
        providers: { value: [] },
        totalCount: { value: 0 }
      }
      vi.mocked(useAdminProviders).mockReturnValue(emptyComposable as any)
      
      const wrapper = mount(ProvidersView)
      
      expect(wrapper.find('.empty-state').exists()).toBe(true)
      expect(wrapper.find('.empty-state p').text()).toBe('ไม่พบผู้ให้บริการ')
    })
  })

  describe('Modals', () => {
    it('should not show modals by default', () => {
      const wrapper = mount(ProvidersView)
      
      expect(wrapper.find('.modal-overlay').exists()).toBe(false)
    })

    it('should show detail modal when view button clicked', async () => {
      const wrapper = mount(ProvidersView)
      
      const viewBtn = wrapper.find('.action-btn')
      await viewBtn.trigger('click')
      
      expect(wrapper.find('.modal-overlay').exists()).toBe(true)
      expect(wrapper.find('.modal-header h2').text()).toBe('รายละเอียดผู้ให้บริการ')
    })

    it('should show action modal for approve', async () => {
      const wrapper = mount(ProvidersView)
      
      // Open detail modal first
      const viewBtn = wrapper.find('.action-btn')
      await viewBtn.trigger('click')
      
      // Click approve button
      const approveBtn = wrapper.find('.btn-success')
      await approveBtn.trigger('click')
      
      expect(wrapper.findAll('.modal-overlay')).toHaveLength(1)
      expect(wrapper.text()).toContain('อนุมัติผู้ให้บริการ')
    })
  })

  describe('Actions', () => {
    it('should call fetchProviders on mount', () => {
      mount(ProvidersView)
      
      expect(mockComposable.fetchProviders).toHaveBeenCalled()
      expect(mockComposable.fetchCount).toHaveBeenCalled()
    })

    it('should call fetchProviders when refresh button clicked', async () => {
      const wrapper = mount(ProvidersView)
      
      vi.clearAllMocks()
      
      const refreshBtn = wrapper.find('.refresh-btn')
      await refreshBtn.trigger('click')
      
      expect(mockComposable.fetchProviders).toHaveBeenCalled()
    })

    it('should call approveProvider when approve confirmed', async () => {
      mockComposable.approveProvider.mockResolvedValue(undefined)
      
      const wrapper = mount(ProvidersView)
      
      // Open detail modal
      const viewBtn = wrapper.find('.action-btn')
      await viewBtn.trigger('click')
      
      // Click approve button
      const approveBtn = wrapper.find('.btn-success')
      await approveBtn.trigger('click')
      
      // Confirm in action modal
      await wrapper.vm.$nextTick()
      const confirmBtn = wrapper.findAll('.btn-success').at(-1)
      if (confirmBtn) {
        await confirmBtn.trigger('click')
        
        expect(mockComposable.approveProvider).toHaveBeenCalled()
        expect(mockToast.success).toHaveBeenCalledWith('อนุมัติผู้ให้บริการเรียบร้อยแล้ว')
      }
    })
  })

  describe('Filters', () => {
    it('should update search query when typing', async () => {
      const wrapper = mount(ProvidersView)
      
      const searchInput = wrapper.find('.search-input')
      await searchInput.setValue('John')
      
      expect(searchInput.element.value).toBe('John')
    })

    it('should update status filter when selecting', async () => {
      const wrapper = mount(ProvidersView)
      
      const filterSelects = wrapper.findAll('.filter-select')
      const statusFilter = filterSelects[0]
      await statusFilter.setValue('approved')
      
      expect(statusFilter.element.value).toBe('approved')
    })

    it('should update type filter when selecting', async () => {
      const wrapper = mount(ProvidersView)
      
      const filterSelects = wrapper.findAll('.filter-select')
      const typeFilter = filterSelects[1]
      await typeFilter.setValue('ride')
      
      expect(typeFilter.element.value).toBe('ride')
    })
  })

  describe('Pagination', () => {
    it('should render pagination when multiple pages', () => {
      const paginatedComposable = {
        ...mockComposable,
        totalCount: { value: 50 }
      }
      vi.mocked(useAdminProviders).mockReturnValue(paginatedComposable as any)
      
      const wrapper = mount(ProvidersView)
      
      const pagination = wrapper.find('.pagination')
      expect(pagination.exists()).toBe(true)
      expect(pagination.find('.page-info').text()).toBe('1 / 3')
    })
  })

  describe('Accessibility', () => {
    it('should have proper aria-labels on interactive elements', () => {
      const wrapper = mount(ProvidersView)
      
      expect(wrapper.find('.refresh-btn').attributes('aria-label')).toBe('รีเฟรช')
      expect(wrapper.find('.search-input').attributes('aria-label')).toBe('ค้นหาผู้ให้บริการ')
      
      const filterSelects = wrapper.findAll('.filter-select')
      expect(filterSelects[0].attributes('aria-label')).toBe('กรองตามสถานะ')
      expect(filterSelects[1].attributes('aria-label')).toBe('กรองตามประเภท')
    })
  })
})
