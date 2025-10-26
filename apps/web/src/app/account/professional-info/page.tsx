'use client';

import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { useRoleGuard } from '@/app/hooks/useRoleGuard';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import TutorProfessionalInfoForm from '../components/TutorProfessionalInfoForm';
import ClientProfessionalInfoForm from '../components/ClientProfessionalInfoForm';
import AgentProfessionalInfoForm from '../components/AgentProfessionalInfoForm';

export default function ProfessionalInfoPage() {
  const { profile, activeRole, isLoading } = useUserProfile();
  const { isAllowed, isLoading: roleLoading } = useRoleGuard(['provider', 'agent', 'seeker']);
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  // Initialize mounted state
  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect if not logged in
  useEffect(() => {
    if (!isLoading && !profile) {
      router.push('/login?redirect=/account/professional-info');
    }
  }, [isLoading, profile, router]);

  // Show loading state
  if (!mounted || isLoading || roleLoading || !profile) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '3px solid #e5e7eb',
          borderTopColor: '#2563eb',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p style={{ color: '#6b7280' }}>Loading professional information...</p>
      </div>
    );
  }

  // Role guard will redirect if not allowed
  if (!isAllowed) {
    return null;
  }

  // Map roles to form components
  const renderFormForRole = () => {
    switch (activeRole) {
      case 'provider':
        return <TutorProfessionalInfoForm />;
      case 'seeker':
        return <ClientProfessionalInfoForm />;
      case 'agent':
        return <AgentProfessionalInfoForm />;
      default:
        return (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
            <p>Please select a role to manage professional information.</p>
          </div>
        );
    }
  };

  return (
    <div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '0.5rem' }}>
        Professional Information
      </h2>
      <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
        Edit your professional template. This information can be used to quickly create new listings.
      </p>

      <div style={{
        padding: '0.75rem 1rem',
        background: '#eff6ff',
        border: '1px solid #bfdbfe',
        borderRadius: '6px',
        marginBottom: '2rem',
        fontSize: '0.875rem',
        color: '#1e40af'
      }}>
        💡 <strong>Note:</strong> This is an editable template. Changes won&apos;t affect your existing listings.
      </div>

      {renderFormForRole()}
    </div>
  );
}
