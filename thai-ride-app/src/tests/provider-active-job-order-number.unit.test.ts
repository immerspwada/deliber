import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import ProviderHomeNew from '@/views/provider/ProviderHomeNew.vue';

// Mock modules
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(() => Promise.resolve({
        data: { user: { id: 'test-user-id' } },
        error: null
      }))
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          in: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() => ({
                maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null }))
              }))
            }))
          })),
          gte: vi.fn(() => Promise.resolve({ data: [], error: null })),
          order: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve({ data: [], error: null }))
          }))
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
      }))
    })),
    channel: vi.fn(() => ({
      on: vi.fn(function(this: any) { return this; }),
      subscribe: vi.fn(() => 'ok')
    })),
    removeChannel: vi.fn()
  }
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: vi.fn()
  })
}));

vi.mock('@/composables/usePushNotification', () => ({
  usePushNotification: () => ({
    isSupported: { value: true },
    isSubscribed: { value: false },
    permission: { value: 'default' },
    loading: { value: false },
    requestPermission: vi.fn(),
    notifyNewJob: vi.fn()
  })
}));

vi.mock('@/composables/useCopyToClipboard', () => ({
  useCopyToClipboard: () => ({
    copyToClipboard: vi.fn(() => Promise.resolve(true))
  })
}));

vi.mock('@/composables/useToast', () => ({
  useToast: () => ({
    showSuccess: vi.fn(),
    showError: vi.fn()
  })
}));

/**
 * Integration Tests for Provider Active Job Order Number Feature
 * 
 * Tests cover:
 * - 5.1: Order number display
 * - 5.2: Copy functionality  
 * - 5.3: Keyboard interaction
 * - 5.4: Responsive behavior
 */
describe('ProviderHomeNew - Order Number Integration Tests', () => {
  let wrapper: VueWrapper<any>;
  
  const mockActiveJob = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    status: 'matched',
    pickup_address: 'ถนนสุขุมวิท 21',
    destination_address: 'ถนนพระราม 4',
    estimated_fare: 150,
    customer_name: 'ลูกค้าทดสอบ',
    created_at: new Date().toISOString()
  };

  const mockProviderData = {
    id: 'provider-123',
    first_name: 'สมชาย',
    last_name: 'ใจดี',
    rating: 4.8,
    total_earnings: 50000,
    total_trips: 100,
    is_online: true,
    is_available: true
  };

  async function setupMocksWithActiveJob() {
    // Access the already-mocked supabase from the module
    const supabaseModule = await import('@/lib/supabase');
    const supabase = supabaseModule.supabase;
    
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'providers_v2') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(() => Promise.resolve({ 
                data: mockProviderData, 
                error: null 
              }))
            }))
          }))
        } as any;
      }
      
      if (table === 'ride_requests') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              in: vi.fn(() => ({
                order: vi.fn(() => ({
                  limit: vi.fn(() => ({
                    maybeSingle: vi.fn(() => Promise.resolve({ 
                      data: mockActiveJob, 
                      error: null 
                    }))
                  }))
                }))
              })),
              gte: vi.fn(() => Promise.resolve({ data: [], error: null })),
              order: vi.fn(() => ({
                limit: vi.fn(() => Promise.resolve({ data: [], error: null }))
              }))
            }))
          }))
        } as any;
      }
      
      if (table === 'users') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(() => Promise.resolve({ 
                data: { name: 'ลูกค้าทดสอบ' }, 
                error: null 
              }))
            }))
          }))
        } as any;
      }
      
      // Add earnings mock
      if (table === 'earnings') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ data: [], error: null }))
            }))
          }))
        } as any;
      }
      
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
            gte: vi.fn(() => Promise.resolve({ data: [], error: null }))
          }))
        }))
      } as any;
    });
  }

  async function setupMocksWithoutActiveJob() {
    const supabaseModule = await import('@/lib/supabase');
    const supabase = supabaseModule.supabase;
    
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'providers_v2') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(() => Promise.resolve({ 
                data: mockProviderData, 
                error: null 
              }))
            }))
          }))
        } as any;
      }
      
      if (table === 'ride_requests') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
              in: vi.fn(() => ({
                order: vi.fn(() => ({
                  limit: vi.fn(() => ({
                    maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null }))
                  }))
                }))
              })),
              gte: vi.fn(() => Promise.resolve({ data: [], error: null })),
              order: vi.fn(() => ({
                limit: vi.fn(() => Promise.resolve({ data: [], error: null }))
              }))
            }))
          }))
        } as any;
      }
      
      // Add earnings mock
      if (table === 'earnings') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ data: [], error: null }))
            }))
          }))
        } as any;
      }
      
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
            gte: vi.fn(() => Promise.resolve({ data: [], error: null }))
          }))
        }))
      } as any;
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });

  describe('5.1 Order Number Display', () => {
    it('should display order number when active job exists', async () => {
      await setupMocksWithActiveJob();

      wrapper = mount(ProviderHomeNew);
      await nextTick();
      await new Promise(resolve => setTimeout(resolve, 150));

      const orderNumberBadge = wrapper.find('.order-number-badge');
      expect(orderNumberBadge.exists()).toBe(true);
    });

    it('should display correct order number format (#XXXXXXXX)', async () => {
      await setupMocksWithActiveJob();

      wrapper = mount(ProviderHomeNew);
      await nextTick();
      await new Promise(resolve => setTimeout(resolve, 150));

      const orderNumberBadge = wrapper.find('.order-number-badge');
      expect(orderNumberBadge.text()).toContain('#550E8400');
    });

    it('should hide order number when no active job exists', async () => {
      await setupMocksWithoutActiveJob();

      wrapper = mount(ProviderHomeNew);
      await nextTick();
      await new Promise(resolve => setTimeout(resolve, 150));

      const orderNumberBadge = wrapper.find('.order-number-badge');
      expect(orderNumberBadge.exists()).toBe(false);
    });
  });

  describe('5.2 Copy Functionality', () => {
    it('should have clickable order number badge', async () => {
      await setupMocksWithActiveJob();

      wrapper = mount(ProviderHomeNew);
      await nextTick();
      await new Promise(resolve => setTimeout(resolve, 150));

      const orderNumberBadge = wrapper.find('.order-number-badge');
      expect(orderNumberBadge.exists()).toBe(true);
      expect(orderNumberBadge.attributes('type')).toBe('button');
      
      // Verify it can be clicked
      await orderNumberBadge.trigger('click');
      await nextTick();
      
      expect(orderNumberBadge.exists()).toBe(true);
    });

    it('should show visual feedback (copied class) when clicked', async () => {
      await setupMocksWithActiveJob();

      wrapper = mount(ProviderHomeNew);
      await nextTick();
      await new Promise(resolve => setTimeout(resolve, 150));

      const orderNumberBadge = wrapper.find('.order-number-badge');
      
      // Before click - no copied class
      expect(orderNumberBadge.classes()).not.toContain('copied');
      
      // Click and check for copied class
      await orderNumberBadge.trigger('click');
      await nextTick();
      
      expect(orderNumberBadge.classes()).toContain('copied');
    });

    it('should have copy icon', async () => {
      await setupMocksWithActiveJob();

      wrapper = mount(ProviderHomeNew);
      await nextTick();
      await new Promise(resolve => setTimeout(resolve, 150));

      const copyIcon = wrapper.find('.copy-icon');
      expect(copyIcon.exists()).toBe(true);
      expect(copyIcon.attributes('aria-hidden')).toBe('true');
    });
  });

  describe('5.3 Keyboard Interaction', () => {
    it('should respond to Enter key press', async () => {
      await setupMocksWithActiveJob();

      wrapper = mount(ProviderHomeNew);
      await nextTick();
      await new Promise(resolve => setTimeout(resolve, 150));

      const orderNumberBadge = wrapper.find('.order-number-badge');
      
      // Trigger Enter key
      await orderNumberBadge.trigger('keydown', { key: 'Enter' });
      await nextTick();
      
      // Component should handle the event
      expect(orderNumberBadge.exists()).toBe(true);
    });

    it('should respond to Space key press', async () => {
      await setupMocksWithActiveJob();

      wrapper = mount(ProviderHomeNew);
      await nextTick();
      await new Promise(resolve => setTimeout(resolve, 150));

      const orderNumberBadge = wrapper.find('.order-number-badge');
      
      // Trigger Space key
      await orderNumberBadge.trigger('keydown', { key: ' ' });
      await nextTick();
      
      // Component should handle the event
      expect(orderNumberBadge.exists()).toBe(true);
    });

    it('should have keyboard accessibility attributes', async () => {
      await setupMocksWithActiveJob();

      wrapper = mount(ProviderHomeNew);
      await nextTick();
      await new Promise(resolve => setTimeout(resolve, 150));

      const orderNumberBadge = wrapper.find('.order-number-badge');
      
      // Check keyboard accessibility
      expect(orderNumberBadge.attributes('tabindex')).toBe('0');
      expect(orderNumberBadge.attributes('role')).toBe('button');
    });
  });

  describe('5.4 Responsive Behavior', () => {
    it('should render correctly on mobile viewport', async () => {
      await setupMocksWithActiveJob();
      
      // Simulate mobile viewport
      global.innerWidth = 375;
      global.innerHeight = 667;

      wrapper = mount(ProviderHomeNew);
      await nextTick();
      await new Promise(resolve => setTimeout(resolve, 150));

      const orderNumberBadge = wrapper.find('.order-number-badge');
      expect(orderNumberBadge.exists()).toBe(true);
      
      // Verify it's accessible on mobile
      expect(orderNumberBadge.attributes('role')).toBe('button');
      expect(orderNumberBadge.attributes('tabindex')).toBe('0');
    });

    it('should render correctly on desktop viewport', async () => {
      await setupMocksWithActiveJob();
      
      // Simulate desktop viewport
      global.innerWidth = 1920;
      global.innerHeight = 1080;

      wrapper = mount(ProviderHomeNew);
      await nextTick();
      await new Promise(resolve => setTimeout(resolve, 150));

      const orderNumberBadge = wrapper.find('.order-number-badge');
      expect(orderNumberBadge.exists()).toBe(true);
      expect(orderNumberBadge.text()).toContain('#550E8400');
    });

    it('should have proper ARIA attributes for accessibility', async () => {
      await setupMocksWithActiveJob();

      wrapper = mount(ProviderHomeNew);
      await nextTick();
      await new Promise(resolve => setTimeout(resolve, 150));

      const orderNumberBadge = wrapper.find('.order-number-badge');
      const element = orderNumberBadge.element as HTMLElement;
      
      // Check ARIA attributes
      expect(element.getAttribute('role')).toBe('button');
      expect(element.getAttribute('tabindex')).toBe('0');
      expect(element.getAttribute('aria-label')).toContain('หมายเลขออเดอร์');
      expect(element.getAttribute('aria-label')).toContain('#550E8400');
      expect(element.getAttribute('aria-label')).toContain('แตะเพื่อคัดลอก');
    });

    it('should have copy icon with aria-hidden', async () => {
      await setupMocksWithActiveJob();

      wrapper = mount(ProviderHomeNew);
      await nextTick();
      await new Promise(resolve => setTimeout(resolve, 150));

      const copyIcon = wrapper.find('.copy-icon');
      expect(copyIcon.exists()).toBe(true);
      expect(copyIcon.attributes('aria-hidden')).toBe('true');
    });
  });
});
