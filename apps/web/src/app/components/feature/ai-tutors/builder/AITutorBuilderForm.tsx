/**
 * Filename: AITutorBuilderForm.tsx
 * Purpose: AI Tutor creation form - follows listing form pattern
 * Created: 2026-02-23
 * Version: v1.0
 *
 * Pattern: Single-page form with sections (like TutorOneToOneForm)
 * Sections: Basic Info, Skills & Template, Pricing
 * Optional: Materials and Links can be added after creation in detail page
 */

'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import HubForm from '@/app/components/hub/form/HubForm';
import UnifiedSelect from '@/app/components/ui/forms/UnifiedSelect';
import Button from '@/app/components/ui/actions/Button';
import styles from './AITutorBuilderForm.module.css';

interface AITutorBuilderFormProps {
  onSubmit: (data: AITutorFormData, shouldPublish: boolean) => Promise<void>;
  isSubmitting: boolean;
  initialData?: Partial<AITutorFormData>;
}

export interface AITutorFormData {
  name: string;
  display_name: string;
  subject: string;
  description: string;
  template_id: string | null;
  skills: string[];
  price_per_hour: number;
}

const SUBJECTS = [
  { value: 'maths', label: 'Maths' },
  { value: 'english', label: 'English' },
  { value: 'science', label: 'Science' },
  { value: 'biology', label: 'Biology' },
  { value: 'chemistry', label: 'Chemistry' },
  { value: 'physics', label: 'Physics' },
  { value: 'computing', label: 'Computing' },
  { value: 'history', label: 'History' },
  { value: 'geography', label: 'Geography' },
  { value: 'languages', label: 'Languages' },
  { value: 'business', label: 'Business' },
  { value: 'economics', label: 'Economics' },
  { value: 'psychology', label: 'Psychology' },
  { value: 'other', label: 'Other' },
];

export default function AITutorBuilderForm({
  onSubmit,
  isSubmitting,
  initialData,
}: AITutorBuilderFormProps) {
  const [formData, setFormData] = useState<AITutorFormData>({
    name: initialData?.name || '',
    display_name: initialData?.display_name || '',
    subject: initialData?.subject || '',
    description: initialData?.description || '',
    template_id: initialData?.template_id || null,
    skills: initialData?.skills || [],
    price_per_hour: initialData?.price_per_hour || 15,
  });

  const [customSkill, setCustomSkill] = useState('');
  const [errors, setErrors] = useState<Partial<Record<keyof AITutorFormData, string>>>({});

  // Fetch templates
  const { data: templates } = useQuery({
    queryKey: ['ai-tutor-templates'],
    queryFn: () => fetch('/api/ai-tutors/templates').then((r) => r.json()),
  });

  // Auto-generate name from display_name
  useEffect(() => {
    if (formData.display_name && !initialData?.name) {
      const slugName = formData.display_name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .slice(0, 100);
      setFormData((prev) => ({ ...prev, name: slugName }));
    }
  }, [formData.display_name, initialData?.name]);

  // Handle template selection
  const handleTemplateChange = (templateId: string | number) => {
    const id = String(templateId);
    setFormData((prev) => ({ ...prev, template_id: id || null }));

    // Apply template skills
    if (id && templates) {
      const template = templates.find((t: any) => t.id === id);
      if (template) {
        setFormData((prev) => ({ ...prev, skills: template.skills }));
      }
    } else {
      // Custom template - clear skills
      setFormData((prev) => ({ ...prev, skills: [] }));
    }
  };

  // Add custom skill
  const handleAddSkill = () => {
    if (!customSkill.trim()) return;

    if (formData.skills.includes(customSkill.trim())) {
      return; // Duplicate
    }

    setFormData((prev) => ({
      ...prev,
      skills: [...prev.skills, customSkill.trim()],
    }));
    setCustomSkill('');
  };

  // Remove skill
  const handleRemoveSkill = (skill: string) => {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s !== skill),
    }));
  };

  // Validate form
  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof AITutorFormData, string>> = {};

    if (!formData.display_name.trim()) {
      newErrors.display_name = 'Display name is required';
    }

    if (!formData.subject) {
      newErrors.subject = 'Subject is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (formData.skills.length === 0) {
      newErrors.skills = 'At least one skill is required';
    }

    if (formData.price_per_hour < 5 || formData.price_per_hour > 100) {
      newErrors.price_per_hour = 'Price must be between £5 and £100';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = async (shouldPublish: boolean) => {
    if (!validate()) {
      return;
    }

    await onSubmit(formData, shouldPublish);
  };

  return (
    <div className={styles.formContainer}>
      <HubForm.Root>
        {/* Basic Information */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Basic Information</h2>

          <div className={styles.formGroup}>
            <label htmlFor="display_name">
              Display Name <span className={styles.required}>*</span>
            </label>
            <input
              id="display_name"
              type="text"
              value={formData.display_name}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  display_name: e.target.value,
                }))
              }
              placeholder="e.g., Physics Pro, Maths Expert"
              className={errors.display_name ? styles.inputError : ''}
            />
            {errors.display_name && (
              <span className={styles.errorText}>{errors.display_name}</span>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="subject">
              Subject <span className={styles.required}>*</span>
            </label>
            <UnifiedSelect
              options={SUBJECTS}
              value={formData.subject}
              onChange={(value) =>
                setFormData((prev) => ({ ...prev, subject: String(value) }))
              }
              placeholder="Select subject"
            />
            {errors.subject && (
              <span className={styles.errorText}>{errors.subject}</span>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="description">
              Description <span className={styles.required}>*</span>
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              placeholder="Describe what your AI tutor specializes in..."
              rows={4}
              className={errors.description ? styles.inputError : ''}
            />
            {errors.description && (
              <span className={styles.errorText}>{errors.description}</span>
            )}
          </div>
        </div>

        {/* Skills & Template */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Skills & Template</h2>

          <div className={styles.formGroup}>
            <label htmlFor="template">
              Choose Template (or select Custom)
            </label>
            <UnifiedSelect
              options={[
                { value: '', label: 'Custom (add your own skills)' },
                ...(templates || []).map((t: any) => ({
                  value: t.id,
                  label: `${t.icon} ${t.name}`,
                })),
              ]}
              value={formData.template_id || ''}
              onChange={handleTemplateChange}
              placeholder="Select template"
            />
          </div>

          <div className={styles.formGroup}>
            <label>
              Skills <span className={styles.required}>*</span>
            </label>
            <div className={styles.skillsInput}>
              <input
                type="text"
                value={customSkill}
                onChange={(e) => setCustomSkill(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSkill();
                  }
                }}
                placeholder="Add a skill..."
                disabled={!!formData.template_id}
              />
              <Button
                onClick={handleAddSkill}
                disabled={!!formData.template_id}
                variant="secondary"
              >
                Add
              </Button>
            </div>
            <div className={styles.skillsList}>
              {formData.skills.map((skill) => (
                <span key={skill} className={styles.skillTag}>
                  {skill}
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(skill)}
                    className={styles.removeSkill}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            {errors.skills && (
              <span className={styles.errorText}>{errors.skills}</span>
            )}
          </div>
        </div>

        {/* Pricing */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Pricing</h2>

          <div className={styles.formGroup}>
            <label htmlFor="price_per_hour">
              Price per Hour <span className={styles.required}>*</span>
            </label>
            <div className={styles.priceInput}>
              <span className={styles.currency}>£</span>
              <input
                id="price_per_hour"
                type="number"
                min="5"
                max="100"
                step="0.01"
                value={formData.price_per_hour}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    price_per_hour: parseFloat(e.target.value) || 0,
                  }))
                }
                className={errors.price_per_hour ? styles.inputError : ''}
              />
            </div>
            <p className={styles.helperText}>
              Set between £5 and £100 per hour. You can change this later.
            </p>
            {errors.price_per_hour && (
              <span className={styles.errorText}>{errors.price_per_hour}</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          <Button
            onClick={() => handleSubmit(false)}
            disabled={isSubmitting}
            variant="secondary"
          >
            {isSubmitting ? 'Saving...' : 'Save as Draft'}
          </Button>
          <Button
            onClick={() => handleSubmit(true)}
            disabled={isSubmitting}
            variant="primary"
          >
            {isSubmitting ? 'Creating...' : 'Create & Publish'}
          </Button>
        </div>

        {/* Info Note */}
        <div className={styles.infoNote}>
          <p>
            <strong>Note:</strong> You can add materials (PDF/DOCX/PPTX) and
            URL links after creating your AI tutor in the detail page.
          </p>
        </div>
      </HubForm.Root>
    </div>
  );
}
