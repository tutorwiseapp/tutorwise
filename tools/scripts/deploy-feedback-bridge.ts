#!/usr/bin/env node
/**
 * CAS Feedback Bridge Deployment Script
 *
 * This script:
 * 1. Creates database tables (cas_planner_tasks, cas_analyst_reports)
 * 2. Sets up pg_cron job for automated feedback processing
 * 3. Verifies deployment
 */

import { Client } from 'pg';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Supabase connection details
const PROJECT_REF = 'lvsmtgmpoysjygdwcrir';
const DB_PASSWORD = '8goRkJd6cPkPGyIY';
const SUPABASE_URL = `https://${PROJECT_REF}.supabase.co`;

const connectionConfig = {
  host: `aws-1-eu-west-2.pooler.supabase.com`,
  port: 5432,  // Session pooler port
  database: 'postgres',
  user: `postgres.${PROJECT_REF}`,
  password: DB_PASSWORD,
  ssl: {
    rejectUnauthorized: false,
  },
};

async function runSQL(client: Client, sql: string, description: string): Promise<void> {
  console.log(`\n📝 ${description}...`);
  try {
    await client.query(sql);
    console.log(`✅ ${description} - Success`);
  } catch (error: any) {
    if (error.message.includes('already exists')) {
      console.log(`⚠️  ${description} - Already exists (skipping)`);
    } else {
      throw error;
    }
  }
}

async function main() {
  console.log('=== CAS Feedback Bridge Deployment ===');
  console.log(`Project: ${PROJECT_REF}`);
  console.log(`Connecting to: ${connectionConfig.host}:${connectionConfig.port}\n`);

  const client = new Client(connectionConfig);

  try {
    // Connect to database
    await client.connect();
    console.log('✅ Connected to Supabase PostgreSQL');

    // Read migration files
    const migration273 = readFileSync(
      resolve(__dirname, '../database/migrations/273_create_cas_planner_tasks.sql'),
      'utf-8'
    );

    const migration274 = readFileSync(
      resolve(__dirname, '../database/migrations/274_create_cas_analyst_reports.sql'),
      'utf-8'
    );

    // Step 1: Create tables
    console.log('\n=== Step 1: Creating Database Tables ===');
    await runSQL(client, migration273, 'Migration 273: cas_planner_tasks table');
    await runSQL(client, migration274, 'Migration 274: cas_analyst_reports table');

    // Step 2: Ensure pg_cron extension is enabled
    console.log('\n=== Step 2: Ensuring pg_cron Extension ===');
    await runSQL(client, 'CREATE EXTENSION IF NOT EXISTS pg_cron;', 'Enable pg_cron');

    // Step 3: Set up cron job
    console.log('\n=== Step 3: Setting Up Cron Job ===');

    // Remove existing cron job if it exists
    await client.query(`SELECT cron.unschedule('cas-feedback-processor-hourly')`).catch(() => {});

    // CAS Feedback Processor - Hourly
    const feedbackCronSQL = `
      SELECT cron.schedule(
        'cas-feedback-processor-hourly',
        '0 * * * *',
        $$
        SELECT
          net.http_post(
            url:='${SUPABASE_URL}/functions/v1/cas-feedback-processor',
            headers:='{"Content-Type": "application/json", "Authorization": "Bearer tutorwise-cron-2024-cas-feedback"}'::jsonb,
            body:='{}'::jsonb
          ) AS request_id;
        $$
      );
    `;
    await runSQL(client, feedbackCronSQL, 'CAS Feedback Processor hourly cron job');

    // Step 4: Verify deployment
    console.log('\n=== Step 4: Verifying Deployment ===');

    // Check tables exist
    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('cas_planner_tasks', 'cas_analyst_reports')
      ORDER BY table_name;
    `);
    console.log(`✅ Tables created: ${tablesResult.rows.map(r => r.table_name).join(', ')}`);

    // Check cron job
    const cronResult = await client.query(`
      SELECT jobid, jobname, schedule
      FROM cron.job
      WHERE jobname = 'cas-feedback-processor-hourly'
      ORDER BY jobname;
    `);
    console.log(`✅ Cron job created: ${cronResult.rows.length}/1`);
    cronResult.rows.forEach(row => {
      console.log(`   - ${row.jobname}: ${row.schedule} (ID: ${row.jobid})`);
    });

    console.log('\n=== Deployment Summary ===');
    console.log('✅ Database tables created');
    console.log('✅ Cron job scheduled');
    console.log('\n📋 Next Steps:');
    console.log('1. Deploy Edge Function:');
    console.log('   supabase functions deploy cas-feedback-processor --no-verify-jwt');
    console.log('\n2. Test manually:');
    console.log(`   curl -X POST '${SUPABASE_URL}/functions/v1/cas-feedback-processor' \\\\`);
    console.log(`     -H 'Authorization: Bearer tutorwise-cron-2024-cas-feedback'`);
    console.log('\n3. Monitor cron execution:');
    console.log("   SELECT * FROM cron.job_run_details WHERE jobname = 'cas-feedback-processor-hourly' ORDER BY start_time DESC LIMIT 10;");
    console.log('\n4. View generated tasks:');
    console.log('   SELECT * FROM cas_planner_tasks ORDER BY created_at DESC LIMIT 10;');
    console.log('\n5. View analyst reports:');
    console.log('   SELECT * FROM cas_analyst_reports ORDER BY created_at DESC LIMIT 5;');

  } catch (error) {
    console.error('\n❌ Deployment failed:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n✅ Database connection closed');
  }
}

main().catch(console.error);
