/**
 * Filename: OrganisationStudentTypeBreakdown.tsx
 * Purpose: Organisation-specific student type breakdown with data fetching
 * Created: 2025-12-17
 * Pattern: Self-contained component that fetches its own data
 */

'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import HubStudentTypeBreakdown, { StudentTypeData } from '@/app/components/hub/charts/HubStudentTypeBreakdown';

interface OrganisationStudentTypeBreakdownProps {
  organisationId: string;
  defaultView?: 'pie' | 'bar';
}

export default function OrganisationStudentTypeBreakdown({
  organisationId,
  defaultView = 'pie',
}: OrganisationStudentTypeBreakdownProps) {
  // Fetch student breakdown data
  const {
    data: studentBreakdownData = { new: 0, returning: 0 },
    isLoading,
  } = useQuery<StudentTypeData>({
    queryKey: ['organisation-analytics-student-breakdown', organisationId],
    queryFn: async () => {
      const response = await fetch(
        `/api/organisation/${organisationId}/analytics/student-breakdown`
      );
      if (!response.ok) throw new Error('Failed to fetch student breakdown');
      return response.json();
    },
    staleTime: 3 * 60 * 1000, // 3 minutes
  });

  return (
    <HubStudentTypeBreakdown
      data={studentBreakdownData}
      defaultView={defaultView}
      isLoading={isLoading}
    />
  );
}
