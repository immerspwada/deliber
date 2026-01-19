# 🏢 Business Model - Thai Ride App

**Date**: 2026-01-19  
**Status**: ✅ Active  
**Priority**: 🔥 CRITICAL - Foundation Document

---

## 🎯 Business Overview

**Platform Type**: Multi-Service On-Demand Marketplace  
**Revenue Model**: Credit-Based Pre-paid System with Platform Commission  
**Target Market**: Thailand Urban Transportation & Delivery

---

## 💰 Revenue Streams

### 1. **Platform Commission** (Primary Revenue)

```typescript
// Commission Structure
const COMMISSION_RATES = {
  ride: 0.20,        // 20% from ride fare
  delivery: 0.25,    // 25% from delivery fee
  shopping: 0.15,    // 15% from shopping service
  moving: 0.18,      // 18% from moving service
} as const;

// Example Transaction
Ride Fare: 100 THB
├─ Platform Commission: 20 THB (20%)
├─ Provider Earnings: 80 THB (80%)
└─ Payment Method: Customer Wallet (Pre-paid)
```

### 2. **Top-up Fees** (Secondary Revenue)

```typescript
// Top-up Fee Structure
const TOPUP_FEES = {
  credit_card: 0.025,      // 2.5% fee
  bank_transfer: 0,        // Free
  promptpay: 0.01,         // 1% fee
  truemoney: 0.02,         // 2% fee
} as const;

// Example
Customer Top-up: 1000 THB via Credit Card
├─ Fee: 25 THB (2.5%)
├─ Wallet Credit: 975 THB
└─ Platform Revenue: 25 THB
```

### 3. **Withdrawal Fees** (Provider Side)

```typescript
// Withdrawal Fee Structure
const WITHDRAWAL_FEES = {
  bank_transfer: 10,       // 10 THB flat fee
  promptpay: 5,            // 5 THB flat fee
  minimum_amount: 100,     // Minimum 100 THB
} as const;

// Example
Provider Withdrawal: 500 THB
├─ Fee: 10 THB
├─ Net Transfer: 490 THB
└─ Platform Revenue: 10 THB
```

### 4. **Surge Pricing** (Dynamic Pricing)

```typescript
// Surge Multiplier
const SURGE_MULTIPLIER = {
  low_demand: 1.0,         // Normal price
  medium_demand: 1.3,      // +30%
  high_demand: 1.5,        // +50%
  peak_demand: 2.0,        // +100%
} as const;

// Example
Base Fare: 100 THB
Peak Hour Surge: 2.0x
├─ Final Fare: 200 THB
├─ Platform Commission: 40 THB (20%)
└─ Provider Earnings: 160 THB (80%)
```

### 5. **Subscription Plans** (Future Revenue)

```typescript
// Provider Subscription Tiers
const SUBSCRIPTION_PLANS = {
  basic: {
    price: 0, // Free
    commission: 0.2, // 20%
    features: ["basic_support", "standard_priority"],
  },
  premium: {
    price: 299, // 299 THB/month
    commission: 0.15, // 15% (reduced)
    features: ["priority_support", "high_priority", "analytics"],
  },
  pro: {
    price: 599, // 599 THB/month
    commission: 0.1, // 10% (lowest)
    features: [
      "24/7_support",
      "highest_priority",
      "advanced_analytics",
      "marketing_tools",
    ],
  },
} as const;
```

---

## 🔄 Transaction Flow

### Customer Journey

```
1. Registration
   └─ Create Account (Free)
   └─ Verify Phone Number
   └─ Setup Profile

2. Top-up Wallet
   └─ Select Amount
   └─ Choose Payment Method
   └─ Pay Fee (if applicable)
   └─ Credit Added to Wallet

3. Book Service
   └─ Select Service Type (Ride/Delivery/Shopping/Moving)
   └─ Enter Details (Pickup/Dropoff)
   └─ View Fare Estimate
   └─ Confirm Booking
   └─ **Instant Deduction from Wallet**

4. Service Delivery
   └─ Provider Accepts Job
   └─ Real-time Tracking
   └─ Service Completion
   └─ Rate Provider

5. Post-Service
   └─ View Receipt
   └─ Add Tip (Optional)
   └─ Request Refund (if needed)
```

### Provider Journey

```
1. Registration
   └─ Create Account
   └─ Submit Documents
   └─ Admin Verification
   └─ Approval (status: 'approved')

2. Go Online
   └─ Set Service Types
   └─ Set Availability
   └─ Enable Location Tracking

3. Receive Jobs
   └─ View Job Pool (Real-time)
   └─ Accept Job (Auto/Manual)
   └─ Navigate to Pickup

4. Complete Service
   └─ Pickup Customer/Item
   └─ In Progress
   └─ Upload Evidence (if required)
   └─ Complete Job
   └─ **Instant Credit to Wallet**

5. Earnings Management
   └─ View Earnings Dashboard
   └─ Receive Tips
   └─ Request Withdrawal
   └─ Admin Approval
   └─ Bank Transfer
```

### Admin Operations

```
1. Platform Management
   └─ Monitor All Transactions
   └─ Approve/Reject Providers
   └─ Handle Disputes
   └─ Manage Refunds

2. Financial Operations
   └─ Approve Withdrawals
   └─ Process Top-ups
   └─ Monitor Revenue
   └─ Generate Reports

3. System Configuration
   └─ Set Commission Rates
   └─ Configure Surge Pricing
   └─ Manage Promotions
   └─ System Settings
```

---

## 💳 Credit System (Wallet)

### Customer Wallet

```sql
-- Customer Wallet Schema
users (
  id UUID PRIMARY KEY,
  wallet_balance DECIMAL(10,2) DEFAULT 0 CHECK (wallet_balance >= 0),
  total_spent DECIMAL(10,2) DEFAULT 0,
  total_topup DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transaction Types
wallet_transactions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  type TEXT CHECK (type IN ('topup', 'deduct', 'refund')),
  amount DECIMAL(10,2) NOT NULL,
  balance_before DECIMAL(10,2) NOT NULL,
  balance_after DECIMAL(10,2) NOT NULL,
  reference_type TEXT, -- 'ride', 'delivery', 'topup_request'
  reference_id UUID,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Provider Wallet

```sql
-- Provider Wallet Schema
providers_v2 (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  wallet_balance DECIMAL(10,2) DEFAULT 0 CHECK (wallet_balance >= 0),
  total_earnings DECIMAL(10,2) DEFAULT 0,
  total_withdrawn DECIMAL(10,2) DEFAULT 0,
  pending_withdrawal DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Provider Transaction Types
provider_wallet_transactions (
  id UUID PRIMARY KEY,
  provider_id UUID REFERENCES providers_v2(id),
  type TEXT CHECK (type IN ('earning', 'tip', 'withdrawal', 'bonus', 'penalty')),
  amount DECIMAL(10,2) NOT NULL,
  balance_before DECIMAL(10,2) NOT NULL,
  balance_after DECIMAL(10,2) NOT NULL,
  reference_type TEXT, -- 'ride', 'delivery', 'withdrawal_request'
  reference_id UUID,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Platform Revenue Tracking

```sql
-- Platform Revenue Schema
platform_revenue (
  id UUID PRIMARY KEY,
  revenue_type TEXT CHECK (revenue_type IN (
    'commission',
    'topup_fee',
    'withdrawal_fee',
    'subscription',
    'surge_premium'
  )),
  amount DECIMAL(10,2) NOT NULL,
  source_type TEXT, -- 'ride', 'delivery', 'topup', 'withdrawal'
  source_id UUID,
  customer_id UUID REFERENCES users(id),
  provider_id UUID REFERENCES providers_v2(id),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🔒 Business Rules

### 1. **Pre-paid System Rules**

```typescript
// Customer must have sufficient balance
async function bookService(customerId: string, fare: number) {
  const wallet = await getCustomerWallet(customerId);

  if (wallet.balance < fare) {
    throw new Error("INSUFFICIENT_BALANCE");
  }

  // Instant deduction
  await deductWallet(customerId, fare, "ride_booking");

  return { success: true };
}
```

### 2. **Commission Calculation**

```typescript
// Calculate platform commission
function calculateCommission(
  serviceType: ServiceType,
  totalFare: number,
  surgeMultiplier: number = 1.0,
): Commission {
  const baseCommissionRate = COMMISSION_RATES[serviceType];
  const surgeFare = totalFare * surgeMultiplier;
  const commission = surgeFare * baseCommissionRate;
  const providerEarnings = surgeFare - commission;

  return {
    totalFare: surgeFare,
    commission,
    providerEarnings,
    commissionRate: baseCommissionRate,
    surgeMultiplier,
  };
}
```

### 3. **Withdrawal Rules**

```typescript
// Provider withdrawal validation
const WITHDRAWAL_RULES = {
  minimum_amount: 100, // Minimum 100 THB
  maximum_amount: 50000, // Maximum 50,000 THB per transaction
  daily_limit: 100000, // Maximum 100,000 THB per day
  pending_limit: 3, // Maximum 3 pending withdrawals
  approval_required: true, // Admin approval required
  processing_time: "1-3 days", // Processing time
} as const;

async function requestWithdrawal(
  providerId: string,
  amount: number,
): Promise<WithdrawalRequest> {
  // Validate amount
  if (amount < WITHDRAWAL_RULES.minimum_amount) {
    throw new Error("AMOUNT_TOO_LOW");
  }

  // Check balance
  const wallet = await getProviderWallet(providerId);
  if (wallet.balance < amount) {
    throw new Error("INSUFFICIENT_BALANCE");
  }

  // Check pending withdrawals
  const pendingCount = await getPendingWithdrawalsCount(providerId);
  if (pendingCount >= WITHDRAWAL_RULES.pending_limit) {
    throw new Error("TOO_MANY_PENDING_WITHDRAWALS");
  }

  // Create withdrawal request
  return await createWithdrawalRequest(providerId, amount);
}
```

### 4. **Refund Rules**

```typescript
// Refund policy
const REFUND_RULES = {
  cancellation_window: 5 * 60 * 1000, // 5 minutes
  full_refund_reasons: [
    "provider_no_show",
    "provider_cancelled",
    "service_not_delivered",
    "platform_error",
  ],
  partial_refund_reasons: ["service_quality_issue", "late_arrival"],
  no_refund_reasons: [
    "customer_cancelled_late",
    "customer_no_show",
    "service_completed",
  ],
} as const;

async function processRefund(
  orderId: string,
  reason: RefundReason,
): Promise<Refund> {
  const order = await getOrder(orderId);

  // Determine refund amount
  let refundAmount = 0;

  if (REFUND_RULES.full_refund_reasons.includes(reason)) {
    refundAmount = order.total_fare;
  } else if (REFUND_RULES.partial_refund_reasons.includes(reason)) {
    refundAmount = order.total_fare * 0.5; // 50% refund
  }

  if (refundAmount > 0) {
    // Credit back to customer wallet
    await creditWallet(order.customer_id, refundAmount, "refund");

    // Deduct from provider if already credited
    if (order.status === "completed") {
      await deductProviderWallet(order.provider_id, refundAmount, "refund");
    }
  }

  return { refundAmount, reason };
}
```

---

## 📊 Key Metrics (KPIs)

### Platform Metrics

```typescript
// Key Performance Indicators
const PLATFORM_KPIs = {
  // Revenue Metrics
  gross_revenue: "Total revenue before costs",
  net_revenue: "Revenue after provider payouts",
  commission_revenue: "Revenue from commissions",
  fee_revenue: "Revenue from fees",

  // Transaction Metrics
  total_transactions: "Total completed transactions",
  average_transaction_value: "Average fare per transaction",
  transaction_volume: "Total transaction value",

  // User Metrics
  total_customers: "Total registered customers",
  active_customers: "Customers with transactions in last 30 days",
  customer_retention_rate: "Percentage of returning customers",

  // Provider Metrics
  total_providers: "Total approved providers",
  active_providers: "Providers online in last 7 days",
  provider_utilization_rate: "Average hours worked per provider",

  // Operational Metrics
  average_wait_time: "Time from booking to provider acceptance",
  completion_rate: "Percentage of completed vs cancelled orders",
  customer_satisfaction: "Average customer rating",
  provider_satisfaction: "Average provider rating",
} as const;
```

### Financial Calculations

```typescript
// Monthly Revenue Calculation
async function calculateMonthlyRevenue(
  year: number,
  month: number,
): Promise<MonthlyRevenue> {
  const revenue = await db.query(
    `
    SELECT 
      SUM(CASE WHEN revenue_type = 'commission' THEN amount ELSE 0 END) as commission_revenue,
      SUM(CASE WHEN revenue_type = 'topup_fee' THEN amount ELSE 0 END) as topup_fee_revenue,
      SUM(CASE WHEN revenue_type = 'withdrawal_fee' THEN amount ELSE 0 END) as withdrawal_fee_revenue,
      SUM(CASE WHEN revenue_type = 'subscription' THEN amount ELSE 0 END) as subscription_revenue,
      SUM(amount) as total_revenue,
      COUNT(*) as transaction_count
    FROM platform_revenue
    WHERE EXTRACT(YEAR FROM created_at) = $1
      AND EXTRACT(MONTH FROM created_at) = $2
  `,
    [year, month],
  );

  return revenue.rows[0];
}
```

---

## 🎯 Business Goals

### Short-term (3-6 months)

- ✅ Achieve 10,000 registered customers
- ✅ Onboard 500 verified providers
- ✅ Process 50,000 transactions
- ✅ Reach 1M THB monthly revenue

### Mid-term (6-12 months)

- ✅ Expand to 3 major cities
- ✅ Launch subscription plans
- ✅ Achieve 100,000 customers
- ✅ Reach 10M THB monthly revenue

### Long-term (1-2 years)

- ✅ National coverage
- ✅ Multiple service types
- ✅ 1M+ customers
- ✅ 100M+ THB monthly revenue

---

## 🔐 Compliance & Security

### Financial Compliance

- ✅ PCI DSS compliance for payment processing
- ✅ Anti-money laundering (AML) checks
- ✅ Transaction monitoring
- ✅ Audit trail for all financial transactions

### Data Protection

- ✅ PDPA (Thailand) compliance
- ✅ PII encryption
- ✅ Secure payment gateway
- ✅ Regular security audits

### Tax Compliance

- ✅ VAT collection and reporting
- ✅ Withholding tax for providers
- ✅ Financial reporting
- ✅ Tax documentation

---

## 📝 Notes

### Critical Business Rules

1. **No Negative Balances**: Wallets cannot go below 0
2. **Instant Deduction**: Customer charged immediately on booking
3. **Instant Credit**: Provider credited immediately on completion
4. **Admin Approval**: All withdrawals require admin approval
5. **Atomic Transactions**: All wallet operations must be atomic
6. **Audit Trail**: All financial transactions must be logged

### Future Enhancements

- [ ] Dynamic surge pricing algorithm
- [ ] Loyalty program
- [ ] Referral system
- [ ] Corporate accounts
- [ ] API for third-party integrations
- [ ] White-label solution

---

**Last Updated**: 2026-01-19  
**Next Review**: 2026-02-19
