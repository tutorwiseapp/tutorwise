// cas/packages/core/tests/logger.test.ts

import { Logger } from '../src/utils/logger';

describe('Logger', () => {
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it('should log info messages by default', () => {
    const logger = new Logger();
    logger.info('test message');
    expect(consoleLogSpy).toHaveBeenCalled();
  });

  it('should log error messages by default', () => {
    const logger = new Logger();
    logger.error('test message');
    expect(consoleLogSpy).toHaveBeenCalled();
  });

  it('should log warn messages by default', () => {
    const logger = new Logger();
    logger.warn('test message');
    expect(consoleLogSpy).toHaveBeenCalled();
  });

  it('should not log debug messages by default', () => {
    const logger = new Logger();
    logger.debug('test message');
    expect(consoleLogSpy).not.toHaveBeenCalled();
  });

  it('should log debug messages when LOG_LEVEL is set to debug', () => {
    const logger = new Logger('debug');
    logger.debug('test message');
    expect(consoleLogSpy).toHaveBeenCalled();
  });

  it('should not log info messages when LOG_LEVEL is set to warn', () => {
    const logger = new Logger('warn');
    logger.info('test message');
    expect(consoleLogSpy).not.toHaveBeenCalled();
  });
});
