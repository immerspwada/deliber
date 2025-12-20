/**
 * State Machine - Status Transition Validation
 * Task: 10 - Implement state machine validation
 * Requirements: 1.4, 4.6, 8.4
 * 
 * Defines valid status transitions for all service types
 */

import { type ServiceType, type RequestStatus } from './serviceRegistry'

// Valid transitions for each status
const VALID_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  // Initial state
  pending: ['matched', 'cancelled'],
  
  // After provider accepts
  matched: ['arriving', 'picked_up', 'in_progress', 'cancelled'],
  
  // Provider is on the way
  arriving: ['picked_up', 'cancelled'],
  
  // Customer/package picked up
  picked_up: ['in_progress', 'delivering', 'cancelled'],
  
  // Service in progress
  in_progress: ['completed', 'cancelled'],
  
  // Delivery specific
  delivering: ['completed', 'cancelled'],
  
  // Shopping specific
  shopping: ['delivering', 'cancelled'],
  
  // Moving specific
  loading: ['in_transit', 'cancelled'],
  in_transit: ['unloading', 'cancelled'],
  unloading: ['completed', 'cancelled'],
  
  // Queue specific
  in_queue: ['waiting', 'completed', 'cancelled'],
  waiting: ['completed', 'cancelled'],
  
  // Laundry specific
  ready: ['delivering', 'completed', 'cancelled'],
  
  // Terminal states
  completed: [],
  cancelled: []
}

// Service-specific valid statuses
const SERVICE_VALID_STATUSES: Record<ServiceType, RequestStatus[]> = {
  ride: ['pending', 'matched', 'arriving', 'picked_up', 'in_progress', 'completed', 'cancelled'],
  delivery: ['pending', 'matched', 'arriving', 'picked_up', 'delivering', 'completed', 'cancelled'],
  shopping: ['pending', 'matched', 'shopping', 'delivering', 'completed', 'cancelled'],
  queue: ['pending', 'matched', 'in_queue', 'waiting', 'completed', 'cancelled'],
  moving: ['pending', 'matched', 'arriving', 'loading', 'in_transit', 'unloading', 'completed', 'cancelled'],
  laundry: ['pending', 'matched', 'picked_up', 'in_progress', 'ready', 'delivering', 'completed', 'cancelled']
}

/**
 * Check if a status transition is valid
 */
export function isValidTransition(
  currentStatus: RequestStatus, 
  newStatus: RequestStatus,
  serviceType?: ServiceType
): boolean {
  // Check if new status is valid for service type
  if (serviceType && !SERVICE_VALID_STATUSES[serviceType].includes(newStatus)) {
    return false
  }
  
  // Check if transition is allowed
  const allowedTransitions = VALID_TRANSITIONS[currentStatus] || []
  return allowedTransitions.includes(newStatus)
}

/**
 * Get all valid next statuses from current status
 */
export function getValidNextStatuses(
  currentStatus: RequestStatus,
  serviceType?: ServiceType
): RequestStatus[] {
  const transitions = VALID_TRANSITIONS[currentStatus] || []
  
  if (serviceType) {
    const validForService = SERVICE_VALID_STATUSES[serviceType]
    return transitions.filter(s => validForService.includes(s))
  }
  
  return transitions
}

/**
 * Check if status is a terminal state
 */
export function isTerminalStatus(status: RequestStatus): boolean {
  return status === 'completed' || status === 'cancelled'
}

/**
 * Check if status is active (not terminal)
 */
export function isActiveStatus(status: RequestStatus): boolean {
  return !isTerminalStatus(status)
}

/**
 * Get status display info
 */
export interface StatusInfo {
  label: string
  labelTh: string
  color: string
  icon: string
  isTerminal: boolean
}

const STATUS_INFO: Record<RequestStatus, StatusInfo> = {
  pending: {
    label: 'Pending',
    labelTh: 'รอดำเนินการ',
    color: '#F5A623',
    icon: 'clock',
    isTerminal: false
  },
  matched: {
    label: 'Matched',
    labelTh: 'จับคู่แล้ว',
    color: '#3498DB',
    icon: 'user-check',
    isTerminal: false
  },
  arriving: {
    label: 'Arriving',
    labelTh: 'กำลังมา',
    color: '#9B59B6',
    icon: 'navigation',
    isTerminal: false
  },
  picked_up: {
    label: 'Picked Up',
    labelTh: 'รับแล้ว',
    color: '#00A86B',
    icon: 'package',
    isTerminal: false
  },
  in_progress: {
    label: 'In Progress',
    labelTh: 'กำลังดำเนินการ',
    color: '#00A86B',
    icon: 'loader',
    isTerminal: false
  },
  delivering: {
    label: 'Delivering',
    labelTh: 'กำลังจัดส่ง',
    color: '#00A86B',
    icon: 'truck',
    isTerminal: false
  },
  shopping: {
    label: 'Shopping',
    labelTh: 'กำลังซื้อของ',
    color: '#9B59B6',
    icon: 'shopping-cart',
    isTerminal: false
  },
  loading: {
    label: 'Loading',
    labelTh: 'กำลังขนของขึ้น',
    color: '#F5A623',
    icon: 'upload',
    isTerminal: false
  },
  in_transit: {
    label: 'In Transit',
    labelTh: 'กำลังเดินทาง',
    color: '#3498DB',
    icon: 'truck',
    isTerminal: false
  },
  unloading: {
    label: 'Unloading',
    labelTh: 'กำลังขนของลง',
    color: '#F5A623',
    icon: 'download',
    isTerminal: false
  },
  in_queue: {
    label: 'In Queue',
    labelTh: 'อยู่ในคิว',
    color: '#3498DB',
    icon: 'users',
    isTerminal: false
  },
  waiting: {
    label: 'Waiting',
    labelTh: 'รอคิว',
    color: '#F5A623',
    icon: 'clock',
    isTerminal: false
  },
  ready: {
    label: 'Ready',
    labelTh: 'พร้อมแล้ว',
    color: '#00A86B',
    icon: 'check-circle',
    isTerminal: false
  },
  completed: {
    label: 'Completed',
    labelTh: 'เสร็จสิ้น',
    color: '#00A86B',
    icon: 'check',
    isTerminal: true
  },
  cancelled: {
    label: 'Cancelled',
    labelTh: 'ยกเลิก',
    color: '#E53935',
    icon: 'x',
    isTerminal: true
  }
}

export function getStatusInfo(status: RequestStatus): StatusInfo {
  return STATUS_INFO[status] || STATUS_INFO.pending
}

/**
 * Validate and throw error if transition is invalid
 */
export function validateTransition(
  currentStatus: RequestStatus,
  newStatus: RequestStatus,
  serviceType?: ServiceType
): void {
  if (!isValidTransition(currentStatus, newStatus, serviceType)) {
    throw new Error(
      `Invalid status transition: ${currentStatus} → ${newStatus}` +
      (serviceType ? ` for ${serviceType}` : '')
    )
  }
}
