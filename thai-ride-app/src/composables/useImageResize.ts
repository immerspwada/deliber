/**
 * useImageResize - High-performance image resizing using Web Worker
 */
import { ref } from 'vue'

interface ResizeOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number
}

interface ResizeResult {
  file: File
  originalSize: number
  resizedSize: number
}

export function useImageResize() {
  const isResizing = ref(false)
  const error = ref<string | null>(null)
  
  // Create worker instance (lazy)
  let worker: Worker | null = null

  const getWorker = (): Worker => {
    if (!worker) {
      worker = new Worker(
        new URL('../workers/imageResize.worker.ts', import.meta.url),
        { type: 'module' }
      )
    }
    return worker
  }

  const resizeImage = async (
    file: File,
    options: ResizeOptions = {}
  ): Promise<ResizeResult> => {
    const {
      maxWidth = 1200,
      maxHeight = 1600,
      quality = 0.85
    } = options

    // Validate file type
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/jpg'].includes(file.type)) {
      throw new Error('รองรับเฉพาะไฟล์รูปภาพ (JPG, PNG, WEBP)')
    }

    isResizing.value = true
    error.value = null

    try {
      const workerInstance = getWorker()

      const result = await new Promise<ResizeResult>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Image resize timeout'))
        }, 30000) // 30 second timeout

        workerInstance.onmessage = (e) => {
          clearTimeout(timeout)
          
          if (e.data.success) {
            const { blob, originalSize, resizedSize } = e.data.result
            
            // Create File from Blob
            const resizedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            })

            resolve({
              file: resizedFile,
              originalSize,
              resizedSize
            })
          } else {
            reject(new Error(e.data.error || 'Image resize failed'))
          }
        }

        workerInstance.onerror = (err) => {
          clearTimeout(timeout)
          reject(err)
        }

        // Send message to worker
        workerInstance.postMessage({
          file,
          maxWidth,
          maxHeight,
          quality
        })
      })

      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'เกิดข้อผิดพลาด'
      error.value = errorMessage
      throw new Error(errorMessage)
    } finally {
      isResizing.value = false
    }
  }

  const cleanup = (): void => {
    if (worker) {
      worker.terminate()
      worker = null
    }
  }

  return {
    resizeImage,
    isResizing,
    error,
    cleanup
  }
}
