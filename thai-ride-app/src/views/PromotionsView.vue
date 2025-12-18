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

const filteredPromos = computed(() => {
  const base = activeTab.value === 'favorites' ? favoritePromos.value : availablePromos.value
  if (activeCategory.value === 'all') return base
  return base.filter((p) => p.category === activeCategory.value || p.category === 'all')
})

const featuredPromo = computed(() => {
  if (filteredPromos.value.length === 0) return null
  return filteredPromos.value.reduce((best, current) => {
    const bestValue = best.discount_type === 'fixed' ? best.discount_value : best.max_discount || 100
    const currentValue = current.discount_type === 'fixed' ? current.discount_value : current.max_discount || 100
    return currentValue > bestValue ? current : best
  })
})

const expiringSoon = computed(() => {
  const threeDaysLater = new Date()
  threeDaysLater.setDate(threeDaysLater.getDate() + 3)
  return filteredPromos.value.filter(
    (p) => new Date(p.valid_until) <= threeDaysLater && p.id !== featuredPromo.value?.id
  )
})

const regularPromos = computed(() =>
  filteredPromos.value.filter(
    (p) => p.id !== featuredPromo.value?.id && !expiringSoon.value.find((e) => e.id === p.id)
  )
)

// Check demo mode
const isDemoMode = () => localStorage.getItem('demo_mode') === 'true'

// Helper for demo data
const addDays = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()

// Load demo promos
const loadDemoPromos = () => {
  promos.value = [
    { id: '1', code: 'RIDE50', discount_type: 'fixed', discount_value: 50, min_order_amount: 100, valid_until: addDays(30), description: 'ส่วนลด ฿50 สำหรับเรียกรถครั้งแรก', used: false, category: 'ride', used_count: 45, usage_limit: 1000 },
    { id: '2', code: 'RIDEWEEKEND', discount_type: 'percentage', discount_value: 20, min_order_amount: 80, max_discount: 100, valid_until: addDays(14), description: 'ลด 20% เรียกรถวันหยุด', used: false, category: 'ride', used_count: 123, usage_limit: 500 },
    { id: '3', code: 'NIGHTRIDE', discount_type: 'fixed', discount_value: 30, min_order_amount: 50, valid_until: addDays(7), description: 'ลด ฿30 เรียกรถกลางคืน 22:00-06:00', used: false, category: 'ride', used_count: 67, usage_limit: 300 },
    { id: '4', code: 'AIRPORT100', discount_type: 'fixed', discount_value: 100, min_order_amount: 300, valid_until: addDays(60), description: 'ลด ฿100 เดินทางไป-กลับสนามบิน', used: false, category: 'ride', used_count: 89, usage_limit: 200 },
    { id: '5', code: 'DELFREE', discount_type: 'fixed', discount_value: 40, min_order_amount: 0, valid_until: addDays(3), description: 'ส่งฟรี! ไม่มีขั้นต่ำ', used: false, category: 'delivery', used_count: 492, usage_limit: 500 },
    { id: '6', code: 'DEL15', discount_type: 'percentage', discount_value: 15, min_order_amount: 50, max_discount: 80, valid_until: addDays(21), description: 'ลด 15% ค่าส่งของ', used: false, category: 'delivery', used_count: 156, usage_limit: 1000 },
    { id: '7', code: 'FASTDEL', discount_type: 'fixed', discount_value: 25, min_order_amount: 100, valid_until: addDays(14), description: 'ลด ฿25 ส่งด่วนภายใน 1 ชม.', used: false, category: 'delivery', used_count: 78, usage_limit: 400 },
    { id: '8', code: 'SHOP100', discount_type: 'fixed', discount_value: 100, min_order_amount: 500, valid_until: addDays(30), description: 'ลด ฿100 ซื้อของครบ ฿500', used: false, category: 'shopping', used_count: 45, usage_limit: 300 },
    { id: '9', code: 'SHOPNEW', discount_type: 'percentage', discount_value: 25, min_order_amount: 200, max_discount: 150, valid_until: addDays(45), description: 'ลด 25% สำหรับผู้ใช้ใหม่', used: false, category: 'shopping', used_count: 112, usage_limit: 500 },
    { id: '10', code: 'GROCERY20', discount_type: 'percentage', discount_value: 20, min_order_amount: 150, max_discount: 100, valid_until: addDays(10), description: 'ลด 20% ซื้อของสด', used: false, category: 'shopping', used_count: 89, usage_limit: 600 },
    { id: '11', code: 'NEWYEAR2025', discount_type: 'fixed', discount_value: 150, min_order_amount: 300, valid_until: addDays(45), description: 'ฉลองปีใหม่ ลด ฿150', used: false, category: 'all', used_count: 567, usage_limit: 2000 },
    { id: '12', code: 'GOBEAR10', discount_type: 'percentage', discount_value: 10, min_order_amount: 50, max_discount: 200, valid_until: addDays(90), description: 'ลด 10% ทุกบริการ', used: false, category: 'all', used_count: 1234, usage_limit: null },
    { id: '13', code: 'WELCOME', discount_type: 'fixed', discount_value: 80, min_order_amount: 150, valid_until: addDays(365), description: 'ยินดีต้อนรับ ลด ฿80', used: false, category: 'all', used_count: 3456, usage_limit: null },
    { id: '14', code: 'RAINY30', discount_type: 'fixed', discount_value: 30, min_order_amount: 80, valid_until: addDays(2), description: 'หน้าฝน ลด ฿30', used: false, category: 'all', used_count: 792, usage_limit: 800 },
    { id: '15', code: 'LASTCHANCE', discount_type: 'percentage', discount_value: 30, min_order_amount: 100, max_discount: 200, valid_until: addDays(1), description: 'โอกาสสุดท้าย! ลด 30%', used: false, category: 'all', used_count: 92, usage_limit: 100 },
    { id: '16', code: 'FLASH50', discount_type: 'fixed', discount_value: 50, min_order_amount: 100, valid_until: addDays(2), description: 'Flash Sale ลด ฿50', used: false, category: 'ride', used_count: 47, usage_limit: 50 },
    { id: '17', code: 'USED100', discount_type: 'fixed', discount_value: 100, min_order_amount: 200, valid_until: addDays(-5), description: 'โปรที่ใช้แล้ว', used: true, category: 'all', used_count: 100, usage_limit: 100 }
  ]
  loading.value = false
}

const fetchPromos = async () => {
  // Demo mode - use mock data directly
  if (isDemoMode()) {
    loadDemoPromos()
    return
  }

  try {
    const { data } = await (supabase.from('promo_codes') as any)
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (authStore.user?.id) {
      const { data: favData } = await supabase.from('favorite_promos').select('promo_id').eq('user_id', authStore.user.id)
      if (favData) favoriteIds.value = new Set(favData.map((f: any) => f.promo_id))
    }

    if (data) {
      promos.value = data.map((p: any) => ({ ...p, used: false, category: p.category || 'all' }))
    }
  } catch {
    // Fallback to demo data on error
    loadDemoPromos()
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
  animatingFavId.value = promo.id
  setTimeout(() => (animatingFavId.value = null), 400)
  
  try {
    if (isFav) {
      // Demo mode - just update local state
      if (!isDemoMode()) {
        await (supabase.from('favorite_promos') as any).delete().eq('user_id', authStore.user.id).eq('promo_id', promo.id)
      }
      favoriteIds.value.delete(promo.id)
      favoriteToast.value = 'ลบออกจากรายการโปรด'
    } else {
      // Demo mode - just update local state
      if (!isDemoMode()) {
        await (supabase.from('favorite_promos') as any).insert({ user_id: authStore.user.id, promo_id: promo.id })
      }
      favoriteIds.value.add(promo.id)
      favoriteToast.value = 'เพิ่มในรายการโปรดแล้ว'
    }
    setTimeout(() => (favoriteToast.value = null), 2000)
  } catch (err) {
    // In demo mode, still update local state even on error
    if (isDemoMode()) {
      if (isFav) {
        favoriteIds.value.delete(promo.id)
        favoriteToast.value = 'ลบออกจากรายการโปรด'
      } else {
        favoriteIds.value.add(promo.id)
        favoriteToast.value = 'เพิ่มในรายการโปรดแล้ว'
      }
      setTimeout(() => (favoriteToast.value = null), 2000)
    }
    console.error('Error toggling favorite:', err)
  }
}

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
        <!-- Header -->
        <div class="page-header">
          <button class="back-btn" @click="goBack">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
          </button>
          <h1>โปรโมชั่น</h1>
          <div class="header-badge">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/></svg>
          </div>
        </div>

        <!-- Add Promo Code -->
        <div class="add-promo-card">
          <div class="add-promo-header">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"/></svg>
            <span>มีโค้ดส่วนลด?</span>
          </div>
          <div class="add-promo-input">
            <input v-model="promoInput" type="text" placeholder="ใส่โค้ดส่วนลดที่นี่" @keyup.enter="applyPromoCode" />
            <button class="apply-btn" :disabled="applyingCode || !promoInput" @click="applyPromoCode">
              <span v-if="applyingCode" class="btn-spinner"></span>
              <span v-else>ใช้โค้ด</span>
            </button>
          </div>
          <p v-if="applyError" class="apply-error">{{ applyError }}</p>
        </div>

        <!-- Category Filter -->
        <div class="category-filter">
          <button v-for="cat in categories" :key="cat.id" :class="['cat-btn', { active: activeCategory === cat.id }]" @click="activeCategory = cat.id as any">
            <svg v-if="cat.icon === 'grid'" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>
            <svg v-else-if="cat.icon === 'car'" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 17h.01M16 17h.01M9 11h6M5 11l1.5-4.5A2 2 0 018.4 5h7.2a2 2 0 011.9 1.5L19 11M5 11v6a1 1 0 001 1h1a1 1 0 001-1v-1h8v1a1 1 0 001 1h1a1 1 0 001-1v-6M5 11h14"/></svg>
            <svg v-else-if="cat.icon === 'box'" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
            <svg v-else fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
            <span>{{ cat.label }}</span>
          </button>
        </div>

        <!-- Featured Promo -->
        <div v-if="featuredPromo && !loading" class="featured-promo">
          <div class="featured-ribbon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/></svg>
            <span>แนะนำ</span>
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
                <span v-if="featuredPromo.min_order_amount" class="meta-item">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  ขั้นต่ำ ฿{{ featuredPromo.min_order_amount }}
                </span>
                <span v-if="featuredPromo.max_discount" class="meta-item">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  สูงสุด ฿{{ featuredPromo.max_discount }}
                </span>
              </div>
            </div>
          </div>
          <div class="featured-actions">
            <button :class="['featured-copy-btn', { copied: copiedCode === featuredPromo.code }]" @click="copyCode(featuredPromo.code)">
              <svg v-if="copiedCode !== featuredPromo.code" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
              <svg v-else fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
              <span>{{ copiedCode === featuredPromo.code ? 'คัดลอกแล้ว' : 'คัดลอกโค้ด' }}</span>
            </button>
            <button class="featured-share-btn" @click="sharePromo(featuredPromo)">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>
            </button>
            <button :class="['featured-fav-btn', { active: favoriteIds.has(featuredPromo.id) }]" @click="toggleFavorite(featuredPromo)">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
            </button>
          </div>
        </div>

        <!-- Tabs -->
        <div class="tabs">
          <button :class="['tab', { active: activeTab === 'available' }]" @click="activeTab = 'available'">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/></svg>
            ใช้ได้ ({{ availablePromos.length }})
          </button>
          <button :class="['tab', { active: activeTab === 'favorites' }]" @click="activeTab = 'favorites'">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
            โปรด ({{ favoritePromos.length }})
          </button>
          <button :class="['tab', { active: activeTab === 'used' }]" @click="activeTab = 'used'">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
            ใช้แล้ว ({{ usedPromos.length }})
          </button>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="loading-state">
          <div v-for="i in 3" :key="i" class="skeleton-card">
            <div class="skeleton-left"></div>
            <div class="skeleton-content">
              <div class="skeleton-title"></div>
              <div class="skeleton-text"></div>
              <div class="skeleton-meta"></div>
            </div>
          </div>
        </div>

        <!-- Available Promos -->
        <div v-else-if="activeTab === 'available' || activeTab === 'favorites'" class="promos-section">
          <!-- Expiring Soon -->
          <div v-if="expiringSoon.length > 0 && activeTab === 'available'" class="promo-group">
            <div class="group-header urgent">
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
                  <button :class="['action-btn copy', { copied: copiedCode === promo.code }]" @click="copyCode(promo.code)">
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

          <!-- Regular/Favorite Promos -->
          <div v-if="(activeTab === 'available' ? regularPromos : favoritePromos).length > 0" class="promo-group">
            <div class="group-header">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/></svg>
              <span>{{ activeTab === 'favorites' ? 'โปรโมชั่นโปรด' : 'โปรโมชั่นทั้งหมด' }}</span>
            </div>
            <div class="promos-list">
              <div v-for="promo in (activeTab === 'available' ? regularPromos : favoritePromos)" :key="promo.id" class="promo-card">
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
                  <button :class="['action-btn copy', { copied: copiedCode === promo.code }]" @click="copyCode(promo.code)">
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
            <div class="empty-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/></svg>
            </div>
            <p>{{ activeTab === 'favorites' ? 'ยังไม่มีโปรโมชั่นโปรด' : 'ไม่มีโปรโมชั่นในหมวดนี้' }}</p>
            <span class="empty-hint">{{ activeTab === 'favorites' ? 'กดหัวใจเพื่อเพิ่มโปรโมชั่นโปรด' : 'ลองเลือกหมวดอื่น หรือดึงลงเพื่อรีเฟรช' }}</span>
          </div>
        </div>

        <!-- Used Promos -->
        <div v-else class="promos-section">
          <div v-if="usedPromos.length === 0" class="empty-state">
            <div class="empty-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
            </div>
            <p>ยังไม่มีโปรโมชั่นที่ใช้แล้ว</p>
            <span class="empty-hint">เมื่อใช้โปรโมชั่นจะแสดงที่นี่</span>
          </div>
          <div v-else class="promos-list">
            <div v-for="promo in usedPromos" :key="promo.id" class="promo-card used">
              <div class="promo-left used">
                <div class="promo-badge">{{ promo.discount_type === 'fixed' ? '฿' + promo.discount_value : promo.discount_value + '%' }}</div>
              </div>
              <div class="promo-content">
                <div class="promo-code">{{ promo.code }}</div>
                <div class="promo-desc">{{ promo.description }}</div>
                <div class="promo-status">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                  ใช้แล้ว
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Toasts -->
        <Transition name="toast">
          <div v-if="copiedCode" class="toast success">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
            คัดลอกโค้ด {{ copiedCode }} แล้ว
          </div>
        </Transition>
        <Transition name="toast">
          <div v-if="shareToast" class="toast share">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>
            คัดลอกข้อความแชร์แล้ว
          </div>
        </Transition>
        <Transition name="toast">
          <div v-if="favoriteToast" class="toast fav">
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
/* MUNEEF Style - Green Accent */
.page-container { 
  min-height: 100vh; 
  background-color: #FFFFFF; 
  padding-bottom: 100px; 
}
.content-container { 
  max-width: 480px; 
  margin: 0 auto; 
  padding: 0 16px; 
}

/* Header */
.page-header { 
  display: flex; 
  align-items: center; 
  gap: 12px; 
  padding: 16px 0; 
}
.back-btn { 
  width: 44px; 
  height: 44px; 
  background: #F5F5F5; 
  border: none; 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  cursor: pointer; 
  border-radius: 14px; 
  transition: all 0.2s; 
}
.back-btn:hover { background: #E8F5EF; }
.back-btn:active { transform: scale(0.95); }
.back-btn svg { width: 24px; height: 24px; color: #1A1A1A; }
.page-header h1 { 
  flex: 1;
  font-size: 20px; 
  font-weight: 700; 
  color: #1A1A1A;
}
.header-badge {
  width: 44px;
  height: 44px;
  background: #E8F5EF;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.header-badge svg {
  width: 22px;
  height: 22px;
  color: #00A86B;
}

/* Add Promo Card */
.add-promo-card {
  background: #FFFFFF;
  border: 1px solid #F0F0F0;
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 16px;
}
.add-promo-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 600;
  color: #1A1A1A;
}
.add-promo-header svg {
  width: 20px;
  height: 20px;
  color: #00A86B;
}
.add-promo-input {
  display: flex;
  gap: 10px;
}
.add-promo-input input {
  flex: 1;
  padding: 14px 16px;
  border: 2px solid #E8E8E8;
  border-radius: 12px;
  font-size: 15px;
  outline: none;
  background: #FFFFFF;
  transition: border-color 0.2s;
  color: #1A1A1A;
}
.add-promo-input input::placeholder { color: #999999; }
.add-promo-input input:focus { border-color: #00A86B; }
.apply-btn {
  padding: 14px 20px;
  background: #00A86B;
  color: #FFFFFF;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 80px;
  box-shadow: 0 4px 12px rgba(0, 168, 107, 0.25);
}
.apply-btn:hover:not(:disabled) { background: #008F5B; }
.apply-btn:active:not(:disabled) { transform: scale(0.97); }
.apply-btn:disabled { background: #E8E8E8; color: #999999; box-shadow: none; cursor: not-allowed; }
.btn-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
.apply-error {
  font-size: 13px;
  color: #E53935;
  margin-top: 10px;
  padding-left: 4px;
}

/* Category Filter */
.category-filter {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  overflow-x: auto;
  padding-bottom: 4px;
  -webkit-overflow-scrolling: touch;
}
.category-filter::-webkit-scrollbar { display: none; }
.cat-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  background: #FFFFFF;
  border: 1px solid #E8E8E8;
  border-radius: 24px;
  font-size: 13px;
  font-weight: 500;
  color: #666666;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}
.cat-btn svg { width: 16px; height: 16px; }
.cat-btn.active {
  background: #00A86B;
  color: #FFFFFF;
  border-color: #00A86B;
}
.cat-btn:hover:not(.active) { border-color: #00A86B; color: #00A86B; }

/* Featured Promo */
.featured-promo {
  background: linear-gradient(135deg, #00A86B 0%, #008F5B 100%);
  border-radius: 20px;
  padding: 20px;
  margin-bottom: 20px;
  position: relative;
  overflow: hidden;
}
.featured-ribbon {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(255,255,255,0.2);
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  color: #FFFFFF;
  margin-bottom: 16px;
}
.featured-ribbon svg { width: 14px; height: 14px; }
.featured-content {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}
.featured-discount {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 80px;
  background: rgba(255,255,255,0.15);
  border-radius: 16px;
  padding: 12px;
}
.discount-value {
  font-size: 28px;
  font-weight: 700;
  color: #FFFFFF;
}
.discount-label {
  font-size: 11px;
  color: rgba(255,255,255,0.8);
  margin-top: 2px;
}
.featured-info { flex: 1; }
.featured-code {
  font-size: 18px;
  font-weight: 700;
  color: #FFFFFF;
  letter-spacing: 2px;
  margin-bottom: 6px;
}
.featured-desc {
  font-size: 14px;
  color: rgba(255,255,255,0.9);
  margin-bottom: 10px;
  line-height: 1.4;
}
.featured-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: rgba(255,255,255,0.8);
}
.meta-item svg { width: 14px; height: 14px; }
.featured-actions {
  display: flex;
  gap: 10px;
}
.featured-copy-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px;
  background: #FFFFFF;
  color: #00A86B;
  border: none;
  border-radius: 14px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.featured-copy-btn:hover { background: #F5F5F5; }
.featured-copy-btn:active { transform: scale(0.97); }
.featured-copy-btn.copied { background: #E8F5EF; color: #00A86B; }
.featured-copy-btn svg { width: 18px; height: 18px; }
.featured-share-btn, .featured-fav-btn {
  width: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255,255,255,0.2);
  border: none;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.2s;
}
.featured-share-btn:hover, .featured-fav-btn:hover { background: rgba(255,255,255,0.3); }
.featured-share-btn:active, .featured-fav-btn:active { transform: scale(0.95); }
.featured-share-btn svg, .featured-fav-btn svg { width: 20px; height: 20px; color: #FFFFFF; }
.featured-fav-btn.active svg { fill: #FFFFFF; }

/* Tabs */
.tabs {
  display: flex;
  background: #F5F5F5;
  border-radius: 14px;
  padding: 4px;
  margin-bottom: 20px;
  gap: 4px;
}
.tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px 8px;
  background: none;
  border: none;
  font-size: 13px;
  font-weight: 500;
  color: #666666;
  cursor: pointer;
  border-radius: 10px;
  transition: all 0.2s;
}
.tab svg { width: 16px; height: 16px; }
.tab.active {
  background: #FFFFFF;
  color: #00A86B;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}
.tab:hover:not(.active) { color: #00A86B; }

/* Loading */
.loading-state {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.skeleton-card {
  display: flex;
  background: #FFFFFF;
  border: 1px solid #F0F0F0;
  border-radius: 16px;
  overflow: hidden;
}
.skeleton-left {
  width: 80px;
  min-height: 100px;
  background: linear-gradient(90deg, #F5F5F5 25%, #E8E8E8 50%, #F5F5F5 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
.skeleton-content {
  flex: 1;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.skeleton-title {
  height: 18px;
  width: 40%;
  background: linear-gradient(90deg, #F5F5F5 25%, #E8E8E8 50%, #F5F5F5 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
}
.skeleton-text {
  height: 14px;
  width: 70%;
  background: linear-gradient(90deg, #F5F5F5 25%, #E8E8E8 50%, #F5F5F5 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
}
.skeleton-meta {
  height: 12px;
  width: 50%;
  background: linear-gradient(90deg, #F5F5F5 25%, #E8E8E8 50%, #F5F5F5 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
}
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
@keyframes spin { to { transform: rotate(360deg); } }

/* Promo Groups */
.promos-section {
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.promo-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.group-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #1A1A1A;
  padding-left: 4px;
}
.group-header svg { width: 18px; height: 18px; color: #00A86B; }
.group-header.urgent svg { color: #F5A623; }

/* Promo Card */
.promos-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.promo-card {
  display: flex;
  align-items: stretch;
  background: #FFFFFF;
  border: 1px solid #F0F0F0;
  border-radius: 16px;
  overflow: hidden;
  transition: all 0.2s ease;
}
.promo-card:active { transform: scale(0.98); }
.promo-card.expiring { border-color: #F5A623; }
.promo-card.used { opacity: 0.6; }
.promo-left {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 16px 12px;
  background: linear-gradient(135deg, #00A86B 0%, #008F5B 100%);
  min-width: 72px;
  gap: 4px;
}
.promo-left.used { background: linear-gradient(135deg, #999999 0%, #666666 100%); }
.promo-badge {
  color: #FFFFFF;
  font-size: 16px;
  font-weight: 700;
  text-align: center;
}
.promo-cat {
  font-size: 10px;
  color: rgba(255,255,255,0.9);
  background: rgba(255,255,255,0.2);
  padding: 2px 8px;
  border-radius: 10px;
}
.promo-content {
  flex: 1;
  padding: 14px 12px;
}
.promo-code {
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 1px;
  margin-bottom: 4px;
  color: #1A1A1A;
}
.promo-desc {
  font-size: 12px;
  color: #666666;
  margin-bottom: 6px;
  line-height: 1.4;
}
.promo-meta {
  display: flex;
  gap: 10px;
  font-size: 11px;
  color: #666666;
  margin-bottom: 4px;
  flex-wrap: wrap;
}
.promo-expiry {
  font-size: 11px;
  color: #999999;
}
.promo-expiry.urgent {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #F5A623;
  font-weight: 500;
}
.promo-expiry.urgent svg { width: 14px; height: 14px; }
.promo-status {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #00A86B;
  font-weight: 500;
}
.promo-status svg { width: 14px; height: 14px; }

/* Promo Actions */
.promo-actions {
  display: flex;
  flex-direction: column;
  border-left: 1px solid #F0F0F0;
}
.action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 14px;
  background: none;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}
.action-btn:not(:last-child) { border-bottom: 1px solid #F0F0F0; }
.action-btn:hover { background: #E8F5EF; }
.action-btn:active { transform: scale(0.9); }
.action-btn svg {
  width: 18px;
  height: 18px;
  color: #999999;
  transition: all 0.2s ease;
}
.action-btn:hover svg { color: #00A86B; }
.action-btn.copy.copied svg { color: #00A86B; }
.action-btn.share:hover svg { color: #00A86B; }

/* Favorite Button */
.action-btn.fav svg { color: #E8E8E8; transition: all 0.2s ease; }
.action-btn.fav:hover svg { color: #E53935; }
.action-btn.fav.active svg { color: #E53935; fill: #E53935; }
.action-btn.fav.animating svg { animation: heartPop 0.4s ease; }

@keyframes heartPop {
  0% { transform: scale(1); }
  25% { transform: scale(1.3); }
  50% { transform: scale(0.9); }
  75% { transform: scale(1.1); }
  100% { transform: scale(1); }
}

/* Usage Info */
.usage-info { color: #00A86B; font-weight: 500; }
.usage-info.low { color: #E53935; }

/* Empty State */
.empty-state {
  text-align: center;
  padding: 48px 24px;
  color: #666666;
}
.empty-icon {
  width: 80px;
  height: 80px;
  background: #E8F5EF;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
}
.empty-icon svg {
  width: 40px;
  height: 40px;
  color: #00A86B;
  opacity: 0.7;
}
.empty-state p {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 4px;
  color: #1A1A1A;
}
.empty-hint {
  font-size: 13px;
  color: #999999;
}

/* Toast */
.toast {
  position: fixed;
  bottom: 100px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 20px;
  background: #1A1A1A;
  color: #FFFFFF;
  border-radius: 14px;
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
  z-index: 1000;
}
.toast svg { width: 18px; height: 18px; }
.toast.success svg { color: #00A86B; }
.toast.share svg { color: #00A86B; }
.toast.fav svg { color: #E53935; }
.toast-enter-active, .toast-leave-active { transition: all 0.3s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(20px); }

/* New Promo Toast */
.new-promo-toast {
  position: fixed;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: #FFFFFF;
  border: 1px solid #E8F5EF;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0,168,107,0.15);
  z-index: 1000;
  max-width: calc(100% - 32px);
  cursor: pointer;
}
.new-promo-icon {
  width: 44px;
  height: 44px;
  background: linear-gradient(135deg, #00A86B 0%, #008F5B 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.new-promo-icon svg { width: 24px; height: 24px; color: #FFFFFF; }
.new-promo-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}
.new-promo-label {
  font-size: 11px;
  font-weight: 600;
  color: #00A86B;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.new-promo-code {
  font-size: 16px;
  font-weight: 700;
  color: #1A1A1A;
  letter-spacing: 1px;
}
.new-promo-desc {
  font-size: 13px;
  color: #666666;
}
.new-promo-close {
  width: 32px;
  height: 32px;
  background: #F5F5F5;
  border: none;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.2s;
}
.new-promo-close:hover { background: #E8E8E8; }
.new-promo-close svg { width: 16px; height: 16px; color: #666666; }

/* Slide Transition */
.slide-enter-active, .slide-leave-active { transition: all 0.3s ease; }
.slide-enter-from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
.slide-leave-to { opacity: 0; transform: translateX(-50%) translateY(-20px); }
</style>