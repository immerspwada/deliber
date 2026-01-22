# Admin Topup Settings View

**Created**: 2026-01-22  
**Status**: ✅ Complete  
**Component**: `src/admin/views/AdminTopupSettingsView.vue`

## Overview

Dedicated admin view for managing customer top-up settings including minimum/maximum amounts, fees, and approval thresholds.

## Features

### Settings Management

- **Amount Limits**: Configure min/max top-up amounts
- **Daily Limits**: Set daily top-up limits per customer
- **Fee Configuration**: Manage fees for different payment methods
  - Credit Card: 2.5% default
  - Bank Transfer: Free
  - PromptPay: 1% default
  - TrueMoney: 2% default
- **Auto-Approval**: Set threshold for automatic approval
- **Expiry Time**: Configure request expiration (hours)
- **Slip Requirements**: Set threshold requiring payment slip

### UI Components

- **Header**: Gradient header with icon and description
- **Loading State**: Spinner during data fetch
- **Error State**: User-friendly error display
- **Settings Card**: `TopupSettingsCard` component integration
- **Refresh Button**: Manual data reload with loading indicator

## Technical Details

### Component Structure

```vue
<script setup lang="ts">
import { onMounted } from "vue";
import { useFinancialSettings } from "@/admin/composables/useFinancialSettings";
import TopupSettingsCard from "@/admin/components/TopupSettingsCard.vue";

const { loading, error, fetchSettings } = useFinancialSettings();

async function loadSettings() {
  await fetchSettings("topup");
}

onMounted(async () => {
  await loadSettings();
});
</script>
```

### Integration

- **Composable**: `useFinancialSettings` for data management
- **Component**: `TopupSettingsCard` for settings form
- **Types**: `TopupSettings` from `@/types/financial-settings`
- **RPC Functions**:
  - `get_financial_settings` - Fetch settings
  - `update_financial_setting` - Update settings

### Accessibility

- ✅ Minimum 44px touch targets
- ✅ ARIA labels on interactive elements
- ✅ Semantic HTML structure
- ✅ Keyboard navigation support
- ✅ Screen reader friendly

### Responsive Design

- Mobile-first approach
- Gradient background: `from-gray-50 to-gray-100`
- Responsive padding: `p-4 sm:p-6 lg:p-8`
- Flexible header layout: `flex-col sm:flex-row`
- Max-width content: `max-w-4xl`

## Usage

### Access

This view is accessed through the Financial Settings section:

1. Navigate to Admin Panel
2. Go to Settings → Financial Settings
3. Click on "การเติมเงิน" (Top-up) tab

Or directly via route (if added):

```
/admin/settings/topup
```

### Workflow

1. **Load Settings**: Automatically fetches on mount
2. **View Current Settings**: Displays in `TopupSettingsCard`
3. **Modify Settings**: Edit values in form fields
4. **Add Reason**: Provide change reason (audit trail)
5. **Save**: Submit changes with validation
6. **Refresh**: Manually reload if needed

## Related Files

- `src/admin/views/AdminTopupSettingsView.vue` - Main view
- `src/admin/components/TopupSettingsCard.vue` - Settings form
- `src/admin/composables/useFinancialSettings.ts` - Data management
- `src/types/financial-settings.ts` - TypeScript types
- `supabase/migrations/316_topup_requests_system.sql` - Database schema

## Future Enhancements

- [ ] Add route to admin router for direct access
- [ ] Payment method toggle (enable/disable)
- [ ] Historical settings comparison
- [ ] Impact analysis before saving
- [ ] Bulk settings import/export
- [ ] Settings templates for different scenarios

## Notes

- All changes are logged in audit trail
- Settings require admin role
- Validation ensures business rules compliance
- Real-time updates via Supabase
- Integrated with existing financial settings system

---

**Last Updated**: 2026-01-22
