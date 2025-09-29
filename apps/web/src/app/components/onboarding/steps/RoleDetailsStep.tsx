'use client';

/* eslint-disable react/no-unescaped-entities */
import React, { useState, useEffect } from 'react';
import { RoleDetails } from '@/types';

interface RoleDetailsStepProps {
  role: 'agent' | 'seeker' | 'provider';
  roleIndex: number;
  totalRoles: number;
  onNext: (data: Partial<RoleDetails>) => void;
  onSkip: () => void;
  isLoading: boolean;
  initialData?: Partial<RoleDetails>;
}

const subjects = [
  'Mathematics', 'Science', 'English', 'History', 'Programming',
  'Languages', 'Music', 'Art', 'Business', 'Other'
];

const skillLevels = [
  { value: 1, label: 'Beginner' },
  { value: 2, label: 'Elementary' },
  { value: 3, label: 'Intermediate' },
  { value: 4, label: 'Advanced' },
  { value: 5, label: 'Expert' }
];

const RoleDetailsStep: React.FC<RoleDetailsStepProps> = ({
  role,
  roleIndex,
  totalRoles,
  onNext,
  onSkip,
  isLoading,
  initialData
}) => {
  const [formData, setFormData] = useState<Partial<RoleDetails>>(initialData || {});

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  const handleInputChange = (field: keyof RoleDetails, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubjectToggle = (subject: string) => {
    const currentSubjects = formData.subjects || [];
    const updatedSubjects = currentSubjects.includes(subject)
      ? currentSubjects.filter(s => s !== subject)
      : [...currentSubjects, subject];

    handleInputChange('subjects', updatedSubjects);
  };

  const handleSkillLevelChange = (subject: string, level: number) => {
    const currentLevels = formData.skill_levels || {};
    handleInputChange('skill_levels', { ...currentLevels, [subject]: level });
  };

  const handleNext = () => {
    onNext(formData);
  };

  const getRoleConfig = () => {
    switch (role) {
      case 'seeker':
        return {
          title: 'Student',
          subtitle: 'Tell us about your learning goals',
          color: 'blue',
          icon: (
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          )
        };
      case 'provider':
        return {
          title: 'Tutor',
          subtitle: 'Set up your teaching profile',
          color: 'green',
          icon: (
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          )
        };
      case 'agent':
        return {
          title: 'Agent',
          subtitle: 'Configure your networking preferences',
          color: 'purple',
          icon: (
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          )
        };
    }
  };

  const config = getRoleConfig();

  return (
    <div className="p-8">
      {/* Progress indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
          <span>Setting up your {config.title.toLowerCase()} profile</span>
          <span>{roleIndex + 1} of {totalRoles}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`bg-${config.color}-600 h-2 rounded-full transition-all duration-300`}
            style={{ width: `${((roleIndex + 1) / totalRoles) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Header */}
      <div className="text-center mb-8">
        <div className={`w-16 h-16 bg-${config.color}-100 rounded-full flex items-center justify-center mx-auto mb-4`}>
          <div className={`text-${config.color}-600`}>{config.icon}</div>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {config.title} Profile Setup
        </h2>
        <p className="text-gray-600">{config.subtitle}</p>
      </div>

      {/* Form */}
      <div className="space-y-6">
        {/* Subjects */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            What subjects are you interested in?
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {subjects.map((subject) => (
              <button
                key={subject}
                onClick={() => handleSubjectToggle(subject)}
                className={`p-3 text-sm rounded-lg border transition-colors ${
                  (formData.subjects || []).includes(subject)
                    ? `border-${config.color}-500 bg-${config.color}-50 text-${config.color}-700`
                    : 'border-gray-200 hover:border-gray-300 text-gray-600'
                }`}
              >
                {subject}
              </button>
            ))}
          </div>
        </div>

        {/* Skill levels for selected subjects */}
        {formData.subjects && formData.subjects.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Rate your skill level in each subject:
            </label>
            <div className="space-y-4">
              {formData.subjects.map((subject) => (
                <div key={subject} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">{subject}</span>
                  <div className="flex space-x-2">
                    {skillLevels.map((level) => (
                      <button
                        key={level.value}
                        onClick={() => handleSkillLevelChange(subject, level.value)}
                        className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                          (formData.skill_levels?.[subject] || 0) >= level.value
                            ? `border-${config.color}-500 bg-${config.color}-500 text-white`
                            : 'border-gray-200 hover:border-gray-300 text-gray-600'
                        }`}
                        title={level.label}
                      >
                        {level.value}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Role-specific fields */}
        {role === 'provider' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Years of teaching experience
              </label>
              <input
                type="number"
                min="0"
                max="50"
                value={formData.teaching_experience_years || ''}
                onChange={(e) => handleInputChange('teaching_experience_years', parseInt(e.target.value) || 0)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., 3"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hourly rate (£)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.hourly_rate || ''}
                onChange={(e) => handleInputChange('hourly_rate', parseFloat(e.target.value) || 0)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., 25.00"
              />
            </div>
          </div>
        )}

        {role === 'seeker' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                What's your budget range per hour?
              </label>
              <select
                value={formData.budget_range || ''}
                onChange={(e) => handleInputChange('budget_range', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select budget range</option>
                <option value="£10-20">£10-20 per hour</option>
                <option value="£20-35">£20-35 per hour</option>
                <option value="£35-50">£35-50 per hour</option>
                <option value="£50+">£50+ per hour</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                How many hours per week can you dedicate to learning?
              </label>
              <input
                type="number"
                min="1"
                max="40"
                value={formData.availability_hours || ''}
                onChange={(e) => handleInputChange('availability_hours', parseInt(e.target.value) || 0)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., 5"
              />
            </div>
          </div>
        )}

        {role === 'agent' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target categories for referrals
            </label>
            <div className="grid grid-cols-2 gap-2">
              {subjects.map((category) => (
                <button
                  key={category}
                  onClick={() => {
                    const current = formData.target_categories || [];
                    const updated = current.includes(category)
                      ? current.filter(c => c !== category)
                      : [...current, category];
                    handleInputChange('target_categories', updated);
                  }}
                  className={`p-3 text-sm rounded-lg border transition-colors ${
                    (formData.target_categories || []).includes(category)
                      ? 'border-purple-500 bg-purple-50 text-purple-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-600'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center mt-8">
        <button
          onClick={onSkip}
          className="text-gray-500 hover:text-gray-700 transition-colors"
          disabled={isLoading}
        >
          Skip for now
        </button>

        <button
          onClick={handleNext}
          disabled={isLoading}
          className={`px-6 py-3 rounded-lg font-medium transition-colors flex items-center ${
            !isLoading
              ? `bg-${config.color}-600 hover:bg-${config.color}-700 text-white`
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Saving...
            </>
          ) : roleIndex < totalRoles - 1 ? (
            <>
              Next Role
              <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </>
          ) : (
            <>
              Complete Setup
              <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default RoleDetailsStep;