<template>
  <div class="bundles-view">
    <!-- Header -->
    <header class="header">
      <button class="back-btn" @click="goBack" aria-label="กลับ">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
      </button>
      <h1>แพ็คเกจบริการ</h1>
      <div class="spacer"></div>
    </header>

    <!-- Loading State -->
    <div v-if="loading" class="loading-container">
      <div v-for="i in 3" :key="i" class="skeleton-card"></div>
    </div>

    <!-- Empty State -->
    <div v-else-if="templates.length === 0" class="empty-state">
      <div class="empty-icon">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="2">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      </div>
      <h3>ยังไม่มีแพ็คเกจ</h3>
      <p>แพ็คเกจบริการจะปรากฏที่นี่เมื่อมีการเปิดให้บริการ</p>
    </div>

    <!-- Content -->
    <main v-else class="content">
      <!-- Popular Bundles -->
      <section v-if="popularBundles.length > 0" class="section">
        <div class="section-header">
          <h2>แพ็คเกจยอดนิยม</h2>
          <span class="hot-badge">HOT</span>
        </div>
        
        <div class="bundles-grid">
          <div 
            v-for="bundle in popularBundles" 
            :key="bundle.id"
            class="bundle-card popular"
            @click="selectBundle(bundle)"
          >
            <div class="bundle-header">
              <div class="bundle-icon" :style="{ background: bundle.color || '#00A86B' }">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                  <rect x="3" y="3" width="7" height="7" rx="1"/>
                  <rect x="14" y="3" width="7" height="7" rx="1"/>
                  <rect x="3" y="14" width="7" height="7" rx="1"/>
                  <rect x="14" y="14" width="7" height="7" rx="1"/>
                </svg>
              </div>
              <div class="discount-badge">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
                </svg>
                ลด {{ bundle.discount_percentage }}%
              </div>
            </div>
            
            <h3>{{ bundle.name_th || bundle.name }}</h3>
            <p class="description">{{ bundle.description_th || bundle.description }}</p>
            
            <div class="services-tags">
              <span v-for="service in bundle.service_types" :key="service" class="service-tag">
                {{ getServiceName(service) }}
              </span>
            </div>
            
            <button class="select-btn">
              เลือกแพ็คเกจนี้
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
          </div>
        </div>
      </section>

      <!-- All Bundles -->
      <section class="section">
        <h2>แพ็คเกจทั้งหมด</h2>
        
        <div class="bundles-list">
          <div 
            v-for="bundle in otherBundles" 
            :key="bundle.id"
            class="bundle-row"
            @click="selectBundle(bundle)"
          >
            <div class="bundle-icon small" :style="{ background: bundle.color || '#00A86B' }">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                <rect x="3" y="3" width="7" height="7" rx="1"/>
                <rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/>
                <rect x="14" y="14" width="7" height="7" rx="1"/>
              </svg>
            </div>
            
            <div class="bundle-info">
              <h3>{{ bundle.name_th || bundle.name }}</h3>
              <div class="services-inline">
                <span v-for="(service, idx) in bundle.service_types" :key="service">
                  {{ getServiceName(service) }}{{ idx < bundle.service_types.length - 1 ? ' + ' : '' }}
                </span>
              </div>
            </div>
            
            <div class="bundle-discount">
              <span class="discount-text">ลด {{ bundle.discount_percentage }}%</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="2">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </div>
          </div>
        </div>
      </section>

      <!-- My Active Bundles -->
      <section v-if="myBundles.length > 0" class="section">
        <h2>แพ็คเกจของฉัน</h2>
        
        <div class="my-bundles-list">
          <div 
            v-for="bundle in myBundles" 
            :key="bundle.id"
            class="my-bundle-card"
            @click="viewBundleDetail(bundle)"
          >
            <div class="bundle-status" :class="bundle.status">
              {{ getStatusText(bundle.status) }}
            </div>
            <h3>{{ bundle.name }}</h3>
            <div class="bundle-progress">
              <div class="progress-bar">
                <div 
                  class="progress-fill" 
                  :style="{ width: `${(bundle.completed_services_count / bundle.total_services_count) * 100}%` }"
                ></div>
              </div>
              <span>{{ bundle.completed_services_count }}/{{ bundle.total_services_count }} บริการ</span>
            </div>
          </div>
        </div>
      </section>
    </main>

    <!-- Bundle Selection Modal -->
    <Teleport to="body">
      <div v-if="selectedBundle" class="modal-overlay" @click.self="closeModal">
        <div class="modal-content">
          <div class="modal-header">
            <h2>{{ selectedBundle.name_th || selectedBundle.name }}</h2>
            <button @click="closeModal" class="close-btn" aria-label="ปิด">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
          
          <div class="modal-body">
            <p class="modal-description">{{ selectedBundle.description_th || selectedBundle.description }}</p>
            
            <div class="included-services">
              <h4>บริการที่รวมอยู่:</h4>
              <div class="service-list">
                <div 
                  v-for="service in selectedBundle.service_types" 
                  :key="service"
                  class="service-item"
                >
                  <div class="service-icon" :style="{ background: getServiceColor(service) }">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                      <path d="M20 6L9 17l-5-5"/>
                    </svg>
                  </div>
                  <span>{{ getServiceName(service) }}</span>
                </div>
              </div>
            </div>
            
            <div class="discount-info">
              <div class="discount-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00A86B" stroke-width="2">
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
                </svg>
              </div>
              <div>
                <span class="discount-label">ส่วนลดพิเศษ</span>
                <span class="discount-value">{{ selectedBundle.discount_percentage }}%</span>
              </div>
            </div>
          </div>
          
          <div class="modal-footer">
            <button @click="closeModal" class="btn-secondary">ยกเลิก</button>
            <button @click="confirmBundle" class="btn-primary" :disabled="purchasing">
              <span v-if="purchasing">กำลังดำเนินการ...</span>
              <span v-else>เลือกแพ็คเกจนี้</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'

interface BundleTemplate {
  id: string
  name: string
  name_th: string
  description: string
  description_th: string
  service_types: string[]
  discount_percentage: number
  color: string
  is_popular: boolean
  display_order: number
}

interface MyBundle {
  id: string
  bundle_uid: string
  name: string
  status: string
  completed_services_count: number
  total_services_count: number
  created_at: string
}

const router = useRouter()
const authStore = useAuthStore()

const loading = ref(true)
const purchasing = ref(false)
const templates = ref<BundleTemplate[]>([])
const myBundles = ref<MyBundle[]>([])
const selectedBundle = ref<BundleTemplate | null>(null)

const popularBundles = computed(() => 
  templates.value.filter(t => t.is_popular)
)

const otherBundles = computed(() => 
  templates.value.filter(t => !t.is_popular)
)

const goBack = () => router.back()

const getServiceName = (type: string): string => {
  const names: Record<string, string> = {
    ride: 'เรียกรถ',
    delivery: 'ส่งของ',
    shopping: 'ซื้อของ',
    queue: 'จองคิว',
    moving: 'ขนย้าย',
    laundry: 'ซักรีด'
  }
  return names[type] || type
}

const getServiceColor = (type: string): string => {
  const colors: Record<string, string> = {
    ride: '#00A86B',
    delivery: '#F5A623',
    shopping: '#E53935',
    queue: '#9C27B0',
    moving: '#2196F3',
    laundry: '#00BCD4'
  }
  return colors[type] || '#666666'
}

const getStatusText = (status: string): string => {
  const statuses: Record<string, string> = {
    pending: 'รอดำเนินการ',
    active: 'กำลังใช้งาน',
    completed: 'เสร็จสิ้น',
    cancelled: 'ยกเลิก',
    partial: 'บางส่วน'
  }
  return statuses[status] || status
}

const selectBundle = (bundle: BundleTemplate) => {
  selectedBundle.value = bundle
}

const closeModal = () => {
  selectedBundle.value = null
}

const confirmBundle = async () => {
  if (!selectedBundle.value || !authStore.user?.id) return
  
  // Additional safety check for service_types
  if (!selectedBundle.value.service_types || selectedBundle.value.service_types.length === 0) {
    alert('ข้อมูลแพ็คเกจไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง')
    closeModal()
    return
  }
  
  purchasing.value = true
  try {
    // Show success message
    alert(`เลือกแพ็คเกจ "${selectedBundle.value.name_th || selectedBundle.value.name}" สำเร็จ!\n\nกรุณาจองบริการแต่ละรายการในแพ็คเกจ`)
    
    // Navigate to first service
    const firstService = selectedBundle.value.service_types[0]
    const routes: Record<string, string> = {
      ride: '/customer/ride',
      delivery: '/customer/delivery',
      shopping: '/customer/shopping',
      queue: '/customer/queue-booking'
    }
    
    closeModal()
    
    if (routes[firstService]) {
      router.push(routes[firstService])
    } else {
      router.push('/customer')
    }
  } catch (err) {
    console.error('Error:', err)
    alert('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง')
  } finally {
    purchasing.value = false
  }
}

const viewBundleDetail = (bundle: MyBundle) => {
  console.log('View bundle:', bundle)
  alert(`รายละเอียดแพ็คเกจ: ${bundle.name}\nสถานะ: ${getStatusText(bundle.status)}`)
}

const fetchTemplates = async () => {
  try {
    const { data, error } = await supabase
      .from('bundle_templates')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
    
    if (error) throw error
    templates.value = data || []
  } catch (err) {
    console.error('Error fetching templates:', err)
    templates.value = []
  }
}

const fetchMyBundles = async () => {
  if (!authStore.user?.id) return
  
  try {
    const { data, error } = await supabase
      .from('service_bundles')
      .select('id, bundle_uid, name, status, completed_services_count, total_services_count, created_at')
      .eq('user_id', authStore.user.id)
      .in('status', ['pending', 'active'])
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (error) throw error
    myBundles.value = data || []
  } catch (err) {
    console.error('Error fetching my bundles:', err)
    myBundles.value = []
  }
}

onMounted(async () => {
  loading.value = true
  await Promise.all([fetchTemplates(), fetchMyBundles()])
  loading.value = false
})
</script>

<style scoped>
.bundles-view {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 80px;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: #ffffff;
  border-bottom: 1px solid #f0f0f0;
  position: sticky;
  top: 0;
  z-index: 100;
}

.header h1 {
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0;
}

.back-btn {
  width: 40px;
  height: 40px;
  min-width: 44px;
  min-height: 44px;
  border: none;
  background: #f5f5f5;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #1a1a1a;
  transition: all 0.2s;
}

.back-btn:hover {
  background: #e8e8e8;
}

.spacer {
  width: 40px;
}

.loading-container {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.skeleton-card {
  height: 180px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  border-radius: 16px;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

.empty-icon {
  margin-bottom: 20px;
  opacity: 0.5;
}

.empty-state h3 {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 8px 0;
}

.empty-state p {
  font-size: 14px;
  color: #666666;
  margin: 0;
}

.content {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.section h2 {
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0;
}

.hot-badge {
  padding: 4px 10px;
  background: linear-gradient(135deg, #E53935 0%, #C62828 100%);
  border-radius: 8px;
  font-size: 11px;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: 0.5px;
}

.bundles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.bundle-card {
  background: #ffffff;
  border-radius: 20px;
  padding: 20px;
  border: 2px solid #f0f0f0;
  cursor: pointer;
  transition: all 0.2s ease;
}

.bundle-card:hover {
  border-color: #00A86B;
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 168, 107, 0.12);
}

.bundle-card.popular {
  border-color: #e8f5ef;
  background: linear-gradient(135deg, #ffffff 0%, #f8fff9 100%);
}

.bundle-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.bundle-icon {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.bundle-icon.small {
  width: 40px;
  height: 40px;
  border-radius: 12px;
}

.discount-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: #e8f5ef;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 700;
  color: #00A86B;
}

.bundle-card h3 {
  font-size: 17px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0 0 6px 0;
}

.description {
  font-size: 14px;
  color: #666666;
  margin: 0 0 16px 0;
  line-height: 1.5;
}

.services-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.service-tag {
  padding: 6px 12px;
  background: #f5f5f5;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #1a1a1a;
}

.select-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px;
  min-height: 44px;
  background: #00A86B;
  border: none;
  border-radius: 14px;
  font-size: 15px;
  font-weight: 600;
  color: #ffffff;
  cursor: pointer;
  transition: all 0.2s;
}

.select-btn:hover {
  background: #008F5B;
}

.bundles-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.bundle-row {
  background: #ffffff;
  border-radius: 16px;
  padding: 16px;
  border: 1px solid #f0f0f0;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 14px;
  transition: all 0.2s;
}

.bundle-row:hover {
  border-color: #00A86B;
  box-shadow: 0 4px 12px rgba(0, 168, 107, 0.08);
}

.bundle-info {
  flex: 1;
  min-width: 0;
}

.bundle-info h3 {
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 4px 0;
}

.services-inline {
  font-size: 13px;
  color: #666666;
}

.bundle-discount {
  display: flex;
  align-items: center;
  gap: 8px;
}

.discount-text {
  font-size: 14px;
  font-weight: 700;
  color: #00A86B;
}

.my-bundles-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.my-bundle-card {
  background: #ffffff;
  border-radius: 16px;
  padding: 16px;
  border: 1px solid #f0f0f0;
  cursor: pointer;
  transition: all 0.2s;
}

.my-bundle-card:hover {
  border-color: #00A86B;
}

.my-bundle-card h3 {
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 8px 0;
}

.bundle-status {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
}

.bundle-status.pending { background: #fff4e6; color: #F5A623; }
.bundle-status.active { background: #e8f5ef; color: #00A86B; }
.bundle-status.completed { background: #e8f5ff; color: #2196F3; }

.bundle-progress {
  display: flex;
  align-items: center;
  gap: 12px;
}

.progress-bar {
  flex: 1;
  height: 6px;
  background: #f0f0f0;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #00A86B;
  transition: width 0.3s;
}

.bundle-progress span {
  font-size: 13px;
  color: #666666;
  white-space: nowrap;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: #ffffff;
  border-radius: 24px 24px 0 0;
  width: 100%;
  max-width: 500px;
  max-height: 85vh;
  overflow-y: auto;
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #f0f0f0;
}

.modal-header h2 {
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0;
}

.close-btn {
  width: 36px;
  height: 36px;
  min-width: 44px;
  min-height: 44px;
  border: none;
  background: #f5f5f5;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #666666;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #e8e8e8;
}

.modal-body {
  padding: 20px;
}

.modal-description {
  font-size: 14px;
  color: #666666;
  line-height: 1.6;
  margin: 0 0 24px 0;
}

.included-services h4 {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 12px 0;
}

.service-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 24px;
}

.service-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.service-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.service-item span {
  font-size: 15px;
  font-weight: 500;
  color: #1a1a1a;
}

.discount-info {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #e8f5ef;
  border-radius: 14px;
}

.discount-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.discount-label {
  display: block;
  font-size: 13px;
  color: #666666;
}

.discount-value {
  display: block;
  font-size: 20px;
  font-weight: 700;
  color: #00A86B;
}

.modal-footer {
  display: flex;
  gap: 12px;
  padding: 20px;
  border-top: 1px solid #f0f0f0;
}

.btn-secondary, .btn-primary {
  flex: 1;
  padding: 16px;
  min-height: 44px;
  border-radius: 14px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary {
  background: #f5f5f5;
  border: none;
  color: #1a1a1a;
}

.btn-secondary:hover {
  background: #e8e8e8;
}

.btn-primary {
  background: #00A86B;
  border: none;
  color: #ffffff;
}

.btn-primary:hover {
  background: #008F5B;
}

.btn-primary:disabled {
  background: #cccccc;
  cursor: not-allowed;
}

@media (max-width: 640px) {
  .bundles-grid {
    grid-template-columns: 1fr;
  }
}
</style>
