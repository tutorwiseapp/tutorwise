-- Migration: Create exec_sql helper function
-- Version: 000 (prerequisite)
-- Date: 2025-10-20
-- Purpose: Helper function to execute SQL from migration scripts

-- Create the exec_sql function if it doesn't exist
CREATE OR REPLACE FUNCTION exec_sql(sql_query TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql_query;
  RETURN json_build_object('success', true);
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'detail', SQLSTATE
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION exec_sql(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION exec_sql(TEXT) TO service_role;

COMMENT ON FUNCTION exec_sql(TEXT) IS
  'Helper function to execute SQL statements from migration scripts. Used by Node.js migration runner.';
