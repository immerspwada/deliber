<script setup lang="ts">
/**
 * Feature: F89 - List Item
 * Reusable list item with icon and actions
 */
interface Props {
  title: string
  subtitle?: string
  clickable?: boolean
  showArrow?: boolean
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  subtitle: '',
  clickable: false,
  showArrow: false,
  disabled: false
})

const emit = defineEmits<{
  click: []
}>()

const handleClick = () => {
  if (!props.disabled && props.clickable) {
    emit('click')
  }
}
</script>

<template>
  <div
    class="list-item"
    :class="{ clickable, disabled }"
    @click="handleClick"
  >
    <div v-if="$slots.leading" class="list-item-leading">
      <slot name="leading" />
    </div>
    
    <div class="list-item-content">
      <span class="list-item-title">{{ title }}</span>
      <span v-if="subtitle" class="list-item-subtitle">{{ subtitle }}</span>
    </div>
    
    <div v-if="$slots.trailing || showArrow" class="list-item-trailing">
      <slot name="trailing" />
      <svg v-if="showArrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="9 18 15 12 9 6"/>
      </svg>
    </div>
  </div>
</template>

<style scoped>
.list-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  background: #fff;
  transition: background 0.2s;
}

.list-item.clickable {
  cursor: pointer;
}

.list-item.clickable:hover:not(.disabled) {
  background: #f6f6f6;
}

.list-item.clickable:active:not(.disabled) {
  background: #e5e5e5;
}

.list-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.list-item-leading {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b6b6b;
}

.list-item-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.list-item-title {
  font-size: 15px;
  font-weight: 500;
  color: #000;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.list-item-subtitle {
  font-size: 13px;
  color: #6b6b6b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.list-item-trailing {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #6b6b6b;
}
</style>
