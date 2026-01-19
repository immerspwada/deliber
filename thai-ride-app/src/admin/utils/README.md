# Admin Utilities

## Error Handling (`errors.ts`)

Unified error handling system for admin composables with standardized error codes, Thai language messages, and comprehensive error context tracking.

### Features

- **AdminErrorCode Enum**: Standardized error codes for admin operations
- **AdminError Class**: Custom error class with context and metadata
- **Thai Error Messages**: User-friendly Thai language error messages
- **Error Context**: Comprehensive tracking of userId, action, timestamp, and related IDs
- **Supabase Integration**: Automatic mapping of Supabase errors to admin error codes

### Usage

#### Basic Error Creation

```typescript
import {
  createAdminError,
  AdminErrorCode,
  createErrorContext,
} from "@/admin/utils/errors";

// Create error with context
throw createAdminError(
  AdminErrorCode.ORDER_REASSIGNMENT_FAILED,
  createErrorContext("reassign_order", {
    userId: "admin-123",
    orderId: "order-456",
    providerId: "provider-789",
  }),
);
```

#### Handling Supabase Errors

```typescript
import { handleSupabaseError } from "@/admin/utils/errors";

try {
  const { data, error } = await supabase.rpc("get_available_providers", params);

  if (error) {
    throw handleSupabaseError(error, "fetch_providers", {
      orderId: "123",
      userId: "admin-456",
    });
  }
} catch (err) {
  if (isAdminError(err)) {
    console.error(err.getUserMessage()); // Thai error message
    console.error(err.toJSON()); // Full error details
  }
}
```

#### Error Checking

```typescript
import { isAdminError } from "@/admin/utils/errors";

try {
  // ... some operation
} catch (error) {
  if (isAdminError(error)) {
    // Handle AdminError specifically
    toast.error(error.getUserMessage());
    logError(error.toJSON());
  } else {
    // Handle other errors
    toast.error("เกิดข้อผิดพลาด");
  }
}
```

### Error Codes

#### Order Reassignment

- `ORDER_REASSIGNMENT_FAILED` - ไม่สามารถมอบหมายงานใหม่ได้
- `NO_AVAILABLE_PROVIDERS` - ไม่มีผู้ให้บริการที่พร้อมรับงาน
- `PROVIDER_ALREADY_ASSIGNED` - ผู้ให้บริการนี้ได้รับงานแล้ว
- `INVALID_ORDER_STATUS` - สถานะคำสั่งซื้อไม่ถูกต้อง

#### Customer Suspension

- `CUSTOMER_SUSPENSION_FAILED` - ไม่สามารถระงับบัญชีลูกค้าได้
- `CUSTOMER_ALREADY_SUSPENDED` - บัญชีลูกค้านี้ถูกระงับแล้ว
- `CUSTOMER_NOT_SUSPENDED` - บัญชีลูกค้านี้ไม่ได้ถูกระงับ
- `CUSTOMER_HAS_ACTIVE_ORDERS` - ลูกค้ามีคำสั่งซื้อที่กำลังดำเนินการอยู่

#### Provider Management

- `PROVIDER_APPROVAL_FAILED` - ไม่สามารถอนุมัติผู้ให้บริการได้
- `PROVIDER_REJECTION_FAILED` - ไม่สามารถปฏิเสธผู้ให้บริการได้
- `PROVIDER_NOT_FOUND` - ไม่พบผู้ให้บริการ
- `PROVIDER_ALREADY_APPROVED` - ผู้ให้บริการนี้ได้รับการอนุมัติแล้ว

#### Payment & Wallet

- `TOPUP_APPROVAL_FAILED` - ไม่สามารถอนุมัติการเติมเงินได้
- `TOPUP_REJECTION_FAILED` - ไม่สามารถปฏิเสธการเติมเงินได้
- `WITHDRAWAL_APPROVAL_FAILED` - ไม่สามารถอนุมัติการถอนเงินได้
- `WITHDRAWAL_REJECTION_FAILED` - ไม่สามารถปฏิเสธการถอนเงินได้
- `INSUFFICIENT_ADMIN_PERMISSIONS` - คุณไม่มีสิทธิ์ดำเนินการนี้

#### Validation

- `INVALID_PROVIDER_ID` - รหัสผู้ให้บริการไม่ถูกต้อง
- `INVALID_ORDER_ID` - รหัสคำสั่งซื้อไม่ถูกต้อง
- `INVALID_CUSTOMER_ID` - รหัสลูกค้าไม่ถูกต้อง
- `INVALID_DATE_RANGE` - ช่วงวันที่ไม่ถูกต้อง

#### Network

- `NETWORK_TIMEOUT` - หมดเวลาการเชื่อมต่อ กรุณาลองใหม่
- `NETWORK_UNAVAILABLE` - ไม่สามารถเชื่อมต่อได้ ตรวจสอบอินเทอร์เน็ต

### Error Context

All errors include comprehensive context for debugging and logging:

```typescript
interface AdminErrorContext {
  userId?: string; // Admin user performing the action
  action: string; // Action being performed (required)
  timestamp: number; // When error occurred (required)
  orderId?: string; // Related order ID
  providerId?: string; // Related provider ID
  customerId?: string; // Related customer ID
  metadata?: Record<string, unknown>; // Additional data
}
```

### Best Practices

1. **Always include action**: Specify what operation was being performed
2. **Include relevant IDs**: Add orderId, providerId, customerId when applicable
3. **Use createErrorContext helper**: Automatically sets timestamp
4. **Log errors in production**: Use error.toJSON() for structured logging
5. **Display Thai messages**: Use error.getUserMessage() for user-facing errors

### Example: Complete Error Handling in Composable

```typescript
import { ref } from "vue";
import { supabase } from "@/lib/supabase";
import {
  createAdminError,
  handleSupabaseError,
  isAdminError,
  AdminErrorCode,
  createErrorContext,
  type AdminError,
} from "@/admin/utils/errors";

export function useOrderReassignment() {
  const isLoading = ref(false);
  const error = ref<AdminError | null>(null);

  async function reassignOrder(orderId: string, providerId: string) {
    isLoading.value = true;
    error.value = null;

    try {
      // Validate inputs
      if (!orderId || !providerId) {
        throw createAdminError(
          AdminErrorCode.INVALID_ORDER_ID,
          createErrorContext("reassign_order", {
            orderId,
            providerId,
            metadata: { reason: "missing_parameters" },
          }),
        );
      }

      // Call Supabase
      const { error: rpcError } = await supabase
        .from("ride_requests")
        .update({ provider_id: providerId })
        .eq("id", orderId);

      if (rpcError) {
        throw handleSupabaseError(rpcError, "reassign_order", {
          orderId,
          providerId,
        });
      }

      return true;
    } catch (err) {
      // Store error for display
      error.value = isAdminError(err)
        ? err
        : createAdminError(
            AdminErrorCode.ORDER_REASSIGNMENT_FAILED,
            createErrorContext("reassign_order", {
              orderId,
              providerId,
            }),
            err,
          );

      // Log for debugging
      console.error("[OrderReassignment]", error.value.toJSON());

      return false;
    } finally {
      isLoading.value = false;
    }
  }

  return {
    isLoading,
    error,
    reassignOrder,
  };
}
```

### Testing

Comprehensive unit tests are available in `src/tests/admin-error-utility.unit.test.ts`:

```bash
npm run test src/tests/admin-error-utility.unit.test.ts
```

Tests cover:

- Error code enum values
- Thai error messages
- Error creation and context
- Supabase error mapping
- Error validation
- Integration with requirements

### Requirements Validation

This error utility satisfies the following requirements:

- **Requirement 2.1**: All errors are AppError instances (AdminError extends Error)
- **Requirement 2.2**: All errors have valid ErrorCode from AdminErrorCode enum
- **Requirement 2.3**: All errors display Thai language messages
- **Requirement 2.4**: All errors include context (userId, action, timestamp)
