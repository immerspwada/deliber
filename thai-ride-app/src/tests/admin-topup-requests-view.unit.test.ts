/**
 * Unit Tests for AdminTopupRequestsView
 * 
 * Tests the customer topup request management view component
 * Requirements: 10.6, 10.7
 * 
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import AdminTopupRequestsView from '@/admin/views/AdminTopupRequestsView.vue'

// Mock the composable
vi.mock('@/admin/composables/useAdminTopupRequests', () => ({
  useAdminTopupRequests: () => ({
    loading: ref(false),
    topupRequests: ref([
      {
        id: '1',
        user_id: 'user-1',
        user_name: 'สมชาย ใจดี',
        user_email: 'somchai@example.com',
        user_phone: '0812345678',
        amount: 500,
        payment_method: 'bank_transfer',
        payment_reference: 'TRX123456',
        payment_proof_url: 'https://example.com/proof.jpg',
        status: 'pending',
        requested_at: '2024-01-15T10:00:00Z',
        processed_at: null,
        processed_by: null,
        rejection_reason: null,
        wallet_balance: 1000
      },
      {
        id: '2',
        user_id: 'user-2',
        user_name: 'สมหญิง รักดี',
        user_email: 'somying@example.com',
        user_phone: '0823456789',
        amount: 1000,
        payment_method: 'promptpay',
        payment_reference: 'PP987654',
        payment_proof_url: null,
        status: 'approved',
        requested_at: '2024-01-14T09:00:00Z',
        processed_at: '2024-01-14T10:00:00Z',
        processed_by: 'admin-1',
        rejection_reason: null,
        wallet_balance: 2000
      }
    ]),
    totalCount: ref(2),
    error: ref(null),
    pendingRequests: ref([
      {
        id: '1',
        user_id: 'user-1',
        user_name: 'สมชาย ใจดี',
        user_email: 'somchai@example.com',
        user_phone: '0812345678',
        amount: 500,
        payment_method: 'bank_transfer',
        payment_reference: 'TRX123456',
        payment_proof_url: 'https://example.com/proof.jpg',
        status: 'pending',
        requested_at: '2024-01-15T10:00:00Z',
        processed_at: null,
        processed_by: null,
        rejection_reason: null,
        wallet_balance: 1000
      }
    ]),
    approvedRequests: ref([
      {
        id: '2',
        user_id: 'user-2',
        user_name: 'สมหญิง รักดี',
        user_email: 'somying@example.com',
        user_phone: '0823456789',
        amount: 1000,
        payment_method: 'promptpay',
        payment_reference: 'PP987654',
        payment_proof_url: null,
        status: 'approved',
        requested_at: '2024-01-14T09:00:00Z',
        processed_at: '2024-01-14T10:00:00Z',
        processed_by: 'admin-1',
        rejection_reason: null,
        wallet_balance: 2000
      }
    ]),
    rejectedRequests: ref([]),
    totalPendingAmount: ref(500),
    fetchTopupRequests: vi.fn().mockResolvedValue([]),
    fetchCount: vi.fn().mockResolvedValue(2),
    approveTopup: vi.fn().mockResolvedValue({ success: true, message: 'อนุมัติสำเร็จ' }),
    rejectTopup: vi.fn().mockResolvedValue({ success: true, message: 'ปฏิเสธสำเร็จ' }),
    formatCurrency: (amount: number) => `฿${amount.toLocaleString()}`,
    formatDate: (date: string | null) => date ? new Date(date).toLocaleDateString('th-TH') : '-',
    getStatusLabel: (status: string) => {
      const labels: Record<string, string> = {
        pending: 'รอดำเนินการ',
        approved: 'อนุมัติแล้ว',
        rejected: 'ปฏิเสธ'
      }
      return labels[status] || status
    },
    getStatusColor: (status: string) => {
      const colors: Record<string, string> = {
        pending: 'bg-yellow-100 text-yellow-800',
        approved: 'bg-green-100 text-green-800',
        rejected: 'bg-red-100 text-red-800'
      }
      return colors[status] || 'bg-gray-100 text-gray-800'
    },
    getPaymentMethodLabel: (method: string) => {
      const labels: Record<string, string> = {
        bank_transfer: 'โอนเงินผ่านธนาคาร',
        promptpay: 'พร้อมเพย์',
        mobile_banking: 'แอปธนาคาร'
      }
      return labels[method] || method
    }
  })
}))

describe('AdminTopupRequestsView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render the view with header', () => {
    const wrapper = mount(AdminTopupRequestsView)
    
    expect(wrapper.find('h1').text()).toBe('คำขอเติมเงิน (Customer)')
    expect(wrapper.find('p').text()).toContain('จัดการคำขอเติมเงินของลูกค้า')
  })

  it('should display statistics cards', () => {
    const wrapper = mount(AdminTopupRequestsView)
    
    const cards = wrapper.findAll('.bg-white.p-4.rounded-xl')
    expect(cards.length).toBeGreaterThanOrEqual(4)
    
    // Check for pending stats
    expect(wrapper.text()).toContain('รอดำเนินการ')
    expect(wrapper.text()).toContain('อนุมัติแล้ว')
    expect(wrapper.text()).toContain('ปฏิเสธ')
  })

  it('should display status filter dropdown', () => {
    const wrapper = mount(AdminTopupRequestsView)
    
    const select = wrapper.find('select')
    expect(select.exists()).toBe(true)
    
    const options = select.findAll('option')
    expect(options.length).toBeGreaterThanOrEqual(4)
    expect(options[0].text()).toBe('ทุกสถานะ')
    expect(options[1].text()).toBe('รอดำเนินการ')
    expect(options[2].text()).toBe('อนุมัติแล้ว')
    expect(options[3].text()).toBe('ปฏิเสธ')
  })

  it('should display topup requests table', () => {
    const wrapper = mount(AdminTopupRequestsView)
    
    const table = wrapper.find('table')
    expect(table.exists()).toBe(true)
    
    // Check table headers
    const headers = table.findAll('th')
    expect(headers.length).toBe(7)
    expect(headers[0].text()).toContain('ลูกค้า')
    expect(headers[1].text()).toContain('จำนวนเงิน')
    expect(headers[2].text()).toContain('การชำระเงิน')
    expect(headers[3].text()).toContain('หลักฐาน')
    expect(headers[4].text()).toContain('สถานะ')
    expect(headers[5].text()).toContain('วันที่')
    expect(headers[6].text()).toContain('จัดการ')
  })

  it('should display topup request data in table rows', () => {
    const wrapper = mount(AdminTopupRequestsView)
    
    const rows = wrapper.findAll('tbody tr')
    expect(rows.length).toBeGreaterThanOrEqual(2)
    
    // Check first row (pending)
    expect(rows[0].text()).toContain('สมชาย ใจดี')
    expect(rows[0].text()).toContain('0812345678')
    expect(rows[0].text()).toContain('฿500')
    expect(rows[0].text()).toContain('TRX123456')
    expect(rows[0].text()).toContain('รอดำเนินการ')
    
    // Check second row (approved)
    expect(rows[1].text()).toContain('สมหญิง รักดี')
    expect(rows[1].text()).toContain('0823456789')
    expect(rows[1].text()).toContain('฿1,000')
    expect(rows[1].text()).toContain('PP987654')
    expect(rows[1].text()).toContain('อนุมัติแล้ว')
  })

  it('should show approve and reject buttons for pending requests', () => {
    const wrapper = mount(AdminTopupRequestsView)
    
    const rows = wrapper.findAll('tbody tr')
    const pendingRow = rows[0]
    
    const buttons = pendingRow.findAll('button')
    const approveButton = buttons.find(btn => btn.text().includes('อนุมัติ'))
    const rejectButton = buttons.find(btn => btn.text().includes('ปฏิเสธ'))
    
    expect(approveButton).toBeDefined()
    expect(rejectButton).toBeDefined()
  })

  it('should not show action buttons for processed requests', () => {
    const wrapper = mount(AdminTopupRequestsView)
    
    const rows = wrapper.findAll('tbody tr')
    const approvedRow = rows[1]
    
    const actionButtons = approvedRow.findAll('button').filter(btn => 
      btn.text().includes('อนุมัติ') || btn.text().includes('ปฏิเสธ')
    )
    
    expect(actionButtons.length).toBe(0)
  })

  it('should show payment proof button when proof URL exists', () => {
    const wrapper = mount(AdminTopupRequestsView)
    
    const rows = wrapper.findAll('tbody tr')
    const rowWithProof = rows[0]
    
    const proofButton = rowWithProof.findAll('button').find(btn => 
      btn.text().includes('ดูรูปภาพ')
    )
    
    expect(proofButton).toBeDefined()
  })

  it('should show "ไม่มีหลักฐาน" when proof URL is null', () => {
    const wrapper = mount(AdminTopupRequestsView)
    
    const rows = wrapper.findAll('tbody tr')
    const rowWithoutProof = rows[1]
    
    expect(rowWithoutProof.text()).toContain('ไม่มีหลักฐาน')
  })

  it('should display payment method labels in Thai', () => {
    const wrapper = mount(AdminTopupRequestsView)
    
    const rows = wrapper.findAll('tbody tr')
    
    // First row should show bank transfer
    expect(rows[0].text()).toContain('โอนเงินผ่านธนาคาร')
    
    // Second row should show promptpay
    expect(rows[1].text()).toContain('พร้อมเพย์')
  })

  it('should display wallet balance for each customer', () => {
    const wrapper = mount(AdminTopupRequestsView)
    
    const rows = wrapper.findAll('tbody tr')
    
    expect(rows[0].text()).toContain('ยอดคงเหลือ')
    expect(rows[0].text()).toContain('฿1,000')
    
    expect(rows[1].text()).toContain('ยอดคงเหลือ')
    expect(rows[1].text()).toContain('฿2,000')
  })

  it('should have refresh button', () => {
    const wrapper = mount(AdminTopupRequestsView)
    
    const refreshButton = wrapper.findAll('button').find(btn => 
      btn.text().includes('รีเฟรช')
    )
    
    expect(refreshButton).toBeDefined()
  })

  it('should apply yellow background to pending requests', () => {
    const wrapper = mount(AdminTopupRequestsView)
    
    const rows = wrapper.findAll('tbody tr')
    const pendingRow = rows[0]
    
    expect(pendingRow.classes()).toContain('bg-yellow-50')
  })

  it('should display correct status colors', () => {
    const wrapper = mount(AdminTopupRequestsView)
    
    const rows = wrapper.findAll('tbody tr')
    
    // Pending status should have yellow color
    const pendingStatus = rows[0].find('.bg-yellow-100')
    expect(pendingStatus.exists()).toBe(true)
    
    // Approved status should have green color
    const approvedStatus = rows[1].find('.bg-green-100')
    expect(approvedStatus.exists()).toBe(true)
  })

  it('should have accessible labels on buttons', () => {
    const wrapper = mount(AdminTopupRequestsView)
    
    const refreshButton = wrapper.findAll('button').find(btn => 
      btn.text().includes('รีเฟรช')
    )
    
    expect(refreshButton?.attributes('aria-label')).toBe('รีเฟรชข้อมูล')
  })

  it('should have accessible label on status filter', () => {
    const wrapper = mount(AdminTopupRequestsView)
    
    const select = wrapper.find('select')
    expect(select.attributes('aria-label')).toBe('กรองตามสถานะ')
  })
})

describe('AdminTopupRequestsView - Modal Interactions', () => {
  it('should not show modals by default', () => {
    const wrapper = mount(AdminTopupRequestsView)
    
    const modals = wrapper.findAll('[role="dialog"]')
    expect(modals.length).toBe(0)
  })

  it('should have image modal structure when shown', async () => {
    const wrapper = mount(AdminTopupRequestsView)
    
    // Click on payment proof button
    const proofButton = wrapper.findAll('button').find(btn => 
      btn.text().includes('ดูรูปภาพ')
    )
    
    if (proofButton) {
      await proofButton.trigger('click')
      await wrapper.vm.$nextTick()
      
      // Check if image modal appears
      const imageModal = wrapper.find('.fixed.inset-0.bg-black\\/80')
      expect(imageModal.exists()).toBe(true)
    }
  })
})

describe('AdminTopupRequestsView - Statistics', () => {
  it('should calculate total pending amount correctly', () => {
    const wrapper = mount(AdminTopupRequestsView)
    
    // Should show ฿500 as total pending amount
    expect(wrapper.text()).toContain('฿500')
  })

  it('should count pending requests correctly', () => {
    const wrapper = mount(AdminTopupRequestsView)
    
    const stats = wrapper.findAll('.text-2xl.font-bold.text-yellow-600')
    // First stat card (yellow - pending) should show 1 pending request
    expect(stats[0].text()).toBe('1')
  })

  it('should count approved requests correctly', () => {
    const wrapper = mount(AdminTopupRequestsView)
    
    const stats = wrapper.findAll('.text-2xl.font-bold.text-green-600')
    // Second stat card (green - approved) should show 1 approved request
    expect(stats[0].text()).toBe('1')
  })
})
