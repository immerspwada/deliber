<template>
  <div class="saved-places-manager">
    <!-- Header -->
    <div class="manager-header">
      <h2 class="text-lg font-semibold text-gray-900">สถานที่บันทึก</h2>
      <button 
        v-if="canAddFavorite"
        class="add-btn"
        @click="showAddModal = true"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        เพิ่ม
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="animate-pulse space-y-3">
        <div class="h-16 bg-gray-200 rounded-xl"></div>
        <div class="h-16 bg-gray-200 rounded-xl"></div>
        <div class="h-16 bg-gray-200 rounded-xl"></div>
      </div>
    </div>

    <!-- Content -->
    <div v-else class="places-content">
      <!-- Home & Work Section -->
      <div class="special-places">
        <PlaceCard
          :place="homePlace"
          type="home"
          :empty-text="'เพิ่มที่อยู่บ้าน'"
          @click="handlePlaceClick(homePlace, 'home')"
          @edit="editPlace"
          @delete="confirmDelete"
        />
        <PlaceCard
          :place="workPlace"
          type="work"
          :empty-text="'เพิ่มที่ทำงาน'"
          @click="handlePlaceClick(workPlace, 'work')"
          @edit="editPlace"
          @delete="confirmDelete"
        />
      </div>

      <!-- Favorites Section -->
      <div class="favorites-section">
        <div class="section-header">
          <h3 class="text-sm font-medium text-gray-700">
            สถานที่โปรด ({{ favoritesCount }}/{{ MAX_FAVORITES }})
          </h3>
        </div>
        
        <div v-if="favoritePlaces.length === 0" class="empty-favorites">
          <svg class="w-12 h-12 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
          <p class="text-gray-500 text-sm">ยังไม่มีสถานที่โปรด</p>
          <button 
            class="mt-2 text-primary-600 text-sm font-medium"
            @click="showAddModal = true"
          >
            + เพิ่มสถานที่โปรด
          </button>
        </div>

        <div v-else class="favorites-list">
          <PlaceCard
            v-for="place in favoritePlaces"
            :key="place.id"
            :place="place"
            type="favorite"
            @click="handlePlaceClick(place, 'other')"
            @edit="editPlace"
            @delete="confirmDelete"
          />
        </div>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <PlaceEditModal
      v-if="showEditModal"
      :place="editingPlace"
      :mode="editMode"
      :place-type="editPlaceType"
      @save="handleSave"
      @close="closeEditModal"
    />

    <!-- Delete Confirmation -->
    <div v-if="showDeleteConfirm" class="modal-overlay" @click.self="showDeleteConfirm = false">
      <div class="delete-confirm-modal">
        <h3 class="text-lg font-semibold text-gray-900 mb-2">ลบสถานที่?</h3>
        <p class="text-gray-600 mb-4">
          คุณต้องการลบ "{{ deletingPlace?.customName || deletingPlace?.name }}" หรือไม่?
        </p>
        <div class="flex gap-3">
          <button 
            class="flex-1 py-2 px-4 bg-gray-100 text-gray-700 rounded-lg font-medium"
            @click="showDeleteConfirm = false"
          >
            ยกเลิก
          </button>
          <button 
            class="flex-1 py-2 px-4 bg-red-600 text-white rounded-lg font-medium"
            @click="handleDelete"
          >
            ลบ
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSavedPlaces, type SavedPlace, type PlaceType } from '../composables/useSavedPlaces'
import PlaceCard from './PlaceCard.vue'
import PlaceEditModal from './PlaceEditModal.vue'

// Emits
const emit = defineEmits<{
  (e: 'select', place: SavedPlace): void
}>()

// Composable
const {
  savedPlaces,
  homePlace,
  workPlace,
  favoritePlaces,
  favoritesCount,
  canAddFavorite,
  loading,
  savePlace,
  updatePlace,
  deletePlace,
  MAX_FAVORITES
} = useSavedPlaces()

// State
const showAddModal = ref(false)
const showEditModal = ref(false)
const showDeleteConfirm = ref(false)
const editingPlace = ref<SavedPlace | null>(null)
const deletingPlace = ref<SavedPlace | null>(null)
const editMode = ref<'add' | 'edit'>('add')
const editPlaceType = ref<PlaceType>('other')

// Handlers
function handlePlaceClick(place: SavedPlace | null, type: PlaceType) {
  if (place) {
    emit('select', place)
  } else {
    // Open add modal for this type
    editMode.value = 'add'
    editPlaceType.value = type
    editingPlace.value = null
    showEditModal.value = true
  }
}

function editPlace(place: SavedPlace) {
  editMode.value = 'edit'
  editingPlace.value = place
  editPlaceType.value = place.placeType
  showEditModal.value = true
}

function confirmDelete(place: SavedPlace) {
  deletingPlace.value = place
  showDeleteConfirm.value = true
}

async function handleDelete() {
  if (!deletingPlace.value) return
  
  try {
    await deletePlace(deletingPlace.value.id)
    showDeleteConfirm.value = false
    deletingPlace.value = null
  } catch (err: any) {
    console.error('Delete failed:', err)
    alert(err.message || 'ไม่สามารถลบได้')
  }
}

async function handleSave(data: {
  name: string
  address: string
  lat: number
  lng: number
  placeType: PlaceType
  customName?: string
}) {
  try {
    if (editMode.value === 'edit' && editingPlace.value) {
      await updatePlace(editingPlace.value.id, data)
    } else {
      await savePlace(data)
    }
    closeEditModal()
  } catch (err: any) {
    console.error('Save failed:', err)
    alert(err.message || 'ไม่สามารถบันทึกได้')
  }
}

function closeEditModal() {
  showEditModal.value = false
  showAddModal.value = false
  editingPlace.value = null
}

// Watch for add modal
import { watch } from 'vue'
watch(showAddModal, (val) => {
  if (val) {
    editMode.value = 'add'
    editPlaceType.value = 'other'
    editingPlace.value = null
    showEditModal.value = true
    showAddModal.value = false
  }
})
</script>

<style scoped>
.saved-places-manager {
  @apply p-4;
}

.manager-header {
  @apply flex items-center justify-between mb-4;
}

.add-btn {
  @apply flex items-center gap-1 px-3 py-1.5 bg-primary-600 text-white text-sm font-medium rounded-lg;
}

.loading-state {
  @apply py-4;
}

.special-places {
  @apply grid grid-cols-2 gap-3 mb-6;
}

.favorites-section {
  @apply mt-4;
}

.section-header {
  @apply mb-3;
}

.empty-favorites {
  @apply text-center py-8 bg-gray-50 rounded-xl;
}

.favorites-list {
  @apply space-y-2;
}

.modal-overlay {
  @apply fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4;
}

.delete-confirm-modal {
  @apply bg-white rounded-2xl p-6 w-full max-w-sm;
}
</style>
