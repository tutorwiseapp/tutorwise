import { useState, useRef } from 'react';
import type { CreateListingInput } from '@tutorwise/shared-types';
import Button from '@/app/components/ui/Button';
import ImageUpload, { type ImageUploadRef } from '@/app/components/listings/ImageUpload';
import styles from '../../onboarding/OnboardingWizard.module.css';
import formSectionStyles from '@/app/components/ui/form/FormSection.module.css';
import formFieldStyles from '@/app/components/ui/form/FormField.module.css';
import { toast } from 'sonner';

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
  const [isUploading, setIsUploading] = useState(false);
  const imageUploadRef = useRef<ImageUploadRef>(null);

  const handleUploadComplete = (urls: string[]) => {
    setImageUrls(urls);
  };

  const handleSubmit = async () => {
    // Ensure profile picture (first image) is preserved
    const profilePicture = formData.images && formData.images.length > 0 ? formData.images[0] : null;

    // Check if there are unuploaded files
    if (imageUploadRef.current?.hasUnuploadedFiles()) {
      setIsUploading(true);
      toast.info('Uploading images...');

      try {
        // Trigger the upload of additional photos
        const uploadedUrls = await imageUploadRef.current.uploadImages();

        // Combine profile picture with additional photos
        const finalImages = profilePicture
          ? [profilePicture, ...uploadedUrls.filter(url => url !== profilePicture)]
          : uploadedUrls;

        // Submit with uploaded URLs
        const stepData = {
          location_type: locationType,
          location_city: city,
          location_postcode: postcode,
          video_url: videoUrl,
          images: finalImages,
        };
        onSubmit(stepData);
      } catch (error) {
        console.error('Upload error:', error);
        toast.error('Failed to upload images. Please try again.');
      } finally {
        setIsUploading(false);
      }
    } else {
      // No new files to upload, submit directly with existing images
      const stepData = {
        location_type: locationType,
        location_city: city,
        location_postcode: postcode,
        video_url: videoUrl,
        images: imageUrls,
      };
      onSubmit(stepData);
    }
  };

  return (
    <div className={styles.wizardStep}>
      <h2 className={styles.stepTitle}>Location & Media</h2>
      <p className={styles.stepDescription}>
        Where will you teach? Add some photos and a video to make your profile stand out.
      </p>

      <div className={formSectionStyles.formSection}>
        <h3 className={formSectionStyles.title}>Teaching Location</h3>
        {/* Location Type Radio Buttons */}
      </div>

      <div className={formSectionStyles.formSection}>
        <h3 className={formSectionStyles.title}>Additional Photos & Video</h3>
        <div className={formFieldStyles.formField}>
          <label className={formFieldStyles.label}>Upload Additional Photos (Optional)</label>
          <p className={formFieldStyles.description}>
            Your profile picture is already set as your main listing image.
            Add additional photos here to showcase your teaching space, materials, or qualifications.
          </p>
          <ImageUpload
            ref={imageUploadRef}
            onUploadComplete={handleUploadComplete}
            existingImages={imageUrls.slice(1)} // Exclude profile picture (first image)
          />
        </div>
        <div className={formFieldStyles.formField}>
          <label className={formFieldStyles.label}>YouTube Video URL</label>
          <p className={formFieldStyles.description}>Add a link to a YouTube video to introduce yourself.</p>
          <input
            type="text"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className={styles.input}
          />
        </div>
      </div>

      <div className={styles.buttonGroup}>
        <Button variant="outline" onClick={onBack} disabled={isUploading || isSaving}>Back</Button>
        <Button variant="outline" onClick={onSaveDraft} disabled={isUploading || isSaving}>Save Draft</Button>
        <Button onClick={handleSubmit} disabled={isUploading || isSaving}>
          {isUploading ? 'Uploading...' : isSaving ? 'Saving...' : 'Finish & Submit'}
        </Button>
      </div>
    </div>
  );
}