/**
 * Filename: tools/caas/process-queue-manual.ts
 * Purpose: Manually process CaaS recalculation queue for users with 0 scores
 * Created: 2026-01-03
 * Usage: npx tsx tools/caas/process-queue-manual.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import { CaaSService } from '../../apps/web/src/lib/services/caas';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

async function processQueue() {
  console.log('Starting manual CaaS queue processing...\n');

  // Create Supabase client with service role
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  // Fetch all jobs from queue
  const { data: jobs, error: queueError } = await supabase
    .from('caas_recalculation_queue')
    .select('profile_id')
    .order('created_at', { ascending: true });

  if (queueError) {
    console.error('Error fetching queue:', queueError);
    process.exit(1);
  }

  if (!jobs || jobs.length === 0) {
    console.log('Queue is empty - nothing to process');
    return;
  }

  console.log(`Found ${jobs.length} profiles in queue\n`);

  // Process each job
  let successCount = 0;
  let failureCount = 0;

  for (const job of jobs) {
    try {
      console.log(`Processing profile: ${job.profile_id}...`);
      await CaaSService.calculate_caas(job.profile_id, supabase);
      console.log(`✓ Success\n`);
      successCount++;

      // Remove from queue
      await supabase
        .from('caas_recalculation_queue')
        .delete()
        .eq('profile_id', job.profile_id);
    } catch (error) {
      console.error(`✗ Failed:`, error);
      console.log('');
      failureCount++;
    }
  }

  console.log('='.repeat(50));
  console.log(`Processing complete!`);
  console.log(`Successful: ${successCount}`);
  console.log(`Failed: ${failureCount}`);
  console.log('='.repeat(50));
}

processQueue().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
