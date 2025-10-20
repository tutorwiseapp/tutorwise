/**
 * Create exec_sql function in Supabase
 * This is a prerequisite for running migrations
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const createExecSqlFunction = `
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

GRANT EXECUTE ON FUNCTION exec_sql(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION exec_sql(TEXT) TO service_role;
`;

async function main() {
  console.log('🔧 Creating exec_sql helper function...');

  try {
    // Use Supabase's query method directly
    const { data, error } = await supabase.rpc('query', {
      query: createExecSqlFunction
    }).catch(async (err) => {
      // If query RPC doesn't exist, try direct SQL execution
      console.log('Trying direct SQL execution...');
      const { data, error } = await supabase.from('_migrations').select('*').limit(1);
      if (error && error.code === '42P01') {
        console.log('Database connection OK, but no migrations table.');
      }
      throw new Error('exec_sql function needs to be created via Supabase SQL Editor');
    });

    if (error) throw error;

    console.log('✅ exec_sql function created successfully!');
    console.log('Now you can run: npm run migrate:listing-templates');
  } catch (error) {
    console.error('\n❌ Could not create exec_sql function automatically.');
    console.error('Error:', error.message);
    console.error('\n📋 Manual steps required:');
    console.error('\n1. Go to Supabase Dashboard → SQL Editor');
    console.error('2. Run this SQL:\n');
    console.error('----------------------------------------');
    console.error(createExecSqlFunction);
    console.error('----------------------------------------');
    console.error('\n3. Then run: npm run migrate:listing-templates\n');
  }
}

main();
