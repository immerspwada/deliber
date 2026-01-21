# Dual-Role System Fix Requirements

## Problem Statement

The dual-role system (customer + provider) has critical issues preventing users from accessing the provider dashboard after approval:

1. **Table Mismatch**: Router guard checks `providers_v2` table, but onboarding view checks `service_providers` table
2. **Approval Workflow Broken**: After admin approval, users still can't access `/provider` dashboard
3. **Endless Redirect Loop**: Users get stuck between onboarding and dashboard

## Current Broken Flow

```
User registers → status: pending → Router blocks /provider → Redirect to /onboarding
→ Onboarding shows "waiting" → Admin approves → status: approved
→ Router still blocks (wrong table) → User stuck in loop
```

## Required Fix

### 1. Standardize Database Table Usage

- **DECISION**: Use `providers_v2` table consistently across all components
- Update onboarding view to check `providers_v2` instead of `service_providers`
- Ensure all provider-related queries use the same table

### 2. Fix Approval Workflow

- After admin approval, user should immediately access `/provider` dashboard
- Remove redirect loops between onboarding and dashboard
- Proper status handling: `pending` → `approved` → dashboard access

### 3. Dual-Role Support

- Users can be both customers and providers
- Customer routes accessible to all authenticated users
- Provider routes only accessible after approval
- Seamless role switching

## Acceptance Criteria

1. **Registration Flow**:

   - User at `/customer` can click "become provider"
   - Redirects to `/provider/onboarding`
   - Shows registration form if no provider record
   - Shows waiting screen if status is `pending`

2. **Approval Flow**:

   - Admin approves provider in admin panel
   - Provider status changes to `approved` in `providers_v2`
   - User can immediately access `/provider` dashboard
   - No redirect loops or table mismatches

3. **Dashboard Access**:

   - Only `approved` or `active` providers can access `/provider`
   - `pending` providers see waiting screen at `/provider/onboarding`
   - `rejected` providers can re-register

4. **Role Switching**:
   - Approved providers can switch between customer and provider modes
   - Navigation allows seamless role switching
   - Shared wallet and profile data

## Implementation Tasks

1. Fix onboarding view to use `providers_v2` table
2. Verify router guard logic for consistency
3. Test complete user journey: register → approve → dashboard access
4. Add role switcher component for dual-role users
5. Ensure all provider queries use `providers_v2`

## Success Metrics

- User can register as provider and access dashboard after approval
- No redirect loops or table mismatches
- Dual-role functionality works seamlessly
- Admin approval workflow functions correctly
