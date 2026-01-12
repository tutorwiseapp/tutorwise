/*
 * Filename: src/app/(admin)/admin/forms/organisation/page.tsx
 * Purpose: Organisation forms configuration page with role tabs
 * Created: 2026-01-12
 */
'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { HubPageLayout, HubHeader, HubTabs } from '@/app/components/hub/layout';
import type { HubTab } from '@/app/components/hub/layout';
import HubSidebar, { SidebarWidget } from '@/app/components/hub/sidebar/HubSidebar';
import FormFieldEditor from '../components/FormFieldEditor';

// Force dynamic rendering (no SSR/SSG) for admin pages
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

type RoleFilter = 'tutor' | 'agent' | 'client';

export default function OrganisationFormsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const roleFilter = (searchParams?.get('role') as RoleFilter) || 'tutor';
  const context = `organisation.${roleFilter}`;

  const [fieldsCount, setFieldsCount] = useState(0);
  const [optionsCount, setOptionsCount] = useState(0);

  // Role tabs
  const roleTabs: HubTab[] = [
    { id: 'tutor', label: 'Tutor', active: roleFilter === 'tutor' },
    { id: 'agent', label: 'Agent', active: roleFilter === 'agent' },
    { id: 'client', label: 'Client', active: roleFilter === 'client' },
  ];

  // Handle tab change
  const handleRoleChange = (roleId: string) => {
    const params = new URLSearchParams(searchParams?.toString());
    params.set('role', roleId);
    router.push(`/admin/forms/organisation?${params.toString()}`);
  };

  return (
    <HubPageLayout
      header={
        <HubHeader
          title="Organisation Forms"
          subtitle="Manage form configurations for organisation members"
        />
      }
      tabs={<HubTabs tabs={roleTabs} onTabChange={handleRoleChange} />}
      sidebar={
        <HubSidebar>
          <SidebarWidget title="Statistics">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.875rem', fontWeight: 700, color: '#14b8a6', lineHeight: 1, marginBottom: '0.25rem' }}>
                  {fieldsCount}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.025em' }}>
                  Total Fields
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.875rem', fontWeight: 700, color: '#14b8a6', lineHeight: 1, marginBottom: '0.25rem' }}>
                  {optionsCount}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.025em' }}>
                  Active Options
                </div>
              </div>
            </div>
          </SidebarWidget>

          <SidebarWidget title="Help">
            <div style={{ fontSize: '0.875rem', color: '#4b5563', lineHeight: 1.6 }}>
              <p style={{ margin: '0 0 0.75rem 0' }}>
                <strong style={{ color: '#111827', fontWeight: 600 }}>Select a field</strong> from the list to view and edit its configuration.
              </p>
              <p style={{ margin: '0 0 0.75rem 0' }}>
                <strong style={{ color: '#111827', fontWeight: 600 }}>Field Metadata:</strong> Update labels, placeholders, and help text.
              </p>
              <p style={{ margin: 0 }}>
                <strong style={{ color: '#111827', fontWeight: 600 }}>Options:</strong> Add, edit, or deactivate dropdown options.
              </p>
            </div>
          </SidebarWidget>
        </HubSidebar>
      }
    >
      <FormFieldEditor
        context={context}
        onFieldsCountChange={setFieldsCount}
        onOptionsCountChange={setOptionsCount}
      />
    </HubPageLayout>
  );
}
