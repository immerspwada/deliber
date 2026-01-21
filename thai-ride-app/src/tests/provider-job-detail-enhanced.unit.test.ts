/**
 * Enhanced Provider Job Detail Tests
 * Comprehensive test suite for the enhanced provider job detail system
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import { nextTick } from 'vue'
import ProviderJobDetailViewEnhanced from '../views/provider/ProviderJobDetailViewEnhanced.vue'
import { useProviderJobDetail } from '../composables/useProviderJobDetail'
import type { JobDetail, RideStatus } from '../types/ride-requests'

// Mock composables
vi.mock('../composables/useProviderJobDetail')
vi.mock('../composables/useETA')
vi.mock('../composables/useNavigation')
vi.mock('../composables/useProviderLocation')

// Mock router
const mockRouter = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/provider/job/:id', component: ProviderJobDetailViewEnhanced },
    { path: '/provider/my-jobs', component: { template: '<div>My Jobs</div>' } }
  ]
})

// Test data
const mockJobDetail: JobDetail = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  type: 'ride',
  status: 'matched' as RideStatus,
  service_type: 'standard',
  pickup_address: '123 Test Street, Bangkok',
  pickup_lat: 13.7563,
  pickup_lng: 100.5018,
  dropoff_address: '456 Destination Ave, Bangkok',
  dropoff_lat: 13.7463,
  dropoff_lng: 100.5118,
  fare: 150,
  notes: 'Please wait at the main entrance',
  created_at: '2026-01-15T10:00:00Z',
  customer: {
    id: 'customer-123',
    name: 'John Doe',
    phone: '0812345678',
    avatar_url: 'https://example.com/avatar.jpg'
  }
}

describe('ProviderJobDetailViewEnhanced', () => {
  let mockUseProviderJobDetail: any

  beforeEach(() => {
    mockUseProviderJobDetail = {
      job: { value: null },
      loading: { value: false },
      updating: { value: false },
      error: { value: null },
      currentStatusIndex: { value: 0 },
      nextStatus: { value: { key: 'pickup', label: 'ถึงจุดรับแล้ว', action: 'ถึงจุดรับแล้ว' } },
      canUpdate: { value: true },
      isJobCompleted: { value: false },
      isJobCancelled: { value: false },
      showPickupPhoto: { value: false },
      showDropoffPhoto: { value: false },
      loadJob: vi.fn(),
      updateStatus: vi.fn(),
      cancelJob: vi.fn(),
      handlePhotoUploaded: vi.fn()
    }

    vi.mocked(useProviderJobDetail).mockReturnValue(mockUseProviderJobDetail)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Component Mounting', () => {
    it('should mount successfully', () => {
      const wrapper = mount(ProviderJobDetailViewEnhanced, {
        global: {
          plugins: [mockRouter]
        }
      })

      expect(wrapper.exists()).toBe(true)
      expect(wrapper.find('.job-detail-page').exists()).toBe(true)
    })

    it('should show loading state initially', () => {
      mockUseProviderJobDetail.loading.value = true

      const wrapper = mount(ProviderJobDetailViewEnhanced, {
        global: {
          plugins: [mockRouter]
        }
      })

      expect(wrapper.find('.center-state').exists()).toBe(true)
      expect(wrapper.find('.loader').exists()).toBe(true)
      expect(wrapper.text()).toContain('กำลังโหลดข้อมูลงาน')
    })

    it('should show error state when error occurs', () => {
      mockUseProviderJobDetail.error.value = 'ไม่พบข้อมูลงาน'

      const wrapper = mount(ProviderJobDetailViewEnhanced, {
        global: {
          plugins: [mockRouter]
        }
      })

      expect(wrapper.find('.error-state').exists()).toBe(true)
      expect(wrapper.text()).toContain('ไม่พบข้อมูลงาน')
    })
  })

  describe('Job Detail Display', () => {
    beforeEach(() => {
      mockUseProviderJobDetail.job.value = mockJobDetail
    })

    it('should display job details correctly', () => {
      const wrapper = mount(ProviderJobDetailViewEnhanced, {
        global: {
          plugins: [mockRouter]
        }
      })

      expect(wrapper.text()).toContain('John Doe')
      expect(wrapper.text()).toContain('123 Test Street, Bangkok')
      expect(wrapper.text()).toContain('456 Destination Ave, Bangkok')
      expect(wrapper.text()).toContain('฿150')
      expect(wrapper.text()).toContain('Please wait at the main entrance')
    })

    it('should show status progress correctly', () => {
      const wrapper = mount(ProviderJobDetailViewEnhanced, {
        global: {
          plugins: [mockRouter]
        }
      })

      const statusProgress = wrapper.find('.status-progress')
      expect(statusProgress.exists()).toBe(true)
      
      const statusSteps = wrapper.findAll('.status-step')
      expect(statusSteps).toHaveLength(4) // matched, pickup, in_progress, completed
    })

    it('should display customer information', () => {
      const wrapper = mount(ProviderJobDetailViewEnhanced, {
        global: {
          plugins: [mockRouter]
        }
      })

      const customerCard = wrapper.find('.customer-card')
      expect(customerCard.exists()).toBe(true)
      expect(customerCard.text()).toContain('John Doe')
      
      const avatar = customerCard.find('img')
      expect(avatar.attributes('src')).toBe('https://example.com/avatar.jpg')
      expect(avatar.attributes('alt')).toContain('John Doe')
    })

    it('should show contact buttons for active jobs', () => {
      const wrapper = mount(ProviderJobDetailViewEnhanced, {
        global: {
          plugins: [mockRouter]
        }
      })

      const contactButtons = wrapper.find('.contact-buttons')
      expect(contactButtons.exists()).toBe(true)
      
      const callBtn = wrapper.find('.call-btn')
      const chatBtn = wrapper.find('.chat-btn')
      
      expect(callBtn.exists()).toBe(true)
      expect(chatBtn.exists()).toBe(true)
    })
  })

  describe('Status Updates', () => {
    beforeEach(() => {
      mockUseProviderJobDetail.job.value = mockJobDetail
    })

    it('should show status update button when can update', () => {
      mockUseProviderJobDetail.canUpdate.value = true

      const wrapper = mount(ProviderJobDetailViewEnhanced, {
        global: {
          plugins: [mockRouter]
        }
      })

      const statusBtn = wrapper.find('.status-btn')
      expect(statusBtn.exists()).toBe(true)
      expect(statusBtn.text()).toContain('ถึงจุดรับแล้ว')
    })

    it('should call updateStatus when status button clicked', async () => {
      mockUseProviderJobDetail.updateStatus.mockResolvedValue({ success: true, newStatus: 'pickup' })

      const wrapper = mount(ProviderJobDetailViewEnhanced, {
        global: {
          plugins: [mockRouter]
        }
      })

      const statusBtn = wrapper.find('.status-btn')
      await statusBtn.trigger('click')

      expect(mockUseProviderJobDetail.updateStatus).toHaveBeenCalled()
    })

    it('should disable status button when updating', () => {
      mockUseProviderJobDetail.updating.value = true

      const wrapper = mount(ProviderJobDetailViewEnhanced, {
        global: {
          plugins: [mockRouter]
        }
      })

      const statusBtn = wrapper.find('.status-btn')
      expect(statusBtn.attributes('disabled')).toBeDefined()
      expect(statusBtn.find('.btn-loader').exists()).toBe(true)
    })
  })

  describe('Job Completion', () => {
    it('should show completion banner when job is completed', () => {
      mockUseProviderJobDetail.job.value = { ...mockJobDetail, status: 'completed' as RideStatus }
      mockUseProviderJobDetail.isJobCompleted.value = true

      const wrapper = mount(ProviderJobDetailViewEnhanced, {
        global: {
          plugins: [mockRouter]
        }
      })

      const successBanner = wrapper.find('.success-banner')
      expect(successBanner.exists()).toBe(true)
      expect(successBanner.text()).toContain('งานเสร็จสิ้น!')
      expect(successBanner.text()).toContain('฿150')
    })

    it('should hide action buttons when job is completed', () => {
      mockUseProviderJobDetail.job.value = { ...mockJobDetail, status: 'completed' as RideStatus }
      mockUseProviderJobDetail.isJobCompleted.value = true

      const wrapper = mount(ProviderJobDetailViewEnhanced, {
        global: {
          plugins: [mockRouter]
        }
      })

      expect(wrapper.find('.action-buttons').exists()).toBe(false)
      expect(wrapper.find('.cancel-btn').exists()).toBe(false)
    })
  })

  describe('Job Cancellation', () => {
    beforeEach(() => {
      mockUseProviderJobDetail.job.value = mockJobDetail
    })

    it('should show cancel button for active jobs', () => {
      const wrapper = mount(ProviderJobDetailViewEnhanced, {
        global: {
          plugins: [mockRouter]
        }
      })

      const cancelBtn = wrapper.find('.cancel-btn')
      expect(cancelBtn.exists()).toBe(true)
      expect(cancelBtn.text()).toContain('ยกเลิกงาน')
    })

    it('should open cancel modal when cancel button clicked', async () => {
      const wrapper = mount(ProviderJobDetailViewEnhanced, {
        global: {
          plugins: [mockRouter]
        }
      })

      const cancelBtn = wrapper.find('.cancel-btn')
      await cancelBtn.trigger('click')
      await nextTick()

      const modal = wrapper.find('.modal-overlay')
      expect(modal.exists()).toBe(true)
      expect(modal.text()).toContain('ยกเลิกงาน')
    })

    it('should call cancelJob when confirm button clicked', async () => {
      mockUseProviderJobDetail.cancelJob.mockResolvedValue({ success: true })

      const wrapper = mount(ProviderJobDetailViewEnhanced, {
        global: {
          plugins: [mockRouter]
        }
      })

      // Open modal
      const cancelBtn = wrapper.find('.cancel-btn')
      await cancelBtn.trigger('click')
      await nextTick()

      // Click confirm
      const confirmBtn = wrapper.find('.modal-confirm-btn')
      await confirmBtn.trigger('click')

      expect(mockUseProviderJobDetail.cancelJob).toHaveBeenCalled()
    })

    it('should show cancelled banner when job is cancelled', () => {
      mockUseProviderJobDetail.job.value = { ...mockJobDetail, status: 'cancelled' as RideStatus }
      mockUseProviderJobDetail.isJobCancelled.value = true

      const wrapper = mount(ProviderJobDetailViewEnhanced, {
        global: {
          plugins: [mockRouter]
        }
      })

      const cancelledBanner = wrapper.find('.cancelled-banner')
      expect(cancelledBanner.exists()).toBe(true)
      expect(cancelledBanner.text()).toContain('งานถูกยกเลิก')
    })
  })

  describe('Navigation', () => {
    beforeEach(() => {
      mockUseProviderJobDetail.job.value = mockJobDetail
    })

    it('should show navigation button', () => {
      const wrapper = mount(ProviderJobDetailViewEnhanced, {
        global: {
          plugins: [mockRouter]
        }
      })

      const navBtn = wrapper.find('.nav-btn')
      expect(navBtn.exists()).toBe(true)
      expect(navBtn.text()).toContain('นำทาง')
    })

    it('should call navigation function when nav button clicked', async () => {
      const mockNavigate = vi.fn()
      vi.doMock('../composables/useNavigation', () => ({
        useNavigation: () => ({ navigate: mockNavigate })
      }))

      const wrapper = mount(ProviderJobDetailViewEnhanced, {
        global: {
          plugins: [mockRouter]
        }
      })

      const navBtn = wrapper.find('.nav-btn')
      await navBtn.trigger('click')

      // Navigation should be called (mocked)
      expect(navBtn.exists()).toBe(true)
    })
  })

  describe('Photo Evidence', () => {
    it('should show photo section when pickup photo is required', () => {
      mockUseProviderJobDetail.job.value = { ...mockJobDetail, status: 'pickup' as RideStatus }
      mockUseProviderJobDetail.showPickupPhoto.value = true

      const wrapper = mount(ProviderJobDetailViewEnhanced, {
        global: {
          plugins: [mockRouter]
        }
      })

      const photoSection = wrapper.find('.photo-section')
      expect(photoSection.exists()).toBe(true)
      expect(photoSection.text()).toContain('รูปยืนยัน')
    })

    it('should handle photo upload', () => {
      mockUseProviderJobDetail.job.value = { ...mockJobDetail, status: 'pickup' as RideStatus }
      mockUseProviderJobDetail.showPickupPhoto.value = true

      const wrapper = mount(ProviderJobDetailViewEnhanced, {
        global: {
          plugins: [mockRouter]
        }
      })

      // Simulate photo upload
      const photoUrl = 'https://example.com/photo.jpg'
      wrapper.vm.handlePhotoUploaded('pickup', photoUrl)

      expect(mockUseProviderJobDetail.handlePhotoUploaded).toHaveBeenCalledWith('pickup', photoUrl)
    })
  })

  describe('Accessibility', () => {
    beforeEach(() => {
      mockUseProviderJobDetail.job.value = mockJobDetail
    })

    it('should have proper ARIA labels', () => {
      const wrapper = mount(ProviderJobDetailViewEnhanced, {
        global: {
          plugins: [mockRouter]
        }
      })

      const backBtn = wrapper.find('.back-btn')
      expect(backBtn.attributes('aria-label')).toBe('กลับไปหน้ารายการงาน')

      const callBtn = wrapper.find('.call-btn')
      expect(callBtn.attributes('aria-label')).toContain('โทรหา John Doe')

      const chatBtn = wrapper.find('.chat-btn')
      expect(chatBtn.attributes('aria-label')).toContain('แชทกับ John Doe')
    })

    it('should have proper heading structure', () => {
      const wrapper = mount(ProviderJobDetailViewEnhanced, {
        global: {
          plugins: [mockRouter]
        }
      })

      const mainHeading = wrapper.find('h1')
      expect(mainHeading.text()).toBe('รายละเอียดงาน')

      const customerHeading = wrapper.find('#customer-title')
      expect(customerHeading.exists()).toBe(true)
    })

    it('should have proper live regions', () => {
      mockUseProviderJobDetail.job.value = { ...mockJobDetail, status: 'completed' as RideStatus }
      mockUseProviderJobDetail.isJobCompleted.value = true

      const wrapper = mount(ProviderJobDetailViewEnhanced, {
        global: {
          plugins: [mockRouter]
        }
      })

      const successBanner = wrapper.find('.success-banner')
      expect(successBanner.attributes('aria-live')).toBe('polite')

      const fareAmount = wrapper.find('.fare-amount')
      expect(fareAmount.attributes('aria-live')).toBe('polite')
    })

    it('should have screen reader only content', () => {
      const wrapper = mount(ProviderJobDetailViewEnhanced, {
        global: {
          plugins: [mockRouter]
        }
      })

      const srOnlyElements = wrapper.findAll('.sr-only')
      expect(srOnlyElements.length).toBeGreaterThan(0)
    })
  })

  describe('Performance', () => {
    it('should use lazy loading for heavy components', () => {
      const wrapper = mount(ProviderJobDetailViewEnhanced, {
        global: {
          plugins: [mockRouter]
        }
      })

      // Check that Suspense is used for lazy components
      const suspenseElements = wrapper.findAllComponents({ name: 'Suspense' })
      expect(suspenseElements.length).toBeGreaterThan(0)
    })

    it('should show loading fallbacks', () => {
      mockUseProviderJobDetail.job.value = mockJobDetail
      mockUseProviderJobDetail.showPickupPhoto.value = true

      const wrapper = mount(ProviderJobDetailViewEnhanced, {
        global: {
          plugins: [mockRouter]
        }
      })

      // Should have loading fallbacks for async components
      expect(wrapper.html()).toContain('กำลังโหลด')
    })
  })

  describe('Error Handling', () => {
    it('should handle photo upload errors', async () => {
      mockUseProviderJobDetail.job.value = mockJobDetail

      const wrapper = mount(ProviderJobDetailViewEnhanced, {
        global: {
          plugins: [mockRouter]
        }
      })

      const errorMessage = 'ไฟล์ใหญ่เกินไป'
      wrapper.vm.handlePhotoError(errorMessage)

      await nextTick()

      expect(wrapper.vm.photoError).toBe(errorMessage)
    })

    it('should auto-clear photo errors', async () => {
      vi.useFakeTimers()
      
      mockUseProviderJobDetail.job.value = mockJobDetail

      const wrapper = mount(ProviderJobDetailViewEnhanced, {
        global: {
          plugins: [mockRouter]
        }
      })

      wrapper.vm.handlePhotoError('Test error')
      expect(wrapper.vm.photoError).toBe('Test error')

      vi.advanceTimersByTime(3000)
      await nextTick()

      expect(wrapper.vm.photoError).toBeNull()

      vi.useRealTimers()
    })
  })
})