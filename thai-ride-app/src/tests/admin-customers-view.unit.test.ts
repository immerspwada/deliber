/**
 * Admin Customers View Component Tests
 * =====================================
 * Tests for CustomersView.vue component
 * 
 * Requirements: 8.1, 9.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import CustomersView from '@/admin/views/CustomersView.vue'
import { useAdminCustomers } from '@/admin/composables/useAdminCustomers'
import { useErrorHandler } from '@/composables/useErrorHandler'
import { useToast } from '@/composables/useToast'

// Mock composables
vi.mock('@/admin/composables/useAdminCustomers')
vi.mock('@/composables/useErrorHandler')
vi.mock('@/composables/useToast')
vi.mock('@/admin/stores/adminUI.store', () => ({
  useAdminUIStore: () => ({
    setBreadcrumbs: vi.fn()
  })
}))

describe('CustomersView', () => {
  const mockCustomers = [
    {
      id: 'customer-1',
      full_name: 'John Doe',
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@example.com',
      phone_number: '0812345678',
      status: 'active',
      wallet_balance: 1000,
      total_orders: 5,
      total_spent: 5000,
      average_rating: 4.5,
      created_at: '2024-01-01T00:00:00Z',
      suspension_reason: null,
      suspended_at: null
    },
    {
      id: 'customer-2',
      full_name: 'Jane Smith',
      first_name: 'Jane',
      last_name: 'Smith',
      email: 'jane@example.com',
      phone_number: '0823456789',
      status: 'suspended',
      wallet_balance: 500,
      total_orders: 3,
      total_spent: 3000,
      average_rating: 4.0,
      created_at: '2024-01-02T00:00:00Z',
      suspension_reason: 'Violation of terms',
      suspended_at: '2024-01-15T00:00:00Z'
    }
  ]

  const mockComposable = {
    customers: { value: mockCustomers },
    totalCount: { value: 2 },
    loading: { value: false },
    error: { value: null },
    fetchCustomers: vi.fn(),
    fetchCount: vi.fn(),
    suspendCustomer: vi.fn(),
    unsuspendCustomer: vi.fn(),
    formatCurrency: vi.fn((amount: number) => `฿${amount.toLocaleString()}`),
    formatDate: vi.fn((date: string) => new Date(date).toLocaleDateString('th-TH')),
    getStatusLabel: vi.fn((status: string) => {
      const labels: Record<string, string> = {
        active: 'ใช้งานปกติ',
        suspended: 'ระงับแล้ว',
        banned: 'แบนถาวร'
      }
      return labels[status] || status
    }),
    getStatusColor: vi.fn((status: string) => {
      const colors: Record<string, string> = {
        active: '#10B981',
        suspended: '#EF4444',
        banned: '#7F1D1D'
      }
      return colors[status] || '#6B7280'
    }),
    activeCustomers: { value: [mockCustomers[0]] },
    suspendedCustomers: { value: [mockCustomers[1]] },
    bannedCustomers: { value: [] }
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
    vi.mocked(useAdminCustomers).mockReturnValue(mockComposable as any)
    vi.mocked(useErrorHandler).mockReturnValue(mockErrorHandler as any)
    vi.mocked(useToast).mockReturnValue(mockToast as any)
  })

  describe('Rendering', () => {
    it('should render page title and total count', () => {
      const wrapper = mount(CustomersView)
      
      expect(wrapper.find('.page-title').text()).toBe('ลูกค้า')
      expect(wrapper.find('.total-count').text()).toBe('2 คน')
    })

    it('should render stat badges with correct counts', () => {
      const wrapper = mount(CustomersView)
      
      const statBadges = wrapper.findAll('.stat-badge')
      expect(statBadges).toHaveLength(2)
      
      // Active customers badge
      expect(statBadges[0].find('.stat-label').text()).toBe('ใช้งานปกติ')
      expect(statBadges[0].find('.stat-value').text()).toBe('1')
      
      // Suspended customers badge
      expect(statBadges[1].find('.stat-label').text()).toBe('ระงับแล้ว')
      expect(statBadges[1].find('.stat-value').text()).toBe('1')
    })

    it('should render refresh button', () => {
      const wrapper = mount(CustomersView)
      
      const refreshBtn = wrapper.find('.refresh-btn')
      expect(refreshBtn.exists()).toBe(true)
      expect(refreshBtn.attributes('aria-label')).toBe('รีเฟรช')
    })

    it('should render search input with correct placeholder', () => {
      const wrapper = mount(CustomersView)
      
      const searchInput = wrapper.find('.search-input')
      expect(searchInput.exists()).toBe(true)
      expect(searchInput.attributes('placeholder')).toBe('ค้นหาชื่อ, อีเมล, เบอร์โทร...')
      expect(searchInput.attributes('aria-label')).toBe('ค้นหาลูกค้า')
    })

    it('should render status filter dropdown', () => {
      const wrapper = mount(CustomersView)
      
      const filterSelect = wrapper.find('.filter-select')
      expect(filterSelect.exists()).toBe(true)
      expect(filterSelect.attributes('aria-label')).toBe('กรองตามสถานะ')
      
      const options = filterSelect.findAll('option')
      expect(options).toHaveLength(4)
      expect(options[0].text()).toBe('ทุกสถานะ')
      expect(options[1].text()).toBe('ใช้งานปกติ')
      expect(options[2].text()).toBe('ระงับแล้ว')
      expect(options[3].text()).toBe('แบนถาวร')
    })

    it('should render data table with correct headers', () => {
      const wrapper = mount(CustomersView)
      
      const table = wrapper.find('.data-table')
      expect(table.exists()).toBe(true)
      
      const headers = table.findAll('th')
      expect(headers).toHaveLength(6)
      expect(headers[0].text()).toBe('ลูกค้า')
      expect(headers[1].text()).toBe('ติดต่อ')
      expect(headers[2].text()).toBe('สถานะ')
      expect(headers[3].text()).toBe('Wallet')
      expect(headers[4].text()).toBe('สมัครเมื่อ')
    })

    it('should render customer rows with correct data', () => {
      const wrapper = mount(CustomersView)
      
      const rows = wrapper.findAll('.data-table tbody tr')
      expect(rows).toHaveLength(2)
      
      // First customer
      expect(rows[0].find('.name').text()).toBe('John Doe')
      expect(rows[0].find('.email').text()).toBe('john@example.com')
      expect(rows[0].text()).toContain('0812345678')
      expect(rows[0].text()).toContain('฿1,000')
      
      // Second customer (suspended)
      expect(rows[1].find('.name').text()).toBe('Jane Smith')
      expect(rows[1].classes()).toContain('suspended-row')
    })

    it('should render action buttons for each customer', () => {
      const wrapper = mount(CustomersView)
      
      const rows = wrapper.findAll('.data-table tbody tr')
      
      // Active customer should have view and suspend buttons
      const activeActions = rows[0].findAll('.action-btn')
      expect(activeActions).toHaveLength(2)
      expect(activeActions[0].attributes('aria-label')).toBe('ดูรายละเอียด')
      expect(activeActions[1].attributes('aria-label')).toBe('ระงับการใช้งาน')
      
      // Suspended customer should have view and unsuspend buttons
      const suspendedActions = rows[1].findAll('.action-btn')
      expect(suspendedActions).toHaveLength(2)
      expect(suspendedActions[0].attributes('aria-label')).toBe('ดูรายละเอียด')
      expect(suspendedActions[1].attributes('aria-label')).toBe('ปลดระงับ')
    })
  })

  describe('Loading State', () => {
    it('should show loading skeleton when loading', () => {
      const loadingComposable = {
        ...mockComposable,
        loading: { value: true },
        customers: { value: [] }
      }
      vi.mocked(useAdminCustomers).mockReturnValue(loadingComposable as any)
      
      const wrapper = mount(CustomersView)
      
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
        customers: { value: [] }
      }
      vi.mocked(useAdminCustomers).mockReturnValue(errorComposable as any)
      
      const wrapper = mount(CustomersView)
      
      expect(wrapper.find('.error-state').exists()).toBe(true)
      expect(wrapper.find('.error-state p').text()).toBe('เกิดข้อผิดพลาดในการโหลดข้อมูล')
      expect(wrapper.find('.error-state .btn').text()).toBe('ลองใหม่')
    })
  })

  describe('Empty State', () => {
    it('should show empty state when no customers', () => {
      const emptyComposable = {
        ...mockComposable,
        customers: { value: [] },
        totalCount: { value: 0 }
      }
      vi.mocked(useAdminCustomers).mockReturnValue(emptyComposable as any)
      
      const wrapper = mount(CustomersView)
      
      expect(wrapper.find('.empty-state').exists()).toBe(true)
      expect(wrapper.find('.empty-state p').text()).toBe('ไม่พบลูกค้า')
    })
  })

  describe('Pagination', () => {
    it('should render pagination when multiple pages', () => {
      const paginatedComposable = {
        ...mockComposable,
        totalCount: { value: 50 }
      }
      vi.mocked(useAdminCustomers).mockReturnValue(paginatedComposable as any)
      
      const wrapper = mount(CustomersView)
      
      const pagination = wrapper.find('.pagination')
      expect(pagination.exists()).toBe(true)
      expect(pagination.find('.page-info').text()).toBe('1 / 3')
      
      const pageButtons = pagination.findAll('.page-btn')
      expect(pageButtons).toHaveLength(2)
      expect(pageButtons[0].attributes('aria-label')).toBe('หน้าก่อน')
      expect(pageButtons[1].attributes('aria-label')).toBe('หน้าถัดไป')
    })

    it('should not render pagination when single page', () => {
      const wrapper = mount(CustomersView)
      
      expect(wrapper.find('.pagination').exists()).toBe(false)
    })
  })

  describe('Modals', () => {
    it('should not show modals by default', () => {
      const wrapper = mount(CustomersView)
      
      expect(wrapper.find('.modal-overlay').exists()).toBe(false)
    })

    it('should show detail modal when view button clicked', async () => {
      const wrapper = mount(CustomersView)
      
      const viewBtn = wrapper.find('.action-btn[aria-label="ดูรายละเอียด"]')
      await viewBtn.trigger('click')
      
      expect(wrapper.find('.modal-overlay').exists()).toBe(true)
      expect(wrapper.find('.modal-header h2').text()).toBe('รายละเอียดลูกค้า')
    })

    it('should show suspend modal when suspend button clicked', async () => {
      const wrapper = mount(CustomersView)
      
      const suspendBtn = wrapper.find('.action-btn[aria-label="ระงับการใช้งาน"]')
      await suspendBtn.trigger('click')
      
      expect(wrapper.find('.suspend-modal').exists()).toBe(true)
      expect(wrapper.find('.modal-header h2').text()).toContain('ระงับการใช้งาน')
    })
  })

  describe('Actions', () => {
    it('should call fetchCustomers on mount', () => {
      mount(CustomersView)
      
      expect(mockComposable.fetchCustomers).toHaveBeenCalled()
      expect(mockComposable.fetchCount).toHaveBeenCalled()
    })

    it('should call fetchCustomers when refresh button clicked', async () => {
      const wrapper = mount(CustomersView)
      
      vi.clearAllMocks()
      
      const refreshBtn = wrapper.find('.refresh-btn')
      await refreshBtn.trigger('click')
      
      expect(mockComposable.fetchCustomers).toHaveBeenCalled()
    })

    it('should call suspendCustomer when suspend confirmed', async () => {
      mockComposable.suspendCustomer.mockResolvedValue(undefined)
      
      const wrapper = mount(CustomersView)
      
      // Open suspend modal
      const suspendBtn = wrapper.find('.action-btn[aria-label="ระงับการใช้งาน"]')
      await suspendBtn.trigger('click')
      
      // Fill reason
      const reasonInput = wrapper.find('.reason-input')
      await reasonInput.setValue('Test suspension reason')
      
      // Confirm suspend
      const confirmBtn = wrapper.find('.btn-danger')
      await confirmBtn.trigger('click')
      
      expect(mockComposable.suspendCustomer).toHaveBeenCalledWith('customer-1', 'Test suspension reason')
      expect(mockToast.success).toHaveBeenCalledWith('ระงับบัญชีลูกค้าเรียบร้อยแล้ว')
    })

    it('should call unsuspendCustomer when unsuspend confirmed', async () => {
      mockComposable.unsuspendCustomer.mockResolvedValue(undefined)
      
      // Mock window.confirm
      global.confirm = vi.fn(() => true)
      
      const wrapper = mount(CustomersView)
      
      // Click unsuspend button on suspended customer
      const rows = wrapper.findAll('.data-table tbody tr')
      const unsuspendBtn = rows[1].find('.action-btn[aria-label="ปลดระงับ"]')
      await unsuspendBtn.trigger('click')
      
      expect(mockComposable.unsuspendCustomer).toHaveBeenCalledWith('customer-2')
      expect(mockToast.success).toHaveBeenCalledWith('ปลดระงับบัญชีเรียบร้อยแล้ว')
    })
  })

  describe('Filters', () => {
    it('should update search query when typing in search input', async () => {
      const wrapper = mount(CustomersView)
      
      const searchInput = wrapper.find('.search-input')
      await searchInput.setValue('John')
      
      expect(searchInput.element.value).toBe('John')
    })

    it('should update status filter when selecting option', async () => {
      const wrapper = mount(CustomersView)
      
      const filterSelect = wrapper.find('.filter-select')
      await filterSelect.setValue('suspended')
      
      expect(filterSelect.element.value).toBe('suspended')
    })

    it('should call fetchCustomers when filters change', async () => {
      const wrapper = mount(CustomersView)
      
      vi.clearAllMocks()
      
      const searchInput = wrapper.find('.search-input')
      await searchInput.setValue('John')
      
      // Wait for watch to trigger
      await wrapper.vm.$nextTick()
      
      expect(mockComposable.fetchCustomers).toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    it('should have proper aria-labels on interactive elements', () => {
      const wrapper = mount(CustomersView)
      
      expect(wrapper.find('.refresh-btn').attributes('aria-label')).toBe('รีเฟรช')
      expect(wrapper.find('.search-input').attributes('aria-label')).toBe('ค้นหาลูกค้า')
      expect(wrapper.find('.filter-select').attributes('aria-label')).toBe('กรองตามสถานะ')
    })

    it('should have proper button labels', () => {
      const wrapper = mount(CustomersView)
      
      const actionButtons = wrapper.findAll('.action-btn')
      actionButtons.forEach(btn => {
        expect(btn.attributes('aria-label')).toBeTruthy()
      })
    })
  })
})
