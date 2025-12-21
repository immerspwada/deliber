<script setup lang="ts">
/**
 * Admin Notification Templates Management View
 * Feature: F07 - Push Notification Templates
 * 
 * Admin สามารถ:
 * - ดู/สร้าง/แก้ไข/ลบ Notification Templates
 * - จัดการ Variables ใน Templates
 * - Preview Templates ก่อนใช้งาน
 * - ดูสถิติการใช้งาน Template
 */

import { ref, computed, onMounted, watch } from 'vue'
import { 
  useNotificationTemplates, 
  type NotificationTemplate,
  TEMPLATE_CATEGORIES 
} from '../composables/useNotificationTemplates'

const {
  templates,
  isLoading,
  error,
  fetchTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  toggleTemplateActive,
  previewTemplate
} = useNotificationTemplates()

// State
const activeTab = ref<'list' | 'create' | 'edit'>('list')
const categoryFilter = ref('all')
const searchQuery = ref('')
const selectedTemplate = ref<NotificationTemplate | null>(null)
const showPreview = ref(false)
const previewVariables = ref<Record<string, string>>({})

// Form state
const form = ref({
  name: '',
  name_th: '',
  category: 'general',
  title: '',
  body: '',
  icon: '/pwa-192x192.png',
  url: '',
  variables: [] as string[],
  is_active: true
})
const newVariable = ref('')

// Filtered templates
const filteredTemplates = computed(() => {
  let result = templates.value

  if (categoryFilter.value !== 'all') {
    result = result.filter(t => t.category === categoryFilter.value)
  }

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(t => 
      t.name.toLowerCase().includes(query) ||
      t.name_th?.toLowerCase().includes(query) ||
      t.title.toLowerCase().includes(query)
    )
  }

  return result
})

// Category label
const getCategoryLabel = (category: string) => {
  return TEMPLATE_CATEGORIES.find(c => c.value === category)?.label || category
}

const getCategoryIcon = (category: string) => {
  return TEMPLATE_CATEGORIES.find(c => c.value === category)?.icon || '📝'
}

// Reset form
const resetForm = () => {
  form.value = {
    name: '',
    name_th: '',
    category: 'general',
    title: '',
    body: '',
    icon: '/pwa-192x192.png',
    url: '',
    variables: [],
    is_active: true
  }
  newVariable.value = ''
  selectedTemplate.value = null
}

// Add variable
const addVariable = () => {
  const varName = newVariable.value.trim().replace(/[^a-zA-Z0-9_]/g, '')
  if (varName && !form.value.variables.includes(varName)) {
    form.value.variables.push(varName)
    newVariable.value = ''
  }
}

// Remove variable
const removeVariable = (index: number) => {
  form.value.variables.splice(index, 1)
}

// Insert variable into text
const insertVariable = (field: 'title' | 'body', varName: string) => {
  form.value[field] += `{{${varName}}}`
}

// Open create form
const openCreate = () => {
  resetForm()
  activeTab.value = 'create'
}

// Open edit form
const openEdit = (template: NotificationTemplate) => {
  selectedTemplate.value = template
  form.value = {
    name: template.name,
    name_th: template.name_th || '',
    category: template.category,
    title: template.title,
    body: template.body,
    icon: template.icon,
    url: template.url || '',
    variables: [...template.variables],
    is_active: template.is_active
  }
  activeTab.value = 'edit'
}

// Save template
const saveTemplate = async () => {
  if (!form.value.name || !form.value.title || !form.value.body) {
    alert('กรุณากรอกข้อมูลให้ครบ')
    return
  }

  if (activeTab.value === 'create') {
    const result = await createTemplate(form.value)
    if (result) {
      activeTab.value = 'list'
      resetForm()
    }
  } else if (activeTab.value === 'edit' && selectedTemplate.value) {
    const success = await updateTemplate(selectedTemplate.value.id, form.value)
    if (success) {
      activeTab.value = 'list'
      resetForm()
    }
  }
}

// Delete template
const handleDelete = async (template: NotificationTemplate) => {
  if (!confirm(`ต้องการลบ Template "${template.name}" หรือไม่?`)) return
  
  const success = await deleteTemplate(template.id)
  if (success && selectedTemplate.value?.id === template.id) {
    activeTab.value = 'list'
    resetForm()
  }
}

// Toggle active
const handleToggleActive = async (template: NotificationTemplate) => {
  await toggleTemplateActive(template.id, !template.is_active)
}

// Preview
const openPreview = (template: NotificationTemplate) => {
  selectedTemplate.value = template
  previewVariables.value = {}
  for (const v of template.variables) {
    previewVariables.value[v] = ''
  }
  showPreview.value = true
}

const previewContent = computed(() => {
  if (!selectedTemplate.value) return { title: '', body: '' }
  return previewTemplate(selectedTemplate.value, previewVariables.value)
})

// Format date
const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

// Watch category filter
watch(categoryFilter, () => {
  fetchTemplates(categoryFilter.value === 'all' ? undefined : categoryFilter.value)
})

onMounted(() => {
  fetchTemplates()
})
</script>

<template>
  <div class="p-6 max-w-7xl mx-auto">
    <!-- Header -->
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Notification Templates</h1>
        <p class="text-gray-600">จัดการ Template สำหรับ Push Notification</p>
      </div>
      <button
        v-if="activeTab === 'list'"
        @click="openCreate"
        class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        สร้าง Template
      </button>
      <button
        v-else
        @click="activeTab = 'list'; resetForm()"
        class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
      >
        กลับ
      </button>
    </div>

    <!-- List View -->
    <div v-if="activeTab === 'list'" class="space-y-6">
      <!-- Filters -->
      <div class="bg-white rounded-xl border border-gray-100 p-4">
        <div class="flex flex-wrap gap-4">
          <div class="flex-1 min-w-[200px]">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="ค้นหา Template..."
              class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          <select
            v-model="categoryFilter"
            class="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500"
          >
            <option value="all">ทุกหมวดหมู่</option>
            <option v-for="cat in TEMPLATE_CATEGORIES" :key="cat.value" :value="cat.value">
              {{ cat.icon }} {{ cat.label }}
            </option>
          </select>
        </div>
      </div>

      <!-- Templates Grid -->
      <div v-if="isLoading" class="text-center py-12 text-gray-500">
        กำลังโหลด...
      </div>
      <div v-else-if="filteredTemplates.length === 0" class="text-center py-12 text-gray-500">
        ไม่พบ Template
      </div>
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="template in filteredTemplates"
          :key="template.id"
          class="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition-shadow"
        >
          <!-- Header -->
          <div class="flex items-start justify-between mb-3">
            <div class="flex items-center gap-2">
              <span class="text-xl">{{ getCategoryIcon(template.category) }}</span>
              <div>
                <h3 class="font-semibold text-gray-900">{{ template.name }}</h3>
                <p v-if="template.name_th" class="text-sm text-gray-500">{{ template.name_th }}</p>
              </div>
            </div>
            <span
              :class="[
                'px-2 py-1 text-xs font-medium rounded-full',
                template.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
              ]"
            >
              {{ template.is_active ? 'เปิดใช้' : 'ปิด' }}
            </span>
          </div>

          <!-- Content Preview -->
          <div class="bg-gray-50 rounded-lg p-3 mb-3">
            <p class="font-medium text-gray-900 text-sm">{{ template.title }}</p>
            <p class="text-gray-600 text-sm mt-1 line-clamp-2">{{ template.body }}</p>
          </div>

          <!-- Variables -->
          <div v-if="template.variables.length > 0" class="mb-3">
            <p class="text-xs text-gray-500 mb-1">ตัวแปร:</p>
            <div class="flex flex-wrap gap-1">
              <span
                v-for="v in template.variables"
                :key="v"
                class="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded"
              >
                {{ v }}
              </span>
            </div>
          </div>

          <!-- Stats -->
          <div class="flex items-center justify-between text-xs text-gray-500 mb-3">
            <span>ใช้งาน {{ template.usage_count }} ครั้ง</span>
            <span>{{ formatDate(template.created_at) }}</span>
          </div>

          <!-- Actions -->
          <div class="flex gap-2">
            <button
              @click="openPreview(template)"
              class="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors"
            >
              Preview
            </button>
            <button
              @click="openEdit(template)"
              class="flex-1 px-3 py-2 bg-green-50 text-green-700 rounded-lg text-sm hover:bg-green-100 transition-colors"
            >
              แก้ไข
            </button>
            <button
              @click="handleDelete(template)"
              class="px-3 py-2 bg-red-50 text-red-700 rounded-lg text-sm hover:bg-red-100 transition-colors"
            >
              ลบ
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Create/Edit Form -->
    <div v-else class="bg-white rounded-xl border border-gray-100 p-6">
      <h2 class="text-lg font-semibold mb-6">
        {{ activeTab === 'create' ? 'สร้าง Template ใหม่' : 'แก้ไข Template' }}
      </h2>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Left Column - Form -->
        <div class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">ชื่อ (EN) *</label>
              <input
                v-model="form.name"
                type="text"
                placeholder="new_promo"
                class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">ชื่อ (TH)</label>
              <input
                v-model="form.name_th"
                type="text"
                placeholder="โปรโมชั่นใหม่"
                class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">หมวดหมู่</label>
            <select
              v-model="form.category"
              class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500"
            >
              <option v-for="cat in TEMPLATE_CATEGORIES" :key="cat.value" :value="cat.value">
                {{ cat.icon }} {{ cat.label }}
              </option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">หัวข้อ *</label>
            <input
              v-model="form.title"
              type="text"
              placeholder="โปรโมชั่นพิเศษ!"
              class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            <div v-if="form.variables.length > 0" class="flex flex-wrap gap-1 mt-2">
              <button
                v-for="v in form.variables"
                :key="v"
                @click="insertVariable('title', v)"
                class="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded hover:bg-blue-100"
              >
                + {{ v }}
              </button>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">เนื้อหา *</label>
            <textarea
              v-model="form.body"
              rows="4"
              placeholder="รายละเอียดการแจ้งเตือน..."
              class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            ></textarea>
            <div v-if="form.variables.length > 0" class="flex flex-wrap gap-1 mt-2">
              <button
                v-for="v in form.variables"
                :key="v"
                @click="insertVariable('body', v)"
                class="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded hover:bg-blue-100"
              >
                + {{ v }}
              </button>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">URL (เมื่อคลิก)</label>
            <input
              v-model="form.url"
              type="text"
              placeholder="/promotions"
              class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">ตัวแปร (Variables)</label>
            <div class="flex gap-2">
              <input
                v-model="newVariable"
                type="text"
                placeholder="ชื่อตัวแปร เช่น promo_name"
                @keyup.enter="addVariable"
                class="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <button
                @click="addVariable"
                class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                เพิ่ม
              </button>
            </div>
            <div v-if="form.variables.length > 0" class="flex flex-wrap gap-2 mt-2">
              <span
                v-for="(v, i) in form.variables"
                :key="v"
                class="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm flex items-center gap-1"
              >
                {{ v }}
                <button @click="removeVariable(i)" class="text-blue-500 hover:text-blue-700">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            </div>
            <p class="text-xs text-gray-500 mt-1">ใช้ในข้อความด้วย {<!-- -->{variable_name}<!-- -->}</p>
          </div>

          <div class="flex items-center gap-2">
            <input
              v-model="form.is_active"
              type="checkbox"
              id="is_active"
              class="w-4 h-4 text-green-600 rounded focus:ring-green-500"
            />
            <label for="is_active" class="text-sm text-gray-700">เปิดใช้งาน</label>
          </div>
        </div>

        <!-- Right Column - Preview -->
        <div>
          <h3 class="text-sm font-medium text-gray-700 mb-3">ตัวอย่าง Notification</h3>
          <div class="bg-gray-100 rounded-xl p-4">
            <div class="bg-white rounded-lg shadow-lg p-4 max-w-sm">
              <div class="flex items-start gap-3">
                <img :src="form.icon" alt="icon" class="w-10 h-10 rounded-lg" />
                <div class="flex-1 min-w-0">
                  <p class="font-semibold text-gray-900 text-sm">{{ form.title || 'หัวข้อ' }}</p>
                  <p class="text-gray-600 text-sm mt-1">{{ form.body || 'เนื้อหา...' }}</p>
                </div>
              </div>
            </div>
          </div>

          <div v-if="error" class="mt-4 p-4 bg-red-50 text-red-700 rounded-lg">
            {{ error }}
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex gap-4 mt-6 pt-6 border-t border-gray-100">
        <button
          @click="activeTab = 'list'; resetForm()"
          class="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          ยกเลิก
        </button>
        <button
          @click="saveTemplate"
          :disabled="isLoading"
          class="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
        >
          {{ isLoading ? 'กำลังบันทึก...' : 'บันทึก' }}
        </button>
      </div>
    </div>

    <!-- Preview Modal -->
    <div
      v-if="showPreview && selectedTemplate"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      @click.self="showPreview = false"
    >
      <div class="bg-white rounded-2xl max-w-md w-full p-6">
        <h3 class="text-lg font-semibold mb-4">Preview: {{ selectedTemplate.name }}</h3>

        <!-- Variable inputs -->
        <div v-if="selectedTemplate.variables.length > 0" class="space-y-3 mb-4">
          <p class="text-sm text-gray-600">กรอกค่าตัวแปรเพื่อดูตัวอย่าง:</p>
          <div v-for="v in selectedTemplate.variables" :key="v">
            <label class="block text-sm font-medium text-gray-700 mb-1">{{ v }}</label>
            <input
              v-model="previewVariables[v]"
              type="text"
              :placeholder="`ค่าของ ${v}`"
              class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>
        </div>

        <!-- Preview -->
        <div class="bg-gray-100 rounded-xl p-4 mb-4">
          <div class="bg-white rounded-lg shadow-lg p-4">
            <div class="flex items-start gap-3">
              <img :src="selectedTemplate.icon" alt="icon" class="w-10 h-10 rounded-lg" />
              <div class="flex-1 min-w-0">
                <p class="font-semibold text-gray-900 text-sm">{{ previewContent.title }}</p>
                <p class="text-gray-600 text-sm mt-1">{{ previewContent.body }}</p>
              </div>
            </div>
          </div>
        </div>

        <button
          @click="showPreview = false"
          class="w-full py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          ปิด
        </button>
      </div>
    </div>
  </div>
</template>
