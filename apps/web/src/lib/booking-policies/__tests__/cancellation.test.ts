/**
 * Tests for cancellation policy logic
 */

import { calculateRefund, getCancellationPolicyPreview, CANCELLATION_POLICY } from '../cancellation';

describe('Cancellation Policy', () => {
  describe('Client Cancellations', () => {
    test('24+ hours: full refund', () => {
      const result = calculateRefund(50, 25, 'client', 'cancelled');
      expect(result.clientRefund).toBe(50);
      expect(result.tutorPayout).toBe(0);
      expect(result.caasImpact).toBe(0);
      expect(result.policyApplied).toBe('client_24h+');
    });

    test('<24 hours: no refund', () => {
      const result = calculateRefund(50, 12, 'client', 'cancelled');
      expect(result.clientRefund).toBe(0);
      expect(result.tutorPayout).toBe(50);
      expect(result.caasImpact).toBe(0);
      expect(result.policyApplied).toBe('client_<24h');
    });

    test('client no-show: no refund', () => {
      const result = calculateRefund(50, 0, 'client', 'no-show');
      expect(result.clientRefund).toBe(0);
      expect(result.tutorPayout).toBe(50);
      expect(result.caasImpact).toBe(0);
      expect(result.policyApplied).toBe('client_no_show');
    });

    test('edge case: exactly 24 hours', () => {
      const result = calculateRefund(50, 24, 'client', 'cancelled');
      expect(result.clientRefund).toBe(50); // At threshold = full refund
      expect(result.tutorPayout).toBe(0);
    });

    test('edge case: 23.9 hours', () => {
      const result = calculateRefund(50, 23.9, 'client', 'cancelled');
      expect(result.clientRefund).toBe(0); // Below threshold = no refund
      expect(result.tutorPayout).toBe(50);
    });
  });

  describe('Tutor Cancellations', () => {
    test('tutor cancels: full refund + CaaS penalty', () => {
      const result = calculateRefund(50, 12, 'tutor', 'cancelled');
      expect(result.clientRefund).toBe(50);
      expect(result.tutorPayout).toBe(0);
      expect(result.caasImpact).toBe(-10);
      expect(result.policyApplied).toBe('tutor_cancellation');
    });

    test('tutor no-show: full refund + major CaaS penalty', () => {
      const result = calculateRefund(50, 0, 'tutor', 'no-show');
      expect(result.clientRefund).toBe(50);
      expect(result.tutorPayout).toBe(0);
      expect(result.caasImpact).toBe(-50);
      expect(result.policyApplied).toBe('tutor_no_show');
    });

    test('tutor cancellations: time-independent', () => {
      const early = calculateRefund(50, 48, 'tutor', 'cancelled');
      const late = calculateRefund(50, 1, 'tutor', 'cancelled');

      expect(early.clientRefund).toBe(late.clientRefund);
      expect(early.caasImpact).toBe(late.caasImpact);
    });
  });

  describe('Policy Preview', () => {
    test('preview with 24+ hours', () => {
      const preview = getCancellationPolicyPreview(30, 50);
      expect(preview.clientRefund).toBe('£50.00 (100% refund)');
      expect(preview.tutorPayout).toBe('£0.00');
      expect(preview.warning).toBeNull();
    });

    test('preview with <24 hours', () => {
      const preview = getCancellationPolicyPreview(10, 50);
      expect(preview.clientRefund).toBe('£0.00 (No refund)');
      expect(preview.tutorPayout).toBe('£50.00 (Tutor receives full payment)');
      expect(preview.warning).toContain('Less than 24 hours');
    });
  });

  describe('Edge Cases', () => {
    test('zero amount booking', () => {
      const result = calculateRefund(0, 48, 'client', 'cancelled');
      expect(result.clientRefund).toBe(0);
      expect(result.tutorPayout).toBe(0);
    });

    test('large amount booking', () => {
      const result = calculateRefund(500, 12, 'client', 'cancelled');
      expect(result.clientRefund).toBe(0);
      expect(result.tutorPayout).toBe(500);
    });

    test('fractional hours', () => {
      const result1 = calculateRefund(50, 24.1, 'client', 'cancelled');
      expect(result1.clientRefund).toBe(50); // Just over threshold

      const result2 = calculateRefund(50, 23.9, 'client', 'cancelled');
      expect(result2.clientRefund).toBe(0); // Just under threshold
    });
  });

  describe('Policy Constants', () => {
    test('threshold is 24 hours', () => {
      expect(CANCELLATION_POLICY.CLIENT_FULL_REFUND_THRESHOLD).toBe(24);
    });

    test('client before threshold', () => {
      expect(CANCELLATION_POLICY.client.beforeThreshold.refundPercent).toBe(100);
      expect(CANCELLATION_POLICY.client.beforeThreshold.tutorPayoutPercent).toBe(0);
    });

    test('client after threshold', () => {
      expect(CANCELLATION_POLICY.client.afterThreshold.refundPercent).toBe(0);
      expect(CANCELLATION_POLICY.client.afterThreshold.tutorPayoutPercent).toBe(100);
    });

    test('tutor cancellation penalty', () => {
      expect(CANCELLATION_POLICY.tutor.cancellation.caasImpact).toBe(-10);
    });

    test('tutor no-show penalty', () => {
      expect(CANCELLATION_POLICY.tutor.noShow.caasImpact).toBe(-50);
    });
  });
});
