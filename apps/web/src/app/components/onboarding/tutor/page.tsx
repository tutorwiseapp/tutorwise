// app/components/onboarding/tutor/page.tsx

'use client';

import { useRouter } from 'next/navigation';
import TutorOnboardingWizard from '@/app/components/onboarding/tutor/TutorOnboardingWizard';

export default function TutorOnboardingPage() {
  const router = useRouter();
  
  const handleComplete = () => {
    router.push('/dashboard');
  };

  return <TutorOnboardingWizard onComplete={handleComplete} />;
}
