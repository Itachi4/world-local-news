-- Create a function to get user display names for public analyses
-- This allows us to show user emails/names in the sidebar
-- Run this in your Supabase SQL Editor

CREATE OR REPLACE FUNCTION get_user_display_info(user_ids UUID[])
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  full_name TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id::UUID as user_id,
    u.email::TEXT as email,
    COALESCE(u.raw_user_meta_data->>'full_name', NULL)::TEXT as full_name
  FROM auth.users u
  WHERE u.id = ANY(user_ids);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_display_info(UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_display_info(UUID[]) TO anon;

