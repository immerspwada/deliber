# Code Improvements Guide

## สรุปการปรับปรุงที่ทำแล้ว

### ✅ 1. แก้ไข Hardcoded Credentials
- ✅ แก้ hardcoded Supabase URL ใน `usePerformance.ts`
- ✅ ใช้ `env.supabaseUrl` แทน hardcoded value

### ✅ 2. สร้าง Base API Composable
- ✅ สร้าง `useApiQuery` composable สำหรับ standardized API calls
- ✅ รองรับ request deduplication, caching, retry logic
- ✅ สร้าง `useSupabaseQuery` สำหรับ Supabase queries
- ✅ สร้าง `useParallelQueries` สำหรับ parallel queries

### ✅ 3. Standardize Error Handling
- ✅ สร้าง Result type pattern (`src/utils/result.ts`)
- ✅ สร้าง error handling utilities (`src/utils/errorHandling.ts`)
- ✅ สร้าง custom error classes (NetworkError, ValidationError, etc.)
- ✅ สร้าง API type definitions (`src/types/api.ts`)

---

## วิธีใช้งาน

### 1. ใช้ useApiQuery แทน manual error handling

**เดิม:**
```typescript
const createRideRequest = async (...) => {
  loading.value = true
  error.value = null
  try {
    const { data, error: insertError } = await supabase
      .from('ride_requests')
      .insert(rideData)
      .select()
      .single()
    
    if (insertError) {
      error.value = insertError.message
      return null
    }
    return data
  } catch (err: any) {
    error.value = err.message
    return null
  } finally {
    loading.value = false
  }
}
```

**ใหม่:**
```typescript
import { useSupabaseQuery } from '../composables/useApiQuery'
import { RequestKeys } from '../composables/useRequestDedup'

const { executeSupabase, loading, error, data } = useSupabaseQuery<RideRequest>()

const createRideRequest = async (...) => {
  const result = await executeSupabase(
    () => supabase
      .from('ride_requests')
      .insert(rideData)
      .select()
      .single(),
    {
      cacheKey: RequestKeys.rideHistory(userId),
      cacheTtl: 60000,
      showErrorToast: true
    }
  )
  
  if (result.success) {
    currentRide.value = result.data
    subscribeToRideUpdates(result.data.id)
    return result.data
  }
  
  return null
}
```

### 2. ใช้ Result type pattern

```typescript
import { ok, err, isOk } from '../utils/result'
import { toAppError, handleError } from '../utils/errorHandling'

const fetchUser = async (id: string): Promise<Result<User>> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) {
      return err(toAppError(error))
    }
    
    return ok(data)
  } catch (error) {
    return err(toAppError(error))
  }
}

// ใช้งาน
const result = await fetchUser(userId)
if (isOk(result)) {
  console.log(result.data)
} else {
  handleError(result.error, { showToast: true })
}
```

### 3. ใช้ Error Classes

```typescript
import { 
  NetworkError, 
  ValidationError, 
  NotFoundError,
  handleError 
} from '../utils/errorHandling'

try {
  const data = await fetchData()
} catch (error) {
  if (error instanceof NetworkError) {
    // Handle network error
  } else if (error instanceof ValidationError) {
    // Handle validation error
  } else {
    handleError(error, { showToast: true })
  }
}
```

### 4. ใช้ Request Deduplication

```typescript
import { useRequestDedup, RequestKeys } from '../composables/useRequestDedup'

const { dedupRequest } = useRequestDedup()

const fetchRideHistory = async (userId: string) => {
  return dedupRequest(
    RequestKeys.rideHistory(userId),
    async () => {
      const { data, error } = await supabase
        .from('ride_requests')
        .select('*')
        .eq('user_id', userId)
      
      if (error) throw error
      return data
    },
    { ttl: 60000 } // Cache for 1 minute
  )
}
```

---

## ขั้นตอนต่อไป (Migration Plan)

### Phase 1: Critical Stores (Priority: High)
1. ✅ สร้าง base utilities
2. ⏳ Refactor `stores/ride.ts` - ใช้ useApiQuery
3. ⏳ Refactor `stores/auth.ts` - ใช้ useApiQuery
4. ⏳ Refactor `stores/delivery.ts` - ใช้ useApiQuery

### Phase 2: Composables (Priority: Medium)
5. ⏳ Refactor `composables/useAdmin.ts` - ใช้ useApiQuery
6. ⏳ Refactor `composables/useDelivery.ts` - ใช้ useApiQuery
7. ⏳ Refactor `composables/useShopping.ts` - ใช้ useApiQuery

### Phase 3: Type Safety (Priority: Medium)
8. ⏳ แทนที่ `any` types ใน stores
9. ⏳ แทนที่ `any` types ใน composables
10. ⏳ เพิ่ม proper types สำหรับ Supabase responses

### Phase 4: Testing (Priority: Low)
11. ⏳ เขียน unit tests สำหรับ utilities
12. ⏳ เขียน unit tests สำหรับ stores
13. ⏳ เขียน integration tests

---

## Best Practices

### 1. Error Handling
- ✅ ใช้ Result type สำหรับ functions ที่อาจ fail
- ✅ ใช้ custom error classes แทน generic Error
- ✅ Log errors และส่งไป Sentry
- ✅ แสดง user-friendly error messages

### 2. API Calls
- ✅ ใช้ useApiQuery หรือ useSupabaseQuery
- ✅ ใช้ request deduplication สำหรับ expensive queries
- ✅ ใช้ caching อย่างเหมาะสม
- ✅ Handle loading และ error states

### 3. Type Safety
- ✅ หลีกเลี่ยง `any` type
- ✅ ใช้ proper types จาก database types
- ✅ ใช้ type guards สำหรับ runtime checks
- ✅ ใช้ generic types สำหรับ reusable functions

### 4. Performance
- ✅ ใช้ request deduplication
- ✅ ใช้ caching อย่างเหมาะสม
- ✅ Batch queries เมื่อเป็นไปได้
- ✅ ใช้ parallel queries สำหรับ independent data

---

## ตัวอย่างการ Refactor

### Before (Old Pattern)
```typescript
const fetchData = async () => {
  loading.value = true
  error.value = null
  try {
    const { data, error: fetchError } = await supabase
      .from('table')
      .select('*')
    
    if (fetchError) {
      error.value = fetchError.message
      return null
    }
    
    return data
  } catch (err: any) {
    error.value = err.message
    return null
  } finally {
    loading.value = false
  }
}
```

### After (New Pattern)
```typescript
const { executeSupabase, loading, error, data } = useSupabaseQuery<DataType[]>()

const fetchData = async () => {
  const result = await executeSupabase(
    () => supabase.from('table').select('*'),
    {
      cacheKey: 'table_data',
      cacheTtl: 60000,
      showErrorToast: true
    }
  )
  
  return result.success ? result.data : null
}
```

---

## Migration Checklist

เมื่อ refactor แต่ละไฟล์:

- [ ] Import utilities ที่จำเป็น
- [ ] แทนที่ manual error handling ด้วย useApiQuery
- [ ] ใช้ Result type สำหรับ return values
- [ ] ใช้ request deduplication สำหรับ expensive queries
- [ ] แทนที่ `any` types ด้วย proper types
- [ ] เพิ่ม error handling ที่เหมาะสม
- [ ] ทดสอบว่าทำงานถูกต้อง
- [ ] อัปเดต documentation

---

## Resources

- `src/composables/useApiQuery.ts` - Base API composable
- `src/utils/result.ts` - Result type utilities
- `src/utils/errorHandling.ts` - Error handling utilities
- `src/types/api.ts` - API type definitions

