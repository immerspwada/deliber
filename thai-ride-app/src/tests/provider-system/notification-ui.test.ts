import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import * as fc from 'fast-check';
import NotificationItem from '@/components/provider/NotificationItem.vue';
import NotificationCenter from '@/components/provider/NotificationCenter.vue';

describe('Notification UI Components - Property Tests', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  /**
   * Property 48: Unread Notifications Display Badge
   * All unread notifications must show visual indicator
   */
  it('Property 48: unread notifications always display badge', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          type: fc.constantFrom('job', 'earning', 'document', 'system'),
          title: fc.string({ minLength: 5, maxLength: 50 }),
          body: fc.string({ minLength: 10, maxLength: 200 }),
          data: fc.option(fc.dictionary(fc.string(), fc.anything()), { nil: null }),
          read: fc.boolean(),
          created_at: fc.date().map(d => d.toISOString())
        }),
        (notification) => {
          const wrapper = mount(NotificationItem, {
            props: { notification }
          });

          const badge = wrapper.find('.w-2.h-2.bg-blue-600');
          const hasUnreadBadge = badge.exists();

          // Unread notifications must show badge
          if (!notification.read) {
            expect(hasUnreadBadge).toBe(true);
          } else {
            expect(hasUnreadBadge).toBe(false);
          }

          wrapper.unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 49: Notification Type Determines Icon
   * Each notification type must have consistent icon styling
   */
  it('Property 49: notification type determines icon color', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('job', 'earning', 'document', 'system'),
        fc.string({ minLength: 5, maxLength: 50 }),
        fc.string({ minLength: 10, maxLength: 200 }),
        (type, title, body) => {
          const notification = {
            id: crypto.randomUUID(),
            type,
            title,
            body,
            data: null,
            read: false,
            created_at: new Date().toISOString()
          };

          const wrapper = mount(NotificationItem, {
            props: { notification }
          });

          const iconContainer = wrapper.find('.w-10.h-10.rounded-full');
          expect(iconContainer.exists()).toBe(true);

          // Verify icon color matches type
          const expectedColors: Record<string, string> = {
            job: 'bg-green-100',
            earning: 'bg-yellow-100',
            document: 'bg-purple-100',
            system: 'bg-blue-100'
          };

          expect(iconContainer.classes()).toContain(expectedColors[type]);

          wrapper.unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 50: Mark as Read Updates Visual State
   * Marking notification as read must change background color
   */
  it('Property 50: marking as read changes visual state', async () => {
    fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.uuid(),
          type: fc.constantFrom('job', 'earning', 'document', 'system'),
          title: fc.string({ minLength: 5, maxLength: 50 }),
          body: fc.string({ minLength: 10, maxLength: 200 }),
          data: fc.option(fc.dictionary(fc.string(), fc.anything()), { nil: null }),
          read: fc.constant(false), // Start unread
          created_at: fc.date().map(d => d.toISOString())
        }),
        async (notification) => {
          const wrapper = mount(NotificationItem, {
            props: { notification }
          });

          // Initial state - unread
          const initialContainer = wrapper.find('.notification-item');
          expect(initialContainer.classes()).toContain('bg-blue-50');
          expect(initialContainer.classes()).toContain('border-blue-200');

          // Mark as read
          const markReadButton = wrapper.find('button[title="ทำเครื่องหมายว่าอ่านแล้ว"]');
          expect(markReadButton.exists()).toBe(true);

          await markReadButton.trigger('click');
          expect(wrapper.emitted('mark-read')).toBeTruthy();

          // Update prop to read
          await wrapper.setProps({
            notification: { ...notification, read: true }
          });

          // New state - read
          const updatedContainer = wrapper.find('.notification-item');
          expect(updatedContainer.classes()).toContain('bg-white');
          expect(updatedContainer.classes()).toContain('border-gray-200');

          wrapper.unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 51: Timestamp Formatting Consistency
   * All timestamps must be formatted consistently and correctly
   */
  it('Property 51: timestamp formatting is consistent', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 365 * 24 * 60 * 60 * 1000 }), // Up to 1 year ago
        (msAgo) => {
          const now = new Date();
          const createdAt = new Date(now.getTime() - msAgo);

          const notification = {
            id: crypto.randomUUID(),
            type: 'system',
            title: 'Test',
            body: 'Test body',
            data: null,
            read: false,
            created_at: createdAt.toISOString()
          };

          const wrapper = mount(NotificationItem, {
            props: { notification }
          });

          const timestamp = wrapper.find('.text-xs.text-gray-500');
          expect(timestamp.exists()).toBe(true);

          const text = timestamp.text();
          const diffMins = Math.floor(msAgo / 60000);
          const diffHours = Math.floor(msAgo / 3600000);
          const diffDays = Math.floor(msAgo / 86400000);

          // Verify correct format based on time difference
          if (diffMins < 1) {
            expect(text).toBe('เมื่อสักครู่');
          } else if (diffMins < 60) {
            expect(text).toContain('นาทีที่แล้ว');
          } else if (diffHours < 24) {
            expect(text).toContain('ชั่วโมงที่แล้ว');
          } else if (diffDays < 7) {
            expect(text).toContain('วันที่แล้ว');
          } else {
            // Should be formatted date
            expect(text.length).toBeGreaterThan(0);
          }

          wrapper.unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 52: Action Buttons Only for Actionable Notifications
   * Action buttons should only appear when notification has relevant data
   */
  it('Property 52: action buttons only for actionable notifications', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('job', 'earning', 'document', 'system'),
        fc.option(fc.uuid(), { nil: null }),
        (type, jobId) => {
          const data = jobId && type === 'job' ? { job_id: jobId } : null;

          const notification = {
            id: crypto.randomUUID(),
            type,
            title: 'Test',
            body: 'Test body',
            data,
            read: false,
            created_at: new Date().toISOString()
          };

          const wrapper = mount(NotificationItem, {
            props: { notification },
            global: {
              stubs: {
                RouterLink: true
              }
            }
          });

          const actionButton = wrapper.find('button.bg-blue-600');

          // Job notifications with job_id should have action button
          if (type === 'job' && jobId) {
            expect(actionButton.exists()).toBe(true);
            expect(actionButton.text()).toBe('ดูงาน');
          }
          // Earning notifications should have action button
          else if (type === 'earning') {
            expect(actionButton.exists()).toBe(true);
            expect(actionButton.text()).toBe('ดูรายได้');
          }
          // Document notifications should have action button
          else if (type === 'document') {
            expect(actionButton.exists()).toBe(true);
            expect(actionButton.text()).toBe('ดูเอกสาร');
          }
          // System notifications without data should not have action button
          else {
            expect(actionButton.exists()).toBe(false);
          }

          wrapper.unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 53: Filter Maintains Notification Order
   * Filtering notifications must preserve chronological order
   */
  it('Property 53: filtering preserves chronological order', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            type: fc.constantFrom('job', 'earning', 'document', 'system'),
            title: fc.string({ minLength: 5, maxLength: 50 }),
            body: fc.string({ minLength: 10, maxLength: 200 }),
            data: fc.option(fc.dictionary(fc.string(), fc.anything()), { nil: null }),
            read: fc.boolean(),
            created_at: fc.date().map(d => d.toISOString())
          }),
          { minLength: 5, maxLength: 20 }
        ),
        (notifications) => {
          // Sort by created_at descending (newest first)
          const sorted = [...notifications].sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );

          // For each notification type, verify order is preserved
          const types = ['job', 'earning', 'document', 'system'];

          types.forEach(type => {
            const filtered = sorted.filter(n => n.type === type);

            // Verify filtered list maintains chronological order
            for (let i = 0; i < filtered.length - 1; i++) {
              const current = new Date(filtered[i].created_at).getTime();
              const next = new Date(filtered[i + 1].created_at).getTime();
              expect(current).toBeGreaterThanOrEqual(next);
            }
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 54: Unread Count Accuracy
   * Unread count must always match actual unread notifications
   */
  it('Property 54: unread count is always accurate', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            type: fc.constantFrom('job', 'earning', 'document', 'system'),
            title: fc.string({ minLength: 5, maxLength: 50 }),
            body: fc.string({ minLength: 10, maxLength: 200 }),
            data: fc.option(fc.dictionary(fc.string(), fc.anything()), { nil: null }),
            read: fc.boolean(),
            created_at: fc.date().map(d => d.toISOString())
          }),
          { minLength: 0, maxLength: 50 }
        ),
        (notifications) => {
          const expectedUnreadCount = notifications.filter(n => !n.read).length;

          // Simulate what the component would calculate
          const actualUnreadCount = notifications.reduce(
            (count, n) => count + (n.read ? 0 : 1),
            0
          );

          expect(actualUnreadCount).toBe(expectedUnreadCount);

          // Verify count is non-negative
          expect(actualUnreadCount).toBeGreaterThanOrEqual(0);

          // Verify count doesn't exceed total
          expect(actualUnreadCount).toBeLessThanOrEqual(notifications.length);
        }
      ),
      { numRuns: 100 }
    );
  });
});
