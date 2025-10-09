'use client';

import { useState, useEffect } from 'react';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { getProfessionalInfo, updateProfessionalInfo } from '@/lib/api/account';
import toast from 'react-hot-toast';
import styles from './ProfessionalInfoForm.module.css';

// Services offered by agencies
const AGENCY_SERVICES = [
  'Tutor placement',
  'Background checks',
  'Quality assurance',
  'Tutor training',
  'Performance monitoring',
  'Parent support',
  'Curriculum development',
  'Educational consulting',
  'Group tutoring',
  'Online tutoring platform'
];

// Subjects the agency specializes in
const SUBJECT_SPECIALIZATIONS = [
  'Mathematics',
  'Sciences',
  'Languages',
  'Humanities',
  'Arts',
  'Music',
  'Sports',
  'Special Educational Needs (SEN)',
  'Exam Preparation',
  'University Admissions'
];

// Education levels covered
const EDUCATION_LEVELS = [
  'Primary (KS1-KS2)',
  'KS3 (Years 7-9)',
  'GCSE',
  'A-Level',
  'IB',
  'Undergraduate',
  'Postgraduate',
  'Adult Education'
];

// Coverage areas (UK regions)
const UK_REGIONS = [
  'London',
  'South East',
  'South West',
  'East of England',
  'West Midlands',
  'East Midlands',
  'Yorkshire and the Humber',
  'North West',
  'North East',
  'Scotland',
  'Wales',
  'Northern Ireland',
  'Nationwide',
  'International'
];

export default function AgentProfessionalInfoForm() {
  const { user } = useUserProfile();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [agencyName, setAgencyName] = useState('');
  const [services, setServices] = useState<string[]>([]);
  const [subjectSpecializations, setSubjectSpecializations] = useState<string[]>([]);
  const [educationLevels, setEducationLevels] = useState<string[]>([]);
  const [coverageAreas, setCoverageAreas] = useState<string[]>([]);
  const [yearsInBusiness, setYearsInBusiness] = useState('');
  const [numberOfTutors, setNumberOfTutors] = useState('');
  const [commissionRate, setCommissionRate] = useState('');
  const [certifications, setCertifications] = useState<string[]>(['']);
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [description, setDescription] = useState('');

  // Load existing template data
  useEffect(() => {
    const loadTemplateData = async () => {
      if (!user?.id) return;

      try {
        const templateData = await getProfessionalInfo('agent');
        if (templateData) {
          setAgencyName(templateData.agency_name || '');
          setServices(templateData.services || []);
          setSubjectSpecializations(templateData.subject_specializations || []);
          setEducationLevels(templateData.education_levels || []);
          setCoverageAreas(templateData.coverage_areas || []);
          setYearsInBusiness(templateData.years_in_business || '');
          setNumberOfTutors(templateData.number_of_tutors || '');
          setCommissionRate(templateData.commission_rate || '');
          setCertifications(templateData.certifications && templateData.certifications.length > 0 ? templateData.certifications : ['']);
          setWebsiteUrl(templateData.website_url || '');
          setDescription(templateData.description || '');
        }
      } catch (error) {
        console.error('Error loading template:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTemplateData();
  }, [user]);

  const handleServiceToggle = (service: string) => {
    setServices(prev =>
      prev.includes(service)
        ? prev.filter(s => s !== service)
        : [...prev, service]
    );
  };

  const handleSubjectToggle = (subject: string) => {
    setSubjectSpecializations(prev =>
      prev.includes(subject)
        ? prev.filter(s => s !== subject)
        : [...prev, subject]
    );
  };

  const handleLevelToggle = (level: string) => {
    setEducationLevels(prev =>
      prev.includes(level)
        ? prev.filter(l => l !== level)
        : [...prev, level]
    );
  };

  const handleRegionToggle = (region: string) => {
    setCoverageAreas(prev =>
      prev.includes(region)
        ? prev.filter(r => r !== region)
        : [...prev, region]
    );
  };

  const handleCertificationChange = (index: number, value: string) => {
    const newCerts = [...certifications];
    newCerts[index] = value;
    setCertifications(newCerts);
  };

  const addCertification = () => {
    setCertifications([...certifications, '']);
  };

  const removeCertification = (index: number) => {
    setCertifications(certifications.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      // Filter out empty certifications
      const filteredCertifications = certifications.filter(c => c.trim() !== '');

      // Save template via API
      await updateProfessionalInfo({
        role_type: 'agent',
        agency_name: agencyName,
        services,
        subject_specializations: subjectSpecializations,
        education_levels: educationLevels,
        coverage_areas: coverageAreas,
        years_in_business: yearsInBusiness,
        number_of_tutors: numberOfTutors,
        commission_rate: commissionRate ? parseFloat(commissionRate) : undefined,
        certifications: filteredCertifications,
        website_url: websiteUrl,
        description
      });
      toast.success('✅ Template saved. This helps tutors understand your agency better.');
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
      {/* Agency Name */}
      <div className={styles.formSection}>
        <label htmlFor="agencyName" className={styles.label}>Agency Name *</label>
        <input
          id="agencyName"
          type="text"
          value={agencyName}
          onChange={(e) => setAgencyName(e.target.value)}
          className={styles.input}
          placeholder="e.g., Elite Tutors London"
          required
        />
      </div>

      {/* Services Offered */}
      <div className={styles.formSection}>
        <label className={styles.label}>Services Offered *</label>
        <p className={styles.helpText}>Select the services your agency provides</p>
        <div className={styles.chipGrid}>
          {AGENCY_SERVICES.map(service => (
            <button
              key={service}
              type="button"
              onClick={() => handleServiceToggle(service)}
              className={`${styles.chip} ${services.includes(service) ? styles.chipSelected : ''}`}
            >
              {service}
            </button>
          ))}
        </div>
      </div>

      {/* Subject Specializations */}
      <div className={styles.formSection}>
        <label className={styles.label}>Subject Specializations *</label>
        <p className={styles.helpText}>Which subjects does your agency specialize in?</p>
        <div className={styles.chipGrid}>
          {SUBJECT_SPECIALIZATIONS.map(subject => (
            <button
              key={subject}
              type="button"
              onClick={() => handleSubjectToggle(subject)}
              className={`${styles.chip} ${subjectSpecializations.includes(subject) ? styles.chipSelected : ''}`}
            >
              {subject}
            </button>
          ))}
        </div>
      </div>

      {/* Education Levels */}
      <div className={styles.formSection}>
        <label className={styles.label}>Education Levels Covered *</label>
        <p className={styles.helpText}>Which education levels do you serve?</p>
        <div className={styles.chipGrid}>
          {EDUCATION_LEVELS.map(level => (
            <button
              key={level}
              type="button"
              onClick={() => handleLevelToggle(level)}
              className={`${styles.chip} ${educationLevels.includes(level) ? styles.chipSelected : ''}`}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      {/* Coverage Areas */}
      <div className={styles.formSection}>
        <label className={styles.label}>Coverage Areas *</label>
        <p className={styles.helpText}>Which regions does your agency cover?</p>
        <div className={styles.chipGrid}>
          {UK_REGIONS.map(region => (
            <button
              key={region}
              type="button"
              onClick={() => handleRegionToggle(region)}
              className={`${styles.chip} ${coverageAreas.includes(region) ? styles.chipSelected : ''}`}
            >
              {region}
            </button>
          ))}
        </div>
      </div>

      {/* Years in Business */}
      <div className={styles.formSection}>
        <label htmlFor="yearsInBusiness" className={styles.label}>Years in Business *</label>
        <select
          id="yearsInBusiness"
          value={yearsInBusiness}
          onChange={(e) => setYearsInBusiness(e.target.value)}
          className={styles.select}
          required
        >
          <option value="">Select years</option>
          <option value="0-1 years">0-1 years</option>
          <option value="1-3 years">1-3 years</option>
          <option value="3-5 years">3-5 years</option>
          <option value="5-10 years">5-10 years</option>
          <option value="10-20 years">10-20 years</option>
          <option value="20+ years">20+ years</option>
        </select>
      </div>

      {/* Number of Tutors */}
      <div className={styles.formSection}>
        <label htmlFor="numberOfTutors" className={styles.label}>Number of Tutors</label>
        <select
          id="numberOfTutors"
          value={numberOfTutors}
          onChange={(e) => setNumberOfTutors(e.target.value)}
          className={styles.select}
        >
          <option value="">Select range</option>
          <option value="1-5">1-5 tutors</option>
          <option value="6-10">6-10 tutors</option>
          <option value="11-25">11-25 tutors</option>
          <option value="26-50">26-50 tutors</option>
          <option value="51-100">51-100 tutors</option>
          <option value="100+">100+ tutors</option>
        </select>
      </div>

      {/* Commission Rate */}
      <div className={styles.formSection}>
        <label htmlFor="commissionRate" className={styles.label}>Commission Rate (%)</label>
        <p className={styles.helpText}>Typical commission charged to tutors</p>
        <input
          id="commissionRate"
          type="number"
          value={commissionRate}
          onChange={(e) => setCommissionRate(e.target.value)}
          className={styles.input}
          placeholder="e.g., 15"
          min="0"
          max="100"
          step="0.5"
        />
      </div>

      {/* Certifications & Accreditations */}
      <div className={styles.formSection}>
        <label className={styles.label}>Certifications & Accreditations</label>
        <p className={styles.helpText}>e.g., DBS checked, Ofsted registered</p>
        {certifications.map((cert, index) => (
          <div key={index} className={styles.listItem}>
            <input
              type="text"
              value={cert}
              onChange={(e) => handleCertificationChange(index, e.target.value)}
              placeholder="e.g., DBS Enhanced Certification"
              className={styles.input}
            />
            {certifications.length > 1 && (
              <button
                type="button"
                onClick={() => removeCertification(index)}
                className={styles.removeButton}
              >
                Remove
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={addCertification}
          className={styles.addButton}
        >
          + Add Certification
        </button>
      </div>

      {/* Website URL */}
      <div className={styles.formSection}>
        <label htmlFor="websiteUrl" className={styles.label}>Website URL</label>
        <input
          id="websiteUrl"
          type="url"
          value={websiteUrl}
          onChange={(e) => setWebsiteUrl(e.target.value)}
          className={styles.input}
          placeholder="https://www.example.com"
        />
      </div>

      {/* Agency Description */}
      <div className={styles.formSection}>
        <label htmlFor="description" className={styles.label}>Agency Description *</label>
        <p className={styles.helpText}>Tell tutors and clients about your agency</p>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={styles.textarea}
          placeholder="e.g., We are a leading tutoring agency in London with over 10 years of experience..."
          rows={6}
          required
        />
      </div>

      {/* Submit Button */}
      <div className={styles.submitSection}>
        <button
          type="submit"
          disabled={
            isSaving ||
            !agencyName ||
            services.length === 0 ||
            subjectSpecializations.length === 0 ||
            educationLevels.length === 0 ||
            coverageAreas.length === 0 ||
            !yearsInBusiness ||
            !description
          }
          className={styles.submitButton}
        >
          {isSaving ? 'Saving Template...' : 'Save Template'}
        </button>
      </div>
    </form>
  );
}
