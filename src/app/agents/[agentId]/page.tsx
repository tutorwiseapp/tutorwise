/*
 * Filename: src/app/agents/[agentId]/page.tsx
 * Purpose: Displays the public profile for a Vinite agent, fetching live data from the backend.
 * Change History:
 * C003 - 2025-08-08 : 14:00 - Refactored to use the standard two-column profile layout.
 * C002 - 2025-07-26 : 22:45 - Added logic to check if viewer is the profile owner.
 * C001 - 2025-07-26 : 22:30 - Initial creation.
 * Last Modified: 2025-08-08 : 14:00
 * Requirement ID: VIN-C-03.3
 * Change Summary: This page has been refactored to use the same standardized two-column layout (`profileLayout`) as the private profile page, ensuring UI consistency. The `ProfileSidebar` is not used here; instead, the page constructs a similar layout using standard VDL components like `<Card>` to display the agent's public information in the left-hand column. This aligns the page with our "System First" design principles.
 * Impact Analysis: This change significantly improves the user experience by creating a consistent and predictable layout for both private and public user profiles.
 * Dependencies: "react", "next/navigation", "next/link", "@clerk/nextjs", "@/types", and VDL UI components.
 */
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { Profile } from '@/types';
import Image from 'next/image';
import { useUser } from '@clerk/nextjs';
import getProfileImageUrl from '@/lib/utils/image';

// VDL Component Imports
import Container from '@/app/components/layout/Container';
import Card from '@/app/components/ui/Card';
import Button from '@/app/components/ui/Button';

// Import the shared layout styles from the private profile page
import layoutStyles from '@/app/profile/page.module.css';
// Import page-specific styles
import styles from './page.module.css';

const AgentProfilePage = () => {
  const [agent, setAgent] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const params = useParams();
  const agentId = params.agentId as string;
  const { user: loggedInUser } = useUser();

  useEffect(() => {
    if (!agentId) {
        setIsLoading(false);
        return;
    };

    const fetchAgentProfile = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/agents/${agentId}`);
        if (!response.ok) {
          throw new Error('Agent profile not found.');
        }
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
      {/* --- THIS IS THE FIX: Use the shared layout class --- */}
      <div className={layoutStyles.profileLayout}>
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
              
              <hr className={styles.detailsDivider} />
              <div className={styles.detailsSection}>
                <h3>About</h3>
                <p className={styles.profileBio}>{agent.bio || 'No bio provided.'}</p>
              </div>
              
              <hr className={styles.detailsDivider} />
              <div className={styles.detailsSection}>
                <h3>Specialties</h3>
                <div className={styles.tagContainer}>
                  {agent.categories && agent.categories.length > 0 ? agent.categories.split(',').map(cat => (
                    <span key={cat.trim()} className={styles.tag}>{cat.trim()}</span>
                  )) : <p className={styles.noDataText}>Not specified.</p>}
                </div>
              </div>
            </div>
          </Card>
        </aside>
        
        <main>
          <Card className={styles.contentCard}>
            <h3>Actions</h3>
            <div className={styles.actionsGrid}>
              <Button variant="primary">Refer Me</Button>
              <Button variant="primary">Reward Me</Button>
            </div>
          </Card>
        </main>
      </div>
    </Container>
  );
};

export default AgentProfilePage;