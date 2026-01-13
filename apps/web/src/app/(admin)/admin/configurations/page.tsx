/*
 * Filename: src/app/(admin)/admin/configurations/page.tsx
 * Purpose: Configurations management page - Shared Fields
 * Created: 2026-01-13
 * Updated: 2026-01-13 - Moved from /admin/forms/fields to /admin/configurations
 *
 * Features:
 * - Context selector: View all fields OR filter by specific context
 * - Left: Field list with search/filter
 * - Right: Integrated editor with metadata + options
 * - Context-specific configuration (custom labels, required status)
 */
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Edit2, Trash2, Plus, X, Check } from 'lucide-react';
import { HubPageLayout, HubHeader, HubTabs } from '@/app/components/hub/layout';
import HubSidebar, { SidebarWidget } from '@/app/components/hub/sidebar/HubSidebar';
import HubToolbar from '@/app/components/hub/toolbar/HubToolbar';
import Button from '@/app/components/ui/actions/Button';
import {
  fetchSharedFields,
  updateSharedField,
  getFieldUsage,
  fetchFieldsForContext,
  getAvailableContexts,
  updateFormContextField,
  type SharedField,
} from '@/lib/api/sharedFields';
import styles from './page.module.css';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

// Context display names
const CONTEXT_LABELS: Record<string, string> = {
  'onboarding.tutor': 'Onboarding - Tutor',
  'onboarding.agent': 'Onboarding - Agent',
  'onboarding.client': 'Onboarding - Client',
  'account.tutor': 'Account - Tutor',
  'account.agent': 'Account - Agent',
  'account.client': 'Account - Client',
  'organisation.tutor': 'Organisation - Tutor',
  'organisation.agent': 'Organisation - Agent',
  'organisation.client': 'Organisation - Client',
  'listing.tutor': 'Listing - Tutor',
  'listing.agent': 'Listing - Agent',
  'listing.client': 'Listing - Client',
};

// Sortable Option Component
interface SortableOptionProps {
  option: { value: string; label: string };
  index: number;
  isEditing: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onSave: (value: string, label: string) => void;
  onCancel: () => void;
}

function SortableOption({
  option,
  index,
  isEditing,
  onEdit,
  onDelete,
  onSave,
  onCancel,
}: SortableOptionProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `option-${index}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const [editValue, setEditValue] = useState(option.value);
  const [editLabel, setEditLabel] = useState(option.label);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={styles.optionItem}
    >
      {/* Drag handle */}
      <div {...attributes} {...listeners} className={styles.dragHandle}>
        <GripVertical size={16} />
      </div>

      {isEditing ? (
        <div className={styles.editOptionForm}>
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            placeholder="Value"
            className={styles.input}
          />
          <input
            type="text"
            value={editLabel}
            onChange={(e) => setEditLabel(e.target.value)}
            placeholder="Label"
            className={styles.input}
          />
          <div className={styles.optionActions}>
            <button
              onClick={() => onSave(editValue, editLabel)}
              className={styles.iconButton}
              title="Save"
            >
              <Check size={16} />
            </button>
            <button
              onClick={onCancel}
              className={styles.iconButton}
              title="Cancel"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className={styles.optionContent}>
            <span className={styles.optionValue}>{option.value}</span>
            <span className={styles.optionLabel}>{option.label}</span>
          </div>
          <div className={styles.optionActions}>
            <button
              onClick={onEdit}
              className={styles.iconButton}
              title="Edit"
            >
              <Edit2 size={16} />
            </button>
            <button
              onClick={onDelete}
              className={styles.iconButton}
              title="Delete"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function SharedFieldsPage() {
  const queryClient = useQueryClient();
  const [selectedField, setSelectedField] = useState<any>(null);
  const [editingOptionIndex, setEditingOptionIndex] = useState<number | null>(null);
  const [isAddingOption, setIsAddingOption] = useState(false);
  const [newOptionValue, setNewOptionValue] = useState('');
  const [newOptionLabel, setNewOptionLabel] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedContext, setSelectedContext] = useState<string>('all');

  // Fetch all shared fields
  const { data: allFields = [], isLoading, error } = useQuery({
    queryKey: ['shared-fields'],
    queryFn: fetchSharedFields,
    retry: 1,
  });

  // Fetch context-specific fields when context is selected
  const { data: contextFields = [], isLoading: isLoadingContext } = useQuery({
    queryKey: ['context-fields', selectedContext],
    queryFn: () => fetchFieldsForContext(selectedContext),
    enabled: selectedContext !== 'all',
    staleTime: 0, // Always fetch fresh data
  });

  // Fetch available contexts
  const { data: availableContexts = [] } = useQuery({
    queryKey: ['available-contexts'],
    queryFn: getAvailableContexts,
  });

  // Use either all fields or context-specific fields
  const fields = selectedContext === 'all' ? allFields : contextFields;

  // Fetch field usage for selected field
  const { data: fieldUsage = [] } = useQuery({
    queryKey: ['field-usage', selectedField?.id],
    queryFn: () => (selectedField ? getFieldUsage(selectedField.id) : Promise.resolve([])),
    enabled: !!selectedField,
  });

  // Update field mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<SharedField> }) =>
      updateSharedField(id, updates),
    onSuccess: async () => {
      // Invalidate and refetch both queries
      await queryClient.invalidateQueries({ queryKey: ['shared-fields'] });
      await queryClient.invalidateQueries({ queryKey: ['context-fields'] });
      await queryClient.refetchQueries({ queryKey: ['shared-fields'] });
      if (selectedContext !== 'all') {
        await queryClient.refetchQueries({ queryKey: ['context-fields', selectedContext] });
      }

      // Update the selected field with fresh data
      if (selectedField) {
        const queryKey = selectedContext === 'all' ? ['shared-fields'] : ['context-fields', selectedContext];
        const freshFields = queryClient.getQueryData<any[]>(queryKey);
        if (freshFields) {
          const freshField = freshFields.find((f) => f.id === selectedField.id);
          if (freshField) {
            setSelectedField(freshField);
          }
        }
      }
    },
  });

  // Update context field mutation
  const updateContextMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) =>
      updateFormContextField(id, updates),
    onSuccess: async () => {
      // Invalidate and refetch the context fields
      await queryClient.invalidateQueries({ queryKey: ['context-fields', selectedContext] });
      await queryClient.refetchQueries({ queryKey: ['context-fields', selectedContext] });

      // Update the selected field with fresh data from the query
      if (selectedField) {
        const freshFields = queryClient.getQueryData<any[]>(['context-fields', selectedContext]);
        if (freshFields) {
          const freshField = freshFields.find((f) => f.id === selectedField.id);
          if (freshField) {
            setSelectedField(freshField);
          }
        }
      }
    },
  });

  // Drag-and-drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end for options reordering
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || !selectedField || !selectedField.options) return;

    const activeIndex = parseInt(active.id.toString().replace('option-', ''));
    const overIndex = parseInt(over.id.toString().replace('option-', ''));

    if (activeIndex !== overIndex) {
      const newOptions = arrayMove(selectedField.options, activeIndex, overIndex);

      // Update field with new options order
      updateMutation.mutate({
        id: selectedField.id,
        updates: { options: newOptions as Array<{ value: string; label: string }> },
      });

      // Optimistically update selected field
      setSelectedField({ ...selectedField, options: newOptions });
    }
  };

  // Add new option
  const handleAddOption = () => {
    if (!selectedField || !newOptionValue.trim() || !newOptionLabel.trim()) return;

    const currentOptions = selectedField.options || [];
    const newOptions = [...currentOptions, { value: newOptionValue, label: newOptionLabel }];

    updateMutation.mutate({
      id: selectedField.id,
      updates: { options: newOptions },
    });

    setNewOptionValue('');
    setNewOptionLabel('');
    setIsAddingOption(false);
    setSelectedField({ ...selectedField, options: newOptions });
  };

  // Edit option
  const handleEditOption = (index: number, value: string, label: string) => {
    if (!selectedField || !selectedField.options) return;

    const newOptions = [...selectedField.options];
    newOptions[index] = { value, label };

    updateMutation.mutate({
      id: selectedField.id,
      updates: { options: newOptions },
    });

    setEditingOptionIndex(null);
    setSelectedField({ ...selectedField, options: newOptions });
  };

  // Delete option
  const handleDeleteOption = (index: number) => {
    if (!selectedField || !selectedField.options) return;

    const newOptions = selectedField.options.filter((_opt: any, i: number) => i !== index);

    updateMutation.mutate({
      id: selectedField.id,
      updates: { options: newOptions },
    });

    setSelectedField({ ...selectedField, options: newOptions });
  };

  // Filter and search fields
  const filteredFields = useMemo(() => {
    let filtered = fields;

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter((f) => f.field_type === filterType);
    }

    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (f) =>
          f.field_name.toLowerCase().includes(query) ||
          f.label.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [fields, filterType, searchQuery, selectedContext]);

  // Calculate stats
  const totalOptions = fields.reduce((sum, f) => sum + (f.options?.length || 0), 0);

  // Build tabs - only "All Fields"
  const tabs = [
    { id: 'all', label: 'All Fields', count: fields.length, active: true },
  ];

  // Clear selectedField when context changes to force re-selection
  useEffect(() => {
    setSelectedField(null);
    setEditingOptionIndex(null);
    setIsAddingOption(false);
  }, [selectedContext]);

  // Handle filter change from HubToolbar
  const handleFilterChange = (key: string, value: string | string[]) => {
    const stringValue = Array.isArray(value) ? value[0] || '' : value;
    if (key === 'context') {
      setSelectedContext(stringValue);
    } else if (key === 'type') {
      setFilterType(stringValue);
    }
  };

  return (
    <HubPageLayout
      header={
        <>
          <HubHeader
            title="Field Management"
            subtitle="Manage field options globally - changes apply across all contexts"
          />
          <HubTabs tabs={tabs} onTabChange={() => {}} />
        </>
      }
      sidebar={
        <HubSidebar>
          <SidebarWidget title="Statistics">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ textAlign: 'center' }}>
                <div
                  style={{
                    fontSize: '1.875rem',
                    fontWeight: 700,
                    color: '#14b8a6',
                    lineHeight: 1,
                    marginBottom: '0.25rem',
                  }}
                >
                  {fields.length}
                </div>
                <div
                  style={{
                    fontSize: '0.75rem',
                    color: '#6b7280',
                    textTransform: 'uppercase',
                    letterSpacing: '0.025em',
                  }}
                >
                  Total Fields
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div
                  style={{
                    fontSize: '1.875rem',
                    fontWeight: 700,
                    color: '#14b8a6',
                    lineHeight: 1,
                    marginBottom: '0.25rem',
                  }}
                >
                  {totalOptions}
                </div>
                <div
                  style={{
                    fontSize: '0.75rem',
                    color: '#6b7280',
                    textTransform: 'uppercase',
                    letterSpacing: '0.025em',
                  }}
                >
                  Total Options
                </div>
              </div>
            </div>
          </SidebarWidget>

          {selectedField && fieldUsage.length > 0 && (
            <SidebarWidget title="Field Usage">
              <div style={{ fontSize: '0.875rem', color: '#4b5563', lineHeight: 1.6 }}>
                <p style={{ margin: '0 0 0.5rem 0', fontWeight: 600, color: '#111827' }}>
                  Used in {fieldUsage.length} context{fieldUsage.length !== 1 ? 's' : ''}:
                </p>
                <ul style={{ margin: 0, paddingLeft: '1.25rem', listStyle: 'disc' }}>
                  {fieldUsage.map((context) => (
                    <li key={context} style={{ marginBottom: '0.25rem' }}>
                      {CONTEXT_LABELS[context] || context}
                    </li>
                  ))}
                </ul>
              </div>
            </SidebarWidget>
          )}

          <SidebarWidget title="How It Works">
            <div style={{ fontSize: '0.875rem', color: '#4b5563', lineHeight: 1.6 }}>
              <p style={{ margin: '0 0 0.75rem 0' }}>
                <strong style={{ color: '#111827', fontWeight: 600 }}>Global Management:</strong> Edit
                field options once, update all forms
              </p>
              <p style={{ margin: 0 }}>
                <strong style={{ color: '#111827', fontWeight: 600 }}>Single Source:</strong> Changes
                apply to Onboarding, Account, and Organisation forms
              </p>
            </div>
          </SidebarWidget>
        </HubSidebar>
      }
    >
      {/* HubToolbar - positioned above 2-column layout */}
      <div style={{ marginTop: '-0.5rem' }}>
        <HubToolbar
          searchPlaceholder="Search fields..."
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          filters={[
            {
              key: 'context',
              label: 'All Contexts',
              options: [
                { label: 'All Fields', value: 'all' },
                ...availableContexts.map((context) => ({
                  label: CONTEXT_LABELS[context] || context,
                  value: context,
                })),
              ],
            },
            {
              key: 'type',
              label: 'All Types',
              options: [
                { label: 'All Types', value: 'all' },
                { label: 'Select', value: 'select' },
                { label: 'Multiselect', value: 'multiselect' },
                { label: 'Text', value: 'text' },
                { label: 'Textarea', value: 'textarea' },
                { label: 'Number', value: 'number' },
              ],
            },
          ]}
          filterValues={{ context: selectedContext, type: filterType }}
          onFilterChange={handleFilterChange}
          variant="minimal"
        />
      </div>

      {/* Two-column layout */}
      <div className={styles.contentWrapper}>
        {/* LEFT: Field List */}
        <div className={styles.fieldList}>
          <div className={styles.fieldListHeader}>
            <h3>All Fields ({filteredFields.length})</h3>
            {updateMutation.isPending && (
              <span className={styles.refreshingIndicator}>Updating...</span>
            )}
          </div>

          <div className={styles.fieldItems}>
            {isLoading ? (
              <div className={styles.loading}>Loading fields...</div>
            ) : error ? (
              <div style={{ padding: '1rem', color: '#dc2626', textAlign: 'center' }}>
                Error loading fields
              </div>
            ) : filteredFields.length === 0 ? (
              <div className={styles.loading}>No fields found</div>
            ) : (
              filteredFields.map((field) => (
                <button
                  key={field.id}
                  onClick={() => {
                    setSelectedField(field);
                    setEditingOptionIndex(null);
                    setIsAddingOption(false);
                  }}
                  className={`${styles.fieldItem} ${
                    selectedField?.id === field.id ? styles.fieldItemActive : ''
                  }`}
                >
                  <div className={styles.fieldName}>{field.field_name}</div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* RIGHT: Integrated Editor */}
        <div className={styles.fieldEditor}>
          {!selectedField ? (
            <div style={{ textAlign: 'center', padding: '4rem 2rem', color: '#6b7280' }}>
              <p style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>
                Select a field from the list
              </p>
              <p style={{ fontSize: '0.875rem' }}>
                Click any field on the left to view and edit its configuration
              </p>
            </div>
          ) : (
            <div className={styles.editorContent} key={`editor-${selectedField.id}-${selectedContext}`}>
              {/* Field Header with basic info */}
              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <h3>{selectedField.field_name}</h3>
                  {selectedContext !== 'all' && (
                    <span className={styles.contextBadge}>
                      {CONTEXT_LABELS[selectedContext] || selectedContext}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
                  <div><strong>Type:</strong> {selectedField.field_type}</div>
                  <div><strong>Label:</strong> {selectedField.customLabel || selectedField.label}</div>
                </div>

                {/* Context-specific controls - only show when context is selected */}
                {selectedContext !== 'all' && (
                  <div style={{
                    display: 'flex',
                    gap: '2rem',
                    marginBottom: '1.5rem',
                    padding: '1rem',
                    backgroundColor: '#f0fdfa',
                    borderRadius: '0.5rem',
                    border: '1px solid #99f6e4'
                  }}>
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={selectedField.isEnabled !== false}
                        onChange={(e) => {
                          if (selectedField.contextId) {
                            updateContextMutation.mutate({
                              id: selectedField.contextId,
                              updates: { is_enabled: e.target.checked },
                            });
                          }
                        }}
                        style={{ marginRight: '0.5rem' }}
                      />
                      Enabled
                    </label>

                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={selectedField.isRequired || false}
                        onChange={(e) => {
                          if (selectedField.contextId) {
                            updateContextMutation.mutate({
                              id: selectedField.contextId,
                              updates: { is_required: e.target.checked },
                            });
                          }
                        }}
                        style={{ marginRight: '0.5rem' }}
                      />
                      Required
                    </label>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <label className={styles.label} style={{ margin: 0 }}>Display Order:</label>
                      <input
                        type="number"
                        value={selectedField.displayOrder || 0}
                        onChange={(e) => {
                          if (selectedField.contextId) {
                            updateContextMutation.mutate({
                              id: selectedField.contextId,
                              updates: { display_order: parseInt(e.target.value) || 0 },
                            });
                          }
                        }}
                        className={styles.input}
                        style={{ width: '80px', padding: '0.375rem 0.5rem' }}
                      />
                    </div>
                  </div>
                )}

                {/* Context-specific label overrides */}
                {selectedContext !== 'all' && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      color: '#6b7280',
                      marginBottom: '0.75rem'
                    }}>
                      Context Overrides
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.label}>
                        Custom Label (leave empty to use default: &ldquo;{selectedField.label}&rdquo;)
                      </label>
                      <input
                        type="text"
                        value={selectedField.customLabel || ''}
                        onChange={(e) => {
                          if (selectedField.contextId) {
                            updateContextMutation.mutate({
                              id: selectedField.contextId,
                              updates: { custom_label: e.target.value || null },
                            });
                          }
                        }}
                        placeholder={selectedField.label}
                        className={styles.input}
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.label}>
                        Custom Placeholder (leave empty to use default
                        {selectedField.placeholder ? <>&nbsp;&ldquo;{selectedField.placeholder}&rdquo;</> : ''})
                      </label>
                      <input
                        type="text"
                        value={selectedField.customPlaceholder || ''}
                        onChange={(e) => {
                          if (selectedField.contextId) {
                            updateContextMutation.mutate({
                              id: selectedField.contextId,
                              updates: { custom_placeholder: e.target.value || null },
                            });
                          }
                        }}
                        placeholder={selectedField.placeholder || 'No default'}
                        className={styles.input}
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.label}>
                        Custom Help Text (leave empty to use default
                        {selectedField.help_text ? <>&nbsp;&ldquo;{selectedField.help_text}&rdquo;</> : ''})
                      </label>
                      <input
                        type="text"
                        value={selectedField.customHelpText || ''}
                        onChange={(e) => {
                          if (selectedField.contextId) {
                            updateContextMutation.mutate({
                              id: selectedField.contextId,
                              updates: { custom_help_text: e.target.value || null },
                            });
                          }
                        }}
                        placeholder={selectedField.help_text || 'No default'}
                        className={styles.input}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Options Section (only for select/multiselect) */}
              {(selectedField.field_type === 'select' || selectedField.field_type === 'multiselect') && (
                <div className={styles.section} key={`options-${selectedField.id}`}>
                  <div className={styles.sectionHeader}>
                    <h3>Options ({selectedField.options?.length || 0})</h3>
                    <Button
                      onClick={() => setIsAddingOption(true)}
                      variant="secondary"
                      size="sm"
                    >
                      Add Option
                    </Button>
                  </div>

                  {isAddingOption && (
                    <div className={styles.addOptionForm}>
                      <div className={styles.formRow}>
                        <input
                          type="text"
                          value={newOptionValue}
                          onChange={(e) => setNewOptionValue(e.target.value)}
                          placeholder="Value (e.g., 'spanish')"
                          className={styles.input}
                        />
                        <input
                          type="text"
                          value={newOptionLabel}
                          onChange={(e) => setNewOptionLabel(e.target.value)}
                          placeholder="Label (e.g., 'Spanish')"
                          className={styles.input}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <Button onClick={handleAddOption} size="sm">
                          Add
                        </Button>
                        <Button
                          onClick={() => {
                            setIsAddingOption(false);
                            setNewOptionValue('');
                            setNewOptionLabel('');
                          }}
                          variant="secondary"
                          size="sm"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {selectedField.options && selectedField.options.length > 0 ? (
                    <div className={styles.optionsList}>
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                      >
                        <SortableContext
                          items={(selectedField.options || []).map((_opt: any, i: number) => `option-${i}`)}
                          strategy={verticalListSortingStrategy}
                        >
                          {selectedField.options.map((option: any, index: number) => (
                            <SortableOption
                              key={`option-${index}`}
                              option={option}
                              index={index}
                              isEditing={editingOptionIndex === index}
                              onEdit={() => setEditingOptionIndex(index)}
                              onDelete={() => handleDeleteOption(index)}
                              onSave={(value, label) => handleEditOption(index, value, label)}
                              onCancel={() => setEditingOptionIndex(null)}
                            />
                          ))}
                        </SortableContext>
                      </DndContext>
                    </div>
                  ) : (
                    <div className={styles.noOptions}>
                      No options yet. Click &ldquo;Add Option&rdquo; to create one.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </HubPageLayout>
  );
}
