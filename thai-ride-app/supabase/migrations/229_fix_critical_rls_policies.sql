-- =====================================================
-- CRITICAL SECURITY FIX: Replace overly permissive RLS policies
-- This migration fixes the dangerous "FOR ALL USING (true)" policies
-- that allow any authenticated user to access any data
-- =====================================================

-- =====================================================
-- 1. USER WALLETS - CRITICAL FINANCIAL DATA
-- =====================================================
DROP POLICY IF EXISTS "Allow all user_wallets" ON public.user_wallets;
CREATE POLICY "Users can view own wallet" ON public.user_wallets
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "System can manage wallets" ON public.user_wallets
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- =====================================================
-- 2. WALLET TRANSACTIONS - CRITICAL FINANCIAL DATA
-- =====================================================
DROP POLICY IF EXISTS "Allow all wallet_transactions" ON public.wallet_transactions;
CREATE POLICY "Users can view own transactions" ON public.wallet_transactions
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "System can manage transactions" ON public.wallet_transactions
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- =====================================================
-- 3. TOPUP REQUESTS - FINANCIAL DATA
-- =====================================================
DROP POLICY IF EXISTS "Allow all topup_requests" ON public.topup_requests;
CREATE POLICY "Users can view own topup requests" ON public.topup_requests
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create topup requests" ON public.topup_requests
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can manage topup requests" ON public.topup_requests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- 4. CUSTOMER WITHDRAWALS - CRITICAL FINANCIAL DATA
-- =====================================================
DROP POLICY IF EXISTS "Allow all customer_withdrawals" ON public.customer_withdrawals;
CREATE POLICY "Users can view own withdrawals" ON public.customer_withdrawals
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create withdrawal requests" ON public.customer_withdrawals
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can manage withdrawals" ON public.customer_withdrawals
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- 5. RIDE REQUESTS - USER DATA
-- =====================================================
DROP POLICY IF EXISTS "Allow all ride_requests" ON public.ride_requests;
CREATE POLICY "Users can view own rides" ON public.ride_requests
  FOR SELECT USING (customer_id = auth.uid());
CREATE POLICY "Users can create rides" ON public.ride_requests
  FOR INSERT WITH CHECK (customer_id = auth.uid());
CREATE POLICY "Users can update own rides" ON public.ride_requests
  FOR UPDATE USING (customer_id = auth.uid());
CREATE POLICY "Providers can view assigned rides" ON public.ride_requests
  FOR SELECT USING (
    provider_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM public.service_providers sp
      WHERE sp.user_id = auth.uid() AND sp.id = ride_requests.provider_id
    )
  );

-- =====================================================
-- 6. SCHEDULED RIDES - USER DATA
-- =====================================================
DROP POLICY IF EXISTS "Allow all scheduled_rides" ON public.scheduled_rides;
CREATE POLICY "Users can manage own scheduled rides" ON public.scheduled_rides
  FOR ALL USING (customer_id = auth.uid()) WITH CHECK (customer_id = auth.uid());

-- =====================================================
-- 7. SAVED PLACES - PERSONAL DATA
-- =====================================================
DROP POLICY IF EXISTS "Allow all saved_places" ON public.saved_places;
CREATE POLICY "Users can manage own saved places" ON public.saved_places
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- =====================================================
-- 8. RECENT PLACES - PERSONAL DATA
-- =====================================================
DROP POLICY IF EXISTS "Allow all recent_places" ON public.recent_places;
CREATE POLICY "Users can manage own recent places" ON public.recent_places
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- =====================================================
-- 9. REFERRALS - FINANCIAL DATA
-- =====================================================
DROP POLICY IF EXISTS "Allow all referrals" ON public.referrals;
CREATE POLICY "Users can view own referrals" ON public.referrals
  FOR SELECT USING (referrer_id = auth.uid() OR referred_id = auth.uid());
CREATE POLICY "Users can create referrals" ON public.referrals
  FOR INSERT WITH CHECK (referrer_id = auth.uid());

-- =====================================================
-- 10. REFERRAL CODES - PERSONAL DATA
-- =====================================================
DROP POLICY IF EXISTS "Allow all referral_codes" ON public.referral_codes;
CREATE POLICY "Users can view own referral code" ON public.referral_codes
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "System can manage referral codes" ON public.referral_codes
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- =====================================================
-- 11. DELIVERY REQUESTS - USER DATA
-- =====================================================
DROP POLICY IF EXISTS "Allow all delivery_requests" ON public.delivery_requests;
CREATE POLICY "Users can view own deliveries" ON public.delivery_requests
  FOR SELECT USING (customer_id = auth.uid());
CREATE POLICY "Users can create deliveries" ON public.delivery_requests
  FOR INSERT WITH CHECK (customer_id = auth.uid());
CREATE POLICY "Users can update own deliveries" ON public.delivery_requests
  FOR UPDATE USING (customer_id = auth.uid());

-- =====================================================
-- 12. SHOPPING REQUESTS - USER DATA
-- =====================================================
DROP POLICY IF EXISTS "Allow all shopping_requests" ON public.shopping_requests;
CREATE POLICY "Users can view own shopping requests" ON public.shopping_requests
  FOR SELECT USING (customer_id = auth.uid());
CREATE POLICY "Users can create shopping requests" ON public.shopping_requests
  FOR INSERT WITH CHECK (customer_id = auth.uid());
CREATE POLICY "Users can update own shopping requests" ON public.shopping_requests
  FOR UPDATE USING (customer_id = auth.uid());

-- =====================================================
-- 13. PAYMENTS - FINANCIAL DATA
-- =====================================================
DROP POLICY IF EXISTS "Allow all payments" ON public.payments;
CREATE POLICY "Users can view own payments" ON public.payments
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "System can manage payments" ON public.payments
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- =====================================================
-- 14. PAYMENT METHODS - PERSONAL FINANCIAL DATA
-- =====================================================
DROP POLICY IF EXISTS "Allow all payment_methods" ON public.payment_methods;
CREATE POLICY "Users can manage own payment methods" ON public.payment_methods
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- =====================================================
-- AUDIT LOG
-- =====================================================
INSERT INTO public.audit_log (
  table_name,
  operation,
  old_data,
  new_data,
  user_id,
  timestamp
) VALUES (
  'rls_policies',
  'SECURITY_FIX',
  '{"policies": "overly_permissive"}',
  '{"policies": "user_scoped_secure"}',
  auth.uid(),
  NOW()
);

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON POLICY "Users can view own wallet" ON public.user_wallets IS 
'SECURITY: Users can only view their own wallet data';

COMMENT ON POLICY "Users can view own transactions" ON public.wallet_transactions IS 
'SECURITY: Users can only view their own transaction history';

COMMENT ON POLICY "Users can view own topup requests" ON public.topup_requests IS 
'SECURITY: Users can only view their own topup requests';