'use client';

/* eslint-disable react/no-unescaped-entities */
import React, { useState } from 'react';

interface RoleSelectionStepProps {
  selectedRoles: ('agent' | 'seeker' | 'provider')[];
  onNext: (roles: ('agent' | 'seeker' | 'provider')[]) => void;
  onSkip: () => void;
  isLoading: boolean;
}

const roles = [
  {
    id: 'seeker' as const,
    label: 'Student',
    description: 'I want to learn new skills and find tutors',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
    features: ['Find qualified tutors', 'Book sessions', 'Track progress', 'Secure payments'],
    color: 'blue'
  },
  {
    id: 'provider' as const,
    label: 'Tutor',
    description: 'I want to teach and share my expertise',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
    features: ['Create your profile', 'Set your rates', 'Manage bookings', 'Earn income'],
    color: 'green'
  },
  {
    id: 'agent' as const,
    label: 'Agent',
    description: 'I want to connect students with tutors and earn commissions',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    features: ['Build your network', 'Refer students', 'Track commissions', 'Grow your business'],
    color: 'purple'
  }
];

const RoleSelectionStep: React.FC<RoleSelectionStepProps> = ({
  selectedRoles,
  onNext,
  onSkip,
  isLoading
}) => {
  const [selected, setSelected] = useState<('agent' | 'seeker' | 'provider')[]>(selectedRoles);

  const handleRoleToggle = (roleId: 'agent' | 'seeker' | 'provider') => {
    setSelected(prev =>
      prev.includes(roleId)
        ? prev.filter(id => id !== roleId)
        : [...prev, roleId]
    );
  };

  const handleNext = () => {
    if (selected.length > 0) {
      onNext(selected);
    }
  };

  const getColorClasses = (color: string, isSelected: boolean) => {
    const colors = {
      blue: isSelected
        ? 'border-blue-500 bg-blue-50 text-blue-700'
        : 'border-gray-200 hover:border-blue-300 text-gray-600',
      green: isSelected
        ? 'border-green-500 bg-green-50 text-green-700'
        : 'border-gray-200 hover:border-green-300 text-gray-600',
      purple: isSelected
        ? 'border-purple-500 bg-purple-50 text-purple-700'
        : 'border-gray-200 hover:border-purple-300 text-gray-600'
    };
    return colors[color as keyof typeof colors];
  };

  return (
    <div className="p-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          How do you want to use Tutorwise?
        </h2>
        <p className="text-gray-600 max-w-lg mx-auto">
          You can select multiple roles. We'll customize your experience for each one.
        </p>
      </div>

      <div className="space-y-4 mb-8">
        {roles.map((role) => {
          const isSelected = selected.includes(role.id);
          const colorClasses = getColorClasses(role.color, isSelected);

          return (
            <div
              key={role.id}
              onClick={() => handleRoleToggle(role.id)}
              className={`border-2 rounded-lg p-6 cursor-pointer transition-all ${colorClasses}`}
            >
              <div className="flex items-start">
                <div className={`p-3 rounded-lg mr-4 ${
                  isSelected
                    ? `bg-${role.color}-100 text-${role.color}-600`
                    : 'bg-gray-100 text-gray-400'
                }`}>
                  {role.icon}
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold">{role.label}</h3>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      isSelected
                        ? `border-${role.color}-500 bg-${role.color}-500`
                        : 'border-gray-300'
                    }`}>
                      {isSelected && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </div>

                  <p className="text-sm mb-4">{role.description}</p>

                  <div className="grid grid-cols-2 gap-2">
                    {role.features.map((feature, index) => (
                      <div key={index} className="flex items-center text-sm">
                        <div className="w-1.5 h-1.5 bg-current rounded-full mr-2 opacity-60"></div>
                        {feature}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-between items-center">
        <button
          onClick={onSkip}
          className="text-gray-500 hover:text-gray-700 transition-colors"
          disabled={isLoading}
        >
          Skip for now
        </button>

        <button
          onClick={handleNext}
          disabled={selected.length === 0 || isLoading}
          className={`px-6 py-3 rounded-lg font-medium transition-colors flex items-center ${
            selected.length > 0 && !isLoading
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
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
          ) : (
            <>
              Continue
              <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default RoleSelectionStep;