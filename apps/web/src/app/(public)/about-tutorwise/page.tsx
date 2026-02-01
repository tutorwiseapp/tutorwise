/**
 * Filename: apps/web/src/app/(public)/about-tutorwise/page.tsx
 * Purpose: About Tutorwise page - Company information, mission, values, and brand story
 * Created: 2025-01-31
 */

import Link from 'next/link';
import Container from '@/app/components/layout/Container';
import Button from '@/app/components/ui/actions/Button';
import styles from './page.module.css';

export default function AboutTutorwisePage() {
  return (
    <div className={styles.aboutPage}>
      {/* Hero Section - Lead with Philosophy */}
      <section className={styles.hero}>
        <Container>
          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>Learn Your Way</h1>
            <p className={styles.heroPhilosophy}>Trust the way you learn.</p>
            <p className={styles.heroIntro}>
              There is no single path to learning. No single authority. No single type of tutor.
              No socioeconomic barrier. No single definition of success. At Tutorwise, we believe
              education should adapt to you — not the other way around.
            </p>
          </div>
        </Container>
      </section>

      {/* Our Story - The Narrative */}
      <section className={styles.story}>
        <Container variant="narrow">
          <h2 className={styles.sectionTitle}>No More Strangers in Learning</h2>
          <div className={styles.storyContent}>
            <p>
              Finding the right tutor has always been a leap of faith. You search through endless
              profiles, unsure who to trust. You take a chance on a stranger, hoping they&apos;ll
              understand your goals, your pace, your way of learning.
            </p>
            <p>
              We built Tutorwise to change that. Our mission is simple: <strong>turn strangers
              into trusted teachers</strong>.
            </p>
            <p>
              Through rigorous verification, intelligent matching, and a community built on
              credibility, we&apos;ve created an ecosystem where trust comes first. Where every
              tutor is vetted. Where every connection is meaningful. Where opportunity flows
              through networks, referrals, and genuine relationships.
            </p>
          </div>
        </Container>
      </section>

      {/* Mission & Vision */}
      <section className={styles.missionVision}>
        <Container>
          <div className={styles.missionVisionGrid}>
            <div className={styles.missionCard}>
              <h3>Our Vision</h3>
              <p>
                To become the global leader in education — where opportunity flows through
                credibility, referrals, and networks. We&apos;re creating an inclusive, equitable
                tutoring ecosystem where trust and connection shape meaningful opportunities.
              </p>
            </div>
            <div className={styles.visionCard}>
              <h3>Our Mission</h3>
              <p>
                To maximise opportunities by fostering trust, incentivising referrals, and
                growing connections across our global tutoring network. We focus on helping
                clients, tutors, and agents connect, collaborate, and engage seamlessly —
                ensuring transparency and meaningful outcomes at every step.
              </p>
            </div>
          </div>
        </Container>
      </section>

      {/* Our Values - External-facing (1-3) */}
      <section className={styles.values}>
        <Container>
          <h2 className={styles.sectionTitle}>What We Stand For</h2>
          <p className={styles.sectionSubtitle}>
            Our values guide everything we do. They help us build meaningful connections,
            empower our community, and create experiences that inspire trust and inclusivity.
          </p>
          <div className={styles.valuesGrid}>
            <div className={styles.valueCard}>
              <div className={styles.valueIcon}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3>Focus on the User</h3>
              <p>
                We create user-driven experiences by simplifying complexity, fostering
                opportunities, and incentivising meaningful interactions. Every feature,
                every decision puts your experience at the heart of what we do.
              </p>
            </div>
            <div className={styles.valueCard}>
              <div className={styles.valueIcon}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3>Build Thriving Communities</h3>
              <p>
                We build a community where everyone feels connected, valued, and empowered
                to achieve shared success. Long-term relationships and growth matter more
                than one-off transactions.
              </p>
            </div>
            <div className={styles.valueCard}>
              <div className={styles.valueIcon}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3>Commit to Excellence</h3>
              <p>
                We deliver excellence in every connection we make, every interaction we
                facilitate, and every experience we create. We hold ourselves to the
                highest standards because you deserve nothing less.
              </p>
            </div>
          </div>
        </Container>
      </section>

      {/* How It Works - Summary */}
      <section className={styles.howItWorks}>
        <Container>
          <h2 className={styles.sectionTitle}>How Tutorwise Works</h2>
          <div className={styles.howItWorksGrid}>
            <div className={styles.howItWorksColumn}>
              <h3>For Students & Clients</h3>
              <ol className={styles.stepsList}>
                <li>
                  <span className={styles.stepNumber}>1</span>
                  <div>
                    <strong>Search</strong>
                    <p>Tell us what you need — our AI-powered matching finds tutors who fit your goals, location, and schedule.</p>
                  </div>
                </li>
                <li>
                  <span className={styles.stepNumber}>2</span>
                  <div>
                    <strong>Book</strong>
                    <p>Review verified profiles, read reviews, and book sessions instantly with secure payments.</p>
                  </div>
                </li>
                <li>
                  <span className={styles.stepNumber}>3</span>
                  <div>
                    <strong>Learn</strong>
                    <p>Connect with your tutor online or in-person and start your personalised learning journey.</p>
                  </div>
                </li>
              </ol>
            </div>
            <div className={styles.howItWorksColumn}>
              <h3>For Tutors</h3>
              <ol className={styles.stepsList}>
                <li>
                  <span className={styles.stepNumber}>1</span>
                  <div>
                    <strong>Register</strong>
                    <p>Create your profile, showcase your expertise, qualifications, and teaching style.</p>
                  </div>
                </li>
                <li>
                  <span className={styles.stepNumber}>2</span>
                  <div>
                    <strong>Get Verified</strong>
                    <p>Complete our verification process including identity checks and DBS certification.</p>
                  </div>
                </li>
                <li>
                  <span className={styles.stepNumber}>3</span>
                  <div>
                    <strong>Start Teaching</strong>
                    <p>Receive bookings, grow your network through referrals, and build your tutoring business.</p>
                  </div>
                </li>
              </ol>
            </div>
          </div>
          <div className={styles.helpCentreLink}>
            <p>Want to learn more about using Tutorwise?</p>
            <Link href="/help-centre" className={styles.textLink}>
              Visit our Help Centre for detailed guides →
            </Link>
          </div>
        </Container>
      </section>

      {/* Why Tutorwise - Key Differentiators */}
      <section className={styles.whyTutorwise}>
        <Container>
          <h2 className={styles.sectionTitle}>Why Choose Tutorwise</h2>
          <div className={styles.differentiatorGrid}>
            <div className={styles.differentiator}>
              <div className={styles.differentiatorIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h4>Verified & Vetted</h4>
              <p>Every tutor undergoes identity verification and DBS checks. Trust is non-negotiable.</p>
            </div>
            <div className={styles.differentiator}>
              <div className={styles.differentiatorIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h4>AI-Powered Matching</h4>
              <p>Our intelligent matching considers your goals, learning style, location, and availability.</p>
            </div>
            <div className={styles.differentiator}>
              <div className={styles.differentiatorIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h4>Transparent Pricing</h4>
              <p>Clear rates, no hidden fees. Compare tutors and find quality education at competitive prices.</p>
            </div>
            <div className={styles.differentiator}>
              <div className={styles.differentiatorIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h4>Flexible Scheduling</h4>
              <p>Book sessions instantly, reschedule easily, and learn on your own terms.</p>
            </div>
            <div className={styles.differentiator}>
              <div className={styles.differentiatorIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h4>Secure Platform</h4>
              <p>Protected payments, safeguarding policies, and a commitment to your safety and privacy.</p>
            </div>
            <div className={styles.differentiator}>
              <div className={styles.differentiatorIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h4>UK-Focused Expertise</h4>
              <p>Built for the UK curriculum with tutors who understand GCSEs, A-Levels, and local education needs.</p>
            </div>
          </div>
        </Container>
      </section>

      {/* Call to Action - Moral Anchor */}
      <section className={styles.cta}>
        <Container variant="narrow">
          <div className={styles.ctaContent}>
            <h2 className={styles.ctaTitle}>Here for Good</h2>
            <p className={styles.ctaSubtitle}>
              We&apos;re not just building a platform — we&apos;re building a future where quality
              education is accessible to everyone. Join thousands of learners and tutors who are
              already part of the Tutorwise community.
            </p>
            <div className={styles.ctaButtons}>
              <Button href="/register?role=client" variant="primary" size="lg">
                Get Started as a Student
              </Button>
              <Button href="/register?role=tutor" variant="secondary" size="lg">
                Become a Tutor
              </Button>
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}
