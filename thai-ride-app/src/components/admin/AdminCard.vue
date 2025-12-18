<!--
  Admin Card Component - MUNEEF Style
  
  Modern card component for admin dashboard with consistent styling
  Features: hover effects, loading states, action buttons
-->

<template>
  <div 
    class="admin-card" 
    :class="{ 
      'loading': loading, 
      'clickable': clickable,
      'elevated': elevated,
      'compact': size === 'sm',
      'large': size === 'lg'
    }"
    @click="handleClick"
  >
    <!-- Loading Overlay -->
    <div v-if="loading" class="loading-overlay">
      <div class="loading-spinner"></div>
    </div>

    <!-- Card Header -->
    <div v-if="$slots.header || title" class="card-header">
      <div class="header-content">
        <div v-if="icon" class="header-icon" :class="iconColor">
          <component :is="icon" class="icon" />
        </div>
        <div class="header-text">
          <h3 v-if="title" class="card-title">{{ title }}</h3>
          <p v-if="subtitle" class="card-subtitle">{{ subtitle }}</p>
        </div>
      </div>
      <div v-if="$slots.actions" class="header-actions">
        <slot name="actions" />
      </div>
    </div>

    <!-- Card Content -->
    <div class="card-content">
      <slot />
    </div>

    <!-- Card Footer -->
    <div v-if="$slots.footer" class="card-footer">
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  title?: string
  subtitle?: string
  icon?: any
  iconColor?: 'primary' | 'success' | 'warning' | 'error' | 'info'
  loading?: boolean
  clickable?: boolean
  elevated?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  iconColor: 'primary',
  size: 'md'
})

const emit = defineEmits<{
  click: []
}>()

const handleClick = () => {
  if (props.clickable && !props.loading) {
    emit('click')
  }
}
</script>

<style scoped>
.admin-card {
  background: #FFFFFF;
  border: 1px solid #F0F0F0;
  border-radius: 16px;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}

.admin-card.clickable {
  cursor: pointer;
}

.admin-card.clickable:hover {
  border-color: #00A86B;
  box-shadow: 0 4px 20px rgba(0, 168, 107, 0.1);
  transform: translateY(-2px);
}

.admin-card.elevated {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.admin-card.compact {
  border-radius: 12px;
}

.admin-card.large {
  border-radius: 20px;
}

.loading-overlay {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid #F0F0F0;
  border-top: 2px solid #00A86B;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 24px 24px 0 24px;
  margin-bottom: 16px;
}

.admin-card.compact .card-header {
  padding: 16px 16px 0 16px;
  margin-bottom: 12px;
}

.admin-card.large .card-header {
  padding: 32px 32px 0 32px;
  margin-bottom: 20px;
}

.header-content {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  flex: 1;
}

.header-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.admin-card.compact .header-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
}

.admin-card.large .header-icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
}

.header-icon.primary {
  background: #E8F5EF;
  color: #00A86B;
}

.header-icon.success {
  background: #E8F5EF;
  color: #00A86B;
}

.header-icon.warning {
  background: #FFF3E0;
  color: #F57C00;
}

.header-icon.error {
  background: #FFEBEE;
  color: #E53935;
}

.header-icon.info {
  background: #E3F2FD;
  color: #1976D2;
}

.icon {
  width: 24px;
  height: 24px;
}

.admin-card.compact .icon {
  width: 20px;
  height: 20px;
}

.admin-card.large .icon {
  width: 28px;
  height: 28px;
}

.header-text {
  flex: 1;
  min-width: 0;
}

.card-title {
  font-size: 18px;
  font-weight: 600;
  color: #1A1A1A;
  margin: 0 0 4px 0;
  line-height: 1.3;
}

.admin-card.compact .card-title {
  font-size: 16px;
}

.admin-card.large .card-title {
  font-size: 20px;
}

.card-subtitle {
  font-size: 14px;
  color: #666666;
  margin: 0;
  line-height: 1.4;
}

.admin-card.compact .card-subtitle {
  font-size: 13px;
}

.header-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.card-content {
  padding: 0 24px 24px 24px;
}

.admin-card.compact .card-content {
  padding: 0 16px 16px 16px;
}

.admin-card.large .card-content {
  padding: 0 32px 32px 32px;
}

.card-footer {
  padding: 16px 24px;
  border-top: 1px solid #F0F0F0;
  background: #FAFAFA;
}

.admin-card.compact .card-footer {
  padding: 12px 16px;
}

.admin-card.large .card-footer {
  padding: 20px 32px;
}

/* Responsive */
@media (max-width: 768px) {
  .card-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
  
  .header-content {
    align-items: center;
  }
  
  .header-actions {
    justify-content: flex-end;
  }
}
</style>