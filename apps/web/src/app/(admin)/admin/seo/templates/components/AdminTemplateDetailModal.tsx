/**
 * Filename: AdminTemplateDetailModal.tsx
 * Purpose: Admin-specific template detail modal with full information and admin actions
 * Created: 2025-12-29
 * Pattern: Uses HubDetailModal with admin-specific sections and actions (mirrors AdminBookingDetailModal)
 *
 * Features:
 * - Complete template information (validation rules, checklist)
 * - Admin-specific actions (Edit, Duplicate, Delete)
 * - SEO checklist display with required indicators
 * - Radix UI DropdownMenu for status changes (if needed)
 *
 * Usage:
 * <AdminTemplateDetailModal
 *   isOpen={isOpen}
 *   onClose={onClose}
 *   template={template}
 *   onTemplateUpdated={refreshTemplatesList}
 * />
 */

'use client';

import React, { useState } from 'react';
import { HubDetailModal } from '@/app/components/hub/modal';
import type { DetailSection } from '@/app/components/hub/modal';
import Button from '@/app/components/ui/actions/Button';
import { createClient } from '@/utils/supabase/client';
import { CheckSquare, Copy, Edit, Trash2 } from 'lucide-react';
import styles from './AdminTemplateDetailModal.module.css';

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

interface AdminTemplateDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: ContentTemplate | null;
  onTemplateUpdated?: () => void;
}

export default function AdminTemplateDetailModal({
  isOpen,
  onClose,
  template,
  onTemplateUpdated,
}: AdminTemplateDetailModalProps) {
  const supabase = createClient();
  const [isProcessing, setIsProcessing] = useState(false);

  if (!template) return null;

  // Format datetime helper
  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Build subtitle with type badge
  const subtitle = `Template ID: ${template.id.slice(0, 8)} • ${template.content_type.toUpperCase()}`;

  // Build sections
  const sections: DetailSection[] = [
    {
      title: 'Basic Information',
      fields: [
        { label: 'Template Name', value: template.name },
        { label: 'Content Type', value: template.content_type === 'hub' ? 'Hub Template' : 'Spoke Template' },
        { label: 'Template ID', value: template.id },
        { label: 'Created At', value: formatDateTime(template.created_at) },
      ],
    },
    {
      title: 'Validation Rules',
      fields: [
        { label: 'Minimum Word Count', value: template.validation_rules.min_word_count.toString() },
        { label: 'Target Readability Score', value: template.validation_rules.target_readability.toString() },
        { label: 'Minimum Internal Links', value: template.validation_rules.min_internal_links.toString() },
        { label: 'Minimum External Citations', value: template.validation_rules.min_external_citations.toString() },
        {
          label: 'Primary Keyword in Title',
          value: template.validation_rules.require_primary_keyword_in_title ? 'Required' : 'Optional',
        },
      ],
    },
  ];

  // SEO Checklist as custom section
  const checklistSection: DetailSection = {
    title: 'SEO Checklist',
    fields: [
      {
        label: '',
        value: (
          <div className={styles.checklistSection}>
            <div className={styles.checklistHeader}>
              <span className={styles.checklistCount}>
                {template.seo_checklist.length} items total
              </span>
              <span className={styles.requiredCount}>
                {template.seo_checklist.filter(item => item.required).length} required
              </span>
            </div>
            <div className={styles.checklistItems}>
              {template.seo_checklist.map((item, idx) => (
                <div key={idx} className={styles.checklistItem}>
                  <CheckSquare
                    className={item.required ? styles.iconRequired : styles.iconOptional}
                    size={18}
                  />
                  <div className={styles.checklistText}>
                    <span className={styles.checklistLabel}>{item.item}</span>
                    {item.required && <span className={styles.requiredBadge}>Required</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ),
      },
    ],
  };

  sections.push(checklistSection);

  // Action handlers
  const handleEdit = () => {
    console.log('Edit template:', template.id);
    // TODO: Navigate to edit page or open edit modal
    onClose();
  };

  const handleDuplicate = async () => {
    if (isProcessing) return;

    if (!confirm(`Create a copy of "${template.name}"?\n\nThe duplicate will be named "${template.name} (Copy)".`)) {
      return;
    }

    setIsProcessing(true);
    try {
      const { data, error } = await supabase
        .from('seo_content_templates')
        .insert({
          name: `${template.name} (Copy)`,
          content_type: template.content_type,
          validation_rules: template.validation_rules,
          seo_checklist: template.seo_checklist,
        })
        .select()
        .single();

      if (error) throw error;

      alert('Template duplicated successfully!');
      onTemplateUpdated?.();
      onClose();
    } catch (error) {
      console.error('Failed to duplicate template:', error);
      alert('Failed to duplicate template. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (isProcessing) return;

    if (!confirm(`Delete template "${template.name}"?\n\nThis action cannot be undone.`)) {
      return;
    }

    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('seo_content_templates')
        .delete()
        .eq('id', template.id);

      if (error) throw error;

      alert('Template deleted successfully!');
      onTemplateUpdated?.();
      onClose();
    } catch (error) {
      console.error('Failed to delete template:', error);
      alert('Failed to delete template. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Build action buttons
  const actionButtons = (
    <div className={styles.actions}>
      <Button
        variant="secondary"
        onClick={handleEdit}
        disabled={isProcessing}
      >
        <Edit size={16} /> Edit Template
      </Button>
      <Button
        variant="secondary"
        onClick={handleDuplicate}
        disabled={isProcessing}
      >
        <Copy size={16} /> Duplicate
      </Button>
      <Button
        variant="danger"
        onClick={handleDelete}
        disabled={isProcessing}
      >
        <Trash2 size={16} /> Delete
      </Button>
    </div>
  );

  return (
    <HubDetailModal
      isOpen={isOpen}
      onClose={onClose}
      title={template.name}
      subtitle={subtitle}
      sections={sections}
      actions={actionButtons}
    />
  );
}
