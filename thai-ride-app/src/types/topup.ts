// =====================================================
// Top-up Request Types
// =====================================================

export interface TopupRequest {
  id: string;
  tracking_id: string;
  user_id: string;
  user_name?: string;
  user_phone?: string;
  user_member_uid?: string;
  amount: number;
  payment_method: string;
  payment_reference?: string;
  slip_url?: string;
  slip_image_url?: string;
  status: TopupStatus;
  admin_id?: string;
  admin_name?: string;
  admin_note?: string;
  created_at: string;
  updated_at: string;
  approved_at?: string;
  rejected_at?: string;
  expires_at?: string;
}

export type TopupStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'expired';

export interface TopupStats {
  total_requests: number;
  pending_requests: number;
  approved_requests: number;
  rejected_requests: number;
  cancelled_requests: number;
  expired_requests: number;
  total_amount: number;
  pending_amount: number;
  approved_amount: number;
  avg_processing_time_minutes: number;
}

export interface TopupActionResult {
  success: boolean;
  message: string;
}
