/**
 * Filename: AITutorBuilderForm.tsx
 * Purpose: AI Tutor creation form - follows listing form pattern
 * Created: 2026-02-23
 * Version: v1.1 (Phase 2)
 * Updated: 2026-02-24 - Integrated SkillSelector with custom skills support
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
import SkillSelector, { Skill } from '@/app/components/feature/ai-tutors/SkillSelector';
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
  skills: Skill[]; // Updated to support custom skills
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
    price_per_hour: initialData?.price_per_hour || 0,
  });

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

    // Apply template data
    if (id && templates) {
      const template = templates.find((t: any) => t.id === id);
      if (template) {
        // Convert template skills (string[]) to Skill[] objects
        const templateSkills: Skill[] = (template.skills || []).map((skillName: string) => ({
          name: skillName,
          is_custom: false, // Template skills are always predefined
        }));

        setFormData((prev) => ({
          ...prev,
          skills: templateSkills,
          subject: template.subject || prev.subject,
          display_name: template.displayName || prev.display_name,
          description: template.tutorDescription || prev.description,
          price_per_hour: template.suggestedPrice || prev.price_per_hour,
        }));
      }
    } else {
      // Custom template - clear skills only
      setFormData((prev) => ({ ...prev, skills: [] }));
    }
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
    <HubForm.Root>
      {/* Section 1: Basic Information */}
      <HubForm.Section title="Basic Information">
        <HubForm.Grid>
          {/* Display Name */}
          <HubForm.Field label="Display Name" required isEditing={true}>
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
            />
            {errors.display_name && (
              <span className={styles.errorText}>{errors.display_name}</span>
            )}
          </HubForm.Field>

          {/* Subject */}
          <HubForm.Field label="Subject" required isEditing={true}>
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
          </HubForm.Field>

          {/* Description - Full Width */}
          <div style={{ gridColumn: '1 / -1' }}>
            <HubForm.Field label="Description" required isEditing={true}>
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
                className={styles.textarea}
              />
              {errors.description && (
                <span className={styles.errorText}>{errors.description}</span>
              )}
            </HubForm.Field>
          </div>
        </HubForm.Grid>
      </HubForm.Section>

      {/* Section 2: Skills & Template */}
      <HubForm.Section title="Skills & Template">
        <HubForm.Grid>
          {/* Template Selector - Full Width */}
          <div style={{ gridColumn: '1 / -1' }}>
            <HubForm.Field label="Choose Template (or select Custom)" isEditing={true}>
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
            </HubForm.Field>
          </div>

          {/* Skills Selector - Full Width */}
          <div style={{ gridColumn: '1 / -1' }}>
            <SkillSelector
              selectedSkills={formData.skills}
              onSkillsChange={(skills) =>
                setFormData((prev) => ({ ...prev, skills }))
              }
              disabled={!!formData.template_id}
              error={errors.skills}
            />
            {formData.template_id && (
              <p className={styles.helperText}>
                Using skills from template. Clear template to add custom skills.
              </p>
            )}
          </div>
        </HubForm.Grid>
      </HubForm.Section>

      {/* Section 3: Pricing */}
      <HubForm.Section title="Pricing">
        <HubForm.Grid>
          <HubForm.Field label="Price per Hour (£/hour)" required isEditing={true}>
            <input
              id="price_per_hour"
              type="number"
              min="5"
              max="100"
              step="0.01"
              value={formData.price_per_hour || ''}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  price_per_hour: parseFloat(e.target.value) || 0,
                }))
              }
              placeholder="£15"
            />
            <p className={styles.helperText}>
              Set between £5 and £100 per hour. You can change this later.
            </p>
            {errors.price_per_hour && (
              <span className={styles.errorText}>{errors.price_per_hour}</span>
            )}
          </HubForm.Field>
        </HubForm.Grid>
      </HubForm.Section>

      {/* Action Buttons */}
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
    </HubForm.Root>
  );
}
