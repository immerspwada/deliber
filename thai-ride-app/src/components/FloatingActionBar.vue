<template>
  <div class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
    <div class="nav-container">
      <button
        v-for="item in items"
        :key="item.id"
        @click="handleClick(item.id)"
        :class="['nav-item', { 'nav-item-active': activeId === item.id }]"
        :aria-label="item.label"
      >
        <div class="nav-icon-wrapper">
          <component :is="item.icon" class="nav-icon" />
          <span v-if="activeId === item.id" class="active-dot" />
        </div>
        <span class="nav-label">{{ item.label }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  HomeIcon,
  Squares2X2Icon,
  UserCircleIcon,
} from '@heroicons/vue/24/outline';

interface ActionItem {
  id: string;
  label: string;
  icon: Component;
  action?: () => void;
}

interface Props {
  items?: ActionItem[];
  defaultActive?: string;
}

const props = withDefaults(defineProps<Props>(), {
  items: () => [
    { id: 'home', label: 'หน้าหลัก', icon: HomeIcon },
    { id: 'services', label: 'บริการ', icon: Squares2X2Icon },
    { id: 'profile', label: 'โปรไฟล์', icon: UserCircleIcon },
  ],
  defaultActive: 'home',
});

const emit = defineEmits<{
  change: [id: string];
}>();

const activeId = ref(props.defaultActive);

function handleClick(id: string) {
  activeId.value = id;
  emit('change', id);

  const item = props.items.find((i) => i.id === id);
  item?.action?.();
}
</script>

<style scoped>
.nav-container {
  display: flex;
  align-items: flex-end;
  gap: 0.5rem;
  background: white;
  border-radius: 2rem;
  padding: 0.75rem 1rem;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem 0.75rem;
  border: none;
  background: transparent;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 1rem;
  min-width: 4rem;
}

.nav-item:hover {
  background: rgba(249, 115, 22, 0.05);
  transform: translateY(-2px);
}

.nav-item:active {
  transform: translateY(0) scale(0.95);
}

.nav-icon-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
}

.nav-icon {
  width: 1.5rem;
  height: 1.5rem;
  stroke-width: 2;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  color: #9ca3af;
}

.nav-item-active .nav-icon {
  color: #f97316;
  transform: scale(1.1);
}

.active-dot {
  position: absolute;
  bottom: -2px;
  left: 50%;
  transform: translateX(-50%);
  width: 4px;
  height: 4px;
  background: linear-gradient(135deg, #f97316 0%, #fb923c 100%);
  border-radius: 50%;
  animation: dotPulse 2s ease-in-out infinite;
}

@keyframes dotPulse {
  0%, 100% {
    transform: translateX(-50%) scale(1);
    opacity: 1;
  }
  50% {
    transform: translateX(-50%) scale(1.5);
    opacity: 0.8;
  }
}

.nav-label {
  font-size: 0.75rem;
  font-weight: 500;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  color: transparent;
  max-height: 0;
  overflow: hidden;
  white-space: nowrap;
}

.nav-item-active .nav-label {
  color: #f97316;
  max-height: 2rem;
  margin-top: 0.25rem;
}

/* Cute bounce animation on mount */
@keyframes bounceIn {
  0% {
    transform: scale(0.8);
    opacity: 0;
  }
  50% {
    transform: scale(1.05);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.nav-container {
  animation: bounceIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

/* Mobile optimization */
@media (max-width: 640px) {
  .nav-container {
    padding: 0.625rem 0.875rem;
    gap: 0.25rem;
  }
  
  .nav-item {
    min-width: 3.5rem;
    padding: 0.375rem 0.5rem;
  }
  
  .nav-icon-wrapper {
    width: 2.25rem;
    height: 2.25rem;
  }
  
  .nav-icon {
    width: 1.375rem;
    height: 1.375rem;
  }
}
</style>
