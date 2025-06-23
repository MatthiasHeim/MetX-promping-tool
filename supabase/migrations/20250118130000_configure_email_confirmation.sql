-- Configure Supabase Auth to require email confirmation
-- This migration ensures users must confirm their email before they can use the app

-- Note: These settings need to be configured in the Supabase Dashboard under Authentication > Settings
-- This SQL is for documentation and reference only - auth settings are managed through the dashboard

-- Settings to configure in Supabase Dashboard:
-- 1. Authentication > Settings > User Management
--    - Enable email confirmations: ON
--    - Email confirmation expiry time: 3600 seconds (1 hour)
--    - Redirect URLs: Add your domain

-- 2. Authentication > Settings > Auth Providers
--    - Email: Enabled
--    - Confirm email: ON

-- This function can be used to check if a user's email is confirmed
CREATE OR REPLACE FUNCTION auth.email_confirmed(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = user_id 
    AND email_confirmed_at IS NOT NULL
  );
END;
$$;

-- Update RLS policies to ensure only confirmed users can access data
-- This adds an additional layer of security

-- Function to get current user ID only if email is confirmed
CREATE OR REPLACE FUNCTION auth.confirmed_uid()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF auth.email_confirmed(auth.uid()) THEN
    RETURN auth.uid();
  ELSE
    RETURN NULL;
  END IF;
END;
$$;

-- Update existing RLS policies to use confirmed_uid() instead of uid()
-- This ensures only users with confirmed emails can access data

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own inputs" ON user_inputs;
DROP POLICY IF EXISTS "Users can create their own inputs" ON user_inputs;
DROP POLICY IF EXISTS "Users can view their own results" ON generation_results;
DROP POLICY IF EXISTS "Users can create their own results" ON generation_results;
DROP POLICY IF EXISTS "Users can update their own results" ON generation_results;

-- Recreate policies with email confirmation check
CREATE POLICY "Users can view their own inputs" ON user_inputs
    FOR SELECT USING (auth.confirmed_uid() = user_id);

CREATE POLICY "Users can create their own inputs" ON user_inputs
    FOR INSERT WITH CHECK (auth.confirmed_uid() = user_id);

CREATE POLICY "Users can view their own results" ON generation_results
    FOR SELECT USING (auth.confirmed_uid() = user_id);

CREATE POLICY "Users can create their own results" ON generation_results
    FOR INSERT WITH CHECK (auth.confirmed_uid() = user_id);

CREATE POLICY "Users can update their own results" ON generation_results
    FOR UPDATE USING (auth.confirmed_uid() = user_id);

-- Comment for manual configuration steps
COMMENT ON FUNCTION auth.email_confirmed IS 'Helper function to check if user email is confirmed. Configure email confirmation in Supabase Dashboard: Authentication > Settings > User Management > Enable email confirmations';
COMMENT ON FUNCTION auth.confirmed_uid IS 'Returns user ID only if email is confirmed, otherwise NULL. Used in RLS policies to ensure only confirmed users access data'; 