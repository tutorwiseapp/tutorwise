/**
 * Filename: apps/web/src/app/(authenticated)/sage/materials/page.tsx
 * Purpose: Sage learning materials page - uploaded documents
 * Route: /sage/materials
 * Created: 2026-02-14
 */

'use client';

import React, { useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { HubPageLayout, HubHeader, HubTabs, HubPagination } from '@/app/components/hub/layout';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import HubEmptyState from '@/app/components/hub/content/HubEmptyState';
import Button from '@/app/components/ui/actions/Button';
import UnifiedSelect from '@/app/components/ui/forms/UnifiedSelect';
import SageHelpWidget from '../../../../components/feature/sage/widgets/SageHelpWidget';
import SageTipsWidget from '../../../../components/feature/sage/widgets/SageTipsWidget';
import SageVideoWidget from '../../../../components/feature/sage/widgets/SageVideoWidget';
import styles from '../page.module.css';
import materialsStyles from './page.module.css';
import filterStyles from '@/app/components/hub/styles/hub-filters.module.css';
import actionStyles from '@/app/components/hub/styles/hub-actions.module.css';

const ITEMS_PER_PAGE = 12;

const SUBJECTS = [
  { value: 'all', label: 'All Subjects' },
  { value: 'maths', label: 'Mathematics' },
  { value: 'english', label: 'English' },
  { value: 'science', label: 'Science' },
  { value: 'general', label: 'General' },
];

interface Material {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  subject?: string;
  description?: string;
  status: 'processing' | 'ready' | 'error';
  createdAt: string;
}

export default function SageMaterialsPage() {
  const { profile, isLoading: profileLoading } = useUserProfile();
  const router = useRouter();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [subjectFilter, setSubjectFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);

  // Fetch materials with gold standard react-query config
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['sage-materials', profile?.id, subjectFilter, currentPage],
    queryFn: async () => {
      const offset = (currentPage - 1) * ITEMS_PER_PAGE;
      const params = new URLSearchParams({
        limit: ITEMS_PER_PAGE.toString(),
        offset: offset.toString(),
      });
      if (subjectFilter !== 'all') {
        params.set('subject', subjectFilter);
      }
      const res = await fetch(`/api/sage/materials?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch materials');
      return res.json();
    },
    enabled: !!profile?.id,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });

  const allMaterials: Material[] = data?.materials || [];
  const totalItems = data?.total || 0;

  // Filter materials by search
  const filteredMaterials = useMemo(() => {
    if (!searchQuery.trim()) return allMaterials;
    const query = searchQuery.toLowerCase();
    return allMaterials.filter((material) => {
      const name = material.originalName.toLowerCase();
      const subject = material.subject?.toLowerCase() || '';
      return name.includes(query) || subject.includes(query);
    });
  }, [allMaterials, searchQuery]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
    setShowActionsMenu(false);
  };

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (materialId: string) => {
      const res = await fetch(`/api/sage/materials?id=${materialId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete material');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sage-materials'] });
    },
  });

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (subjectFilter !== 'all') {
        formData.append('subject', subjectFilter);
      }

      const res = await fetch('/api/sage/materials', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to upload file');
      }

      queryClient.invalidateQueries({ queryKey: ['sage-materials'] });
    } catch (err) {
      console.error('Upload error:', err);
      alert(err instanceof Error ? err.message : 'Failed to upload file');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getFileTypeLabel = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return 'IMG';
    if (mimeType === 'application/pdf') return 'PDF';
    if (mimeType.includes('word')) return 'DOC';
    if (mimeType === 'text/plain') return 'TXT';
    return 'FILE';
  };

  // Loading state
  if (profileLoading || isLoading) {
    return (
      <HubPageLayout
        header={<HubHeader title="Sage" />}
        sidebar={
          <HubSidebar>
            <div className={styles.skeletonWidget} />
          </HubSidebar>
        }
      >
        <div className={styles.loading}>Loading materials...</div>
      </HubPageLayout>
    );
  }

  // Error state
  if (error) {
    return (
      <HubPageLayout
        header={<HubHeader title="Sage" />}
        sidebar={<HubSidebar><SageHelpWidget /></HubSidebar>}
      >
        <div className={styles.error}>
          <p>Failed to load materials. Please try again.</p>
          <Button variant="secondary" size="sm" onClick={() => refetch()}>
            Try Again
          </Button>
        </div>
      </HubPageLayout>
    );
  }

  return (
    <HubPageLayout
      header={
        <HubHeader
          title="Sage"
          filters={
            <div className={filterStyles.filtersContainer}>
              <input
                type="search"
                placeholder="Search materials..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={filterStyles.searchInput}
              />
              <UnifiedSelect
                value={subjectFilter}
                onChange={(v) => {
                  setSubjectFilter(String(v));
                  setCurrentPage(1);
                }}
                options={SUBJECTS}
                placeholder="Filter by subject"
              />
            </div>
          }
          actions={
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.webp"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
              <Button
                variant="primary"
                size="sm"
                onClick={handleUploadClick}
                disabled={isUploading}
              >
                {isUploading ? 'Uploading...' : 'Upload Material'}
              </Button>
              <div className={actionStyles.dropdownContainer}>
                <Button
                  variant="secondary"
                  size="sm"
                  square
                  onClick={() => setShowActionsMenu(!showActionsMenu)}
                >
                  ...
                </Button>
                {showActionsMenu && (
                  <>
                    <div
                      className={actionStyles.backdrop}
                      onClick={() => setShowActionsMenu(false)}
                    />
                    <div className={actionStyles.dropdownMenu}>
                      <button
                        onClick={() => {
                          router.push('/sage');
                          setShowActionsMenu(false);
                        }}
                        className={actionStyles.menuButton}
                      >
                        New Session
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          }
        />
      }
      tabs={
        <HubTabs
          tabs={[
            { id: 'chat', label: 'Chat', href: '/sage' },
            { id: 'history', label: 'History', href: '/sage/history' },
            { id: 'progress', label: 'Progress', href: '/sage/progress' },
            { id: 'materials', label: 'Materials', active: true },
          ]}
          onTabChange={(tabId) => {
            if (tabId !== 'materials') {
              router.push(tabId === 'chat' ? '/sage' : `/sage/${tabId}`);
            }
          }}
        />
      }
      sidebar={
        <HubSidebar>
          <div className={materialsStyles.uploadInfo}>
            <h4>Supported Files</h4>
            <ul>
              <li>PDF documents</li>
              <li>Word documents (.doc, .docx)</li>
              <li>Text files (.txt)</li>
              <li>Images (homework photos)</li>
            </ul>
            <p className={materialsStyles.uploadLimit}>Max file size: 10MB</p>
          </div>
          <SageHelpWidget />
          <SageTipsWidget />
          <SageVideoWidget />
        </HubSidebar>
      }
    >
      {filteredMaterials.length === 0 ? (
        <HubEmptyState
          title={searchQuery ? "No matching materials" : "No materials uploaded"}
          description={searchQuery
            ? "Try adjusting your search terms."
            : "Upload study materials, notes, or homework photos for Sage to help you with."
          }
          actionLabel={searchQuery ? undefined : "Upload Material"}
          onAction={searchQuery ? undefined : () => fileInputRef.current?.click()}
        />
      ) : (
        <>
          <div className={materialsStyles.materialsGrid}>
            {filteredMaterials.map((material) => (
              <div key={material.id} className={materialsStyles.materialCard}>
                <div className={materialsStyles.materialIcon}>
                  {getFileTypeLabel(material.mimeType)}
                </div>
                <div className={materialsStyles.materialInfo}>
                  <h4 className={materialsStyles.materialName}>
                    {material.originalName}
                  </h4>
                  <p className={materialsStyles.materialMeta}>
                    {formatFileSize(material.size)} • {formatDate(material.createdAt)}
                  </p>
                  {material.subject && (
                    <span className={materialsStyles.materialSubject}>
                      {material.subject}
                    </span>
                  )}
                </div>
                <div className={materialsStyles.materialStatus}>
                  {material.status === 'processing' && (
                    <span className={materialsStyles.statusProcessing}>Processing</span>
                  )}
                  {material.status === 'ready' && (
                    <span className={materialsStyles.statusReady}>Ready</span>
                  )}
                  {material.status === 'error' && (
                    <span className={materialsStyles.statusError}>Error</span>
                  )}
                </div>
                <button
                  className={materialsStyles.deleteButton}
                  onClick={() => {
                    if (confirm('Delete this material?')) {
                      deleteMutation.mutate(material.id);
                    }
                  }}
                  disabled={deleteMutation.isPending}
                  title="Delete material"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
          {totalItems > ITEMS_PER_PAGE && (
            <HubPagination
              currentPage={currentPage}
              totalItems={totalItems}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={setCurrentPage}
            />
          )}
        </>
      )}
    </HubPageLayout>
  );
}
