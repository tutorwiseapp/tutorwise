'use client';

import React, { useState } from 'react';
import styles from '../OnboardingWizard.module.css';
import type { LearningPreferencesData } from './ClientOnboardingWizard';

interface ClientLearningPreferencesStepProps {
  onNext: (preferences: LearningPreferencesData) => void;
  onBack?: () => void;
  onSkip: () => void;
  isLoading: boolean;
  initialPreferences?: LearningPreferencesData | null;
}

const EDUCATION_LEVELS = [
  'Primary (KS1-KS2)',
  'KS3 (Years 7-9)',
  'GCSE',
  'A-Level',
  'IB',
  'Undergraduate',
  'Postgraduate'
];

const LEARNING_GOALS = [
  'Exam preparation',
  'Homework help',
  'Improve grades',
  'Build confidence',
  'University preparation',
  'Career development',
  'Personal interest',
  'Catch up with curriculum'
];

const LEARNING_PREFERENCES = [
  'Visual learning',
  'Hands-on practice',
  'Discussion-based',
  'Step-by-step guidance',
  'Fast-paced',
  'Detailed explanations',
  'Regular feedback'
];

const ClientLearningPreferencesStep: React.FC<ClientLearningPreferencesStepProps> = ({
  onNext,
  onBack,
  onSkip,
  isLoading,
  initialPreferences
}) => {
  const [educationLevel, setEducationLevel] = useState(initialPreferences?.educationLevel || '');
  const [learningGoals, setLearningGoals] = useState<string[]>(initialPreferences?.learningGoals || []);
  const [learningPreferences, setLearningPreferences] = useState<string[]>(initialPreferences?.learningPreferences || []);
  const [budgetMin, setBudgetMin] = useState(initialPreferences?.budgetMin || '');
  const [budgetMax, setBudgetMax] = useState(initialPreferences?.budgetMax || '');
  const [sessionsPerWeek, setSessionsPerWeek] = useState(initialPreferences?.sessionsPerWeek || '');
  const [sessionDuration, setSessionDuration] = useState(initialPreferences?.sessionDuration || '');
  const [additionalInfo, setAdditionalInfo] = useState(initialPreferences?.additionalInfo || '');

  const handleGoalToggle = (goal: string) => {
    setLearningGoals(prev =>
      prev.includes(goal)
        ? prev.filter(g => g !== goal)
        : [...prev, goal]
    );
  };

  const handlePreferenceToggle = (pref: string) => {
    setLearningPreferences(prev =>
      prev.includes(pref)
        ? prev.filter(p => p !== pref)
        : [...prev, pref]
    );
  };

  const handleNext = () => {
    if (educationLevel && learningGoals.length > 0) {
      onNext({
        educationLevel,
        learningGoals,
        learningPreferences,
        budgetMin,
        budgetMax,
        sessionsPerWeek,
        sessionDuration,
        additionalInfo
      });
    }
  };

  const isValid = educationLevel && learningGoals.length > 0;

  return (
    <div className={styles.stepContent}>
      <div className={styles.stepHeader}>
        <h2 className={styles.stepTitle}>
          Tell us about your learning needs
        </h2>
        <p className={styles.stepSubtitle}>
          This helps us find tutors that match your goals and preferences
        </p>
      </div>

      <div className={styles.stepBody}>
        {/* Education Level */}
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            Education Level *
          </label>
          <select
            value={educationLevel}
            onChange={(e) => setEducationLevel(e.target.value)}
            className={styles.select}
          >
            <option value="">Select your level</option>
            {EDUCATION_LEVELS.map((level) => (
              <option key={level} value={level}>{level}</option>
            ))}
          </select>
        </div>

        {/* Learning Goals */}
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            Learning Goals * (Select all that apply)
          </label>
          <div className={styles.chipGrid}>
            {LEARNING_GOALS.map((goal) => (
              <button
                key={goal}
                type="button"
                onClick={() => handleGoalToggle(goal)}
                className={`${styles.chip} ${learningGoals.includes(goal) ? styles.chipSelected : ''}`}
              >
                {goal}
              </button>
            ))}
          </div>
        </div>

        {/* Learning Preferences */}
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            Learning Preferences (Optional)
          </label>
          <div className={styles.chipGrid}>
            {LEARNING_PREFERENCES.map((pref) => (
              <button
                key={pref}
                type="button"
                onClick={() => handlePreferenceToggle(pref)}
                className={`${styles.chip} ${learningPreferences.includes(pref) ? styles.chipSelected : ''}`}
              >
                {pref}
              </button>
            ))}
          </div>
        </div>

        {/* Budget Range */}
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            Budget Range (Optional)
          </label>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <input
                type="number"
                placeholder="Min (£/hr)"
                value={budgetMin}
                onChange={(e) => setBudgetMin(e.target.value)}
                className={styles.input}
                min="0"
              />
            </div>
            <span>to</span>
            <div style={{ flex: 1 }}>
              <input
                type="number"
                placeholder="Max (£/hr)"
                value={budgetMax}
                onChange={(e) => setBudgetMax(e.target.value)}
                className={styles.input}
                min="0"
              />
            </div>
          </div>
        </div>

        {/* Sessions per Week */}
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            Sessions per Week (Optional)
          </label>
          <select
            value={sessionsPerWeek}
            onChange={(e) => setSessionsPerWeek(e.target.value)}
            className={styles.select}
          >
            <option value="">Select frequency</option>
            <option value="1">1 session</option>
            <option value="2">2 sessions</option>
            <option value="3">3 sessions</option>
            <option value="4+">4+ sessions</option>
          </select>
        </div>

        {/* Session Duration */}
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            Preferred Session Duration (Optional)
          </label>
          <select
            value={sessionDuration}
            onChange={(e) => setSessionDuration(e.target.value)}
            className={styles.select}
          >
            <option value="">Select duration</option>
            <option value="30 minutes">30 minutes</option>
            <option value="1 hour">1 hour</option>
            <option value="1.5 hours">1.5 hours</option>
            <option value="2 hours">2 hours</option>
          </select>
        </div>

        {/* Additional Information */}
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            Additional Information (Optional)
          </label>
          <textarea
            value={additionalInfo}
            onChange={(e) => setAdditionalInfo(e.target.value)}
            className={styles.textarea}
            placeholder="Any specific requirements or learning needs?"
            rows={4}
          />
        </div>

        <p className={styles.progressIndicator}>
          {isValid ? '✓ All set! Ready to find your tutor' : 'Please complete required fields'}
        </p>
      </div>

      <div className={styles.stepActions}>
        <div className={styles.actionLeft}>
          {onBack && (
            <button
              onClick={onBack}
              className={styles.buttonSecondary}
              disabled={isLoading}
            >
              ← Back
            </button>
          )}
          <button
            onClick={onSkip}
            className={styles.buttonSecondary}
            disabled={isLoading}
          >
            Skip for now
          </button>
        </div>

        <div className={styles.actionRight}>
          <button
            onClick={handleNext}
            className={`${styles.buttonPrimary} ${!isValid ? styles.buttonDisabled : ''}`}
            disabled={!isValid || isLoading}
          >
            Complete Setup →
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClientLearningPreferencesStep;
