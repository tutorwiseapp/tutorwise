'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Container from '@/app/components/layout/Container';
import Card from '@/app/components/ui/Card';
import Button from '@/app/components/ui/Button';
import type { Profile } from '@/types';
import styles from './PublicProfile.module.css';

export default function PublicProfilePage() {
  const params = useParams();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, [params.id]);

  const loadProfile = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/profiles/${params.id}`);

      if (!response.ok) {
        if (response.status === 404) {
          setError('Profile not found');
        } else {
          setError('Failed to load profile');
        }
        return;
      }

      const data = await response.json();
      setProfile(data);
    } catch (err) {
      console.error('Failed to load profile:', err);
      setError('Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Container>
        <div className={styles.loadingContainer}>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </Container>
    );
  }

  if (error || !profile) {
    return (
      <Container>
        <Card className={styles.errorCard}>
          <h2 className={styles.errorTitle}>Profile Not Found</h2>
          <p className={styles.errorMessage}>
            {error || 'The profile you are looking for does not exist.'}
          </p>
          <Button onClick={() => router.push('/marketplace')}>
            Browse Tutors
          </Button>
        </Card>
      </Container>
    );
  }

  const roleLabel = {
    tutor: 'Tutor',
    client: 'Client',
    agent: 'Agent',
  }[profile.role || 'client'];

  return (
    <div className={styles.pageContainer}>
      {/* Cover Photo */}
      {profile.cover_photo_url && (
        <div
          className={styles.coverPhoto}
          style={{ backgroundImage: `url(${profile.cover_photo_url})` }}
        />
      )}

      <Container>
        <div className={styles.profileContainer}>
          {/* Header Section */}
          <div className={styles.header}>
            <div className={styles.avatarSection}>
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.display_name || 'User avatar'}
                  className={styles.avatar}
                />
              ) : (
                <div className={styles.avatarPlaceholder}>
                  {profile.display_name?.[0]?.toUpperCase() || profile.email?.[0]?.toUpperCase() || '?'}
                </div>
              )}
            </div>

            <div className={styles.headerInfo}>
              <h1 className={styles.displayName}>
                {profile.display_name || 'Anonymous User'}
              </h1>
              <div className={styles.roleBadge}>{roleLabel}</div>
              {profile.categories && (
                <p className={styles.categories}>{profile.categories}</p>
              )}
            </div>

            <div className={styles.headerActions}>
              <Button variant="primary">Send Message</Button>
              <Button variant="outline">Book Session</Button>
            </div>
          </div>

          {/* Content Grid */}
          <div className={styles.contentGrid}>
            {/* Main Content */}
            <div className={styles.mainContent}>
              {/* About Section */}
              {profile.bio && (
                <Card className={styles.section}>
                  <h2 className={styles.sectionTitle}>About</h2>
                  <p className={styles.bio}>{profile.bio}</p>
                </Card>
              )}

              {/* Achievements Section */}
              {profile.achievements && (
                <Card className={styles.section}>
                  <h2 className={styles.sectionTitle}>Achievements</h2>
                  <p className={styles.achievements}>{profile.achievements}</p>
                </Card>
              )}

              {/* Professional Info Section */}
              {profile.role_details && (
                <Card className={styles.section}>
                  <h2 className={styles.sectionTitle}>Professional Information</h2>
                  <div className={styles.professionalInfo}>
                    {profile.role_details.subjects && profile.role_details.subjects.length > 0 && (
                      <div className={styles.infoItem}>
                        <h3 className={styles.infoLabel}>Subjects</h3>
                        <div className={styles.badgeContainer}>
                          {profile.role_details.subjects.map((subject: string) => (
                            <span key={subject} className={styles.badge}>
                              {subject}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {profile.role_details.levels && profile.role_details.levels.length > 0 && (
                      <div className={styles.infoItem}>
                        <h3 className={styles.infoLabel}>Education Levels</h3>
                        <div className={styles.badgeContainer}>
                          {profile.role_details.levels.map((level: string) => (
                            <span key={level} className={styles.badge}>
                              {level}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {profile.role_details.experience && (
                      <div className={styles.infoItem}>
                        <h3 className={styles.infoLabel}>Experience</h3>
                        <p className={styles.infoValue}>{profile.role_details.experience}</p>
                      </div>
                    )}

                    {profile.role_details.qualifications && profile.role_details.qualifications.length > 0 && (
                      <div className={styles.infoItem}>
                        <h3 className={styles.infoLabel}>Qualifications</h3>
                        <ul className={styles.qualificationsList}>
                          {profile.role_details.qualifications.map((qual: string, index: number) => (
                            <li key={index}>{qual}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <aside className={styles.sidebar}>
              {/* Contact Card */}
              <Card className={styles.sidebarCard}>
                <h3 className={styles.sidebarTitle}>Get in Touch</h3>
                <Button variant="primary" className={styles.sidebarButton}>
                  Send Message
                </Button>
                <Button variant="outline" className={styles.sidebarButton}>
                  Book Session
                </Button>
              </Card>

              {/* Stats Card */}
              <Card className={styles.sidebarCard}>
                <h3 className={styles.sidebarTitle}>Profile Stats</h3>
                <div className={styles.statsGrid}>
                  <div className={styles.statItem}>
                    <div className={styles.statValue}>
                      {profile.created_at
                        ? `Member since ${new Date(profile.created_at).getFullYear()}`
                        : 'New member'}
                    </div>
                    <div className={styles.statLabel}>Joined</div>
                  </div>
                  {profile.role === 'tutor' && (
                    <>
                      <div className={styles.statItem}>
                        <div className={styles.statValue}>4.8★</div>
                        <div className={styles.statLabel}>Rating</div>
                      </div>
                      <div className={styles.statItem}>
                        <div className={styles.statValue}>127</div>
                        <div className={styles.statLabel}>Reviews</div>
                      </div>
                    </>
                  )}
                </div>
              </Card>

              {/* Trust Badges */}
              <Card className={styles.sidebarCard}>
                <h3 className={styles.sidebarTitle}>Verified</h3>
                <div className={styles.trustBadges}>
                  <div className={styles.trustBadge}>
                    <svg className={styles.trustIcon} fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>Identity Verified</span>
                  </div>
                  <div className={styles.trustBadge}>
                    <svg className={styles.trustIcon} fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>Background Check</span>
                  </div>
                </div>
              </Card>
            </aside>
          </div>
        </div>
      </Container>
    </div>
  );
}
