<!--
  Admin V2 Login View
  ==================
  Login page for Admin Dashboard V2
  Production Mode - Real Supabase Auth with Quick Login
-->

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useAdminAuthStore } from "../stores/adminAuth.store";
import { supabase } from "../../lib/supabase";

const router = useRouter();
const authStore = useAdminAuthStore();

const email = ref("");
const password = ref("");
const showPassword = ref(false);
const isCreatingAccount = ref(false);
const createAccountMessage = ref("");
const createAccountError = ref("");

// Quick login accounts (for development/testing)
const quickAccounts = [
  {
    label: "Super Admin",
    email: "superadmin@gobear.app",
    password: "Admin@123456",
  },
  { label: "Admin", email: "admin@gobear.app", password: "Admin@123456" },
];

onMounted(async () => {
  // Clear old demo session if exists
  const oldSession = localStorage.getItem("admin_v2_session");
  if (oldSession) {
    try {
      const parsed = JSON.parse(oldSession);
      if (parsed.isDemoMode) {
        localStorage.removeItem("admin_v2_session");
        console.log("[Admin Login] Cleared old demo session");
      }
    } catch {
      // ignore
    }
  }

  // Check if already logged in
  const hasSession = await authStore.initialize();
  if (hasSession) {
    router.replace("/admin/dashboard");
  }
});

const handleLogin = async () => {
  const success = await authStore.login(email.value, password.value);
  if (success) {
    router.push("/admin/dashboard");
  }
};

const quickLogin = (account: { email: string; password: string }) => {
  email.value = account.email;
  password.value = account.password;
};

// Create new admin account (first time setup)
const createAdminAccount = async () => {
  if (!email.value || !password.value) {
    createAccountError.value = "กรุณากรอกอีเมลและรหัสผ่าน";
    return;
  }

  if (password.value.length < 6) {
    createAccountError.value = "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร";
    return;
  }

  isCreatingAccount.value = true;
  createAccountError.value = "";
  createAccountMessage.value = "";

  try {
    console.log("[Admin] Creating new admin account:", email.value);

    // Step 1: Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.value,
      password: password.value,
      options: {
        data: {
          role: "super_admin",
          first_name: "Super",
          last_name: "Admin",
        },
      },
    });

    if (authError) {
      console.error("[Admin] Auth signup error:", authError);
      createAccountError.value = authError.message;
      return;
    }

    if (!authData.user) {
      createAccountError.value = "ไม่สามารถสร้างบัญชีได้";
      return;
    }

    console.log("[Admin] Auth user created:", authData.user.id);

    // Step 2: Create/update user record with admin role
    const { error: userError } = await supabase.from("users").upsert(
      {
        id: authData.user.id,
        email: email.value,
        first_name: "Super",
        last_name: "Admin",
        role: "super_admin",
        verification_status: "verified",
      },
      { onConflict: "id" }
    );

    if (userError) {
      console.error("[Admin] User record error:", userError);
      // Try to update existing record
      const { error: updateError } = await supabase
        .from("users")
        .update({ role: "super_admin" })
        .eq("id", authData.user.id);

      if (updateError) {
        console.error("[Admin] Update error:", updateError);
      }
    }

    createAccountMessage.value =
      "สร้างบัญชีสำเร็จ! กรุณาตรวจสอบอีเมลเพื่อยืนยัน หรือลอง Login ได้เลย";

    // Auto-fill credentials
    email.value = email.value;
    password.value = password.value;
  } catch (e: any) {
    console.error("[Admin] Create account error:", e);
    createAccountError.value = e.message || "เกิดข้อผิดพลาด";
  } finally {
    isCreatingAccount.value = false;
  }
};
</script>

<template>
  <div class="login-page">
    <div class="login-container">
      <!-- Logo -->
      <div class="logo">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
      </div>

      <!-- Title -->
      <h1 class="title">GOBEAR Admin</h1>
      <p class="subtitle">ระบบจัดการสำหรับผู้ดูแล</p>

      <!-- Quick Login Buttons -->
      <div class="quick-login-section">
        <p class="quick-login-label">เข้าสู่ระบบด่วน</p>
        <div class="quick-login-buttons">
          <button
            v-for="account in quickAccounts"
            :key="account.email"
            type="button"
            class="quick-login-btn"
            @click="quickLogin(account)"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            {{ account.label }}
          </button>
        </div>
      </div>

      <!-- Form -->
      <form class="form" @submit.prevent="handleLogin">
        <!-- Error Message -->
        <div v-if="authStore.error" class="error-message">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {{ authStore.error }}
        </div>

        <!-- Lockout Warning -->
        <div v-if="authStore.isLocked" class="lockout-warning">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
          <span>บัญชีถูกล็อกชั่วคราว กรุณารอ
            {{ Math.ceil((authStore.lockoutEndTime - Date.now()) / 1000) }}
            วินาที</span>
        </div>

        <!-- Email -->
        <div class="form-group">
          <label>อีเมล</label>
          <input
            v-model="email"
            type="email"
            placeholder="admin@example.com"
            required
            :disabled="authStore.isLoading"
            autocomplete="email"
          />
        </div>

        <!-- Password -->
        <div class="form-group">
          <label>รหัสผ่าน</label>
          <div class="password-input">
            <input
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              placeholder="••••••••"
              required
              :disabled="authStore.isLoading"
              autocomplete="current-password"
            />
            <button
              type="button"
              class="toggle-password"
              @click="showPassword = !showPassword"
            >
              <svg
                v-if="showPassword"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"
                />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
              <svg
                v-else
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Submit Button -->
        <button
          type="submit"
          class="submit-btn"
          :disabled="authStore.isLoading || authStore.isLocked"
        >
          <svg
            v-if="authStore.isLoading"
            class="spinner-icon"
            width="20"
            height="20"
            viewBox="0 0 24 24"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="3"
              fill="none"
              stroke-dasharray="32"
              stroke-linecap="round"
            />
          </svg>
          <span v-if="authStore.isLoading">กำลังเข้าสู่ระบบ...</span>
          <span v-else>เข้าสู่ระบบ</span>
        </button>

        <!-- Create Account Button -->
        <button
          type="button"
          class="create-btn"
          :disabled="isCreatingAccount"
          @click="createAdminAccount"
        >
          <svg
            v-if="isCreatingAccount"
            class="spinner-icon"
            width="20"
            height="20"
            viewBox="0 0 24 24"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="3"
              fill="none"
              stroke-dasharray="32"
              stroke-linecap="round"
            />
          </svg>
          <svg
            v-else
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
            <circle cx="8.5" cy="7" r="4" />
            <line x1="20" y1="8" x2="20" y2="14" />
            <line x1="23" y1="11" x2="17" y2="11" />
          </svg>
          <span v-if="isCreatingAccount">กำลังสร้างบัญชี...</span>
          <span v-else>สร้างบัญชี Admin ใหม่</span>
        </button>

        <!-- Create Account Messages -->
        <div v-if="createAccountMessage" class="success-message">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          {{ createAccountMessage }}
        </div>

        <div v-if="createAccountError" class="error-message">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {{ createAccountError }}
        </div>
      </form>

      <!-- Footer -->
      <div class="footer">
        <p>ใช้บัญชี Admin ที่ลงทะเบียนในระบบ</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);
  padding: 20px;
}

.login-container {
  width: 100%;
  max-width: 400px;
  background: #ffffff;
  border-radius: 16px;
  padding: 40px 32px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
}

.logo {
  display: flex;
  justify-content: center;
  margin-bottom: 16px;
  color: #00a86b;
}

.title {
  text-align: center;
  font-size: 24px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0 0 8px 0;
}

.subtitle {
  text-align: center;
  font-size: 14px;
  color: #666666;
  margin: 0 0 24px 0;
}

/* Quick Login Section */
.quick-login-section {
  margin-bottom: 24px;
  padding: 16px;
  background: #e8f5ef;
  border-radius: 12px;
}

.quick-login-label {
  font-size: 12px;
  color: #666666;
  margin: 0 0 12px 0;
  text-align: center;
}

.quick-login-buttons {
  display: flex;
  gap: 8px;
}

.quick-login-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 12px;
  background: #ffffff;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #1a1a1a;
  cursor: pointer;
  transition: all 0.2s ease;
}

.quick-login-btn:hover {
  background: #00a86b;
  border-color: #00a86b;
  color: #ffffff;
}

.quick-login-btn svg {
  flex-shrink: 0;
}

/* Form */
.form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 14px;
  font-weight: 500;
  color: #1a1a1a;
}

.form-group input {
  width: 100%;
  padding: 14px 16px;
  border: 2px solid #e8e8e8;
  border-radius: 12px;
  font-size: 15px;
  color: #1a1a1a;
  background: #ffffff;
  transition: border-color 0.2s ease;
  box-sizing: border-box;
}

.form-group input:focus {
  outline: none;
  border-color: #00a86b;
}

.form-group input::placeholder {
  color: #999999;
}

.form-group input:disabled {
  background: #f5f5f5;
  cursor: not-allowed;
}

/* Password Input */
.password-input {
  position: relative;
}

.password-input input {
  padding-right: 48px;
}

.toggle-password {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: #666666;
  display: flex;
  align-items: center;
  justify-content: center;
}

.toggle-password:hover {
  color: #00a86b;
}

/* Error Message */
.error-message {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 10px;
  color: #dc2626;
  font-size: 14px;
}

.error-message svg {
  flex-shrink: 0;
}

/* Lockout Warning */
.lockout-warning {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  background: #fef3c7;
  border: 1px solid #fcd34d;
  border-radius: 10px;
  color: #92400e;
  font-size: 14px;
}

.lockout-warning svg {
  flex-shrink: 0;
}

/* Submit Button */
.submit-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 16px 24px;
  background: #00a86b;
  border: none;
  border-radius: 14px;
  font-size: 16px;
  font-weight: 600;
  color: #ffffff;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(0, 168, 107, 0.3);
  margin-top: 8px;
}

.submit-btn:hover:not(:disabled) {
  background: #008f5b;
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(0, 168, 107, 0.4);
}

.submit-btn:active:not(:disabled) {
  transform: translateY(0);
}

.submit-btn:disabled {
  background: #9ca3af;
  cursor: not-allowed;
  box-shadow: none;
}

/* Create Account Button */
.create-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 14px 24px;
  background: transparent;
  border: 2px solid #e8e8e8;
  border-radius: 14px;
  font-size: 14px;
  font-weight: 500;
  color: #666666;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-top: 8px;
}

.create-btn:hover:not(:disabled) {
  border-color: #00a86b;
  color: #00a86b;
  background: #e8f5ef;
}

.create-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Success Message */
.success-message {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #d1fae5;
  border: 1px solid #6ee7b7;
  border-radius: 10px;
  color: #065f46;
  font-size: 14px;
  margin-top: 12px;
}

.success-message svg {
  flex-shrink: 0;
  color: #059669;
}

/* Spinner */
.spinner-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* Footer */
.footer {
  margin-top: 24px;
  text-align: center;
}

.footer p {
  font-size: 13px;
  color: #999999;
  margin: 0;
}

/* Responsive */
@media (max-width: 480px) {
  .login-container {
    padding: 32px 24px;
  }

  .quick-login-buttons {
    flex-direction: column;
  }

  .quick-login-btn {
    width: 100%;
  }
}
</style>
