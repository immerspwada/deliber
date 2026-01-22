# Payment Methods Settings - Updated (No Fees Display)

**Date**: 2026-01-22  
**Status**: ✅ Complete  
**Update**: Removed fee display from UI

## Overview

Updated payment methods configuration to hide fee information from both admin and customer interfaces while maintaining the data structure in database for future use.

## Changes Made

### 1. Admin UI - TopupSettingsCard

**Removed:**

- Fee percentage display next to each payment method
- "ค่าธรรมเนียม: X%" text

**Updated UI:**

```vue
<div class="flex items-center p-4 bg-gray-50 rounded-lg">
  <input v-model="localPaymentMethods.promptpay.enabled" type="checkbox" />
  <label>พร้อมเพย์</label>
  <!-- Fee display removed -->
</div>
```

### 2. Customer UI - WalletView

**Removed:**

- Fee display in dropdown options
- "(ค่าธรรมเนียม X%)" text
- "(ฟรี)" text for zero-fee methods

**Updated Computed:**

```typescript
const enabledPaymentMethods = computed(() => {
  return Object.entries(paymentMethods.value)
    .filter(([_, method]) => method.enabled)
    .map(([key, method]) => ({
      value: key,
      label: method.display_name,
      // fee property removed from output
    }));
});
```

**Updated Template:**

```vue
<select v-model="topupMethod">
  <option 
    v-for="method in enabledPaymentMethods" 
    :key="method.value" 
    :value="method.value"
  >
    {{ method.label }}
    <!-- Fee display removed -->
  </option>
</select>
```

## Database Structure (Unchanged)

Fee data remains in database for future use:

```json
{
  "promptpay": {
    "enabled": true,
    "fee": 0.01,
    "display_name": "พร้อมเพย์"
  },
  "bank_transfer": {
    "enabled": true,
    "fee": 0,
    "display_name": "โอนเงินผ่านธนาคาร"
  },
  "credit_card": {
    "enabled": false,
    "fee": 0.025,
    "display_name": "บัตรเครดิต"
  },
  "truemoney": {
    "enabled": false,
    "fee": 0.02,
    "display_name": "TrueMoney Wallet"
  }
}
```

## UI Comparison

### Before (With Fees)

**Admin:**

```
☑ พร้อมเพย์                    ค่าธรรมเนียม: 1.00%
☑ โอนเงินผ่านธนาคาร              ค่าธรรมเนียม: ฟรี
☐ บัตรเครดิต                   ค่าธรรมเนียม: 2.50%
☐ TrueMoney Wallet             ค่าธรรมเนียม: 2.00%
```

**Customer:**

```
วิธีชำระเงิน:
- พร้อมเพย์ (ค่าธรรมเนียม 1.00%)
- โอนเงินผ่านธนาคาร (ฟรี)
```

### After (No Fees)

**Admin:**

```
☑ พร้อมเพย์
☑ โอนเงินผ่านธนาคาร
☐ บัตรเครดิต
☐ TrueMoney Wallet
```

**Customer:**

```
วิธีชำระเงิน:
- พร้อมเพย์
- โอนเงินผ่านธนาคาร
```

## Benefits

### Cleaner UI

- ✅ Simpler, less cluttered interface
- ✅ Faster decision making for users
- ✅ Focus on payment method selection

### Business Flexibility

- ✅ Fee data preserved in database
- ✅ Can re-enable display anytime
- ✅ Can use fees for internal calculations
- ✅ No data migration needed

### User Experience

- ✅ No confusion about fees
- ✅ Streamlined checkout process
- ✅ Consistent with "no fee" policy

## Files Modified

1. ✅ `src/admin/components/TopupSettingsCard.vue` - Removed fee display from checkboxes
2. ✅ `src/admin/views/AdminTopupRequestsView.vue` - Removed fee input field from settings section
3. ✅ `src/views/WalletView.vue` - Removed fee from dropdown

## Verification

### Admin Interface

- [x] Checkboxes show without fee text
- [x] Clean layout maintained
- [x] Save functionality works
- [x] Settings persist correctly

### Customer Interface

- [x] Dropdown shows method names only
- [x] No fee information displayed
- [x] Selection works correctly
- [x] Payment flow unaffected

### TypeScript

```bash
✅ No TypeScript errors
✅ All types still valid
✅ Computed properties work correctly
```

## Future Considerations

If fees need to be displayed again:

1. **Admin UI**: Add back fee display in TopupSettingsCard
2. **Customer UI**: Add back fee in dropdown options
3. **No database changes needed** - data already exists

Example code to re-enable:

```vue
<!-- Admin -->
<div class="text-sm text-gray-600">
  ค่าธรรมเนียม: {{ (method.fee * 100).toFixed(2) }}%
</div>

<!-- Customer -->
<option>
  {{ method.label }}
  <template v-if="method.fee > 0">
    (ค่าธรรมเนียม {{ (method.fee * 100).toFixed(2) }}%)
  </template>
</option>
```

## Conclusion

Successfully removed fee display from UI while maintaining data integrity in database. The system now presents a cleaner interface focused on payment method selection without fee information.

---

**Last Updated**: 2026-01-22  
**Status**: ✅ Production Ready  
**Change Type**: UI Update (No Database Changes)
