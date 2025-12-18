<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'
import PullToRefresh from '../components/PullToRefresh.vue'

const router = useRouter()
const authStore = useAuthStore()

const loading = ref(true)
const refreshing = ref(false)
const activeTab = ref<'available' | 'favorites' | 'used'>('available')
const activeCategory = ref<'all' | 'ride' | 'delivery' | 'shopping'>('all')
const promos = ref<any[]>([])
const favoriteIds = ref<Set<string>>(new Set())
const promoInput = ref('')
const copiedCode = ref<string | null>(null)
const applyingCode = ref(false)
const applyError = ref('')
const shareToast = ref<string | null>(null)
const favoriteToast = ref<string | null>(null)
const newPromoToast = ref<any>(null)
let promoSubscription: any = null



// Track animating favorites
const animatingFavId = ref<string | null>(null)

const categories = [
  { id: 'all', label: 'ทั้งหมด', icon: 'grid' },
  { id: 'ride', label: 'เรียกรถ', icon: 'car' },
  { id: 'delivery', label: 'ส่งของ', icon: 'box' },
  { id: 'shopping', label: 'ซื้อของ', icon: 'cart' }
]

const availablePromos = computed(() =>
  promos.value.filter((p) => !p.used && new Date(p.valid_until) > new Date())
)
const usedPromos = computed(() => promos.value.filter((p) => p.used))
const favoritePromos = computed(() => availablePromos.value.filter((p) => favoriteIds.value.has(p.id)))

// Filter by category
const filteredPromos = computed(() => {
  const base = activeTab.value === 'favorites' ? favoritePromos.value : availablePromos.value
  if (activeCategory.value === 'all') return base
  return base.filter((p) => p.category === activeCategory.value || p.category === 'all')
})

// Featured promo (highest discount in current category)
const featuredPromo = computed(() => {
  if (filteredPromos.value.length === 0) return null
  return filteredPromos.value.reduce((best, current) => {
    const bestValue = best.discount_type === 'fixed' ? best.discount_value : best.max_discount || 100
    const currentValue = current.discount_type === 'fixed' ? current.discount_value : current.max_discount || 100
    return currentValue > bestValue ? current : best
  })
})

// Promos expiring soon (within 3 days)
const expiringSoon = computed(() => {
  const threeDaysLater = new Date()
  threeDaysLater.setDate(threeDaysLater.getDate() + 3)
  return filteredPromos.value.filter(
    (p) => new Date(p.valid_until) <= threeDaysLater && p.id !== featuredPromo.value?.id
  )
})

// Regular promos
const regularPromos = computed(() =>
  filteredPromos.value.filter(
    (p) => p.id !== featuredPromo.value?.id && !expiringSoon.value.find((e) => e.id === p.id)
  )
)

const fetchPromos = async () => {
  try {
    const { data } = await (supabase.from('promo_codes') as any)
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    // Fetch favorites
    if (authStore.user?.id) {
      const { data: favData } = await supabase.from('favorite_promos').select('promo_id').eq('user_id', authStore.user.id)
      if (favData) favoriteIds.value = new Set(favData.map((f: any) => f.promo_id))
    }

    if (data) {
      promos.value = data.map((p: any) => ({ ...p, used: false, category: p.category || 'all' }))
    }
  } catch {
    // Fallback data matching real promo codes with usage tracking
    const now = new Date()
    const addDays = (days: number) => new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString()
    promos.value = [
      // Ride promos
      { id: '1', code: 'RIDE50', discount_type: 'fixed', discount_value: 50, min_order_amount: 100, valid_until: addDays(30), description: 'ส่วนลด ฿50 สำหรับเรียกรถครั้งแรก', used: false, category: 'ride', used_count: 45, usage_limit: 1000 },
      { id: '2', code: 'RIDEWEEKEND', discount_type: 'percentage', discount_value: 20, min_order_amount: 80, max_discount: 100, valid_until: addDays(14), description: 'ลด 20% เรียกรถวันหยุด', used: false, category: 'ride', used_count: 123, usage_limit: 500 },
      { id: '3', code: 'NIGHTRIDE', discount_type: 'fixed', discount_value: 30, min_order_amount: 50, valid_until: addDays(7), description: 'ลด ฿30 เรียกรถกลางคืน 22:00-06:00', used: false, category: 'ride', used_count: 67, usage_limit: 300 },
      { id: '4', code: 'AIRPORT100', discount_type: 'fixed', discount_value: 100, min_order_amount: 300, valid_until: addDays(60), description: 'ลด ฿100 เดินทางไป-กลับสนามบิน', used: false, category: 'ride', used_count: 89, usage_limit: 200 },
      // Delivery promos
      { id: '5', code: 'DELFREE', discount_type: 'fixed', discount_value: 40, min_order_amount: 0, valid_until: addDays(3), description: 'ส่งฟรี! ไม่มีขั้นต่ำ', used: false, category: 'delivery', used_count: 492, usage_limit: 500 },
      { id: '6', code: 'DEL15', discount_type: 'percentage', discount_value: 15, min_order_amount: 50, max_discount: 80, valid_until: addDays(21), description: 'ลด 15% ค่าส่งของ', used: false, category: 'delivery', used_count: 156, usage_limit: 1000 },
      { id: '7', code: 'FASTDEL', discount_type: 'fixed', discount_value: 25, min_order_amount: 100, valid_until: addDays(14), description: 'ลด ฿25 ส่งด่วนภายใน 1 ชม.', used: false, category: 'delivery', used_count: 78, usage_limit: 400 },
      // Shopping promos
      { id: '8', code: 'SHOP100', discount_type: 'fixed', discount_value: 100, min_order_amount: 500, valid_until: addDays(30), description: 'ลด ฿100 ซื้อของครบ ฿500', used: false, category: 'shopping', used_count: 45, usage_limit: 300 },
      { id: '9', code: 'SHOPNEW', discount_type: 'percentage', discount_value: 25, min_order_amount: 200, max_discount: 150, valid_until: addDays(45), description: 'ลด 25% สำหรับผู้ใช้ใหม่', used: false, category: 'shopping', used_count: 112, usage_limit: 500 },
      { id: '10', code: 'GROCERY20', discount_type: 'percentage', discount_value: 20, min_order_amount: 150, max_discount: 100, valid_until: addDays(10), description: 'ลด 20% ซื้อของสด', used: false, category: 'shopping', used_count: 89, usage_limit: 600 },
      // All categories promos
      { id: '11', code: 'NEWYEAR2025', discount_type: 'fixed', discount_value: 150, min_order_amount: 300, valid_until: addDays(45), description: 'ฉลองปีใหม่ ลด ฿150', used: false, category: 'all', used_count: 567, usage_limit: 2000 },
      { id: '12', code: 'GOBEAR10', discount_type: 'percentage', discount_value: 10, min_order_amount: 50, max_discount: 200, valid_until: addDays(90), description: 'ลด 10% ทุกบริการ', used: false, category: 'all', used_count: 1234, usage_limit: null },
      { id: '13', code: 'WELCOME', discount_type: 'fixed', discount_value: 80, min_order_amount: 150, valid_until: addDays(365), description: 'ยินดีต้อนรับ ลด ฿80', used: false, category: 'all', used_count: 3456, usage_limit: null },
      { id: '14', code: 'RAINY30', discount_type: 'fixed', discount_value: 30, min_order_amount: 80, valid_until: addDays(2), description: 'หน้าฝน ลด ฿30', used: false, category: 'all', used_count: 792, usage_limit: 800 },
      // Expiring soon promos
      { id: '15', code: 'LASTCHANCE', discount_type: 'percentage', discount_value: 30, min_order_amount: 100, max_discount: 200, valid_until: addDays(1), description: 'โอกาสสุดท้าย! ลด 30%', used: false, category: 'all', used_count: 92, usage_limit: 100 },
      { id: '16', code: 'FLASH50', discount_type: 'fixed', discount_value: 50, min_order_amount: 100, valid_until: addDays(2), description: 'Flash Sale ลด ฿50', used: false, category: 'ride', used_count: 47, usage_limit: 50 },
      // Used promo for testing
      { id: '17', code: 'USED100', discount_type: 'fixed', discount_value: 100, min_order_amount: 200, valid_until: addDays(-5), description: 'โปรที่ใช้แล้ว', used: true, category: 'all', used_count: 100, usage_limit: 100 }
    ]
  } finally {
    loading.value = false
  }
}

const toggleFavorite = async (promo: any) => {
  if (!authStore.user?.id) {
    router.push('/login')
    return
  }
  const isFav = favoriteIds.value.has(promo.id)
  
  // Trigger animation
  animatingFavId.value = promo.id
  setTimeout(() => (animatingFavId.value = null), 400)
  
  try {
    if (isFav) {
      await (supabase.from('favorite_promos') as any).delete().eq('user_id', authStore.user.id).eq('promo_id', promo.id)
      favoriteIds.value.delete(promo.id)
      favoriteToast.value = 'ลบออกจากรายการโปรด'
    } else {
      await (supabase.from('favorite_promos') as any).insert({ user_id: authStore.user.id, promo_id: promo.id })
      favoriteIds.value.add(promo.id)
      favoriteToast.value = 'เพิ่มในรายการโปรดแล้ว'
    }
    setTimeout(() => (favoriteToast.value = null), 2000)
  } catch (err) {
    console.error('Error toggling favorite:', err)
  }
}

// Get usage info text
const getUsageInfo = (promo: any) => {
  if (!promo.usage_limit) return null
  const remaining = promo.usage_limit - (promo.used_count || 0)
  if (remaining <= 10) return `เหลือ ${remaining} สิทธิ์`
  return `ใช้แล้ว ${promo.used_count || 0}/${promo.usage_limit}`
}

const subscribeToNewPromos = () => {
  promoSubscription = supabase
    .channel('new-promos')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'promo_codes' }, (payload) => {
      const newPromo = payload.new as any
      if (newPromo.is_active) {
        promos.value.unshift({ ...newPromo, used: false, category: newPromo.category || 'all' })
        newPromoToast.value = newPromo
        setTimeout(() => (newPromoToast.value = null), 5000)
      }
    })
    .subscribe()
}

const handleRefresh = async () => {
  refreshing.value = true
  await fetchPromos()
  refreshing.value = false
}

const applyPromoCode = async () => {
  if (!promoInput.value.trim()) return
  applyingCode.value = true
  applyError.value = ''
  await new Promise((r) => setTimeout(r, 1000))
  const found = promos.value.find((p) => p.code.toLowerCase() === promoInput.value.trim().toLowerCase())
  if (found && !found.used) {
    copiedCode.value = found.code
    promoInput.value = ''
    setTimeout(() => (copiedCode.value = null), 2000)
  } else {
    applyError.value = found?.used ? 'โค้ดนี้ถูกใช้แล้ว' : 'ไม่พบโค้ดส่วนลดนี้'
  }
  applyingCode.value = false
}

const copyCode = (code: string) => {
  navigator.clipboard?.writeText(code)
  copiedCode.value = code
  setTimeout(() => (copiedCode.value = null), 2000)
}

const sharePromo = async (promo: any) => {
  const shareText = `ใช้โค้ด ${promo.code} รับส่วนลด ${promo.discount_type === 'fixed' ? '฿' + promo.discount_value : promo.discount_value + '%'} ที่ GOBEAR! ${promo.description}`
  
  if (navigator.share) {
    try {
      await navigator.share({ title: 'โปรโมชั่น GOBEAR', text: shareText })
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        await navigator.clipboard?.writeText(shareText)
        shareToast.value = promo.code
        setTimeout(() => (shareToast.value = null), 2000)
      }
    }
  } else {
    await navigator.clipboard?.writeText(shareText)
    shareToast.value = promo.code
    setTimeout(() => (shareToast.value = null), 2000)
  }
}

const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })

const getDaysRemaining = (dateStr: string) => {
  const diff = new Date(dateStr).getTime() - new Date().getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

const getCategoryLabel = (cat: string) => {
  const labels: Record<string, string> = { all: 'ทั้งหมด', ride: 'เรียกรถ', delivery: 'ส่งของ', shopping: 'ซื้อของ' }
  return labels[cat] || cat
}

onMounted(() => {
  fetchPromos()
  subscribeToNewPromos()
})

onUnmounted(() => {
  if (promoSubscription) promoSubscription.unsubscribe()
})

const goBack = () => router.back()
</script>

<template>
  <PullToRefresh :loading="refreshing" @refresh="handleRefresh">
    <div class="page-container">
      <div class="content-container">
        <div class="page-header">
          <button class="back-btn" @click="goBack">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
          </button>
          <h1>โปรโมชั่น</h1>
        </div>

        <!-- Add Promo Code -->
        <div class="add-promo">
          <div class="input-wrapper">
            <svg class="input-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/></svg>
            <input v-model="promoInput" type="text" placeholder="ใส่โค้ดส่วนลด" @keyup.enter="applyPromoCode" />
          </div>
          <button class="apply-btn" :disabled="applyingCode || !promoInput" @click="applyPromoCode">
            <span v-if="applyingCode" class="btn-spinner"></span>
            <span v-else>ใช้</span>
          </button>
        </div>
        <p v-if="applyError" class="apply-error">{{ applyError }}</p>

        <!-- Category Filter -->
        <div class="category-filter">
          <button v-for="cat in categories" :key="cat.id" :class="['cat-btn', { active: activeCategory === cat.id }]" @click="activeCategory = cat.id as any">
            <!-- Grid icon -->
            <svg v-if="cat.icon === 'grid'" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>
            <!-- Car icon -->
            <svg v-else-if="cat.icon === 'car'" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 17h.01M16 17h.01M9 11h6M5 11l1.5-4.5A2 2 0 018.4 5h7.2a2 2 0 011.9 1.5L19 11M5 11v6a1 1 0 001 1h1a1 1 0 001-1v-1h8v1a1 1 0 001 1h1a1 1 0 001-1v-6M5 11h14"/></svg>
            <!-- Box icon -->
            <svg v-else-if="cat.icon === 'box'" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
            <!-- Cart icon -->
            <svg v-else fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
            <span>{{ cat.label }}</span>
          </button>
        </div>

        <!-- Featured Promo -->
        <div v-if="featuredPromo && !loading" class="featured-promo">
          <div class="featured-top">
            <div class="featured-badge">แนะนำ</div>
            <span v-if="featuredPromo.category !== 'all'" class="featured-cat">{{ getCategoryLabel(featuredPromo.category) }}</span>
          </div>
          <div class="featured-content">
            <div class="featured-discount">
              <span class="discount-value">{{ featuredPromo.discount_type === 'fixed' ? '฿' + featuredPromo.discount_value : featuredPromo.discount_value + '%' }}</span>
              <span class="discount-label">ส่วนลด</span>
            </div>
            <div class="featured-info">
              <div class="featured-code">{{ featuredPromo.code }}</div>
              <p class="featured-desc">{{ featuredPromo.description }}</p>
              <div class="featured-meta">
                <span v-if="featuredPromo.min_order_amount">ขั้นต่ำ ฿{{ featuredPromo.min_order_amount }}</span>
                <span v-if="featuredPromo.max_discount">สูงสุด ฿{{ featuredPromo.max_discount }}</span>
                <span v-if="getUsageInfo(featuredPromo)" class="featured-usage" :class="{ low: featuredPromo.usage_limit && (featuredPromo.usage_limit - (featuredPromo.used_count || 0)) <= 10 }">{{ getUsageInfo(featuredPromo) }}</span>
              </div>
            </div>
          </div>
          <div class="featured-actions">
            <button :class="['featured-copy-btn', { copied: copiedCode === featuredPromo.code }]" @click="copyCode(featuredPromo.code)">
              <svg v-if="copiedCode !== featuredPromo.code" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
              <svg v-else fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
              <span>{{ copiedCode === featuredPromo.code ? 'คัดลอกแล้ว' : 'คัดลอก' }}</span>
            </button>
            <button class="featured-share-btn" @click="sharePromo(featuredPromo)">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>
            </button>
          </div>
        </div>

        <!-- Tabs -->
        <div class="tabs">
          <button :class="['tab', { active: activeTab === 'available' }]" @click="activeTab = 'available'">ใช้ได้ ({{ availablePromos.length }})</button>
          <button :class="['tab', { active: activeTab === 'favorites' }]" @click="activeTab = 'favorites'">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="tab-icon"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
            {{ favoritePromos.length }}
          </button>
          <button :class="['tab', { active: activeTab === 'used' }]" @click="activeTab = 'used'">ใช้แล้ว ({{ usedPromos.length }})</button>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="loading-state">
          <div v-for="i in 3" :key="i" class="skeleton-card"><div class="skeleton-left"></div><div class="skeleton-content"><div class="skeleton-title"></div><div class="skeleton-text"></div><div class="skeleton-meta"></div></div></div>
        </div>

        <!-- Available Promos -->
        <div v-else-if="activeTab === 'available'" class="promos-section">
          <!-- Expiring Soon -->
          <div v-if="expiringSoon.length > 0" class="promo-group">
            <div class="group-header">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              <span>ใกล้หมดอายุ</span>
            </div>
            <div class="promos-list">
              <div v-for="promo in expiringSoon" :key="promo.id" class="promo-card expiring">
                <div class="promo-left">
                  <div class="promo-badge">{{ promo.discount_type === 'fixed' ? '฿' + promo.discount_value : promo.discount_value + '%' }}</div>
                  <span v-if="promo.category !== 'all'" class="promo-cat">{{ getCategoryLabel(promo.category) }}</span>
                </div>
                <div class="promo-content">
                  <div class="promo-code">{{ promo.code }}</div>
                  <div class="promo-desc">{{ promo.description }}</div>
                  <div class="promo-meta">
                    <span v-if="promo.min_order_amount">ขั้นต่ำ ฿{{ promo.min_order_amount }}</span>
                    <span v-if="promo.max_discount">สูงสุด ฿{{ promo.max_discount }}</span>
                    <span v-if="getUsageInfo(promo)" class="usage-info" :class="{ low: promo.usage_limit && (promo.usage_limit - (promo.used_count || 0)) <= 10 }">{{ getUsageInfo(promo) }}</span>
                  </div>
                  <div class="promo-expiry urgent">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    เหลือ {{ getDaysRemaining(promo.valid_until) }} วัน
                  </div>
                </div>
                <div class="promo-actions">
                  <button :class="['action-btn fav', { active: favoriteIds.has(promo.id), animating: animatingFavId === promo.id }]" @click="toggleFavorite(promo)">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
                  </button>
                  <button :class="['action-btn', { copied: copiedCode === promo.code }]" @click="copyCode(promo.code)">
                    <svg v-if="copiedCode !== promo.code" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                    <svg v-else fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                  </button>
                  <button class="action-btn share" @click="sharePromo(promo)">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Regular Promos -->
          <div v-if="regularPromos.length > 0" class="promo-group">
            <div class="group-header">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/></svg>
              <span>โปรโมชั่นทั้งหมด</span>
            </div>
            <div class="promos-list">
              <div v-for="promo in regularPromos" :key="promo.id" class="promo-card">
                <div class="promo-left">
                  <div class="promo-badge">{{ promo.discount_type === 'fixed' ? '฿' + promo.discount_value : promo.discount_value + '%' }}</div>
                  <span v-if="promo.category !== 'all'" class="promo-cat">{{ getCategoryLabel(promo.category) }}</span>
                </div>
                <div class="promo-content">
                  <div class="promo-code">{{ promo.code }}</div>
                  <div class="promo-desc">{{ promo.description }}</div>
                  <div class="promo-meta">
                    <span v-if="promo.min_order_amount">ขั้นต่ำ ฿{{ promo.min_order_amount }}</span>
                    <span v-if="promo.max_discount">สูงสุด ฿{{ promo.max_discount }}</span>
                    <span v-if="getUsageInfo(promo)" class="usage-info" :class="{ low: promo.usage_limit && (promo.usage_limit - (promo.used_count || 0)) <= 10 }">{{ getUsageInfo(promo) }}</span>
                  </div>
                  <div class="promo-expiry">หมดอายุ {{ formatDate(promo.valid_until) }}</div>
                </div>
                <div class="promo-actions">
                  <button :class="['action-btn fav', { active: favoriteIds.has(promo.id), animating: animatingFavId === promo.id }]" @click="toggleFavorite(promo)">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
                  </button>
                  <button :class="['action-btn', { copied: copiedCode === promo.code }]" @click="copyCode(promo.code)">
                    <svg v-if="copiedCode !== promo.code" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                    <svg v-else fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                  </button>
                  <button class="action-btn share" @click="sharePromo(promo)">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div v-if="filteredPromos.length === 0" class="empty-state">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/></svg>
            <p>ไม่มีโปรโมชั่นในหมวดนี้</p>
            <span class="empty-hint">ลองเลือกหมวดอื่น หรือดึงลงเพื่อรีเฟรช</span>
          </div>
        </div>

        <!-- Used Promos -->
        <div v-else class="promos-section">
          <div v-if="usedPromos.length === 0" class="empty-state">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
            <p>ยังไม่มีโปรโมชั่นที่ใช้แล้ว</p>
          </div>
          <div class="promos-list">
            <div v-for="promo in usedPromos" :key="promo.id" class="promo-card used">
              <div class="promo-left used">
                <div class="promo-badge">{{ promo.discount_type === 'fixed' ? '฿' + promo.discount_value : promo.discount_value + '%' }}</div>
              </div>
              <div class="promo-content">
                <div class="promo-code">{{ promo.code }}</div>
                <div class="promo-desc">{{ promo.description }}</div>
                <div class="promo-status"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>ใช้แล้ว</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Toasts -->
        <Transition name="toast">
          <div v-if="copiedCode" class="copy-toast">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
            คัดลอกโค้ด {{ copiedCode }} แล้ว
          </div>
        </Transition>
        <Transition name="toast">
          <div v-if="shareToast" class="copy-toast share">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>
            คัดลอกข้อความแชร์แล้ว
          </div>
        </Transition>
        <Transition name="toast">
          <div v-if="favoriteToast" class="copy-toast fav">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
            {{ favoriteToast }}
          </div>
        </Transition>
        <Transition name="slide">
          <div v-if="newPromoToast" class="new-promo-toast" @click="newPromoToast = null">
            <div class="new-promo-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"/></svg>
            </div>
            <div class="new-promo-content">
              <span class="new-promo-label">โปรโมชั่นใหม่!</span>
              <span class="new-promo-code">{{ newPromoToast.code }}</span>
              <span class="new-promo-desc">{{ newPromoToast.discount_type === 'fixed' ? '฿' + newPromoToast.discount_value : newPromoToast.discount_value + '%' }} ส่วนลด</span>
            </div>
            <button class="new-promo-close">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
        </Transition>
      </div>
    </div>
  </PullToRefresh>
</template>

<style scoped>
.page-container { min-height: 100vh; background-color: #f6f6f6; padding-bottom: 100px; }
.content-container { max-width: 480px; margin: 0 auto; padding: 0 16px; }
.page-header { display: flex; align-items: center; gap: 12px; padding: 16px 0; }
.back-btn { width: 40px; height: 40px; background: none; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; border-radius: 50%; transition: background 0.2s; }
.back-btn:hover { background: #f0f0f0; }
.back-btn svg { width: 24px; height: 24px; }
.page-header h1 { font-size: 20px; font-weight: 600; }

.add-promo { display: flex; gap: 8px; margin-bottom: 8px; }
.input-wrapper { flex: 1; position: relative; display: flex; align-items: center; }
.input-icon { position: absolute; left: 14px; width: 20px; height: 20px; color: #6b6b6b; pointer-events: none; transition: color 0.2s; }
.add-promo input { width: 100%; padding: 14px 16px 14px 44px; border: 1px solid #e5e5e5; border-radius: 12px; font-size: 15px; outline: none; background: #fff; transition: border-color 0.2s; }
.add-promo input:focus { border-color: #000; }
.input-wrapper:focus-within .input-icon { color: #000; }
.apply-btn { padding: 14px 24px; background: #000; color: #fff; border: none; border-radius: 12px; font-size: 15px; font-weight: 500; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; min-width: 64px; }
.apply-btn:hover:not(:disabled) { background: #333; }
.apply-btn:disabled { background: #ccc; cursor: not-allowed; }
.btn-spinner { width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.8s linear infinite; }
.apply-error { font-size: 13px; color: #e11900; margin-bottom: 16px; padding-left: 4px; }

/* Category Filter */
.category-filter { display: flex; gap: 8px; margin-bottom: 16px; overflow-x: auto; padding-bottom: 4px; -webkit-overflow-scrolling: touch; }
.category-filter::-webkit-scrollbar { display: none; }
.cat-btn { display: flex; align-items: center; gap: 6px; padding: 10px 16px; background: #fff; border: 1px solid #e5e5e5; border-radius: 24px; font-size: 13px; font-weight: 500; color: #6b6b6b; cursor: pointer; white-space: nowrap; transition: all 0.2s; }
.cat-btn svg { width: 16px; height: 16px; }
.cat-btn.active { background: #000; color: #fff; border-color: #000; }
.cat-btn:hover:not(.active) { border-color: #000; }

/* Featured Promo */
.featured-promo { background: #000; border-radius: 20px; padding: 20px; margin-bottom: 20px; position: relative; overflow: hidden; }
.featured-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.featured-badge { background: #fff; color: #000; font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 20px; }
.featured-cat { font-size: 11px; color: rgba(255,255,255,0.7); background: rgba(255,255,255,0.15); padding: 4px 10px; border-radius: 20px; }
.featured-content { display: flex; gap: 16px; margin-bottom: 16px; }
.featured-discount { display: flex; flex-direction: column; align-items: center; justify-content: center; min-width: 80px; }
.discount-value { font-size: 32px; font-weight: 700; color: #fff; }
.discount-label { font-size: 12px; color: rgba(255,255,255,0.7); }
.featured-info { flex: 1; }
.featured-code { font-size: 20px; font-weight: 700; color: #fff; letter-spacing: 2px; margin-bottom: 4px; }
.featured-desc { font-size: 14px; color: rgba(255,255,255,0.8); margin-bottom: 8px; }
.featured-meta { display: flex; gap: 12px; font-size: 12px; color: rgba(255,255,255,0.6); flex-wrap: wrap; }
.featured-usage { color: #22c55e; font-weight: 500; }
.featured-usage.low { color: #fbbf24; }
.featured-actions { display: flex; gap: 8px; }
.featured-copy-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px; background: #fff; color: #000; border: none; border-radius: 12px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
.featured-copy-btn:hover { background: #f0f0f0; }
.featured-copy-btn.copied { background: #22c55e; color: #fff; }
.featured-copy-btn svg { width: 18px; height: 18px; }
.featured-share-btn { width: 48px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.15); border: none; border-radius: 12px; cursor: pointer; transition: all 0.2s; }
.featured-share-btn:hover { background: rgba(255,255,255,0.25); }
.featured-share-btn svg { width: 20px; height: 20px; color: #fff; }

/* Tabs */
.tabs { display: flex; background: #fff; border-radius: 12px; padding: 4px; margin-bottom: 20px; }
.tab { flex: 1; padding: 12px; background: none; border: none; font-size: 14px; font-weight: 500; color: #6b6b6b; cursor: pointer; border-radius: 8px; transition: all 0.2s; }
.tab.active { background: #000; color: #fff; }

/* Loading */
.loading-state { display: flex; flex-direction: column; gap: 12px; }
.skeleton-card { display: flex; background: #fff; border-radius: 16px; overflow: hidden; }
.skeleton-left { width: 80px; min-height: 100px; background: linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; }
.skeleton-content { flex: 1; padding: 16px; display: flex; flex-direction: column; gap: 8px; }
.skeleton-title { height: 18px; width: 40%; background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 4px; }
.skeleton-text { height: 14px; width: 70%; background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 4px; }
.skeleton-meta { height: 12px; width: 50%; background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 4px; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
@keyframes spin { to { transform: rotate(360deg); } }

/* Promo Groups */
.promos-section { display: flex; flex-direction: column; gap: 24px; }
.promo-group { display: flex; flex-direction: column; gap: 12px; }
.group-header { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; color: #000; padding-left: 4px; }
.group-header svg { width: 18px; height: 18px; }

/* Promo Card */
.promos-list { display: flex; flex-direction: column; gap: 12px; }
.promo-card { display: flex; align-items: stretch; background: #fff; border-radius: 16px; overflow: hidden; transition: all 0.2s ease; }
.promo-card:active { transform: scale(0.98); }
.promo-card.expiring { border: 1px solid #fbbf24; }
.promo-card.used { opacity: 0.6; }
.promo-left { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 16px 12px; background: #000; min-width: 72px; gap: 4px; }
.promo-left.used { background: #6b6b6b; }
.promo-badge { color: #fff; font-size: 16px; font-weight: 700; text-align: center; }
.promo-cat { font-size: 10px; color: rgba(255,255,255,0.7); background: rgba(255,255,255,0.15); padding: 2px 8px; border-radius: 10px; }
.promo-content { flex: 1; padding: 14px 12px; }
.promo-code { font-size: 15px; font-weight: 700; letter-spacing: 1px; margin-bottom: 4px; }
.promo-desc { font-size: 12px; color: #6b6b6b; margin-bottom: 6px; }
.promo-meta { display: flex; gap: 10px; font-size: 11px; color: #6b6b6b; margin-bottom: 4px; }
.promo-expiry { font-size: 11px; color: #6b6b6b; }
.promo-expiry.urgent { display: flex; align-items: center; gap: 4px; color: #d97706; font-weight: 500; }
.promo-expiry.urgent svg { width: 14px; height: 14px; }
.promo-status { display: flex; align-items: center; gap: 4px; font-size: 12px; color: #22c55e; }
.promo-status svg { width: 14px; height: 14px; }

/* Promo Actions */
.promo-actions { display: flex; flex-direction: column; border-left: 1px solid #e5e5e5; }
.action-btn { flex: 1; display: flex; align-items: center; justify-content: center; padding: 0 14px; background: none; border: none; cursor: pointer; transition: all 0.2s ease; }
.action-btn:first-child { border-bottom: 1px solid #e5e5e5; }
.action-btn:hover { background: #f6f6f6; }
.action-btn:active { transform: scale(0.9); }
.action-btn svg { width: 18px; height: 18px; color: #6b6b6b; transition: color 0.2s ease; }
.action-btn:hover svg { color: #000; }
.action-btn.copied svg { color: #22c55e; }
.action-btn.share svg { color: #6b6b6b; }
.action-btn.share:hover svg { color: #276ef1; }

/* Empty State */
.empty-state { text-align: center; padding: 48px 24px; color: #6b6b6b; }
.empty-state svg { width: 64px; height: 64px; margin-bottom: 16px; opacity: 0.5; }
.empty-state p { font-size: 16px; font-weight: 500; margin-bottom: 4px; }
.empty-hint { font-size: 13px; color: #999; }

/* Tab Icon */
.tab-icon { width: 16px; height: 16px; margin-right: 4px; vertical-align: middle; }

/* Usage Info */
.usage-info { color: #22c55e; font-weight: 500; }
.usage-info.low { color: #e11900; }

/* Favorite Button */
.action-btn.fav svg { color: #ccc; transition: all 0.2s ease; }
.action-btn.fav:hover svg { color: #e11900; }
.action-btn.fav.active svg { color: #e11900; fill: #e11900; }
.action-btn.fav.animating svg { animation: heartPop 0.4s ease; }

@keyframes heartPop {
  0% { transform: scale(1); }
  25% { transform: scale(1.3); }
  50% { transform: scale(0.9); }
  75% { transform: scale(1.1); }
  100% { transform: scale(1); }
}

/* Toast */
.copy-toast { position: fixed; bottom: 100px; left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 8px; padding: 12px 20px; background: #000; color: #fff; border-radius: 12px; font-size: 14px; font-weight: 500; box-shadow: 0 4px 20px rgba(0,0,0,0.2); z-index: 1000; }
.copy-toast svg { width: 18px; height: 18px; color: #22c55e; }
.copy-toast.share svg { color: #276ef1; }
.copy-toast.fav svg { color: #e11900; }
.toast-enter-active, .toast-leave-active { transition: all 0.3s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(20px); }

/* New Promo Toast */
.new-promo-toast { position: fixed; top: 80px; left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 12px; padding: 14px 16px; background: #fff; border-radius: 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.15); z-index: 1000; max-width: calc(100% - 32px); cursor: pointer; }
.new-promo-icon { width: 44px; height: 44px; background: #000; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.new-promo-icon svg { width: 24px; height: 24px; color: #fff; }
.new-promo-content { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
.new-promo-label { font-size: 11px; font-weight: 600; color: #22c55e; text-transform: uppercase; letter-spacing: 0.5px; }
.new-promo-code { font-size: 16px; font-weight: 700; letter-spacing: 1px; }
.new-promo-desc { font-size: 13px; color: #6b6b6b; }
.new-promo-close { width: 32px; height: 32px; background: #f6f6f6; border: none; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; }
.new-promo-close:hover { background: #e5e5e5; }
.new-promo-close svg { width: 16px; height: 16px; color: #6b6b6b; }

/* Slide Transition */
.slide-enter-active, .slide-leave-active { transition: all 0.3s ease; }
.slide-enter-from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
.slide-leave-to { opacity: 0; transform: translateX(-50%) translateY(-20px); }
</style>
