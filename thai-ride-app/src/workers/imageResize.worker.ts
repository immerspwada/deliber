/**
 * Image Resize Web Worker
 * High-performance image resizing in background thread
 * Uses createImageBitmap and OffscreenCanvas (Worker-compatible APIs)
 */

interface ResizeMessage {
  file: File
  maxWidth: number
  maxHeight: number
  quality: number
}

interface ResizeResult {
  blob: Blob
  originalSize: number
  resizedSize: number
}

self.onmessage = async (e: MessageEvent<ResizeMessage>) => {
  const { file, maxWidth, maxHeight, quality } = e.data

  try {
    const resizedBlob = await resizeImage(file, maxWidth, maxHeight, quality)
    
    const result: ResizeResult = {
      blob: resizedBlob,
      originalSize: file.size,
      resizedSize: resizedBlob.size
    }

    self.postMessage({ success: true, result })
  } catch (error) {
    self.postMessage({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
  }
}

async function resizeImage(
  file: File,
  maxWidth: number,
  maxHeight: number,
  quality: number
): Promise<Blob> {
  // Use createImageBitmap (works in Worker context)
  const imageBitmap = await createImageBitmap(file)
  
  let width = imageBitmap.width
  let height = imageBitmap.height

  // Calculate new dimensions maintaining aspect ratio
  if (width > maxWidth || height > maxHeight) {
    const ratio = Math.min(maxWidth / width, maxHeight / height)
    width = Math.round(width * ratio)
    height = Math.round(height * ratio)
  }

  // Create OffscreenCanvas
  const canvas = new OffscreenCanvas(width, height)
  const ctx = canvas.getContext('2d')
  
  if (!ctx) {
    throw new Error('Cannot get canvas context')
  }

  // Enable image smoothing for better quality
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  // Draw resized image
  ctx.drawImage(imageBitmap, 0, 0, width, height)

  // Clean up ImageBitmap
  imageBitmap.close()

  // Convert to blob
  const blob = await canvas.convertToBlob({ 
    type: file.type || 'image/jpeg', 
    quality 
  })

  if (!blob) {
    throw new Error('Canvas to Blob failed')
  }

  return blob
}
