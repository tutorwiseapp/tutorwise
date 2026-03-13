/**
 * Client Professional Details Configuration
 *
 * Client has unique fields and labels compared to Tutor/Agent:
 * - "Who Needs Tutoring" instead of "Status"
 * - "Preferred Tutor Experience" with "Any Experience Level" option
 * - Additional "Levels" field
 * - "Budget" terminology instead of "Rates"
 */

import { ProfessionalDetailConfig, sharedOptions, roleSpecificOptions } from './index';

export const clientConfig: ProfessionalDetailConfig = {
  role: 'client',
  formContext: 'onboarding.client',
  title: 'Learning Preferences',
  subtitle: 'Client Onboarding • Tell us about your learning needs and preferences',

  fields: {
    bio: {
      label: 'About Your Learning Goals',
      placeholder: 'Describe what you want to learn, your goals, and any specific areas you need help with',
      helpText: 'characters minimum',
      required: true,
    },
    bioVideoUrl: {
      label: '30-Second Intro Video (Optional)',
      placeholder: 'Paste YouTube, Loom, or Vimeo URL',
      required: false,
    },
    status: {
      label: 'Who Needs Tutoring',
      placeholder: 'Select who needs tutoring',
      options: roleSpecificOptions.client.status,
      required: true,
    },
    academicQualifications: {
      label: 'Preferred Tutor Qualifications',
      placeholder: 'Select preferred qualifications',
      options: sharedOptions.academicQualifications,
      required: true,
    },
    teachingProfessionalQualifications: {
      label: 'Preferred Teaching Qualifications',
      placeholder: 'Select preferred qualifications',
      options: sharedOptions.teachingProfessionalQualifications,
      required: true,
    },
    teachingExperience: {
      label: 'Preferred Tutor Experience',
      placeholder: 'Select preferred experience',
      options: roleSpecificOptions.client.teachingExperience,
      required: true,
    },
    tutoringExperience: {
      label: 'Preferred Tutoring Experience',
      placeholder: 'Select preferred experience',
      options: sharedOptions.tutoringExperience,
      required: true,
    },
    keyStages: {
      label: 'Preferred Key Stages',
      placeholder: 'Select key stages',
      options: sharedOptions.keyStages,
      required: true,
    },
    levels: {
      label: 'Preferred Levels',
      placeholder: 'Select preferred levels',
      options: roleSpecificOptions.client.levels,
      required: false,
    },
    subjects: {
      label: 'Subjects Needed',
      placeholder: 'Select subjects',
      options: sharedOptions.subjects,
      required: true,
    },
    sessionType: {
      label: 'Preferred Session Type',
      placeholder: 'Select session types',
      options: sharedOptions.sessionType,
      required: true,
    },
    deliveryMode: {
      label: 'Preferred Delivery Mode',
      placeholder: 'Select delivery modes',
      options: sharedOptions.deliveryMode,
      required: true,
    },
    oneToOneSessionRate: {
      label: 'Budget for One-to-One Sessions (£/hour)',
      placeholder: '£50',
      required: true,
    },
    groupSessionRate: {
      label: 'Budget for Group Sessions (£/hour per student)',
      placeholder: '£25',
      required: false,
    },
  },

  validation: {
    bioMinLength: 50,
    requireGroupRate: false,
  },
};
