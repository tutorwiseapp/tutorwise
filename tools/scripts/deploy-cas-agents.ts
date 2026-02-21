#!/usr/bin/env node
/**
 * CAS Agent Deployment Script
 *
 * This script:
 * 1. Creates database tables (cas_marketer_insights, cas_security_scans)
 * 2. Sets up pg_cron jobs for automated execution
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
  console.log('=== CAS Agent Deployment ===');
  console.log(`Project: ${PROJECT_REF}`);
  console.log(`Connecting to: ${connectionConfig.host}:${connectionConfig.port}\n`);

  const client = new Client(connectionConfig);

  try {
    // Connect to database
    await client.connect();
    console.log('✅ Connected to Supabase PostgreSQL');

    // Read migration files
    const migration271 = readFileSync(
      resolve(__dirname, '../database/migrations/271_create_cas_marketer_insights.sql'),
      'utf-8'
    );

    const migration272 = readFileSync(
      resolve(__dirname, '../database/migrations/272_create_cas_security_scans.sql'),
      'utf-8'
    );

    // Step 1: Create tables
    console.log('\n=== Step 1: Creating Database Tables ===');
    await runSQL(client, migration271, 'Migration 271: cas_marketer_insights table');
    await runSQL(client, migration272, 'Migration 272: cas_security_scans table');

    // Step 2: Enable pg_cron extension
    console.log('\n=== Step 2: Enabling pg_cron Extension ===');
    await runSQL(client, 'CREATE EXTENSION IF NOT EXISTS pg_cron;', 'Enable pg_cron');

    // Step 3: Set up cron jobs
    console.log('\n=== Step 3: Setting Up Cron Jobs ===');

    // Remove existing cron jobs if they exist
    await client.query(`SELECT cron.unschedule('cas-marketer-daily-analytics')`).catch(() => {});
    await client.query(`SELECT cron.unschedule('cas-security-weekly-scan')`).catch(() => {});

    // CAS Marketer - Daily at 02:00 UTC
    const marketerCronSQL = `
      SELECT cron.schedule(
        'cas-marketer-daily-analytics',
        '0 2 * * *',
        $$
        SELECT
          net.http_post(
            url:='${SUPABASE_URL}/functions/v1/cas-marketer-analytics',
            headers:='{"Content-Type": "application/json", "Authorization": "Bearer tutorwise-cron-2024-cas-marketer"}'::jsonb,
            body:='{}'::jsonb
          ) AS request_id;
        $$
      );
    `;
    await runSQL(client, marketerCronSQL, 'CAS Marketer daily cron job');

    // CAS Security - Weekly on Sundays at 03:00 UTC
    const securityCronSQL = `
      SELECT cron.schedule(
        'cas-security-weekly-scan',
        '0 3 * * 0',
        $$
        SELECT
          net.http_post(
            url:='${SUPABASE_URL}/functions/v1/cas-security-scan',
            headers:='{"Content-Type": "application/json", "Authorization": "Bearer tutorwise-cron-2024-cas-security"}'::jsonb,
            body:='{}'::jsonb
          ) AS request_id;
        $$
      );
    `;
    await runSQL(client, securityCronSQL, 'CAS Security weekly cron job');

    // Step 4: Verify deployment
    console.log('\n=== Step 4: Verifying Deployment ===');

    // Check tables exist
    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('cas_marketer_insights', 'cas_security_scans')
      ORDER BY table_name;
    `);
    console.log(`✅ Tables created: ${tablesResult.rows.map(r => r.table_name).join(', ')}`);

    // Check cron jobs
    const cronResult = await client.query(`
      SELECT jobid, jobname, schedule
      FROM cron.job
      WHERE jobname IN ('cas-marketer-daily-analytics', 'cas-security-weekly-scan')
      ORDER BY jobname;
    `);
    console.log(`✅ Cron jobs created: ${cronResult.rows.length}/2`);
    cronResult.rows.forEach(row => {
      console.log(`   - ${row.jobname}: ${row.schedule} (ID: ${row.jobid})`);
    });

    console.log('\n=== Deployment Summary ===');
    console.log('✅ Database tables created');
    console.log('✅ Cron jobs scheduled');
    console.log('\n📋 Next Steps:');
    console.log('1. Deploy Edge Functions:');
    console.log('   supabase functions deploy cas-marketer-analytics --no-verify-jwt');
    console.log('   supabase functions deploy cas-security-scan --no-verify-jwt');
    console.log('\n2. Test manually:');
    console.log(`   curl -X POST '${SUPABASE_URL}/functions/v1/cas-marketer-analytics' \\`);
    console.log(`     -H 'Authorization: Bearer tutorwise-cron-2024-cas-marketer'`);
    console.log('\n3. Monitor cron execution:');
    console.log('   SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;');

  } catch (error) {
    console.error('\n❌ Deployment failed:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n✅ Database connection closed');
  }
}

main().catch(console.error);
