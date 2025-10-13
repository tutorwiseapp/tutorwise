import { useState } from 'react';
import type { CreateListingInput } from '@tutorwise/shared-types';
import Button from '@/app/components/ui/Button';
import FormSection from '@/app/components/listings/FormSection';
import FormField from '@/app/components/listings/FormField';
import ImageUpload from '@/app/components/listings/ImageUpload';
import styles from '../onboarding/OnboardingWizard.module.css';

interface Step5LocationMediaProps {
  formData: Partial<CreateListingInput>;
  onBack: () => void;
  onSubmit: (data: Partial<CreateListingInput>) => void;
  onSaveDraft: () => void;
  isSaving?: boolean;
}

export default function Step5LocationMedia({
  formData,
  onBack,
  onSubmit,
  onSaveDraft,
  isSaving = false,
}: Step5LocationMediaProps) {
  const [locationType, setLocationType] = useState(formData.location_type || 'online');
  const [city, setCity] = useState(formData.location_city || '');
  const [postcode, setPostcode] = useState(formData.location_postcode || '');
  const [videoUrl, setVideoUrl] = useState(formData.video_url || '');
  const [imageUrls, setImageUrls] = useState<string[]>(formData.images || []);

  const handleImageUpload = (files: File[]) => {
    // This is where you would trigger the actual upload to a server.
    // For now, we'll just log it and update the local state with mock URLs.
    console.log('TODO: Upload files to server:', files);

    // Create temporary blob URLs for preview
    const newImageUrls = files.map(file => URL.createObjectURL(file));
    setImageUrls(prev => [...prev, ...newImageUrls]);
  };

  const handleSubmit = () => {
    const stepData = {
      location_type: locationType,
      location_city: city,
      location_postcode: postcode,
      video_url: videoUrl,
      images: imageUrls,
    };
    onSubmit(stepData);
  };

  return (
    <div className={styles.wizardStep}>
      <h2 className={styles.stepTitle}>Location & Media</h2>
      <p className={styles.stepDescription}>
        Where will you teach? Add some photos and a video to make your profile stand out.
      </p>

      <FormSection title="Teaching Location">
        {/* Location Type Radio Buttons */}
      </FormSection>

      <FormSection title="Photos & Video">
        <FormField
          label="Upload Photos"
          description="Add up to 5 photos. A professional headshot is recommended for your main photo."
        >
          <ImageUpload onUpload={handleImageUpload} initialImageUrls={imageUrls} />
        </FormField>
        <FormField
          label="YouTube Video URL"
          description="Add a link to a YouTube video to introduce yourself."
        >
          <input
            type="text"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className={styles.input}
          />
        </FormField>
      </FormSection>

      <div className={styles.buttonGroup}>
        <Button variant="outline" onClick={onBack}>Back</Button>
        <Button variant="outline" onClick={onSaveDraft}>Save Draft</Button>
        <Button onClick={handleSubmit} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Finish & Submit'}
        </Button>
      </div>
    </div>
  );
}
