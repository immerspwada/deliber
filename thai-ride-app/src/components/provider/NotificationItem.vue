<template>
  <div
    :class="[
      'notification-item p-4 rounded-lg border transition-all cursor-pointer',
      notification.read
        ? 'bg-white border-gray-200'
        : 'bg-blue-50 border-blue-200'
    ]"
    @click="$emit('click')"
  >
    <div class="flex items-start gap-3">
      <!-- Icon -->
      <div
        :class="[
          'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center',
          iconConfig.bgColor
        ]"
      >
        <component :is="iconConfig.icon" :class="['w-5 h-5', iconConfig.color]" />
      </div>

      <!-- Content -->
      <div class="flex-1 min-w-0">
        <div class="flex items-start justify-between gap-2">
          <h3 class="text-sm font-semibold text-gray-900">
            {{ notification.title }}
          </h3>
          <button
            v-if="!notification.read"
            @click.stop="$emit('mark-read')"
            class="flex-shrink-0 text-blue-600 hover:text-blue-700"
            title="ทำเครื่องหมายว่าอ่านแล้ว"
          >
            <svg
              class="w-4 h-4"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fill-rule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clip-rule="evenodd"
              />
            </svg>
          </button>
        </div>

        <p class="mt-1 text-sm text-gray-600">
          {{ notification.body }}
        </p>

        <!-- Action Button -->
        <button
          v-if="actionButton"
          @click.stop="handleAction"
          class="mt-2 px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors"
        >
          {{ actionButton.label }}
        </button>

        <!-- Timestamp -->
        <p class="mt-2 text-xs text-gray-500">
          {{ formattedTime }}
        </p>
      </div>

      <!-- Unread Indicator -->
      <div
        v-if="!notification.read"
        class="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  read: boolean;
  created_at: string;
}

interface Props {
  notification: Notification;
}

interface Emits {
  (e: 'click'): void;
  (e: 'mark-read'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();
const router = useRouter();

// Icon configuration based on notification type
const iconConfig = computed(() => {
  switch (props.notification.type) {
    case 'job':
      return {
        icon: 'svg',
        bgColor: 'bg-green-100',
        color: 'text-green-600',
        path: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
      };
    case 'earning':
      return {
        icon: 'svg',
        bgColor: 'bg-yellow-100',
        color: 'text-yellow-600',
        path: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
      };
    case 'document':
      return {
        icon: 'svg',
        bgColor: 'bg-purple-100',
        color: 'text-purple-600',
        path: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
      };
    case 'system':
      return {
        icon: 'svg',
        bgColor: 'bg-blue-100',
        color: 'text-blue-600',
        path: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
      };
    default:
      return {
        icon: 'svg',
        bgColor: 'bg-gray-100',
        color: 'text-gray-600',
        path: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9'
      };
  }
});

// Action button configuration
const actionButton = computed(() => {
  const data = props.notification.data;
  if (!data) return null;

  switch (props.notification.type) {
    case 'job':
      if (data.job_id) {
        return { label: 'ดูงาน', action: 'view-job' };
      }
      break;
    case 'earning':
      return { label: 'ดูรายได้', action: 'view-earnings' };
    case 'document':
      return { label: 'ดูเอกสาร', action: 'view-documents' };
  }

  return null;
});

// Format timestamp
const formattedTime = computed(() => {
  const date = new Date(props.notification.created_at);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'เมื่อสักครู่';
  if (diffMins < 60) return `${diffMins} นาทีที่แล้ว`;
  if (diffHours < 24) return `${diffHours} ชั่วโมงที่แล้ว`;
  if (diffDays < 7) return `${diffDays} วันที่แล้ว`;

  return date.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
});

function handleAction(): void {
  const data = props.notification.data;
  if (!data) return;

  switch (actionButton.value?.action) {
    case 'view-job':
      if (data.job_id) {
        router.push(`/provider/jobs/${data.job_id}`);
      }
      break;
    case 'view-earnings':
      router.push('/provider/earnings');
      break;
    case 'view-documents':
      router.push('/provider/documents');
      break;
  }

  emit('mark-read');
}
</script>

<style scoped>
.notification-item:hover {
  @apply shadow-sm;
}
</style>
