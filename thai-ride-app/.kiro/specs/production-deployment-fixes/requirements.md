# Production Deployment Fixes - Requirements

## Overview

แก้ไขปัญหา RPC functions ที่หายไปใน Production และ deploy migrations ที่ค้างอยู่

## User Stories

### 1. Admin Order Reassignment (Migration 306)

**As an** admin  
**I want to** reassign orders to different providers in production  
**So that** I can manage order distribution efficiently

**Acceptance Criteria:**

- ✅ Migration 306 deployed to production
- ✅ RPC function `get_available_providers()` exists in production
- ✅ RPC function `reassign_order()` works in production
- ✅ RPC function `get_reassignment_history()` works in production
- ✅ Reassignment button works at https://onsflqhkgqhydeupiqyt.supabase.co

### 2. Customer Suspension System (Migrations 308-309)

**As an** admin  
**I want to** suspend customer accounts in production  
**So that** I can manage problematic users

**Acceptance Criteria:**

- ✅ Migration 308 deployed to production
- ✅ Migration 309 deployed to production
- ✅ Suspend button visible at http://localhost:5173/admin/customers
- ✅ RPC function `suspend_customer_account()` works
- ✅ RPC function `unsuspend_customer_account()` works
- ✅ Status field populated correctly in customer list

## Current Issues

### Issue 1: Missing RPC Function in Production

**Error:** `Could not find the function public.get_available_providers(p_limit, p_service_type) in the schema cache`

**Location:** https://onsflqhkgqhydeupiqyt.supabase.co  
**Affected Feature:** Order Reassignment  
**Root Cause:** Migration 306 not deployed to production

### Issue 2: Docker Not Running

**Error:** `Cannot connect to the Docker daemon at unix:///var/run/docker.sock`

**Impact:** Cannot apply migrations locally  
**Root Cause:** Docker Desktop not started

### Issue 3: Suspend Button Not Visible

**Location:** http://localhost:5173/admin/customers  
**Root Cause:** Migrations 308-309 not applied locally

## Technical Requirements

### Database

- ✅ Migration 306: Order reassignment system
- ✅ Migration 308: Customer suspension columns
- ✅ Migration 309: Fix get_admin_customers status field

### RPC Functions

- ✅ `get_available_providers(p_service_type, p_limit)`
- ✅ `reassign_order(p_order_id, p_order_type, p_new_provider_id, p_reason, p_notes)`
- ✅ `get_reassignment_history(p_order_id, p_provider_id, p_limit, p_offset)`
- ✅ `suspend_customer_account(p_customer_id, p_reason)`
- ✅ `unsuspend_customer_account(p_customer_id)`
- ✅ `get_admin_customers(p_search_term, p_status, p_limit, p_offset)` - fixed version

### RLS Policies

- ✅ Admin-only access to order_reassignments
- ✅ Customer suspension policies (3 roles system)

### Frontend

- ✅ Order reassignment modal
- ✅ Customer suspension UI
- ✅ Status badges and indicators

## Deployment Strategy

### Phase 1: Local Setup (Prerequisites)

1. Start Docker Desktop
2. Start Supabase local stack
3. Apply migrations 308-309 locally
4. Generate types
5. Test locally

### Phase 2: Production Deployment

1. Link to production project
2. Apply migration 306 (order reassignment)
3. Apply migrations 308-309 (customer suspension)
4. Verify functions exist
5. Test in production

### Phase 3: Verification

1. Test order reassignment in production
2. Test customer suspension locally
3. Monitor logs for errors
4. Verify audit trails

## Success Criteria

### Local Environment

- [ ] Docker running
- [ ] Supabase local running
- [ ] Migrations 308-309 applied
- [ ] Types generated
- [ ] Suspend button visible
- [ ] Suspend/unsuspend works

### Production Environment

- [ ] Migration 306 applied
- [ ] Migrations 308-309 applied
- [ ] All RPC functions exist
- [ ] Order reassignment works
- [ ] Customer suspension works
- [ ] No errors in logs

## Out of Scope

- Creating new features
- Modifying existing UI beyond bug fixes
- Performance optimization
- Adding new RPC functions

## Dependencies

- Docker Desktop installed
- Supabase CLI installed
- Production project access
- Admin credentials for testing

## Risks

- Production downtime during deployment
- Data inconsistency if migrations fail
- RLS policy conflicts
- Type generation errors

## Mitigation

- Test all migrations locally first
- Have rollback plan ready
- Deploy during low-traffic period
- Monitor logs during deployment
- Keep backup of production data
