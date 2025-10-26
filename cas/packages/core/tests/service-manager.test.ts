// cas/packages/core/tests/service-manager.test.ts

import {
  startService,
  stopService,
  startAllServices,
  stopAllServices,
} from '../src/service/service-manager';
import {
  registerService,
  unregisterService,
  listServices,
} from '../src/service/service-registry';

interface MockService {
  start: jest.Mock<Promise<void>>;
  stop: jest.Mock<Promise<void>>;
}

// Mock console.log and console.error
let consoleLogSpy: jest.SpyInstance;
let consoleErrorSpy: jest.SpyInstance;
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
  const mockService1: MockService = {
    start: jest.fn(() => Promise.resolve()),
    stop: jest.fn(() => Promise.resolve()),
  };

  const mockService2: MockService = {
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
    registerService('service-1', mockService1 as any);
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
    registerService('service-1', mockService1 as any);
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
    registerService('service-1', mockService1 as any);
    registerService('service-2', mockService2 as any);
    await startAllServices();
    expect(mockService1.start).toHaveBeenCalledTimes(1);
    expect(mockService2.start).toHaveBeenCalledTimes(1);
  });

  it('should stop all registered services', async () => {
    registerService('service-1', mockService1 as any);
    registerService('service-2', mockService2 as any);
    await stopAllServices();
    expect(mockService1.stop).toHaveBeenCalledTimes(1);
    expect(mockService2.stop).toHaveBeenCalledTimes(1);
  });
});
