// cas/packages/core/tests/service-registry.test.js

const {
  registerService,
  getService,
  unregisterService,
  listServices,
} = require('../src/service/service-registry');

// Mock console.log to prevent logs from appearing during tests
let consoleLogSpy;
beforeEach(() => {
  consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  // Clear services before each test
  listServices().forEach(unregisterService);
});

afterEach(() => {
  consoleLogSpy.mockRestore();
});


describe('Service Registry', () => {
  const mockService = {
    start: () => Promise.resolve(),
    stop: () => Promise.resolve(),
  };

  it('should register a new service', () => {
    registerService('test-service', mockService);
    expect(listServices()).toContain('test-service');
  });

  it('should not allow registering a service with the same name twice', () => {
    registerService('test-service', mockService);
    expect(() => registerService('test-service', mockService)).toThrow(
      'Service "test-service" is already registered.'
    );
  });

  it('should not allow registering a service without a start method', () => {
    const invalidService = { stop: () => {} };
    expect(() => registerService('invalid-service', invalidService)).toThrow(
      'Service "invalid-service" must have start() and stop() methods.'
    );
  });

  it('should not allow registering a service without a stop method', () => {
    const invalidService = { start: () => {} };
    expect(() => registerService('invalid-service', invalidService)).toThrow(
      'Service "invalid-service" must have start() and stop() methods.'
    );
  });

  it('should retrieve a registered service', () => {
    registerService('test-service', mockService);
    const service = getService('test-service');
    expect(service).toBe(mockService);
  });

  it('should return undefined for a non-existent service', () => {
    const service = getService('non-existent-service');
    expect(service).toBeUndefined();
  });

  it('should unregister a service', () => {
    registerService('test-service', mockService);
    unregisterService('test-service');
    expect(listServices()).not.toContain('test-service');
  });

  it('should list all registered services', () => {
    registerService('service-1', mockService);
    registerService('service-2', mockService);
    expect(listServices()).toEqual(['service-1', 'service-2']);
  });
});
