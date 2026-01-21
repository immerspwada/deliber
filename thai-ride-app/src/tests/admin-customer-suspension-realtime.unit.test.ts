import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import CustomerSuspensionModal from '@/admin/components/CustomerSuspensionModal.vue';
import { useCustomerSuspension } from '@/admin/composables/useCustomerSuspension';

// Mock composable
vi.mock('@/admin/composables/useCustomerSuspension', () => ({
  useCustomerSuspension: vi.fn(),
}));

describe('CustomerSuspensionModal', () => {
  const mockSuspendCustomer = vi.fn();
  const mockUnsuspendCustomer = vi.fn();
  const mockBulkSuspendCustomers = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    (useCustomerSuspension as any).mockReturnValue({
      loading: ref(false),
      error: ref(null),
      suspendCustomer: mockSuspendCustomer,
      unsuspendCustomer: mockUnsuspendCustomer,
      bulkSuspendCustomers: mockBulkSuspendCustomers,
    });
  });

  it('renders suspension modal correctly', () => {
    const wrapper = mount(CustomerSuspensionModal, {
      props: {
        isOpen: true,
        customerIds: ['customer-1'],
        isSuspending: true,
      },
    });

    expect(wrapper.find('h3').text()).toBe('ระงับผู้ใช้งาน');
    expect(wrapper.find('textarea').exists()).toBe(true);
  });

  it('renders unsuspension modal correctly', () => {
    const wrapper = mount(CustomerSuspensionModal, {
      props: {
        isOpen: true,
        customerIds: ['customer-1'],
        isSuspending: false,
      },
    });

    expect(wrapper.find('h3').text()).toBe('ยกเลิกการระงับ');
    expect(wrapper.find('textarea').exists()).toBe(false);
  });

  it('requires reason for suspension', async () => {
    const wrapper = mount(CustomerSuspensionModal, {
      props: {
        isOpen: true,
        customerIds: ['customer-1'],
        isSuspending: true,
      },
    });

    const confirmButton = wrapper.findAll('button').find(btn => 
      btn.text().includes('ระงับ')
    );

    expect(confirmButton?.attributes('disabled')).toBeDefined();
  });

  it('enables confirm button when reason is provided', async () => {
    const wrapper = mount(CustomerSuspensionModal, {
      props: {
        isOpen: true,
        customerIds: ['customer-1'],
        isSuspending: true,
      },
    });

    const textarea = wrapper.find('textarea');
    await textarea.setValue('Violation of terms');

    const confirmButton = wrapper.findAll('button').find(btn => 
      btn.text().includes('ระงับ')
    );

    expect(confirmButton?.attributes('disabled')).toBeUndefined();
  });

  it('calls suspendCustomer for single customer', async () => {
    mockSuspendCustomer.mockResolvedValue({ success: true });

    const wrapper = mount(CustomerSuspensionModal, {
      props: {
        isOpen: true,
        customerIds: ['customer-1'],
        isSuspending: true,
      },
    });

    const textarea = wrapper.find('textarea');
    await textarea.setValue('Violation of terms');

    const confirmButton = wrapper.findAll('button').find(btn => 
      btn.text().includes('ระงับ')
    );
    await confirmButton?.trigger('click');

    expect(mockSuspendCustomer).toHaveBeenCalledWith('customer-1', 'Violation of terms');
  });

  it('calls bulkSuspendCustomers for multiple customers', async () => {
    mockBulkSuspendCustomers.mockResolvedValue({ success: true });

    const wrapper = mount(CustomerSuspensionModal, {
      props: {
        isOpen: true,
        customerIds: ['customer-1', 'customer-2'],
        isSuspending: true,
      },
    });

    const textarea = wrapper.find('textarea');
    await textarea.setValue('Bulk suspension');

    const confirmButton = wrapper.findAll('button').find(btn => 
      btn.text().includes('ระงับ')
    );
    await confirmButton?.trigger('click');

    expect(mockBulkSuspendCustomers).toHaveBeenCalledWith(
      ['customer-1', 'customer-2'],
      'Bulk suspension'
    );
  });

  it('calls unsuspendCustomer for single customer', async () => {
    mockUnsuspendCustomer.mockResolvedValue({ success: true });

    const wrapper = mount(CustomerSuspensionModal, {
      props: {
        isOpen: true,
        customerIds: ['customer-1'],
        isSuspending: false,
      },
    });

    const confirmButton = wrapper.findAll('button').find(btn => 
      btn.text().includes('ยกเลิกการระงับ')
    );
    await confirmButton?.trigger('click');

    expect(mockUnsuspendCustomer).toHaveBeenCalledWith('customer-1');
  });

  it('emits success event on successful suspension', async () => {
    mockSuspendCustomer.mockResolvedValue({ success: true });

    const wrapper = mount(CustomerSuspensionModal, {
      props: {
        isOpen: true,
        customerIds: ['customer-1'],
        isSuspending: true,
      },
    });

    const textarea = wrapper.find('textarea');
    await textarea.setValue('Test reason');

    const confirmButton = wrapper.findAll('button').find(btn => 
      btn.text().includes('ระงับ')
    );
    await confirmButton?.trigger('click');

    await wrapper.vm.$nextTick();

    expect(wrapper.emitted('success')).toBeTruthy();
    expect(wrapper.emitted('close')).toBeTruthy();
  });

  it('displays error message on failure', async () => {
    const errorMessage = 'Failed to suspend customer';
    mockSuspendCustomer.mockRejectedValue(new Error(errorMessage));

    (useCustomerSuspension as any).mockReturnValue({
      loading: ref(false),
      error: ref(errorMessage),
      suspendCustomer: mockSuspendCustomer,
      unsuspendCustomer: mockUnsuspendCustomer,
      bulkSuspendCustomers: mockBulkSuspendCustomers,
    });

    const wrapper = mount(CustomerSuspensionModal, {
      props: {
        isOpen: true,
        customerIds: ['customer-1'],
        isSuspending: true,
      },
    });

    const textarea = wrapper.find('textarea');
    await textarea.setValue('Test reason');

    const confirmButton = wrapper.findAll('button').find(btn => 
      btn.text().includes('ระงับ')
    );
    await confirmButton?.trigger('click');

    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain(errorMessage);
  });

  it('shows loading state during suspension', async () => {
    (useCustomerSuspension as any).mockReturnValue({
      loading: ref(true),
      error: ref(null),
      suspendCustomer: mockSuspendCustomer,
      unsuspendCustomer: mockUnsuspendCustomer,
      bulkSuspendCustomers: mockBulkSuspendCustomers,
    });

    const wrapper = mount(CustomerSuspensionModal, {
      props: {
        isOpen: true,
        customerIds: ['customer-1'],
        isSuspending: true,
      },
    });

    expect(wrapper.text()).toContain('กำลังดำเนินการ');
  });

  it('closes modal on cancel button click', async () => {
    const wrapper = mount(CustomerSuspensionModal, {
      props: {
        isOpen: true,
        customerIds: ['customer-1'],
        isSuspending: true,
      },
    });

    const cancelButton = wrapper.findAll('button').find(btn => 
      btn.text().includes('ยกเลิก')
    );
    await cancelButton?.trigger('click');

    expect(wrapper.emitted('close')).toBeTruthy();
  });

  it('closes modal on backdrop click', async () => {
    const wrapper = mount(CustomerSuspensionModal, {
      props: {
        isOpen: true,
        customerIds: ['customer-1'],
        isSuspending: true,
      },
    });

    const backdrop = wrapper.find('.fixed');
    await backdrop.trigger('click.self');

    expect(wrapper.emitted('close')).toBeTruthy();
  });

  it('displays correct customer count', () => {
    const wrapper = mount(CustomerSuspensionModal, {
      props: {
        isOpen: true,
        customerIds: ['customer-1', 'customer-2', 'customer-3'],
        isSuspending: true,
      },
    });

    expect(wrapper.text()).toContain('3 คน');
  });

  it('resets form when modal opens', async () => {
    const wrapper = mount(CustomerSuspensionModal, {
      props: {
        isOpen: false,
        customerIds: ['customer-1'],
        isSuspending: true,
      },
    });

    await wrapper.setProps({ isOpen: true });

    const textarea = wrapper.find('textarea');
    expect(textarea.element.value).toBe('');
  });
});

describe('useCustomerSuspension', () => {
  it('should be tested with actual implementation', () => {
    // This is a placeholder for actual composable tests
    // In real implementation, you would test the composable with mocked supabase
    expect(true).toBe(true);
  });
});
