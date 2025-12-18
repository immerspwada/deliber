<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const greeting = ref('')
const isLoaded = ref(false)

onMounted(() => {
  const hour = new Date().getHours()
  if (hour < 12) greeting.value = 'สวัสดีตอนเช้า'
  else if (hour < 17) greeting.value = 'สวัสดีตอนบ่าย'
  else greeting.value = 'สวัสดีตอนเย็น'
  
  isLoaded.value = true
})

const navigateTo = (path: string) => {
  router.push(path)
}

const services = [
  { id: 'rides', name: 'Rides', nameTh: 'เรียกรถ', icon: 'car', path: '/customer/services' },
  { id: 'rides-plus', name: 'Rides Plus', nameTh: 'รถพรีเมียม', icon: 'car-plus', path: '/customer/services' },
  { id: 'delivery', name: 'Send', nameTh: 'ส่งของ', icon: 'package', path: '/customer/delivery' },
  { id: 'shopping', name: 'Shopping', nameTh: 'ซื้อของ', icon: 'shopping', path: '/customer/shopping' },
]

const recentDestinations = [
  { id: 1, name: 'Sindra 1 - Dubai Hills Estate', icon: 'history' },
  { id: 2, name: 'Dubai Hills Mall', icon: 'history' },
  { id: 3, name: 'Repton School Al Barsha', icon: 'history' },
]
</script>

<template>
  <div class="home-page" :class="{ loaded: isLoaded }">
    <!-- Top Header -->
    <header class="top-header">
      <div class="header-content">
        <div class="logo-section">
          <div class="logo">
            <svg viewBox="0 0 40 40" fill="none">
              <circle cx="20" cy="20" r="18" stroke="#00A86B" stroke-width="2"/>
              <path d="M20 10L28 26H12L20 10Z" fill="#00A86B"/>
              <circle cx="20" cy="22" r="4" fill="#00A86B"/>
            </svg>
          </div>
          <span class="brand-name">THAIRIDE</span>
        </div>
        <button class="pay-button" @click="navigateTo('/customer/wallet')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="5" width="20" height="14" rx="2"/>
            <path d="M2 10h20"/>
          </svg>
          <span>Pay</span>
        </button>
      </div>
    </header>

    <!-- Main Content -->
    <main class="main-content">
      <!-- Hero Card -->
      <section class="hero-section">
        <div class="hero-card">
          <div class="hero-illustration">
            <svg viewBox="0 0 200 120" fill="none">
              <!-- Road -->
              <path d="M0 100 Q100 80 200 100" stroke="#E8E8E8" stroke-width="40" fill="none"/>
              <!-- Car -->
              <g transform="translate(70, 55)">
                <rect x="0" y="15" width="60" height="25" rx="8" fill="#00A86B"/>
                <rect x="8" y="5" width="44" height="20" rx="6" fill="#00A86B"/>
                <rect x="12" y="8" width="16" height="12" rx="2" fill="#E8F5EF"/>
                <rect x="32" y="8" width="16" height="12" rx="2" fill="#E8F5EF"/>
                <circle cx="15" cy="40" r="8" fill="#333"/>
                <circle cx="45" cy="40" r="8" fill="#333"/>
                <circle cx="15" cy="40" r="4" fill="#666"/>
                <circle cx="45" cy="40" r="4" fill="#666"/>
              </g>
              <!-- Trees -->
              <circle cx="30" cy="70" r="15" fill="#E8F5EF"/>
              <rect x="28" y="75" width="4" height="15" fill="#00A86B"/>
              <circle cx="170" cy="65" r="12" fill="#E8F5EF"/>
              <rect x="168" y="70" width="4" height="12" fill="#00A86B"/>
            </svg>
          </div>
          <div class="hero-content">
            <h2 class="hero-title">City Destination</h2>
            <p class="hero-subtitle">For those of you who want to go somewhere</p>
          </div>
          
          <!-- Search Input -->
          <button class="search-input" @click="navigateTo('/customer/services')">
            <div class="search-icon-wrapper">
              <svg viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="8" stroke="#E53935" stroke-width="2"/>
                <circle cx="12" cy="12" r="3" fill="#E53935"/>
              </svg>
            </div>
            <span class="search-placeholder">Where to?</span>
          </button>

          <!-- Promo Banner -->
          <button class="promo-banner" @click="navigateTo('/customer/promotions')">
            <span>Discount up to 20% use code : </span>
            <strong>FIRST20</strong>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 5l7 7-7 7"/>
            </svg>
          </button>
        </div>
      </section>

      <!-- Services Section -->
      <section class="services-section">
        <div class="section-header">
          <h3 class="section-title">Choose What You Need</h3>
          <p class="section-subtitle">For you who know what you want to ride.</p>
        </div>
        
        <div class="services-grid">
          <button 
            v-for="service in services" 
            :key="service.id" 
            class="service-item"
            @click="navigateTo(service.path)"
          >
            <div class="service-icon">
              <!-- Rides -->
              <svg v-if="service.id === 'rides'" viewBox="0 0 48 48" fill="none">
                <rect x="4" y="20" width="40" height="16" rx="4" fill="#00A86B"/>
                <rect x="8" y="12" width="32" height="14" rx="4" fill="#00A86B"/>
                <rect x="12" y="14" width="10" height="8" rx="2" fill="#E8F5EF"/>
                <rect x="26" y="14" width="10" height="8" rx="2" fill="#E8F5EF"/>
                <circle cx="14" cy="36" r="5" fill="#333"/>
                <circle cx="34" cy="36" r="5" fill="#333"/>
              </svg>
              <!-- Rides Plus -->
              <svg v-else-if="service.id === 'rides-plus'" viewBox="0 0 48 48" fill="none">
                <rect x="4" y="18" width="40" height="18" rx="4" fill="#1A1A1A"/>
                <rect x="8" y="10" width="32" height="14" rx="4" fill="#1A1A1A"/>
                <rect x="12" y="12" width="10" height="8" rx="2" fill="#4A4A4A"/>
                <rect x="26" y="12" width="10" height="8" rx="2" fill="#4A4A4A"/>
                <circle cx="14" cy="36" r="5" fill="#333"/>
                <circle cx="34" cy="36" r="5" fill="#333"/>
                <circle cx="40" cy="8" r="6" fill="#FFD700"/>
                <path d="M40 5v6M37 8h6" stroke="#1A1A1A" stroke-width="2"/>
              </svg>
              <!-- Delivery -->
              <svg v-else-if="service.id === 'delivery'" viewBox="0 0 48 48" fill="none">
                <rect x="8" y="12" width="24" height="24" rx="4" fill="#8B4513"/>
                <rect x="12" y="16" width="16" height="16" rx="2" fill="#D2691E"/>
                <path d="M20 16v16M12 24h16" stroke="#8B4513" stroke-width="2"/>
                <circle cx="36" cy="36" r="6" fill="#333"/>
                <rect x="28" y="28" width="16" height="12" rx="2" fill="#00A86B"/>
              </svg>
              <!-- Shopping -->
              <svg v-else-if="service.id === 'shopping'" viewBox="0 0 48 48" fill="none">
                <path d="M8 16h32l-4 20H12L8 16z" fill="#00A86B"/>
                <path d="M16 16V12a8 8 0 1116 0v4" stroke="#00A86B" stroke-width="3" fill="none"/>
                <circle cx="16" cy="40" r="4" fill="#333"/>
                <circle cx="32" cy="40" r="4" fill="#333"/>
                <rect x="18" y="22" width="12" height="8" rx="2" fill="#E8F5EF"/>
              </svg>
            </div>
            <span class="service-name">{{ service.name }}</span>
          </button>
        </div>
      </section>

      <!-- Recent Destinations -->
      <section class="recent-section">
        <div class="section-header">
          <h3 class="section-title">Recent destination</h3>
        </div>
        
        <div class="recent-list">
          <button 
            v-for="dest in recentDestinations" 
            :key="dest.id" 
            class="recent-item"
            @click="navigateTo('/customer/services')"
          >
            <div class="recent-icon">
              <svg viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="8" stroke="#E53935" stroke-width="2"/>
                <circle cx="12" cy="12" r="3" fill="#E53935"/>
              </svg>
            </div>
            <span class="recent-name">{{ dest.name }}</span>
          </button>
        </div>
      </section>

      <!-- Quick Actions -->
      <section class="quick-section">
        <div class="quick-grid">
          <button class="quick-item" @click="navigateTo('/customer/scheduled-rides')">
            <div class="quick-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2"/>
                <path d="M16 2v4M8 2v4M3 10h18"/>
              </svg>
            </div>
            <span>Schedule</span>
          </button>
          <button class="quick-item" @click="navigateTo('/customer/saved-places')">
            <div class="quick-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 21s-8-4.5-8-11.8A8 8 0 0112 2a8 8 0 018 7.2c0 7.3-8 11.8-8 11.8z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
            </div>
            <span>Saved</span>
          </button>
          <button class="quick-item" @click="navigateTo('/customer/promotions')">
            <div class="quick-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2L15 8.5L22 9.5L17 14.5L18 21.5L12 18L6 21.5L7 14.5L2 9.5L9 8.5L12 2Z"/>
              </svg>
            </div>
            <span>Promos</span>
          </button>
          <button class="quick-item" @click="navigateTo('/customer/wallet')">
            <div class="quick-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="5" width="20" height="14" rx="2"/>
                <path d="M2 10h20"/>
                <circle cx="17" cy="14" r="2"/>
              </svg>
            </div>
            <span>Wallet</span>
          </button>
        </div>
      </section>

      <!-- Provider CTA -->
      <section class="provider-section">
        <button class="provider-card" @click="navigateTo('/provider')">
          <div class="provider-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 6v6l4 2"/>
            </svg>
          </div>
          <div class="provider-content">
            <span class="provider-title">Become a Driver</span>
            <span class="provider-subtitle">Earn money with ThaiRide</span>
          </div>
          <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 5l7 7-7 7"/>
          </svg>
        </button>
      </section>
    </main>

    <!-- Bottom Navigation -->
    <nav class="bottom-nav">
      <button class="nav-item active">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
        </svg>
        <span>Home</span>
      </button>
      <button class="nav-item" @click="navigateTo('/customer/help')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/>
          <circle cx="12" cy="17" r="1"/>
        </svg>
        <span>Help</span>
      </button>
      <button class="nav-item" @click="navigateTo('/customer/history')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12,6 12,12 16,14"/>
        </svg>
        <span>Activity</span>
      </button>
      <button class="nav-item" @click="navigateTo('/customer/profile')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="8" r="4"/>
          <path d="M20 21a8 8 0 10-16 0"/>
        </svg>
        <span>Profile</span>
      </button>
    </nav>
  </div>
</template>

<style scoped>
.home-page {
  min-height: 100vh;
  background-color: #FFFFFF;
  padding-bottom: 80px;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.home-page.loaded {
  opacity: 1;
}

/* Top Header */
.top-header {
  position: sticky;
  top: 0;
  background: #FFFFFF;
  z-index: 100;
  border-bottom: 1px solid #F0F0F0;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  max-width: 480px;
  margin: 0 auto;
}

.logo-section {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo svg {
  width: 36px;
  height: 36px;
}

.brand-name {
  font-size: 18px;
  font-weight: 700;
  color: #00A86B;
  letter-spacing: 1px;
}

.pay-button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  background: #00A86B;
  color: white;
  border: none;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.pay-button svg {
  width: 18px;
  height: 18px;
}

.pay-button:active {
  transform: scale(0.96);
}

/* Main Content */
.main-content {
  max-width: 480px;
  margin: 0 auto;
  padding: 0 16px;
}

/* Hero Section */
.hero-section {
  padding: 16px 0;
}

.hero-card {
  background: #FFFFFF;
  border-radius: 20px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  border: 1px solid #F0F0F0;
}

.hero-illustration {
  display: flex;
  justify-content: center;
  margin-bottom: 16px;
}

.hero-illustration svg {
  width: 100%;
  max-width: 240px;
  height: auto;
}

.hero-content {
  text-align: center;
  margin-bottom: 20px;
}

.hero-title {
  font-size: 22px;
  font-weight: 700;
  color: #1A1A1A;
  margin-bottom: 4px;
}

.hero-subtitle {
  font-size: 14px;
  color: #666666;
}

.search-input {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 14px 16px;
  background: #F5F5F5;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  margin-bottom: 12px;
}

.search-input:active {
  background: #EBEBEB;
}

.search-icon-wrapper {
  width: 24px;
  height: 24px;
}

.search-icon-wrapper svg {
  width: 100%;
  height: 100%;
}

.search-placeholder {
  font-size: 16px;
  color: #999999;
}

.promo-banner {
  display: flex;
  align-items: center;
  gap: 4px;
  width: 100%;
  padding: 12px 16px;
  background: #00A86B;
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 13px;
  cursor: pointer;
}

.promo-banner strong {
  margin-left: 4px;
}

.promo-banner svg {
  width: 16px;
  height: 16px;
  margin-left: auto;
}

.promo-banner:active {
  opacity: 0.9;
}

/* Services Section */
.services-section {
  padding: 20px 0;
}

.section-header {
  margin-bottom: 16px;
}

.section-title {
  font-size: 18px;
  font-weight: 700;
  color: #1A1A1A;
  margin-bottom: 4px;
}

.section-subtitle {
  font-size: 13px;
  color: #666666;
}

.services-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.service-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 8px;
  background: #FFFFFF;
  border: 1px solid #F0F0F0;
  border-radius: 16px;
  cursor: pointer;
}

.service-item:active {
  background: #F5F5F5;
  transform: scale(0.96);
}

.service-icon {
  width: 48px;
  height: 48px;
}

.service-icon svg {
  width: 100%;
  height: 100%;
}

.service-name {
  font-size: 12px;
  font-weight: 600;
  color: #1A1A1A;
  text-align: center;
}

/* Recent Section */
.recent-section {
  padding: 16px 0;
}

.recent-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.recent-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  background: #FFFFFF;
  border: 1px solid #F0F0F0;
  border-radius: 12px;
  cursor: pointer;
  text-align: left;
  width: 100%;
}

.recent-item:active {
  background: #F5F5F5;
}

.recent-icon {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
}

.recent-icon svg {
  width: 100%;
  height: 100%;
}

.recent-name {
  font-size: 15px;
  color: #1A1A1A;
  flex: 1;
}

/* Quick Section */
.quick-section {
  padding: 16px 0;
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.quick-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 8px;
  background: #F5F5F5;
  border: none;
  border-radius: 12px;
  cursor: pointer;
}

.quick-item:active {
  background: #EBEBEB;
  transform: scale(0.96);
}

.quick-icon {
  width: 28px;
  height: 28px;
  color: #1A1A1A;
}

.quick-icon svg {
  width: 100%;
  height: 100%;
}

.quick-item span {
  font-size: 12px;
  font-weight: 500;
  color: #1A1A1A;
}

/* Provider Section */
.provider-section {
  padding: 16px 0 24px;
}

.provider-card {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 18px 16px;
  background: #FFFFFF;
  border: 2px solid #00A86B;
  border-radius: 16px;
  cursor: pointer;
  text-align: left;
}

.provider-card:active {
  background: #E8F5EF;
}

.provider-icon {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #E8F5EF;
  border-radius: 12px;
  color: #00A86B;
}

.provider-icon svg {
  width: 24px;
  height: 24px;
}

.provider-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.provider-title {
  font-size: 16px;
  font-weight: 600;
  color: #1A1A1A;
}

.provider-subtitle {
  font-size: 13px;
  color: #666666;
}

.chevron {
  width: 20px;
  height: 20px;
  color: #00A86B;
}

/* Bottom Navigation */
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-around;
  background: #FFFFFF;
  border-top: 1px solid #F0F0F0;
  padding: 8px 0;
  padding-bottom: calc(8px + env(safe-area-inset-bottom));
  z-index: 100;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
  background: none;
  border: none;
  cursor: pointer;
  color: #999999;
}

.nav-item.active {
  color: #00A86B;
}

.nav-item svg {
  width: 24px;
  height: 24px;
}

.nav-item span {
  font-size: 11px;
  font-weight: 500;
}

.nav-item:active {
  opacity: 0.7;
}
</style>
