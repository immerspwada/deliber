<template>
  <div class="notification-center">
    <!-- Header -->
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-xl font-semibold text-gray-900">การแจ้งเตือน</h2>
      <button
        v-if="unreadCount > 0"
        @click="markAllAsRead"
        class="text-sm text-blue-600 hover:text-blue-700"
      >
        ทำเครื่องหมายอ่านทั้งหมด
      </button>
    </div>

    <!-- Filters -->
    <div class="flex gap-2 mb-4 overflow-x-auto">
      <button
        v-for="filter in filters"
        :key="filter.value"
        @click="selectedFilter = filter.value"
        :class="[
          'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
          selectedFilter === filter.value
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        ]"
      >
        {{ filter.label }}
        <span
          v-if="filter.value === 'all' && unreadCount > 0"
          class="ml-1 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full"
        >
          {{ unreadCount }}
        </span>
      </button>
    </div>

    <!-- Notifications List -->
    <div v-if="loading" class="space-y-3">
      <div
        v-for="i in 3"
        :key="i"
        class="animate-pulse bg-gray-100 rounded-lg h-20"
      />
    </div>

    <div v-else-if="filteredNotifications.length === 0" class="text-center py-12">
      <svg
        class="mx-auto h-12 w-12 text-gray-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>
      <p class="mt-2 text-gray-500">ไม่มีการแจ้งเตือน</p>
    </div>

    <div v-else class="space-y-2">
      <NotificationItem
        v-for="notification in filteredNotifications"
        :key="notification.id"
        :notification="notification"
        @click="handleNotificationClick(notification)"
        @mark-read="markAsRead(notification.id)"
      />
    </div>

    <!-- Load More -->
    <button
      v-if="hasMore && !loading"
      @click="loadMore"
      class="w-full mt-4 py-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
    >
      โหลดเพิ่มเติม
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { supabase } from '@/lib/supabase';
import NotificationItem from './NotificationItem.vue';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  read: boolean;
  created_at: string;
}

type FilterValue = 'all' | 'job' | 'earning' | 'system' | 'document';

const router = useRouter();

// State
const notifications = ref<Notification[]>([]);
const loading = ref(true);
const selectedFilter = ref<FilterValue>('all');
const hasMore = ref(true);
const page = ref(0);
const pageSize = 20;

// Filters
const filters = [
  { label: 'ทั้งหมด', value: 'all' as FilterValue },
  { label: 'งาน', value: 'job' as FilterValue },
  { label: 'รายได้', value: 'earning' as FilterValue },
  { label: 'ระบบ', value: 'system' as FilterValue },
  { label: 'เอกสาร', value: 'document' as FilterValue }
];

// Computed
const unreadCount = computed(() => 
  notifications.value.filter(n => !n.read).length
);

const filteredNotifications = computed(() => {
  if (selectedFilter.value === 'all') {
    return notifications.value;
  }
  return notifications.value.filter(n => n.type === selectedFilter.value);
});

// Real-time subscription
let subscription: ReturnType<typeof supabase.channel> | null = null;

// Methods
async function loadNotifications(): Promise<void> {
  try {
    loading.value = true;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(page.value * pageSize, (page.value + 1) * pageSize - 1);

    if (error) throw error;

    if (data) {
      if (page.value === 0) {
        notifications.value = data;
      } else {
        notifications.value.push(...data);
      }
      hasMore.value = data.length === pageSize;
    }
  } catch (error) {
    console.error('Error loading notifications:', error);
  } finally {
    loading.value = false;
  }
}

async function loadMore(): Promise<void> {
  page.value++;
  await loadNotifications();
}

async function markAsRead(notificationId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    if (error) throw error;

    // Update local state
    const notification = notifications.value.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
    }
  } catch (error) {
    console.error('Error marking notification as read:', error);
  }
}

async function markAllAsRead(): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);

    if (error) throw error;

    // Update local state
    notifications.value.forEach(n => {
      n.read = true;
    });
  } catch (error) {
    console.error('Error marking all as read:', error);
  }
}

function handleNotificationClick(notification: Notification): void {
  // Mark as read
  if (!notification.read) {
    markAsRead(notification.id);
  }

  // Handle navigation based on notification type
  if (notification.data) {
    const data = notification.data;

    switch (notification.type) {
      case 'job':
        if (data.job_id) {
          router.push(`/provider/jobs/${data.job_id}`);
        }
        break;
      case 'earning':
        router.push('/provider/earnings');
        break;
      case 'document':
        router.push('/provider/documents');
        break;
      case 'system':
        // Stay on notifications page
        break;
    }
  }
}

function setupRealtimeSubscription(): void {
  const channel = supabase.channel('notifications');

  channel
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications'
      },
      (payload) => {
        const newNotification = payload.new as Notification;
        notifications.value.unshift(newNotification);
      }
    )
    .subscribe();

  subscription = channel;
}

// Lifecycle
onMounted(async () => {
  await loadNotifications();
  setupRealtimeSubscription();
});

onUnmounted(() => {
  if (subscription) {
    subscription.unsubscribe();
  }
});
</script>

<style scoped>
.notification-center {
  @apply max-w-2xl mx-auto p-4;
}
</style>
