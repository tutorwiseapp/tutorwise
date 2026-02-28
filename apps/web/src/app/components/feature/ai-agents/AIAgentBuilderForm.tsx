/**
 * AI Agent Builder Form
 *
 * Enhanced form for creating all types of AI agents (not just tutors).
 * Supports 5 agent types: tutor, coursework, study_buddy, research_assistant, exam_prep
 *
 * Created: 2026-02-27
 * Phase: 4 - UI Updates
 * Extends: AIAgentBuilderForm with agent type selection
 */

'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { AIAgentType } from '@sage/agents';
import HubForm from '@/app/components/hub/form/HubForm';
import UnifiedSelect from '@/app/components/ui/forms/UnifiedSelect';
import Button from '@/app/components/ui/actions/Button';
import SkillSelector, { Skill } from '@/app/components/feature/ai-agents/SkillSelector';
import AgentTypeSelector, { getAgentTypeMetadata } from './AgentTypeSelector';
import styles from './AIAgentBuilderForm.module.css';

interface AIAgentBuilderFormProps {
  onSubmit: (data: AIAgentFormData, shouldPublish: boolean) => Promise<void>;
  isSubmitting: boolean;
  initialData?: Partial<AIAgentFormData>;
  onCancel?: () => void;
  isEditing?: boolean;
  isAdminMode?: boolean;
}

export interface AIAgentFormData {
  agent_type: AIAgentType;
  name: string;
  display_name: string;
  subject: string;
  level?: string;
  description: string;
  template_id: string | null;
  skills: Skill[];
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
  { value: 'general', label: 'General (All Subjects)' },
  { value: 'other', label: 'Other' },
];

const LEVELS = [
  { value: 'ks1', label: 'Key Stage 1' },
  { value: 'ks2', label: 'Key Stage 2' },
  { value: 'ks3', label: 'Key Stage 3' },
  { value: 'gcse', label: 'GCSE' },
  { value: 'a-level', label: 'A-Level' },
  { value: 'university', label: 'University' },
  { value: 'adult', label: 'Adult Learning' },
];

export default function AIAgentBuilderForm({
  onSubmit,
  isSubmitting,
  initialData,
  onCancel,
  isEditing = false,
  isAdminMode = false,
}: AIAgentBuilderFormProps) {
  const [formData, setFormData] = useState<AIAgentFormData>({
    agent_type: initialData?.agent_type || 'tutor',
    name: initialData?.name || '',
    display_name: initialData?.display_name || '',
    subject: initialData?.subject || '',
    level: initialData?.level || '',
    description: initialData?.description || '',
    template_id: initialData?.template_id || null,
    skills: initialData?.skills || [],
    price_per_hour: initialData?.price_per_hour || 5,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof AIAgentFormData, string>>>({});
  const [currentStep, setCurrentStep] = useState<'type' | 'details'>(
    isEditing ? 'details' : 'type'
  );

  // Fetch templates
  const { data: templates } = useQuery({
    queryKey: ['ai-tutor-templates'],
    queryFn: () => fetch('/api/ai-agents/templates').then((r) => r.json()),
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

  // Update defaults when agent type changes
  useEffect(() => {
    const metadata = getAgentTypeMetadata(formData.agent_type);
    if (metadata?.defaultSubject && !isEditing) {
      setFormData((prev) => ({ ...prev, subject: metadata.defaultSubject! }));
    }
  }, [formData.agent_type, isEditing]);

  // Handle agent type change
  const handleAgentTypeChange = (agent_type: AIAgentType) => {
    setFormData((prev) => ({ ...prev, agent_type }));
    setCurrentStep('details');
  };

  // Handle template selection
  const handleTemplateChange = (templateId: string | number) => {
    const id = String(templateId);
    setFormData((prev) => ({ ...prev, template_id: id || null }));

    if (id && templates) {
      const template = templates.find((t: any) => t.id === id);
      if (template) {
        const templateSkills: Skill[] = (template.skills || []).map((skillName: string) => ({
          name: skillName,
          is_custom: false,
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
      setFormData((prev) => ({ ...prev, skills: [] }));
    }
  };

  // Validate form
  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof AIAgentFormData, string>> = {};

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

    // Different pricing validation for different agent types
    if (formData.agent_type === 'tutor') {
      if (formData.price_per_hour < 5 || formData.price_per_hour > 100) {
        newErrors.price_per_hour = 'Price must be between £5 and £100';
      }
    } else {
      // Other agent types can have different pricing
      if (formData.price_per_hour < 3 || formData.price_per_hour > 50) {
        newErrors.price_per_hour = 'Price must be between £3 and £50';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent, shouldPublish: boolean = false) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    await onSubmit(formData, shouldPublish);
  };

  // Render step 1: Agent type selection
  if (currentStep === 'type' && !isEditing) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>Choose Your AI Agent Type</h2>
          <p className={styles.subtitle}>
            Select the type of AI agent you want to create. Each type is specialized for
            different tasks and use cases.
          </p>
        </div>

        <AgentTypeSelector
          selectedType={formData.agent_type}
          onChange={handleAgentTypeChange}
          variant="cards"
        />

        <div className={styles.actions}>
          {onCancel && (
            <Button variant="secondary" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Render step 2: Details form
  const agentMetadata = getAgentTypeMetadata(formData.agent_type);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.agentTypeIndicator}>
          <div>
            <h2 className={styles.title}>
              {isEditing ? 'Edit' : 'Create'} {agentMetadata?.label}
            </h2>
            <p className={styles.subtitle}>{agentMetadata?.description}</p>
          </div>
        </div>

        {!isEditing && (
          <Button
            variant="ghost"
            onClick={() => setCurrentStep('type')}
            size="sm"
          >
            ← Change Type
          </Button>
        )}
      </div>

      <form onSubmit={(e) => handleSubmit(e, false)}>
        <HubForm.Root>
          {/* Basic Information */}
        <HubForm.Section
          title="Basic Information"
        >
          <HubForm.Field
            label="Display Name"
            required
            error={errors.display_name}
          >
            <input
              type="text"
              value={formData.display_name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, display_name: e.target.value }))
              }
              placeholder={`My ${agentMetadata?.label}`}
              disabled={isSubmitting}
              className={styles.input}
            />
          </HubForm.Field>

          <HubForm.Field
            label="Subject"
            required
            error={errors.subject}
          >
            <UnifiedSelect
              value={formData.subject}
              onChange={(value) =>
                setFormData((prev) => ({ ...prev, subject: String(value) }))
              }
              options={SUBJECTS}
              placeholder="Select subject"
              disabled={isSubmitting}
            />
          </HubForm.Field>

          <HubForm.Field
            label="Level"
            error={errors.level}
          >
            <UnifiedSelect
              value={formData.level || ''}
              onChange={(value) =>
                setFormData((prev) => ({ ...prev, level: String(value) || undefined }))
              }
              options={LEVELS}
              placeholder="Select level (optional)"
              disabled={isSubmitting}
            />
          </HubForm.Field>

          <HubForm.Field
            label="Description"
            required
            error={errors.description}
          >
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder={`Describe your ${agentMetadata?.label.toLowerCase()}...`}
              disabled={isSubmitting}
              rows={4}
              className={styles.textarea}
            />
          </HubForm.Field>
        </HubForm.Section>

        {/* Skills & Template */}
        <HubForm.Section
          title="Skills & Expertise"
        >
          {formData.agent_type === 'tutor' && (
            <HubForm.Field
              label="Template"
            >
              <UnifiedSelect
                value={formData.template_id || ''}
                onChange={handleTemplateChange}
                options={
                  templates
                    ? [
                        { value: '', label: 'Custom (no template)' },
                        ...templates.map((t: any) => ({
                          value: t.id,
                          label: t.displayName,
                        })),
                      ]
                    : [{ value: '', label: 'Custom (no template)' }]
                }
                placeholder="Select a template"
                disabled={isSubmitting}
              />
            </HubForm.Field>
          )}

          <HubForm.Field
            label="Skills"
            required
            error={errors.skills}
          >
            <SkillSelector
              selectedSkills={formData.skills}
              onSkillsChange={(skills) => setFormData((prev) => ({ ...prev, skills }))}
              disabled={isSubmitting}
              error={errors.skills as string | undefined}
            />
          </HubForm.Field>
        </HubForm.Section>

        {/* Pricing */}
        <HubForm.Section
          title="Pricing"
        >
          <HubForm.Field
            label="Price per Hour"
            required
            error={errors.price_per_hour}
          >
            <div className={styles.priceInput}>
              <span className={styles.currency}>£</span>
              <input
                type="number"
                value={formData.price_per_hour}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    price_per_hour: parseFloat(e.target.value) || 0,
                  }))
                }
                min={formData.agent_type === 'tutor' ? 5 : 3}
                max={formData.agent_type === 'tutor' ? 100 : 50}
                step="0.50"
                disabled={isSubmitting}
                className={styles.input}
              />
              <span className={styles.perHour}>per hour</span>
            </div>
          </HubForm.Field>
        </HubForm.Section>

        {/* Actions */}
        <div className={styles.actions}>
          {onCancel && (
            <Button variant="secondary" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </Button>
          )}

          <div className={styles.submitActions}>
            <Button
              type="submit"
              variant="secondary"
              disabled={isSubmitting}
              isLoading={isSubmitting}
            >
              {isEditing ? 'Save Changes' : 'Save as Draft'}
            </Button>

            {!isEditing && (
              <Button
                type="button"
                variant="primary"
                onClick={(e) => handleSubmit(e, true)}
                disabled={isSubmitting}
                isLoading={isSubmitting}
              >
                Create & Publish
              </Button>
            )}
          </div>
        </div>
        </HubForm.Root>
      </form>
    </div>
  );
}
