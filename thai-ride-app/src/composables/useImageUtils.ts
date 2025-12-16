/**
 * useImageUtils - Image compression and OCR utilities
 * Feature: F14 - Provider Documents
 * Used for: Document upload optimization and data extraction
 */

export interface CompressOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number
  mimeType?: 'image/jpeg' | 'image/png' | 'image/webp'
}

export interface OCRResult {
  success: boolean
  data: {
    idNumber?: string
    name?: string
    birthDate?: string
    address?: string
    expiryDate?: string
    licenseNumber?: string
    licenseType?: string
  }
  rawText?: string
  error?: string
}

export function useImageUtils() {
  /**
   * Compress image before upload
   * Reduces file size while maintaining quality
   */
  const compressImage = async (
    file: File,
    options: CompressOptions = {}
  ): Promise<File> => {
    const {
      maxWidth = 1200,
      maxHeight = 1200,
      quality = 0.8,
      mimeType = 'image/jpeg'
    } = options

    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          // Calculate new dimensions
          let { width, height } = img
          if (width > maxWidth) {
            height = (height * maxWidth) / width
            width = maxWidth
          }
          if (height > maxHeight) {
            width = (width * maxHeight) / height
            height = maxHeight
          }

          // Create canvas and draw
          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            reject(new Error('ไม่สามารถสร้าง Canvas ได้'))
            return
          }

          // Draw with white background (for transparency)
          ctx.fillStyle = '#FFFFFF'
          ctx.fillRect(0, 0, width, height)
          ctx.drawImage(img, 0, 0, width, height)

          // Convert to blob
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('ไม่สามารถบีบอัดรูปภาพได้'))
                return
              }
              const compressedFile = new File(
                [blob],
                file.name.replace(/\.[^.]+$/, '.jpg'),
                { type: mimeType }
              )
              resolve(compressedFile)
            },
            mimeType,
            quality
          )
        }
        img.onerror = () => reject(new Error('ไม่สามารถโหลดรูปภาพได้'))
        img.src = e.target?.result as string
      }
      reader.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์ได้'))
      reader.readAsDataURL(file)
    })
  }

  /**
   * Extract text from image using Tesseract.js (lazy loaded)
   * Supports Thai ID card and driver's license
   */
  const extractTextFromImage = async (file: File): Promise<string> => {
    // Dynamically import Tesseract.js
    const Tesseract = await import('tesseract.js')
    
    const result = await Tesseract.recognize(file, 'tha+eng', {
      logger: () => {} // Suppress logs
    })
    
    return result.data.text
  }

  /**
   * Parse Thai ID card data from OCR text
   */
  const parseThaiIDCard = (text: string): OCRResult['data'] => {
    const data: OCRResult['data'] = {}
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

    // Thai ID number pattern: 1-1234-12345-12-1
    const idPattern = /(\d[\s-]?\d{4}[\s-]?\d{5}[\s-]?\d{2}[\s-]?\d)/
    const idMatch = text.match(idPattern)
    if (idMatch && idMatch[1]) {
      data.idNumber = idMatch[1].replace(/[\s-]/g, '')
    }

    // Name patterns (Thai and English)
    const thaiNamePattern = /(นาย|นาง|นางสาว|เด็กชาย|เด็กหญิง)\s*([ก-๙\s]+)/
    const thaiNameMatch = text.match(thaiNamePattern)
    if (thaiNameMatch) {
      data.name = thaiNameMatch[0].trim()
    }

    // Birth date pattern: DD/MM/YYYY or DD เดือน YYYY
    const datePattern = /(\d{1,2})\s*[\/\-\.]\s*(\d{1,2})\s*[\/\-\.]\s*(\d{4})/
    const dateMatch = text.match(datePattern)
    if (dateMatch) {
      data.birthDate = `${dateMatch[1]}/${dateMatch[2]}/${dateMatch[3]}`
    }

    // Address - look for common Thai address keywords
    const addressKeywords = ['บ้านเลขที่', 'ที่อยู่', 'หมู่', 'ตำบล', 'อำเภอ', 'จังหวัด']
    for (const line of lines) {
      if (addressKeywords.some(kw => line.includes(kw))) {
        data.address = (data.address ? data.address + ' ' : '') + line
      }
    }

    // Expiry date - look for "หมดอายุ" or similar
    const expiryPattern = /หมดอายุ[:\s]*(\d{1,2})\s*[\/\-\.]\s*(\d{1,2})\s*[\/\-\.]\s*(\d{4})/
    const expiryMatch = text.match(expiryPattern)
    if (expiryMatch) {
      data.expiryDate = `${expiryMatch[1]}/${expiryMatch[2]}/${expiryMatch[3]}`
    }

    return data
  }

  /**
   * Parse Thai driver's license data from OCR text
   */
  const parseThaiDriverLicense = (text: string): OCRResult['data'] => {
    const data: OCRResult['data'] = {}
    
    // License number pattern
    const licensePattern = /(\d{8})/
    const licenseMatch = text.match(licensePattern)
    if (licenseMatch) {
      data.licenseNumber = licenseMatch[1]
    }

    // License type
    const typePatterns = [
      { pattern: /ชนิดที่\s*[12345]/, type: 'รถยนต์ส่วนบุคคล' },
      { pattern: /รถจักรยานยนต์/, type: 'รถจักรยานยนต์' },
      { pattern: /รถสาธารณะ/, type: 'รถสาธารณะ' },
      { pattern: /ตลอดชีพ/, type: 'ตลอดชีพ' }
    ]
    for (const { pattern, type } of typePatterns) {
      if (pattern.test(text)) {
        data.licenseType = type
        break
      }
    }

    // Name (same as ID card)
    const thaiNamePattern = /(นาย|นาง|นางสาว)\s*([ก-๙\s]+)/
    const thaiNameMatch = text.match(thaiNamePattern)
    if (thaiNameMatch) {
      data.name = thaiNameMatch[0].trim()
    }

    // Expiry date
    const expiryPattern = /(\d{1,2})\s*[\/\-\.]\s*(\d{1,2})\s*[\/\-\.]\s*(\d{4})/g
    const dates = [...text.matchAll(expiryPattern)]
    if (dates.length > 0) {
      // Usually the last date is expiry
      const lastDate = dates[dates.length - 1]
      if (lastDate && lastDate[1] && lastDate[2] && lastDate[3]) {
        data.expiryDate = `${lastDate[1]}/${lastDate[2]}/${lastDate[3]}`
      }
    }

    // ID number from license
    const idPattern = /(\d[\s-]?\d{4}[\s-]?\d{5}[\s-]?\d{2}[\s-]?\d)/
    const idMatch = text.match(idPattern)
    if (idMatch && idMatch[1]) {
      data.idNumber = idMatch[1].replace(/[\s-]/g, '')
    }

    return data
  }

  /**
   * Perform OCR on document image
   */
  const performOCR = async (
    file: File,
    documentType: 'id_card' | 'license' | 'vehicle'
  ): Promise<OCRResult> => {
    try {
      // Vehicle photos don't need OCR
      if (documentType === 'vehicle') {
        return { success: true, data: {} }
      }

      // Compress image first for faster OCR
      const compressedFile = await compressImage(file, {
        maxWidth: 1600,
        maxHeight: 1600,
        quality: 0.9
      })

      // Extract text
      const rawText = await extractTextFromImage(compressedFile)

      // Parse based on document type
      const data = documentType === 'id_card'
        ? parseThaiIDCard(rawText)
        : parseThaiDriverLicense(rawText)

      return {
        success: true,
        data,
        rawText
      }
    } catch (error: any) {
      return {
        success: false,
        data: {},
        error: error.message || 'ไม่สามารถอ่านข้อมูลจากเอกสารได้'
      }
    }
  }

  /**
   * Validate Thai national ID number (13 digits)
   */
  const validateThaiID = (id: string): boolean => {
    if (!/^\d{13}$/.test(id)) return false
    
    let sum = 0
    for (let i = 0; i < 12; i++) {
      const digit = id[i]
      if (digit) sum += parseInt(digit) * (13 - i)
    }
    const checkDigit = (11 - (sum % 11)) % 10
    const lastDigit = id[12]
    return lastDigit ? checkDigit === parseInt(lastDigit) : false
  }

  /**
   * Get image dimensions
   */
  const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve({ width: img.width, height: img.height })
      img.onerror = reject
      img.src = URL.createObjectURL(file)
    })
  }

  /**
   * Check if image needs compression
   */
  const needsCompression = async (file: File, maxSizeKB = 500): Promise<boolean> => {
    if (file.size > maxSizeKB * 1024) return true
    
    try {
      const dims = await getImageDimensions(file)
      return dims.width > 1200 || dims.height > 1200
    } catch {
      return false
    }
  }

  return {
    compressImage,
    performOCR,
    validateThaiID,
    getImageDimensions,
    needsCompression
  }
}
