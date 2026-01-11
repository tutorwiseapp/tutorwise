/**
 * Filename: useAutoSave.test.ts
 * Purpose: Unit tests for auto-save hook
 * Created: 2026-01-10
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useAutoSave } from '../useAutoSave';

describe('useAutoSave', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should start in idle state', () => {
    const mockSave = jest.fn();
    const { result } = renderHook(() =>
      useAutoSave({
        data: { test: 'value' },
        onSave: mockSave,
      })
    );

    expect(result.current.saveStatus).toBe('idle');
    expect(result.current.lastSaved).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should debounce save calls', async () => {
    const mockSave = jest.fn().mockResolvedValue(undefined);
    const { result, rerender } = renderHook(
      ({ data }) => useAutoSave({ data, onSave: mockSave, debounceMs: 5000 }),
      { initialProps: { data: { test: 'initial' } } }
    );

    // Change data
    rerender({ data: { test: 'updated' } });

    // Should be pending immediately
    await waitFor(() => {
      expect(result.current.saveStatus).toBe('pending');
    });

    // Should NOT have called save yet
    expect(mockSave).not.toHaveBeenCalled();

    // Fast-forward 5 seconds
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    // Now save should be called
    await waitFor(() => {
      expect(mockSave).toHaveBeenCalledWith({ test: 'updated' });
      expect(result.current.saveStatus).toBe('success');
    });
  });

  it('should reset debounce timer on rapid changes', async () => {
    const mockSave = jest.fn().mockResolvedValue(undefined);
    const { result, rerender } = renderHook(
      ({ data }) => useAutoSave({ data, onSave: mockSave, debounceMs: 5000 }),
      { initialProps: { data: { test: 'initial' } } }
    );

    // Change 1
    rerender({ data: { test: 'change1' } });
    act(() => jest.advanceTimersByTime(3000)); // 3 seconds

    // Change 2 (resets timer)
    rerender({ data: { test: 'change2' } });
    act(() => jest.advanceTimersByTime(3000)); // Another 3 seconds (total 6s, but timer reset)

    // Should NOT have saved yet
    expect(mockSave).not.toHaveBeenCalled();

    // Advance remaining 2 seconds
    act(() => jest.advanceTimersByTime(2000));

    // Now it should save
    await waitFor(() => {
      expect(mockSave).toHaveBeenCalledWith({ test: 'change2' });
    });
  });

  it('should handle save errors', async () => {
    const mockSave = jest.fn().mockRejectedValue(new Error('Network error'));
    const mockOnError = jest.fn();

    const { result, rerender } = renderHook(
      ({ data }) =>
        useAutoSave({
          data,
          onSave: mockSave,
          debounceMs: 1000,
          onError: mockOnError,
        }),
      { initialProps: { data: { test: 'initial' } } }
    );

    rerender({ data: { test: 'updated' } });

    act(() => jest.advanceTimersByTime(1000));

    await waitFor(() => {
      expect(result.current.saveStatus).toBe('error');
      expect(result.current.error?.message).toBe('Network error');
      expect(mockOnError).toHaveBeenCalled();
    });
  });

  it('should call onSuccess callback on successful save', async () => {
    const mockSave = jest.fn().mockResolvedValue(undefined);
    const mockOnSuccess = jest.fn();

    const { result, rerender } = renderHook(
      ({ data }) =>
        useAutoSave({
          data,
          onSave: mockSave,
          debounceMs: 1000,
          onSuccess: mockOnSuccess,
        }),
      { initialProps: { data: { test: 'initial' } } }
    );

    rerender({ data: { test: 'updated' } });
    act(() => jest.advanceTimersByTime(1000));

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
      expect(result.current.saveStatus).toBe('success');
    });
  });

  it('should respect enabled flag', async () => {
    const mockSave = jest.fn().mockResolvedValue(undefined);

    const { result, rerender } = renderHook(
      ({ data }) =>
        useAutoSave({
          data,
          onSave: mockSave,
          debounceMs: 1000,
          enabled: false,
        }),
      { initialProps: { data: { test: 'initial' } } }
    );

    rerender({ data: { test: 'updated' } });
    act(() => jest.advanceTimersByTime(1000));

    // Should not save when disabled
    expect(mockSave).not.toHaveBeenCalled();
    expect(result.current.saveStatus).toBe('idle');
  });

  it('should allow manual trigger', async () => {
    const mockSave = jest.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useAutoSave({
        data: { test: 'value' },
        onSave: mockSave,
        debounceMs: 5000,
      })
    );

    // Manually trigger save
    act(() => {
      result.current.triggerSave();
    });

    await waitFor(() => {
      expect(mockSave).toHaveBeenCalledWith({ test: 'value' });
      expect(result.current.saveStatus).toBe('success');
    });
  });
});

describe('formatLastSaved', () => {
  it('should format recent saves correctly', () => {
    const { formatLastSaved } = require('../useAutoSave');

    const now = new Date();
    const fiveSecondsAgo = new Date(now.getTime() - 5000);
    const twoMinutesAgo = new Date(now.getTime() - 120000);

    expect(formatLastSaved(fiveSecondsAgo)).toBe('Saved 5 seconds ago');
    expect(formatLastSaved(twoMinutesAgo)).toBe('Saved 2 minutes ago');
  });

  it('should return empty string for null', () => {
    const { formatLastSaved } = require('../useAutoSave');
    expect(formatLastSaved(null)).toBe('');
  });
});
