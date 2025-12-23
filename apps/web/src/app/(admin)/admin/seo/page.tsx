/*
 * Filename: src/app/(admin)/admin/seo/page.tsx
 * Purpose: SEO Management overview page
 * Created: 2025-12-23
 * Phase: 1 - SEO Management
 */
'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import HubPageLayout from '@/app/components/hub/layout/HubPageLayout';
import HubHeader from '@/app/components/hub/layout/HubHeader';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import { AdminStatsWidget, AdminHelpWidget, AdminTipWidget } from '@/app/components/admin/widgets';
import Button from '@/app/components/ui/actions/Button';
import { FileText, Link as LinkIcon, ExternalLink, TrendingUp, Plus } from 'lucide-react';
import Link from 'next/link';
import { usePermission } from '@/lib/rbac';

// Force dynamic rendering (no SSR/SSG) for admin pages
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

export default function AdminSeoOverviewPage() {
  const supabase = createClient();
  const canCreate = usePermission('seo', 'create');

  // Fetch SEO overview stats
  const { data: hubsCount } = useQuery({
    queryKey: ['admin', 'seo-hubs-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('seo_hubs')
        .select('*', { count: 'exact', head: true });
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: spokesCount } = useQuery({
    queryKey: ['admin', 'seo-spokes-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('seo_spokes')
        .select('*', { count: 'exact', head: true });
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: publishedHubs } = useQuery({
    queryKey: ['admin', 'seo-hubs-published'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('seo_hubs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'published');
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: publishedSpokes } = useQuery({
    queryKey: ['admin', 'seo-spokes-published'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('seo_spokes')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'published');
      if (error) throw error;
      return count || 0;
    },
  });

  return (
    <HubPageLayout
      header={
        <HubHeader
          title="SEO Management"
          subtitle="Manage your hub-and-spoke content strategy for better search rankings"
        />
      }
      sidebar={
        <HubSidebar>
          <AdminStatsWidget
            title="Content Overview"
            stats={[
              { label: 'Total Hubs', value: hubsCount || 0 },
              { label: 'Published Hubs', value: publishedHubs || 0 },
              { label: 'Total Spokes', value: spokesCount || 0 },
              { label: 'Published Spokes', value: publishedSpokes || 0 },
            ]}
          />
          <AdminHelpWidget
            title="SEO Strategy Help"
            items={[
              { question: 'What is Hub & Spoke SEO?', answer: 'A content strategy where hub pages cover broad topics and spoke pages dive deep into specific subtopics, all linked together.' },
              { question: 'Why use this model?', answer: 'It creates a strong internal linking structure, improves topical authority, and helps search engines understand your content hierarchy.' },
              { question: 'Best practices?', answer: 'Start with 3-5 hub topics, create 10-15 spokes per hub, ensure all spokes link back to their hub, and update content regularly.' },
            ]}
          />
          <AdminTipWidget
            title="SEO Tips"
            tips={[
              'Focus on one topic per hub',
              'Keep hub content evergreen',
              'Update old content regularly',
              'Monitor performance metrics',
            ]}
          />
        </HubSidebar>
      }
    >

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Hub Pages</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{hubsCount || 0}</p>
            </div>
            <FileText className="h-12 w-12 text-blue-500" />
          </div>
          <Link
            href="/admin/seo/hubs"
            className="text-sm text-blue-600 hover:underline mt-4 inline-block"
          >
            View all hubs →
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Spoke Pages</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{spokesCount || 0}</p>
            </div>
            <LinkIcon className="h-12 w-12 text-green-500" />
          </div>
          <Link
            href="/admin/seo/spokes"
            className="text-sm text-green-600 hover:underline mt-4 inline-block"
          >
            View all spokes →
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Citations</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">0</p>
            </div>
            <ExternalLink className="h-12 w-12 text-purple-500" />
          </div>
          <Link
            href="/admin/seo/citations"
            className="text-sm text-purple-600 hover:underline mt-4 inline-block"
          >
            View all citations →
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Performance</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">—</p>
            </div>
            <TrendingUp className="h-12 w-12 text-orange-500" />
          </div>
          <span className="text-sm text-gray-500 mt-4 inline-block">Coming soon</span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {canCreate && (
            <>
              <Link href="/admin/seo/hubs?action=create">
                <Button className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Hub Page
                </Button>
              </Link>
              <Link href="/admin/seo/spokes?action=create">
                <Button variant="secondary" className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Spoke Page
                </Button>
              </Link>
              <Link href="/admin/seo/citations?action=create">
                <Button variant="secondary" className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Citation
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
        <p className="text-gray-500 text-sm">No recent activity to display.</p>
      </div>
    </HubPageLayout>
  );
}
