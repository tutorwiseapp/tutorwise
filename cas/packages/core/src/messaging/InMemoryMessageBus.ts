/**
 * In-Memory Message Bus
 *
 * Simple in-memory implementation of MessageBusInterface
 * Useful for development, testing, and single-process deployments
 */

import type { MessageBusInterface, TaskMessage, TaskResultMessage } from './MessageBusInterface';

export class InMemoryMessageBus implements MessageBusInterface {
  private connected = false;
  private taskQueues: Map<string, TaskMessage[]> = new Map();
  private resultCallbacks: Map<string, (result: TaskResultMessage) => void> = new Map();
  private streamCallbacks: Map<string, (update: any) => void> = new Map();
  private cancellations: Set<string> = new Set();

  async connect(): Promise<void> {
    console.log('[InMemoryMessageBus] Connecting...');
    this.connected = true;
    console.log('[InMemoryMessageBus] Connected');
  }

  async disconnect(): Promise<void> {
    console.log('[InMemoryMessageBus] Disconnecting...');
    this.connected = false;
    this.taskQueues.clear();
    this.resultCallbacks.clear();
    this.streamCallbacks.clear();
    this.cancellations.clear();
    console.log('[InMemoryMessageBus] Disconnected');
  }

  isConnected(): boolean {
    return this.connected;
  }

  async publishTask(agentId: string, task: TaskMessage): Promise<void> {
    if (!this.connected) {
      throw new Error('Message bus not connected');
    }

    console.log(`[InMemoryMessageBus] Publishing task ${task.taskId} to agent ${agentId}`);

    // Get or create queue for agent
    if (!this.taskQueues.has(agentId)) {
      this.taskQueues.set(agentId, []);
    }

    const queue = this.taskQueues.get(agentId)!;
    queue.push(task);

    // Sort by priority (higher priority first)
    queue.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }

  async subscribeToResults(agentId: string, callback: (result: TaskResultMessage) => void): Promise<void> {
    if (!this.connected) {
      throw new Error('Message bus not connected');
    }

    console.log(`[InMemoryMessageBus] Subscribing to results for agent ${agentId}`);
    this.resultCallbacks.set(agentId, callback);
  }

  async unsubscribeFromResults(agentId: string): Promise<void> {
    console.log(`[InMemoryMessageBus] Unsubscribing from results for agent ${agentId}`);
    this.resultCallbacks.delete(agentId);
  }

  async publishCancellation(taskId: string): Promise<void> {
    if (!this.connected) {
      throw new Error('Message bus not connected');
    }

    console.log(`[InMemoryMessageBus] Publishing cancellation for task ${taskId}`);
    this.cancellations.add(taskId);
  }

  async subscribeToStream(taskId: string, callback: (update: any) => void): Promise<void> {
    if (!this.connected) {
      throw new Error('Message bus not connected');
    }

    console.log(`[InMemoryMessageBus] Subscribing to stream for task ${taskId}`);
    this.streamCallbacks.set(taskId, callback);
  }

  async unsubscribeFromStream(taskId: string): Promise<void> {
    console.log(`[InMemoryMessageBus] Unsubscribing from stream for task ${taskId}`);
    this.streamCallbacks.delete(taskId);
  }

  async healthCheck(): Promise<boolean> {
    return this.connected;
  }

  // Helper methods for internal use

  /**
   * Get next task from agent's queue
   */
  getNextTask(agentId: string): TaskMessage | undefined {
    const queue = this.taskQueues.get(agentId);
    return queue?.shift();
  }

  /**
   * Check if task is cancelled
   */
  isCancelled(taskId: string): boolean {
    return this.cancellations.has(taskId);
  }

  /**
   * Publish a result (simulates agent publishing result)
   */
  publishResult(result: TaskResultMessage): void {
    const callback = this.resultCallbacks.get(result.agentId);
    if (callback) {
      callback(result);
    }
  }

  /**
   * Publish a stream update (simulates agent publishing update)
   */
  publishStreamUpdate(taskId: string, update: any): void {
    const callback = this.streamCallbacks.get(taskId);
    if (callback) {
      callback(update);
    }
  }

  /**
   * Get queue size for an agent
   */
  getQueueSize(agentId: string): number {
    return this.taskQueues.get(agentId)?.length || 0;
  }

  /**
   * Clear all queues (for testing)
   */
  clearQueues(): void {
    this.taskQueues.clear();
    this.cancellations.clear();
  }
}
