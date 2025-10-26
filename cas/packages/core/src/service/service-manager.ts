// cas/packages/core/src/service/service-manager.ts

/**
 * @file Service Manager
 * @description Manages the lifecycle of registered services.
 */

import { getService, listServices } from './service-registry';

interface Service {
  start(): Promise<void> | void;
  stop(): Promise<void> | void;
}

/**
 * Starts a specific service.
 * @param {string} name - The name of the service to start.
 */
export async function startService(name: string): Promise<void> {
  const service: Service | undefined = getService(name);
  if (!service) {
    console.error(`[ServiceManager] Service "${name}" not found.`);
    return;
  }

  try {
    await service.start();
    console.log(`[ServiceManager] Service "${name}" started successfully.`);
  } catch (error) {
    console.error(`[ServiceManager] Error starting service "${name}":`, error);
  }
}

/**
 * Stops a specific service.
 * @param {string} name - The name of the service to stop.
 */
export async function stopService(name: string): Promise<void> {
  const service: Service | undefined = getService(name);
  if (!service) {
    console.error(`[ServiceManager] Service "${name}" not found.`);
    return;
  }

  try {
    await service.stop();
    console.log(`[ServiceManager] Service "${name}" stopped successfully.`);
  } catch (error) {
    console.error(`[ServiceManager] Error stopping service "${name}":`, error);
  }
}

/**
 * Starts all registered services.
 */
export async function startAllServices(): Promise<void> {
  const serviceNames = listServices();
  console.log(`[ServiceManager] Starting all ${serviceNames.length} services...`);
  for (const name of serviceNames) {
    await startService(name);
  }
}

/**
 * Stops all registered services.
 */
export async function stopAllServices(): Promise<void> {
  const serviceNames = listServices();
  console.log(`[ServiceManager] Stopping all ${serviceNames.length} services...`);
  for (const name of serviceNames) {
    await stopService(name);
  }
}
