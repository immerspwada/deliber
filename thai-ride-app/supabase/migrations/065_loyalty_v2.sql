-- Migration: 065_loyalty_v2.sql
-- Feature: F156 - Enhanced Customer Loyalty Program
-- Description: Gamification, challenges, streaks, and tier benefits

-- =====================================================
-- 1. Loyalty Challenges
-- =====================================================
CREATE TABLE IF NOT EXISTS loyalty_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_th TEXT NOT NULL,
  description TEXT,
  description_th TEXT,
  challenge_type TEXT NOT NULL CHECK (challenge_type IN ('daily', 'weekly', 'monthly', 'special', 'streak')),
  
  -- Requirements
  target_action TEXT NOT NULL, -- 'rides', 'deliveries', 'spending', 'referrals', 'ratings'
  target_count INTEGER NOT NULL,
  target_amount NUMERIC(10,2), -- For spending challenges
  
  -- Rewards
  points_reward INTEGER NOT NULL,
  bonus_multiplier NUMERIC(3,2) DEFAULT 1.0,
  badge_id UUID,
  
  -- Validity
  start_date DATE,
  end_date DATE,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. User Challenge Progress
-- =====================================================
CREATE TABLE IF NOT EXISTS user_challenge_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES loyalty_challenges(id) ON DELETE CASCADE,
  
  current_count INTEGER DEFAULT 0,
  current_amount NUMERIC(10,2) DEFAULT 0,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  points_awarded INTEGER DEFAULT 0,
  
  started_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  
  UNIQUE(user_id, challenge_id)
);

CREATE INDEX IF NOT EXISTS idx_challenge_progress_user ON user_challenge_progress(user_id);

-- =====================================================
-- 3. User Streaks
-- =====================================================
CREATE TABLE IF NOT EXISTS user_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  streak_type TEXT NOT NULL CHECK (streak_type IN ('daily_ride', 'weekly_active', 'rating_given', 'referral')),
  
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date DATE,
  
  -- Rewards
  streak_bonus_points INTEGER DEFAULT 0,
  next_milestone INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, streak_type)
);

-- =====================================================
-- 4. Loyalty Badges
-- =====================================================
CREATE TABLE IF NOT EXISTS loyalty_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_th TEXT NOT NULL,
  description TEXT,
  description_th TEXT,
  icon_url TEXT,
  badge_type TEXT CHECK (badge_type IN ('achievement', 'tier', 'special', 'seasonal')),
  
  -- Requirements
  requirement_type TEXT, -- 'rides', 'points', 'streak', 'challenge', 'tier'
  requirement_value INTEGER,
  
  -- Rewards
  points_bonus INTEGER DEFAULT 0,
  
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default badges
INSERT INTO loyalty_badges (name, name_th, badge_type, requirement_type, requirement_value, sort_order) VALUES
('First Ride', 'เที่ยวแรก', 'achievement', 'rides', 1, 1),
('Regular Rider', 'นักเดินทาง', 'achievement', 'rides', 10, 2),
('Frequent Flyer', 'นักเดินทางบ่อย', 'achievement', 'rides', 50, 3),
('Road Warrior', 'นักรบถนน', 'achievement', 'rides', 100, 4),
('Legend', 'ตำนาน', 'achievement', 'rides', 500, 5),
('Week Streak', 'ต่อเนื่อง 7 วัน', 'achievement', 'streak', 7, 10),
('Month Streak', 'ต่อเนื่อง 30 วัน', 'achievement', 'streak', 30, 11),
('Reviewer', 'นักรีวิว', 'achievement', 'ratings', 10, 20),
('Influencer', 'อินฟลูเอนเซอร์', 'achievement', 'referrals', 5, 30)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 5. User Badges
-- =====================================================
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES loyalty_badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  is_displayed BOOLEAN DEFAULT FALSE,
  UNIQUE(user_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id);

-- =====================================================
-- 6. Tier Benefits
-- =====================================================
CREATE TABLE IF NOT EXISTS tier_benefits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_id UUID NOT NULL REFERENCES loyalty_tiers(id) ON DELETE CASCADE,
  benefit_type TEXT NOT NULL CHECK (benefit_type IN ('discount', 'points_multiplier', 'priority_support', 'free_cancellation', 'exclusive_promo', 'cashback')),
  benefit_name TEXT NOT NULL,
  benefit_name_th TEXT NOT NULL,
  benefit_value NUMERIC(10,2),
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0
);

-- =====================================================
-- 7. Enable RLS
-- =====================================================
ALTER TABLE loyalty_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_challenge_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE tier_benefits ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone read active challenges" ON loyalty_challenges
  FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "Users manage own challenge_progress" ON user_challenge_progress
  FOR ALL TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users manage own streaks" ON user_streaks
  FOR ALL TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Anyone read badges" ON loyalty_badges
  FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "Users read own badges" ON user_badges
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Anyone read tier_benefits" ON tier_benefits
  FOR SELECT TO authenticated USING (is_active = true);

-- =====================================================
-- 8. Functions
-- =====================================================

-- Get available challenges for user
CREATE OR REPLACE FUNCTION get_available_challenges(p_user_id UUID)
RETURNS TABLE (
  challenge_id UUID,
  name TEXT,
  name_th TEXT,
  description_th TEXT,
  challenge_type TEXT,
  target_action TEXT,
  target_count INTEGER,
  points_reward INTEGER,
  current_count INTEGER,
  is_completed BOOLEAN,
  progress_pct INTEGER,
  expires_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    lc.id as challenge_id,
    lc.name,
    lc.name_th,
    lc.description_th,
    lc.challenge_type,
    lc.target_action,
    lc.target_count,
    lc.points_reward,
    COALESCE(ucp.current_count, 0) as current_count,
    COALESCE(ucp.is_completed, false) as is_completed,
    CASE WHEN lc.target_count > 0 
      THEN LEAST(100, (COALESCE(ucp.current_count, 0) * 100 / lc.target_count))
      ELSE 0 
    END as progress_pct,
    ucp.expires_at
  FROM loyalty_challenges lc
  LEFT JOIN user_challenge_progress ucp ON lc.id = ucp.challenge_id AND ucp.user_id = p_user_id
  WHERE lc.is_active = true
    AND (lc.start_date IS NULL OR lc.start_date <= CURRENT_DATE)
    AND (lc.end_date IS NULL OR lc.end_date >= CURRENT_DATE)
  ORDER BY lc.sort_order, lc.challenge_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update challenge progress
CREATE OR REPLACE FUNCTION update_challenge_progress(
  p_user_id UUID,
  p_action TEXT,
  p_count INTEGER DEFAULT 1,
  p_amount NUMERIC DEFAULT 0
) RETURNS INTEGER AS $$
DECLARE
  v_challenge RECORD;
  v_points_earned INTEGER := 0;
BEGIN
  FOR v_challenge IN
    SELECT lc.* FROM loyalty_challenges lc
    WHERE lc.is_active = true
      AND lc.target_action = p_action
      AND (lc.start_date IS NULL OR lc.start_date <= CURRENT_DATE)
      AND (lc.end_date IS NULL OR lc.end_date >= CURRENT_DATE)
  LOOP
    -- Upsert progress
    INSERT INTO user_challenge_progress (user_id, challenge_id, current_count, current_amount)
    VALUES (p_user_id, v_challenge.id, p_count, p_amount)
    ON CONFLICT (user_id, challenge_id) DO UPDATE SET
      current_count = user_challenge_progress.current_count + p_count,
      current_amount = user_challenge_progress.current_amount + p_amount;
    
    -- Check if completed
    UPDATE user_challenge_progress
    SET is_completed = true, completed_at = NOW(), points_awarded = v_challenge.points_reward
    WHERE user_id = p_user_id 
      AND challenge_id = v_challenge.id
      AND NOT is_completed
      AND current_count >= v_challenge.target_count
    RETURNING points_awarded INTO v_points_earned;
    
    -- Award points if just completed
    IF v_points_earned > 0 THEN
      PERFORM add_loyalty_points(p_user_id, v_points_earned, 'challenge', 'ภารกิจ: ' || v_challenge.name_th);
    END IF;
  END LOOP;
  
  RETURN v_points_earned;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update user streak
CREATE OR REPLACE FUNCTION update_user_streak(
  p_user_id UUID,
  p_streak_type TEXT
) RETURNS TABLE (
  current_streak INTEGER,
  longest_streak INTEGER,
  bonus_points INTEGER
) AS $$
DECLARE
  v_streak user_streaks%ROWTYPE;
  v_bonus INTEGER := 0;
BEGIN
  -- Get or create streak
  INSERT INTO user_streaks (user_id, streak_type, current_streak, last_activity_date)
  VALUES (p_user_id, p_streak_type, 1, CURRENT_DATE)
  ON CONFLICT (user_id, streak_type) DO UPDATE SET
    current_streak = CASE 
      WHEN user_streaks.last_activity_date = CURRENT_DATE THEN user_streaks.current_streak
      WHEN user_streaks.last_activity_date = CURRENT_DATE - 1 THEN user_streaks.current_streak + 1
      ELSE 1
    END,
    longest_streak = GREATEST(user_streaks.longest_streak, 
      CASE 
        WHEN user_streaks.last_activity_date = CURRENT_DATE - 1 THEN user_streaks.current_streak + 1
        ELSE 1
      END
    ),
    last_activity_date = CURRENT_DATE,
    updated_at = NOW()
  RETURNING * INTO v_streak;
  
  -- Award streak bonus at milestones
  IF v_streak.current_streak IN (7, 14, 30, 60, 90) THEN
    v_bonus := v_streak.current_streak * 10;
    PERFORM add_loyalty_points(p_user_id, v_bonus, 'streak', format('โบนัสต่อเนื่อง %s วัน', v_streak.current_streak));
  END IF;
  
  RETURN QUERY SELECT v_streak.current_streak, v_streak.longest_streak, v_bonus;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Award badge to user
CREATE OR REPLACE FUNCTION award_badge(
  p_user_id UUID,
  p_badge_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_badge loyalty_badges%ROWTYPE;
BEGIN
  -- Check if already has badge
  IF EXISTS (SELECT 1 FROM user_badges WHERE user_id = p_user_id AND badge_id = p_badge_id) THEN
    RETURN FALSE;
  END IF;
  
  SELECT * INTO v_badge FROM loyalty_badges WHERE id = p_badge_id;
  IF v_badge.id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Award badge
  INSERT INTO user_badges (user_id, badge_id) VALUES (p_user_id, p_badge_id);
  
  -- Award bonus points
  IF v_badge.points_bonus > 0 THEN
    PERFORM add_loyalty_points(p_user_id, v_badge.points_bonus, 'badge', 'เหรียญ: ' || v_badge.name_th);
  END IF;
  
  -- Notify user
  INSERT INTO user_notifications (user_id, type, title, message, action_url)
  VALUES (p_user_id, 'reward', 'ได้รับเหรียญใหม่!', v_badge.name_th, '/loyalty/badges');
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check and award badges
CREATE OR REPLACE FUNCTION check_and_award_badges(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_badge RECORD;
  v_count INTEGER := 0;
  v_user_rides INTEGER;
  v_user_streak INTEGER;
BEGIN
  -- Get user stats
  SELECT COUNT(*) INTO v_user_rides FROM ride_requests WHERE user_id = p_user_id AND status = 'completed';
  SELECT COALESCE(MAX(current_streak), 0) INTO v_user_streak FROM user_streaks WHERE user_id = p_user_id;
  
  FOR v_badge IN SELECT * FROM loyalty_badges WHERE is_active = true
  LOOP
    -- Check if user qualifies
    IF v_badge.requirement_type = 'rides' AND v_user_rides >= v_badge.requirement_value THEN
      IF (SELECT award_badge(p_user_id, v_badge.id)) THEN
        v_count := v_count + 1;
      END IF;
    ELSIF v_badge.requirement_type = 'streak' AND v_user_streak >= v_badge.requirement_value THEN
      IF (SELECT award_badge(p_user_id, v_badge.id)) THEN
        v_count := v_count + 1;
      END IF;
    END IF;
  END LOOP;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user badges
CREATE OR REPLACE FUNCTION get_user_badges(p_user_id UUID)
RETURNS TABLE (
  badge_id UUID,
  name TEXT,
  name_th TEXT,
  description_th TEXT,
  icon_url TEXT,
  badge_type TEXT,
  earned_at TIMESTAMPTZ,
  is_displayed BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    lb.id,
    lb.name,
    lb.name_th,
    lb.description_th,
    lb.icon_url,
    lb.badge_type,
    ub.earned_at,
    ub.is_displayed
  FROM user_badges ub
  JOIN loyalty_badges lb ON ub.badge_id = lb.id
  WHERE ub.user_id = p_user_id
  ORDER BY ub.earned_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON TABLE loyalty_challenges IS 'Gamification challenges for users';
COMMENT ON TABLE user_challenge_progress IS 'User progress on challenges';
COMMENT ON TABLE user_streaks IS 'User activity streaks';
COMMENT ON TABLE loyalty_badges IS 'Achievement badges';
COMMENT ON TABLE user_badges IS 'Badges earned by users';
COMMENT ON TABLE tier_benefits IS 'Benefits for each loyalty tier';
