// cas/packages/core/src/service/service-manager.js

/**
 * @file Service Manager
 * @description Manages the lifecycle of registered services.
 */

const { getService, listServices } = require('./service-registry');

/**
 * Starts a specific service.
 * @param {string} name - The name of the service to start.
 */
async function startService(name) {
  const service = getService(name);
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
async function stopService(name) {
  const service = getService(name);
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
async function startAllServices() {
  const serviceNames = listServices();
  console.log(`[ServiceManager] Starting all ${serviceNames.length} services...`);
  for (const name of serviceNames) {
    await startService(name);
  }
}

/**
 * Stops all registered services.
 */
async function stopAllServices() {
  const serviceNames = listServices();
  console.log(`[ServiceManager] Stopping all ${serviceNames.length} services...`);
  for (const name of serviceNames) {
    await stopService(name);
  }
}

module.exports = {
  startService,
  stopService,
  startAllServices,
  stopAllServices,
};
