/**
 * Filename: TeamMembersCard.tsx
 * Purpose: Display organisation team members with filtering and profiles
 * Created: 2025-12-31
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Star, Shield } from 'lucide-react';
import { getInitials } from '@/lib/utils/initials';
import styles from './TeamMembersCard.module.css';

interface TeamMember {
  id: string;
  full_name: string;
  slug: string;
  avatar_url?: string;
  bio?: string;
  city?: string;
  professional_details?: any;
  dbs_verified?: boolean;
  identity_verified?: boolean;
}

interface TeamMembersCardProps {
  members: TeamMember[];
  organisation: any;
}

export function TeamMembersCard({ members, organisation: _organisation }: TeamMembersCardProps) {
  const router = useRouter();
  const [selectedSubject, _setSelectedSubject] = useState<string>('all');
  const [showAll, setShowAll] = useState(false);

  // Get unique subjects from all members
  const _allSubjects = members.reduce((subjects: string[], member) => {
    const memberSubjects = member.professional_details?.tutor?.subjects ||
                          member.professional_details?.subjects ||
                          [];
    memberSubjects.forEach((subject: string) => {
      if (!subjects.includes(subject)) {
        subjects.push(subject);
      }
    });
    return subjects;
  }, []);

  // Filter members by selected subject
  const filteredMembers = selectedSubject === 'all'
    ? members
    : members.filter(member => {
        const memberSubjects = member.professional_details?.tutor?.subjects ||
                              member.professional_details?.subjects ||
                              [];
        return memberSubjects.includes(selectedSubject);
      });

  // Limit display to 12 members unless "Show All" is clicked
  const displayMembers = showAll ? filteredMembers : filteredMembers.slice(0, 12);

  // Get primary subject for a member
  const getPrimarySubject = (member: TeamMember) => {
    const subjects = member.professional_details?.tutor?.subjects ||
                    member.professional_details?.subjects ||
                    [];
    return subjects[0] || 'Tutor';
  };

  // Get rating for a member (placeholder - would come from aggregated reviews)
  const getMemberRating = (_member: TeamMember) => {
    // TODO: Get actual rating from member's reviews
    return 4.8; // Placeholder
  };

  // Handle member card click
  const handleMemberClick = (member: TeamMember) => {
    router.push(`/public-profile/${member.id}/${member.slug}`);
  };

  return (
    <div className={styles.card}>
      {/* Header */}
      <div className={styles.header}>
        <h2 className={styles.title}>Our Team</h2>
      </div>

      {/* Empty state or content wrapper */}
      {members.length === 0 ? (
        <p className={styles.placeholderText}>
          No team members yet.
        </p>
      ) : (
        <div className={styles.content}>
          {/* Members Grid */}
          <div className={styles.grid}>
              {displayMembers.map((member) => {
                const initials = getInitials(member.full_name);
                const primarySubject = getPrimarySubject(member);
                const rating = getMemberRating(member);

                return (
                  <button
                    key={member.id}
                    className={styles.memberCard}
                    onClick={() => handleMemberClick(member)}
                    aria-label={`View ${member.full_name}'s profile`}
                  >
                    {/* Avatar */}
                    <div className={styles.avatarWrapper}>
                      {member.avatar_url ? (
                        <Image
                          src={member.avatar_url}
                          alt={member.full_name}
                          width={80}
                          height={80}
                          className={styles.avatar}
                        />
                      ) : (
                        <div className={styles.avatarFallback}>
                          <span>{initials}</span>
                        </div>
                      )}

                      {/* Verification Badges */}
                      {(member.dbs_verified || member.identity_verified) && (
                        <div className={styles.badges}>
                          {member.dbs_verified && (
                            <div className={styles.badge} title="DBS Verified">
                              <Shield size={12} />
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Member Info */}
                    <div className={styles.info}>
                      <h3 className={styles.name}>{member.full_name}</h3>

                      {/* Rating */}
                      <div className={styles.rating}>
                        <Star size={14} fill="#fbbf24" color="#fbbf24" />
                        <span>{rating.toFixed(1)}</span>
                      </div>

                      {/* Primary Subject */}
                      <div className={styles.subject}>{primarySubject}</div>

                      {/* Location */}
                      {member.city && (
                        <div className={styles.location}>📍 {member.city}</div>
                      )}
                    </div>

                    {/* Hover Overlay */}
                    <div className={styles.hoverOverlay}>
                      <span>View Profile →</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Show All Button */}
            {filteredMembers.length > 12 && !showAll && (
              <div className={styles.showAllSection}>
                <button
                  className={styles.showAllButton}
                  onClick={() => setShowAll(true)}
                >
                  View All {filteredMembers.length} Tutors →
                </button>
              </div>
            )}

            {/* Show Less Button */}
            {showAll && (
              <div className={styles.showAllSection}>
                <button
                  className={styles.showAllButton}
                  onClick={() => setShowAll(false)}
                >
                  Show Less ↑
                </button>
              </div>
            )}
        </div>
      )}
    </div>
  );
}
