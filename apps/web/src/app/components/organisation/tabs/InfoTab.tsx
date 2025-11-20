/**
 * Filename: InfoTab.tsx
 * Purpose: Organisation Info tab wrapper (Gold Standard v3)
 * Created: 2025-11-20
 * Updated: 2025-11-20 (v3 - Borderless with Auto-save)
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

interface InfoTabProps {
  organisation: Organisation;
}

export default function InfoTab({ organisation }: InfoTabProps) {
  return (
    <div className="w-full">
      <OrganisationInfoForm organisation={organisation} />
    </div>
  );
}
