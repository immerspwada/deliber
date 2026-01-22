<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <div class="bg-white border-b border-gray-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <button
              type="button"
              class="text-gray-600 hover:text-gray-900 min-h-[44px] min-w-[44px] flex items-center justify-center"
              @click="$router.back()"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 class="text-2xl font-bold text-gray-900">การตั้งค่าธีม</h1>
              <p class="text-sm text-gray-500 mt-1">ปรับแต่งสีและรูปแบบของเว็บไซต์</p>
            </div>
          </div>
          <div class="flex gap-2">
            <button
              type="button"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 min-h-[44px]"
              @click="resetToDefault"
            >
              รีเซ็ต
            </button>
            <button
              type="button"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 min-h-[44px]"
              @click="exportTheme"
            >
              ส่งออก
            </button>
            <button
              type="button"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 min-h-[44px]"
              @click="showImportModal = true"
            >
              นำเข้า
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div class="bg-red-50 border border-red-200 rounded-lg p-4">
        <p class="text-red-800">{{ error }}</p>
        <button
          type="button"
          class="mt-2 text-red-600 hover:text-red-700 font-medium"
          @click="loadTheme"
        >
          ลองใหม่
        </button>
      </div>
    </div>

    <!-- Content -->
    <div v-else class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <form @submit.prevent="handleSubmit" class="space-y-6">
        <!-- Skin Color Card -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Skin Color</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Primary</label>
              <div class="flex items-center gap-3">
                <input
                  type="color"
                  v-model="theme.skinColor.primary"
                  class="h-10 w-20 rounded border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  v-model="theme.skinColor.primary"
                  class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="#FFFFFF"
                />
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Secondary</label>
              <div class="flex items-center gap-3">
                <input
                  type="color"
                  v-model="theme.skinColor.secondary"
                  class="h-10 w-20 rounded border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  v-model="theme.skinColor.secondary"
                  class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="#0671E3"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Button Color Card -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Button Color</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Normal</label>
              <div class="flex items-center gap-3">
                <input
                  type="color"
                  v-model="theme.buttonColor.normal"
                  class="h-10 w-20 rounded border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  v-model="theme.buttonColor.normal"
                  class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="#0B1223"
                />
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Hover</label>
              <div class="flex items-center gap-3">
                <input
                  type="color"
                  v-model="theme.buttonColor.hover"
                  class="h-10 w-20 rounded border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  v-model="theme.buttonColor.hover"
                  class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="#DEDEDE"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Header Background Card -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Header Background</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Background</label>
              <div class="flex items-center gap-3">
                <input
                  type="color"
                  v-model="theme.header.background"
                  class="h-10 w-20 rounded border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  v-model="theme.header.background"
                  class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="#FFFFFF"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Footer Background Card -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Footer Background</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Background</label>
              <div class="flex items-center gap-3">
                <input
                  type="color"
                  v-model="theme.footer.background"
                  class="h-10 w-20 rounded border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  v-model="theme.footer.background"
                  class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="#00000C"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Header Navigation Card -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Header Navigation</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Normal</label>
              <div class="flex items-center gap-3">
                <input
                  type="color"
                  v-model="theme.headerNav.normal"
                  class="h-10 w-20 rounded border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  v-model="theme.headerNav.normal"
                  class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="#00000C"
                />
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Hover</label>
              <div class="flex items-center gap-3">
                <input
                  type="color"
                  v-model="theme.headerNav.hover"
                  class="h-10 w-20 rounded border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  v-model="theme.headerNav.hover"
                  class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="#0B1223"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Footer Navigation Card -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Footer Navigation</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Normal</label>
              <div class="flex items-center gap-3">
                <input
                  type="color"
                  v-model="theme.footerNav.normal"
                  class="h-10 w-20 rounded border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  v-model="theme.footerNav.normal"
                  class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="#FFFFFF"
                />
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Hover</label>
              <div class="flex items-center gap-3">
                <input
                  type="color"
                  v-model="theme.footerNav.hover"
                  class="h-10 w-20 rounded border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  v-model="theme.footerNav.hover"
                  class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="#FFFFFF"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex justify-end gap-3 pt-4">
          <button
            type="button"
            class="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 min-h-[44px]"
            @click="handleCancel"
            :disabled="saving"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            class="px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
            :disabled="saving || !hasChanges"
          >
            {{ saving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า' }}
          </button>
        </div>
      </form>
    </div>

    <!-- Import Modal -->
    <ThemeImportModal
      v-if="showImportModal"
      @close="showImportModal = false"
      @import="handleImport"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from '@/composables/useToast'
import { useThemeSettings } from '@/admin/composables/useThemeSettings'
import ThemeImportModal from '@/admin/components/theme/ThemeImportModal.vue'

const router = useRouter()
const { showSuccess, showError } = useToast()
const {
  theme,
  defaultTheme,
  loading,
  error,
  loadTheme,
  saveTheme,
  resetTheme,
  exportThemeData,
  importThemeData
} = useThemeSettings()

const saving = ref(false)
const showImportModal = ref(false)
const originalTheme = ref<string>('')

const hasChanges = computed(() => {
  return JSON.stringify(theme) !== originalTheme.value
})

async function handleSubmit() {
  saving.value = true
  
  try {
    const result = await saveTheme()
    
    if (result.success) {
      originalTheme.value = JSON.stringify(theme)
      showSuccess('บันทึกธีมสำเร็จ')
      applyThemeToDocument()
    } else {
      showError(result.message || 'ไม่สามารถบันทึกธีมได้')
    }
  } catch (e) {
    showError('เกิดข้อผิดพลาดในการบันทึกธีม')
    console.error('[ThemeSettingsView] Save error:', e)
  } finally {
    saving.value = false
  }
}

function handleCancel() {
  if (hasChanges.value) {
    if (confirm('คุณมีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก ต้องการยกเลิกหรือไม่?')) {
      router.push('/admin/settings')
    }
  } else {
    router.push('/admin/settings')
  }
}

async function resetToDefault() {
  if (confirm('ต้องการรีเซ็ตธีมเป็นค่าเริ่มต้นหรือไม่?')) {
    const result = await resetTheme()
    if (result.success) {
      originalTheme.value = JSON.stringify(theme)
      showSuccess('รีเซ็ตธีมสำเร็จ')
      applyThemeToDocument()
    } else {
      showError('ไม่สามารถรีเซ็ตธีมได้')
    }
  }
}

function exportTheme() {
  try {
    const data = exportThemeData()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `theme-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    showSuccess('ส่งออกธีมสำเร็จ')
  } catch (e) {
    showError('ไม่สามารถส่งออกธีมได้')
    console.error('[ThemeSettingsView] Export error:', e)
  }
}

async function handleImport(data: string) {
  try {
    const result = await importThemeData(data)
    if (result.success) {
      showSuccess('นำเข้าธีมสำเร็จ')
      showImportModal.value = false
      applyThemeToDocument()
    } else {
      showError(result.message || 'ไม่สามารถนำเข้าธีมได้')
    }
  } catch (e) {
    showError('ไม่สามารถนำเข้าธีมได้')
    console.error('[ThemeSettingsView] Import error:', e)
  }
}

function applyThemeToDocument() {
  // theme is a reactive object from useThemeSettings, access properties directly
  if (!theme.skinColor || !theme.buttonColor) return
  
  const root = document.documentElement
  root.style.setProperty('--color-primary', theme.skinColor.primary)
  root.style.setProperty('--color-secondary', theme.skinColor.secondary)
  root.style.setProperty('--color-button-normal', theme.buttonColor.normal)
  root.style.setProperty('--color-button-hover', theme.buttonColor.hover)
}

onMounted(async () => {
  await loadTheme()
  originalTheme.value = JSON.stringify(theme)
  applyThemeToDocument()
})
</script>

<style scoped>
/* Minimal styles - using Tailwind classes */
</style>
