// cas/packages/core/src/service/service-registry.js

/**
 * @file Service Registry
 * @description A simple in-memory registry for managing services within the CAS.
 */

const services = new Map();

/**
 * Registers a new service.
 * @param {string} name - The name of the service.
 * @param {object} service - The service object to register. Must have start() and stop() methods.
 * @throws {Error} If a service with the same name is already registered.
 * @throws {Error} If the service object does not have the required methods.
 */
function registerService(name, service) {
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
 * @returns {object|undefined} The service object, or undefined if not found.
 */
function getService(name) {
  return services.get(name);
}

/**
 * Unregisters a service.
 * @param {string} name - The name of the service to unregister.
 */
function unregisterService(name) {
  if (services.has(name)) {
    services.delete(name);
    console.log(`[ServiceRegistry] Service "${name}" unregistered.`);
  }
}

/**
 * Lists all registered services.
 * @returns {string[]} An array of registered service names.
 */
function listServices() {
  return Array.from(services.keys());
}

module.exports = {
  registerService,
  getService,
  unregisterService,
  listServices,
};
