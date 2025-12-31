-- Create exec_sql helper function for running migrations
-- This allows scripts to execute SQL via RPC calls

CREATE OR REPLACE FUNCTION public.exec_sql(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql;
END;
$$;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO service_role;

COMMENT ON FUNCTION public.exec_sql(text) IS 'Helper function to execute SQL statements via RPC for migrations';
