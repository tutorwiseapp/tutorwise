// app/components/onboarding/agent/page.tsx

'use client';

import { useRouter } from 'next/navigation';
import AgentOnboardingWizard from '@/app/components/feature/onboarding/agent/AgentOnboardingWizard';

export default function AgentOnboardingPage() {
  const router = useRouter();

  const handleComplete = () => {
    router.push('/dashboard');
  };

  return <AgentOnboardingWizard onComplete={handleComplete} />;
}
