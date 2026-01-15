<!--
  CustomerInfoCard Component
  Display customer information with contact actions
  Design: Professional, Touch-friendly, Accessible
-->
<script setup lang="ts">
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
</script>

<template>
  <article class="customer-card" aria-label="ข้อมูลลูกค้า">
    <!-- Avatar -->
    <div class="customer-avatar">
      <img 
        v-if="customer?.avatar_url" 
        :src="customer.avatar_url" 
        :alt="`รูปโปรไฟล์ ${customer.name}`"
        loading="lazy"
        decoding="async"
      />
      <!-- User Icon Fallback -->
      <svg 
        v-else 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        stroke-width="2"
        aria-hidden="true"
      >
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    </div>

    <!-- Info -->
    <div class="customer-info">
      <h3>{{ customer?.name || 'ลูกค้า' }}</h3>
      <p v-if="distance" class="distance-info">
        <span aria-hidden="true">📍</span> ห่าง {{ distance }}
      </p>
      <p v-else-if="!customer" class="no-data">
        ไม่มีข้อมูลลูกค้า
      </p>
    </div>

    <!-- Contact Buttons -->
    <div v-if="showActions" class="contact-buttons">
      <button 
        v-if="customer?.phone"
        class="btn-contact btn-call"
        @click="emit('call')"
        type="button"
        :aria-label="`โทรหา ${customer.name}`"
      >
        <!-- Phone Icon -->
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
        </svg>
      </button>
      
      <button 
        class="btn-contact btn-chat"
        @click="emit('chat')"
        type="button"
        :aria-label="`แชทกับ ${customer?.name || 'ลูกค้า'}`"
      >
        <!-- Chat Icon -->
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      </button>
    </div>
  </article>
</template>

<style scoped>
.customer-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #FFFFFF;
  border-radius: 16px;
  margin: 0 16px 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

/* Avatar */
.customer-avatar {
  width: 48px;
  height: 48px;
  min-width: 48px;
  min-height: 48px;
  border-radius: 50%;
  background: #E8F5EF;
  border: 2px solid #00A86B;
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

.customer-avatar svg {
  width: 24px;
  height: 24px;
  color: #00A86B;
}

/* Info */
.customer-info {
  flex: 1;
  min-width: 0;
}

.customer-info h3 {
  font-size: 16px;
  font-weight: 700;
  color: #111827;
  margin: 0 0 4px 0;
  line-height: 1.3;
}

.customer-info p {
  font-size: 13px;
  color: #6B7280;
  margin: 0;
  font-weight: 500;
  line-height: 1.4;
}

.distance-info {
  display: flex;
  align-items: center;
  gap: 4px;
}

.no-data {
  font-style: italic;
}

/* Contact Buttons */
.contact-buttons {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.btn-contact {
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
  border-radius: 50%;
  background: #00A86B;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  padding: 10px;
}

.btn-contact svg {
  width: 20px;
  height: 20px;
  color: #fff;
}

.btn-contact:active {
  transform: scale(0.95);
  background: #008F5B;
}

.btn-contact:focus-visible {
  outline: 2px solid #00A86B;
  outline-offset: 2px;
}

/* Responsive */
@media (max-width: 360px) {
  .customer-card {
    margin: 0 16px 16px;
    padding: 14px;
  }
  
  .customer-avatar {
    width: 44px;
    height: 44px;
    min-width: 44px;
    min-height: 44px;
  }
  
  .customer-info h3 {
    font-size: 15px;
  }
}
</style>
