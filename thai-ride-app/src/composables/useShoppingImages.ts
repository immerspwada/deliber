/**
 * Feature: F04b - Shopping Image Upload
 * Tables: shopping_request_images
 * Migration: 052_shopping_favorites_and_images.sql
 */

import { ref } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'

export interface ShoppingImage {
  id: string
  file: File
  preview: string
  description?: string
  uploading?: boolean
  uploaded?: boolean
  url?: string
}

export function useShoppingImages() {
  const authStore = useAuthStore()
  const images = ref<ShoppingImage[]>([])
  const uploading = ref(false)
  const error = ref<string | null>(null)

  const MAX_IMAGES = 5
  const MAX_SIZE_MB = 5
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

  const addImage = (file: File): boolean => {
    if (images.value.length >= MAX_IMAGES) {
      error.value = `สามารถเพิ่มได้สูงสุด ${MAX_IMAGES} รูป`
      return false
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      error.value = 'รองรับเฉพาะไฟล์ JPG, PNG, WEBP'
      return false
    }

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      error.value = `ขนาดไฟล์ต้องไม่เกิน ${MAX_SIZE_MB}MB`
      return false
    }

    error.value = null
    const preview = URL.createObjectURL(file)
    images.value.push({
      id: crypto.randomUUID(),
      file,
      preview,
      uploading: false,
      uploaded: false
    })
    return true
  }

  const removeImage = (id: string) => {
    const idx = images.value.findIndex(img => img.id === id)
    if (idx !== -1 && images.value[idx]) {
      URL.revokeObjectURL(images.value[idx].preview)
      images.value.splice(idx, 1)
    }
  }

  const updateDescription = (id: string, description: string) => {
    const img = images.value.find(i => i.id === id)
    if (img) img.description = description
  }

  const compressImage = async (file: File, quality = 0.8): Promise<Blob> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')!
      const img = new Image()
      
      img.onload = () => {
        const maxSize = 1200
        let { width, height } = img
        
        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = (height / width) * maxSize
            width = maxSize
          } else {
            width = (width / height) * maxSize
            height = maxSize
          }
        }
        
        canvas.width = width
        canvas.height = height
        ctx.drawImage(img, 0, 0, width, height)
        
        canvas.toBlob(
          (blob) => resolve(blob || file),
          'image/jpeg',
          quality
        )
      }
      
      img.src = URL.createObjectURL(file)
    })
  }

  const uploadImages = async (): Promise<string[]> => {
    if (!authStore.user?.id || images.value.length === 0) return []
    
    uploading.value = true
    const uploadedUrls: string[] = []
    
    try {
      for (const img of images.value) {
        if (img.uploaded && img.url) {
          uploadedUrls.push(img.url)
          continue
        }
        
        img.uploading = true
        
        // Compress image
        const compressed = await compressImage(img.file)
        const fileName = `${authStore.user.id}/${Date.now()}_${img.id}.jpg`
        
        const { data, error: uploadError } = await supabase.storage
          .from('shopping-images')
          .upload(fileName, compressed, {
            contentType: 'image/jpeg',
            upsert: false
          })
        
        if (uploadError) {
          console.error('Upload error:', uploadError)
          img.uploading = false
          continue
        }
        
        // Get public URL
        const { data: urlData } = supabase.storage
          .from('shopping-images')
          .getPublicUrl(data.path)
        
        img.url = urlData.publicUrl
        img.uploaded = true
        img.uploading = false
        uploadedUrls.push(urlData.publicUrl)
      }
      
      return uploadedUrls
    } catch (e: any) {
      error.value = e.message
      return uploadedUrls
    } finally {
      uploading.value = false
    }
  }

  const clearImages = () => {
    images.value.forEach(img => URL.revokeObjectURL(img.preview))
    images.value = []
  }

  return {
    images,
    uploading,
    error,
    MAX_IMAGES,
    addImage,
    removeImage,
    updateDescription,
    uploadImages,
    clearImages
  }
}
