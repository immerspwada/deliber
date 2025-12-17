-- =====================================================
-- FIX ALL RLS POLICIES FOR DEVELOPMENT/DEMO MODE
-- This migration makes all customer-facing tables permissive
-- to work without requiring auth.uid() (for demo mode)
-- 
-- APPLIED: 2025-12-17
-- =====================================================

-- =====================================================
-- 1. SCHEDULED RIDES (F15)
-- =====================================================
DROP POLICY IF EXISTS "Users can manage own scheduled rides" ON public.scheduled_rides;
DROP POLICY IF EXISTS "Users can view own scheduled rides" ON public.scheduled_rides;
DROP POLICY IF EXISTS "Users can create scheduled rides" ON public.scheduled_rides;
DROP POLICY IF EXISTS "Users can update own scheduled rides" ON public.scheduled_rides;
DROP POLICY IF EXISTS "Users can delete own scheduled rides" ON public.scheduled_rides;
CREATE POLICY "Allow all scheduled_rides" ON public.scheduled_rides FOR ALL USING (true) WITH CHECK (true);

-- Add missing columns
ALTER TABLE scheduled_rides ADD COLUMN IF NOT EXISTS notes TEXT;

-- =====================================================
-- 2. USER WALLETS & TRANSACTIONS (F05)
-- =====================================================
DROP POLICY IF EXISTS "Users can view own wallet" ON public.user_wallets;
DROP POLICY IF EXISTS "Users can manage own wallet" ON public.user_wallets;
CREATE POLICY "Allow all user_wallets" ON public.user_wallets FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view own transactions" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Users can manage own transactions" ON public.wallet_transactions;
CREATE POLICY "Allow all wallet_transactions" ON public.wallet_transactions FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- 3. REFERRALS (F06)
-- =====================================================
DROP POLICY IF EXISTS "Users can view own referral code" ON public.referral_codes;
DROP POLICY IF EXISTS "Users can manage own referral code" ON public.referral_codes;
CREATE POLICY "Allow all referral_codes" ON public.referral_codes FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view own referrals" ON public.referrals;
DROP POLICY IF EXISTS "Users can manage own referrals" ON public.referrals;
CREATE POLICY "Allow all referrals" ON public.referrals FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- 4. SUBSCRIPTIONS (F21)
-- =====================================================
DROP POLICY IF EXISTS "Users can view subscription plans" ON public.subscription_plans;
CREATE POLICY "Allow all subscription_plans" ON public.subscription_plans FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view own subscription" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can manage own subscription" ON public.user_subscriptions;
CREATE POLICY "Allow all user_subscriptions" ON public.user_subscriptions FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- 5. INSURANCE (F20)
-- =====================================================
DROP POLICY IF EXISTS "Users can view insurance plans" ON public.insurance_plans;
CREATE POLICY "Allow all insurance_plans" ON public.insurance_plans FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view own insurance" ON public.user_insurance;
DROP POLICY IF EXISTS "Users can manage own insurance" ON public.user_insurance;
CREATE POLICY "Allow all user_insurance" ON public.user_insurance FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view own claims" ON public.insurance_claims;
DROP POLICY IF EXISTS "Users can manage own claims" ON public.insurance_claims;
CREATE POLICY "Allow all insurance_claims" ON public.insurance_claims FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- 6. FAVORITE/BLOCKED DRIVERS (F18)
-- =====================================================
DROP POLICY IF EXISTS "Users can manage favorite drivers" ON public.favorite_drivers;
CREATE POLICY "Allow all favorite_drivers" ON public.favorite_drivers FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can manage blocked drivers" ON public.blocked_drivers;
CREATE POLICY "Allow all blocked_drivers" ON public.blocked_drivers FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- 7. SAVED PLACES (F09)
-- =====================================================
DROP POLICY IF EXISTS "Users can manage own saved places" ON public.saved_places;
CREATE POLICY "Allow all saved_places" ON public.saved_places FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can manage own recent places" ON public.recent_places;
CREATE POLICY "Allow all recent_places" ON public.recent_places FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- 8. PROMO CODES (F10)
-- =====================================================
DROP POLICY IF EXISTS "Users can view promo codes" ON public.promo_codes;
CREATE POLICY "Allow all promo_codes" ON public.promo_codes FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view own promo usage" ON public.user_promo_usage;
DROP POLICY IF EXISTS "Users can use promos" ON public.user_promo_usage;
CREATE POLICY "Allow all user_promo_usage" ON public.user_promo_usage FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view own favorites" ON public.favorite_promos;
DROP POLICY IF EXISTS "Users can add favorites" ON public.favorite_promos;
DROP POLICY IF EXISTS "Users can remove favorites" ON public.favorite_promos;
DROP POLICY IF EXISTS "Users can remove favorite promos" ON public.favorite_promos;
DROP POLICY IF EXISTS "Users can view own favorite promos" ON public.favorite_promos;
DROP POLICY IF EXISTS "Users can add favorite promos" ON public.favorite_promos;
CREATE POLICY "Allow all favorite_promos" ON public.favorite_promos FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- 9. RIDE REQUESTS (F02)
-- =====================================================
DROP POLICY IF EXISTS "Users can view own ride requests" ON public.ride_requests;
DROP POLICY IF EXISTS "Users can create ride requests" ON public.ride_requests;
DROP POLICY IF EXISTS "Providers can view assigned rides" ON public.ride_requests;
DROP POLICY IF EXISTS "Users can view own rides" ON public.ride_requests;
DROP POLICY IF EXISTS "Users can create rides" ON public.ride_requests;
DROP POLICY IF EXISTS "Users can update own rides" ON public.ride_requests;
CREATE POLICY "Allow all ride_requests" ON public.ride_requests FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- 10. DELIVERY REQUESTS (F03)
-- =====================================================
DROP POLICY IF EXISTS "Users can view own delivery requests" ON public.delivery_requests;
DROP POLICY IF EXISTS "Users can create delivery requests" ON public.delivery_requests;
CREATE POLICY "Allow all delivery_requests" ON public.delivery_requests FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- 11. SHOPPING REQUESTS (F04)
-- =====================================================
DROP POLICY IF EXISTS "Users can view own shopping requests" ON public.shopping_requests;
DROP POLICY IF EXISTS "Users can create shopping requests" ON public.shopping_requests;
CREATE POLICY "Allow all shopping_requests" ON public.shopping_requests FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- 12. PAYMENTS (F08)
-- =====================================================
DROP POLICY IF EXISTS "Users can view own payments" ON public.payments;
CREATE POLICY "Allow all payments" ON public.payments FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can manage payment methods" ON public.payment_methods;
CREATE POLICY "Allow all payment_methods" ON public.payment_methods FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- 13. RATINGS (F11, F26)
-- =====================================================
DROP POLICY IF EXISTS "Users can manage own ratings" ON public.ride_ratings;
CREATE POLICY "Allow all ride_ratings" ON public.ride_ratings FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- 14. NOTIFICATIONS (F07)
-- =====================================================
DROP POLICY IF EXISTS "Users can manage own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can read own notifications" ON public.notifications;
CREATE POLICY "Allow all notifications" ON public.notifications FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can manage own notifications" ON public.user_notifications;
CREATE POLICY "Allow all user_notifications" ON public.user_notifications FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users can insert own subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users can update own subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users can delete own subscriptions" ON public.push_subscriptions;
CREATE POLICY "Allow all push_subscriptions" ON public.push_subscriptions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admin can update push queue" ON public.push_notification_queue;
DROP POLICY IF EXISTS "Users can view own push queue" ON public.push_notification_queue;
DROP POLICY IF EXISTS "System can insert push queue" ON public.push_notification_queue;
DROP POLICY IF EXISTS "Admin can view all push queue" ON public.push_notification_queue;
CREATE POLICY "Allow all push_notification_queue" ON public.push_notification_queue FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- 15. SAFETY (F13)
-- =====================================================
DROP POLICY IF EXISTS "Users can manage own emergency contacts" ON public.emergency_contacts;
CREATE POLICY "Allow all emergency_contacts" ON public.emergency_contacts FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can create trip shares" ON public.trip_shares;
CREATE POLICY "Allow all trip_shares" ON public.trip_shares FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- 16. CHAT (F12)
-- =====================================================
DROP POLICY IF EXISTS "Users can view own chat sessions" ON public.chat_sessions;
CREATE POLICY "Allow all chat_sessions" ON public.chat_sessions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view own chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can send chat messages" ON public.chat_messages;
CREATE POLICY "Allow all chat_messages" ON public.chat_messages FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- 17. SUPPORT (F24)
-- =====================================================
DROP POLICY IF EXISTS "Users can manage own support tickets" ON public.support_tickets;
CREATE POLICY "Allow all support_tickets" ON public.support_tickets FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can manage own complaints" ON public.complaints;
CREATE POLICY "Allow all complaints" ON public.complaints FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- 18. USERS & PROVIDERS
-- =====================================================
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Allow all users" ON public.users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Providers can view own profile" ON public.service_providers;
DROP POLICY IF EXISTS "Providers can update own profile" ON public.service_providers;
DROP POLICY IF EXISTS "Users can view online providers" ON public.service_providers;
CREATE POLICY "Allow all service_providers" ON public.service_providers FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- 19. STATUS AUDIT LOG (F30)
-- =====================================================
DROP POLICY IF EXISTS "Users can view own audit logs" ON public.status_audit_log;
DROP POLICY IF EXISTS "Admin can view all audit logs" ON public.status_audit_log;
CREATE POLICY "Allow all status_audit_log" ON public.status_audit_log FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- 20. SCHEDULED NOTIFICATIONS
-- =====================================================
DROP POLICY IF EXISTS "Admin can manage scheduled notifications" ON public.scheduled_notifications;
CREATE POLICY "Allow all scheduled_notifications" ON public.scheduled_notifications FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;
