'use client';

import { useState } from 'react';
import type { CreateListingInput } from '@tutorwise/shared-types';
import Button from '@/app/components/ui/Button';

interface Step3Props {
  formData: Partial<CreateListingInput>;
  onNext: (data: Partial<CreateListingInput>) => void;
  onBack: () => void;
}

// These will be stored as arrays in the database
const SPECIALIZATIONS = [
  'Exam Preparation',
  'Homework Help',
  'ADHD Support',
  'Dyslexia Support',
  'Special Educational Needs (SEN)',
  'Gifted & Talented',
  'English as Second Language (ESL)',
  'Oxbridge Preparation',
  'Entrance Exams (11+, 13+)',
  'Adult Learning',
  'Career Changers',
  'Online Teaching',
];

const TEACHING_METHODS = [
  'Interactive Learning',
  'Visual Learning',
  'Hands-on Practice',
  'Exam-Focused',
  'Project-Based',
  'Discussion-Based',
  'One-on-One Attention',
  'Structured Lessons',
  'Flexible Approach',
  'Technology-Enhanced',
  'Games & Activities',
  'Real-World Examples',
];

const ACADEMIC_QUALIFICATIONS = [
  'A-Level or BTEC',
  'Bachelor\'s Degree',
  'Master\'s Degree',
  'PhD / Doctorate',
  'PGCE (Teacher Training)',
  'None',
];

const PROFESSIONAL_QUALIFICATIONS = [
  'QTS (Qualified Teacher Status)',
  'NPQSL (Senior Leadership)',
  'NPQH (Headship)',
  'SEND Coordinator',
  'DBS Check (Enhanced)',
  'None',
];

const TEACHING_EXPERIENCE_OPTIONS = [
  { value: '0-3', label: 'Early Career (0-3 years)' },
  { value: '3-5', label: 'Experienced (3-5 years)' },
  { value: '5-7', label: 'Very Experienced (5-7 years)' },
  { value: '7+', label: 'Expert (7+ years)' },
];

export default function Step3ExpertiseCredentials({ formData, onNext, onBack }: Step3Props) {
  const [specializations, setSpecializations] = useState<string[]>(formData.specializations || []);
  const [teachingMethods, setTeachingMethods] = useState<string[]>(formData.teaching_methods || []);
  const [academicQualifications, setAcademicQualifications] = useState<string[]>(formData.academic_qualifications || []);
  const [professionalQualifications, setProfessionalQualifications] = useState<string[]>(formData.professional_qualifications || []);
  const [yearsOfExperience, setYearsOfExperience] = useState(formData.years_of_experience || '');

  const toggleItem = (item: string, list: string[], setter: (val: string[]) => void) => {
    setter(list.includes(item) ? list.filter(i => i !== item) : [...list, item]);
  };

  const handleContinue = () => {
    onNext({
      specializations,
      teaching_methods: teachingMethods,
      academic_qualifications: academicQualifications,
      professional_qualifications: professionalQualifications,
      years_of_experience: yearsOfExperience,
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Expertise & Credentials</h2>
        <p className="text-gray-600">
          Share your specializations and qualifications to help students understand your expertise.
        </p>
      </div>

      {/* Specializations */}
      <div>
        <label className="block text-lg font-semibold text-gray-900 mb-3">
          Specializations (Optional)
        </label>
        <p className="text-sm text-gray-600 mb-4">
          What specific areas or student groups do you specialize in?
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SPECIALIZATIONS.map((spec) => (
            <label
              key={spec}
              className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                specializations.includes(spec)
                  ? 'border-teal-500 bg-teal-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="checkbox"
                checked={specializations.includes(spec)}
                onChange={() => toggleItem(spec, specializations, setSpecializations)}
                className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
              />
              <span className="ml-2 text-sm font-medium text-gray-900">{spec}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Teaching Methods */}
      <div>
        <label className="block text-lg font-semibold text-gray-900 mb-3">
          Teaching Methods (Optional)
        </label>
        <p className="text-sm text-gray-600 mb-4">
          How do you approach teaching? Select all that apply.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {TEACHING_METHODS.map((method) => (
            <label
              key={method}
              className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                teachingMethods.includes(method)
                  ? 'border-teal-500 bg-teal-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="checkbox"
                checked={teachingMethods.includes(method)}
                onChange={() => toggleItem(method, teachingMethods, setTeachingMethods)}
                className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
              />
              <span className="ml-2 text-sm font-medium text-gray-900">{method}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Qualifications */}
      <div>
        <label className="block text-lg font-semibold text-gray-900 mb-3">
          Qualifications (Optional)
        </label>
        <p className="text-sm text-gray-600 mb-4">
          Select your academic and professional qualifications
        </p>

        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Academic Qualifications</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ACADEMIC_QUALIFICATIONS.map((qual) => (
                <label
                  key={qual}
                  className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                    academicQualifications.includes(qual)
                      ? 'border-teal-500 bg-teal-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={academicQualifications.includes(qual)}
                    onChange={() => toggleItem(qual, academicQualifications, setAcademicQualifications)}
                    className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-900">{qual}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Professional Qualifications</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PROFESSIONAL_QUALIFICATIONS.map((qual) => (
                <label
                  key={qual}
                  className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                    professionalQualifications.includes(qual)
                      ? 'border-teal-500 bg-teal-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={professionalQualifications.includes(qual)}
                    onChange={() => toggleItem(qual, professionalQualifications, setProfessionalQualifications)}
                    className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-900">{qual}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Teaching Experience */}
      <div>
        <label className="block text-lg font-semibold text-gray-900 mb-3">
          Teaching Experience (Optional)
        </label>
        <p className="text-sm text-gray-600 mb-4">
          How many years of teaching experience do you have?
        </p>
        <div className="space-y-2">
          {TEACHING_EXPERIENCE_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                yearsOfExperience === option.value
                  ? 'border-teal-500 bg-teal-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="experience"
                checked={yearsOfExperience === option.value}
                onChange={() => setYearsOfExperience(option.value)}
                className="w-4 h-4 text-teal-600 focus:ring-teal-500"
              />
              <span className="ml-3 text-sm font-medium text-gray-900">{option.label}</span>
            </label>
          ))}
        </div>
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
