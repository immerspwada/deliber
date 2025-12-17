<script setup lang="ts">
/**
 * Feature: F80 - Switch Toggle
 * iOS-style toggle switch
 */
interface Props {
  modelValue: boolean
  label?: string
  description?: string
  disabled?: boolean
  size?: 'sm' | 'md'
}

const props = withDefaults(defineProps<Props>(), {
  label: '',
  description: '',
  disabled: false,
  size: 'md'
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const toggle = () => {
  if (props.disabled) return
  emit('update:modelValue', !props.modelValue)
}
</script>

<template>
  <div class="switch-container" :class="{ disabled }" @click="toggle">
    <div v-if="label || description" class="switch-content">
      <span v-if="label" class="switch-label">{{ label }}</span>
      <span v-if="description" class="switch-description">{{ description }}</span>
    </div>
    
    <button
      type="button"
      class="switch"
      :class="[`size-${size}`, { active: modelValue }]"
      :disabled="disabled"
      role="switch"
      :aria-checked="modelValue"
    >
      <span class="switch-thumb" />
    </button>
  </div>
</template>

<style scoped>
.switch-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  cursor: pointer;
}

.switch-container.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.switch-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}

.switch-label {
  font-size: 15px;
  font-weight: 500;
  color: #000;
}

.switch-description {
  font-size: 13px;
  color: #6b6b6b;
}

.switch {
  position: relative;
  background: #e5e5e5;
  border: none;
  border-radius: 100px;
  cursor: pointer;
  transition: background 0.2s;
  flex-shrink: 0;
}

.switch.size-sm {
  width: 40px;
  height: 24px;
}

.switch.size-md {
  width: 52px;
  height: 32px;
}

.switch.active {
  background: #000;
}

.switch:disabled {
  cursor: not-allowed;
}

.switch-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  background: #fff;
  border-radius: 50%;
  transition: transform 0.2s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}

.size-sm .switch-thumb {
  width: 20px;
  height: 20px;
}

.size-md .switch-thumb {
  width: 28px;
  height: 28px;
}

.switch.active .switch-thumb {
  transform: translateX(100%);
}

.size-sm.active .switch-thumb {
  transform: translateX(16px);
}

.size-md.active .switch-thumb {
  transform: translateX(20px);
}
</style>
