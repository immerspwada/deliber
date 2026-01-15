/**
 * Image Resize Utility
 * รับรูปทุกขนาด แล้ว resize อัตโนมัติเพื่อประหยัด storage และ bandwidth
 */

export interface ResizeOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number
  format?: 'jpeg' | 'webp' | 'png'
}

const DEFAULT_OPTIONS: Required<ResizeOptions> = {
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 0.85,
  format: 'jpeg'
}

/**
 * Resize image file to specified dimensions
 * @param file - Original image file
 * @param options - Resize options
 * @returns Resized image as Blob
 */
export async function resizeImage(
  file: File,
  options: ResizeOptions = {}
): Promise<Blob> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      const img = new Image()
      
      img.onload = () => {
        try {
          const resized = resizeImageElement(img, opts)
          resolve(resized)
        } catch (error) {
          reject(error)
        }
      }
      
      img.onerror = () => {
        reject(new Error('Failed to load image'))
      }
      
      img.src = e.target?.result as string
    }
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }
    
    reader.readAsDataURL(file)
  })
}

/**
 * Resize image element using canvas
 */
function resizeImageElement(
  img: HTMLImageElement,
  options: Required<ResizeOptions>
): Blob {
  const { maxWidth, maxHeight, quality, format } = options
  
  // Calculate new dimensions maintaining aspect ratio
  let { width, height } = img
  
  if (width > maxWidth || height > maxHeight) {
    const aspectRatio = width / height
    
    if (width > height) {
      width = Math.min(width, maxWidth)
      height = width / aspectRatio
    } else {
      height = Math.min(height, maxHeight)
      width = height * aspectRatio
    }
  }
  
  // Create canvas
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(width)
  canvas.height = Math.round(height)
  
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Failed to get canvas context')
  }
  
  // Enable image smoothing for better quality
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  
  // Draw resized image
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  
  // Convert to blob
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('Failed to create blob'))
        }
      },
      `image/${format}`,
      quality
    )
  }) as unknown as Blob
}

/**
 * Get optimized file size info
 */
export function getFileSizeInfo(originalSize: number, resizedSize: number): {
  original: string
  resized: string
  saved: string
  percentage: number
} {
  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }
  
  const saved = originalSize - resizedSize
  const percentage = Math.round((saved / originalSize) * 100)
  
  return {
    original: formatSize(originalSize),
    resized: formatSize(resizedSize),
    saved: formatSize(saved),
    percentage
  }
}

/**
 * Validate image file
 */
export function validateImageFile(file: File): {
  valid: boolean
  error?: string
} {
  // Check file type
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
  if (!validTypes.includes(file.type.toLowerCase())) {
    return {
      valid: false,
      error: 'กรุณาเลือกไฟล์รูปภาพ (JPEG, PNG, WebP, HEIC)'
    }
  }
  
  // Check file size (max 50MB before resize)
  const maxSize = 50 * 1024 * 1024
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'ไฟล์ใหญ่เกินไป (สูงสุด 50MB)'
    }
  }
  
  return { valid: true }
}

/**
 * Create optimized filename
 */
export function createOptimizedFilename(
  originalName: string,
  format: 'jpeg' | 'webp' | 'png' = 'jpeg'
): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return `photo_${timestamp}_${random}.${format}`
}

/**
 * Preset configurations for different use cases
 */
export const RESIZE_PRESETS = {
  // For photo evidence (balanced quality and size)
  evidence: {
    maxWidth: 1920,
    maxHeight: 1920,
    quality: 0.85,
    format: 'jpeg' as const
  },
  
  // For thumbnails
  thumbnail: {
    maxWidth: 400,
    maxHeight: 400,
    quality: 0.8,
    format: 'jpeg' as const
  },
  
  // For profile pictures
  profile: {
    maxWidth: 800,
    maxHeight: 800,
    quality: 0.9,
    format: 'jpeg' as const
  },
  
  // High quality (for important documents)
  highQuality: {
    maxWidth: 2560,
    maxHeight: 2560,
    quality: 0.95,
    format: 'jpeg' as const
  }
} as const

/**
 * Batch resize multiple images
 */
export async function resizeImages(
  files: File[],
  options: ResizeOptions = {}
): Promise<Blob[]> {
  return Promise.all(files.map(file => resizeImage(file, options)))
}

/**
 * Get image dimensions without loading full image
 */
export async function getImageDimensions(file: File): Promise<{
  width: number
  height: number
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      const img = new Image()
      
      img.onload = () => {
        resolve({
          width: img.width,
          height: img.height
        })
      }
      
      img.onerror = () => {
        reject(new Error('Failed to load image'))
      }
      
      img.src = e.target?.result as string
    }
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }
    
    reader.readAsDataURL(file)
  })
}
