'use client';

import { useState, useEffect } from 'react';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { getProfessionalInfo, updateProfessionalInfo } from '@/lib/api/account';
import toast from 'react-hot-toast';
import styles from './ProfessionalInfoForm.module.css';

// Common subjects for tutoring
const COMMON_SUBJECTS = [
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

const TEACHING_METHODS = [
  'Interactive',
  'Exam-focused',
  'Visual learning',
  'Hands-on practice',
  'Discussion-based',
  'Problem-solving',
  'One-on-one attention'
];

export default function TutorProfessionalInfoForm() {
  const { user, getRoleDetails } = useUserProfile();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [subjects, setSubjects] = useState<string[]>([]);
  const [levels, setLevels] = useState<string[]>([]);
  const [experience, setExperience] = useState('');
  const [hourlyRateMin, setHourlyRateMin] = useState('');
  const [hourlyRateMax, setHourlyRateMax] = useState('');
  const [qualifications, setQualifications] = useState<string[]>(['']);
  const [certifications, setCertifications] = useState<string[]>([]);
  const [teachingMethods, setTeachingMethods] = useState<string[]>([]);
  const [specializations, setSpecializations] = useState<string[]>([]);

  // Load existing template data
  useEffect(() => {
    const loadTemplateData = async () => {
      if (!user?.id) return;

      try {
        const templateData = await getProfessionalInfo('provider');
        if (templateData) {
          setSubjects(templateData.subjects || []);
          setLevels(templateData.skill_levels ? Object.keys(templateData.skill_levels) : []);
          setExperience(templateData.teaching_experience || '');

          if (templateData.hourly_rate) {
            setHourlyRateMin(templateData.hourly_rate.toString());
            setHourlyRateMax(templateData.hourly_rate.toString());
          }

          setQualifications(templateData.qualifications || ['']);
          setCertifications(templateData.specializations || []);
          setTeachingMethods(templateData.teaching_methods || []);
          setSpecializations(templateData.specializations || []);
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

  const handleLevelToggle = (level: string) => {
    setLevels(prev =>
      prev.includes(level)
        ? prev.filter(l => l !== level)
        : [...prev, level]
    );
  };

  const handleMethodToggle = (method: string) => {
    setTeachingMethods(prev =>
      prev.includes(method)
        ? prev.filter(m => m !== method)
        : [...prev, method]
    );
  };

  const handleQualificationChange = (index: number, value: string) => {
    const newQuals = [...qualifications];
    newQuals[index] = value;
    setQualifications(newQuals);
  };

  const addQualification = () => {
    setQualifications([...qualifications, '']);
  };

  const removeQualification = (index: number) => {
    setQualifications(qualifications.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      // Calculate average hourly rate if both min and max are set
      let avgHourlyRate: number | undefined;
      if (hourlyRateMin && hourlyRateMax) {
        avgHourlyRate = (parseFloat(hourlyRateMin) + parseFloat(hourlyRateMax)) / 2;
      }

      // Filter out empty qualifications
      const filteredQualifications = qualifications.filter(q => q.trim() !== '');

      // Save template via API
      await updateProfessionalInfo({
        role_type: 'provider',
        subjects,
        teaching_experience: experience,
        hourly_rate: avgHourlyRate,
        qualifications: filteredQualifications,
        teaching_methods: teachingMethods,
        specializations: certifications
      });

      toast.success('✅ Template saved. Changes won\'t affect your existing listings.');
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
      {/* Subjects */}
      <div className={styles.formSection}>
        <label className={styles.label}>Subjects *</label>
        <p className={styles.helpText}>Select the subjects you teach</p>
        <div className={styles.chipGrid}>
          {COMMON_SUBJECTS.map(subject => (
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

      {/* Education Levels */}
      <div className={styles.formSection}>
        <label className={styles.label}>Education Levels *</label>
        <p className={styles.helpText}>Select the levels you teach</p>
        <div className={styles.chipGrid}>
          {EDUCATION_LEVELS.map(level => (
            <button
              key={level}
              type="button"
              onClick={() => handleLevelToggle(level)}
              className={`${styles.chip} ${levels.includes(level) ? styles.chipSelected : ''}`}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      {/* Teaching Experience */}
      <div className={styles.formSection}>
        <label htmlFor="experience" className={styles.label}>Teaching Experience *</label>
        <select
          id="experience"
          value={experience}
          onChange={(e) => setExperience(e.target.value)}
          className={styles.select}
          required
        >
          <option value="">Select experience level</option>
          <option value="0-1 years">0-1 years</option>
          <option value="1-3 years">1-3 years</option>
          <option value="3-5 years">3-5 years</option>
          <option value="5-10 years">5-10 years</option>
          <option value="10+ years">10+ years</option>
        </select>
      </div>

      {/* Hourly Rate Range */}
      <div className={styles.formSection}>
        <label className={styles.label}>Hourly Rate Range (£)</label>
        <p className={styles.helpText}>This is a baseline for your template, not binding</p>
        <div className={styles.inlineInputs}>
          <input
            type="number"
            placeholder="Min"
            value={hourlyRateMin}
            onChange={(e) => setHourlyRateMin(e.target.value)}
            className={styles.input}
            min="0"
            step="5"
          />
          <span style={{ margin: '0 0.5rem' }}>to</span>
          <input
            type="number"
            placeholder="Max"
            value={hourlyRateMax}
            onChange={(e) => setHourlyRateMax(e.target.value)}
            className={styles.input}
            min="0"
            step="5"
          />
        </div>
      </div>

      {/* Qualifications */}
      <div className={styles.formSection}>
        <label className={styles.label}>Qualifications</label>
        <p className={styles.helpText}>e.g., BSc Mathematics - Oxford, PGCE</p>
        {qualifications.map((qual, index) => (
          <div key={index} className={styles.listItem}>
            <input
              type="text"
              value={qual}
              onChange={(e) => handleQualificationChange(index, e.target.value)}
              placeholder="e.g., BSc Mathematics - Oxford University"
              className={styles.input}
            />
            {qualifications.length > 1 && (
              <button
                type="button"
                onClick={() => removeQualification(index)}
                className={styles.removeButton}
              >
                Remove
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={addQualification}
          className={styles.addButton}
        >
          + Add Qualification
        </button>
      </div>

      {/* Teaching Methods */}
      <div className={styles.formSection}>
        <label className={styles.label}>Teaching Methods</label>
        <p className={styles.helpText}>Select your preferred teaching approaches</p>
        <div className={styles.chipGrid}>
          {TEACHING_METHODS.map(method => (
            <button
              key={method}
              type="button"
              onClick={() => handleMethodToggle(method)}
              className={`${styles.chip} ${teachingMethods.includes(method) ? styles.chipSelected : ''}`}
            >
              {method}
            </button>
          ))}
        </div>
      </div>

      {/* Submit Button */}
      <div className={styles.submitSection}>
        <button
          type="submit"
          disabled={isSaving || subjects.length === 0 || levels.length === 0 || !experience}
          className={styles.submitButton}
        >
          {isSaving ? 'Saving Template...' : 'Save Template'}
        </button>
      </div>
    </form>
  );
}
