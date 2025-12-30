/*
 * Filename: src/app/(admin)/admin/seo/templates/page.tsx
 * Purpose: Content templates management with validation rules
 * Created: 2025-12-29
 * Goal: Manage SEO content templates for consistent quality
 */
'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import HubPageLayout from '@/app/components/hub/layout/HubPageLayout';
import HubHeader from '@/app/components/hub/layout/HubHeader';
import HubTabs from '@/app/components/hub/layout/HubTabs';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import HubDataTable from '@/app/components/hub/data/HubDataTable';
import { AdminHelpWidget, AdminTipWidget } from '@/app/components/admin/widgets';
import { FileText, MoreVertical } from 'lucide-react';
import AdminTemplateDetailModal from './components/AdminTemplateDetailModal';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

interface ContentTemplate {
  id: string;
  name: string;
  content_type: 'hub' | 'spoke';
  validation_rules: {
    min_word_count: number;
    target_readability: number;
    min_internal_links: number;
    min_external_citations: number;
    require_primary_keyword_in_title: boolean;
  };
  seo_checklist: Array<{
    item: string;
    required: boolean;
  }>;
  created_at: string;
}

export default function AdminSeoTemplatesPage() {
  const queryClient = useQueryClient();
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<'overview'>('overview');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'hub' | 'spoke'>('all');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<ContentTemplate | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch templates
  const { data: templates, isLoading } = useQuery({
    queryKey: ['admin', 'seo-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seo_content_templates')
        .select('*')
        .order('content_type', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      return data as ContentTemplate[];
    },
  });

  // Filter templates
  const filteredTemplates = useMemo(() => {
    if (!templates) return [];

    let filtered = templates;

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter((t) => t.content_type === typeFilter);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((t) => t.name.toLowerCase().includes(query));
    }

    return filtered;
  }, [templates, typeFilter, searchQuery]);

  // Paginated templates
  const paginatedTemplates = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredTemplates.slice(startIndex, endIndex);
  }, [filteredTemplates, currentPage, pageSize]);

  // Table columns
  const columns = [
    {
      key: 'name',
      label: 'Template Name',
      sortable: true,
      width: '25%',
      render: (template: ContentTemplate) => (
        <div className={styles.nameCell}>
          <span className={styles.templateName}>{template.name}</span>
          <span className={styles.templateTypeBadge}>{template.content_type.toUpperCase()}</span>
        </div>
      ),
    },
    {
      key: 'validation',
      label: 'Validation Rules',
      width: '35%',
      render: (template: ContentTemplate) => (
        <div className={styles.validationRules}>
          <span className={styles.validationBadge}>Words: {template.validation_rules.min_word_count}+</span>
          <span className={styles.validationBadge}>Read: {template.validation_rules.target_readability}</span>
          <span className={styles.validationBadge}>Links: {template.validation_rules.min_internal_links}+</span>
        </div>
      ),
    },
    {
      key: 'checklist',
      label: 'Checklist Items',
      width: '25%',
      render: (template: ContentTemplate) => (
        <div className={styles.checklistCell}>
          <span className={styles.checklistCount}>{template.seo_checklist.length} items</span>
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      width: '100px',
      render: (template: ContentTemplate) => (
        <div className={styles.actionsCell}>
          <button
            className={styles.actionsButton}
            onClick={(e) => {
              e.stopPropagation();
              const button = e.currentTarget;
              const rect = button.getBoundingClientRect();

              if (openMenuId === template.id) {
                setOpenMenuId(null);
                setMenuPosition(null);
              } else {
                setOpenMenuId(template.id);
                setMenuPosition({
                  top: rect.bottom + 4,
                  left: rect.right - 160, // 160px is menu width
                });
              }
            }}
            aria-label="More actions"
          >
            <MoreVertical size={16} />
          </button>
          {openMenuId === template.id && menuPosition && (
            <div
              className={`${styles.actionsMenu} actionsMenu`}
              style={{
                top: `${menuPosition.top}px`,
                left: `${menuPosition.left}px`,
              }}
            >
              <button
                className={styles.actionMenuItem}
                onClick={(e) => {
                  e.stopPropagation();
                  showTemplateDetails(template);
                  setOpenMenuId(null);
                }}
              >
                View Checklist
              </button>
              <button
                className={styles.actionMenuItem}
                onClick={(e) => {
                  e.stopPropagation();
                  console.log('Edit template:', template.id);
                  // TODO: Navigate to edit page or open edit modal
                  setOpenMenuId(null);
                }}
              >
                Edit Template
              </button>
              <button
                className={`${styles.actionMenuItem} ${styles.actionMenuItemDanger}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Delete template "${template.name}"? This action cannot be undone.`)) {
                    console.log('Delete template:', template.id);
                    // TODO: Implement delete functionality
                  }
                  setOpenMenuId(null);
                }}
              >
                Delete
              </button>
            </div>
          )}
        </div>
      ),
    },
  ];

  // Row click handler - opens modal
  const handleRowClick = (template: ContentTemplate) => {
    setSelectedTemplate(template);
    setIsModalOpen(true);
  };

  // View Checklist handler - opens same modal
  const showTemplateDetails = (template: ContentTemplate) => {
    setSelectedTemplate(template);
    setIsModalOpen(true);
  };

  // Close actions menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openMenuId && !(event.target as Element).closest('.actionsMenu')) {
        setOpenMenuId(null);
        setMenuPosition(null);
      }
    };

    if (openMenuId) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openMenuId]);

  return (
    <HubPageLayout
      header={
        <>
          <HubHeader
            title="Content Templates"
            subtitle="SEO-optimized templates with validation rules and checklists"
            icon={FileText}
            className={styles.templatesHeader}
          />
          <HubTabs
            tabs={[
              { id: 'overview', label: 'Overview' },
            ]}
            activeTab={activeTab}
            onTabChange={(tabId) => setActiveTab(tabId as 'overview')}
            className={styles.templatesTabs}
          />
        </>
      }
      sidebar={
        <HubSidebar>
          <AdminHelpWidget
            title="Template Help"
            items={[
              {
                question: 'What are content templates?',
                answer: 'Pre-defined structures and checklists ensuring SEO content meets quality standards.',
              },
              {
                question: 'How do validation rules work?',
                answer: 'Rules enforce minimum requirements (word count, links, etc.) before content can be published.',
              },
              {
                question: 'What is the SEO checklist?',
                answer: 'Step-by-step list of optimizations to complete before publishing (meta tags, keywords, etc.).',
              },
            ]}
          />

          <AdminTipWidget
            title="Template Best Practices"
            tips={[
              'Use higher word counts for hubs (1500+)',
              'Require primary keyword in title',
              'Enforce minimum internal linking',
              'Balance readability with depth (60-70 Flesch score)',
            ]}
          />
        </HubSidebar>
      }
    >
      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          <HubDataTable
            columns={columns}
            data={paginatedTemplates}
            loading={isLoading}
            onRowClick={handleRowClick}
          onSearch={setSearchQuery}
          onFilterChange={(key, value) => {
            if (key === 'type') {
              setTypeFilter(value as typeof typeFilter);
              setCurrentPage(1);
            }
          }}
          filters={[
            {
              key: 'type',
              label: 'Type',
              options: [
                { label: 'All', value: 'all' },
                { label: 'Hub', value: 'hub' },
                { label: 'Spoke', value: 'spoke' },
              ],
            },
          ]}
          pagination={{
            page: currentPage,
            limit: pageSize,
            total: filteredTemplates.length,
            onPageChange: setCurrentPage,
            onLimitChange: (newLimit) => {
              setPageSize(newLimit);
              setCurrentPage(1);
            },
            pageSizeOptions: [10, 20, 50, 100],
          }}
          selectable
          selectedRows={selectedRows}
          onSelectionChange={setSelectedRows}
          getRowId={(template) => template.id}
          searchPlaceholder="Search templates..."
          emptyMessage="No templates found"
          emptyDescription="Content templates define quality standards for hubs and spokes."
          onExport={(selectedIds) => {
            const dataToExport = selectedIds.length > 0
              ? filteredTemplates.filter((t) => selectedIds.includes(t.id))
              : filteredTemplates;

            const csvContent = [
              ['name', 'content_type', 'min_word_count', 'target_readability', 'min_internal_links', 'created_at'],
              ...dataToExport.map((t) => [
                t.name,
                t.content_type,
                t.validation_rules.min_word_count,
                t.validation_rules.target_readability,
                t.validation_rules.min_internal_links,
                t.created_at,
              ]),
            ].map((row) => row.join(',')).join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `templates-${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            URL.revokeObjectURL(url);
          }}
          onRefresh={() => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'seo-templates'] });
          }}
          autoRefreshInterval={300000}
          bulkActions={[
            {
              label: 'Duplicate Selected',
              value: 'duplicate',
              onClick: (selectedIds) => {
                console.log('Duplicate Selected:', selectedIds);
              },
            },
            {
              label: 'Delete Selected',
              value: 'delete',
              onClick: (selectedIds) => {
                console.log('Delete Selected:', selectedIds);
              },
              variant: 'danger' as const,
            },
          ]}
          enableSavedViews={true}
          savedViewsKey="admin_seo_templates_savedViews"
          />

          {/* Template Detail Modal */}
          {isModalOpen && selectedTemplate && (
            <AdminTemplateDetailModal
              isOpen={isModalOpen}
              onClose={() => {
                setIsModalOpen(false);
                setSelectedTemplate(null);
              }}
              template={selectedTemplate}
              onTemplateUpdated={() => {
                queryClient.invalidateQueries({ queryKey: ['admin', 'seo-templates'] });
              }}
            />
          )}
        </>
      )}
    </HubPageLayout>
  );
}
