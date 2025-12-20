<script setup lang="ts">
/**
 * Admin A/B Tests View (F203)
 * จัดการ A/B Testing สำหรับ Admin
 * 
 * Memory Optimization: Task 36
 * - Cleans up tests array on unmount
 * - Resets form state and modals
 */
import { ref, onMounted, computed } from 'vue'
import AdminLayout from '../components/AdminLayout.vue'
import { useAdminCleanup } from '../composables/useAdminCleanup'
import { 
  fetchABTests, fetchABTestWithVariants, createABTest, updateABTest, 
  deleteABTest, startABTest, stopABTest, createABTestVariant,
  deleteABTestVariant, fetchABTestResults
} from '../composables/useAdmin'

const { addCleanup } = useAdminCleanup()

interface ABTest {
  id: string
  name: string
  description: string | null
  status: 'draft' | 'running' | 'completed' | 'paused'
  traffic_percentage: number
  start_date: string | null
  end_date: string | null
  created_at: string
}

interface Variant {
  id: string
  test_id: string
  name: string
  description: string | null
  weight: number
  config: Record<string, any>
}

interface TestResult {
  variant_id: string
  variant_name: string
  assignments: number
  conversions: number
  conversion_rate: number
}

const loading = ref(false)
const tests = ref<ABTest[]>([])
const total = ref(0)
const activeTab = ref<'all' | 'running' | 'draft' | 'completed'>('all')
const showModal = ref(false)
const showResultsModal = ref(false)
const editingTest = ref<ABTest | null>(null)
const selectedTest = ref<ABTest | null>(null)
const variants = ref<Variant[]>([])
const results = ref<TestResult[]>([])

// Form state
const form = ref({
  name: '',
  description: '',
  trafficPercentage: 50,
  startDate: '',
  endDate: ''
})

const variantForm = ref({
  name: '',
  description: '',
  weight: 50
})

const filteredTests = computed(() => {
  if (activeTab.value === 'all') return tests.value
  return tests.value.filter(t => t.status === activeTab.value)
})

const statusColors: Record<string, string> = {
  draft: '#6B7280',
  running: '#00A86B',
  completed: '#3B82F6',
  paused: '#F59E0B'
}

const statusLabels: Record<string, string> = {
  draft: 'ร่าง',
  running: 'กำลังทดสอบ',
  completed: 'เสร็จสิ้น',
  paused: 'หยุดชั่วคราว'
}

const loadTests = async () => {
  loading.value = true
  try {
    const result = await fetchABTests(1, 50)
    tests.value = result.data as ABTest[]
    total.value = result.total
  } finally {
    loading.value = false
  }
}

const openCreateModal = () => {
  editingTest.value = null
  form.value = { name: '', description: '', trafficPercentage: 50, startDate: '', endDate: '' }
  showModal.value = true
}

const openEditModal = (test: ABTest) => {
  editingTest.value = test
  form.value = {
    name: test.name,
    description: test.description || '',
    trafficPercentage: test.traffic_percentage,
    startDate: test.start_date || '',
    endDate: test.end_date || ''
  }
  showModal.value = true
}

const saveTest = async () => {
  loading.value = true
  try {
    if (editingTest.value) {
      await updateABTest(editingTest.value.id, {
        name: form.value.name,
        description: form.value.description,
        trafficPercentage: form.value.trafficPercentage,
        startDate: form.value.startDate || undefined,
        endDate: form.value.endDate || undefined
      })
    } else {
      await createABTest({
        name: form.value.name,
        description: form.value.description,
        trafficPercentage: form.value.trafficPercentage,
        startDate: form.value.startDate || undefined,
        endDate: form.value.endDate || undefined
      })
    }
    showModal.value = false
    await loadTests()
  } finally {
    loading.value = false
  }
}

const handleStart = async (test: ABTest) => {
  if (!confirm(`เริ่มทดสอบ "${test.name}"?`)) return
  await startABTest(test.id)
  await loadTests()
}

const handleStop = async (test: ABTest) => {
  if (!confirm(`หยุดทดสอบ "${test.name}"?`)) return
  await stopABTest(test.id)
  await loadTests()
}

const handleDelete = async (test: ABTest) => {
  if (!confirm(`ยืนยันลบ A/B Test "${test.name}"?`)) return
  await deleteABTest(test.id)
  await loadTests()
}

const viewResults = async (test: ABTest) => {
  selectedTest.value = test
  loading.value = true
  try {
    const [testData, resultsData] = await Promise.all([
      fetchABTestWithVariants(test.id),
      fetchABTestResults(test.id)
    ])
    variants.value = testData.variants
    results.value = resultsData
    showResultsModal.value = true
  } finally {
    loading.value = false
  }
}

const addVariant = async () => {
  if (!selectedTest.value || !variantForm.value.name) return
  await createABTestVariant({
    testId: selectedTest.value.id,
    name: variantForm.value.name,
    description: variantForm.value.description,
    weight: variantForm.value.weight
  })
  variantForm.value = { name: '', description: '', weight: 50 }
  const testData = await fetchABTestWithVariants(selectedTest.value.id)
  variants.value = testData.variants
}

const removeVariant = async (variantId: string) => {
  if (!confirm('ลบ variant นี้?')) return
  await deleteABTestVariant(variantId)
  if (selectedTest.value) {
    const testData = await fetchABTestWithVariants(selectedTest.value.id)
    variants.value = testData.variants
  }
}

onMounted(loadTests)

// Cleanup on unmount - Task 36
addCleanup(() => {
  tests.value = []
  variants.value = []
  results.value = []
  showModal.value = false
  showResultsModal.value = false
  editingTest.value = null
  selectedTest.value = null
  form.value = { name: '', description: '', trafficPercentage: 50, startDate: '', endDate: '' }
  variantForm.value = { name: '', description: '', weight: 50 }
  console.log('[AdminABTestsView] Cleanup complete')
})
</script>

<template>
  <AdminLayout>
    <div class="admin-page">
      <!-- Header -->
      <div class="page-header">
        <div>
          <h1 class="page-title">A/B Testing</h1>
          <p class="page-subtitle">จัดการการทดสอบ A/B สำหรับปรับปรุง UX</p>
        </div>
        <button class="btn-primary" @click="openCreateModal">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          สร้าง Test ใหม่
        </button>
      </div>

      <!-- Tabs -->
      <div class="tabs">
        <button 
          v-for="tab in ['all', 'running', 'draft', 'completed']" 
          :key="tab"
          class="tab" 
          :class="{ active: activeTab === tab }"
          @click="activeTab = tab as any"
        >
          {{ tab === 'all' ? 'ทั้งหมด' : statusLabels[tab] }}
          <span class="tab-count">{{ tab === 'all' ? tests.length : tests.filter(t => t.status === tab).length }}</span>
        </button>
      </div>

      <!-- Stats -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">{{ tests.length }}</div>
          <div class="stat-label">ทั้งหมด</div>
        </div>
        <div class="stat-card">
          <div class="stat-value text-green">{{ tests.filter(t => t.status === 'running').length }}</div>
          <div class="stat-label">กำลังทดสอบ</div>
        </div>
        <div class="stat-card">
          <div class="stat-value text-blue">{{ tests.filter(t => t.status === 'completed').length }}</div>
          <div class="stat-label">เสร็จสิ้น</div>
        </div>
        <div class="stat-card">
          <div class="stat-value text-gray">{{ tests.filter(t => t.status === 'draft').length }}</div>
          <div class="stat-label">ร่าง</div>
        </div>
      </div>

      <!-- Tests List -->
      <div class="tests-list">
        <div v-if="loading" class="loading-state">กำลังโหลด...</div>
        <div v-else-if="filteredTests.length === 0" class="empty-state">ไม่พบ A/B Tests</div>
        <div v-else v-for="test in filteredTests" :key="test.id" class="test-card">
          <div class="test-header">
            <div class="test-info">
              <div class="test-name">{{ test.name }}</div>
              <span class="status-badge" :style="{ background: statusColors[test.status] + '20', color: statusColors[test.status] }">
                {{ statusLabels[test.status] }}
              </span>
            </div>
            <div class="test-traffic">{{ test.traffic_percentage }}% traffic</div>
          </div>
          
          <p v-if="test.description" class="test-description">{{ test.description }}</p>
          
          <div class="test-meta">
            <div v-if="test.start_date" class="meta-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
              </svg>
              เริ่ม: {{ new Date(test.start_date).toLocaleDateString('th-TH') }}
            </div>
            <div v-if="test.end_date" class="meta-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
              </svg>
              สิ้นสุด: {{ new Date(test.end_date).toLocaleDateString('th-TH') }}
            </div>
          </div>
          
          <div class="test-actions">
            <button v-if="test.status === 'draft'" class="btn-action btn-start" @click="handleStart(test)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
              เริ่มทดสอบ
            </button>
            <button v-if="test.status === 'running'" class="btn-action btn-stop" @click="handleStop(test)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
              </svg>
              หยุด
            </button>
            <button class="btn-action" @click="viewResults(test)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 20V10M12 20V4M6 20v-6"/>
              </svg>
              ดูผลลัพธ์
            </button>
            <button class="btn-icon" @click="openEditModal(test)" title="แก้ไข">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button class="btn-icon btn-danger" @click="handleDelete(test)" title="ลบ">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Create/Edit Modal -->
      <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
        <div class="modal">
          <div class="modal-header">
            <h2>{{ editingTest ? 'แก้ไข A/B Test' : 'สร้าง A/B Test ใหม่' }}</h2>
            <button class="btn-close" @click="showModal = false">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
          
          <div class="modal-body">
            <div class="form-group">
              <label>ชื่อ Test</label>
              <input v-model="form.name" type="text" placeholder="เช่น Booking Button Color" class="form-input">
            </div>
            
            <div class="form-group">
              <label>คำอธิบาย</label>
              <textarea v-model="form.description" placeholder="รายละเอียดการทดสอบ..." class="form-textarea" rows="3"></textarea>
            </div>
            
            <div class="form-group">
              <label>Traffic Percentage</label>
              <div class="range-input">
                <input v-model.number="form.trafficPercentage" type="range" min="1" max="100" class="form-range">
                <span class="range-value">{{ form.trafficPercentage }}%</span>
              </div>
              <small>เปอร์เซ็นต์ของผู้ใช้ที่จะเข้าร่วมการทดสอบ</small>
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label>วันเริ่มต้น</label>
                <input v-model="form.startDate" type="date" class="form-input">
              </div>
              <div class="form-group">
                <label>วันสิ้นสุด</label>
                <input v-model="form.endDate" type="date" class="form-input">
              </div>
            </div>
          </div>
          
          <div class="modal-footer">
            <button class="btn-secondary" @click="showModal = false">ยกเลิก</button>
            <button class="btn-primary" @click="saveTest" :disabled="loading || !form.name">
              {{ loading ? 'กำลังบันทึก...' : 'บันทึก' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Results Modal -->
      <div v-if="showResultsModal" class="modal-overlay" @click.self="showResultsModal = false">
        <div class="modal modal-lg">
          <div class="modal-header">
            <h2>ผลลัพธ์: {{ selectedTest?.name }}</h2>
            <button class="btn-close" @click="showResultsModal = false">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
          
          <div class="modal-body">
            <!-- Variants -->
            <div class="section">
              <h3 class="section-title">Variants</h3>
              <div class="variants-list">
                <div v-for="variant in variants" :key="variant.id" class="variant-card">
                  <div class="variant-header">
                    <span class="variant-name">{{ variant.name }}</span>
                    <span class="variant-weight">{{ variant.weight }}%</span>
                  </div>
                  <p v-if="variant.description" class="variant-desc">{{ variant.description }}</p>
                  <button class="btn-remove" @click="removeVariant(variant.id)">ลบ</button>
                </div>
              </div>
              
              <!-- Add Variant -->
              <div class="add-variant">
                <input v-model="variantForm.name" type="text" placeholder="ชื่อ Variant" class="form-input">
                <input v-model.number="variantForm.weight" type="number" min="1" max="100" placeholder="Weight %" class="form-input form-input-sm">
                <button class="btn-primary btn-sm" @click="addVariant" :disabled="!variantForm.name">เพิ่ม</button>
              </div>
            </div>
            
            <!-- Results -->
            <div class="section">
              <h3 class="section-title">ผลการทดสอบ</h3>
              <div v-if="results.length === 0" class="empty-state-sm">ยังไม่มีข้อมูล</div>
              <div v-else class="results-table">
                <table>
                  <thead>
                    <tr>
                      <th>Variant</th>
                      <th>Assignments</th>
                      <th>Conversions</th>
                      <th>Conversion Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="result in results" :key="result.variant_id">
                      <td>{{ result.variant_name }}</td>
                      <td>{{ result.assignments.toLocaleString() }}</td>
                      <td>{{ result.conversions.toLocaleString() }}</td>
                      <td>
                        <span class="rate-badge" :class="{ winner: result.conversion_rate === Math.max(...results.map(r => r.conversion_rate)) }">
                          {{ result.conversion_rate.toFixed(2) }}%
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          
          <div class="modal-footer">
            <button class="btn-secondary" @click="showResultsModal = false">ปิด</button>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<style scoped>
.admin-page { padding: 24px; max-width: 1200px; margin: 0 auto; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
.page-title { font-size: 24px; font-weight: 700; color: #1a1a1a; margin: 0; }
.page-subtitle { font-size: 14px; color: #666; margin: 4px 0 0; }

.btn-primary { display: flex; align-items: center; gap: 8px; padding: 12px 20px; background: #00A86B; color: white; border: none; border-radius: 12px; font-weight: 600; cursor: pointer; transition: background 0.2s; }
.btn-primary:hover { background: #008F5B; }
.btn-primary:disabled { background: #ccc; cursor: not-allowed; }
.btn-primary.btn-sm { padding: 8px 16px; font-size: 14px; }

.tabs { display: flex; gap: 8px; margin-bottom: 24px; overflow-x: auto; }
.tab { padding: 10px 16px; background: #f5f5f5; border: none; border-radius: 10px; font-size: 14px; font-weight: 500; color: #666; cursor: pointer; display: flex; align-items: center; gap: 8px; white-space: nowrap; }
.tab.active { background: #1a1a1a; color: white; }
.tab-count { background: rgba(0,0,0,0.1); padding: 2px 8px; border-radius: 10px; font-size: 12px; }
.tab.active .tab-count { background: rgba(255,255,255,0.2); }

.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
.stat-card { background: white; padding: 20px; border-radius: 16px; border: 1px solid #f0f0f0; text-align: center; }
.stat-value { font-size: 28px; font-weight: 700; color: #1a1a1a; }
.stat-value.text-green { color: #00A86B; }
.stat-value.text-blue { color: #3B82F6; }
.stat-value.text-gray { color: #999; }
.stat-label { font-size: 13px; color: #666; margin-top: 4px; }

.tests-list { display: flex; flex-direction: column; gap: 16px; }
.test-card { background: white; padding: 20px; border-radius: 16px; border: 1px solid #f0f0f0; }
.test-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
.test-info { display: flex; align-items: center; gap: 12px; }
.test-name { font-size: 16px; font-weight: 600; color: #1a1a1a; }
.status-badge { padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 500; }
.test-traffic { font-size: 14px; color: #666; font-weight: 500; }
.test-description { font-size: 14px; color: #666; margin: 0 0 12px; }
.test-meta { display: flex; gap: 16px; margin-bottom: 16px; }
.meta-item { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #666; }
.test-actions { display: flex; gap: 8px; flex-wrap: wrap; }

.btn-action { display: flex; align-items: center; gap: 6px; padding: 8px 14px; background: #f5f5f5; border: none; border-radius: 8px; font-size: 13px; font-weight: 500; color: #666; cursor: pointer; }
.btn-action:hover { background: #e5e5e5; color: #1a1a1a; }
.btn-action.btn-start { background: #E8F5EF; color: #00A86B; }
.btn-action.btn-start:hover { background: #D1EBE1; }
.btn-action.btn-stop { background: #FEF3C7; color: #D97706; }
.btn-action.btn-stop:hover { background: #FDE68A; }

.btn-icon { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background: #f5f5f5; border: none; border-radius: 8px; cursor: pointer; color: #666; }
.btn-icon:hover { background: #e5e5e5; color: #1a1a1a; }
.btn-icon.btn-danger:hover { background: #FEE2E2; color: #DC2626; }

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
.modal { background: white; border-radius: 20px; width: 100%; max-width: 500px; max-height: 90vh; overflow-y: auto; }
.modal.modal-lg { max-width: 700px; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid #f0f0f0; }
.modal-header h2 { font-size: 18px; font-weight: 600; margin: 0; }
.btn-close { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; background: none; border: none; cursor: pointer; border-radius: 8px; color: #666; }
.btn-close:hover { background: #f5f5f5; }
.modal-body { padding: 24px; }
.modal-footer { display: flex; justify-content: flex-end; gap: 12px; padding: 20px 24px; border-top: 1px solid #f0f0f0; }

.form-group { margin-bottom: 20px; }
.form-group label { display: block; font-size: 14px; font-weight: 500; color: #1a1a1a; margin-bottom: 8px; }
.form-group small { display: block; font-size: 12px; color: #999; margin-top: 4px; }
.form-input, .form-textarea { width: 100%; padding: 12px 16px; border: 2px solid #e8e8e8; border-radius: 12px; font-size: 15px; }
.form-input:focus, .form-textarea:focus { outline: none; border-color: #00A86B; }
.form-input-sm { width: 100px; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.range-input { display: flex; align-items: center; gap: 16px; }
.form-range { flex: 1; height: 8px; -webkit-appearance: none; background: #e8e8e8; border-radius: 4px; }
.form-range::-webkit-slider-thumb { -webkit-appearance: none; width: 20px; height: 20px; background: #00A86B; border-radius: 50%; cursor: pointer; }
.range-value { font-size: 14px; font-weight: 600; color: #00A86B; min-width: 50px; }

.btn-secondary { padding: 12px 20px; background: #f5f5f5; color: #1a1a1a; border: none; border-radius: 12px; font-weight: 600; cursor: pointer; }
.btn-secondary:hover { background: #e5e5e5; }

.section { margin-bottom: 24px; }
.section-title { font-size: 16px; font-weight: 600; margin: 0 0 16px; }
.variants-list { display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px; }
.variant-card { background: #f9f9f9; padding: 16px; border-radius: 12px; position: relative; }
.variant-header { display: flex; justify-content: space-between; align-items: center; }
.variant-name { font-weight: 600; }
.variant-weight { font-size: 14px; color: #00A86B; font-weight: 500; }
.variant-desc { font-size: 13px; color: #666; margin: 8px 0 0; }
.btn-remove { position: absolute; top: 12px; right: 12px; background: none; border: none; color: #DC2626; font-size: 12px; cursor: pointer; }
.add-variant { display: flex; gap: 12px; align-items: center; }

.results-table { overflow-x: auto; }
.results-table table { width: 100%; border-collapse: collapse; }
.results-table th, .results-table td { padding: 12px; text-align: left; border-bottom: 1px solid #f0f0f0; }
.results-table th { font-size: 13px; font-weight: 600; color: #666; }
.rate-badge { padding: 4px 10px; background: #f5f5f5; border-radius: 6px; font-weight: 600; }
.rate-badge.winner { background: #E8F5EF; color: #00A86B; }

.loading-state, .empty-state { text-align: center; padding: 60px 20px; color: #666; }
.empty-state-sm { text-align: center; padding: 24px; color: #999; font-size: 14px; }

@media (max-width: 768px) {
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
  .page-header { flex-direction: column; gap: 16px; }
  .form-row { grid-template-columns: 1fr; }
  .add-variant { flex-direction: column; }
  .add-variant .form-input { width: 100%; }
}
</style>
