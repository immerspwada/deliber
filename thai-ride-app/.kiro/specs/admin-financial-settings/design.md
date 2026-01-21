# 💰 Admin Financial Settings - Technical Design

**Date**: 2026-01-19  
**Status**: 🚧 In Progress  
**Priority**: 🔥 CRITICAL

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  AdminFinancialSettingsView.vue                             │
│  ├─ CommissionSettingsCard.vue                              │
│  ├─ WithdrawalSettingsCard.vue                              │
│  ├─ TopupSettingsCard.vue                                   │
│  └─ SettingsAuditLog.vue                                    │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                    BUSINESS LOGIC LAYER                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  useFinancialSettings.ts                                    │
│  ├─ fetchSettings()                                         │
│  ├─ updateCommissionRates()                                 │
│  ├─ updateWithdrawalSettings()                              │
│  ├─ updateTopupSettings()                                   │
│  └─ fetchAuditLog()                                         │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                    DATA ACCESS LAYER                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  RPC Functions (Supabase)                                   │
│  ├─ get_financial_settings()                                │
│  ├─ update_financial_setting()                              │
│  ├─ get_settings_audit_log()                                │
│  └─ calculate_commission_impact()                           │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                    DATABASE LAYER                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Tables:                                                     │
│  ├─ financial_settings                                      │
│  ├─ financial_settings_audit                                │
│  └─ payment_receiving_accounts                              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Database Schema

### 1. financial_settings

```sql
CREATE TABLE financial_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category TEXT NOT NULL CHECK (category IN (
    'commission',
    'withdrawal',
    'topup',
    'surge',
    'subscription'
  )),
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(category, key)
);

-- Indexes
CREATE INDEX idx_financial_settings_category ON financial_settings(category);
CREATE INDEX idx_financial_settings_active ON financial_settings(is_active);

-- RLS Policies
ALTER TABLE financial_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_full_access" ON financial_settings
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_financial_settings_updated_at
  BEFORE UPDATE ON financial_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### 2. financial_settings_audit

```sql
CREATE TABLE financial_settings_audit (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_id UUID REFERENCES financial_settings(id),
  category TEXT NOT NULL,
  key TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB NOT NULL,
  change_reason TEXT,
  changed_by UUID REFERENCES users(id) NOT NULL,
  changed_by_email TEXT,
  changed_by_name TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_settings_audit_setting ON financial_settings_audit(setting_id);
CREATE INDEX idx_settings_audit_category ON financial_settings_audit(category);
CREATE INDEX idx_settings_audit_changed_by ON financial_settings_audit(changed_by);
CREATE INDEX idx_settings_audit_created ON financial_settings_audit(created_at DESC);

-- RLS Policy
ALTER TABLE financial_settings_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_read_audit" ON financial_settings_audit
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );
```

### 3. payment_receiving_accounts

```sql
CREATE TABLE payment_receiving_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_type TEXT NOT NULL CHECK (account_type IN (
    'promptpay',
    'bank_transfer'
  )),
  account_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  bank_code TEXT,
  bank_name TEXT,
  qr_code_url TEXT,
  display_name TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_payment_accounts_type ON payment_receiving_accounts(account_type);
CREATE INDEX idx_payment_accounts_active ON payment_receiving_accounts(is_active);
CREATE INDEX idx_payment_accounts_order ON payment_receiving_accounts(display_order);

-- RLS Policy
ALTER TABLE payment_receiving_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_full_access_payment_accounts" ON payment_receiving_accounts
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );
```

---

## 🔧 RPC Functions

### 1. get_financial_settings

```sql
CREATE OR REPLACE FUNCTION get_financial_settings(
  p_category TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  category TEXT,
  key TEXT,
  value JSONB,
  description TEXT,
  is_active BOOLEAN,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  -- Check admin role
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  RETURN QUERY
  SELECT
    fs.id,
    fs.category,
    fs.key,
    fs.value,
    fs.description,
    fs.is_active,
    fs.updated_at
  FROM financial_settings fs
  WHERE (p_category IS NULL OR fs.category = p_category)
  AND fs.is_active = true
  ORDER BY fs.category, fs.key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2. update_financial_setting

```sql
CREATE OR REPLACE FUNCTION update_financial_setting(
  p_category TEXT,
  p_key TEXT,
  p_value JSONB,
  p_reason TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  setting_id UUID
) AS $$
DECLARE
  v_admin_id UUID;
  v_admin_email TEXT;
  v_admin_name TEXT;
  v_setting_id UUID;
  v_old_value JSONB;
BEGIN
  -- Check admin role
  SELECT id, email, full_name
  INTO v_admin_id, v_admin_email, v_admin_name
  FROM users
  WHERE id = auth.uid()
  AND role = 'admin';

  IF v_admin_id IS NULL THEN
    RETURN QUERY SELECT false, 'Unauthorized: Admin access required', NULL::UUID;
    RETURN;
  END IF;

  -- Get old value
  SELECT id, value
  INTO v_setting_id, v_old_value
  FROM financial_settings
  WHERE category = p_category
  AND key = p_key;

  -- Insert or update
  INSERT INTO financial_settings (category, key, value, updated_by)
  VALUES (p_category, p_key, p_value, v_admin_id)
  ON CONFLICT (category, key)
  DO UPDATE SET
    value = p_value,
    updated_by = v_admin_id,
    updated_at = NOW()
  RETURNING id INTO v_setting_id;

  -- Create audit log
  INSERT INTO financial_settings_audit (
    setting_id,
    category,
    key,
    old_value,
    new_value,
    change_reason,
    changed_by,
    changed_by_email,
    changed_by_name
  ) VALUES (
    v_setting_id,
    p_category,
    p_key,
    v_old_value,
    p_value,
    p_reason,
    v_admin_id,
    v_admin_email,
    v_admin_name
  );

  RETURN QUERY SELECT true, 'Settings updated successfully', v_setting_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 3. get_settings_audit_log

```sql
CREATE OR REPLACE FUNCTION get_settings_audit_log(
  p_category TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  category TEXT,
  key TEXT,
  old_value JSONB,
  new_value JSONB,
  change_reason TEXT,
  changed_by_email TEXT,
  changed_by_name TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  -- Check admin role
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  RETURN QUERY
  SELECT
    fsa.id,
    fsa.category,
    fsa.key,
    fsa.old_value,
    fsa.new_value,
    fsa.change_reason,
    fsa.changed_by_email,
    fsa.changed_by_name,
    fsa.created_at
  FROM financial_settings_audit fsa
  WHERE (p_category IS NULL OR fsa.category = p_category)
  ORDER BY fsa.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 4. calculate_commission_impact

```sql
CREATE OR REPLACE FUNCTION calculate_commission_impact(
  p_service_type TEXT,
  p_new_rate DECIMAL
)
RETURNS TABLE (
  current_rate DECIMAL,
  new_rate DECIMAL,
  rate_change DECIMAL,
  estimated_monthly_impact DECIMAL,
  affected_providers INTEGER
) AS $$
DECLARE
  v_current_rate DECIMAL;
  v_monthly_revenue DECIMAL;
BEGIN
  -- Check admin role
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Get current rate
  SELECT (value->>p_service_type)::DECIMAL
  INTO v_current_rate
  FROM financial_settings
  WHERE category = 'commission'
  AND key = 'service_rates';

  -- Calculate monthly revenue (last 30 days)
  SELECT COALESCE(SUM(final_fare), 0)
  INTO v_monthly_revenue
  FROM ride_requests
  WHERE service_type = p_service_type
  AND status = 'completed'
  AND completed_at >= NOW() - INTERVAL '30 days';

  RETURN QUERY
  SELECT
    v_current_rate,
    p_new_rate,
    p_new_rate - v_current_rate AS rate_change,
    v_monthly_revenue * (p_new_rate - v_current_rate) AS estimated_monthly_impact,
    COUNT(DISTINCT provider_id)::INTEGER AS affected_providers
  FROM ride_requests
  WHERE service_type = p_service_type
  AND status = 'completed'
  AND completed_at >= NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 📦 Data Structures

### TypeScript Types

```typescript
// types/financial-settings.ts

export interface FinancialSetting {
  id: string;
  category: "commission" | "withdrawal" | "topup" | "surge" | "subscription";
  key: string;
  value: Record<string, any>;
  description: string | null;
  is_active: boolean;
  updated_at: string;
}

export interface CommissionRates {
  ride: number;
  delivery: number;
  shopping: number;
  moving: number;
  queue: number;
  laundry: number;
}

export interface SurgeMultipliers {
  low_demand: number;
  medium_demand: number;
  high_demand: number;
  peak_demand: number;
}

export interface SubscriptionDiscounts {
  basic: number;
  premium: number;
  pro: number;
}

export interface WithdrawalSettings {
  min_amount: number;
  max_amount: number;
  daily_limit: number;
  bank_transfer_fee: number;
  promptpay_fee: number;
  auto_approval_threshold: number;
  max_pending: number;
  processing_days: string;
  min_account_age_days: number;
  min_completed_trips: number;
  min_rating: number;
}

export interface TopupSettings {
  min_amount: number;
  max_amount: number;
  daily_limit: number;
  credit_card_fee: number;
  bank_transfer_fee: number;
  promptpay_fee: number;
  truemoney_fee: number;
  auto_approval_threshold: number;
  expiry_hours: number;
  require_slip_threshold: number;
}

export interface SettingsAuditLog {
  id: string;
  category: string;
  key: string;
  old_value: Record<string, any> | null;
  new_value: Record<string, any>;
  change_reason: string | null;
  changed_by_email: string;
  changed_by_name: string;
  created_at: string;
}

export interface CommissionImpact {
  current_rate: number;
  new_rate: number;
  rate_change: number;
  estimated_monthly_impact: number;
  affected_providers: number;
}

export interface PaymentReceivingAccount {
  id: string;
  account_type: "promptpay" | "bank_transfer";
  account_name: string;
  account_number: string;
  bank_code: string | null;
  bank_name: string | null;
  qr_code_url: string | null;
  display_name: string | null;
  description: string | null;
  is_active: boolean;
  display_order: number;
}
```

---

## 🎨 Component Structure

### AdminFinancialSettingsView.vue

```vue
<template>
  <div class="financial-settings-view">
    <!-- Header -->
    <div class="header">
      <h1>ตั้งค่าทางการเงิน</h1>
      <button @click="showAuditLog = true">ดูประวัติการเปลี่ยนแปลง</button>
    </div>

    <!-- Tabs -->
    <div class="tabs">
      <button
        :class="{ active: activeTab === 'commission' }"
        @click="activeTab = 'commission'"
      >
        คอมมิชชั่น
      </button>
      <button
        :class="{ active: activeTab === 'withdrawal' }"
        @click="activeTab = 'withdrawal'"
      >
        การถอนเงิน
      </button>
      <button
        :class="{ active: activeTab === 'topup' }"
        @click="activeTab = 'topup'"
      >
        การเติมเงิน
      </button>
    </div>

    <!-- Content -->
    <div class="content">
      <CommissionSettingsCard v-if="activeTab === 'commission'" />
      <WithdrawalSettingsCard v-else-if="activeTab === 'withdrawal'" />
      <TopupSettingsCard v-else-if="activeTab === 'topup'" />
    </div>

    <!-- Audit Log Modal -->
    <SettingsAuditLogModal v-model="showAuditLog" />
  </div>
</template>
```

### CommissionSettingsCard.vue

```vue
<template>
  <div class="commission-settings-card">
    <!-- Service Rates -->
    <section>
      <h2>อัตราคอมมิชชั่นตามประเภทบริการ</h2>
      <div class="rate-grid">
        <div v-for="service in services" :key="service.key" class="rate-item">
          <label>{{ service.label }}</label>
          <div class="input-group">
            <input
              v-model.number="rates[service.key]"
              type="number"
              min="0"
              max="50"
              step="0.1"
              @input="calculateImpact(service.key)"
            />
            <span>%</span>
          </div>
          <div v-if="impacts[service.key]" class="impact">
            <span
              :class="
                impacts[service.key].rate_change > 0 ? 'positive' : 'negative'
              "
            >
              {{ formatImpact(impacts[service.key]) }}
            </span>
          </div>
        </div>
      </div>
    </section>

    <!-- Surge Pricing -->
    <section>
      <h2>ตัวคูณราคาตามความต้องการ</h2>
      <div class="surge-grid">
        <div v-for="level in surgeLevels" :key="level.key" class="surge-item">
          <label>{{ level.label }}</label>
          <input
            v-model.number="surgeMultipliers[level.key]"
            type="number"
            min="1.0"
            max="3.0"
            step="0.1"
          />
          <span>x</span>
        </div>
      </div>
    </section>

    <!-- Actions -->
    <div class="actions">
      <button @click="reset" class="secondary">รีเซ็ต</button>
      <button @click="save" class="primary" :disabled="!hasChanges">
        บันทึกการเปลี่ยนแปลง
      </button>
    </div>
  </div>
</template>
```

---

## 🔄 State Management

### useFinancialSettings.ts

```typescript
import { ref, computed } from "vue";
import { supabase } from "@/lib/supabase";
import type {
  FinancialSetting,
  CommissionRates,
  WithdrawalSettings,
  TopupSettings,
  SettingsAuditLog,
} from "@/types/financial-settings";

export function useFinancialSettings() {
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Settings state
  const commissionRates = ref<CommissionRates | null>(null);
  const withdrawalSettings = ref<WithdrawalSettings | null>(null);
  const topupSettings = ref<TopupSettings | null>(null);

  // Audit log
  const auditLog = ref<SettingsAuditLog[]>([]);

  // Fetch all settings
  async function fetchSettings(category?: string) {
    loading.value = true;
    error.value = null;

    try {
      const { data, error: rpcError } = await supabase.rpc(
        "get_financial_settings",
        {
          p_category: category || null,
        },
      );

      if (rpcError) throw rpcError;

      // Parse settings by category
      data?.forEach((setting: FinancialSetting) => {
        if (
          setting.category === "commission" &&
          setting.key === "service_rates"
        ) {
          commissionRates.value = setting.value as CommissionRates;
        } else if (
          setting.category === "withdrawal" &&
          setting.key === "limits"
        ) {
          withdrawalSettings.value = setting.value as WithdrawalSettings;
        } else if (setting.category === "topup" && setting.key === "config") {
          topupSettings.value = setting.value as TopupSettings;
        }
      });

      return data;
    } catch (e) {
      error.value = (e as Error).message;
      return null;
    } finally {
      loading.value = false;
    }
  }

  // Update setting
  async function updateSetting(
    category: string,
    key: string,
    value: Record<string, any>,
    reason?: string,
  ) {
    loading.value = true;
    error.value = null;

    try {
      const { data, error: rpcError } = await supabase.rpc(
        "update_financial_setting",
        {
          p_category: category,
          p_key: key,
          p_value: value,
          p_reason: reason || null,
        },
      );

      if (rpcError) throw rpcError;

      if (data && data[0]?.success) {
        await fetchSettings(category);
        return { success: true, message: data[0].message };
      }

      return { success: false, message: "Failed to update setting" };
    } catch (e) {
      error.value = (e as Error).message;
      return { success: false, message: error.value };
    } finally {
      loading.value = false;
    }
  }

  // Fetch audit log
  async function fetchAuditLog(category?: string, limit = 50) {
    try {
      const { data, error: rpcError } = await supabase.rpc(
        "get_settings_audit_log",
        {
          p_category: category || null,
          p_limit: limit,
          p_offset: 0,
        },
      );

      if (rpcError) throw rpcError;

      auditLog.value = data || [];
      return data;
    } catch (e) {
      console.error("Error fetching audit log:", e);
      return [];
    }
  }

  return {
    loading,
    error,
    commissionRates,
    withdrawalSettings,
    topupSettings,
    auditLog,
    fetchSettings,
    updateSetting,
    fetchAuditLog,
  };
}
```

---

## 🎯 Validation Rules

### Commission Rates

- Min: 0%
- Max: 50%
- Step: 0.1%
- Warning if > 30%

### Withdrawal Settings

- min_amount: 50-1000 THB
- max_amount: 1000-100000 THB
- daily_limit: max_amount to 1000000 THB
- fees: 0-100 THB
- auto_approval_threshold: 0-50000 THB

### Top-up Settings

- min_amount: 10-500 THB
- max_amount: 500-100000 THB
- fees: 0-10%
- expiry_hours: 1-72 hours

---

**Next**: Implementation (tasks.md)
