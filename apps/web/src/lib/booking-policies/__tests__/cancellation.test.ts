/**
 * Tests for cancellation policy logic
 * Updated: 2026-02-06 - Updated to UK/EU Stripe rates (1.5% + £0.20)
 */

import { calculateRefund, getCancellationPolicyPreview, CANCELLATION_POLICY, calculateStripeFee, calculateNetRefund } from '../cancellation';

describe('Cancellation Policy', () => {
  describe('Stripe Fee Calculations', () => {
    test('calculateStripeFee: £100 payment', () => {
      const fee = calculateStripeFee(100);
      // £100 * 1.5% + £0.20 = £1.50 + £0.20 = £1.70
      expect(fee).toBeCloseTo(1.70, 2);
    });

    test('calculateStripeFee: £50 payment', () => {
      const fee = calculateStripeFee(50);
      // £50 * 1.5% + £0.20 = £0.75 + £0.20 = £0.95
      expect(fee).toBeCloseTo(0.95, 2);
    });

    test('calculateNetRefund: £100 payment', () => {
      const netRefund = calculateNetRefund(100);
      // £100 - £1.70 = £98.30
      expect(netRefund).toBeCloseTo(98.30, 2);
    });
  });

  describe('Client Cancellations', () => {
    test('24+ hours: full refund (minus Stripe fee)', () => {
      const result = calculateRefund(50, 25, 'client', 'cancelled');
      // Client gets refund minus Stripe fee: £50 - £0.95 = £49.05
      expect(result.clientRefund).toBeCloseTo(49.05, 2);
      expect(result.clientRefundGross).toBe(50);
      expect(result.stripeFee).toBeCloseTo(0.95, 2);
      expect(result.tutorPayout).toBe(0);
      expect(result.caasImpact).toBe(0);
      expect(result.policyApplied).toBe('client_24h+');
    });

    test('<24 hours: no refund', () => {
      const result = calculateRefund(50, 12, 'client', 'cancelled');
      expect(result.clientRefund).toBe(0);
      expect(result.stripeFee).toBe(0);  // No Stripe fee since no refund issued
      expect(result.tutorPayout).toBe(50);
      expect(result.caasImpact).toBe(0);
      expect(result.policyApplied).toBe('client_<24h');
    });

    test('client no-show: no refund', () => {
      const result = calculateRefund(50, 0, 'client', 'no-show');
      expect(result.clientRefund).toBe(0);
      expect(result.stripeFee).toBe(0);  // No Stripe fee since no refund issued
      expect(result.tutorPayout).toBe(50);
      expect(result.caasImpact).toBe(0);
      expect(result.policyApplied).toBe('client_no_show');
    });

    test('edge case: exactly 24 hours', () => {
      const result = calculateRefund(50, 24, 'client', 'cancelled');
      expect(result.clientRefund).toBeCloseTo(49.05, 2); // At threshold = full refund minus Stripe fee
      expect(result.clientRefundGross).toBe(50);
      expect(result.stripeFee).toBeCloseTo(0.95, 2);
      expect(result.tutorPayout).toBe(0);
    });

    test('edge case: 23.9 hours', () => {
      const result = calculateRefund(50, 23.9, 'client', 'cancelled');
      expect(result.clientRefund).toBe(0); // Below threshold = no refund
      expect(result.stripeFee).toBe(0);
      expect(result.tutorPayout).toBe(50);
    });
  });

  describe('Tutor Cancellations', () => {
    test('tutor cancels: full refund (minus Stripe fee) + CaaS penalty', () => {
      const result = calculateRefund(50, 12, 'tutor', 'cancelled');
      expect(result.clientRefund).toBeCloseTo(49.05, 2);  // £50 - £0.95 Stripe fee
      expect(result.clientRefundGross).toBe(50);
      expect(result.stripeFee).toBeCloseTo(0.95, 2);
      expect(result.tutorPayout).toBe(0);
      expect(result.caasImpact).toBe(-10);
      expect(result.policyApplied).toBe('tutor_cancellation');
    });

    test('tutor no-show: full refund (minus Stripe fee) + major CaaS penalty', () => {
      const result = calculateRefund(50, 0, 'tutor', 'no-show');
      expect(result.clientRefund).toBeCloseTo(49.05, 2);  // £50 - £0.95 Stripe fee
      expect(result.clientRefundGross).toBe(50);
      expect(result.stripeFee).toBeCloseTo(0.95, 2);
      expect(result.tutorPayout).toBe(0);
      expect(result.caasImpact).toBe(-50);
      expect(result.policyApplied).toBe('tutor_no_show');
    });

    test('tutor cancellations: time-independent', () => {
      const early = calculateRefund(50, 48, 'tutor', 'cancelled');
      const late = calculateRefund(50, 1, 'tutor', 'cancelled');

      expect(early.clientRefund).toBe(late.clientRefund);
      expect(early.stripeFee).toBe(late.stripeFee);
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
      // Negative refund (0 - 0.20) = -0.20
      expect(result.clientRefund).toBeLessThanOrEqual(0);
      expect(result.tutorPayout).toBe(0);
    });

    test('large amount booking', () => {
      const result = calculateRefund(500, 12, 'client', 'cancelled');
      expect(result.clientRefund).toBe(0);
      expect(result.stripeFee).toBe(0);  // No refund = no Stripe fee
      expect(result.tutorPayout).toBe(500);
    });

    test('fractional hours', () => {
      const result1 = calculateRefund(50, 24.1, 'client', 'cancelled');
      expect(result1.clientRefund).toBeCloseTo(49.05, 2); // Just over threshold - refund minus Stripe fee

      const result2 = calculateRefund(50, 23.9, 'client', 'cancelled');
      expect(result2.clientRefund).toBe(0); // Just under threshold
    });

    test('large refund with Stripe fees', () => {
      const result = calculateRefund(1000, 48, 'tutor', 'cancelled');
      // £1000 * 1.5% + £0.20 = £15.00 + £0.20 = £15.20
      // Net refund = £1000 - £15.20 = £984.80
      expect(result.clientRefund).toBeCloseTo(984.80, 2);
      expect(result.clientRefundGross).toBe(1000);
      expect(result.stripeFee).toBeCloseTo(15.20, 2);
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

    test('Stripe fee constants (UK/EU cards)', () => {
      expect(CANCELLATION_POLICY.STRIPE_FEE_PERCENT).toBe(1.5);
      expect(CANCELLATION_POLICY.STRIPE_FEE_FIXED).toBe(0.20);
    });
  });
});
