-- Configure Supabase Auth for 31-day session persistence
-- Run this in your Supabase SQL Editor

-- Update auth configuration for longer sessions
UPDATE auth.config 
SET 
  jwt_exp = 2678400, -- 31 days in seconds
  refresh_token_rotation_enabled = true,
  refresh_token_reuse_interval = 10 -- seconds
WHERE id = 1;

-- Enable email confirmation (optional)
UPDATE auth.config 
SET 
  enable_signup = true,
  enable_confirmations = false -- Set to true if you want email confirmation
WHERE id = 1;

-- Create a simple user preferences table (optional)
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  preferred_regions TEXT[] DEFAULT '{}',
  search_history TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on user_preferences
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Create policy for user_preferences
CREATE POLICY "Users can manage their own preferences" ON user_preferences
  FOR ALL USING (auth.uid() = user_id);

-- Create function to automatically create user preferences
CREATE OR REPLACE FUNCTION create_user_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_preferences (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-create preferences
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_user_preferences();
