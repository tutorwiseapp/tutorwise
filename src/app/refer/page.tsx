'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Container from '@/app/components/layout/Container';
import styles from './page.module.css';

const ReferPage = () => {
  const [typedText, setTypedText] = useState('');
  const [textColor, setTextColor] = useState('#006C67');

  useEffect(() => {
    const textArray = [
      "product-page", "favorite-blog-post", "local-cafe", "saas-tool", 
      "online-course", "maths-tutor", "fashion-item"
    ];
    const colorArray = [
      "#E10100", "#F59E0B", "#10B981", "#0063C7",
      "#8B5CF6", "#006C67", "#D946EF"
    ];
    
    let textArrayIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let timeoutId: NodeJS.Timeout;

    function type() {
      const currentText = textArray[textArrayIndex];
      const displayedText = isDeleting 
        ? currentText.substring(0, charIndex - 1) 
        : currentText.substring(0, charIndex + 1);
      
      setTypedText(displayedText);
      let typeSpeed = isDeleting ? 75 : 150;

      if (!isDeleting && charIndex === currentText.length) {
        typeSpeed = 2000;
        isDeleting = true;
      } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        textArrayIndex = (textArrayIndex + 1) % textArray.length;
        setTextColor(colorArray[textArrayIndex]);
        typeSpeed = 500;
      }
      charIndex = isDeleting ? charIndex - 1 : charIndex + 1;
      timeoutId = setTimeout(type, typeSpeed);
    }
    const initialTimeout = setTimeout(type, 500);
    
    return () => clearTimeout(timeoutId);
  }, []);

  return (
    <div className={styles.pageWrapper}>
      <section className={`${styles.section} ${styles.hero}`}>
        <Container>
            <div className={styles.heroContent}>
                <h1 className={styles.heroTitle}>Refer Anything, Anyone, Anywhere.</h1>
                <p className={styles.subtitle}>Turn Any URL into Sharable, Monetisable, Rewardable Vinite Links in Seconds.<br/>No Sign-Up Required.</p>
                <div className={styles.heroCtaGroup}>
                    {/* Link now points to the homepage (link generator) */}
                    <Link href="/" className={`btn btn-primary ${styles.heroCta}`}>Create Your First Link</Link>
                    <div className={styles.heroVisual}>
                        <span>vinite.com/</span>
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
          <p className={styles.sectionSubtitle}>From click to cash, Vinite makes earning as easy as 1, 2, 3.</p>
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
            {/* Link now points to the homepage (link generator) */}
            <Link href="/" className={`btn btn-primary ${styles.heroCta}`}>Get Your Free Vinite Link</Link>
          </div>
        </Container>
      </section>
    </div>
  );
};
export default ReferPage;