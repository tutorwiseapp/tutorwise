/*
 * Filename: src/app/agents/[agentId]/page.tsx
 * Purpose: Displays the public profile for a Vinite agent, fetching live data from the backend.
 * Change History:
 * C011 - 2025-08-08 : 23:00 - Corrected "Refer Me" to use URL query params instead of sessionStorage.
 * C010 - 2025-08-08 : 22:00 - Implemented definitive, correct logic for all buttons.
 * C009 - 2025-08-08 : 21:00 - Implemented full functionality for buttons and activity links.
 * Last Modified: 2025-08-08 : 23:00
 * Requirement ID: VIN-C-03.3
 * Change Summary: This is the definitive fix for the "Refer Me" button. It now correctly uses URL query parameters (`/?agentId=...`) to pass the agent's ID to the homepage. This is a more robust and reliable method than sessionStorage, aligning with best practices.
 * Impact Analysis: This change makes the "Refer Me" user journey robust and verifiable.
 * Dependencies: "react", "next/navigation", "next/link", "@clerk/nextjs", "@/types", "react-hot-toast", and VDL UI components.
 */
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Profile } from '@/types';
import Image from 'next/image';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import toast from 'react-hot-toast';
import getProfileImageUrl from '@/lib/utils/image';
import Container from '@/app/components/layout/Container';
import Card from '@/app/components/ui/Card';
import Button from '@/app/components/ui/Button';
import styles from './page.module.css';

// ... (The rest of the component remains the same)
const AgentProfilePage = () => {
  const [agent, setAgent] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const params = useParams();
  const router = useRouter(); 
  const agentId = params.agentId as string;
  const { user: loggedInUser } = useUser();

  // ... (useEffect and other functions remain the same)
  useEffect(() => {
    if (!agentId) {
        setIsLoading(false);
        return;
    };
    const fetchAgentProfile = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/agents/${agentId}`);
        if (!response.ok) throw new Error('Agent profile not found.');
        const data: Profile = await response.json();
        setAgent(data);
      } catch (error) {
        console.error("Failed to fetch agent profile:", error);
        setAgent(null);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAgentProfile();
  }, [agentId]);

  // --- THIS IS THE DEFINITIVE FIX ---
  const handleReferMe = () => {
    if (!agent) return;
    // Navigate to homepage and pass agentId as a query parameter
    router.push(`/?agentId=${agent.agent_id}`);
  };

  const handleRewardMe = () => {
    if (!agent) return;
    router.push(`/sign-up?reward_agent=${agent.agent_id}`);
  };

  const handleContactMe = () => {
    if (!agent) return;
    router.push(`/contact-agent?id=${agent.agent_id}`);
  };
  
  const handleShare = (platform: 'whatsapp' | 'linkedin') => {
    if (!agent) return;
    const text = `Check out ${agent.display_name}'s Vinite referral profile: ${window.location.href}`;
    let url = '';
    if (platform === 'whatsapp') {
      url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    } else {
      url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`;
    }
    window.open(url, '_blank');
  };
  // --- END OF FIX ---

  // ... (The rest of the JSX remains exactly the same)
  if (isLoading) {
    return <Container><p className={styles.message}>Loading Agent Profile...</p></Container>;
  }
  
  if (!agent) {
    return (
      <Container>
        <div className={styles.message}>
          <h1>Agent Not Found</h1>
          <p>The agent with ID <strong>{agentId}</strong> could not be found.</p>
        </div>
      </Container>
    );
  }

  const isOwnProfile = loggedInUser?.publicMetadata?.agent_id === agent.agent_id;

  return (
    <Container>
      <div className={styles.profileGrid}>
        <aside>
           <Card className={styles.profileCard}>
            <div className={styles.coverPhoto} style={{ backgroundImage: agent.cover_photo_url ? `url(${agent.cover_photo_url})` : 'none' }} />
            <Image
              src={getProfileImageUrl(agent)}
              alt={`${agent.display_name}'s profile picture`}
              width={150} height={150}
              className={styles.profileAvatar}
            />
            <div className={styles.profileBody}>
              <h2 className={styles.profileName}>{agent.display_name}</h2>
              <p className={styles.profileId}>{agent.agent_id}</p>
              
              {isOwnProfile && <Link href="/profile" className={styles.editProfileLink}>Edit Profile</Link>}
              
              <div className={styles.detailsSection}>
                <h3>About</h3>
                <p className={styles.profileBio}>{agent.bio || 'This agent has not provided a bio yet.'}</p>
              </div>
              
              <div className={styles.detailsSection}>
                <h3>Specialties</h3>
                <p className={styles.noDataText}>{agent.categories || 'Not specified.'}</p>
              </div>

              <div className={styles.detailsSection}>
                <h3>Achievements</h3>
                <p className={styles.noDataText}>{agent.achievements || 'No achievements to display.'}</p>
              </div>
            </div>
          </Card>
        </aside>
        
        <main>
          <Card className={styles.contentCard}>
            <h3>Actions</h3>
            <div className={styles.actionsGrid}>
              <Button variant="primary" onClick={handleReferMe}>Refer Me</Button>
              <Button variant="secondary" onClick={handleRewardMe}>Reward Me</Button>
            </div>
          </Card>
        </main>
      </div>
    </Container>
  );
};

export default AgentProfilePage;