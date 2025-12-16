<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import SkeletonLoader from '../components/SkeletonLoader.vue'

const router = useRouter()
const authStore = useAuthStore()

const greeting = ref('')
const currentTime = ref('')
const isLoaded = ref(false)
const loading = ref(true)

onMounted(() => {
  const hour = new Date().getHours()
  if (hour < 12) greeting.value = 'สวัสดีตอนเช้า'
  else if (hour < 17) greeting.value = 'สวัสดีตอนบ่าย'
  else greeting.value = 'สวัสดีตอนเย็น'

  const updateTime = () => {
    const now = new Date()
    currentTime.value = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
  }
  updateTime()
  setInterval(updateTime, 60000)
  
  setTimeout(() => isLoaded.value = true, 100)
  
  // Simulate loading data
  setTimeout(() => {
    loading.value = false
  }, 800)
})

const navigateTo = (path: string) => {
  router.push(path)
}

const recentTrips = [
  { id: 1, from: 'สยามพารากอน', to: 'สถานีรถไฟฟ้าอโศก', date: 'วันนี้ 14:30', fare: 85 },
  { id: 2, from: 'เซ็นทรัลเวิลด์', to: 'สีลม', date: 'เมื่อวาน 18:45', fare: 95 }
]
</script>

<template>
  <div class="home-page" :class="{ loaded: isLoaded }">
    <!-- Hero Header -->
    <header class="hero-header">
      <div class="hero-content">
        <div class="hero-top">
          <div class="greeting-section">
            <p class="greeting-label">{{ greeting }}</p>
            <h1 class="user-name">{{ authStore.user?.name || 'ผู้ใช้' }}</h1>
          </div>
          <button class="notification-btn" @click="navigateTo('/notifications')">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
            </svg>
            <span class="notification-badge">2</span>
          </button>
        </div>

        <!-- Main Search -->
        <button class="search-card" @click="navigateTo('/services')">
          <div class="search-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </div>
          <span class="search-text">ไปไหนดี?</span>
          <div class="search-time-badge">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span>ตอนนี้</span>
          </div>
        </button>
      </div>
    </header>

    <main class="main-content">
      <!-- Services Grid -->
      <section class="services-section">
        <SkeletonLoader v-if="loading" type="services" />
        <div v-else class="services-grid">
          <button class="service-card" @click="navigateTo('/services')">
            <div class="service-icon-wrapper">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 17h.01M16 17h.01M9 11h6M5 11l1.5-4.5A2 2 0 018.4 5h7.2a2 2 0 011.9 1.5L19 11M5 11v6a1 1 0 001 1h1a1 1 0 001-1v-1h8v1a1 1 0 001 1h1a1 1 0 001-1v-6M5 11h14"/>
              </svg>
            </div>
            <div class="service-info">
              <span class="service-name">เรียกรถ</span>
              <span class="service-desc">รับส่งทุกที่</span>
            </div>
          </button>

          <button class="service-card" @click="navigateTo('/delivery')">
            <div class="service-icon-wrapper">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
              </svg>
            </div>
            <div class="service-info">
              <span class="service-name">ส่งของ</span>
              <span class="service-desc">ส่งด่วนทันใจ</span>
            </div>
          </button>

          <button class="service-card" @click="navigateTo('/shopping')">
            <div class="service-icon-wrapper">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
              </svg>
            </div>
            <div class="service-info">
              <span class="service-name">ซื้อของ</span>
              <span class="service-desc">ซื้อให้ถึงบ้าน</span>
            </div>
          </button>
        </div>
      </section>

      <!-- Quick Access -->
      <section class="quick-section">
        <SkeletonLoader v-if="loading" type="quick-actions" />
        <div v-else class="quick-row">
          <button class="quick-item" @click="navigateTo('/scheduled-rides')">
            <div class="quick-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
            </div>
            <span>จองล่วงหน้า</span>
          </button>
          <button class="quick-item" @click="navigateTo('/subscription')">
            <div class="quick-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
              </svg>
            </div>
            <span>แพ็คเกจ</span>
          </button>
          <button class="quick-item" @click="navigateTo('/wallet')">
            <div class="quick-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
              </svg>
            </div>
            <span>Wallet</span>
          </button>
          <button class="quick-item" @click="navigateTo('/promotions')">
            <div class="quick-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
              </svg>
            </div>
            <span>โปรโมชั่น</span>
          </button>
        </div>
      </section>

      <!-- More Features -->
      <section class="more-features">
        <SkeletonLoader v-if="loading" type="more-features" />
        <div v-else class="features-row">
          <button class="feature-item" @click="navigateTo('/insurance')">
            <div class="feature-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
              </svg>
            </div>
            <span>ประกันภัย</span>
          </button>
          <button class="feature-item" @click="navigateTo('/favorite-drivers')">
            <div class="feature-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
              </svg>
            </div>
            <span>คนขับโปรด</span>
          </button>
          <button class="feature-item" @click="navigateTo('/saved-places')">
            <div class="feature-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
            </div>
            <span>สถานที่บันทึก</span>
          </button>
          <button class="feature-item" @click="navigateTo('/referral')">
            <div class="feature-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
              </svg>
            </div>
            <span>ชวนเพื่อน</span>
          </button>
        </div>
      </section>

      <!-- Promo Banner -->
      <section class="promo-section">
        <SkeletonLoader v-if="loading" type="promo" />
        <button v-else class="promo-card" @click="navigateTo('/promotions')">
          <div class="promo-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"/>
            </svg>
          </div>
          <div class="promo-content">
            <span class="promo-title">ส่วนลด 50 บาท</span>
            <span class="promo-subtitle">สำหรับการเดินทางครั้งแรก</span>
          </div>
          <div class="promo-code-badge">FIRST50</div>
        </button>
      </section>

      <!-- Recent Trips -->
      <section class="recent-section">
        <div class="section-header">
          <h2 class="section-title">การเดินทางล่าสุด</h2>
          <button class="see-all-btn" @click="navigateTo('/history')">ดูทั้งหมด</button>
        </div>

        <SkeletonLoader v-if="loading" type="recent-trips" :count="2" />
        <div v-else class="trips-list">
          <button v-for="trip in recentTrips" :key="trip.id" class="trip-card" @click="navigateTo('/services')">
            <div class="trip-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 17h.01M16 17h.01M9 11h6M5 11l1.5-4.5A2 2 0 018.4 5h7.2a2 2 0 011.9 1.5L19 11M5 11v6a1 1 0 001 1h1a1 1 0 001-1v-1h8v1a1 1 0 001 1h1a1 1 0 001-1v-6M5 11h14"/>
              </svg>
            </div>
            <div class="trip-details">
              <div class="trip-route">
                <span class="trip-from">{{ trip.from }}</span>
                <svg class="arrow-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"/>
                </svg>
                <span class="trip-to">{{ trip.to }}</span>
              </div>
              <span class="trip-date">{{ trip.date }}</span>
            </div>
            <span class="trip-fare">฿{{ trip.fare }}</span>
          </button>
        </div>
      </section>

      <!-- Provider CTA -->
      <section class="provider-section">
        <button class="provider-card" @click="navigateTo('/provider')">
          <div class="provider-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <div class="provider-content">
            <span class="provider-title">เป็นผู้ให้บริการ</span>
            <span class="provider-subtitle">สร้างรายได้กับ ThaiRide</span>
          </div>
          <svg class="chevron-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
          </svg>
        </button>
      </section>
    </main>
  </div>
</template>

<style scoped>
.home-page {
  min-height: 100vh;
  background-color: #F6F6F6;
  padding-bottom: 100px;
  opacity: 0;
  transform: translateY(10px);
  transition: opacity 0.4s ease, transform 0.4s ease;
}

.home-page.loaded {
  opacity: 1;
  transform: translateY(0);
}

/* Hero Header */
.hero-header {
  background-color: #000;
  color: #fff;
  padding: 20px 16px 36px;
  border-radius: 0 0 32px 32px;
}

.hero-content {
  max-width: 480px;
  margin: 0 auto;
}

.hero-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.greeting-label {
  font-size: 14px;
  opacity: 0.7;
  margin-bottom: 4px;
}

.user-name {
  font-size: 26px;
  font-weight: 700;
  letter-spacing: -0.5px;
}

.notification-btn {
  position: relative;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.notification-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.notification-btn:active {
  transform: scale(0.92);
  background: rgba(255, 255, 255, 0.25);
}

.notification-btn svg {
  width: 22px;
  height: 22px;
  color: #fff;
}

.notification-badge {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #E11900;
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  border-radius: 50%;
}

/* Search Card */
.search-card {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 16px;
  background: #fff;
  border: none;
  border-radius: 14px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  min-height: 64px;
}

.search-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.search-card:active {
  transform: scale(0.98);
  background: #FAFAFA;
}

.search-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #F6F6F6;
  border-radius: 50%;
}

.search-icon svg {
  width: 20px;
  height: 20px;
  color: #6B6B6B;
}

.search-text {
  flex: 1;
  font-size: 18px;
  font-weight: 500;
  color: #6B6B6B;
}

.search-time-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: #F6F6F6;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
  color: #000;
}

.search-time-badge svg {
  width: 16px;
  height: 16px;
}

/* Main Content */
.main-content {
  max-width: 480px;
  margin: 0 auto;
  padding: 0 16px;
}

/* Services Section */
.services-section {
  margin-top: -12px;
  margin-bottom: 20px;
  position: relative;
  z-index: 1;
}

.services-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.service-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 12px;
  background: #fff;
  border: none;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  min-height: 120px;
}

.service-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.service-card:active {
  transform: scale(0.95);
  background: #F6F6F6;
}

.service-icon-wrapper {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #F6F6F6;
  border-radius: 16px;
  margin-bottom: 12px;
  transition: all 0.2s ease;
}

.service-card:hover .service-icon-wrapper {
  background: #000;
}

.service-card:hover .service-icon-wrapper svg {
  color: #fff;
}

.service-icon-wrapper svg {
  width: 28px;
  height: 28px;
  color: #000;
  transition: color 0.2s ease;
}

.service-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.service-name {
  font-size: 15px;
  font-weight: 600;
  color: #000;
}

.service-desc {
  font-size: 12px;
  color: #6B6B6B;
}

/* Quick Section */
.quick-section {
  margin-bottom: 20px;
}

.quick-row {
  display: flex;
  gap: 8px;
}

.quick-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 14px 8px;
  background: #fff;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  min-height: 80px;
}

.quick-item:hover {
  background: #F6F6F6;
}

.quick-item:active {
  transform: scale(0.94);
  background: #EBEBEB;
}

.quick-icon {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #F6F6F6;
  border-radius: 50%;
}

.quick-icon svg {
  width: 22px;
  height: 22px;
  color: #000;
}

.quick-item span {
  font-size: 12px;
  font-weight: 500;
  color: #000;
}

/* More Features */
.more-features {
  margin-bottom: 20px;
}

.features-row {
  display: flex;
  gap: 8px;
}

.feature-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 14px 8px;
  background: #fff;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  min-height: 80px;
}

.feature-item:hover {
  background: #F6F6F6;
}

.feature-item:active {
  transform: scale(0.94);
  background: #EBEBEB;
}

.feature-icon {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #F6F6F6;
  border-radius: 50%;
}

.feature-icon svg {
  width: 22px;
  height: 22px;
  color: #000;
}

.feature-item span {
  font-size: 11px;
  font-weight: 500;
  color: #000;
  text-align: center;
}

/* Promo Section */
.promo-section {
  margin-bottom: 24px;
}

.promo-card {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 16px;
  background: #000;
  border: none;
  border-radius: 16px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;
}

.promo-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
}

.promo-card:active {
  transform: translateY(0);
}

.promo-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 12px;
}

.promo-icon svg {
  width: 24px;
  height: 24px;
  color: #fff;
}

.promo-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.promo-title {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
}

.promo-subtitle {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
}

.promo-code-badge {
  padding: 8px 14px;
  background: #fff;
  color: #000;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.5px;
}

/* Recent Section */
.recent-section {
  margin-bottom: 24px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.section-title {
  font-size: 18px;
  font-weight: 700;
  color: #000;
}

.see-all-btn {
  font-size: 14px;
  font-weight: 500;
  color: #6B6B6B;
  background: none;
  border: none;
  cursor: pointer;
  transition: color 0.2s ease;
}

.see-all-btn:hover {
  color: #000;
}

.trips-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.trip-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  background: #fff;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  text-align: left;
  width: 100%;
  transition: all 0.2s ease;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  min-height: 72px;
}

.trip-card:hover {
  background: #FAFAFA;
}

.trip-card:active {
  transform: scale(0.98);
  background: #F6F6F6;
}

.trip-icon {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #F6F6F6;
  border-radius: 12px;
  flex-shrink: 0;
}

.trip-icon svg {
  width: 22px;
  height: 22px;
  color: #000;
}

.trip-details {
  flex: 1;
  min-width: 0;
}

.trip-route {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}

.trip-from, .trip-to {
  font-size: 14px;
  font-weight: 500;
  color: #000;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.arrow-icon {
  width: 14px;
  height: 14px;
  color: #6B6B6B;
  flex-shrink: 0;
}

.trip-date {
  font-size: 13px;
  color: #6B6B6B;
}

.trip-fare {
  font-size: 16px;
  font-weight: 700;
  color: #000;
  flex-shrink: 0;
}

/* Provider Section */
.provider-section {
  margin-bottom: 24px;
}

.provider-card {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 18px 16px;
  background: #fff;
  border: 2px solid #E5E5E5;
  border-radius: 16px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;
}

.provider-card:hover {
  border-color: #000;
}

.provider-card:active {
  transform: scale(0.99);
}

.provider-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #F6F6F6;
  border-radius: 12px;
}

.provider-icon svg {
  width: 24px;
  height: 24px;
  color: #000;
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
  color: #000;
}

.provider-subtitle {
  font-size: 13px;
  color: #6B6B6B;
}

.chevron-icon {
  width: 20px;
  height: 20px;
  color: #6B6B6B;
  transition: transform 0.2s ease;
}

.provider-card:hover .chevron-icon {
  transform: translateX(4px);
}
</style>
