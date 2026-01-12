import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'

export interface DocumentType {
  type: string
  title: string
  description: string
  required: boolean
  acceptedTypes: string[]
  maxSize: number
}

export interface UploadedDocument {
  type: string
  fileName: string
  fileUrl: string
  uploadedAt: string
  fileSize: number
  status?: 'pending' | 'approved' | 'rejected'
  rejectionReason?: string
}

export function useDocumentUpload() {
  const authStore = useAuthStore()
  
  const loading = ref(false)
  const uploadingFiles = ref<Set<string>>(new Set())
  const uploadErrors = ref<Record<string, string>>({})
  const documents = ref<UploadedDocument[]>([])

  // Document type configurations
  const getDocumentTypes = (providerType: 'driver' | 'delivery' = 'driver'): DocumentType[] => {
    const baseDocuments: DocumentType[] = [
      {
        type: 'id_card',
        title: 'บัตรประชาชน',
        description: 'สำเนาบัตรประชาชน (หน้า-หลัง) ที่ชัดเจนและไม่หมดอายุ',
        required: true,
        acceptedTypes: ['.jpg', '.jpeg', '.png', '.pdf'],
        maxSize: 5 * 1024 * 1024 // 5MB
      },
      {
        type: 'bank_account',
        title: 'หน้าสมุดบัญชีธนาคาร',
        description: 'สำเนาหน้าแรกของสมุดบัญชีธนาคารที่มีชื่อและเลขบัญชี',
        required: true,
        acceptedTypes: ['.jpg', '.jpeg', '.png', '.pdf'],
        maxSize: 5 * 1024 * 1024
      },
      {
        type: 'profile_photo',
        title: 'รูปถ่ายโปรไฟล์',
        description: 'รูปถ่ายหน้าตรงที่ชัดเจน สำหรับแสดงในแอปพลิเคชัน',
        required: true,
        acceptedTypes: ['.jpg', '.jpeg', '.png'],
        maxSize: 2 * 1024 * 1024 // 2MB
      }
    ]

    if (providerType === 'driver') {
      baseDocuments.push(
        {
          type: 'driving_license',
          title: 'ใบขับขี่',
          description: 'สำเนาใบขับขี่ (หน้า-หลัง) ที่ยังไม่หมดอายุ',
          required: true,
          acceptedTypes: ['.jpg', '.jpeg', '.png', '.pdf'],
          maxSize: 5 * 1024 * 1024
        },
        {
          type: 'vehicle_registration',
          title: 'ทะเบียนรถ',
          description: 'สำเนาทะเบียนรถที่ใช้ในการให้บริการ',
          required: true,
          acceptedTypes: ['.jpg', '.jpeg', '.png', '.pdf'],
          maxSize: 5 * 1024 * 1024
        },
        {
          type: 'vehicle_insurance',
          title: 'ประกันรถยนต์',
          description: 'สำเนาประกันรถยนต์ (พ.ร.บ. และประกันชั้น 1) ที่ยังไม่หมดอายุ',
          required: true,
          acceptedTypes: ['.jpg', '.jpeg', '.png', '.pdf'],
          maxSize: 5 * 1024 * 1024
        },
        {
          type: 'vehicle_photo',
          title: 'รูปถ่ายรถยนต์',
          description: 'รูปถ่ายรถยนต์ 4 มุม (หน้า หลัง ซ้าย ขวา)',
          required: true,
          acceptedTypes: ['.jpg', '.jpeg', '.png'],
          maxSize: 3 * 1024 * 1024
        }
      )
    } else if (providerType === 'delivery') {
      baseDocuments.push(
        {
          type: 'motorcycle_license',
          title: 'ใบขับขี่มอเตอร์ไซค์',
          description: 'สำเนาใบขับขี่มอเตอร์ไซค์ที่ยังไม่หมดอายุ',
          required: true,
          acceptedTypes: ['.jpg', '.jpeg', '.png', '.pdf'],
          maxSize: 5 * 1024 * 1024
        },
        {
          type: 'motorcycle_registration',
          title: 'ทะเบียนมอเตอร์ไซค์',
          description: 'สำเนาทะเบียนมอเตอร์ไซค์ที่ใช้ในการส่งของ',
          required: true,
          acceptedTypes: ['.jpg', '.jpeg', '.png', '.pdf'],
          maxSize: 5 * 1024 * 1024
        },
        {
          type: 'motorcycle_photo',
          title: 'รูปถ่ายมอเตอร์ไซค์',
          description: 'รูปถ่ายมอเตอร์ไซค์และกล่องส่งของ',
          required: true,
          acceptedTypes: ['.jpg', '.jpeg', '.png'],
          maxSize: 3 * 1024 * 1024
        }
      )
    }

    return baseDocuments
  }

  // Computed properties
  const uploadedCount = computed(() => documents.value.length)
  
  const isUploading = computed(() => uploadingFiles.value.size > 0)

  const hasErrors = computed(() => Object.keys(uploadErrors.value).length > 0)

  // Utility functions
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const validateFile = (file: File, documentType: DocumentType): string | null => {
    // Check file type
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!documentType.acceptedTypes.includes(fileExtension)) {
      return `รองรับเฉพาะไฟล์ประเภท: ${documentType.acceptedTypes.join(', ')}`
    }

    // Check file size
    if (file.size > documentType.maxSize) {
      return `ขนาดไฟล์ใหญ่เกินไป (สูงสุด ${formatFileSize(documentType.maxSize)})`
    }

    // Check file name
    if (file.name.length > 100) {
      return 'ชื่อไฟล์ยาวเกินไป (สูงสุด 100 ตัวอักษร)'
    }

    return null
  }

  const generateFileName = (userId: string, type: string, originalName: string): string => {
    const timestamp = Date.now()
    const fileExtension = originalName.split('.').pop()?.toLowerCase()
    return `${userId}/${type}_${timestamp}.${fileExtension}`
  }

  // Main functions
  const uploadDocument = async (
    file: File, 
    type: string, 
    documentType: DocumentType
  ): Promise<UploadedDocument | null> => {
    if (!authStore.user?.id) {
      throw new Error('ไม่พบข้อมูลผู้ใช้')
    }

    // Clear previous error
    delete uploadErrors.value[type]

    // Validate file
    const validationError = validateFile(file, documentType)
    if (validationError) {
      uploadErrors.value[type] = validationError
      throw new Error(validationError)
    }

    uploadingFiles.value.add(type)

    try {
      // Generate unique file name
      const fileName = generateFileName(authStore.user.id, type, file.name)

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('provider-documents')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        throw new Error(`การอัพโหลดล้มเหลว: ${error.message}`)
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('provider-documents')
        .getPublicUrl(fileName)

      // Create document record
      const uploadedDoc: UploadedDocument = {
        type,
        fileName: file.name,
        fileUrl: urlData.publicUrl,
        uploadedAt: new Date().toISOString(),
        fileSize: file.size,
        status: 'pending'
      }

      // Remove existing document of same type
      documents.value = documents.value.filter(doc => doc.type !== type)
      documents.value.push(uploadedDoc)

      return uploadedDoc

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการอัพโหลด'
      uploadErrors.value[type] = errorMessage
      throw error
    } finally {
      uploadingFiles.value.delete(type)
    }
  }

  const removeDocument = async (type: string): Promise<void> => {
    const doc = documents.value.find(d => d.type === type)
    if (!doc) return

    try {
      // Extract file path from URL
      const url = new URL(doc.fileUrl)
      const pathParts = url.pathname.split('/')
      const filePath = pathParts.slice(-2).join('/')

      // Delete from storage
      const { error } = await supabase.storage
        .from('provider-documents')
        .remove([filePath])

      if (error) {
        console.warn('Warning: Could not delete file from storage:', error.message)
      }

      // Remove from local state
      documents.value = documents.value.filter(d => d.type !== type)
      delete uploadErrors.value[type]

    } catch (error) {
      console.error('Error removing document:', error)
      throw new Error('ไม่สามารถลบเอกสารได้')
    }
  }

  const loadDocuments = async (): Promise<void> => {
    if (!authStore.user?.id) return

    loading.value = true
    try {
      const { data, error } = await supabase
        .from('providers_v2')
        .select('documents')
        .eq('user_id', authStore.user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw new Error(error.message)
      }

      if (data?.documents) {
        const documentsData = data.documents as Record<string, any>
        documents.value = Object.entries(documentsData).map(([type, doc]) => ({
          type,
          fileName: doc.fileName,
          fileUrl: doc.fileUrl,
          uploadedAt: doc.uploadedAt,
          fileSize: doc.fileSize,
          status: doc.status || 'pending',
          rejectionReason: doc.rejectionReason
        }))
      }

    } catch (error) {
      console.error('Error loading documents:', error)
    } finally {
      loading.value = false
    }
  }

  const saveDocuments = async (): Promise<void> => {
    if (!authStore.user?.id) {
      throw new Error('ไม่พบข้อมูลผู้ใช้')
    }

    try {
      // Prepare documents data
      const documentsData = documents.value.reduce((acc, doc) => {
        acc[doc.type] = {
          fileName: doc.fileName,
          fileUrl: doc.fileUrl,
          uploadedAt: doc.uploadedAt,
          fileSize: doc.fileSize,
          status: doc.status || 'pending',
          rejectionReason: doc.rejectionReason
        }
        return acc
      }, {} as Record<string, any>)

      // Update provider record
      const { error } = await supabase
        .from('providers_v2')
        .update({
          documents: documentsData,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', authStore.user.id)

      if (error) {
        throw new Error(`ไม่สามารถบันทึกเอกสารได้: ${error.message}`)
      }

    } catch (error) {
      console.error('Error saving documents:', error)
      throw error
    }
  }

  const clearErrors = (): void => {
    uploadErrors.value = {}
  }

  const getDocumentByType = (type: string): UploadedDocument | undefined => {
    return documents.value.find(doc => doc.type === type)
  }

  const isDocumentUploaded = (type: string): boolean => {
    return documents.value.some(doc => doc.type === type)
  }

  const isDocumentApproved = (type: string): boolean => {
    const doc = documents.value.find(d => d.type === type)
    return doc?.status === 'approved'
  }

  const isDocumentRejected = (type: string): boolean => {
    const doc = documents.value.find(d => d.type === type)
    return doc?.status === 'rejected'
  }

  const getDocumentStatus = (type: string): 'pending' | 'approved' | 'rejected' | 'not_uploaded' => {
    const doc = documents.value.find(d => d.type === type)
    if (!doc) return 'not_uploaded'
    return doc.status || 'pending'
  }

  return {
    // State
    loading,
    documents,
    uploadingFiles,
    uploadErrors,
    
    // Computed
    uploadedCount,
    isUploading,
    hasErrors,
    
    // Functions
    getDocumentTypes,
    uploadDocument,
    removeDocument,
    loadDocuments,
    saveDocuments,
    clearErrors,
    getDocumentByType,
    isDocumentUploaded,
    isDocumentApproved,
    isDocumentRejected,
    getDocumentStatus,
    formatFileSize,
    validateFile
  }
}