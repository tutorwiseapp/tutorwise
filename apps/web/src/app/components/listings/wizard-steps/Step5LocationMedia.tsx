'use client';

import { useState } from 'react';
import type { CreateListingInput, LocationType } from '@tutorwise/shared-types';
import Button from '@/app/components/ui/Button';

interface Step5Props {
  formData: Partial<CreateListingInput>;
  onBack: () => void;
  onSubmit: (data: Partial<CreateListingInput>) => void;
  onSaveDraft: () => void;
  isSaving: boolean;
}

export default function Step5LocationMedia({
  formData,
  onBack,
  onSubmit,
  onSaveDraft,
  isSaving,
}: Step5Props) {
  const [locationType, setLocationType] = useState<LocationType>(formData.location_type || 'online');
  const [locationCity, setLocationCity] = useState(formData.location_city || '');
  const [locationPostcode, setLocationPostcode] = useState(formData.location_postcode || '');
  const [videoUrl, setVideoUrl] = useState(formData.video_url || '');
  const [status, setStatus] = useState<'draft' | 'published'>(
    formData.status === 'published' ? 'published' : 'draft'
  );
  const [errors, setErrors] = useState<{ locationType?: string; location?: string }>({});

  const validate = () => {
    const newErrors: { locationType?: string; location?: string } = {};

    if (!locationType) {
      newErrors.locationType = 'Please select at least one delivery method';
    }

    if ((locationType === 'in_person' || locationType === 'hybrid') && !locationCity.trim()) {
      newErrors.location = 'Please enter your location for in-person tutoring';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (publishNow: boolean) => {
    if (validate()) {
      onSubmit({
        location_type: locationType,
        location_city: locationCity.trim() || undefined,
        location_postcode: locationPostcode.trim() || undefined,
        video_url: videoUrl.trim() || undefined,
        status: publishNow ? 'published' : 'draft',
      });
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Location & Media</h2>
        <p className="text-gray-600">
          Final step! Let students know where you teach and add an optional introduction video.
        </p>
      </div>

      {/* Location Type */}
      <div>
        <label className="block text-lg font-semibold text-gray-900 mb-3">
          Delivery Mode <span className="text-red-500">*</span>
        </label>
        {errors.locationType && (
          <p className="mb-2 text-sm text-red-600">{errors.locationType}</p>
        )}
        <p className="text-sm text-gray-600 mb-4">
          How will you deliver your tutoring sessions?
        </p>
        <div className="space-y-3">
          <label
            className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all ${
              locationType === 'online'
                ? 'border-teal-500 bg-teal-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <input
              type="radio"
              name="location"
              checked={locationType === 'online'}
              onChange={() => setLocationType('online')}
              className="w-4 h-4 mt-1 text-teal-600 focus:ring-teal-500"
            />
            <div className="ml-3">
              <span className="text-sm font-medium text-gray-900">💻 Online Only</span>
              <p className="text-xs text-gray-600 mt-1">
                Teach via video call (Zoom, Teams, Google Meet, etc.)
              </p>
            </div>
          </label>

          <label
            className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all ${
              locationType === 'in_person'
                ? 'border-teal-500 bg-teal-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <input
              type="radio"
              name="location"
              checked={locationType === 'in_person'}
              onChange={() => setLocationType('in_person')}
              className="w-4 h-4 mt-1 text-teal-600 focus:ring-teal-500"
            />
            <div className="ml-3">
              <span className="text-sm font-medium text-gray-900">📍 In-Person Only</span>
              <p className="text-xs text-gray-600 mt-1">
                Face-to-face tutoring at your location or student&apos;s home
              </p>
            </div>
          </label>

          <label
            className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all ${
              locationType === 'hybrid'
                ? 'border-teal-500 bg-teal-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <input
              type="radio"
              name="location"
              checked={locationType === 'hybrid'}
              onChange={() => setLocationType('hybrid')}
              className="w-4 h-4 mt-1 text-teal-600 focus:ring-teal-500"
            />
            <div className="ml-3">
              <span className="text-sm font-medium text-gray-900">🌐 Hybrid (Both)</span>
              <p className="text-xs text-gray-600 mt-1">
                Flexible - offer both online and in-person options
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Location Details (if in-person or hybrid) */}
      {(locationType === 'in_person' || locationType === 'hybrid') && (
        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700">
            Your Location <span className="text-red-500">*</span>
          </label>
          {errors.location && (
            <p className="text-sm text-red-600">{errors.location}</p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <input
                type="text"
                value={locationCity}
                onChange={(e) => setLocationCity(e.target.value)}
                placeholder="City or Town"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
            <div>
              <input
                type="text"
                value={locationPostcode}
                onChange={(e) => setLocationPostcode(e.target.value)}
                placeholder="Postcode (optional)"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
          </div>
          <p className="text-xs text-gray-500">
            We&apos;ll only show your general area to students (not your exact address)
          </p>
        </div>
      )}

      {/* Introduction Video (Optional) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Introduction Video (Optional)
        </label>
        <input
          type="url"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          placeholder="https://youtube.com/watch?v=..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        />
        <p className="mt-1 text-xs text-gray-500">
          Add a YouTube or Vimeo link to introduce yourself (increases trust!)
        </p>
      </div>

      {/* Publish or Draft */}
      <div className="p-6 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Ready to publish?</h3>
        <div className="space-y-3">
          <label className="flex items-start cursor-pointer">
            <input
              type="radio"
              name="status"
              checked={status === 'draft'}
              onChange={() => setStatus('draft')}
              className="w-4 h-4 mt-1 text-gray-600 focus:ring-gray-500"
            />
            <div className="ml-3">
              <span className="text-sm font-medium text-gray-900">Save as Draft</span>
              <p className="text-xs text-gray-600">You can preview and edit before publishing</p>
            </div>
          </label>

          <label className="flex items-start cursor-pointer">
            <input
              type="radio"
              name="status"
              checked={status === 'published'}
              onChange={() => setStatus('published')}
              className="w-4 h-4 mt-1 text-teal-600 focus:ring-teal-500"
            />
            <div className="ml-3">
              <span className="text-sm font-medium text-gray-900">Publish Now</span>
              <p className="text-xs text-gray-600">Make your listing visible to students immediately</p>
            </div>
          </label>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 pt-4">
        <div className="flex gap-2">
          <Button onClick={onBack} variant="outline">
            ← Back
          </Button>
          <Button onClick={onSaveDraft} variant="outline" disabled={isSaving}>
            Save for Later
          </Button>
        </div>

        <Button
          onClick={() => handleSubmit(status === 'published')}
          disabled={isSaving}
          className="px-8"
        >
          {isSaving ? 'Saving...' : status === 'published' ? 'Publish Listing ✓' : 'Save as Draft'}
        </Button>
      </div>
    </div>
  );
}
