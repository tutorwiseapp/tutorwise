/**
 * Filename: OrganisationInfoTab.tsx
 * Purpose: Organisation Info tab wrapper (Gold Standard v3)
 * Created: 2025-11-20
 * Updated: 2025-12-04 - Moved from tabs/ to root, renamed for consistency
 * Design: Clean wrapper for OrganisationInfoForm
 *
 * Pattern: Separation of Concerns
 * - This file: Tab/Page concern (data fetching, permissions)
 * - OrganisationInfoForm: Form concern (state, auto-save logic)
 */

'use client';

import React from 'react';
import { Organisation } from '@/lib/api/organisation';
import OrganisationInfoForm from './OrganisationInfoForm';

interface OrganisationInfoTabProps {
  organisation: Organisation;
}

export default function OrganisationInfoTab({ organisation }: OrganisationInfoTabProps) {
  return (
    <div className="w-full">
      <OrganisationInfoForm organisation={organisation} />
    </div>
  );
}
