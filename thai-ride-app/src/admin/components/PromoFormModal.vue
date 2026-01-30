<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
      <!-- Header -->
      <div class="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-bold text-gray-900">
            {{ isEdit ? 'แก้ไขโปรโมชั่น' : 'สร้างโปรโมชั่นใหม่' }}
          </h2>
          <button
            @click="$emit('close')"
            class="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Form -->
      <form @submit.prevent="handleSubmit" class="p-6 space-y-6">
        <!-- Basic Info -->
        <div class="space-y-4">
          <h3 class="text-lg font-semibold text-gray-900">ข้อมูลพื้นฐาน</h3>
          
          <!-- Code -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              โค้ดโปรโมชั่น <span class="text-red-500">*</span>
            </label>
            <input
              v-model="form.code"
              type="text"
              required
              placeholder="เช่น WELCOME50"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <!-- Description -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              คำอธิบาย <span class="text-red-500">*</span>
            </label>
            <textarea
              v-model="form.description"
              required
              rows="2"
              placeholder="อธิบายรายละเอียดโปรโมชั่น"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            ></textarea>
          </div>
        </div>

        <!-- Discount Settings -->
        <div class="space-y-4">
          <h3 class="text-lg font-semibold text-gray-900">การตั้งค่าส่วนลด</h3>
          
          <div class="grid grid-cols-2 gap-4">
            <!-- Discount Type -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                ประเภทส่วนลด <span class="text-red-500">*</span>
              </label>
              <select
                v-model="form.discount_type"
                required
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                @change="handleDiscountTypeChange"
              >
                <option value="fixed">ลดเป็นจำนวนเงิน (฿)</option>
                <option value="percentage">ลดเป็นเปอร์เซ็นต์ (%)</option>
              </select>
            </div>

            <!-- Discount Value -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                มูลค่าส่วนลด <span class="text-red-500">*</span>
              </label>
              <input
                v-model.number="form.discount_value"
                type="number"
                required
                min="0"
                step="0.01"
                :placeholder="form.discount_type === 'fixed' ? 'เช่น 50' : 'เช่น 20'"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                @input="calculateImpact"
              />
            </div>

            <!-- Max Discount (for percentage) -->
            <div v-if="form.discount_type === 'percentage'">
              <label class="block text-sm font-medium text-gray-700 mb-1">
                ส่วนลดสูงสุด (฿)
              </label>
              <input
                v-model.number="form.max_discount"
                type="number"
                min="0"
                step="0.01"
                placeholder="เช่น 100"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                @input="calculateImpact"
              />
            </div>

            <!-- Min Order Amount -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                ยอดสั่งซื้อขั้นต่ำ (฿)
              </label>
              <input
                v-model.number="form.min_order_amount"
                type="number"
                min="0"
                step="0.01"
                placeholder="เช่น 100"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                @input="calculateImpact"
              />
            </div>
          </div>
        </div>

        <!-- Usage Limits -->
        <div class="space-y-4">
          <h3 class="text-lg font-semibold text-gray-900">ข้อจำกัดการใช้งาน</h3>
          
          <div class="grid grid-cols-2 gap-4">
            <!-- Usage Limit -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                จำนวนครั้งทั้งหมด
              </label>
              <input
                v-model.number="form.usage_limit"
                type="number"
                min="1"
                placeholder="ไม่จำกัด"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                @input="calculateImpact"
              />
            </div>

            <!-- Per User Limit -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                จำกัดต่อผู้ใช้
              </label>
              <input
                v-model.number="form.per_user_limit"
                type="number"
                min="1"
                placeholder="ไม่จำกัด"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                @input="calculateImpact"
              />
            </div>

            <!-- Min Rides -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                จำนวนการเดินทางขั้นต่ำ
              </label>
              <input
                v-model.number="form.min_rides"
                type="number"
                min="0"
                placeholder="0"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                @input="calculateImpact"
              />
            </div>

            <!-- User Type -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                ประเภทผู้ใช้
              </label>
              <select
                v-model="form.user_type"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">ทั้งหมด</option>
                <option value="new">ผู้ใช้ใหม่</option>
                <option value="existing">ผู้ใช้เดิม</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Service Types & Category -->
        <div class="space-y-4">
          <h3 class="text-lg font-semibold text-gray-900">บริการและหมวดหมู่</h3>
          
          <div class="grid grid-cols-2 gap-4">
            <!-- Service Types -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                บริการที่ใช้ได้ <span class="text-red-500">*</span>
              </label>
              <div class="space-y-2">
                <label class="flex items-center">
                  <input
                    v-model="form.service_types"
                    type="checkbox"
                    value="ride"
                    class="h-4 w-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span class="ml-2 text-sm text-gray-700">Ride</span>
                </label>
                <label class="flex items-center">
                  <input
                    v-model="form.service_types"
                    type="checkbox"
                    value="delivery"
                    class="h-4 w-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span class="ml-2 text-sm text-gray-700">Delivery</span>
                </label>
                <label class="flex items-center">
                  <input
                    v-model="form.service_types"
                    type="checkbox"
                    value="shopping"
                    class="h-4 w-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span class="ml-2 text-sm text-gray-700">Shopping</span>
                </label>
              </div>
            </div>

            <!-- Category -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                หมวดหมู่
              </label>
              <select
                v-model="form.category"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">ทั้งหมด</option>
                <option value="ride">Ride</option>
                <option value="delivery">Delivery</option>
                <option value="shopping">Shopping</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Validity Period -->
        <div class="space-y-4">
          <h3 class="text-lg font-semibold text-gray-900">ระยะเวลา</h3>
          
          <div class="grid grid-cols-2 gap-4">
            <!-- Valid From -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                เริ่มต้น <span class="text-red-500">*</span>
              </label>
              <input
                v-model="form.valid_from"
                type="datetime-local"
                required
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <!-- Valid Until -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                สิ้นสุด <span class="text-red-500">*</span>
              </label>
              <input
                v-model="form.valid_until"
                type="datetime-local"
                required
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        <!-- Active Status -->
        <div>
          <label class="flex items-center">
            <input
              v-model="form.is_active"
              type="checkbox"
              class="h-4 w-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <span class="ml-2 text-sm font-medium text-gray-700">เปิดใช้งานทันที</span>
          </label>
        </div>

        <!-- Impact Analysis -->
        <div v-if="impact" class="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 class="text-lg font-semibold text-gray-900 mb-3">📊 การวิเคราะห์ผลกระทบ</h3>
          
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <div class="text-xs text-gray-600">ลูกค้าที่มีสิทธิ์</div>
              <div class="text-lg font-bold text-gray-900">{{ impact.eligible_customers.toLocaleString() }}</div>
            </div>
            <div>
              <div class="text-xs text-gray-600">การใช้งานโดยประมาณ</div>
              <div class="text-lg font-bold text-gray-900">{{ impact.estimated_usage.toLocaleString() }}</div>
            </div>
            <div>
              <div class="text-xs text-gray-600">ต้นทุนส่วนลด</div>
              <div class="text-lg font-bold text-orange-600">฿{{ impact.estimated_discount_cost.toLocaleString() }}</div>
            </div>
            <div>
              <div class="text-xs text-gray-600">ROI</div>
              <div :class="[
                'text-lg font-bold',
                impact.roi_percentage >= 0 ? 'text-green-600' : 'text-red-600'
              ]">
                {{ impact.roi_percentage.toFixed(1) }}%
              </div>
            </div>
          </div>

          <!-- Risk Level -->
          <div class="mb-3">
            <div class="flex items-center gap-2 mb-2">
              <span class="text-sm font-medium text-gray-700">ระดับความเสี่ยง:</span>
              <span :class="[
                'px-2 py-1 text-xs font-medium rounded-full',
                impact.risk_level === 'low' ? 'bg-green-100 text-green-700' :
                impact.risk_level === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              ]">
                {{ impact.risk_level === 'low' ? 'ต่ำ' : impact.risk_level === 'medium' ? 'ปานกลาง' : 'สูง' }}
              </span>
            </div>
            <ul v-if="impact.risk_factors.length > 0" class="text-sm text-gray-600 space-y-1">
              <li v-for="(factor, index) in impact.risk_factors" :key="index" class="flex items-start gap-2">
                <span class="text-red-500">⚠️</span>
                <span>{{ factor }}</span>
              </li>
            </ul>
          </div>

          <!-- Recommendations -->
          <div v-if="impact.recommendations.length > 0">
            <div class="text-sm font-medium text-gray-700 mb-2">💡 คำแนะนำ:</div>
            <ul class="text-sm text-gray-600 space-y-1">
              <li v-for="(rec, index) in impact.recommendations" :key="index" class="flex items-start gap-2">
                <span>•</span>
                <span>{{ rec }}</span>
              </li>
            </ul>
          </div>
        </div>

        <!-- Loading Impact -->
        <div v-if="impactLoading" class="text-center py-4">
          <div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <p class="text-sm text-gray-600 mt-2">กำลังวิเคราะห์ผลกระทบ...</p>
        </div>

        <!-- Actions -->
        <div class="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            @click="$emit('close')"
            class="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            :disabled="loading || !canSubmit"
            class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ loading ? 'กำลังบันทึก...' : isEdit ? 'บันทึกการแก้ไข' : 'สร้างโปรโมชั่น' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useAdminPromos } from '@/admin/composables/useAdminPromos'
import { usePromoImpact } from '@/admin/composables/usePromoImpact'
import type { Database } from '@/types/database'

type PromoCode = Database['public']['Tables']['promo_codes']['Row']

interface Props {
  promo?: PromoCode | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
  save: []
}>()

const { createPromo, updatePromo } = useAdminPromos()
const { impact, loading: impactLoading, calculateImpact: calcImpact } = usePromoImpact()

const loading = ref(false)
const isEdit = computed(() => !!props.promo)

const form = ref({
  code: '',
  description: '',
  discount_type: 'fixed' as 'fixed' | 'percentage',
  discount_value: 0,
  max_discount: null as number | null,
  min_order_amount: null as number | null,
  usage_limit: null as number | null,
  per_user_limit: null as number | null,
  min_rides: 0,
  user_type: 'all',
  service_types: [] as string[],
  category: 'all',
  valid_from: '',
  valid_until: '',
  is_active: true
})

const canSubmit = computed(() => {
  return form.value.code &&
    form.value.description &&
    form.value.discount_value > 0 &&
    form.value.service_types.length > 0 &&
    form.value.valid_from &&
    form.value.valid_until
})

onMounted(() => {
  if (props.promo) {
    // Populate form with existing promo data
    form.value = {
      code: props.promo.code,
      description: props.promo.description || '',
      discount_type: props.promo.discount_type as 'fixed' | 'percentage',
      discount_value: Number(props.promo.discount_value),
      max_discount: props.promo.max_discount ? Number(props.promo.max_discount) : null,
      min_order_amount: props.promo.min_order_amount ? Number(props.promo.min_order_amount) : null,
      usage_limit: props.promo.usage_limit,
      per_user_limit: props.promo.per_user_limit,
      min_rides: props.promo.min_rides || 0,
      user_type: props.promo.user_type || 'all',
      service_types: props.promo.service_types || [],
      category: props.promo.category || 'all',
      valid_from: props.promo.valid_from ? new Date(props.promo.valid_from).toISOString().slice(0, 16) : '',
      valid_until: props.promo.valid_until ? new Date(props.promo.valid_until).toISOString().slice(0, 16) : '',
      is_active: props.promo.is_active ?? true
    }
  } else {
    // Set default dates for new promo
    const now = new Date()
    const nextMonth = new Date(now)
    nextMonth.setMonth(nextMonth.getMonth() + 1)
    
    form.value.valid_from = now.toISOString().slice(0, 16)
    form.value.valid_until = nextMonth.toISOString().slice(0, 16)
  }

  // Calculate initial impact
  calculateImpact()
})

// Watch for form changes to recalculate impact
watch(() => [
  form.value.discount_type,
  form.value.discount_value,
  form.value.max_discount,
  form.value.min_order_amount,
  form.value.usage_limit,
  form.value.per_user_limit,
  form.value.min_rides
], () => {
  calculateImpact()
}, { deep: true })

function handleDiscountTypeChange() {
  if (form.value.discount_type === 'fixed') {
    form.value.max_discount = null
  }
  calculateImpact()
}

async function calculateImpact() {
  if (!canSubmit.value) return

  try {
    await calcImpact({
      discount_type: form.value.discount_type,
      discount_value: form.value.discount_value,
      max_discount: form.value.max_discount || undefined,
      min_order_amount: form.value.min_order_amount || undefined,
      usage_limit: form.value.usage_limit || undefined,
      service_types: form.value.service_types,
      user_type: form.value.user_type,
      per_user_limit: form.value.per_user_limit || undefined,
      min_rides: form.value.min_rides
    })
  } catch (err) {
    console.error('Failed to calculate impact:', err)
  }
}

async function handleSubmit() {
  if (!canSubmit.value) return

  loading.value = true

  try {
    const promoData = {
      code: form.value.code.toUpperCase(),
      description: form.value.description,
      discount_type: form.value.discount_type,
      discount_value: form.value.discount_value,
      max_discount: form.value.max_discount,
      min_order_amount: form.value.min_order_amount,
      usage_limit: form.value.usage_limit,
      per_user_limit: form.value.per_user_limit,
      min_rides: form.value.min_rides,
      user_type: form.value.user_type,
      service_types: form.value.service_types,
      category: form.value.category,
      valid_from: new Date(form.value.valid_from).toISOString(),
      valid_until: new Date(form.value.valid_until).toISOString(),
      is_active: form.value.is_active
    }

    if (isEdit.value && props.promo) {
      await updatePromo(props.promo.id, promoData)
    } else {
      await createPromo(promoData)
    }

    emit('save')
  } catch (err) {
    console.error('Failed to save promo:', err)
    alert('เกิดข้อผิดพลาดในการบันทึก กรุณาลองใหม่อีกครั้ง')
  } finally {
    loading.value = false
  }
}
</script>
