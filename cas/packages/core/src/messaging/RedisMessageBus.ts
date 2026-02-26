/**
 * Redis Message Bus
 *
 * Redis-based implementation of MessageBusInterface using Upstash Redis
 * Supports distributed deployments with task persistence and pub/sub messaging
 */

import { Redis } from '@upstash/redis';
import type { MessageBusInterface, TaskMessage, TaskResultMessage } from './MessageBusInterface';

export interface RedisMessageBusConfig {
  url?: string;
  token?: string;
  redis?: Redis; // Allow passing existing Redis instance
}

export class RedisMessageBus implements MessageBusInterface {
  private redis: Redis;
  private connected = false;
  private subscriptions: Map<string, NodeJS.Timeout> = new Map();
  private streamSubscriptions: Map<string, NodeJS.Timeout> = new Map();

  constructor(config?: RedisMessageBusConfig) {
    if (config?.redis) {
      // Use provided Redis instance
      this.redis = config.redis;
    } else {
      // Create new Redis instance from URL/token or environment variables
      const url = config?.url || process.env.UPSTASH_REDIS_REST_URL;
      const token = config?.token || process.env.UPSTASH_REDIS_REST_TOKEN;

      if (!url || !token) {
        throw new Error(
          '[RedisMessageBus] Missing Redis credentials. ' +
          'Provide UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN, ' +
          'or pass redis instance in config.'
        );
      }

      this.redis = new Redis({ url, token });
    }
  }

  async connect(): Promise<void> {
    console.log('[RedisMessageBus] Connecting to Redis...');

    try {
      // Test connection with PING
      const response = await this.redis.ping();
      if (response !== 'PONG') {
        throw new Error('Redis PING failed');
      }

      this.connected = true;
      console.log('[RedisMessageBus] Connected to Redis successfully');
    } catch (error: any) {
      console.error('[RedisMessageBus] Connection failed:', error);
      throw new Error(`Failed to connect to Redis: ${error.message}`);
    }
  }

  async disconnect(): Promise<void> {
    console.log('[RedisMessageBus] Disconnecting from Redis...');

    try {
      // Clear all subscriptions
      for (const [key, interval] of this.subscriptions) {
        clearInterval(interval);
      }
      this.subscriptions.clear();

      for (const [key, interval] of this.streamSubscriptions) {
        clearInterval(interval);
      }
      this.streamSubscriptions.clear();

      this.connected = false;
      console.log('[RedisMessageBus] Disconnected from Redis');
    } catch (error: any) {
      console.error('[RedisMessageBus] Disconnect error:', error);
      throw error;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  async publishTask(agentId: string, task: TaskMessage): Promise<void> {
    if (!this.connected) {
      throw new Error('[RedisMessageBus] Not connected to Redis');
    }

    console.log(`[RedisMessageBus] Publishing task ${task.taskId} to agent ${agentId}`);

    try {
      const queueKey = `cas:queue:${agentId}`;
      const taskData = JSON.stringify(task);

      // Add to agent's task queue (LPUSH adds to left/head of list)
      // Priority tasks would use RPUSH to add to right/tail
      if (task.priority && task.priority > 0) {
        // High priority - add to front of queue
        await this.redis.rpush(queueKey, taskData);
      } else {
        // Normal priority - add to back of queue
        await this.redis.lpush(queueKey, taskData);
      }

      // Set expiration on queue (7 days)
      await this.redis.expire(queueKey, 7 * 24 * 60 * 60);

      console.log(`[RedisMessageBus] Task ${task.taskId} published to queue ${queueKey}`);
    } catch (error: any) {
      console.error(`[RedisMessageBus] Failed to publish task:`, error);
      throw new Error(`Failed to publish task: ${error.message}`);
    }
  }

  async subscribeToResults(agentId: string, callback: (result: TaskResultMessage) => void): Promise<void> {
    if (!this.connected) {
      throw new Error('[RedisMessageBus] Not connected to Redis');
    }

    console.log(`[RedisMessageBus] Subscribing to results for agent ${agentId}`);

    const channelKey = `cas:results:${agentId}`;

    // Upstash Redis REST API doesn't support native pub/sub blocking
    // Use polling with BLPOP simulation
    const pollInterval = setInterval(async () => {
      try {
        // Try to pop result from results list (non-blocking)
        const result = await this.redis.rpop(channelKey);

        if (result) {
          const resultMessage: TaskResultMessage = JSON.parse(result as string);
          callback(resultMessage);
        }
      } catch (error: any) {
        console.error(`[RedisMessageBus] Error polling results for ${agentId}:`, error);
      }
    }, 100); // Poll every 100ms

    this.subscriptions.set(agentId, pollInterval);
    console.log(`[RedisMessageBus] Subscribed to results for agent ${agentId}`);
  }

  async unsubscribeFromResults(agentId: string): Promise<void> {
    console.log(`[RedisMessageBus] Unsubscribing from results for agent ${agentId}`);

    const interval = this.subscriptions.get(agentId);
    if (interval) {
      clearInterval(interval);
      this.subscriptions.delete(agentId);
      console.log(`[RedisMessageBus] Unsubscribed from results for agent ${agentId}`);
    }
  }

  async publishCancellation(taskId: string): Promise<void> {
    if (!this.connected) {
      throw new Error('[RedisMessageBus] Not connected to Redis');
    }

    console.log(`[RedisMessageBus] Publishing cancellation for task ${taskId}`);

    try {
      const cancelKey = `cas:cancel:${taskId}`;

      // Set cancellation flag with expiration (1 hour)
      await this.redis.set(cancelKey, '1', { ex: 60 * 60 });

      console.log(`[RedisMessageBus] Cancellation published for task ${taskId}`);
    } catch (error: any) {
      console.error(`[RedisMessageBus] Failed to publish cancellation:`, error);
      throw new Error(`Failed to publish cancellation: ${error.message}`);
    }
  }

  async subscribeToStream(taskId: string, callback: (update: any) => void): Promise<void> {
    if (!this.connected) {
      throw new Error('[RedisMessageBus] Not connected to Redis');
    }

    console.log(`[RedisMessageBus] Subscribing to stream for task ${taskId}`);

    const streamKey = `cas:stream:${taskId}`;

    // Poll for stream updates
    const pollInterval = setInterval(async () => {
      try {
        const update = await this.redis.rpop(streamKey);

        if (update) {
          const updateData = JSON.parse(update as string);
          callback(updateData);
        }
      } catch (error: any) {
        console.error(`[RedisMessageBus] Error polling stream for ${taskId}:`, error);
      }
    }, 50); // Poll every 50ms for faster streaming

    this.streamSubscriptions.set(taskId, pollInterval);
    console.log(`[RedisMessageBus] Subscribed to stream for task ${taskId}`);
  }

  async unsubscribeFromStream(taskId: string): Promise<void> {
    console.log(`[RedisMessageBus] Unsubscribing from stream for task ${taskId}`);

    const interval = this.streamSubscriptions.get(taskId);
    if (interval) {
      clearInterval(interval);
      this.streamSubscriptions.delete(taskId);
      console.log(`[RedisMessageBus] Unsubscribed from stream for task ${taskId}`);
    }
  }

  async healthCheck(): Promise<boolean> {
    if (!this.connected) {
      return false;
    }

    try {
      const response = await this.redis.ping();
      return response === 'PONG';
    } catch (error) {
      console.error('[RedisMessageBus] Health check failed:', error);
      return false;
    }
  }

  // ============================================================================
  // Helper Methods for Agent Workers
  // ============================================================================

  /**
   * Get next task from agent's queue (for agent workers)
   */
  async getNextTask(agentId: string): Promise<TaskMessage | null> {
    if (!this.connected) {
      throw new Error('[RedisMessageBus] Not connected to Redis');
    }

    try {
      const queueKey = `cas:queue:${agentId}`;

      // Pop task from right (FIFO - first in, first out)
      const taskData = await this.redis.rpop(queueKey);

      if (!taskData) {
        return null;
      }

      const task: TaskMessage = JSON.parse(taskData as string);
      return task;
    } catch (error: any) {
      console.error(`[RedisMessageBus] Failed to get next task:`, error);
      return null;
    }
  }

  /**
   * Publish task result (for agent workers)
   */
  async publishResult(result: TaskResultMessage): Promise<void> {
    if (!this.connected) {
      throw new Error('[RedisMessageBus] Not connected to Redis');
    }

    try {
      const channelKey = `cas:results:${result.agentId}`;
      const resultData = JSON.stringify(result);

      // Add to results list
      await this.redis.lpush(channelKey, resultData);

      // Set expiration (1 hour)
      await this.redis.expire(channelKey, 60 * 60);

      console.log(`[RedisMessageBus] Result published for task ${result.taskId}`);
    } catch (error: any) {
      console.error(`[RedisMessageBus] Failed to publish result:`, error);
      throw new Error(`Failed to publish result: ${error.message}`);
    }
  }

  /**
   * Publish stream update (for agent workers)
   */
  async publishStreamUpdate(taskId: string, update: any): Promise<void> {
    if (!this.connected) {
      throw new Error('[RedisMessageBus] Not connected to Redis');
    }

    try {
      const streamKey = `cas:stream:${taskId}`;
      const updateData = JSON.stringify(update);

      // Add to stream list
      await this.redis.lpush(streamKey, updateData);

      // Set expiration (10 minutes)
      await this.redis.expire(streamKey, 10 * 60);
    } catch (error: any) {
      console.error(`[RedisMessageBus] Failed to publish stream update:`, error);
    }
  }

  /**
   * Check if task is cancelled
   */
  async isCancelled(taskId: string): Promise<boolean> {
    if (!this.connected) {
      return false;
    }

    try {
      const cancelKey = `cas:cancel:${taskId}`;
      const cancelled = await this.redis.get(cancelKey);
      return cancelled === '1';
    } catch (error: any) {
      console.error(`[RedisMessageBus] Failed to check cancellation:`, error);
      return false;
    }
  }

  /**
   * Get queue size for an agent
   */
  async getQueueSize(agentId: string): Promise<number> {
    if (!this.connected) {
      return 0;
    }

    try {
      const queueKey = `cas:queue:${agentId}`;
      const size = await this.redis.llen(queueKey);
      return size || 0;
    } catch (error: any) {
      console.error(`[RedisMessageBus] Failed to get queue size:`, error);
      return 0;
    }
  }

  /**
   * Clear all queues (for testing/admin)
   */
  async clearQueues(): Promise<void> {
    if (!this.connected) {
      throw new Error('[RedisMessageBus] Not connected to Redis');
    }

    console.log('[RedisMessageBus] Clearing all queues...');

    try {
      // Delete all queue keys
      const pattern = 'cas:*';
      const keys = await this.redis.keys(pattern);

      if (keys && keys.length > 0) {
        await this.redis.del(...keys);
        console.log(`[RedisMessageBus] Cleared ${keys.length} keys`);
      }
    } catch (error: any) {
      console.error('[RedisMessageBus] Failed to clear queues:', error);
      throw error;
    }
  }
}
