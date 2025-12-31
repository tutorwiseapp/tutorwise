/**
 * Filename: /join/[slug]/page.tsx
 * Purpose: Public organisation referral landing page
 * Created: 2025-12-31
 */

import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { CheckCircle2, Users, TrendingUp, Award, MapPin, ArrowRight } from 'lucide-react';
import styles from './page.module.css';

interface JoinPageProps {
  params: {
    slug: string;
  };
  searchParams: {
    ref?: string;
  };
}

export default async function JoinPage({ params, searchParams }: JoinPageProps) {
  const supabase = await createClient();

  // Get organisation by slug
  const { data: organisation, error: orgError } = await supabase
    .from('connection_groups')
    .select(`
      id,
      name,
      slug,
      bio,
      website,
      logo_url,
      location,
      profile_id,
      public_profile_enabled,
      profile:profile_id (
        full_name,
        avatar_url
      )
    `)
    .eq('slug', params.slug)
    .eq('public_profile_enabled', true)
    .single();

  if (orgError || !organisation) {
    redirect('/marketplace');
  }

  // Get referrer information if ref code provided
  let referrer = null;
  if (searchParams.ref) {
    const { data: referrerProfile } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, bio')
      .eq('referral_code', searchParams.ref)
      .single();

    if (referrerProfile) {
      referrer = referrerProfile;
    }
  }

  // Get organisation stats
  const { data: orgStats } = await supabase.rpc('get_organisation_public_stats', {
    p_organisation_id: organisation.id,
  });

  // Get team members count
  const { count: teamMembersCount } = await supabase
    .from('group_members')
    .select('*', { count: 'exact', head: true })
    .eq('group_id', organisation.id);

  // Check if referral program is enabled
  const { data: referralConfig } = await supabase
    .from('organisation_referral_config')
    .select('enabled')
    .eq('organisation_id', organisation.id)
    .single();

  const referralEnabled = referralConfig?.enabled || false;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Hero Section */}
        <div className={styles.hero}>
          {organisation.logo_url && (
            <Image
              src={organisation.logo_url}
              alt={organisation.name}
              width={120}
              height={120}
              className={styles.logo}
            />
          )}
          <h1 className={styles.title}>{organisation.name}</h1>
          {organisation.location && (
            <div className={styles.location}>
              <MapPin size={18} />
              <span>{organisation.location}</span>
            </div>
          )}
          {organisation.bio && (
            <p className={styles.bio}>{organisation.bio}</p>
          )}
        </div>

        {/* Referrer Card */}
        {referrer && (
          <div className={styles.referrerCard}>
            <div className={styles.referrerHeader}>
              <Award size={24} className={styles.referrerIcon} />
              <h2 className={styles.referrerTitle}>You&rsquo;ve been referred!</h2>
            </div>
            <div className={styles.referrerContent}>
              {referrer.avatar_url && (
                <Image
                  src={referrer.avatar_url}
                  alt={referrer.full_name}
                  width={64}
                  height={64}
                  className={styles.referrerAvatar}
                />
              )}
              <div>
                <div className={styles.referrerName}>{referrer.full_name}</div>
                <div className={styles.referrerText}>
                  from {organisation.name} has invited you to join
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <Users size={32} className={styles.statIcon} />
            <div className={styles.statValue}>{teamMembersCount || 0}</div>
            <div className={styles.statLabel}>Team Members</div>
          </div>
          {orgStats && (
            <>
              <div className={styles.statCard}>
                <TrendingUp size={32} className={styles.statIcon} />
                <div className={styles.statValue}>{orgStats.total_reviews || 0}</div>
                <div className={styles.statLabel}>Client Reviews</div>
              </div>
              <div className={styles.statCard}>
                <CheckCircle2 size={32} className={styles.statIcon} />
                <div className={styles.statValue}>{orgStats.avg_rating || '5.0'}</div>
                <div className={styles.statLabel}>Average Rating</div>
              </div>
            </>
          )}
        </div>

        {/* Benefits Section */}
        <div className={styles.benefitsSection}>
          <h2 className={styles.benefitsTitle}>Why Join {organisation.name}?</h2>
          <div className={styles.benefitsList}>
            <div className={styles.benefitItem}>
              <CheckCircle2 size={24} className={styles.benefitIcon} />
              <div>
                <div className={styles.benefitTitle}>Expert Team</div>
                <div className={styles.benefitText}>
                  Work with {teamMembersCount || 'experienced'} professional tutors and educators
                </div>
              </div>
            </div>
            <div className={styles.benefitItem}>
              <CheckCircle2 size={24} className={styles.benefitIcon} />
              <div>
                <div className={styles.benefitTitle}>Proven Results</div>
                <div className={styles.benefitText}>
                  Join a community with a track record of success
                </div>
              </div>
            </div>
            <div className={styles.benefitItem}>
              <CheckCircle2 size={24} className={styles.benefitIcon} />
              <div>
                <div className={styles.benefitTitle}>Personalized Support</div>
                <div className={styles.benefitText}>
                  Get matched with the perfect tutor for your needs
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className={styles.ctaSection}>
          <h2 className={styles.ctaTitle}>Ready to get started?</h2>
          <p className={styles.ctaText}>
            {referrer
              ? `Join ${organisation.name} through ${referrer.full_name}'s referral and start your learning journey today.`
              : `Explore tutors from ${organisation.name} and find the perfect match for your needs.`}
          </p>
          <div className={styles.ctaButtons}>
            <Link
              href={`/organisation/${organisation.slug}`}
              className={styles.primaryButton}
            >
              Browse Tutors
              <ArrowRight size={20} />
            </Link>
            <Link
              href={`/organisation/${organisation.slug}#contact`}
              className={styles.secondaryButton}
            >
              Contact Us
            </Link>
          </div>
        </div>

        {/* Footer Note */}
        {referralEnabled && referrer && (
          <div className={styles.footerNote}>
            <p>
              By signing up through this referral link, {referrer.full_name} may earn a commission.
              This doesn&rsquo;t affect your pricing or service quality.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
