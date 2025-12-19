-- Migration: 067_i18n_system.sql
-- Feature: F29 - Internationalization System Enhancement
-- Description: Multi-language support with translation management

-- =====================================================
-- 1. Supported Languages
-- =====================================================
CREATE TABLE IF NOT EXISTS supported_languages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL, -- 'th', 'en', 'zh', 'ja'
  name TEXT NOT NULL,
  native_name TEXT NOT NULL,
  flag_emoji TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default languages
INSERT INTO supported_languages (code, name, native_name, flag_emoji, is_default, sort_order) VALUES
('th', 'Thai', 'ไทย', '🇹🇭', true, 1),
('en', 'English', 'English', '🇺🇸', false, 2),
('zh', 'Chinese', '中文', '🇨🇳', false, 3),
('ja', 'Japanese', '日本語', '🇯🇵', false, 4),
('ko', 'Korean', '한국어', '🇰🇷', false, 5)
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- 2. Translation Keys
-- =====================================================
CREATE TABLE IF NOT EXISTS translation_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL, -- 'common.welcome', 'ride.booking_title'
  namespace TEXT NOT NULL DEFAULT 'common', -- 'common', 'ride', 'delivery', 'admin'
  description TEXT,
  context TEXT, -- Where this key is used
  is_plural BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_translation_keys_namespace ON translation_keys(namespace);
CREATE INDEX IF NOT EXISTS idx_translation_keys_key ON translation_keys(key);

-- =====================================================
-- 3. Translations
-- =====================================================
CREATE TABLE IF NOT EXISTS translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_id UUID NOT NULL REFERENCES translation_keys(id) ON DELETE CASCADE,
  language_code TEXT NOT NULL REFERENCES supported_languages(code) ON DELETE CASCADE,
  value TEXT NOT NULL,
  plural_value TEXT, -- For plural forms
  is_verified BOOLEAN DEFAULT FALSE,
  verified_by UUID,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(key_id, language_code)
);

CREATE INDEX IF NOT EXISTS idx_translations_key ON translations(key_id);
CREATE INDEX IF NOT EXISTS idx_translations_lang ON translations(language_code);

-- =====================================================
-- 4. User Language Preferences
-- =====================================================
CREATE TABLE IF NOT EXISTS user_language_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  preferred_language TEXT NOT NULL REFERENCES supported_languages(code) DEFAULT 'th',
  fallback_language TEXT REFERENCES supported_languages(code) DEFAULT 'en',
  auto_detect BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- =====================================================
-- 5. Translation Requests (for missing translations)
-- =====================================================
CREATE TABLE IF NOT EXISTS translation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_id UUID REFERENCES translation_keys(id),
  missing_key TEXT, -- If key doesn't exist yet
  language_code TEXT NOT NULL REFERENCES supported_languages(code),
  context TEXT,
  requested_by UUID REFERENCES users(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'rejected')),
  assigned_to UUID,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 6. Content Translations (for dynamic content)
-- =====================================================
CREATE TABLE IF NOT EXISTS content_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL, -- 'promo', 'notification', 'announcement'
  content_id UUID NOT NULL,
  language_code TEXT NOT NULL REFERENCES supported_languages(code),
  field_name TEXT NOT NULL, -- 'title', 'description', 'message'
  translated_value TEXT NOT NULL,
  is_auto_translated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(content_type, content_id, language_code, field_name)
);

CREATE INDEX IF NOT EXISTS idx_content_trans_type ON content_translations(content_type, content_id);

-- =====================================================
-- 7. Enable RLS
-- =====================================================
ALTER TABLE supported_languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE translation_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_language_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE translation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_translations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone read languages" ON supported_languages
  FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "Anyone read translation_keys" ON translation_keys
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Anyone read translations" ON translations
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users manage own language prefs" ON user_language_preferences
  FOR ALL TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users create translation requests" ON translation_requests
  FOR INSERT TO authenticated WITH CHECK (requested_by = auth.uid());

CREATE POLICY "Anyone read content translations" ON content_translations
  FOR SELECT TO authenticated USING (true);

-- =====================================================
-- 8. Functions
-- =====================================================

-- Get translation for key
CREATE OR REPLACE FUNCTION get_translation(
  p_key TEXT,
  p_language TEXT DEFAULT 'th',
  p_fallback TEXT DEFAULT 'en'
) RETURNS TEXT AS $$
DECLARE
  v_value TEXT;
BEGIN
  -- Try primary language
  SELECT t.value INTO v_value
  FROM translations t
  JOIN translation_keys tk ON t.key_id = tk.id
  WHERE tk.key = p_key AND t.language_code = p_language;
  
  IF v_value IS NOT NULL THEN
    RETURN v_value;
  END IF;
  
  -- Try fallback language
  SELECT t.value INTO v_value
  FROM translations t
  JOIN translation_keys tk ON t.key_id = tk.id
  WHERE tk.key = p_key AND t.language_code = p_fallback;
  
  IF v_value IS NOT NULL THEN
    RETURN v_value;
  END IF;
  
  -- Return key as fallback
  RETURN p_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get all translations for namespace
CREATE OR REPLACE FUNCTION get_translations_by_namespace(
  p_namespace TEXT,
  p_language TEXT DEFAULT 'th'
) RETURNS TABLE (
  key TEXT,
  value TEXT,
  is_verified BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tk.key,
    COALESCE(t.value, tk.key) as value,
    COALESCE(t.is_verified, false) as is_verified
  FROM translation_keys tk
  LEFT JOIN translations t ON t.key_id = tk.id AND t.language_code = p_language
  WHERE tk.namespace = p_namespace
  ORDER BY tk.key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user's preferred language
CREATE OR REPLACE FUNCTION get_user_language(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_lang TEXT;
BEGIN
  SELECT preferred_language INTO v_lang
  FROM user_language_preferences
  WHERE user_id = p_user_id;
  
  RETURN COALESCE(v_lang, 'th');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Set user language preference
CREATE OR REPLACE FUNCTION set_user_language(
  p_user_id UUID,
  p_language TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO user_language_preferences (user_id, preferred_language)
  VALUES (p_user_id, p_language)
  ON CONFLICT (user_id) DO UPDATE SET
    preferred_language = p_language,
    updated_at = NOW();
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get content translation
CREATE OR REPLACE FUNCTION get_content_translation(
  p_content_type TEXT,
  p_content_id UUID,
  p_field TEXT,
  p_language TEXT DEFAULT 'th'
) RETURNS TEXT AS $$
DECLARE
  v_value TEXT;
BEGIN
  SELECT translated_value INTO v_value
  FROM content_translations
  WHERE content_type = p_content_type
    AND content_id = p_content_id
    AND field_name = p_field
    AND language_code = p_language;
  
  RETURN v_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bulk upsert translations (admin)
CREATE OR REPLACE FUNCTION upsert_translations(
  p_translations JSONB -- [{"key": "...", "language": "...", "value": "..."}]
) RETURNS INTEGER AS $$
DECLARE
  v_item JSONB;
  v_key_id UUID;
  v_count INTEGER := 0;
BEGIN
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_translations)
  LOOP
    -- Get or create key
    INSERT INTO translation_keys (key, namespace)
    VALUES (
      v_item->>'key',
      COALESCE(SPLIT_PART(v_item->>'key', '.', 1), 'common')
    )
    ON CONFLICT (key) DO UPDATE SET updated_at = NOW()
    RETURNING id INTO v_key_id;
    
    -- Upsert translation
    INSERT INTO translations (key_id, language_code, value)
    VALUES (v_key_id, v_item->>'language', v_item->>'value')
    ON CONFLICT (key_id, language_code) DO UPDATE SET
      value = EXCLUDED.value,
      updated_at = NOW();
    
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get translation stats
CREATE OR REPLACE FUNCTION get_translation_stats()
RETURNS TABLE (
  language_code TEXT,
  language_name TEXT,
  total_keys BIGINT,
  translated_count BIGINT,
  verified_count BIGINT,
  completion_pct NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH key_count AS (
    SELECT COUNT(*) as total FROM translation_keys
  )
  SELECT 
    sl.code as language_code,
    sl.native_name as language_name,
    kc.total as total_keys,
    COUNT(t.id) as translated_count,
    COUNT(t.id) FILTER (WHERE t.is_verified) as verified_count,
    ROUND(COUNT(t.id)::NUMERIC / NULLIF(kc.total, 0) * 100, 1) as completion_pct
  FROM supported_languages sl
  CROSS JOIN key_count kc
  LEFT JOIN translations t ON t.language_code = sl.code
  WHERE sl.is_active = true
  GROUP BY sl.code, sl.native_name, sl.sort_order, kc.total
  ORDER BY sl.sort_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON TABLE supported_languages IS 'Available languages in the system';
COMMENT ON TABLE translation_keys IS 'Translation key registry';
COMMENT ON TABLE translations IS 'Translated values for each key and language';
COMMENT ON TABLE user_language_preferences IS 'User language settings';
COMMENT ON TABLE translation_requests IS 'Requests for missing translations';
COMMENT ON TABLE content_translations IS 'Translations for dynamic content';
