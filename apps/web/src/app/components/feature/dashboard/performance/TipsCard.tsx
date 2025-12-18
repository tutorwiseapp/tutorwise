/**
 * Filename: TipsCard.tsx
 * Purpose: Role-specific tips card with actionable advice
 * Created: 2025-12-07
 * Updated: 2025-12-07 - Migrated to HubComplexCard design pattern
 */

'use client';

import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import HubComplexCard from '@/app/components/hub/sidebar/cards/HubComplexCard';
import styles from './TipsCard.module.css';

interface Tip {
  title: string;
  description: string;
  impact?: string; // e.g., "Boost bookings by 30%"
}

interface TipsCardProps {
  role: 'client' | 'tutor' | 'agent';
}

export default function TipsCard({ role }: TipsCardProps) {
  const [currentTipIndex, setCurrentTipIndex] = useState(0);

  // Role-specific tips
  const getTips = (): Tip[] => {
    switch (role) {
      case 'client':
        return [
          {
            title: 'Book Regular Sessions',
            description: 'Consistency is key to learning. Schedule regular sessions with your tutor to maintain momentum and achieve better results.',
            impact: 'Learn 2x faster'
          },
          {
            title: 'Prepare Questions in Advance',
            description: 'Before each session, write down specific questions or topics you want to cover. This helps maximize your learning time.',
            impact: 'Save 15 mins per session'
          },
          {
            title: 'Leave Reviews',
            description: 'Help other students by reviewing your tutors. Your feedback also helps tutors improve their service.',
            impact: 'Build community trust'
          },
          {
            title: 'Set Clear Learning Goals',
            description: 'Define what you want to achieve and share it with your tutor. Clear goals lead to more focused and effective sessions.',
            impact: 'Achieve goals faster'
          },
          {
            title: 'Use Multiple Tutors',
            description: 'Different tutors bring different perspectives. Consider booking sessions with multiple tutors for well-rounded learning.',
            impact: 'Broaden understanding'
          },
          {
            title: 'Take Notes During Sessions',
            description: 'Keep detailed notes during your sessions. Review them before your next session to reinforce learning.',
            impact: 'Improve retention by 40%'
          }
        ];

      case 'tutor':
        return [
          {
            title: 'Add a Video Introduction',
            description: 'Listings with video introductions receive significantly more bookings. Record a short 60-second intro showcasing your personality and teaching style.',
            impact: 'Boost bookings by 30%'
          },
          {
            title: 'Respond Quickly to Inquiries',
            description: 'Students are more likely to book with tutors who respond within 24 hours. Enable notifications to never miss an inquiry.',
            impact: 'Increase conversion by 45%'
          },
          {
            title: 'Keep Your Availability Updated',
            description: 'Regularly update your calendar to reflect your true availability. This reduces booking conflicts and improves student experience.',
            impact: 'Reduce cancellations by 60%'
          },
          {
            title: 'Offer Trial Sessions',
            description: 'Consider offering discounted first sessions to attract new students. It\'s a great way to showcase your teaching style.',
            impact: 'Get more first-time bookings'
          },
          {
            title: 'Personalize Your Teaching',
            description: 'Ask students about their learning style and goals before the first session. Tailored lessons lead to better outcomes and more repeat bookings.',
            impact: 'Increase repeat rate by 35%'
          },
          {
            title: 'Upload Credentials',
            description: 'Verified qualifications and certifications build trust. Students are 50% more likely to book with verified tutors.',
            impact: 'Build instant credibility'
          },
          {
            title: 'Ask for Reviews',
            description: 'After successful sessions, politely ask satisfied students to leave a review. Positive reviews significantly boost your visibility.',
            impact: 'Improve ranking by 25%'
          },
          {
            title: 'Share Learning Materials',
            description: 'Provide students with additional resources, worksheets, or reading materials. This adds value and encourages repeat bookings.',
            impact: 'Enhance student satisfaction'
          }
        ];

      case 'agent':
        return [
          {
            title: 'Showcase Your Best Tutors',
            description: 'Feature top-performing tutors in your listings. Highlight their qualifications, student reviews, and success stories.',
            impact: 'Increase bookings by 40%'
          },
          {
            title: 'Offer Package Deals',
            description: 'Bundle multiple sessions at a discounted rate. Packages encourage longer commitments and increase revenue predictability.',
            impact: 'Boost revenue by 25%'
          },
          {
            title: 'Monitor Tutor Performance',
            description: 'Regularly review your tutors\' ratings, response times, and booking rates. Provide feedback to maintain high quality.',
            impact: 'Maintain 4.5+ rating'
          },
          {
            title: 'Diversify Subject Offerings',
            description: 'Expand your subject coverage by recruiting tutors in high-demand areas. More subjects mean more potential clients.',
            impact: 'Reach wider audience'
          },
          {
            title: 'Create Agency Brand Guidelines',
            description: 'Establish consistent messaging and quality standards across all your tutors. Strong branding builds trust and recognition.',
            impact: 'Build strong reputation'
          },
          {
            title: 'Respond to Inquiries Promptly',
            description: 'Set up a system to respond to student inquiries within hours. Fast responses significantly improve conversion rates.',
            impact: 'Increase conversion by 50%'
          },
          {
            title: 'Leverage Student Testimonials',
            description: 'Collect and showcase success stories from students. Real testimonials are powerful social proof for your agency.',
            impact: 'Build trust & credibility'
          },
          {
            title: 'Optimize Commission Structure',
            description: 'Balance competitive tutor rates with sustainable margins. Fair commissions attract and retain quality tutors.',
            impact: 'Attract top talent'
          }
        ];

      default:
        return [];
    }
  };

  const tips = getTips();
  const currentTip = tips[currentTipIndex];

  // Auto-rotate tips every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % tips.length);
    }, 30000);

    return () => clearInterval(interval);
  }, [tips.length]);

  const handleNext = () => {
    setCurrentTipIndex((prev) => (prev + 1) % tips.length);
  };

  const handlePrev = () => {
    setCurrentTipIndex((prev) => (prev - 1 + tips.length) % tips.length);
  };

  if (!currentTip) return null;

  return (
    <HubComplexCard>
      <div className={styles.header}>
        <h3 className={styles.title}>💡 Tip of the Day</h3>
        <span className={styles.counter}>
          {currentTipIndex + 1} of {tips.length}
        </span>
      </div>

      <div className={styles.content}>
        <h4 className={styles.tipTitle}>{currentTip.title}</h4>
        <p className={styles.tipDescription}>{currentTip.description}</p>

        {currentTip.impact && (
          <div className={styles.impact}>
            <span className={styles.impactLabel}>Impact:</span>
            <span className={styles.impactValue}>{currentTip.impact}</span>
          </div>
        )}

        <div className={styles.navigation}>
          <button
            onClick={handlePrev}
            className={styles.navButton}
            aria-label="Previous tip"
          >
            <ChevronLeft size={16} />
          </button>

          <div className={styles.dots}>
            {tips.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentTipIndex(index)}
                className={`${styles.dot} ${index === currentTipIndex ? styles.dotActive : ''}`}
                aria-label={`Go to tip ${index + 1}`}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            className={styles.navButton}
            aria-label="Next tip"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </HubComplexCard>
  );
}
