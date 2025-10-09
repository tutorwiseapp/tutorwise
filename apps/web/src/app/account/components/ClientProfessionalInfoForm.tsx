'use client';

import { useState, useEffect } from 'react';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { getProfessionalInfo, updateProfessionalInfo } from '@/lib/api/account';
import toast from 'react-hot-toast';
import styles from './ProfessionalInfoForm.module.css';

// Common subjects for learning
const LEARNING_SUBJECTS = [
  'Mathematics',
  'Physics',
  'Chemistry',
  'Biology',
  'English',
  'History',
  'Geography',
  'Computer Science',
  'Spanish',
  'French',
  'German',
  'Economics',
  'Business Studies',
  'Psychology'
];

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

export default function ClientProfessionalInfoForm() {
  const { user } = useUserProfile();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [subjects, setSubjects] = useState<string[]>([]);
  const [level, setLevel] = useState('');
  const [learningGoals, setLearningGoals] = useState<string[]>([]);
  const [learningPreferences, setLearningPreferences] = useState<string[]>([]);
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [sessionsPerWeek, setSessionsPerWeek] = useState('');
  const [sessionDuration, setSessionDuration] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');

  // Load existing template data
  useEffect(() => {
    const loadTemplateData = async () => {
      if (!user?.id) return;

      try {
        const templateData = await getProfessionalInfo('seeker');
        if (templateData) {
          setSubjects(templateData.subjects || []);
          setLevel(templateData.education_level || '');
          setLearningGoals(templateData.learning_goals || []);
          setLearningPreferences(templateData.learning_preferences || []);

          if (templateData.budget_range) {
            const [min, max] = templateData.budget_range.split('-');
            setBudgetMin(min);
            setBudgetMax(max);
          }

          setSessionsPerWeek(templateData.sessions_per_week || '');
          setSessionDuration(templateData.session_duration || '');
          setAdditionalInfo(templateData.additional_info || '');
        }
      } catch (error) {
        console.error('Error loading template:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTemplateData();
  }, [user]);

  const handleSubjectToggle = (subject: string) => {
    setSubjects(prev =>
      prev.includes(subject)
        ? prev.filter(s => s !== subject)
        : [...prev, subject]
    );
  };

  const handleGoalToggle = (goal: string) => {
    setLearningGoals(prev =>
      prev.includes(goal)
        ? prev.filter(g => g !== goal)
        : [...prev, goal]
    );
  };

  const handlePreferenceToggle = (preference: string) => {
    setLearningPreferences(prev =>
      prev.includes(preference)
        ? prev.filter(p => p !== preference)
        : [...prev, preference]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      // Format budget range
      const budgetRange = budgetMin && budgetMax ? `${budgetMin}-${budgetMax}` : undefined;

      // Save template via API
      await updateProfessionalInfo({
        role_type: 'seeker',
        subjects,
        education_level: level,
        learning_goals: learningGoals,
        learning_preferences: learningPreferences,
        budget_range: budgetRange,
        sessions_per_week: sessionsPerWeek,
        session_duration: sessionDuration,
        additional_info: additionalInfo
      });
      toast.success('✅ Template saved. This will help us match you with suitable tutors.');
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Failed to save template. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className={styles.loading}>Loading template...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {/* Subjects of Interest */}
      <div className={styles.formSection}>
        <label className={styles.label}>Subjects of Interest *</label>
        <p className={styles.helpText}>Select the subjects you need help with</p>
        <div className={styles.chipGrid}>
          {LEARNING_SUBJECTS.map(subject => (
            <button
              key={subject}
              type="button"
              onClick={() => handleSubjectToggle(subject)}
              className={`${styles.chip} ${subjects.includes(subject) ? styles.chipSelected : ''}`}
            >
              {subject}
            </button>
          ))}
        </div>
      </div>

      {/* Current Education Level */}
      <div className={styles.formSection}>
        <label htmlFor="level" className={styles.label}>Current Education Level *</label>
        <select
          id="level"
          value={level}
          onChange={(e) => setLevel(e.target.value)}
          className={styles.select}
          required
        >
          <option value="">Select your level</option>
          {EDUCATION_LEVELS.map(lvl => (
            <option key={lvl} value={lvl}>{lvl}</option>
          ))}
        </select>
      </div>

      {/* Learning Goals */}
      <div className={styles.formSection}>
        <label className={styles.label}>Learning Goals *</label>
        <p className={styles.helpText}>What do you want to achieve?</p>
        <div className={styles.chipGrid}>
          {LEARNING_GOALS.map(goal => (
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
      <div className={styles.formSection}>
        <label className={styles.label}>Learning Preferences</label>
        <p className={styles.helpText}>How do you learn best?</p>
        <div className={styles.chipGrid}>
          {LEARNING_PREFERENCES.map(preference => (
            <button
              key={preference}
              type="button"
              onClick={() => handlePreferenceToggle(preference)}
              className={`${styles.chip} ${learningPreferences.includes(preference) ? styles.chipSelected : ''}`}
            >
              {preference}
            </button>
          ))}
        </div>
      </div>

      {/* Budget Range */}
      <div className={styles.formSection}>
        <label className={styles.label}>Budget Range per Hour (£)</label>
        <p className={styles.helpText}>This helps match you with tutors in your price range</p>
        <div className={styles.inlineInputs}>
          <input
            type="number"
            placeholder="Min"
            value={budgetMin}
            onChange={(e) => setBudgetMin(e.target.value)}
            className={styles.input}
            min="0"
            step="5"
          />
          <span style={{ margin: '0 0.5rem' }}>to</span>
          <input
            type="number"
            placeholder="Max"
            value={budgetMax}
            onChange={(e) => setBudgetMax(e.target.value)}
            className={styles.input}
            min="0"
            step="5"
          />
        </div>
      </div>

      {/* Sessions Per Week */}
      <div className={styles.formSection}>
        <label htmlFor="sessionsPerWeek" className={styles.label}>Preferred Sessions Per Week</label>
        <select
          id="sessionsPerWeek"
          value={sessionsPerWeek}
          onChange={(e) => setSessionsPerWeek(e.target.value)}
          className={styles.select}
        >
          <option value="">Select frequency</option>
          <option value="1">1 session per week</option>
          <option value="2">2 sessions per week</option>
          <option value="3">3 sessions per week</option>
          <option value="4">4 sessions per week</option>
          <option value="5+">5+ sessions per week</option>
        </select>
      </div>

      {/* Session Duration */}
      <div className={styles.formSection}>
        <label htmlFor="sessionDuration" className={styles.label}>Preferred Session Duration</label>
        <select
          id="sessionDuration"
          value={sessionDuration}
          onChange={(e) => setSessionDuration(e.target.value)}
          className={styles.select}
        >
          <option value="">Select duration</option>
          <option value="30 minutes">30 minutes</option>
          <option value="45 minutes">45 minutes</option>
          <option value="1 hour">1 hour</option>
          <option value="1.5 hours">1.5 hours</option>
          <option value="2 hours">2 hours</option>
        </select>
      </div>

      {/* Additional Information */}
      <div className={styles.formSection}>
        <label htmlFor="additionalInfo" className={styles.label}>Additional Information</label>
        <p className={styles.helpText}>Any specific requirements or preferences?</p>
        <textarea
          id="additionalInfo"
          value={additionalInfo}
          onChange={(e) => setAdditionalInfo(e.target.value)}
          className={styles.textarea}
          placeholder="e.g., Preparing for specific exams, learning challenges, preferred availability..."
          rows={4}
        />
      </div>

      {/* Submit Button */}
      <div className={styles.submitSection}>
        <button
          type="submit"
          disabled={isSaving || subjects.length === 0 || !level || learningGoals.length === 0}
          className={styles.submitButton}
        >
          {isSaving ? 'Saving Template...' : 'Save Template'}
        </button>
      </div>
    </form>
  );
}
