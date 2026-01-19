/**
 * Filename: StudyPackageForm.tsx
 * Purpose: Complete study package listing form
 * Usage: Provider (tutor/agent) study-package service type
 * Created: 2026-01-19
 */

'use client';

import { useState, useEffect } from 'react';
import type { CreateListingInput } from '@tutorwise/shared-types';
import {
  SubjectsSection,
  LevelsSection,
  DescriptionSection,
  DeliveryModeSection,
  FormActionsSection,
} from '../shared';
import {
  BasicInformationSection,
  PricingSection,
  ImagesSection,
} from './index';
import { StudyPackageFields } from '../types';
import styles from '../shared/FormSections.module.css';

interface StudyPackageFormProps {
  onSubmit: (data: CreateListingInput) => void;
  onCancel: () => void;
  isSaving?: boolean;
  initialData?: Partial<CreateListingInput>;
}

export default function StudyPackageForm({
  onSubmit,
  onCancel,
  isSaving = false,
  initialData = {},
}: StudyPackageFormProps) {
  const [title, setTitle] = useState(initialData.title || '');
  const [subjects, setSubjects] = useState<string[]>(initialData.subjects || []);
  const [levels, setLevels] = useState<string[]>(initialData.levels || []);
  const [description, setDescription] = useState(initialData.description || '');
  const [packageType, setPackageType] = useState(initialData.package_type || '');
  const [materialUrl, setMaterialUrl] = useState(initialData.material_url || '');
  const [deliveryMode, setDeliveryMode] = useState('');
  const [packagePrice, setPackagePrice] = useState(initialData.package_price?.toString() || '');
  const [packageSessions, setPackageSessions] = useState(initialData.package_sessions?.toString() || '');
  const [images, setImages] = useState<string[]>(initialData.images || []);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    localStorage.setItem('study_package_draft', JSON.stringify({
      title, subjects, levels, description, packageType, materialUrl, deliveryMode, packagePrice, packageSessions, images
    }));
  }, [title, subjects, levels, description, packageType, materialUrl, deliveryMode, packagePrice, packageSessions, images]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!title.trim() || title.length < 10) newErrors.title = 'Title must be at least 10 characters';
    if (subjects.length === 0) newErrors.subjects = 'Please select at least one subject';
    if (levels.length === 0) newErrors.levels = 'Please select at least one level';
    if (!description.trim() || description.length < 50) newErrors.description = 'Description must be at least 50 characters';
    if (!packageType) newErrors.packageType = 'Please select a package type';
    if (!deliveryMode) newErrors.deliveryMode = 'Please select at least one delivery mode';
    if (!packagePrice || parseFloat(packagePrice) <= 0) newErrors.packagePrice = 'Please enter a valid package price';
    if (!packageSessions || parseInt(packageSessions) <= 0) newErrors.packageSessions = 'Please enter number of sessions';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePublish = () => {
    if (!validateForm()) {
      document.querySelector(`.${styles.inputError}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    onSubmit({
      listing_type: 'service',
      service_type: 'study-package',
      title,
      subjects,
      levels,
      description,
      package_type: packageType,
      material_url: materialUrl || undefined,
      delivery_mode: deliveryMode,
      package_price: parseFloat(packagePrice),
      package_sessions: parseInt(packageSessions),
      images,
      status: 'published',
    } as any);
  };

  return (
    <div className={styles.formContainer}>
      <div className={styles.formHeader}>
        <h1 className={styles.formTitle}>Create Study Package</h1>
        <p className={styles.formSubtitle}>Set up your comprehensive study package or course</p>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); handlePublish(); }}>
        <BasicInformationSection title={title} onTitleChange={setTitle} showHeadline={false} showBio={false}
          titleLabel="Package Title" titlePlaceholder="E.g., Complete GCSE Maths Revision Package - 10 Sessions" errors={errors} />

        <div className={styles.twoColumnLayout}>
          <SubjectsSection selectedSubjects={subjects} onSubjectsChange={setSubjects} label="Subjects Covered"
            placeholder="Select subjects" required={true} errors={errors} />
          <LevelsSection selectedLevels={levels} onLevelsChange={setLevels} label="Education Levels"
            placeholder="Select levels" required={true} errors={errors} />
        </div>

        <DescriptionSection description={description} onDescriptionChange={setDescription} label="Package Description"
          placeholder="Describe what's included, learning outcomes, structure of the package..." minLength={50} maxLength={1000} required={true} errors={errors} />

        <StudyPackageFields packageType={packageType} materialUrl={materialUrl} onPackageTypeChange={setPackageType}
          onMaterialUrlChange={setMaterialUrl} required={true} errors={errors} />

        <PricingSection packagePrice={packagePrice} packageSessions={packageSessions} onPackagePriceChange={setPackagePrice}
          onPackageSessionsChange={setPackageSessions} showHourlyRate={false} showPackagePricing={true}
          packagePriceLabel="Package Price" required={true} errors={errors} />

        <DeliveryModeSection deliveryMode={deliveryMode} onDeliveryModeChange={setDeliveryMode} label="Package Delivery Format"
          required={true} errors={errors} />

        <ImagesSection images={images} onImagesChange={setImages} label="Package Images"
          helpText="Add photos to showcase your package" required={false} errors={errors} />

        <FormActionsSection onSaveDraft={() => alert('Draft saved!')} onCancel={onCancel} onPublish={handlePublish}
          isSaving={isSaving} publishLabel="Publish Package" />
      </form>
    </div>
  );
}
