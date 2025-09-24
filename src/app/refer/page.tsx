/*
 * Filename: src/app/refer/page.tsx
 * Purpose: Serves as the public-facing marketing page for the Vinite platform.
 *
 * Change History:
 * C004 - 2025-07-20 : 15:00 - Added dynamic color cycling to the typing animation.
 * C003 - 2025-07-20 : 14:45 - Corrected the 'use client' directive to fix build error.
 * C002 - 2025-07-20 : 14:30 - Re-implemented the typing animation effect.
 * C001 - [Date] : [Time] - Initial creation.
 *
 * Last Modified: 2025-07-20 : 15:00
 * Requirement ID (optional): VIN-UI-007
 *
 * Change Summary:
 * Enhanced the hero section's typing animation. It now cycles through a predefined array of colors,
 * with each new word appearing in a different color. This was achieved by adding a `textColor` state
 * that is updated in sync with the `wordIndex` state inside the `useEffect` hook.
 *
 * Impact Analysis:
 * This is a purely visual enhancement that makes the marketing page more dynamic and engaging for
 * new users. It has no effect on application functionality.
 *
 * Dependencies: "react", "next/link", "next/image", "@/app/components/layout/Container".
 */
'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Container from '@/app/components/layout/Container';
import styles from './page.module.css';

const ReferPage = () => {
  // --- FIX: Add state and logic for the typing animation ---
  const [wordIndex, setWordIndex] = useState(0);
  const [subIndex, setSubIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [typedText, setTypedText] = useState('');

  // --- FIX: Define words and a corresponding color array with useMemo to prevent re-creation ---
  const words = useMemo(() => ['your-fashion-item', 'a-dream-job', 'the-best-tutor', 'a-local-store', 'cool-new-tech', 'anything-you-love'], []);
  const colors = useMemo(() => ['#dc3545', '#0d6efd', '#fd7e14', '#198754', '#6f42c1', '#d63384'], []); // Red, Blue, Orange, Green, Purple, Pink

  // --- FIX: Add state for the text color ---
  const [textColor, setTextColor] = useState('#dc3545');

  const typingSpeed = 150;
  const deletingSpeed = 100;
  const delay = 2000;

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    // Logic for deleting text
    if (isDeleting) {
      if (subIndex === 0) {
        setIsDeleting(false);
        // --- FIX: When we move to the next word, also set the next color ---
        setWordIndex((prev) => {
          const nextIndex = (prev + 1) % words.length;
          setTextColor(colors[nextIndex]); // Update to the next color in the array
          return nextIndex;
        });
      } else {
        timeout = setTimeout(() => {
          setTypedText(words[wordIndex].substring(0, subIndex - 1));
          setSubIndex((prev) => prev - 1);
        }, deletingSpeed);
      }
    } 
    // Logic for typing text
    else {
      if (subIndex === words[wordIndex].length) {
        timeout = setTimeout(() => setIsDeleting(true), delay);
      } else {
        timeout = setTimeout(() => {
          setTypedText(words[wordIndex].substring(0, subIndex + 1));
          setSubIndex((prev) => prev + 1);
        }, typingSpeed);
      }
    }

    return () => clearTimeout(timeout);
  }, [subIndex, isDeleting, wordIndex, words, colors]);


  return (
    <div className={styles.pageWrapper}>
      <section className={`${styles.section} ${styles.hero}`}>
        <Container>
            <div className={styles.heroContent}>
                <h1 className={styles.heroTitle}>Refer Anything, Anyone, Anywhere.</h1>
                <p className={styles.subtitle}>Turn Any URL into Sharable, Monetisable, Rewardable Vinite Links in Seconds.<br/>No Sign-Up Required.</p>
                <div className={styles.heroCtaGroup}>
                    <Link href="/" className={`btn btn-primary ${styles.heroCta}`}>Create Your First Link</Link>
                    <div className={styles.heroVisual}>
                        <span>vinite.com/</span>
                        {/* --- FIX: Apply the dynamic text color from state --- */}
                        <span className={styles.typingBox} style={{ color: textColor }}>{typedText}</span>
                        <span className={styles.typingCursor}>|</span>
                    </div>
                </div>
                <div className={styles.socialProof}>
                    <p>LOVED BY FREELANCERS, INNOVATORS, STUDENTS, AND PROFESSIONALS</p>
                    <div className={styles.iconGrid}>
                        <div className={styles.iconItem}><span className="material-symbols-outlined">shopping_bag</span><span>Products</span></div>
                        <div className={styles.iconItem}><span className="material-symbols-outlined">school</span><span>Courses</span></div>
                        <div className={styles.iconItem}><span className="material-symbols-outlined">design_services</span><span>Services</span></div>
                        <div className={styles.iconItem}><span className="material-symbols-outlined">article</span><span>Content</span></div>
                        <div className={styles.iconItem}><span className="material-symbols-outlined">terminal</span><span>Software</span></div>
                        <div className={styles.iconItem}><span className="material-symbols-outlined">storefront</span><span>Local Business</span></div>
                    </div>
                </div>
            </div>
        </Container>
      </section>

      <section className={`${styles.section} ${styles.howItWorksSection}`}>
        <Container>
          <h2 className={styles.sectionTitle}>Earn in Three Simple Steps</h2>
          <p className={styles.sectionSubtitle}>From click to cash, Vinite makes earning as easy as 1-2-3.</p>
          <div className={styles.stepsGrid}>
            <div className={styles.stepCard}><div className={styles.stepIcon}>1</div><h3>Create</h3><p>Paste any URL to generate a unique Vinite Link instantly.</p></div>
            <div className={styles.stepCard}><div className={styles.stepIcon}>2</div><h3>Share</h3><p>Share your link on social media, in emails, or directly with friends.</p></div>
            <div className={styles.stepCard}><div className={styles.stepIcon}>3</div><h3>Earn</h3><p>Collect rewards for clicks or successful referral actions.</p></div>
          </div>
        </Container>
      </section>

      <section className={`${styles.section} ${styles.testimonialSection}`}>
        <Container>
          <h2 className={styles.sectionTitle}>Trusted by creators and entrepreneurs</h2>
          <div className={styles.testimonialContent}>
            <p className={styles.testimonialQuote}>“I used to scroll and share links for free — now I earn when people act on my recommendations. Vinite turned my network into a source of real income, without needing to be an influencer.”</p>
            <div className={styles.testimonialAuthor}>
                <Image src="https://i.pravatar.cc/100?u=jane" alt="Jane Brown" width={60} height={60} className={styles.authorImage} />
                <div className={styles.authorDetails}>
                    <div className={styles.authorName}>Jane Brown</div>
                    <div className={styles.authorTitle}>Content Creator & Vinite User</div>
                </div>
            </div>
          </div>
        </Container>
      </section>

      <section className={`${styles.section} ${styles.ctaSection}`}>
        <Container>
          <div className={styles.ctaContainer}>
            <h2 className={styles.sectionTitle}>Ready to start earning?</h2>
            <p className={styles.sectionSubtitle}>It takes less than 30 seconds to create your first referral link. No credit card, no sign-up required.</p>
            <Link href="/" className={`btn btn-primary ${styles.heroCta}`}>Get Your Free Vinite Link</Link>
          </div>
        </Container>
      </section>
    </div>
  );
};
export default ReferPage;