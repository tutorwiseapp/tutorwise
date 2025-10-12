
import styles from './TutorNarrative.module.css';
import type { Listing } from '@tutorwise/shared-types';

interface TutorNarrativeProps {
  listing: Listing;
}

export default function TutorNarrative({ listing }: TutorNarrativeProps) {
  // Placeholder for teaching philosophy - this would come from the listing data in a real scenario
  const teachingPhilosophy = "I believe in making math engaging and approachable. My personalized approach builds strong foundations, boosts problem-solving skills, and instills confidence. I use interactive tools to prepare for exams like the SAT or AP Calculus, helping students overcome challenges and embrace maths with a growth mindset.";

  return (
    <div className={styles.tutorNarrative}>
      {/* Introduction */}
      <div className={styles.section}>
        <h3 className={styles.title}>Hi, I&apos;m {listing.title.split(' ')[0]}</h3>
        <p className={styles.text}>{listing.description}</p>
      </div>

      {/* Teaching Philosophy */}
      <div className={styles.section}>
        <h3 className={styles.title}>My Teaching Philosophy</h3>
        <p className={styles.text}>{teachingPhilosophy}</p>
      </div>

      {/* Subjects & Specializations */}
      <div className={styles.section}>
        <h3 className={styles.title}>Subjects & Specializations</h3>
        <div className={styles.tagContainer}>
          {listing.subjects?.map((subject) => (
            <span key={subject} className={styles.tag}>{subject}</span>
          ))}
          {listing.specializations?.map((spec) => (
            <span key={spec} className={`${styles.tag} ${styles.specializationTag}`}>{spec}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
