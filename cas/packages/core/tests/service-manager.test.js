// cas/packages/core/tests/service-manager.test.js

const {
  startService,
  stopService,
  startAllServices,
  stopAllServices,
} = require('../src/service/service-manager');
const {
  registerService,
  unregisterService,
  listServices,
} = require('../src/service/service-registry');

// Mock console.log and console.error
let consoleLogSpy;
let consoleErrorSpy;
beforeEach(() => {
  consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  // Clear services before each test
  listServices().forEach(unregisterService);
});

afterEach(() => {
  consoleLogSpy.mockRestore();
  consoleErrorSpy.mockRestore();
});

describe('Service Manager', () => {
  const mockService1 = {
    start: jest.fn(() => Promise.resolve()),
    stop: jest.fn(() => Promise.resolve()),
  };

  const mockService2 = {
    start: jest.fn(() => Promise.resolve()),
    stop: jest.fn(() => Promise.resolve()),
  };

  beforeEach(() => {
    mockService1.start.mockClear();
    mockService1.stop.mockClear();
    mockService2.start.mockClear();
    mockService2.stop.mockClear();
  });

  it('should start a registered service', async () => {
    registerService('service-1', mockService1);
    await startService('service-1');
    expect(mockService1.start).toHaveBeenCalledTimes(1);
  });

  it('should log an error if trying to start a non-existent service', async () => {
    await startService('non-existent-service');
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[ServiceManager] Service "non-existent-service" not found.'
    );
  });

  it('should stop a registered service', async () => {
    registerService('service-1', mockService1);
    await stopService('service-1');
    expect(mockService1.stop).toHaveBeenCalledTimes(1);
  });

  it('should log an error if trying to stop a non-existent service', async () => {
    await stopService('non-existent-service');
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[ServiceManager] Service "non-existent-service" not found.'
    );
  });

  it('should start all registered services', async () => {
    registerService('service-1', mockService1);
    registerService('service-2', mockService2);
    await startAllServices();
    expect(mockService1.start).toHaveBeenCalledTimes(1);
    expect(mockService2.start).toHaveBeenCalledTimes(1);
  });

  it('should stop all registered services', async () => {
    registerService('service-1', mockService1);
    registerService('service-2', mockService2);
    await stopAllServices();
    expect(mockService1.stop).toHaveBeenCalledTimes(1);
    expect(mockService2.stop).toHaveBeenCalledTimes(1);
  });
});
