/**
 * Filename: ServicesCard.tsx
 * Purpose: Display organisation services, subjects, delivery modes, and pricing
 * Created: 2026-01-04
 */

'use client';

import { BookOpen, Users, Monitor, MapPin, DollarSign } from 'lucide-react';
import styles from './ServicesCard.module.css';

interface ServicesCardProps {
  organisation: any;
}

export function ServicesCard({ organisation }: ServicesCardProps) {
  // Extract data
  const subjects = organisation.unique_subjects || [];
  const levels = organisation.unique_levels || [];

  // Service types based on team members' listings
  const serviceTypes = [
    { id: 'one-to-one', label: 'One-to-One Tutoring', icon: Users },
    { id: 'group', label: 'Group Sessions', icon: Users },
    { id: 'workshop', label: 'Workshops', icon: BookOpen },
  ];

  // Delivery modes
  const deliveryModes = [
    { id: 'online', label: 'Online', icon: Monitor },
    { id: 'in-person', label: 'In-Person', icon: MapPin },
    { id: 'hybrid', label: 'Hybrid', icon: Monitor },
  ];

  return (
    <div className={styles.card}>
      {/* Header with light teal background */}
      <div className={styles.header}>
        <h2 className={styles.title}>Services</h2>
      </div>

      {/* Content wrapper for padding */}
      <div className={styles.content}>
        {/* Service Types */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Service Types</h3>
          <div className={styles.list}>
            {serviceTypes.map((service) => (
              <div key={service.id} className={styles.listItem}>
                <service.icon size={16} className={styles.icon} />
                <span>{service.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Subjects Offered */}
        {subjects.length > 0 && (
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Subjects Offered</h3>
            <div className={styles.tagContainer}>
              {subjects.map((subject: string) => (
                <span key={subject} className={styles.tag}>
                  {subject}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Levels Offered */}
        {levels.length > 0 && (
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Levels Offered</h3>
            <div className={styles.tagContainer}>
              {levels.map((level: string) => (
                <span key={level} className={styles.tag}>
                  {level}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Delivery Modes */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Delivery Options</h3>
          <div className={styles.list}>
            {deliveryModes.map((mode) => (
              <div key={mode.id} className={styles.listItem}>
                <mode.icon size={16} className={styles.icon} />
                <span>{mode.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing Information */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Pricing</h3>
          <div className={styles.pricingInfo}>
            <DollarSign size={20} className={styles.pricingIcon} />
            <div>
              <p className={styles.pricingText}>Competitive rates based on service type and tutor experience</p>
              <p className={styles.pricingSubtext}>Contact us for detailed pricing</p>
            </div>
          </div>
        </div>

        {/* Empty State - Only show if no data */}
        {subjects.length === 0 && levels.length === 0 && (
          <div className={styles.emptyState}>
            <p className={styles.emptyText}>
              Service information will be available soon.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
