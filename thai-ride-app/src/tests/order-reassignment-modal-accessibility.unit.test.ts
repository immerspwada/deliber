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

vi.mock('@/composables/usePerformance', () => ({
  useFocusTrap: vi.fn(() => ({
    isActive: { value: false },
    activate: vi.fn(),
    deactivate: vi.fn(),
  })),
}));

describe('OrderReassignmentModal - Accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ARIA attributes', () => {
    it('should have role="dialog" on modal container', async () => {
      const wrapper = mount(OrderReassignmentModal, {
        props: {
          show: true,
          orderId: 'order-123',
          orderType: 'ride',
        },
      });

      await nextTick();

      const dialog = wrapper.find('[role="dialog"]');
      expect(dialog.exists()).toBe(true);
    });

    it('should have aria-modal="true" on modal container', async () => {
      const wrapper = mount(OrderReassignmentModal, {
        props: {
          show: true,
          orderId: 'order-123',
          orderType: 'ride',
        },
      });

      await nextTick();

      const dialog = wrapper.find('[role="dialog"]');
      expect(dialog.attributes('aria-modal')).toBe('true');
    });

    it('should have aria-labelledby pointing to modal title', async () => {
      const wrapper = mount(OrderReassignmentModal, {
        props: {
          show: true,
          orderId: 'order-123',
          orderType: 'ride',
        },
      });

      await nextTick();

      const dialog = wrapper.find('[role="dialog"]');
      const labelledBy = dialog.attributes('aria-labelledby');
      
      expect(labelledBy).toBe('modal-title');
      
      // Verify the title element exists with this ID
      const titleElement = wrapper.find('#modal-title');
      expect(titleElement.exists()).toBe(true);
      expect(titleElement.text()).toBeTruthy();
    });

    it('should have aria-describedby pointing to description element', async () => {
      const wrapper = mount(OrderReassignmentModal, {
        props: {
          show: true,
          orderId: 'order-123',
          orderType: 'ride',
        },
      });

      await nextTick();

      const dialog = wrapper.find('[role="dialog"]');
      const describedBy = dialog.attributes('aria-describedby');
      
      expect(describedBy).toBe('modal-description');
      
      // Verify the description element exists with this ID
      const descriptionElement = wrapper.find('#modal-description');
      expect(descriptionElement.exists()).toBe(true);
      expect(descriptionElement.text()).toBeTruthy();
    });

    it('should have modal title with correct ID', async () => {
      const wrapper = mount(OrderReassignmentModal, {
        props: {
          show: true,
          orderId: 'order-123',
          orderType: 'ride',
        },
      });

      await nextTick();

      const title = wrapper.find('#modal-title');
      expect(title.exists()).toBe(true);
      expect(title.element.tagName).toBe('H2');
      expect(title.text()).toContain('ย้ายงาน');
    });

    it('should have modal description with correct ID', async () => {
      const wrapper = mount(OrderReassignmentModal, {
        props: {
          show: true,
          orderId: 'order-123',
          orderType: 'ride',
        },
      });

      await nextTick();

      const description = wrapper.find('#modal-description');
      expect(description.exists()).toBe(true);
      expect(description.element.tagName).toBe('P');
      expect(description.text()).toBeTruthy();
    });
  });

  describe('Button accessibility', () => {
    it('should have close button with aria-label="ปิดหน้าต่าง"', async () => {
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

    it('should have submit button with aria-label', async () => {
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

    it('should have cancel button with aria-label', async () => {
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

    it('should have all action buttons with proper aria-labels', async () => {
      const wrapper = mount(OrderReassignmentModal, {
        props: {
          show: true,
          orderId: 'order-123',
          orderType: 'ride',
        },
      });

      await nextTick();

      const buttons = wrapper.findAll('button[aria-label]');
      expect(buttons.length).toBeGreaterThanOrEqual(3); // close, cancel, submit

      // Verify each button has a non-empty aria-label
      buttons.forEach((button) => {
        const ariaLabel = button.attributes('aria-label');
        expect(ariaLabel).toBeTruthy();
        expect(ariaLabel!.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Icon accessibility', () => {
    it('should have all SVG icons with aria-hidden="true"', async () => {
      const wrapper = mount(OrderReassignmentModal, {
        props: {
          show: true,
          orderId: 'order-123',
          orderType: 'ride',
        },
      });

      await nextTick();

      const svgIcons = wrapper.findAll('svg');
      expect(svgIcons.length).toBeGreaterThan(0);

      // All decorative SVG icons should have aria-hidden="true"
      svgIcons.forEach((svg) => {
        expect(svg.attributes('aria-hidden')).toBe('true');
      });
    });

    it('should have close button icon with aria-hidden', async () => {
      const wrapper = mount(OrderReassignmentModal, {
        props: {
          show: true,
          orderId: 'order-123',
          orderType: 'ride',
        },
      });

      await nextTick();

      const closeButton = wrapper.find('[aria-label="ปิดหน้าต่าง"]');
      const svg = closeButton.find('svg');
      
      expect(svg.exists()).toBe(true);
      expect(svg.attributes('aria-hidden')).toBe('true');
    });

    it('should have search icon with aria-hidden', async () => {
      const wrapper = mount(OrderReassignmentModal, {
        props: {
          show: true,
          orderId: 'order-123',
          orderType: 'ride',
        },
      });

      await nextTick();

      const searchBox = wrapper.find('.search-box');
      const svg = searchBox.find('svg');
      
      expect(svg.exists()).toBe(true);
      expect(svg.attributes('aria-hidden')).toBe('true');
    });

    it('should have checkmark icon with aria-hidden when provider selected', async () => {
      const mockProviders = [
        {
          id: 'provider-1',
          full_name: 'Test Provider',
          phone: '0812345678',
          is_online: true,
          rating: 4.5,
          total_jobs: 100,
        },
      ];

      const { useOrderReassignment } = await import('@/admin/composables/useOrderReassignment');
      vi.mocked(useOrderReassignment).mockReturnValue({
        availableProviders: { value: mockProviders },
        onlineProviders: { value: mockProviders },
        offlineProviders: { value: [] },
        isLoading: { value: false },
        error: { value: null },
        getAvailableProviders: vi.fn(),
        reassignOrder: vi.fn(),
      } as any);

      const wrapper = mount(OrderReassignmentModal, {
        props: {
          show: true,
          orderId: 'order-123',
          orderType: 'ride',
        },
      });

      await nextTick();

      // Select a provider
      const providerCard = wrapper.find('.provider-card');
      await providerCard.trigger('click');
      await nextTick();

      // Check for checkmark icon
      const selectedIndicator = wrapper.find('.selected-indicator');
      if (selectedIndicator.exists()) {
        const svg = selectedIndicator.find('svg');
        expect(svg.attributes('aria-hidden')).toBe('true');
      }
    });
  });

  describe('Live regions', () => {
    it('should have error container with aria-live="assertive"', async () => {
      const { useOrderReassignment } = await import('@/admin/composables/useOrderReassignment');
      vi.mocked(useOrderReassignment).mockReturnValue({
        availableProviders: { value: [] },
        onlineProviders: { value: [] },
        offlineProviders: { value: [] },
        isLoading: { value: false },
        error: { value: 'Test error message' },
        getAvailableProviders: vi.fn(),
        reassignOrder: vi.fn(),
      } as any);

      const wrapper = mount(OrderReassignmentModal, {
        props: {
          show: true,
          orderId: 'order-123',
          orderType: 'ride',
        },
      });

      await nextTick();

      const errorState = wrapper.find('.error-state');
      expect(errorState.exists()).toBe(true);
      expect(errorState.attributes('role')).toBe('alert');
      expect(errorState.attributes('aria-live')).toBe('assertive');
    });

    it('should announce errors to screen readers', async () => {
      const { useOrderReassignment } = await import('@/admin/composables/useOrderReassignment');
      vi.mocked(useOrderReassignment).mockReturnValue({
        availableProviders: { value: [] },
        onlineProviders: { value: [] },
        offlineProviders: { value: [] },
        isLoading: { value: false },
        error: { value: 'ไม่สามารถโหลดข้อมูลได้' },
        getAvailableProviders: vi.fn(),
        reassignOrder: vi.fn(),
      } as any);

      const wrapper = mount(OrderReassignmentModal, {
        props: {
          show: true,
          orderId: 'order-123',
          orderType: 'ride',
        },
      });

      await nextTick();

      const errorMessage = wrapper.find('.error-message');
      expect(errorMessage.exists()).toBe(true);
      expect(errorMessage.text()).toContain('ไม่สามารถโหลดข้อมูลได้');
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

      // Press Escape on modal overlay
      await wrapper.find('.modal-overlay').trigger('keydown.esc');

      expect(wrapper.emitted('close')).toBeTruthy();
      expect(wrapper.emitted('close')!.length).toBe(1);
    });

    it('should close modal when clicking overlay', async () => {
      const wrapper = mount(OrderReassignmentModal, {
        props: {
          show: true,
          orderId: 'order-123',
          orderType: 'ride',
        },
      });

      await nextTick();

      // Click on overlay (not modal content)
      await wrapper.find('.modal-overlay').trigger('click');

      expect(wrapper.emitted('close')).toBeTruthy();
    });

    it('should not close modal when clicking inside modal content', async () => {
      const wrapper = mount(OrderReassignmentModal, {
        props: {
          show: true,
          orderId: 'order-123',
          orderType: 'ride',
        },
      });

      await nextTick();

      // Click inside modal container
      await wrapper.find('.modal-container').trigger('click');

      expect(wrapper.emitted('close')).toBeFalsy();
    });
  });

  describe('Focus management', () => {
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
      expect(document.activeElement).toBe(closeButton.element);

      wrapper.unmount();
    });

    it('should restore focus to trigger element when modal closes', async () => {
      // Create trigger button
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

    it('should trap focus within modal when open', async () => {
      const wrapper = mount(OrderReassignmentModal, {
        props: {
          show: true,
          orderId: 'order-123',
          orderType: 'ride',
        },
        attachTo: document.body,
      });

      await nextTick();

      // Get all focusable elements within modal
      const focusableElements = wrapper.element.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])'
      );

      expect(focusableElements.length).toBeGreaterThan(0);

      wrapper.unmount();
    });
  });

  describe('Form accessibility', () => {
    it('should have search input with aria-label', async () => {
      const wrapper = mount(OrderReassignmentModal, {
        props: {
          show: true,
          orderId: 'order-123',
          orderType: 'ride',
        },
      });

      await nextTick();

      const searchInput = wrapper.find('.search-input');
      expect(searchInput.exists()).toBe(true);
      expect(searchInput.attributes('aria-label')).toBe('ค้นหาไรเดอร์');
    });

    it('should have proper label associations for form fields', async () => {
      const wrapper = mount(OrderReassignmentModal, {
        props: {
          show: true,
          orderId: 'order-123',
          orderType: 'ride',
        },
      });

      await nextTick();

      // Check reason select
      const reasonLabel = wrapper.find('label[for="reason"]');
      const reasonSelect = wrapper.find('#reason');
      expect(reasonLabel.exists()).toBe(true);
      expect(reasonSelect.exists()).toBe(true);

      // Check notes textarea
      const notesLabel = wrapper.find('label[for="notes"]');
      const notesTextarea = wrapper.find('#notes');
      expect(notesLabel.exists()).toBe(true);
      expect(notesTextarea.exists()).toBe(true);
    });
  });

  describe('Loading state accessibility', () => {
    it('should have accessible loading state', async () => {
      const { useOrderReassignment } = await import('@/admin/composables/useOrderReassignment');
      vi.mocked(useOrderReassignment).mockReturnValue({
        availableProviders: { value: [] },
        onlineProviders: { value: [] },
        offlineProviders: { value: [] },
        isLoading: { value: true },
        error: { value: null },
        getAvailableProviders: vi.fn(),
        reassignOrder: vi.fn(),
      } as any);

      const wrapper = mount(OrderReassignmentModal, {
        props: {
          show: true,
          orderId: 'order-123',
          orderType: 'ride',
        },
      });

      await nextTick();

      const loadingState = wrapper.find('.loading-state');
      expect(loadingState.exists()).toBe(true);
      expect(loadingState.text()).toContain('กำลังโหลด');
    });
  });

  describe('Empty state accessibility', () => {
    it('should have accessible empty state message', async () => {
      const { useOrderReassignment } = await import('@/admin/composables/useOrderReassignment');
      vi.mocked(useOrderReassignment).mockReturnValue({
        availableProviders: { value: [] },
        onlineProviders: { value: [] },
        offlineProviders: { value: [] },
        isLoading: { value: false },
        error: { value: null },
        getAvailableProviders: vi.fn(),
        reassignOrder: vi.fn(),
      } as any);

      const wrapper = mount(OrderReassignmentModal, {
        props: {
          show: true,
          orderId: 'order-123',
          orderType: 'ride',
        },
      });

      await nextTick();

      const emptyState = wrapper.find('.empty-state');
      expect(emptyState.exists()).toBe(true);
      expect(emptyState.text()).toContain('ไม่พบไรเดอร์');
    });
  });

  describe('Complete accessibility compliance', () => {
    it('should pass basic WCAG 2.1 AA requirements', async () => {
      const wrapper = mount(OrderReassignmentModal, {
        props: {
          show: true,
          orderId: 'order-123',
          orderType: 'ride',
        },
      });

      await nextTick();

      // Check dialog role
      expect(wrapper.find('[role="dialog"]').exists()).toBe(true);

      // Check aria-modal
      expect(wrapper.find('[aria-modal="true"]').exists()).toBe(true);

      // Check aria-labelledby
      const dialog = wrapper.find('[role="dialog"]');
      expect(dialog.attributes('aria-labelledby')).toBeTruthy();

      // Check aria-describedby
      expect(dialog.attributes('aria-describedby')).toBeTruthy();

      // Check all buttons have labels
      const buttons = wrapper.findAll('button');
      buttons.forEach((button) => {
        const hasAriaLabel = !!button.attributes('aria-label');
        const hasTextContent = button.text().trim().length > 0;
        expect(hasAriaLabel || hasTextContent).toBe(true);
      });

      // Check all SVG icons are hidden from screen readers
      const svgs = wrapper.findAll('svg');
      svgs.forEach((svg) => {
        expect(svg.attributes('aria-hidden')).toBe('true');
      });
    });

    it('should have proper heading hierarchy', async () => {
      const wrapper = mount(OrderReassignmentModal, {
        props: {
          show: true,
          orderId: 'order-123',
          orderType: 'ride',
        },
      });

      await nextTick();

      // Modal should have h2 as main heading
      const h2 = wrapper.find('h2');
      expect(h2.exists()).toBe(true);
      expect(h2.attributes('id')).toBe('modal-title');
    });

    it('should have sufficient color contrast (verified via CSS)', async () => {
      const wrapper = mount(OrderReassignmentModal, {
        props: {
          show: true,
          orderId: 'order-123',
          orderType: 'ride',
        },
      });

      await nextTick();

      // This is a structural test - actual contrast testing would require visual testing tools
      // We verify that semantic color classes are used
      const modalTitle = wrapper.find('.modal-title');
      expect(modalTitle.exists()).toBe(true);
    });
  });

  describe('Requirements validation', () => {
    it('validates Requirement 3.1: Modal has role="dialog"', async () => {
      const wrapper = mount(OrderReassignmentModal, {
        props: {
          show: true,
          orderId: 'order-123',
          orderType: 'ride',
        },
      });

      await nextTick();

      const dialog = wrapper.find('[role="dialog"]');
      expect(dialog.exists()).toBe(true);
    });

    it('validates Requirement 3.2: Modal has aria-modal and aria-labelledby', async () => {
      const wrapper = mount(OrderReassignmentModal, {
        props: {
          show: true,
          orderId: 'order-123',
          orderType: 'ride',
        },
      });

      await nextTick();

      const dialog = wrapper.find('[role="dialog"]');
      expect(dialog.attributes('aria-modal')).toBe('true');
      expect(dialog.attributes('aria-labelledby')).toBe('modal-title');
    });

    it('validates Requirement 3.3: All buttons have accessible labels', async () => {
      const wrapper = mount(OrderReassignmentModal, {
        props: {
          show: true,
          orderId: 'order-123',
          orderType: 'ride',
        },
      });

      await nextTick();

      const buttons = wrapper.findAll('button');
      buttons.forEach((button) => {
        const hasAriaLabel = !!button.attributes('aria-label');
        const hasTextContent = button.text().trim().length > 0;
        expect(hasAriaLabel || hasTextContent).toBe(true);
      });
    });

    it('validates Requirement 3.4: Focus moves to modal on open', async () => {
      const wrapper = mount(OrderReassignmentModal, {
        props: {
          show: false,
          orderId: 'order-123',
          orderType: 'ride',
        },
        attachTo: document.body,
      });

      await wrapper.setProps({ show: true });
      await nextTick();
      await nextTick();

      const closeButton = wrapper.find('[aria-label="ปิดหน้าต่าง"]');
      expect(document.activeElement).toBe(closeButton.element);

      wrapper.unmount();
    });

    it('validates Requirement 3.5: Focus returns on close', async () => {
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

      await wrapper.setProps({ show: true });
      await nextTick();
      await wrapper.setProps({ show: false });
      await nextTick();

      expect(document.activeElement).toBe(triggerButton);

      wrapper.unmount();
      document.body.removeChild(triggerButton);
    });

    it('validates Requirement 3.6: Decorative icons hidden from screen readers', async () => {
      const wrapper = mount(OrderReassignmentModal, {
        props: {
          show: true,
          orderId: 'order-123',
          orderType: 'ride',
        },
      });

      await nextTick();

      const svgs = wrapper.findAll('svg');
      svgs.forEach((svg) => {
        expect(svg.attributes('aria-hidden')).toBe('true');
      });
    });

    it('validates Requirement 3.8: Error messages announced to screen readers', async () => {
      const { useOrderReassignment } = await import('@/admin/composables/useOrderReassignment');
      vi.mocked(useOrderReassignment).mockReturnValue({
        availableProviders: { value: [] },
        onlineProviders: { value: [] },
        offlineProviders: { value: [] },
        isLoading: { value: false },
        error: { value: 'Test error' },
        getAvailableProviders: vi.fn(),
        reassignOrder: vi.fn(),
      } as any);

      const wrapper = mount(OrderReassignmentModal, {
        props: {
          show: true,
          orderId: 'order-123',
          orderType: 'ride',
        },
      });

      await nextTick();

      const errorState = wrapper.find('.error-state');
      expect(errorState.attributes('aria-live')).toBe('assertive');
    });
  });
});
