/**
 * Message Bus Interface
 *
 * Defines the contract for message bus implementations (Redis, RabbitMQ, etc.)
 * Used for async agent communication and task distribution
 */

export interface TaskMessage {
  taskId: string;
  agentId: string;
  input: any;
  timestamp: string;
  priority?: number;
}

export interface TaskResultMessage {
  taskId: string;
  agentId: string;
  output: any;
  status: 'success' | 'error' | 'partial';
  error?: string;
  metrics?: any;
  timestamp: string;
}

export interface MessageBusInterface {
  /**
   * Connect to the message bus
   */
  connect(): Promise<void>;

  /**
   * Disconnect from the message bus
   */
  disconnect(): Promise<void>;

  /**
   * Check if connected
   */
  isConnected(): boolean;

  /**
   * Publish a task to an agent's queue
   */
  publishTask(agentId: string, task: TaskMessage): Promise<void>;

  /**
   * Subscribe to task results from an agent
   */
  subscribeToResults(agentId: string, callback: (result: TaskResultMessage) => void): Promise<void>;

  /**
   * Unsubscribe from task results
   */
  unsubscribeFromResults(agentId: string): Promise<void>;

  /**
   * Publish a task cancellation request
   */
  publishCancellation(taskId: string): Promise<void>;

  /**
   * Subscribe to streaming updates for a task
   */
  subscribeToStream(taskId: string, callback: (update: any) => void): Promise<void>;

  /**
   * Unsubscribe from streaming updates
   */
  unsubscribeFromStream(taskId: string): Promise<void>;

  /**
   * Health check for message bus
   */
  healthCheck(): Promise<boolean>;
}
