/**
 * Service Registry - Unified Service Type Definitions
 * Task: 6 - Create service registry system
 * Requirements: 10.4
 * 
 * This registry provides a single source of truth for all service types,
 * their configurations, and atomic function mappings.
 */

export type ServiceType = 'ride' | 'delivery' | 'shopping' | 'queue' | 'moving' | 'laundry'

export type RequestStatus = 
  | 'pending' 
  | 'matched' 
  | 'arriving' 
  | 'picked_up' 
  | 'in_progress' 
  | 'delivering'
  | 'shopping'
  | 'loading'
  | 'in_transit'
  | 'unloading'
  | 'in_queue'
  | 'waiting'
  | 'ready'
  | 'completed' 
  | 'cancelled'

export interface ServiceDefinition {
  type: ServiceType
  displayName: string
  displayNameTh: string
  icon: string
  color: string
  tableName: string
  trackingPrefix: string
  hasPickupLocation: boolean
  hasDestination: boolean
  specificFields: string[]
  validStatuses: RequestStatus[]
  atomicFunctions: {
    create: string
    accept: string
    complete: string
    cancel: string
  }
  providerType: string
  providerTypeTh: string
}

export const SERVICE_REGISTRY: Record<ServiceType, ServiceDefinition> = {
  ride: {
    type: 'ride',
    displayName: 'Ride',
    displayNameTh: 'เรียกรถ',
    icon: 'car',
    color: '#00A86B',
    tableName: 'ride_requests',
    trackingPrefix: 'RID',
    hasPickupLocation: true,
    hasDestination: true,
    specificFields: ['vehicle_type', 'passenger_count', 'notes'],
    validStatuses: ['pending', 'matched', 'arriving', 'picked_up', 'in_progress', 'completed', 'cancelled'],
    atomicFunctions: {
      create: 'create_ride_atomic',
      accept: 'accept_ride_atomic',
      complete: 'complete_ride_atomic',
      cancel: 'cancel_request_atomic'
    },
    providerType: 'driver',
    providerTypeTh: 'คนขับ'
  },
  delivery: {
    type: 'delivery',
    displayName: 'Delivery',
    displayNameTh: 'ส่งของ',
    icon: 'package',
    color: '#F5A623',
    tableName: 'delivery_requests',
    trackingPrefix: 'DEL',
    hasPickupLocation: true,
    hasDestination: true,
    specificFields: ['package_size', 'package_weight', 'package_description', 'recipient_name', 'recipient_phone'],
    validStatuses: ['pending', 'matched', 'arriving', 'picked_up', 'delivering', 'completed', 'cancelled'],
    atomicFunctions: {
      create: 'create_delivery_atomic',
      accept: 'accept_delivery_atomic',
      complete: 'complete_delivery_atomic',
      cancel: 'cancel_request_atomic'
    },
    providerType: 'rider',
    providerTypeTh: 'ไรเดอร์'
  },
  shopping: {
    type: 'shopping',
    displayName: 'Shopping',
    displayNameTh: 'ซื้อของ',
    icon: 'shopping-bag',
    color: '#9B59B6',
    tableName: 'shopping_requests',
    trackingPrefix: 'SHP',
    hasPickupLocation: true,
    hasDestination: true,
    specificFields: ['store_name', 'shopping_list', 'items_total', 'notes'],
    validStatuses: ['pending', 'matched', 'shopping', 'delivering', 'completed', 'cancelled'],
    atomicFunctions: {
      create: 'create_shopping_atomic',
      accept: 'accept_shopping_atomic',
      complete: 'complete_shopping_atomic',
      cancel: 'cancel_request_atomic'
    },
    providerType: 'shopper',
    providerTypeTh: 'ผู้ช่วยซื้อ'
  },
  queue: {
    type: 'queue',
    displayName: 'Queue Booking',
    displayNameTh: 'จองคิว',
    icon: 'users',
    color: '#3498DB',
    tableName: 'queue_bookings',
    trackingPrefix: 'QUE',
    hasPickupLocation: true,
    hasDestination: false,
    specificFields: ['place_name', 'place_address', 'estimated_wait_time', 'queue_position'],
    validStatuses: ['pending', 'matched', 'in_queue', 'waiting', 'completed', 'cancelled'],
    atomicFunctions: {
      create: 'create_queue_atomic',
      accept: 'accept_queue_atomic',
      complete: 'complete_queue_atomic',
      cancel: 'cancel_request_atomic'
    },
    providerType: 'queue_agent',
    providerTypeTh: 'ผู้รับจองคิว'
  },
  moving: {
    type: 'moving',
    displayName: 'Moving',
    displayNameTh: 'ขนย้าย',
    icon: 'truck',
    color: '#E74C3C',
    tableName: 'moving_requests',
    trackingPrefix: 'MOV',
    hasPickupLocation: true,
    hasDestination: true,
    specificFields: ['service_type', 'helpers_count', 'vehicle_size', 'items_description', 'floor_from', 'floor_to'],
    validStatuses: ['pending', 'matched', 'arriving', 'loading', 'in_transit', 'unloading', 'completed', 'cancelled'],
    atomicFunctions: {
      create: 'create_moving_atomic',
      accept: 'accept_moving_atomic',
      complete: 'complete_moving_atomic',
      cancel: 'cancel_request_atomic'
    },
    providerType: 'mover',
    providerTypeTh: 'ทีมขนย้าย'
  },
  laundry: {
    type: 'laundry',
    displayName: 'Laundry',
    displayNameTh: 'ซักรีด',
    icon: 'shirt',
    color: '#1ABC9C',
    tableName: 'laundry_requests',
    trackingPrefix: 'LAU',
    hasPickupLocation: true,
    hasDestination: true,
    specificFields: ['service_type', 'estimated_weight', 'special_instructions', 'pickup_time', 'delivery_time'],
    validStatuses: ['pending', 'matched', 'picked_up', 'in_progress', 'ready', 'delivering', 'completed', 'cancelled'],
    atomicFunctions: {
      create: 'create_laundry_atomic',
      accept: 'accept_laundry_atomic',
      complete: 'complete_laundry_atomic',
      cancel: 'cancel_request_atomic'
    },
    providerType: 'laundry_provider',
    providerTypeTh: 'ร้านซักรีด'
  }
}

// Helper functions
export function getServiceDefinition(serviceType: ServiceType): ServiceDefinition {
  const definition = SERVICE_REGISTRY[serviceType]
  if (!definition) {
    throw new Error(`Unknown service type: ${serviceType}`)
  }
  return definition
}

export function getAllServiceTypes(): ServiceType[] {
  return Object.keys(SERVICE_REGISTRY) as ServiceType[]
}

export function getTableName(serviceType: ServiceType): string {
  return getServiceDefinition(serviceType).tableName
}

export function getTrackingPrefix(serviceType: ServiceType): string {
  return getServiceDefinition(serviceType).trackingPrefix
}

export function getAtomicFunction(serviceType: ServiceType, operation: 'create' | 'accept' | 'complete' | 'cancel'): string {
  return getServiceDefinition(serviceType).atomicFunctions[operation]
}

export function isValidStatus(serviceType: ServiceType, status: RequestStatus): boolean {
  return getServiceDefinition(serviceType).validStatuses.includes(status)
}

export function getDisplayName(serviceType: ServiceType, locale: 'en' | 'th' = 'th'): string {
  const def = getServiceDefinition(serviceType)
  return locale === 'th' ? def.displayNameTh : def.displayName
}

export function getProviderTypeName(serviceType: ServiceType, locale: 'en' | 'th' = 'th'): string {
  const def = getServiceDefinition(serviceType)
  return locale === 'th' ? def.providerTypeTh : def.providerType
}

// Type guards
export function isServiceType(value: string): value is ServiceType {
  return value in SERVICE_REGISTRY
}
