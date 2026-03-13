/**
 * Agent Professional Details Configuration
 *
 * Note: Agent config is identical to Tutor config (they share the same form).
 * Future agent-specific fields can be added here without affecting Tutor.
 */

import { ProfessionalDetailConfig, sharedOptions, roleSpecificOptions } from './index';

export const agentConfig: ProfessionalDetailConfig = {
  role: 'agent',
  formContext: 'onboarding.agent',
  title: 'Professional Details',
  subtitle: 'Agent Onboarding • Tell us about your professional background and services',

  fields: {
    bio: {
      label: 'About You',
      placeholder: 'Describe your tutoring or teaching style, strengths, and what areas you specialise in',
      helpText: 'characters minimum',
      required: true,
    },
    bioVideoUrl: {
      label: '30-Second Intro Video (Optional)',
      placeholder: 'Paste YouTube, Loom, or Vimeo URL for +5 CaaS points',
      required: false,
    },
    status: {
      label: 'Status',
      placeholder: 'Select status',
      options: roleSpecificOptions.agent.status,
      required: true,
    },
    academicQualifications: {
      label: 'Academic Qualifications',
      placeholder: 'Select qualifications',
      options: sharedOptions.academicQualifications,
      required: true,
    },
    teachingProfessionalQualifications: {
      label: 'Teaching Professional Qualifications',
      placeholder: 'Select qualifications',
      options: sharedOptions.teachingProfessionalQualifications,
      required: true,
    },
    teachingExperience: {
      label: 'Teaching Experience',
      placeholder: 'Select experience',
      options: roleSpecificOptions.agent.teachingExperience,
      required: true,
    },
    tutoringExperience: {
      label: 'Tutoring Experience',
      placeholder: 'Select experience',
      options: sharedOptions.tutoringExperience,
      required: true,
    },
    keyStages: {
      label: 'Key Stages',
      placeholder: 'Select key stages',
      options: sharedOptions.keyStages,
      required: true,
    },
    subjects: {
      label: 'Subjects',
      placeholder: 'Select subjects',
      options: sharedOptions.subjects,
      required: true,
    },
    sessionType: {
      label: 'Session Type',
      placeholder: 'Select session types',
      options: sharedOptions.sessionType,
      required: true,
    },
    deliveryMode: {
      label: 'Delivery Mode',
      placeholder: 'Select delivery modes',
      options: sharedOptions.deliveryMode,
      required: true,
    },
    oneToOneSessionRate: {
      label: 'One-to-One Session Rate (£/hour)',
      placeholder: '£50',
      required: true,
    },
    groupSessionRate: {
      label: 'Group Rate (£/hour per student)',
      placeholder: '£25',
      required: false,
    },
  },

  validation: {
    bioMinLength: 50,
    requireGroupRate: false,
  },
};
