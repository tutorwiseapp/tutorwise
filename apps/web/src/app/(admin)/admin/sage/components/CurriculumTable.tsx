/**
 * Filename: CurriculumTable.tsx
 * Purpose: Admin Sage curriculum registry data table
 * Created: 2026-03-16
 * Pattern: Follows SageProSubscriptionsTable structure
 */

'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { HubDataTable } from '@/components/hub/data';
import type { Column } from '@/components/hub/data';
import StatusBadge from '@/components/admin/badges/StatusBadge';
import type { StatusBadgeColor } from '@/components/admin/badges/StatusBadge';
import HubEmptyState from '@/components/hub/content/HubEmptyState';
import { HubDetailModal } from '@/components/hub/modal';
import type { DetailSection } from '@/components/hub/modal';
import { ADMIN_TABLE_DEFAULTS } from '@/constants/admin';
import { AlertTriangle } from 'lucide-react';
import styles from './CurriculumTable.module.css';

interface ExamBoardMapping {
  topic_id: string;
  exam_board: string;
  paper: number | null;
  weighting_percent: number | null;
}

interface CurriculumTopic {
  id: string;
  subject: string;
  topic_name: string;
  topic_slug: string;
  parent_topic_id: string | null;
  level: string;
  learning_objectives: string[];
  vocabulary: string[];
  common_misconceptions: string[];
  estimated_hours: number | null;
  sort_order: number;
  exam_boards: ExamBoardMapping[];
}

// Subject display config
const SUBJECT_COLORS: Record<string, StatusBadgeColor> = {
  maths: { bg: '#dbeafe', text: '#1e40af' },
  english: { bg: '#f3e8ff', text: '#6b21a8' },
  'english-language': { bg: '#f3e8ff', text: '#6b21a8' },
  'english-literature': { bg: '#ede9fe', text: '#5b21b6' },
  biology: { bg: '#dcfce7', text: '#166534' },
  chemistry: { bg: '#fef9c3', text: '#854d0e' },
  physics: { bg: '#e0e7ff', text: '#3730a3' },
  'combined-science': { bg: '#d1fae5', text: '#065f46' },
  'computer-science': { bg: '#f0fdf4', text: '#14532d' },
  history: { bg: '#fef3c7', text: '#92400e' },
  geography: { bg: '#ecfdf5', text: '#064e3b' },
};

const LEVEL_COLORS: Record<string, StatusBadgeColor> = {
  gcse_foundation: { bg: '#e0f2fe', text: '#0c4a6e' },
  gcse: { bg: '#e0f2fe', text: '#0c4a6e' },
  a_level: { bg: '#fce7f3', text: '#9d174d' },
  ks2: { bg: '#fef3c7', text: '#92400e' },
  ib_sl: { bg: '#ede9fe', text: '#5b21b6' },
  ib_hl: { bg: '#ddd6fe', text: '#4c1d95' },
  ap: { bg: '#fee2e2', text: '#991b1b' },
  other: { bg: '#f3f4f6', text: '#374151' },
};

const LEVEL_LABELS: Record<string, string> = {
  gcse_foundation: 'GCSE Foundation',
  gcse: 'GCSE',
  a_level: 'A-Level',
  ks2: 'KS2 / Primary',
  ib_sl: 'IB SL',
  ib_hl: 'IB HL',
  ap: 'AP',
  other: 'Other',
};

function formatSubject(subject: string): string {
  return subject
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace('Ib ', 'IB ')
    .replace('Ap ', 'AP ');
}

function buildDetailSections(topic: CurriculumTopic): DetailSection[] {
  const sections: DetailSection[] = [];

  // Metadata
  sections.push({
    title: 'Topic Details',
    fields: [
      { label: 'Slug', value: topic.topic_slug },
      { label: 'Level', value: LEVEL_LABELS[topic.level] || topic.level },
      { label: 'Subject', value: formatSubject(topic.subject) },
      { label: 'Teaching Hours', value: topic.estimated_hours ? `${topic.estimated_hours}h` : '—' },
      { label: 'Exam Boards', value: [...new Set((topic.exam_boards || []).map((b) => b.exam_board))].join(', ') || '—' },
    ],
  });

  // Learning Objectives
  if (Array.isArray(topic.learning_objectives) && topic.learning_objectives.length > 0) {
    sections.push({
      title: 'Learning Objectives',
      fields: topic.learning_objectives.map((obj, i) => ({
        label: `${i + 1}`,
        value: obj,
      })),
    });
  }

  // Vocabulary
  if (Array.isArray(topic.vocabulary) && topic.vocabulary.length > 0) {
    sections.push({
      title: 'Key Vocabulary',
      fields: [{ label: 'Terms', value: topic.vocabulary.join(', ') }],
    });
  }

  // Common Misconceptions
  if (Array.isArray(topic.common_misconceptions) && topic.common_misconceptions.length > 0) {
    sections.push({
      title: 'Common Misconceptions',
      fields: topic.common_misconceptions.map((m, i) => ({
        label: `${i + 1}`,
        value: m,
      })),
    });
  }

  // Exam Board Mappings
  if (topic.exam_boards && topic.exam_boards.length > 0) {
    sections.push({
      title: 'Exam Board Mappings',
      fields: topic.exam_boards.map((b) => ({
        label: b.exam_board,
        value: [b.paper ? `Paper ${b.paper}` : null, b.weighting_percent ? `${b.weighting_percent}%` : null].filter(Boolean).join(' · ') || '—',
      })),
    });
  }

  return sections;
}

export default function CurriculumTable() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<number>(ADMIN_TABLE_DEFAULTS.PAGE_SIZE);
  const [sortKey, setSortKey] = useState('sort_order');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [examBoardFilter, setExamBoardFilter] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<CurriculumTopic | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-sage-curriculum', page, limit, sortKey, sortDirection, searchQuery, subjectFilter, levelFilter, examBoardFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      params.set('sort', sortKey);
      params.set('dir', sortDirection);
      if (searchQuery) params.set('search', searchQuery);
      if (subjectFilter) params.set('subject', subjectFilter);
      if (levelFilter) params.set('level', levelFilter);
      if (examBoardFilter) params.set('exam_board', examBoardFilter);

      const res = await fetch(`/api/admin/sage/curriculum?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch curriculum');
      return res.json();
    },
    staleTime: ADMIN_TABLE_DEFAULTS.STALE_TIME,
  });

  const topics: CurriculumTopic[] = data?.topics || [];
  const total: number = data?.total || 0;
  const filterSubjects: string[] = data?.filters?.subjects || [];
  const filterLevels: string[] = data?.filters?.levels || [];
  const filterExamBoards: string[] = data?.filters?.examBoards || [];

  const subjectFilterOptions = useMemo(() => [
    { label: 'All Subjects', value: '' },
    ...filterSubjects.map((s: string) => ({ label: formatSubject(s), value: s })),
  ], [filterSubjects]);

  const levelFilterOptions = useMemo(() => [
    { label: 'All Levels', value: '' },
    ...filterLevels.map((l: string) => ({ label: LEVEL_LABELS[l] || l, value: l })),
  ], [filterLevels]);

  const examBoardFilterOptions = useMemo(() => [
    { label: 'All Boards', value: '' },
    ...filterExamBoards.map((b: string) => ({ label: b, value: b })),
  ], [filterExamBoards]);

  const columns: Column<CurriculumTopic>[] = [
    {
      key: 'topic_name',
      label: 'Topic',
      sortable: true,
      width: '30%',
      render: (row) => (
        <div className={styles.topicCell}>
          <span className={styles.topicName}>{row.topic_name}</span>
          <span className={styles.topicSlug}>{row.topic_slug}</span>
        </div>
      ),
    },
    {
      key: 'subject',
      label: 'Subject',
      sortable: true,
      render: (row) => (
        <StatusBadge
          variant="info"
          label={formatSubject(row.subject)}
          size="xs"
          shape="rect"
          color={SUBJECT_COLORS[row.subject] || { bg: '#f3f4f6', text: '#374151' }}
        />
      ),
    },
    {
      key: 'level',
      label: 'Level',
      sortable: true,
      render: (row) => (
        <StatusBadge
          variant="info"
          label={LEVEL_LABELS[row.level] || row.level}
          size="xs"
          shape="rect"
          color={LEVEL_COLORS[row.level] || LEVEL_COLORS.other}
        />
      ),
    },
    {
      key: 'learning_objectives',
      label: 'Objectives',
      hideOnMobile: true,
      render: (row) => {
        const count = Array.isArray(row.learning_objectives) ? row.learning_objectives.length : 0;
        return <span className={styles.countBadge}>{count}</span>;
      },
    },
    {
      key: 'estimated_hours',
      label: 'Hours',
      sortable: true,
      hideOnMobile: true,
      render: (row) => (
        <span>{row.estimated_hours ? `${row.estimated_hours}h` : '—'}</span>
      ),
    },
    {
      key: 'common_misconceptions',
      label: 'Misconceptions',
      hideOnMobile: true,
      hideOnTablet: true,
      render: (row) => {
        const count = Array.isArray(row.common_misconceptions) ? row.common_misconceptions.length : 0;
        if (count === 0) {
          return <span className={styles.gapIndicator}><AlertTriangle size={12} /> Gap</span>;
        }
        return <span className={styles.countBadge}>{count}</span>;
      },
    },
    {
      key: 'exam_boards',
      label: 'Boards',
      hideOnMobile: true,
      hideOnTablet: true,
      render: (row) => {
        const boards = [...new Set((row.exam_boards || []).map((b) => b.exam_board))];
        if (boards.length === 0) return <span className={styles.muted}>—</span>;
        return (
          <div className={styles.boardTags}>
            {boards.map((b) => (
              <StatusBadge
                key={b}
                variant="neutral"
                label={b}
                size="xs"
                shape="rect"
              />
            ))}
          </div>
        );
      },
    },
  ];

  const handleFilterChange = (filterKey: string, value: string | string[]) => {
    const val = Array.isArray(value) ? value[0] || '' : value;
    if (filterKey === 'subject') {
      setSubjectFilter(val);
      setPage(1);
    } else if (filterKey === 'level') {
      setLevelFilter(val);
      setPage(1);
    } else if (filterKey === 'exam_board') {
      setExamBoardFilter(val);
      setPage(1);
    }
  };

  const handleExport = () => {
    const rows = topics.map((t) => ({
      topic_name: t.topic_name,
      topic_slug: t.topic_slug,
      subject: t.subject,
      level: t.level,
      objectives: Array.isArray(t.learning_objectives) ? t.learning_objectives.length : 0,
      misconceptions: Array.isArray(t.common_misconceptions) ? t.common_misconceptions.length : 0,
      estimated_hours: t.estimated_hours || '',
      exam_boards: (t.exam_boards || []).map((b) => b.exam_board).join(', '),
    }));
    const csv = [
      ['Topic', 'Slug', 'Subject', 'Level', 'Objectives', 'Misconceptions', 'Hours', 'Exam Boards'].join(','),
      ...rows.map((r) =>
        [r.topic_name, r.topic_slug, r.subject, r.level, r.objectives, r.misconceptions, r.estimated_hours, `"${r.exam_boards}"`].join(',')
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sage-curriculum-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (error) {
    return (
      <HubEmptyState
        title="Failed to load curriculum"
        description="There was an error loading the curriculum data. Please try refreshing."
      />
    );
  }

  return (
    <>
      <HubDataTable<CurriculumTopic>
        columns={columns}
        data={topics}
        loading={isLoading}
        getRowId={(row) => row.id}
        onRowClick={(row) => setSelectedTopic(row)}
        searchPlaceholder="Search topics..."
        onSearch={(q) => { setSearchQuery(q); setPage(1); }}
        onSort={(key, direction) => { setSortKey(key); setSortDirection(direction); }}
        onFilterChange={handleFilterChange}
        onExport={handleExport}
        onRefresh={() => refetch()}
        filters={[
          { key: 'subject', label: 'Subject', options: subjectFilterOptions },
          { key: 'level', label: 'Level', options: levelFilterOptions },
          { key: 'exam_board', label: 'Exam Board', options: examBoardFilterOptions },
        ]}
        pagination={{
          page,
          limit,
          total,
          onPageChange: setPage,
          onLimitChange: setLimit,
        }}
        emptyMessage="No curriculum topics found"
      />

      {/* Topic Detail Modal */}
      {selectedTopic && (
        <HubDetailModal
          isOpen={!!selectedTopic}
          onClose={() => setSelectedTopic(null)}
          title={selectedTopic.topic_name}
          subtitle={`${formatSubject(selectedTopic.subject)} · ${LEVEL_LABELS[selectedTopic.level] || selectedTopic.level}`}
          sections={buildDetailSections(selectedTopic)}
        />
      )}
    </>
  );
}
