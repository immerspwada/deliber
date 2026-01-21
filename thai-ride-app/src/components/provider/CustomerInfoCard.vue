<!--
  CustomerInfoCard Component - Professional Redesign
  
  Design Standards:
  - Uber/Grab/Bolt inspired layout
  - Phone number visible at all times
  - One-tap call action
  - Touch targets ≥ 48px
  - High contrast for outdoor use
-->
<script setup lang="ts">
import { computed } from 'vue'

interface Customer {
  id: string
  name: string
  phone?: string
  avatar_url?: string
}

interface Props {
  customer: Customer | null
  distance?: string | null
  showActions?: boolean
}

interface Emits {
  (e: 'call'): void
  (e: 'chat'): void
}

const props = withDefaults(defineProps<Props>(), {
  showActions: true
})

const emit = defineEmits<Emits>()

// Format phone for display (e.g., 081-234-5678)
const formattedPhone = computed(() => {
  if (!props.customer?.phone) return null
  const phone = props.customer.phone.replace(/\D/g, '')
  if (phone.length === 10) {
    return `${phone.slice(0, 3)}-${phone.slice(3, 6)}-${phone.slice(6)}`
  }
  return props.customer.phone
})

// Get initials for avatar fallback
const initials = computed(() => {
  if (!props.customer?.name) return '?'
  return props.customer.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
})
</script>

<template>
  <article class="customer-card" aria-label="ข้อมูลลูกค้า">
    <!-- Main Info Row -->
    <div class="card-main">
      <!-- Avatar -->
      <div class="customer-avatar">
        <img 
          v-if="customer?.avatar_url" 
          :src="customer.avatar_url" 
          :alt="`รูปโปรไฟล์ ${customer.name}`"
          loading="lazy"
          decoding="async"
        />
        <span v-else class="avatar-initials">{{ initials }}</span>
      </div>

      <!-- Info -->
      <div class="customer-info">
        <h3 class="customer-name">{{ customer?.name || 'ลูกค้า' }}</h3>
        
        <!-- Phone Number - Always Visible -->
        <a 
          v-if="formattedPhone"
          :href="`tel:${customer?.phone}`"
          class="phone-link"
          @click.stop
        >
          <svg class="phone-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
          </svg>
          <span class="phone-number">{{ formattedPhone }}</span>
        </a>
        
        <p v-else-if="!customer" class="no-data">
          ไม่มีข้อมูลลูกค้า
        </p>
      </div>
    </div>

    <!-- Action Buttons - Large & Clear -->
    <div v-if="showActions && customer" class="action-buttons">
      <!-- Chat Button -->
      <button 
        class="btn-action btn-chat"
        @click="emit('chat')"
        type="button"
        :aria-label="`แชทกับ ${customer?.name || 'ลูกค้า'}`"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <span>แชท</span>
      </button>

      <!-- Call Button - Always show, with phone number -->
      <button 
        class="btn-action btn-call"
        :class="{ 'btn-disabled': !customer?.phone }"
        :disabled="!customer?.phone"
        @click="customer?.phone && emit('call')"
        type="button"
        :aria-label="customer?.phone ? `โทรหา ${customer.name} ${formattedPhone}` : 'ไม่มีเบอร์โทร'"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
        </svg>
        <span class="btn-text">
          <template v-if="formattedPhone">{{ formattedPhone }}</template>
          <template v-else>ไม่มีเบอร์</template>
        </span>
      </button>
    </div>
  </article>
</template>

<style scoped>
.customer-card {
  background: #FFFFFF;
  border-radius: 16px;
  margin: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

/* Main Info Row */
.card-main {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
}

/* Avatar */
.customer-avatar {
  width: 56px;
  height: 56px;
  min-width: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, #00A86B 0%, #008F5B 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}

.customer-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-initials {
  font-size: 20px;
  font-weight: 700;
  color: #FFFFFF;
  letter-spacing: 0.5px;
}

/* Info */
.customer-info {
  flex: 1;
  min-width: 0;
}

.customer-name {
  font-size: 18px;
  font-weight: 700;
  color: #111827;
  margin: 0 0 6px 0;
  line-height: 1.2;
}

/* Phone Link - Clickable */
.phone-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: #F0FDF4;
  border-radius: 20px;
  text-decoration: none;
  transition: all 0.2s;
}

.phone-link:active {
  background: #DCFCE7;
  transform: scale(0.98);
}

.phone-icon {
  width: 16px;
  height: 16px;
  color: #00A86B;
  flex-shrink: 0;
}

.phone-number {
  font-size: 15px;
  font-weight: 600;
  color: #00A86B;
  font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
  letter-spacing: 0.5px;
}

.no-data {
  font-size: 14px;
  color: #9CA3AF;
  margin: 0;
  font-style: italic;
}

/* Action Buttons */
.action-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1px;
  background: #E5E7EB;
  border-top: 1px solid #E5E7EB;
}

.btn-action {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 16px;
  background: #FFFFFF;
  border: none;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  min-height: 52px;
}

.btn-action svg {
  width: 22px;
  height: 22px;
}

.btn-action:active {
  background: #F3F4F6;
}

/* Call Button - Green with phone number */
.btn-call {
  color: #00A86B;
  flex-direction: column;
  gap: 2px;
}

.btn-call svg {
  color: #00A86B;
  width: 20px;
  height: 20px;
}

.btn-call .btn-text {
  font-size: 13px;
  font-weight: 600;
  font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
  letter-spacing: 0.3px;
}

.btn-call:active:not(:disabled) {
  background: #F0FDF4;
}

.btn-call.btn-disabled {
  color: #9CA3AF;
  cursor: not-allowed;
}

.btn-call.btn-disabled svg {
  color: #9CA3AF;
}

/* Chat Button - Gray */
.btn-chat {
  color: #374151;
}

.btn-chat svg {
  color: #6B7280;
}

/* Focus States */
.btn-action:focus-visible {
  outline: 2px solid #00A86B;
  outline-offset: -2px;
  z-index: 1;
}

.phone-link:focus-visible {
  outline: 2px solid #00A86B;
  outline-offset: 2px;
}

/* Responsive */
@media (max-width: 360px) {
  .customer-card {
    margin: 12px;
  }
  
  .card-main {
    padding: 14px;
    gap: 12px;
  }
  
  .customer-avatar {
    width: 48px;
    height: 48px;
    min-width: 48px;
  }
  
  .avatar-initials {
    font-size: 18px;
  }
  
  .customer-name {
    font-size: 16px;
  }
  
  .phone-number {
    font-size: 14px;
  }
  
  .btn-action {
    padding: 12px;
    font-size: 14px;
    min-height: 48px;
  }
  
  .btn-action svg {
    width: 20px;
    height: 20px;
  }
}
</style>
