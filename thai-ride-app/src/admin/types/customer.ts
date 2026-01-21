/**
 * Customer Types for Admin Panel
 * ================================
 * TypeScript types for customer management
 */

export interface Customer {
  id: string;
  email: string | null;
  full_name: string | null;
  phone_number: string | null;
  role: 'customer' | 'provider' | 'admin';
  status: 'active' | 'suspended' | 'banned';
  created_at: string;
  updated_at: string;
  suspended_at: string | null;
  suspension_reason: string | null;
}

export interface CustomerFilters {
  search?: string;
  status?: ('active' | 'suspended' | 'banned')[];
  limit?: number;
  offset?: number;
}

export interface SuspensionAction {
  customerId: string;
  reason: string;
}

export interface BulkSuspensionAction {
  customerIds: string[];
  reason: string;
}

export interface CustomerStats {
  total: number;
  active: number;
  suspended: number;
  banned: number;
}
