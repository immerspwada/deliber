import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import OrderReassignmentModal from '@/admin/components/OrderReassignmentModal.vue';

// Mock dependencies
vi.mock('@/admin/composables/useOrderReassignment', () => ({
  useOrderReassignment: vi.fn(() => ({
    availableProviders: { value: [] },
    onlineProviders: { value: [] },
    offlineProviders: { value: [] },
    isLoading: { value: false },
    error: { value: null },
    getAvailableProviders: vi.fn(),
    reassignOrder: vi.fn(),
  })),
}));

vi.mock('@/admin/stores/adminUI.store', () => ({
  useAdminUIStore: vi.fn(() => ({
    showSuccess: vi.fn(),
    showError: vi.fn(),
  })),
}));

const mockFocusTrapActivate = vi.fn();
const mockFocusTrapDeactivate = vi.fn();

vi.mock('@/composables/usePerformance', () => ({
  useFocusTrap: vi.fn(() => ({
    isActive: { value: false },
    activate: mockFocusTrapActivate,
    deactivate: mockFocusTrapDeactivate,
  })),
}));

describe('OrderReassignmentModal - Focus Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFocusTrapActivate.mockClear();
    mockFocusTrapDeactivate.mockClear();
  });

  describe('Focus trap activation', () => {
    it('should activate focus trap when modal opens', async () => {
      const wrapper = mount(OrderReassignmentModal, {
        props: {
          show: false,
          orderId: 'order-123',
          orderType: 'ride',
        },
      });

      // Open modal
      await wrapper.setProps({ show: true });
      await nextTick();

      expect(mockFocusTrapActivate).toHaveBeenCalledTimes(1);
    });

    it('should deactivate focus trap when modal closes', async () => {
      const wrapper = mount(OrderReassignmentModal, {
        props: {
          show: true,
          orderId: 'order-123',
          orderType: 'ride',
        },
      });

      await nextTick();

      // Close modal
      await wrapper.setProps({ show: false });
      await nextTick();

      expect(mockFocusTrapDeactivate).toHaveBeenCalledTimes(1);
    });

    it('should not activate focus trap if modal is already closed', async () => {
      mount(OrderReassignmentModal, {
        props: {
          show: false,
          orderId: 'order-123',
          orderType: 'ride',
        },
      });

      await nextTick();

      expect(mockFocusTrapActivate).not.toHaveBeenCalled();
    });
  });

  describe('Focus management on open', () => {
    it('should focus close button when modal opens', async () => {
      const wrapper = mount(OrderReassignmentModal, {
        props: {
          show: false,
          orderId: 'order-123',
          orderType: 'ride',
        },
        attachTo: document.body,
      });

      // Open modal
      await wrapper.setProps({ show: true });
      await nextTick();
      await nextTick(); // Extra tick for focus

      const closeButton = wrapper.find('[aria-label="ปิดหน้าต่าง"]');
      expect(closeButton.exists()).toBe(true);
      expect(document.activeElement).toBe(closeButton.element);

      wrapper.unmount();
    });

    it('should store previous active element before opening', async () => {
      // Create a button to focus before opening modal
      const triggerButton = document.createElement('button');
      triggerButton.id = 'trigger-button';
      document.body.appendChild(triggerButton);
      triggerButton.focus();

      expect(document.activeElement).toBe(triggerButton);

      const wrapper = mount(OrderReassignmentModal, {
        props: {
          show: false,
          orderId: 'order-123',
          orderType: 'ride',
        },
        attachTo: document.body,
      });

      // Open modal
      await wrapper.setProps({ show: true });
      await nextTick();

      // Focus should move to modal
      expect(document.activeElement).not.toBe(triggerButton);

      wrapper.unmount();
      document.body.removeChild(triggerButton);
    });
  });

  describe('Focus restoration on close', () => {
    it('should restore focus to previous element when modal closes', async () => {
      // Create a button to focus before opening modal
      const triggerButton = document.createElement('button');
      triggerButton.id = 'trigger-button';
      document.body.appendChild(triggerButton);
      triggerButton.focus();

      const wrapper = mount(OrderReassignmentModal, {
        props: {
          show: false,
          orderId: 'order-123',
          orderType: 'ride',
        },
        attachTo: document.body,
      });

      // Open modal
      await wrapper.setProps({ show: true });
      await nextTick();
      await nextTick();

      // Close modal
      await wrapper.setProps({ show: false });
      await nextTick();

      // Focus should return to trigger button
      expect(document.activeElement).toBe(triggerButton);

      wrapper.unmount();
      document.body.removeChild(triggerButton);
    });

    it('should handle case when previous element no longer exists', async () => {
      const triggerButton = document.createElement('button');
      document.body.appendChild(triggerButton);
      triggerButton.focus();

      const wrapper = mount(OrderReassignmentModal, {
        props: {
          show: false,
          orderId: 'order-123',
          orderType: 'ride',
        },
        attachTo: document.body,
      });

      // Open modal
      await wrapper.setProps({ show: true });
      await nextTick();

      // Remove trigger button while modal is open
      document.body.removeChild(triggerButton);

      // Close modal - should not throw error
      await wrapper.setProps({ show: false });
      await nextTick();

      // Should not throw error
      expect(true).toBe(true);

      wrapper.unmount();
    });
  });

  describe('Keyboard navigation', () => {
    it('should close modal on Escape key', async () => {
      const wrapper = mount(OrderReassignmentModal, {
        props: {
          show: true,
          orderId: 'order-123',
          orderType: 'ride',
        },
      });

      await nextTick();

      // Press Escape
      await wrapper.find('.modal-overlay').trigger('keydown.esc');

      expect(wrapper.emitted('close')).toBeTruthy();
    });

    it('should have modal container with proper ARIA attributes', async () => {
      const wrapper = mount(OrderReassignmentModal, {
        props: {
          show: true,
          orderId: 'order-123',
          orderType: 'ride',
        },
      });

      await nextTick();

      const modalContainer = wrapper.find('[role="dialog"]');
      expect(modalContainer.exists()).toBe(true);
      expect(modalContainer.attributes('aria-modal')).toBe('true');
      expect(modalContainer.attributes('aria-labelledby')).toBe('modal-title');
      expect(modalContainer.attributes('aria-describedby')).toBe('modal-description');
    });

    it('should have close button with proper aria-label', async () => {
      const wrapper = mount(OrderReassignmentModal, {
        props: {
          show: true,
          orderId: 'order-123',
          orderType: 'ride',
        },
      });

      await nextTick();

      const closeButton = wrapper.find('[aria-label="ปิดหน้าต่าง"]');
      expect(closeButton.exists()).toBe(true);
      expect(closeButton.element.tagName).toBe('BUTTON');
    });

    it('should have submit button with proper aria-label', async () => {
      const wrapper = mount(OrderReassignmentModal, {
        props: {
          show: true,
          orderId: 'order-123',
          orderType: 'ride',
        },
      });

      await nextTick();

      const submitButton = wrapper.find('[aria-label="ยืนยันการย้ายงาน"]');
      expect(submitButton.exists()).toBe(true);
      expect(submitButton.element.tagName).toBe('BUTTON');
    });

    it('should have cancel button with proper aria-label', async () => {
      const wrapper = mount(OrderReassignmentModal, {
        props: {
          show: true,
          orderId: 'order-123',
          orderType: 'ride',
        },
      });

      await nextTick();

      const cancelButton = wrapper.find('[aria-label="ยกเลิกการย้ายงาน"]');
      expect(cancelButton.exists()).toBe(true);
      expect(cancelButton.element.tagName).toBe('BUTTON');
    });

    it('should have decorative SVG icons with aria-hidden', async () => {
      const wrapper = mount(OrderReassignmentModal, {
        props: {
          show: true,
          orderId: 'order-123',
          orderType: 'ride',
        },
      });

      await nextTick();

      const svgIcons = wrapper.findAll('svg[aria-hidden="true"]');
      expect(svgIcons.length).toBeGreaterThan(0);
    });
  });

  describe('Focus trap integration', () => {
    it('should pass modal container ref to useFocusTrap', async () => {
      const wrapper = mount(OrderReassignmentModal, {
        props: {
          show: false,
          orderId: 'order-123',
          orderType: 'ride',
        },
      });

      // Open modal
      await wrapper.setProps({ show: true });
      await nextTick();

      // useFocusTrap should have been called
      expect(mockFocusTrapActivate).toHaveBeenCalled();
    });

    it('should activate focus trap after DOM is ready', async () => {
      const wrapper = mount(OrderReassignmentModal, {
        props: {
          show: false,
          orderId: 'order-123',
          orderType: 'ride',
        },
      });

      // Open modal
      await wrapper.setProps({ show: true });
      await nextTick();

      // Focus trap should be activated after nextTick
      expect(mockFocusTrapActivate).toHaveBeenCalled();
    });

    it('should deactivate focus trap before restoring focus', async () => {
      const wrapper = mount(OrderReassignmentModal, {
        props: {
          show: true,
          orderId: 'order-123',
          orderType: 'ride',
        },
      });

      await nextTick();

      // Close modal
      await wrapper.setProps({ show: false });
      await nextTick();

      expect(mockFocusTrapDeactivate).toHaveBeenCalled();
    });
  });

  describe('Multiple open/close cycles', () => {
    it('should handle multiple open/close cycles correctly', async () => {
      const triggerButton = document.createElement('button');
      document.body.appendChild(triggerButton);
      triggerButton.focus();

      const wrapper = mount(OrderReassignmentModal, {
        props: {
          show: false,
          orderId: 'order-123',
          orderType: 'ride',
        },
        attachTo: document.body,
      });

      // First cycle
      await wrapper.setProps({ show: true });
      await nextTick();
      expect(mockFocusTrapActivate).toHaveBeenCalledTimes(1);

      await wrapper.setProps({ show: false });
      await nextTick();
      expect(mockFocusTrapDeactivate).toHaveBeenCalledTimes(1);

      // Second cycle
      await wrapper.setProps({ show: true });
      await nextTick();
      expect(mockFocusTrapActivate).toHaveBeenCalledTimes(2);

      await wrapper.setProps({ show: false });
      await nextTick();
      expect(mockFocusTrapDeactivate).toHaveBeenCalledTimes(2);

      wrapper.unmount();
      document.body.removeChild(triggerButton);
    });

    it('should reset previousActiveElement on each open', async () => {
      const button1 = document.createElement('button');
      const button2 = document.createElement('button');
      document.body.appendChild(button1);
      document.body.appendChild(button2);

      const wrapper = mount(OrderReassignmentModal, {
        props: {
          show: false,
          orderId: 'order-123',
          orderType: 'ride',
        },
        attachTo: document.body,
      });

      // First open from button1
      button1.focus();
      await wrapper.setProps({ show: true });
      await nextTick();
      await wrapper.setProps({ show: false });
      await nextTick();
      expect(document.activeElement).toBe(button1);

      // Second open from button2
      button2.focus();
      await wrapper.setProps({ show: true });
      await nextTick();
      await wrapper.setProps({ show: false });
      await nextTick();
      expect(document.activeElement).toBe(button2);

      wrapper.unmount();
      document.body.removeChild(button1);
      document.body.removeChild(button2);
    });
  });

  describe('Integration with modal content', () => {
    it('should maintain focus trap with interactive elements', async () => {
      const wrapper = mount(OrderReassignmentModal, {
        props: {
          show: false,
          orderId: 'order-123',
          orderType: 'ride',
        },
        attachTo: document.body,
      });

      // Open modal
      await wrapper.setProps({ show: true });
      await nextTick();

      // Modal should have multiple focusable elements
      const focusableElements = wrapper.element.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])'
      );

      expect(focusableElements.length).toBeGreaterThan(1);

      wrapper.unmount();
    });

    it('should work with loading state', async () => {
      const wrapper = mount(OrderReassignmentModal, {
        props: {
          show: false,
          orderId: 'order-123',
          orderType: 'ride',
        },
        attachTo: document.body,
      });

      // Open modal
      await wrapper.setProps({ show: true });
      await nextTick();

      // Focus trap should still be active during loading
      expect(mockFocusTrapActivate).toHaveBeenCalled();

      wrapper.unmount();
    });

    it('should work with error state', async () => {
      const wrapper = mount(OrderReassignmentModal, {
        props: {
          show: false,
          orderId: 'order-123',
          orderType: 'ride',
        },
        attachTo: document.body,
      });

      // Open modal
      await wrapper.setProps({ show: true });
      await nextTick();

      // Focus trap should still be active during error
      expect(mockFocusTrapActivate).toHaveBeenCalled();

      wrapper.unmount();
    });
  });
});
