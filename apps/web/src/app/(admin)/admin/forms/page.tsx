/*
 * Filename: src/app/(admin)/admin/forms/page.tsx
 * Purpose: Forms admin landing page with overview
 * Created: 2026-01-12
 * Updated: 2026-01-12 - Converted to landing page with sub-navigation
 */
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Users, Building2, ArrowRight } from 'lucide-react';
import { HubPageLayout, HubHeader } from '@/app/components/hub/layout';
import HubSidebar, { SidebarWidget } from '@/app/components/hub/sidebar/HubSidebar';
import Button from '@/app/components/ui/actions/Button';
import styles from './page.module.css';

// Force dynamic rendering (no SSR/SSG) for admin pages
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

interface FormCategoryCard {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  roles: string[];
}

export default function FormsLandingPage() {
  const router = useRouter();

  const formCategories: FormCategoryCard[] = [
    {
      title: 'Onboarding Forms',
      description: 'Configure form fields for new user onboarding flows',
      icon: <FileText size={32} strokeWidth={1.5} />,
      href: '/admin/forms/onboarding?role=tutor',
      roles: ['Tutor', 'Agent', 'Client'],
    },
    {
      title: 'Account Forms',
      description: 'Manage form configurations for user account settings',
      icon: <Users size={32} strokeWidth={1.5} />,
      href: '/admin/forms/account?role=tutor',
      roles: ['Tutor', 'Agent', 'Client'],
    },
    {
      title: 'Organisation Forms',
      description: 'Configure forms for organisation member management',
      icon: <Building2 size={32} strokeWidth={1.5} />,
      href: '/admin/forms/organisation?role=tutor',
      roles: ['Tutor', 'Agent', 'Client'],
    },
  ];

  return (
    <HubPageLayout
      header={
        <HubHeader
          title="Form Configuration"
          subtitle="Manage dynamic form fields, labels, and dropdown options"
        />
      }
      sidebar={
        <HubSidebar>
          <SidebarWidget title="About">
            <div style={{ fontSize: '0.875rem', color: '#4b5563', lineHeight: 1.6 }}>
              <p style={{ margin: '0 0 0.75rem 0' }}>
                The Form Configuration system allows you to manage form fields across the platform without code deployment.
              </p>
              <p style={{ margin: 0 }}>
                Changes take effect <strong style={{ color: '#111827', fontWeight: 600 }}>immediately</strong> and apply to all relevant forms.
              </p>
            </div>
          </SidebarWidget>

          <SidebarWidget title="What You Can Do">
            <div style={{ fontSize: '0.875rem', color: '#4b5563', lineHeight: 1.6 }}>
              <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
                <li style={{ marginBottom: '0.5rem' }}>Update field labels and placeholders</li>
                <li style={{ marginBottom: '0.5rem' }}>Add or remove dropdown options</li>
                <li style={{ marginBottom: '0.5rem' }}>Reorder options via drag and drop</li>
                <li>Deactivate options without data loss</li>
              </ul>
            </div>
          </SidebarWidget>
        </HubSidebar>
      }
    >
      <div className={styles.landingGrid}>
        {formCategories.map((category) => (
          <div key={category.href} className={styles.categoryCard}>
            <div className={styles.categoryIcon}>{category.icon}</div>
            <h3 className={styles.categoryTitle}>{category.title}</h3>
            <p className={styles.categoryDescription}>{category.description}</p>
            <div className={styles.categoryRoles}>
              {category.roles.map((role) => (
                <span key={role} className={styles.roleTag}>
                  {role}
                </span>
              ))}
            </div>
            <Button
              variant="secondary"
              onClick={() => router.push(category.href)}
              className={styles.categoryButton}
            >
              Manage Fields
              <ArrowRight size={16} />
            </Button>
          </div>
        ))}
      </div>
    </HubPageLayout>
  );
}
