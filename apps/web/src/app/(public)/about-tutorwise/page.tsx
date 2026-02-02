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
              Learning is personal. Trust should be too. Tutorwise connects learners with tutors they can genuinely trust — not just by profiles or ratings, but by credibility, contribution, and real-world impact. Because the right tutor doesn&apos;t just teach. They change how you learn.
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
              Finding the right tutor has always been a leap of faith. Parents scroll through
              profiles. Students choose strangers. Decisions that shape futures are often made on
              limited signals, surface-level ratings, and unfamiliar names. Tutorwise was
              built to change this.
            </p>
            <p>
              Tutorwise transforms strangers into credible teachers through trust, proof, and community recognition. In our ecosystem, tutors earn credibility through real impact, learners gain confidence in who they choose, and connections are built on more than reviews. Here <strong>trust is not assumed. It is built, measured, and shared</strong>.
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
                To build the world&apos; most trusted learning ecosystem — where credibility, contribution, and community shape opportunity in education.
              </p>
            </div>
            <div className={styles.visionCard}>
              <h3>Our Mission</h3>
              <p>
               To make credibility visible in learning — so learners choose with confidence, tutors earn recognition, and communities create opportunity through trust and referrals.
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
            At Tutorwise, credibility is not claimed — it is earned. Contribution is not invisible — it is recognised. And community is not a feature — it is the foundation of learning.
          </p>
          <div className={styles.valuesGrid}>
            <div className={styles.valueCard}>
              <div className={styles.valueIcon}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3>Focus on the Learner</h3>
              <p>
                We design every experience around how people actually learn — not how systems
                expect them to. We simplify complexity, prioritise clarity, and ensure that
                every feature serves real learning needs. Learning should feel personal,
                intuitive, and empowering.
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
              <h3>Build Trust-Based Communities</h3>
              <p>
                We believe credibility grows through contribution, collaboration, and shared
                success — not just transactions. Tutorwise is built to help tutors earn trust,
                learners make confident choices, and communities thrive through recommendation,
                recognition, and genuine connection. Trust is not a by-product. It is the foundation.
              </p>
            </div>
            <div className={styles.valueCard}>
              <div className={styles.valueIcon}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3>Commit to Meaningful Excellence</h3>
              <p>
                We pursue excellence not only in performance, but in purpose. Every connection
                we enable, every interaction we design, and every experience we shape is guided
                by one principle: education should create real, lasting impact — for individuals
                and for society.
              </p>
            </div>
          </div>
        </Container>
      </section>

      {/* Tutorwise as a Learning Ecosystem */}
      <section className={styles.howItWorks}>
        <Container>
          <h2 className={styles.sectionTitle}>Tutorwise as a Learning Ecosystem</h2>
          <p className={styles.ecosystemIntro}>
            Tutorwise is designed for everyone who participates in learning —
            not just tutors and students, but the wider community that shapes
            trust and opportunity in education.
          </p>

          {/* Who It's For */}
          <h3 className={styles.ecosystemSubheading}>Who It&apos;s For</h3>
          <div className={styles.ecosystemGrid}>
            <div className={styles.ecosystemCard}>
              <h4>Learners</h4>
              <ul>
                <li>Discover tutors beyond price and profiles</li>
                <li>Choose with confidence</li>
              </ul>
            </div>
            <div className={styles.ecosystemCard}>
              <h4>Tutors</h4>
              <ul>
                <li>Build credibility beyond visibility</li>
                <li>Earn trust</li>
                <li>Turn impact into opportunity</li>
              </ul>
            </div>
            <div className={styles.ecosystemCard}>
              <h4>Agents</h4>
              <ul>
                <li>Connect talent with demand</li>
                <li>Enable meaningful matches in a trusted network</li>
              </ul>
            </div>
          </div>
          <div className={styles.ecosystemGridBottom}>
            <div className={styles.ecosystemCard}>
              <h4>Organisations</h4>
              <ul>
                <li>Identify credible tutors</li>
                <li>Build trusted learning networks at scale</li>
              </ul>
            </div>
            <div className={styles.ecosystemCard}>
              <h4>Communities</h4>
              <ul>
                <li>Shape access to quality education</li>
                <li>Strengthen trust</li>
                <li>Drive contribution and referrals</li>
              </ul>
            </div>
          </div>

          {/* How the Ecosystem Works */}
          <h3 className={styles.ecosystemSubheading}>How the Ecosystem Works</h3>
          <div className={styles.ecosystemSteps}>
            <div className={styles.ecosystemStep}>
              <span className={styles.stepNumber}>1</span>
              <p>Tutors build verified profiles and credibility</p>
            </div>
            <div className={styles.ecosystemStep}>
              <span className={styles.stepNumber}>2</span>
              <p>Learners discover and connect with trusted tutors</p>
            </div>
            <div className={styles.ecosystemStep}>
              <span className={styles.stepNumber}>3</span>
              <p>Sessions are delivered, reviewed, and refined</p>
            </div>
            <div className={styles.ecosystemStep}>
              <span className={styles.stepNumber}>4</span>
              <p>Credibility and referrals reinforce trust across the network</p>
            </div>
          </div>

          {/* Core Principles */}
          <div className={styles.ecosystemPrinciples}>
            <p>Simple in use.</p>
            <p>Structured in design.</p>
            <p>Trust in learning.</p>
          </div>

          <div className={styles.helpCentreLink}>
            <Link href="/help-centre" className={styles.textLink} scroll={true}>
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
              We&apos;re not just building a platform — we&apos;re building a trusted ecosystem for learning. Join a growing community of learners, tutors and agents who believe education should be credible, human, and personal.

            </p>
            <div className={styles.ctaButtons}>
              <Button href="/signup" variant="primary" size="lg">
                Get Started
              </Button>
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}
