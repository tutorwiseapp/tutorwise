'use client';

/* eslint-disable react/no-unescaped-entities */
import React from 'react';

interface CompletionStepProps {
  selectedRoles: ('agent' | 'seeker' | 'provider')[];
  onComplete: () => void;
}

const roleLabels = {
  seeker: 'Student',
  provider: 'Tutor',
  agent: 'Agent'
};

const CompletionStep: React.FC<CompletionStepProps> = ({ selectedRoles, onComplete }) => {
  return (
    <div className="p-8 text-center">
      <div className="mb-8">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          You&apos;re all set! 🎉
        </h2>

        <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
          Welcome to Tutorwise! Your profile has been configured and you&apos;re ready to start your journey.
        </p>
      </div>

      {/* Role Summary */}
      <div className="bg-gray-50 rounded-lg p-6 mb-8 max-w-md mx-auto">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Roles:</h3>
        <div className="space-y-2">
          {selectedRoles.map((role) => (
            <div key={role} className="flex items-center justify-center">
              <div className={`w-3 h-3 rounded-full mr-3 ${
                role === 'seeker' ? 'bg-blue-500' :
                role === 'provider' ? 'bg-green-500' :
                'bg-purple-500'
              }`}></div>
              <span className="text-gray-700 font-medium">{roleLabels[role]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Next Steps */}
      <div className="bg-blue-50 rounded-lg p-6 mb-8 text-left max-w-2xl mx-auto">
        <h3 className="text-lg font-semibold text-blue-900 mb-4 text-center">What's next?</h3>
        <div className="space-y-3">
          {selectedRoles.includes('seeker') && (
            <div className="flex items-start">
              <div className="w-2 h-2 bg-blue-400 rounded-full mr-3 mt-2"></div>
              <div>
                <span className="font-medium text-blue-800">As a Student:</span>
                <span className="text-blue-700 ml-1">Browse tutors, book sessions, and start learning!</span>
              </div>
            </div>
          )}
          {selectedRoles.includes('provider') && (
            <div className="flex items-start">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-3 mt-2"></div>
              <div>
                <span className="font-medium text-green-800">As a Tutor:</span>
                <span className="text-green-700 ml-1">Complete your profile and start accepting bookings!</span>
              </div>
            </div>
          )}
          {selectedRoles.includes('agent') && (
            <div className="flex items-start">
              <div className="w-2 h-2 bg-purple-400 rounded-full mr-3 mt-2"></div>
              <div>
                <span className="font-medium text-purple-800">As an Agent:</span>
                <span className="text-purple-700 ml-1">Start building your network and earn commissions!</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tips */}
      <div className="text-sm text-gray-500 mb-8">
        <p>💡 Tip: You can switch between your roles anytime using the role switcher in the top navigation.</p>
        <p className="mt-2">🔧 You can also update your preferences and profile information in your account settings.</p>
      </div>

      {/* Action Button */}
      <button
        onClick={onComplete}
        className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg font-medium text-lg transition-colors flex items-center mx-auto"
      >
        Go to Dashboard
        <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </button>
    </div>
  );
};

export default CompletionStep;