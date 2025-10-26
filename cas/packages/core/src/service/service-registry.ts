// cas/packages/core/src/service/service-registry.ts

/**
 * @file Service Registry
 * @description A simple in-memory registry for managing services within the CAS.
 */

interface Service {
  start(): Promise<void> | void;
  stop(): Promise<void> | void;
  [key: string]: any; // Allow other properties
}

const services = new Map<string, Service>();

/**
 * Registers a new service.
 * @param {string} name - The name of the service.
 * @param {Service} service - The service object to register. Must have start() and stop() methods.
 * @throws {Error} If a service with the same name is already registered.
 * @throws {Error} If the service object does not have the required methods.
 */
export function registerService(name: string, service: Service): void {
  if (services.has(name)) {
    throw new Error(`Service "${name}" is already registered.`);
  }

  if (typeof service.start !== 'function' || typeof service.stop !== 'function') {
    throw new Error(`Service "${name}" must have start() and stop() methods.`);
  }

  services.set(name, service);
  console.log(`[ServiceRegistry] Service "${name}" registered.`);
}

/**
 * Retrieves a registered service.
 * @param {string} name - The name of the service to retrieve.
 * @returns {Service|undefined} The service object, or undefined if not found.
 */
export function getService(name: string): Service | undefined {
  return services.get(name);
}

/**
 * Unregisters a service.
 * @param {string} name - The name of the service to unregister.
 */
export function unregisterService(name: string): void {
  if (services.has(name)) {
    services.delete(name);
    console.log(`[ServiceRegistry] Service "${name}" unregistered.`);
  }
}

/**
 * Lists all registered services.
 * @returns {string[]} An array of registered service names.
 */
export function listServices(): string[] {
  return Array.from(services.keys());
}
