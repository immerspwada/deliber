# Thai Ride App - Modular Migrations

## โครงสร้าง Migrations แบบ Module

```
migrations/
├── core/                    # Core system (ต้องรันก่อน)
│   └── 001_users_auth.sql   # Users & Authentication
│
├── provider/                # Provider features
│   ├── 001_service_providers.sql  # Service providers table
│   └── 002_earnings.sql           # Earnings & stats
│
├── customer/                # Customer features
│   ├── 001_rides.sql        # Ride requests
│   ├── 002_delivery.sql     # Delivery service
│   ├── 003_shopping.sql     # Shopping service
│   ├── 004_ratings.sql      # All ratings
│   ├── 005_saved_places.sql # Saved & recent places
│   ├── 006_safety.sql       # Safety features
│   └── 007_chat.sql         # Chat/messaging
│
├── shared/                  # Shared features
│   ├── 001_notifications.sql    # Notifications & push
│   ├── 002_payments.sql         # Payments
│   ├── 003_wallet.sql           # Wallet system
│   ├── 004_promos.sql           # Promo codes
│   ├── 005_referral.sql         # Referral system
│   ├── 006_tracking.sql         # Tracking system
│   └── 007_advanced_features.sql # Advanced features (F15-F22)
│
├── admin/                   # Admin features
│   └── 001_admin_features.sql   # Support, complaints, refunds
│
└── [legacy files]           # Original migration files (001-015)
```

## ลำดับการรัน Migrations

### 1. Core (ต้องรันก่อน)
```bash
psql -f core/001_users_auth.sql
```

### 2. Provider
```bash
psql -f provider/001_service_providers.sql
psql -f provider/002_earnings.sql
```

### 3. Customer
```bash
psql -f customer/001_rides.sql
psql -f customer/002_delivery.sql
psql -f customer/003_shopping.sql
psql -f customer/004_ratings.sql
psql -f customer/005_saved_places.sql
psql -f customer/006_safety.sql
psql -f customer/007_chat.sql
```

### 4. Shared
```bash
psql -f shared/001_notifications.sql
psql -f shared/002_payments.sql
psql -f shared/003_wallet.sql
psql -f shared/004_promos.sql
psql -f shared/005_referral.sql
psql -f shared/006_tracking.sql
psql -f shared/007_advanced_features.sql
```

### 5. Admin
```bash
psql -f admin/001_admin_features.sql
```

## Dependencies

| Module | Depends On |
|--------|------------|
| `core/*` | - |
| `provider/*` | `core/001` |
| `customer/001_rides` | `core/001`, `provider/001` |
| `customer/002_delivery` | `core/001`, `provider/001` |
| `customer/003_shopping` | `core/001`, `provider/001` |
| `customer/004_ratings` | `customer/001-003` |
| `customer/005_saved_places` | `core/001` |
| `customer/006_safety` | `core/001`, `customer/001` |
| `customer/007_chat` | `core/001`, `customer/001` |
| `shared/001_notifications` | `core/001` |
| `shared/002_payments` | `core/001`, `provider/001` |
| `shared/003_wallet` | `core/001` |
| `shared/004_promos` | `core/001` |
| `shared/005_referral` | `core/001`, `shared/003` |
| `shared/006_tracking` | `core/001` |
| `shared/007_advanced` | `core/001`, `customer/001` |
| `admin/*` | `core/001`, `shared/002` |

## Feature Mapping

| Feature | Module | File |
|---------|--------|------|
| F01 User Auth | core | 001_users_auth.sql |
| F02 Ride Booking | customer | 001_rides.sql |
| F03 Delivery | customer | 002_delivery.sql |
| F04 Shopping | customer | 003_shopping.sql |
| F05 Wallet | shared | 003_wallet.sql |
| F06 Referral | shared | 005_referral.sql |
| F07 Notifications | shared | 001_notifications.sql |
| F08 Payments | shared | 002_payments.sql |
| F09 Saved Places | customer | 005_saved_places.sql |
| F10 Promos | shared | 004_promos.sql |
| F11 Ratings | customer | 004_ratings.sql |
| F12 Chat | customer | 007_chat.sql |
| F13 Safety | customer | 006_safety.sql |
| F14 Provider | provider | 001_service_providers.sql |
| F15-F22 Advanced | shared | 007_advanced_features.sql |
| F23-F24 Admin | admin | 001_admin_features.sql |
| F25 Tracking | shared | 006_tracking.sql |
| F26 Service Ratings | customer | 004_ratings.sql |

## Notes

- Legacy files (001-015) ยังคงใช้งานได้กับ Supabase CLI
- Modular files ใช้สำหรับ reference และ manual deployment
- ทุก module มี RLS policies แบบ permissive สำหรับ development
- Production ควรปรับ RLS policies ให้เข้มงวดขึ้น
