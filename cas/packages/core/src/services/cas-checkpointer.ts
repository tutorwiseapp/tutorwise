/**
 * CAS LangGraph Checkpointer
 *
 * Uses @langchain/langgraph-checkpoint-postgres for native LangGraph
 * workflow state persistence. Enables true pause/resume at the approval gate.
 *
 * Connection: Uses POSTGRES_URL_NON_POOLING (port 5432, direct connection)
 * because the PostgresSaver uses transactions which require non-pooled connections.
 *
 * The package auto-creates its checkpoint tables on first .setup() call:
 * - checkpoints
 * - checkpoint_blobs
 * - checkpoint_writes
 * - checkpoint_migrations
 */

import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';

let checkpointer: PostgresSaver | null = null;
let setupComplete = false;

/**
 * Get or create the PostgresSaver singleton.
 * Calls .setup() on first invocation to ensure tables exist.
 */
export async function getCheckpointer(): Promise<PostgresSaver> {
  if (checkpointer && setupComplete) {
    return checkpointer;
  }

  const connString =
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.DATABASE_URL;

  if (!connString) {
    throw new Error(
      '[CAS Checkpointer] No database connection string found. ' +
      'Set POSTGRES_URL_NON_POOLING or DATABASE_URL in .env.local'
    );
  }

  checkpointer = PostgresSaver.fromConnString(connString);
  await checkpointer.setup();
  setupComplete = true;

  console.log('[CAS Checkpointer] PostgresSaver initialized and tables verified');
  return checkpointer;
}

/**
 * Check if checkpointing is available (connection string exists).
 */
export function isCheckpointingAvailable(): boolean {
  return !!(process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL);
}

/**
 * Clean up the checkpointer connection pool.
 * Call this on shutdown to prevent connection leaks.
 */
export async function closeCheckpointer(): Promise<void> {
  if (checkpointer) {
    await checkpointer.end();
    checkpointer = null;
    setupComplete = false;
    console.log('[CAS Checkpointer] Connection pool closed');
  }
}
