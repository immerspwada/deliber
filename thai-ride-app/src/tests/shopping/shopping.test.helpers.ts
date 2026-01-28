/**
 * Shopping Test Helpers
 * Utilities for testing shopping functionality
 */
import type { GeoLocation } from '@/composables/useLocation'
import type { ShoppingRequest } from '@/composables/useShopping'

// Mock locations
export const mockLocations = {
  store: {
    lat: 13.7563,
    lng: 100.5018,
    address: '7-Eleven สาขาสยาม'
  } as GeoLocation,
  delivery: {
    lat: 13.7465,
    lng: 100.5345,
    address: '123 ถนนสุขุมวิท แขวงคลองเตย'
  } as GeoLocation,
  current: {
    lat: 13.7500,
    lng: 100.5200,
    address: 'ตำแหน่งปัจจุบัน'
  } as GeoLocation
}

// Mock shopping data
export const mockShoppingData = {
  basic: {
    storeName: '7-Eleven',
    storeAddress: '7-Eleven สาขาสยาม',
    storeLocation: mockLocations.store,
    deliveryAddress: '123 ถนนสุขุมวิท',
    deliveryLocation: mockLocations.delivery,
    itemList: 'น้ำดื่ม 2 ขวด\nขนมปัง 1 ห่อ\nนม 1 กล่อง',
    budgetLimit: 500,
    specialInstructions: 'ส่งเร็วๆ',
    distanceKm: 2.5
  },
  withImages: {
    ...mockShoppingData.basic,
    referenceImages: [
      'https://example.com/image1.jpg',
      'https://example.com/image2.jpg'
    ]
  },
  largeBudget: {
    ...mockShoppingData.basic,
    budgetLimit: 5000,
    itemList: 'ของใช้ในบ้าน\nอาหารแห้ง\nเครื่องดื่ม\nขนม'
  }
}

// Mock shopping request
export const mockShoppingRequest: ShoppingRequest = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  tracking_id: 'SHP-20260128-123456',
  user_id: 'user-123',
  provider_id: null,
  store_name: '7-Eleven',
  store_address: '7-Eleven สาขาสยาม',
  store_lat: 13.7563,
  store_lng: 100.5018,
  delivery_address: '123 ถนนสุขุมวิท',
  delivery_lat: 13.7465,
  delivery_lng: 100.5345,
  items: [
    { name: 'น้ำดื่ม', quantity: 2 },
    { name: 'ขนมปัง', quantity: 1 },
    { name: 'นม', quantity: 1 }
  ],
  item_list: 'น้ำดื่ม 2 ขวด\nขนมปัง 1 ห่อ\nนม 1 กล่อง',
  budget_limit: 500,
  special_instructions: 'ส่งเร็วๆ',
  service_fee: 60,
  items_cost: null,
  total_cost: null,
  receipt_photo: null,
  status: 'pending',
  shopped_at: null,
  delivered_at: null,
  created_at: new Date().toISOString()
}

// Mock provider
export const mockProvider = {
  id: 'provider-123',
  vehicle_type: 'motorcycle',
  vehicle_plate: 'กข-1234',
  rating: 4.8,
  user: {
    name: 'สมชาย ใจดี',
    phone: '0812345678'
  }
}

// Mock shopping request with provider
export const mockShoppingRequestWithProvider: ShoppingRequest = {
  ...mockShoppingRequest,
  provider_id: mockProvider.id,
  status: 'matched',
  provider: mockProvider
}

// Test utilities
export const testUtils = {
  // Wait for async operations
  wait: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),

  // Simulate location permission
  mockGeolocation: (location: GeoLocation) => {
    const mockGeolocation = {
      getCurrentPosition: (success: PositionCallback) => {
        success({
          coords: {
            latitude: location.lat,
            longitude: location.lng,
            accuracy: 10,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null
          },
          timestamp: Date.now()
        })
      },
      watchPosition: () => 1,
      clearWatch: () => {}
    }
    Object.defineProperty(global.navigator, 'geolocation', {
      value: mockGeolocation,
      configurable: true
    })
  },

  // Simulate file upload
  createMockFile: (name: string, size: number, type: string): File => {
    const blob = new Blob(['x'.repeat(size)], { type })
    return new File([blob], name, { type })
  },

  // Simulate image file
  createMockImage: (name = 'test.jpg', size = 1024 * 100): File => {
    return testUtils.createMockFile(name, size, 'image/jpeg')
  },

  // Validate shopping data
  validateShoppingData: (data: any): boolean => {
    return !!(
      data.storeLocation &&
      data.deliveryLocation &&
      data.itemList &&
      data.budgetLimit
    )
  },

  // Calculate expected service fee
  calculateExpectedFee: (budgetLimit: number, distanceKm: number): number => {
    const baseFee = 40
    const perKm = 12
    const percentageFee = Math.max(20, Math.min(100, budgetLimit * 0.05))
    return Math.ceil(baseFee + (distanceKm * perKm) + percentageFee)
  },

  // Format item list
  formatItemList: (items: string[]): string => {
    return items.join('\n')
  },

  // Parse item list
  parseItemList: (itemList: string): string[] => {
    return itemList.split('\n').filter(line => line.trim())
  }
}

// Mock Supabase responses
export const mockSupabaseResponses = {
  createSuccess: {
    data: {
      success: true,
      shopping_id: mockShoppingRequest.id,
      tracking_id: mockShoppingRequest.tracking_id,
      message: 'Shopping request created successfully'
    },
    error: null
  },
  createInsufficientBalance: {
    data: null,
    error: {
      message: 'INSUFFICIENT_BALANCE: ยอดเงินในกระเป๋าไม่เพียงพอ',
      code: 'INSUFFICIENT_BALANCE'
    }
  },
  createWalletNotFound: {
    data: null,
    error: {
      message: 'WALLET_NOT_FOUND: ไม่พบกระเป๋าเงิน',
      code: 'WALLET_NOT_FOUND'
    }
  },
  fetchSuccess: {
    data: mockShoppingRequest,
    error: null
  },
  fetchNotFound: {
    data: null,
    error: {
      message: 'Shopping request not found',
      code: 'PGRST116'
    }
  }
}

// Test scenarios
export const testScenarios = {
  happyPath: {
    name: 'Happy Path - Complete Shopping Flow',
    steps: [
      'Select store location',
      'Select delivery location',
      'Enter item list',
      'Set budget',
      'Upload images (optional)',
      'Submit order',
      'Navigate to tracking'
    ]
  },
  insufficientBalance: {
    name: 'Insufficient Balance Error',
    steps: [
      'Complete all steps',
      'Submit order',
      'Receive insufficient balance error',
      'Show top-up prompt'
    ]
  },
  offlineMode: {
    name: 'Offline Mode',
    steps: [
      'Start filling form',
      'Go offline',
      'Save draft',
      'Go back online',
      'Restore draft',
      'Submit order'
    ]
  },
  imageUpload: {
    name: 'Image Upload',
    steps: [
      'Select images',
      'Validate size and format',
      'Upload to storage',
      'Show preview',
      'Remove image',
      'Submit with images'
    ]
  }
}
