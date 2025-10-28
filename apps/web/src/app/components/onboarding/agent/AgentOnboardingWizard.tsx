// apps/web/src/app/components/onboarding/agent/AgentOnboardingWizard.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { useAutoSaveDraft, loadDraft, clearDraft, saveCurrentStep } from '@/lib/utils/wizardUtils';
import { createClient } from '@/utils/supabase/client';
import AgentWelcomeStep from '@/app/components/onboarding/steps/WelcomeStep';
import AgentPersonalInfoStep from './AgentPersonalInfoStep';
import AgentDetailsStep from './AgentDetailsStep';
import AgentServicesStep from './AgentServicesStep';
import AgentCapacityStep from './AgentCapacityStep';
import { AgencyDetailsData, CapacityData } from '@/types';
import { PersonalInfoData } from '../tutor/TutorOnboardingWizard';
import styles from '../OnboardingWizard.module.css';

export type AgentOnboardingStep = 'personalInfo' | 'details' | 'services' | 'capacity' | 'completion';

interface AgentOnboardingWizardProps {
  onComplete: () => void;
  onSkip?: () => void;
  mode?: 'modal' | 'fullPage';
  initialStep?: string;
}

interface AgentDraftData {
  personalInfo: Partial<PersonalInfoData>;
  agencyDetails: Partial<AgencyDetailsData>;
  services: string[];
  capacity: Partial<CapacityData>;
}

const AgentOnboardingWizard: React.FC<AgentOnboardingWizardProps> = ({
  onComplete,
  onSkip,
  mode = 'fullPage',
  initialStep
}) => {
  const { profile, user, updateOnboardingProgress } = useUserProfile();
  const supabase = createClient();
  const DRAFT_KEY = 'onboarding_draft_agent';

  const [currentStep, setCurrentStep] = useState<AgentOnboardingStep>(
    (initialStep as AgentOnboardingStep) || 'personalInfo'
  );
  const [personalInfo, setPersonalInfo] = useState<Partial<PersonalInfoData>>({});
  const [agencyDetails, setAgencyDetails] = useState<Partial<AgencyDetailsData>>({});
  const [services, setServices] = useState<string[]>([]);
  const [capacity, setCapacity] = useState<Partial<CapacityData>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isDraftLoaded, setIsDraftLoaded] = useState(false);

  // Load draft from database on mount
  useEffect(() => {
    async function loadSavedDraft() {
      if (!isDraftLoaded) {
        const draft = await loadDraft<AgentDraftData>(user?.id, DRAFT_KEY);
        if (draft) {
          if (draft.personalInfo) setPersonalInfo(draft.personalInfo);
          if (draft.agencyDetails) setAgencyDetails(draft.agencyDetails);
          if (draft.services) setServices(draft.services);
          if (draft.capacity) setCapacity(draft.capacity);
        }
        setIsDraftLoaded(true);
      }
    }
    loadSavedDraft();
  }, [user?.id, isDraftLoaded]);

  // Prepare form data for auto-save
  const formData: AgentDraftData = {
    personalInfo,
    agencyDetails,
    services,
    capacity,
  };

  // Auto-save draft every 30 seconds (with database sync)
  const { saveDraft } = useAutoSaveDraft<AgentDraftData>(
    user?.id,
    DRAFT_KEY,
    formData,
    (data) => !!data.personalInfo?.firstName || Object.keys(data.agencyDetails).length > 0 // Save if user has started filling personal info or agency details
  );

  // Save current step whenever it changes
  useEffect(() => {
    if (isDraftLoaded) {
      saveCurrentStep(user?.id, DRAFT_KEY, currentStep);
    }
  }, [user?.id, currentStep, isDraftLoaded]);

  // Scroll to top when step changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep]);

  const handlePersonalInfoSubmit = async (data: PersonalInfoData) => {
    console.log('[AgentOnboardingWizard] handlePersonalInfoSubmit called', data);

    // Update state immediately
    setPersonalInfo(data);
    setIsLoading(true);

    try {
      const fullName = `${data.firstName} ${data.lastName}`.trim();

      // Upload identity verification document if provided
      let identityDocumentUrl = data.identityVerificationDocumentUrl || '';
      let identityDocumentName = data.identityVerificationDocumentName || '';

      if (data.identityVerificationDocumentFile) {
        console.log('[AgentOnboardingWizard] Uploading identity verification document...');

        const fileExt = data.identityVerificationDocumentFile.name.split('.').pop();
        const fileName = `${user!.id}-identity-${Date.now()}.${fileExt}`;
        const filePath = `identity-documents/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('verification-documents')
          .upload(filePath, data.identityVerificationDocumentFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('[AgentOnboardingWizard] Error uploading identity document:', uploadError);
          throw new Error('Failed to upload identity verification document');
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('verification-documents')
          .getPublicUrl(filePath);

        identityDocumentUrl = publicUrl;
        identityDocumentName = data.identityVerificationDocumentFile.name;

        console.log('[AgentOnboardingWizard] ✓ Identity document uploaded:', identityDocumentUrl);
      }

      // Save all personal info to profile
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: data.firstName,
          last_name: data.lastName,
          full_name: fullName,
          gender: data.gender,
          date_of_birth: data.dateOfBirth,
          phone: data.phone,
          address_line1: data.address,
          town: data.town,
          city: data.city,
          country: data.country,
          postal_code: data.postalCode,
          emergency_contact_name: data.emergencyContactName,
          emergency_contact_email: data.emergencyContactEmail,
          identity_verification_document_url: identityDocumentUrl || null,
          identity_verification_document_name: identityDocumentName || null,
          dbs_certificate_number: data.dbsCertificateNumber || null,
          dbs_certificate_date: data.dbsCertificateDate || null,
        })
        .eq('id', user!.id);

      if (error) {
        console.error('[AgentOnboardingWizard] Error saving personal info:', error);
        throw error;
      }

      console.log('[AgentOnboardingWizard] ✓ Personal info saved to profile');

      // Move to next step
      setCurrentStep('details');

      // Update onboarding progress in background
      updateOnboardingProgress({
        current_step: 'details',
      }).catch(error => {
        console.error('[AgentOnboardingWizard] Error updating progress:', error);
      });

    } catch (error) {
      console.error('[AgentOnboardingWizard] Error in handlePersonalInfoSubmit:', error);
      alert('Failed to save personal information. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDetailsSubmit = async (data: AgencyDetailsData) => {
    console.log('[AgentOnboardingWizard] handleDetailsSubmit called', data);

    // Update state and UI immediately
    setAgencyDetails(data);
    setCurrentStep('services');

    // Update database in background (don't await)
    updateOnboardingProgress({
      current_step: 'services',
      agent: { details: data }
    }).catch(error => {
      console.error('[AgentOnboardingWizard] Error updating progress:', error);
    });
  };

  const handleServicesSubmit = async (selectedServices: string[]) => {
    console.log('[AgentOnboardingWizard] handleServicesSubmit called', selectedServices);

    // Update state and UI immediately
    setServices(selectedServices);
    setCurrentStep('capacity');

    // Update database in background (don't await)
    updateOnboardingProgress({
      current_step: 'capacity',
      agent: { ...(Object.keys(agencyDetails).length > 0 && { details: agencyDetails as AgencyDetailsData }), services: selectedServices }
    }).catch(error => {
      console.error('[AgentOnboardingWizard] Error updating progress:', error);
    });
  };

  const handleCapacitySubmit = async (data: CapacityData) => {
    console.log('[AgentOnboardingWizard] handleCapacitySubmit called', data);
    setIsLoading(true);

    try {
      setCapacity(data);

      // Add 'agent' role to user's roles if not already present
      const currentRoles = profile?.roles || [];
      if (!currentRoles.includes('agent')) {
        console.log('[AgentOnboardingWizard] Adding agent role to user profile...');
        const updatedRoles = [...currentRoles, 'agent'];
        const { error: roleError } = await supabase
          .from('profiles')
          .update({ roles: updatedRoles })
          .eq('id', user?.id);

        if (roleError) {
          console.error('[AgentOnboardingWizard] Error adding agent role:', roleError);
          throw roleError;
        }
      }

      // Map onboarding data to professional_details.agent structure
      console.log('[AgentOnboardingWizard] Saving to professional_details.agent...');
      const currentProfessionalDetails = profile?.professional_details || {};

      const agentData = {
        // Core agency info (from onboarding)
        agency_name: agencyDetails.agencyName || '',
        agency_size: agencyDetails.agencySize || '',
        years_in_business: agencyDetails.yearsInBusiness || '',
        description: agencyDetails.description || '',
        services: services || [],
        commission_rate: data.commissionRate?.toString() || '',
        service_areas: data.serviceAreas || [],
        student_capacity: data.studentCapacity || '',

        // Enhanced fields (empty - user fills in profile)
        subject_specializations: [],
        education_levels: [],
        coverage_areas: [],
        number_of_tutors: '',
        certifications: [],
        website: '',
        additional_info: '',

        // Availability (empty - user adds in profile)
        availability: [],
        unavailability: [],
      };

      // Save to professional_details.agent (auto-populates profile form)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          professional_details: {
            ...currentProfessionalDetails,
            agent: agentData
          }
        })
        .eq('id', user?.id);

      if (profileError) {
        console.error('[AgentOnboardingWizard] Error saving professional_details:', profileError);
        throw profileError;
      }

      console.log('[AgentOnboardingWizard] ✓ Saved to professional_details.agent');

      // Also update the database with agent-specific progress (keep old structure for reference)
      console.log('[AgentOnboardingWizard] Updating onboarding progress...');
      await updateOnboardingProgress({
        current_step: 'completion',
        agent: { ...(Object.keys(agencyDetails).length > 0 && { details: agencyDetails as AgencyDetailsData }), services, capacity: data },
        onboarding_completed: true,  // Mark as complete for standalone agent onboarding
        completed_at: new Date().toISOString()
      });
      console.log('[AgentOnboardingWizard] Progress updated, clearing draft...');

      // Clear draft since agent-specific onboarding is complete
      await clearDraft(user?.id, DRAFT_KEY);
      console.log('[AgentOnboardingWizard] Draft cleared, calling onComplete...');

      // Call parent's onComplete to redirect to dashboard
      onComplete();
    } catch (error) {
      console.error('[AgentOnboardingWizard] Error in handleCapacitySubmit:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (currentStep === 'details') setCurrentStep('personalInfo');
    if (currentStep === 'services') setCurrentStep('details');
    if (currentStep === 'capacity') setCurrentStep('services');
  }

  const handleSkipHandler = () => {
    if (onSkip) {
      onSkip();
    } else {
      onComplete();
    }
  }

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'personalInfo':
        return (
          <AgentPersonalInfoStep
            onNext={handlePersonalInfoSubmit}
            onSkip={handleSkipHandler}
            isLoading={isLoading}
          />
        );
      case 'details':
        return <AgentDetailsStep onNext={handleDetailsSubmit} onBack={handleBack} onSkip={handleSkipHandler} isLoading={isLoading} />;
      case 'services':
        return <AgentServicesStep onNext={handleServicesSubmit} onBack={handleBack} onSkip={handleSkipHandler} isLoading={isLoading} />;
      case 'capacity':
        return <AgentCapacityStep onNext={handleCapacitySubmit} onBack={handleBack} onSkip={handleSkipHandler} isLoading={isLoading} />;
      default:
        return null;
    }
  };

  return (
    <div className={`${styles.wizardContainer} ${mode === 'fullPage' ? styles.fullPage : styles.modal}`}>
      {renderCurrentStep()}
    </div>
  );
};

export default AgentOnboardingWizard;
