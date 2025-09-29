'use client';

/* eslint-disable react/no-unescaped-entities */
import React from 'react';

interface WelcomeStepProps {
  onNext: () => void;
  onSkip: () => void;
  userName: string;
}

const WelcomeStep: React.FC<WelcomeStepProps> = ({ onNext, onSkip, userName }) => {
  return (
    <div className="p-8">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Welcome to Tutorwise, {userName}! 🎉
        </h1>

        <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
          Let's get you set up with a personalized experience. This quick setup will help us understand how you'd like to use Tutorwise.
        </p>
      </div>

      <div className="bg-blue-50 rounded-lg p-6 mb-8">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">What we'll cover:</h3>
        <div className="space-y-3">
          <div className="flex items-center">
            <div className="w-2 h-2 bg-blue-400 rounded-full mr-3"></div>
            <span className="text-blue-800">Choose your role(s) - Student, Tutor, or Agent</span>
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 bg-blue-400 rounded-full mr-3"></div>
            <span className="text-blue-800">Set up your preferences and goals</span>
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 bg-blue-400 rounded-full mr-3"></div>
            <span className="text-blue-800">Customize your dashboard</span>
          </div>
        </div>
      </div>

      <div className="text-center text-sm text-gray-500 mb-8">
        Takes about 2-3 minutes • You can always change these settings later
      </div>

      <div className="flex justify-between items-center">
        <button
          onClick={onSkip}
          className="text-gray-500 hover:text-gray-700 transition-colors"
        >
          Skip for now
        </button>

        <button
          onClick={onNext}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center"
        >
          Let's get started
          <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default WelcomeStep;