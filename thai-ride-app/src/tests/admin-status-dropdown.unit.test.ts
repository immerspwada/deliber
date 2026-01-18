/**
 * StatusDropdown Component Unit Tests
 * ====================================
 * Tests for inline status update dropdown
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import StatusDropdown from '../admin/components/StatusDropdown.vue'
import type { OrderStatus } from '../admin/types'

describe('StatusDropdown Component', () => {
  describe('Rendering', () => {
    it('should render current status correctly', () => {
      const wrapper = mount(StatusDropdown, {
        props: {
          currentStatus: 'pending',
          orderId: 'test-order-1',
          serviceType: 'ride'
        }
      })

      expect(wrapper.find('.status-label').text()).toBe('รอรับ')
    })

    it('should show all status options except current', async () => {
      const wrapper = mount(StatusDropdown, {
        props: {
          currentStatus: 'pending',
          orderId: 'test-order-1',
          serviceType: 'ride'
        }
      })

      // Click to open dropdown
      await wrapper.find('.status-button').trigger('click')
      await wrapper.vm.$nextTick()

      const items = wrapper.findAll('.dropdown-item')
      expect(items.length).toBe(4) // 5 total - 1 current = 4

      // Should not include current status
      const labels = items.map(item => item.text())
      expect(labels).not.toContain('รอรับ')
      expect(labels).toContain('จับคู่แล้ว')
      expect(labels).toContain('กำลังดำเนินการ')
      expect(labels).toContain('เสร็จสิ้น')
      expect(labels).toContain('ยกเลิก')
    })

    it('should apply correct colors to status', () => {
      const wrapper = mount(StatusDropdown, {
        props: {
          currentStatus: 'completed',
          orderId: 'test-order-1',
          serviceType: 'ride'
        }
      })

      const button = wrapper.find('.status-button')
      const style = button.attributes('style')
      
      // Completed status should have green color
      expect(style).toContain('color: rgb(16, 185, 129)')
    })
  })

  describe('Interactions', () => {
    it('should toggle dropdown on click', async () => {
      const wrapper = mount(StatusDropdown, {
        props: {
          currentStatus: 'pending',
          orderId: 'test-order-1',
          serviceType: 'ride'
        }
      })

      // Initially closed
      expect(wrapper.find('.dropdown-menu').exists()).toBe(false)

      // Click to open
      await wrapper.find('.status-button').trigger('click')
      await wrapper.vm.$nextTick()
      expect(wrapper.find('.dropdown-menu').exists()).toBe(true)

      // Click again to close
      await wrapper.find('.status-button').trigger('click')
      await wrapper.vm.$nextTick()
      expect(wrapper.find('.dropdown-menu').exists()).toBe(false)
    })

    it('should emit update event when selecting new status', async () => {
      const wrapper = mount(StatusDropdown, {
        props: {
          currentStatus: 'pending',
          orderId: 'test-order-1',
          serviceType: 'ride'
        }
      })

      // Open dropdown
      await wrapper.find('.status-button').trigger('click')
      await wrapper.vm.$nextTick()

      // Click on "matched" option
      const items = wrapper.findAll('.dropdown-item')
      const matchedItem = items.find(item => item.text().includes('จับคู่แล้ว'))
      
      expect(matchedItem).toBeDefined()
      await matchedItem!.trigger('click')

      // Should emit update event
      expect(wrapper.emitted('update')).toBeTruthy()
      expect(wrapper.emitted('update')![0]).toEqual(['matched'])
    })

    it('should close dropdown after selecting status', async () => {
      const wrapper = mount(StatusDropdown, {
        props: {
          currentStatus: 'pending',
          orderId: 'test-order-1',
          serviceType: 'ride'
        }
      })

      // Open dropdown
      await wrapper.find('.status-button').trigger('click')
      await wrapper.vm.$nextTick()
      expect(wrapper.find('.dropdown-menu').exists()).toBe(true)

      // Select status
      const items = wrapper.findAll('.dropdown-item')
      await items[0].trigger('click')
      await wrapper.vm.$nextTick()

      // Should be closed
      expect(wrapper.find('.dropdown-menu').exists()).toBe(false)
    })

    it('should show loading state when updating', async () => {
      const wrapper = mount(StatusDropdown, {
        props: {
          currentStatus: 'pending',
          orderId: 'test-order-1',
          serviceType: 'ride'
        }
      })

      // Open and select
      await wrapper.find('.status-button').trigger('click')
      await wrapper.vm.$nextTick()
      
      const items = wrapper.findAll('.dropdown-item')
      await items[0].trigger('click')
      await wrapper.vm.$nextTick()

      // Should show spinner
      expect(wrapper.find('.spinner-icon').exists()).toBe(true)
      expect(wrapper.find('.dropdown-icon').exists()).toBe(false)
    })

    it('should be disabled when disabled prop is true', async () => {
      const wrapper = mount(StatusDropdown, {
        props: {
          currentStatus: 'pending',
          orderId: 'test-order-1',
          serviceType: 'ride',
          disabled: true
        }
      })

      const button = wrapper.find('.status-button')
      expect(button.attributes('disabled')).toBeDefined()

      // Click should not open dropdown
      await button.trigger('click')
      await wrapper.vm.$nextTick()
      expect(wrapper.find('.dropdown-menu').exists()).toBe(false)
    })
  })

  describe('Status Options', () => {
    const statusTests: Array<{ status: OrderStatus; label: string; color: string }> = [
      { status: 'pending', label: 'รอรับ', color: '#F59E0B' },
      { status: 'matched', label: 'จับคู่แล้ว', color: '#3B82F6' },
      { status: 'in_progress', label: 'กำลังดำเนินการ', color: '#8B5CF6' },
      { status: 'completed', label: 'เสร็จสิ้น', color: '#10B981' },
      { status: 'cancelled', label: 'ยกเลิก', color: '#EF4444' },
    ]

    statusTests.forEach(({ status, label, color }) => {
      it(`should display ${status} status correctly`, () => {
        const wrapper = mount(StatusDropdown, {
          props: {
            currentStatus: status,
            orderId: 'test-order-1',
            serviceType: 'ride'
          }
        })

        expect(wrapper.find('.status-label').text()).toBe(label)
        
        const style = wrapper.find('.status-button').attributes('style')
        // Convert hex to rgb for comparison
        const rgb = color.match(/\w\w/g)?.map(x => parseInt(x, 16)).join(', ')
        expect(style).toContain(`color: rgb(${rgb})`)
      })
    })
  })

  describe('Service Type Support', () => {
    const serviceTypes = ['ride', 'delivery', 'shopping', 'queue', 'moving', 'laundry']

    serviceTypes.forEach(serviceType => {
      it(`should work with ${serviceType} service type`, () => {
        const wrapper = mount(StatusDropdown, {
          props: {
            currentStatus: 'pending',
            orderId: 'test-order-1',
            serviceType
          }
        })

        expect(wrapper.exists()).toBe(true)
        expect(wrapper.find('.status-label').text()).toBe('รอรับ')
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle rapid clicks gracefully', async () => {
      const wrapper = mount(StatusDropdown, {
        props: {
          currentStatus: 'pending',
          orderId: 'test-order-1',
          serviceType: 'ride'
        }
      })

      // Rapid clicks
      await wrapper.find('.status-button').trigger('click')
      await wrapper.find('.status-button').trigger('click')
      await wrapper.find('.status-button').trigger('click')
      await wrapper.vm.$nextTick()

      // Should still work
      expect(wrapper.find('.dropdown-menu').exists()).toBe(true)
    })

    it('should not emit update for same status', async () => {
      const wrapper = mount(StatusDropdown, {
        props: {
          currentStatus: 'pending',
          orderId: 'test-order-1',
          serviceType: 'ride'
        }
      })

      // Try to select current status (shouldn't be in dropdown)
      await wrapper.find('.status-button').trigger('click')
      await wrapper.vm.$nextTick()

      const items = wrapper.findAll('.dropdown-item')
      const pendingItem = items.find(item => item.text().includes('รอรับ'))
      
      // Should not exist in dropdown
      expect(pendingItem).toBeUndefined()
    })

    it('should handle empty order ID', () => {
      const wrapper = mount(StatusDropdown, {
        props: {
          currentStatus: 'pending',
          orderId: '',
          serviceType: 'ride'
        }
      })

      expect(wrapper.exists()).toBe(true)
    })
  })
})
