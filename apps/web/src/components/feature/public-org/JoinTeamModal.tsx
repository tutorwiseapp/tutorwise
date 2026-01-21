/**
 * Filename: JoinTeamModal.tsx
 * Purpose: Modal for applying to join an organisation team
 * Created: 2026-01-05
 *
 * Features:
 * - Application form for joining organisation
 * - Uses HubComplexModal for consistent styling
 * - Subjects multi-select (reused from professional info)
 * - Optional fee/salary expectations
 * - Submits to /api/organisation/recruitment/apply
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import HubComplexModal from '@/app/components/hub/modal/HubComplexModal/HubComplexModal';
import UnifiedMultiSelect from '@/app/components/ui/forms/UnifiedMultiSelect';
import Button from '@/app/components/ui/actions/Button';
import toast from 'react-hot-toast';
import styles from './JoinTeamModal.module.css';

interface Organisation {
  id: string;
  name: string;
  slug: string;
}

interface Profile {
  id: string;
  full_name: string;
  email: string;
}

interface JoinTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  organisation: Organisation;
  currentUser: Profile;
}

// Subject options (reused from ProfessionalInfoForm)
const subjectsOptions = [
  { value: 'Mathematics', label: 'Mathematics' },
  { value: 'English', label: 'English' },
  { value: 'Science', label: 'Science' },
  { value: 'Physics', label: 'Physics' },
  { value: 'Chemistry', label: 'Chemistry' },
  { value: 'Biology', label: 'Biology' },
  { value: 'History', label: 'History' },
  { value: 'Geography', label: 'Geography' },
  { value: 'French', label: 'French' },
  { value: 'Spanish', label: 'Spanish' },
  { value: 'German', label: 'German' },
  { value: 'Computer Science', label: 'Computer Science' },
  { value: 'Business Studies', label: 'Business Studies' },
  { value: 'Economics', label: 'Economics' },
  { value: 'Psychology', label: 'Psychology' },
  { value: 'Art', label: 'Art' },
  { value: 'Music', label: 'Music' },
  { value: 'Physical Education', label: 'Physical Education' },
];

const availabilityOptions = [
  { value: 'full-time', label: 'Full-time' },
  { value: 'part-time', label: 'Part-time' },
  { value: 'flexible', label: 'Flexible' },
  { value: 'weekends-only', label: 'Weekends only' },
  { value: 'evenings-only', label: 'Evenings only' },
];

export function JoinTeamModal({ isOpen, onClose, organisation, currentUser }: JoinTeamModalProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [expertise, setExpertise] = useState('');
  const [subjects, setSubjects] = useState<string[]>([]);
  const [whyJoin, setWhyJoin] = useState('');
  const [availability, setAvailability] = useState<string[]>([]);
  const [tuitionFee, setTuitionFee] = useState('');
  const [salary, setSalary] = useState('');

  // Validation
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!expertise.trim()) {
      newErrors.expertise = 'Please describe your expertise';
    }

    if (subjects.length === 0) {
      newErrors.subjects = 'Please select at least one subject';
    }

    if (!whyJoin.trim()) {
      newErrors.whyJoin = 'Please tell us why you want to join';
    }

    if (availability.length === 0) {
      newErrors.availability = 'Please select at least one availability option';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/organisation/recruitment/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organisation_id: organisation.id,
          organisation_name: organisation.name,
          expertise,
          subjects,
          why_join: whyJoin,
          availability,
          tuition_fee_expectation: tuitionFee ? parseFloat(tuitionFee) : null,
          salary_expectation: salary ? parseFloat(salary) : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit application');
      }

      toast.success('Application submitted successfully!');
      onClose();

      // Reset form
      setExpertise('');
      setSubjects([]);
      setWhyJoin('');
      setAvailability([]);
      setTuitionFee('');
      setSalary('');
      setErrors({});

      // Optional: Navigate to a success page or show confirmation
      // router.push(`/organisation/${organisation.slug}?applied=true`);
    } catch (error: any) {
      console.error('Failed to submit application:', error);
      toast.error(error.message || 'Failed to submit application. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    // Check if form has changes
    const hasChanges = expertise || subjects.length > 0 || whyJoin || availability.length > 0 || tuitionFee || salary;

    if (hasChanges && !window.confirm('You have unsaved changes. Are you sure you want to close?')) {
      return;
    }

    onClose();
  };

  return (
    <HubComplexModal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Join ${organisation.name}`}
      subtitle="Submit your application to join this organisation"
      size="md"
      isLoading={isSubmitting}
      loadingText="Submitting application..."
      footer={
        <div className={styles.footer}>
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Application'}
          </Button>
        </div>
      }
    >
      <form className={styles.form} onSubmit={handleSubmit}>
        {/* Expertise */}
        <div className={styles.field}>
          <label htmlFor="expertise" className={styles.label}>
            Your Expertise <span className={styles.required}>*</span>
          </label>
          <textarea
            id="expertise"
            value={expertise}
            onChange={(e) => setExpertise(e.target.value)}
            placeholder="E.g., GCSE Maths, A-Level Physics, Primary English..."
            className={styles.textarea}
            rows={3}
            disabled={isSubmitting}
          />
          {errors.expertise && <span className={styles.error}>{errors.expertise}</span>}
        </div>

        {/* Subjects */}
        <div className={styles.field}>
          <label htmlFor="subjects" className={styles.label}>
            Subjects <span className={styles.required}>*</span>
          </label>
          <UnifiedMultiSelect
            triggerLabel={subjects.length > 0 ? `${subjects.length} selected` : 'Select subjects you teach'}
            options={subjectsOptions}
            selectedValues={subjects}
            onSelectionChange={setSubjects}
          />
          {errors.subjects && <span className={styles.error}>{errors.subjects}</span>}
        </div>

        {/* Why Join */}
        <div className={styles.field}>
          <label htmlFor="whyJoin" className={styles.label}>
            Why do you want to join? <span className={styles.required}>*</span>
          </label>
          <textarea
            id="whyJoin"
            value={whyJoin}
            onChange={(e) => setWhyJoin(e.target.value)}
            placeholder="Tell us about your motivation and what you can bring to the team..."
            className={styles.textarea}
            rows={4}
            disabled={isSubmitting}
          />
          {errors.whyJoin && <span className={styles.error}>{errors.whyJoin}</span>}
        </div>

        {/* Availability */}
        <div className={styles.field}>
          <label htmlFor="availability" className={styles.label}>
            Availability <span className={styles.required}>*</span>
          </label>
          <UnifiedMultiSelect
            triggerLabel={availability.length > 0 ? `${availability.length} selected` : 'Select your availability'}
            options={availabilityOptions}
            selectedValues={availability}
            onSelectionChange={setAvailability}
          />
          {errors.availability && <span className={styles.error}>{errors.availability}</span>}
        </div>

        {/* Fee & Salary Expectations */}
        <div className={styles.row}>
          <div className={styles.field}>
            <label htmlFor="tuitionFee" className={styles.label}>
              Tuition Fee per Hour
            </label>
            <input
              type="number"
              id="tuitionFee"
              value={tuitionFee}
              onChange={(e) => setTuitionFee(e.target.value)}
              placeholder="50"
              className={styles.input}
              min="0"
              step="0.01"
              disabled={isSubmitting}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="salary" className={styles.label}>
              Salary Expectation per Month
            </label>
            <input
              type="number"
              id="salary"
              value={salary}
              onChange={(e) => setSalary(e.target.value)}
              placeholder="2000"
              className={styles.input}
              min="0"
              step="0.01"
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* Info note */}
        <div className={styles.note}>
          <p>
            Your application will be reviewed by the organisation owner.
            They can view your profile to learn more about your qualifications and experience.
          </p>
        </div>
      </form>
    </HubComplexModal>
  );
}
