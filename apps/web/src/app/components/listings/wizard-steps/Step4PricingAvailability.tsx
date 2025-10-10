'use client';

import { useState } from 'react';
import type { CreateListingInput } from '@tutorwise/shared-types';
import Button from '@/app/components/ui/Button';

interface Step4Props {
  formData: Partial<CreateListingInput>;
  onNext: (data: Partial<CreateListingInput>) => void;
  onBack: () => void;
}

const HOURLY_RATE_RANGES = [
  { min: 15, max: 20, label: '£15 - £20 per hour' },
  { min: 20, max: 25, label: '£20 - £25 per hour' },
  { min: 25, max: 30, label: '£25 - £30 per hour' },
  { min: 30, max: 40, label: '£30 - £40 per hour' },
  { min: 40, max: 50, label: '£40 - £50 per hour' },
  { min: 50, max: 70, label: '£50 - £70 per hour' },
  { min: 70, max: 100, label: '£70 - £100 per hour' },
  { min: 100, max: 9999, label: '£100+ per hour' },
];

export default function Step4PricingAvailability({ formData, onNext, onBack }: Step4Props) {
  const [hourlyRate, setHourlyRate] = useState(formData.hourly_rate || 0);
  const [freeTrial, setFreeTrial] = useState(formData.free_trial || false);
  const [trialDuration, setTrialDuration] = useState(formData.trial_duration_minutes || 30);
  const [errors, setErrors] = useState<{ hourlyRate?: string }>({});

  const validate = () => {
    const newErrors: { hourlyRate?: string } = {};

    if (!hourlyRate || hourlyRate <= 0) {
      newErrors.hourlyRate = 'Please select an hourly rate';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinue = () => {
    if (validate()) {
      onNext({
        hourly_rate: hourlyRate,
        free_trial: freeTrial,
        trial_duration_minutes: freeTrial ? trialDuration : undefined,
      });
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Pricing & Availability</h2>
        <p className="text-gray-600">
          Set your rates and let students know when you&apos;re available.
        </p>
      </div>

      {/* Hourly Rate */}
      <div>
        <label className="block text-lg font-semibold text-gray-900 mb-3">
          Hourly Rate <span className="text-red-500">*</span>
        </label>
        {errors.hourlyRate && (
          <p className="mb-2 text-sm text-red-600">{errors.hourlyRate}</p>
        )}
        <p className="text-sm text-gray-600 mb-4">
          Select your hourly rate range (you can offer different rates for different subjects)
        </p>
        <div className="space-y-2">
          {HOURLY_RATE_RANGES.map((range) => (
            <label
              key={range.label}
              className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                hourlyRate >= range.min && hourlyRate < range.max
                  ? 'border-teal-500 bg-teal-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="rate"
                checked={hourlyRate >= range.min && hourlyRate < range.max}
                onChange={() => setHourlyRate(range.min)}
                className="w-4 h-4 text-teal-600 focus:ring-teal-500"
              />
              <span className="ml-3 text-sm font-medium text-gray-900">{range.label}</span>
            </label>
          ))}
        </div>

        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            💡 <strong>Pricing tip:</strong> Consider starting with a competitive rate to attract your first students, then increase based on demand and reviews.
          </p>
        </div>
      </div>

      {/* Free Trial */}
      <div>
        <label className="flex items-center space-x-3 cursor-pointer">
          <input
            type="checkbox"
            checked={freeTrial}
            onChange={(e) => setFreeTrial(e.target.checked)}
            className="w-5 h-5 text-teal-600 rounded focus:ring-teal-500"
          />
          <div>
            <span className="text-lg font-semibold text-gray-900">Offer Free Trial Session</span>
            <p className="text-sm text-gray-600">
              Attract more students by offering a trial lesson (recommended)
            </p>
          </div>
        </label>

        {freeTrial && (
          <div className="mt-4 ml-8">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Trial Session Duration
            </label>
            <select
              value={trialDuration}
              onChange={(e) => setTrialDuration(Number(e.target.value))}
              className="w-full max-w-xs px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
            >
              <option value={30}>30 minutes</option>
              <option value={45}>45 minutes</option>
              <option value={60}>60 minutes</option>
            </select>
          </div>
        )}
      </div>

      {/* Availability Note */}
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h4 className="text-sm font-semibold text-yellow-900 mb-1">Coming in Next Step</h4>
        <p className="text-sm text-yellow-800">
          In the next step, you&apos;ll set your availability schedule and location preferences.
        </p>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button onClick={onBack} variant="outline">
          ← Back
        </Button>
        <Button onClick={handleContinue}>
          Continue →
        </Button>
      </div>
    </div>
  );
}
