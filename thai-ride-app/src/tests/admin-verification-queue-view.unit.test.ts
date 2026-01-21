/**
 * Admin Verification Queue View Component Tests
 * ===============================================
 * Tests for VerificationQueueView.vue component
 * 
 * Requirements: 8.3, 9.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import VerificationQueueView from '@/admin/views/VerificationQueueView.vue'
import { useAdminProviders } from '@/admin/composables/useAdminProviders'

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn()
    })),
    removeChannel: vi.fn()
  }
}))

// Mock composables
vi.mock('@/admin/composables/useAdminProviders')

describe('VerificationQueueView', () => {
  const mockPendingProviders = [
    {
      id: 'provider-1',
      first_name: 'John',
      last_name: 'Pending',
      email: 'john.pending@example.com',
      phone_number: '0812345678',
      provider_type: 'ride',
      status: 'pending',
      rating: 0,
      total_trips: 0,
      total_earnings: 0,
      documents_verified: false,
      created_at: '2024-01-01T00:00:00Z',
      verification_notes: null
    },
    {
      id: 'provider-2',
      first_name: 'Jane',
      last_name: 'Waiting',
      email: 'jane.waiting@example.com',
      phone_number: '0823456789',
      provider_type: 'delivery',
      status: 'pending',
      rating: 0,
      total_trips: 0,
      total_earnings: 0,
      documents_verified: true,
      created_at: '2024-01-02T00:00:00Z',
      verification_notes: 'Documents uploaded'
    }
  ]

  const mockComposable = {
    loading: { value: false },
    providers: { value: [] },
    pendingProviders: { value: mockPendingProviders },
    fetchProviders: vi.fn(),
    approveProvider: vi.fn().mockResolvedValue({ success: true }),
    rejectProvider: vi.fn().mockResolvedValue({ success: true }),
    getFullName: vi.fn((provider: any) => `${provider.first_name} ${provider.last_name}`),
    formatDate: vi.fn((date: string) => new Date(date).toLocaleDateString('th-TH')),
    getProviderTypeLabel: vi.fn((type: string) => {
      const labels: Record<string, string> = {
        ride: 'รถรับส่ง',
        delivery: 'จัดส่งสินค้า',
        shopping: 'ช้อปปิ้ง',
        all: 'ทั้งหมด'
      }
      return labels[type] || type
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAdminProviders).mockReturnValue(mockComposable as any)
  })

  describe('Rendering', () => {
    it('should render page title and description', () => {
      const wrapper = mount(VerificationQueueView)
      
      expect(wrapper.find('h1').text()).toBe('คิวตรวจสอบผู้ให้บริการ')
      expect(wrapper.text()).toContain('ตรวจสอบและอนุมัติผู้ให้บริการที่รอการยืนยัน')
    })

    it('should render stats card with pending count', () => {
      const wrapper = mount(VerificationQueueView)
      
      const statsCard = wrapper.find('.bg-blue-50')
      expect(statsCard.exists()).toBe(true)
      expect(statsCard.text()).toContain('ผู้ให้บริการรอตรวจสอบ')
      expect(statsCard.text()).toContain('2')
    })

    it('should render filters section', () => {
      const wrapper = mount(VerificationQueueView)
      
      // Select all checkbox
      const selectAllCheckbox = wrapper.find('input[type="checkbox"]')
      expect(selectAllCheckbox.exists()).toBe(true)
      expect(selectAllCheckbox.element.nextElementSibling?.textContent).toContain('เลือกทั้งหมด')
      
      // Search input
      const searchInput = wrapper.find('input[type="text"]')
      expect(searchInput.exists()).toBe(true)
      expect(searchInput.attributes('placeholder')).toContain('ค้นหา')
      
      // Service type filter
      const selects = wrapper.findAll('select')
      expect(selects.length).toBeGreaterThanOrEqual(2)
    })

    it('should render service type filter options', () => {
      const wrapper = mount(VerificationQueueView)
      
      const selects = wrapper.findAll('select')
      const serviceTypeSelect = selects[0]
      const options = serviceTypeSelect.findAll('option')
      
      expect(options[0].text()).toBe('ทุกประเภท')
      expect(options[1].text()).toBe('รถรับส่ง')
      expect(options[2].text()).toBe('จัดส่งสินค้า')
      expect(options[3].text()).toBe('ช้อปปิ้ง')
    })

    it('should render sort filter options', () => {
      const wrapper = mount(VerificationQueueView)
      
      const selects = wrapper.findAll('select')
      const sortSelect = selects[1]
      const options = sortSelect.findAll('option')
      
      expect(options[0].text()).toBe('เก่าสุดก่อน')
      expect(options[1].text()).toBe('ใหม่สุดก่อน')
    })

    it('should render provider cards', () => {
      const wrapper = mount(VerificationQueueView)
      
      const providerCards = wrapper.findAll('.bg-white.rounded-lg.shadow-sm')
      expect(providerCards.length).toBeGreaterThan(0)
    })

    it('should render provider information correctly', () => {
      const wrapper = mount(VerificationQueueView)
      
      const cards = wrapper.findAll('.bg-white.rounded-lg.shadow-sm')
      const firstCard = cards[0]
      
      expect(firstCard.text()).toContain('John Pending')
      expect(firstCard.text()).toContain('john.pending@example.com')
      expect(firstCard.text()).toContain('0812345678')
      expect(firstCard.text()).toContain('รถรับส่ง')
      expect(firstCard.text()).toContain('รอตรวจสอบ')
    })

    it('should render action buttons for each provider', () => {
      const wrapper = mount(VerificationQueueView)
      
      const cards = wrapper.findAll('.bg-white.rounded-lg.shadow-sm')
      const firstCard = cards[0]
      
      const buttons = firstCard.findAll('button')
      const buttonTexts = buttons.map(b => b.text())
      
      expect(buttonTexts).toContain('ดูรายละเอียด')
      expect(buttonTexts).toContain('อนุมัติ')
      expect(buttonTexts).toContain('ปฏิเสธ')
    })

    it('should render document verification status', () => {
      const wrapper = mount(VerificationQueueView)
      
      const cards = wrapper.findAll('.bg-white.rounded-lg.shadow-sm')
      
      // First provider - not verified
      expect(cards[0].text()).toContain('รอตรวจสอบ')
      
      // Second provider - verified
      expect(cards[1].text()).toContain('ตรวจสอบแล้ว')
    })
  })

  describe('Loading State', () => {
    it('should show loading spinner when loading', () => {
      const loadingComposable = {
        ...mockComposable,
        loading: { value: true },
        pendingProviders: { value: [] }
      }
      vi.mocked(useAdminProviders).mockReturnValue(loadingComposable as any)
      
      const wrapper = mount(VerificationQueueView)
      
      expect(wrapper.find('.animate-spin').exists()).toBe(true)
      expect(wrapper.text()).toContain('กำลังโหลดข้อมูล...')
    })
  })

  describe('Empty State', () => {
    it('should show empty state when no pending providers', () => {
      const emptyComposable = {
        ...mockComposable,
        pendingProviders: { value: [] }
      }
      vi.mocked(useAdminProviders).mockReturnValue(emptyComposable as any)
      
      const wrapper = mount(VerificationQueueView)
      
      expect(wrapper.text()).toContain('ไม่มีผู้ให้บริการรอตรวจสอบ')
      expect(wrapper.text()).toContain('ยังไม่มีผู้ให้บริการที่รอการยืนยันในขณะนี้')
    })
  })

  describe('Selection', () => {
    it('should allow selecting individual providers', async () => {
      const wrapper = mount(VerificationQueueView)
      
      const checkboxes = wrapper.findAll('input[type="checkbox"]')
      // First checkbox is "select all", second is first provider
      const providerCheckbox = checkboxes[1]
      
      await providerCheckbox.setValue(true)
      
      expect(wrapper.text()).toContain('เลือก 1 รายการ')
    })

    it('should show bulk action buttons when providers selected', async () => {
      const wrapper = mount(VerificationQueueView)
      
      const checkboxes = wrapper.findAll('input[type="checkbox"]')
      await checkboxes[1].setValue(true)
      
      expect(wrapper.text()).toContain('อนุมัติทั้งหมด')
      expect(wrapper.text()).toContain('ปฏิเสธทั้งหมด')
    })

    it('should select all providers when select all clicked', async () => {
      const wrapper = mount(VerificationQueueView)
      
      const selectAllCheckbox = wrapper.find('input[type="checkbox"]')
      await selectAllCheckbox.setValue(true)
      
      expect(wrapper.text()).toContain('เลือก 2 รายการ')
    })
  })

  describe('Modals', () => {
    it('should not show modals by default', () => {
      const wrapper = mount(VerificationQueueView)
      
      expect(wrapper.find('.fixed.inset-0.bg-black').exists()).toBe(false)
    })

    it('should show detail modal when view details clicked', async () => {
      const wrapper = mount(VerificationQueueView)
      
      const viewButtons = wrapper.findAll('button').filter(b => b.text() === 'ดูรายละเอียด')
      await viewButtons[0].trigger('click')
      
      expect(wrapper.find('.fixed.inset-0.bg-black').exists()).toBe(true)
      expect(wrapper.text()).toContain('รายละเอียดผู้ให้บริการ')
    })

    it('should show approve modal when approve clicked', async () => {
      const wrapper = mount(VerificationQueueView)
      
      const approveButtons = wrapper.findAll('button').filter(b => b.text() === 'อนุมัติ')
      await approveButtons[0].trigger('click')
      
      expect(wrapper.find('.fixed.inset-0.bg-black').exists()).toBe(true)
      expect(wrapper.text()).toContain('อนุมัติผู้ให้บริการ')
    })

    it('should show reject modal when reject clicked', async () => {
      const wrapper = mount(VerificationQueueView)
      
      const rejectButtons = wrapper.findAll('button').filter(b => b.text() === 'ปฏิเสธ')
      await rejectButtons[0].trigger('click')
      
      expect(wrapper.find('.fixed.inset-0.bg-black').exists()).toBe(true)
      expect(wrapper.text()).toContain('ปฏิเสธผู้ให้บริการ')
    })

    it('should show approval notes field in approve modal', async () => {
      const wrapper = mount(VerificationQueueView)
      
      const approveButtons = wrapper.findAll('button').filter(b => b.text() === 'อนุมัติ')
      await approveButtons[0].trigger('click')
      
      const textarea = wrapper.find('textarea#approval-notes')
      expect(textarea.exists()).toBe(true)
      expect(textarea.attributes('placeholder')).toContain('เอกสารครบถ้วน')
    })

    it('should show rejection reason field in reject modal', async () => {
      const wrapper = mount(VerificationQueueView)
      
      const rejectButtons = wrapper.findAll('button').filter(b => b.text() === 'ปฏิเสธ')
      await rejectButtons[0].trigger('click')
      
      const textarea = wrapper.find('textarea#rejection-reason')
      expect(textarea.exists()).toBe(true)
      expect(textarea.attributes('placeholder')).toContain('เอกสารไม่ครบถ้วน')
      expect(textarea.attributes('required')).toBeDefined()
    })

    it('should validate rejection reason length', async () => {
      const wrapper = mount(VerificationQueueView)
      
      const rejectButtons = wrapper.findAll('button').filter(b => b.text() === 'ปฏิเสธ')
      await rejectButtons[0].trigger('click')
      
      const textarea = wrapper.find('textarea#rejection-reason')
      await textarea.setValue('short')
      
      expect(wrapper.text()).toContain('กรุณาระบุเหตุผลอย่างน้อย 10 ตัวอักษร')
    })
  })

  describe('Actions', () => {
    it('should call fetchProviders on mount', () => {
      mount(VerificationQueueView)
      
      expect(mockComposable.fetchProviders).toHaveBeenCalledWith({ status: 'pending', limit: 100 })
    })

    it('should call approveProvider when approve confirmed', async () => {
      const wrapper = mount(VerificationQueueView)
      
      // Open approve modal
      const approveButtons = wrapper.findAll('button').filter(b => b.text() === 'อนุมัติ')
      await approveButtons[0].trigger('click')
      
      // Fill notes (optional)
      const textarea = wrapper.find('textarea#approval-notes')
      await textarea.setValue('Documents verified')
      
      // Confirm
      const confirmButtons = wrapper.findAll('button').filter(b => b.text() === 'ยืนยันอนุมัติ')
      await confirmButtons[0].trigger('click')
      
      expect(mockComposable.approveProvider).toHaveBeenCalled()
    })

    it('should call rejectProvider when reject confirmed with valid reason', async () => {
      const wrapper = mount(VerificationQueueView)
      
      // Open reject modal
      const rejectButtons = wrapper.findAll('button').filter(b => b.text() === 'ปฏิเสธ')
      await rejectButtons[0].trigger('click')
      
      // Fill reason (required, min 10 chars)
      const textarea = wrapper.find('textarea#rejection-reason')
      await textarea.setValue('Documents incomplete and invalid')
      
      // Confirm
      const confirmButtons = wrapper.findAll('button').filter(b => b.text() === 'ยืนยันปฏิเสธ')
      await confirmButtons[0].trigger('click')
      
      expect(mockComposable.rejectProvider).toHaveBeenCalled()
    })

    it('should not call rejectProvider with short reason', async () => {
      const wrapper = mount(VerificationQueueView)
      
      // Open reject modal
      const rejectButtons = wrapper.findAll('button').filter(b => b.text() === 'ปฏิเสธ')
      await rejectButtons[0].trigger('click')
      
      // Fill short reason
      const textarea = wrapper.find('textarea#rejection-reason')
      await textarea.setValue('short')
      
      // Confirm button should be disabled
      const confirmButtons = wrapper.findAll('button').filter(b => b.text() === 'ยืนยันปฏิเสธ')
      expect(confirmButtons[0].attributes('disabled')).toBeDefined()
    })
  })

  describe('Filters', () => {
    it('should filter by search query', async () => {
      const wrapper = mount(VerificationQueueView)
      
      const searchInput = wrapper.find('input[type="text"]')
      await searchInput.setValue('John')
      
      // Should only show John Pending
      const cards = wrapper.findAll('.bg-white.rounded-lg.shadow-sm')
      expect(cards.length).toBe(1)
      expect(cards[0].text()).toContain('John Pending')
    })

    it('should filter by service type', async () => {
      const wrapper = mount(VerificationQueueView)
      
      const selects = wrapper.findAll('select')
      const serviceTypeSelect = selects[0]
      await serviceTypeSelect.setValue('ride')
      
      // Should only show ride providers
      const cards = wrapper.findAll('.bg-white.rounded-lg.shadow-sm')
      expect(cards.length).toBe(1)
      expect(cards[0].text()).toContain('รถรับส่ง')
    })

    it('should sort by newest first', async () => {
      const wrapper = mount(VerificationQueueView)
      
      const selects = wrapper.findAll('select')
      const sortSelect = selects[1]
      await sortSelect.setValue('newest')
      
      // Jane (2024-01-02) should be first
      const cards = wrapper.findAll('.bg-white.rounded-lg.shadow-sm')
      expect(cards[0].text()).toContain('Jane Waiting')
    })
  })

  describe('Detail Modal Content', () => {
    it('should show provider statistics in detail modal', async () => {
      const wrapper = mount(VerificationQueueView)
      
      const viewButtons = wrapper.findAll('button').filter(b => b.text() === 'ดูรายละเอียด')
      await viewButtons[0].trigger('click')
      
      expect(wrapper.text()).toContain('สถิติ')
      expect(wrapper.text()).toContain('งานทั้งหมด')
      expect(wrapper.text()).toContain('คะแนนเฉลี่ย')
      expect(wrapper.text()).toContain('รายได้รวม')
    })

    it('should show document verification status in detail modal', async () => {
      const wrapper = mount(VerificationQueueView)
      
      const viewButtons = wrapper.findAll('button').filter(b => b.text() === 'ดูรายละเอียด')
      await viewButtons[0].trigger('click')
      
      expect(wrapper.text()).toContain('สถานะเอกสาร')
    })

    it('should show verification notes if available', async () => {
      const wrapper = mount(VerificationQueueView)
      
      // View second provider with notes
      const viewButtons = wrapper.findAll('button').filter(b => b.text() === 'ดูรายละเอียด')
      await viewButtons[1].trigger('click')
      
      expect(wrapper.text()).toContain('หมายเหตุการตรวจสอบ')
      expect(wrapper.text()).toContain('Documents uploaded')
    })
  })

  describe('Accessibility', () => {
    it('should have proper aria-labels on close buttons', async () => {
      const wrapper = mount(VerificationQueueView)
      
      const approveButtons = wrapper.findAll('button').filter(b => b.text() === 'อนุมัติ')
      await approveButtons[0].trigger('click')
      
      const closeButton = wrapper.find('button[aria-label="ปิด"]')
      expect(closeButton.exists()).toBe(true)
    })

    it('should have proper labels for form inputs', async () => {
      const wrapper = mount(VerificationQueueView)
      
      const approveButtons = wrapper.findAll('button').filter(b => b.text() === 'อนุมัติ')
      await approveButtons[0].trigger('click')
      
      const label = wrapper.find('label[for="approval-notes"]')
      expect(label.exists()).toBe(true)
      expect(label.classes()).toContain('sr-only')
    })
  })
})
