/*
 * Filename: src/app/(admin)/admin/forms/page.tsx
 * Purpose: Admin page for managing dynamic form configurations
 * Created: 2026-01-12
 * Pattern: Follows Listings/Financials pattern with HubPageLayout + HubTabs
 *
 * Allows admins to CRUD form field metadata and dropdown options without code deployment:
 * - Field labels, placeholders, help text
 * - Dropdown option values and labels
 * - Display order and active status
 */
'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
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
import { Edit2, Trash2, Plus, RefreshCw, GripVertical } from 'lucide-react';
import { HubPageLayout, HubHeader, HubTabs } from '@/app/components/hub/layout';
import type { HubTab } from '@/app/components/hub/layout';
import HubSidebar, { SidebarWidget } from '@/app/components/hub/sidebar/HubSidebar';
import HubEmptyState from '@/app/components/hub/content/HubEmptyState';
import Button from '@/app/components/ui/actions/Button';
import filterStyles from '@/app/components/hub/styles/hub-filters.module.css';
import actionStyles from '@/app/components/hub/styles/hub-actions.module.css';
import styles from './page.module.css';
import { ADMIN_TABLE_DEFAULTS } from '@/constants/admin';
import {
  fetchAllFormConfigs,
  fetchFieldConfig,
  updateFieldMeta,
  addFieldOption,
  updateFieldOption,
  deleteFieldOption,
  reorderFieldOptions,
  getFieldNamesForContext,
  type FormConfigRow,
  type FieldConfig,
} from '@/lib/api/formConfig';

// Force dynamic rendering (no SSR/SSG) for admin pages
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

type ContextFilter =
  | 'onboarding.tutor'
  | 'onboarding.agent'
  | 'onboarding.client'
  | 'account.tutor'
  | 'account.agent'
  | 'account.client'
  | 'organisation.tutor'
  | 'organisation.agent'
  | 'organisation.client';

// Sortable Option Item Component
interface SortableOptionProps {
  option: {
    id: string;
    value: string;
    label: string;
    isActive: boolean;
  };
  isEditing: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onSave: (value: string, label: string) => void;
  onCancel: () => void;
}

function SortableOption({ option, index, isEditing, onEdit, onDelete, onSave, onCancel }: {
  option: { id: string; value: string; label: string; isActive: boolean };
  index: number;
  isEditing: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onSave: (value: string, label: string) => void;
  onCancel: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: option.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.optionItem} ${!option.isActive ? styles.optionInactive : ''}`}
    >
      {/* Drag handle */}
      <div {...attributes} {...listeners} className={styles.dragHandle}>
        <GripVertical size={16} />
      </div>

      {isEditing ? (
        <div className={styles.editOptionForm}>
          <input
            type="text"
            defaultValue={option.value}
            placeholder="Value"
            className={styles.input}
            id={`edit-value-${option.id}`}
          />
          <input
            type="text"
            defaultValue={option.label}
            placeholder="Label"
            className={styles.input}
            id={`edit-label-${option.id}`}
          />
          <Button
            variant="primary"
            size="small"
            onClick={() => {
              const valueInput = document.getElementById(`edit-value-${option.id}`) as HTMLInputElement;
              const labelInput = document.getElementById(`edit-label-${option.id}`) as HTMLInputElement;
              onSave(valueInput.value, labelInput.value);
            }}
          >
            Save
          </Button>
          <Button
            variant="secondary"
            size="small"
            onClick={onCancel}
          >
            Cancel
          </Button>
        </div>
      ) : (
        <>
          <div className={styles.optionInfo}>
            <div className={styles.optionValue}>{option.value}</div>
            <div className={styles.optionLabel}>{option.label}</div>
            {!option.isActive && <span className={styles.inactiveBadge}>Inactive</span>}
          </div>
          <div className={styles.optionActions}>
            <button
              onClick={onEdit}
              className={styles.iconButton}
              title="Edit option"
            >
              <Edit2 size={16} />
            </button>
            <button
              onClick={onDelete}
              className={styles.iconButton}
              title="Deactivate option"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function FormsAdminPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const contextFilter = (searchParams?.get('context') as ContextFilter) || 'onboarding.tutor';
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [editingOption, setEditingOption] = useState<string | null>(null);
  const [isAddingOption, setIsAddingOption] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);

  // Form state for adding/editing
  const [newOptionValue, setNewOptionValue] = useState('');
  const [newOptionLabel, setNewOptionLabel] = useState('');
  const [editLabel, setEditLabel] = useState('');
  const [editPlaceholder, setEditPlaceholder] = useState('');
  const [editHelpText, setEditHelpText] = useState('');

  // Configure sensors for drag-and-drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch all form configs
  const {
    data: allConfigs,
    isLoading: isLoadingConfigs,
    isFetching: isFetchingConfigs,
    error: configsError,
  } = useQuery({
    queryKey: ['admin', 'form-configs'],
    queryFn: fetchAllFormConfigs,
    placeholderData: keepPreviousData,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    retry: 2,
  });

  // Fetch field names for current context
  const {
    data: fieldNames,
    isLoading: isLoadingFields,
  } = useQuery({
    queryKey: ['admin', 'field-names', contextFilter],
    queryFn: () => getFieldNamesForContext(contextFilter),
    placeholderData: keepPreviousData,
    staleTime: ADMIN_TABLE_DEFAULTS.STALE_TIME,
  });

  // Fetch selected field config
  const {
    data: selectedFieldConfig,
    isLoading: isLoadingFieldConfig,
  } = useQuery({
    queryKey: ['admin', 'field-config', selectedField, contextFilter],
    queryFn: () => fetchFieldConfig(selectedField!, contextFilter),
    enabled: !!selectedField,
    staleTime: ADMIN_TABLE_DEFAULTS.STALE_TIME,
  });

  // Update field metadata mutation
  const updateMetaMutation = useMutation({
    mutationFn: ({ fieldName, context, updates }: { fieldName: string; context: string; updates: any }) =>
      updateFieldMeta(fieldName, context, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'form-configs'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'field-config'] });
    },
  });

  // Add option mutation
  const addOptionMutation = useMutation({
    mutationFn: ({ fieldName, context, value, label }: { fieldName: string; context: string; value: string; label: string }) =>
      addFieldOption(fieldName, context, value, label),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'form-configs'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'field-config'] });
      setIsAddingOption(false);
      setNewOptionValue('');
      setNewOptionLabel('');
    },
  });

  // Update option mutation
  const updateOptionMutation = useMutation({
    mutationFn: ({ optionId, updates }: { optionId: string; updates: any }) =>
      updateFieldOption(optionId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'form-configs'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'field-config'] });
      setEditingOption(null);
    },
  });

  // Delete option mutation
  const deleteOptionMutation = useMutation({
    mutationFn: (optionId: string) => deleteFieldOption(optionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'form-configs'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'field-config'] });
    },
  });

  // Reorder options mutation
  const reorderMutation = useMutation({
    mutationFn: ({ optionIds, newDisplayOrders }: { optionIds: string[]; newDisplayOrders: number[] }) =>
      reorderFieldOptions(optionIds, newDisplayOrders),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'form-configs'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'field-config'] });
    },
  });

  // Context change handler
  const handleContextChange = (contextId: string) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (contextId === 'onboarding.tutor') {
      params.delete('context');
    } else {
      params.set('context', contextId);
    }
    router.push(`/admin/forms${params.toString() ? `?${params.toString()}` : ''}`);
    setSelectedField(null);
  };

  // Filter field names by search query
  const filteredFieldNames = useMemo(() => {
    if (!fieldNames) return [];
    if (!searchQuery) return fieldNames;
    return fieldNames.filter(name =>
      name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [fieldNames, searchQuery]);

  // Reset editing states when selected field changes
  useEffect(() => {
    setEditingOption(null);
    setIsAddingOption(false);
    setNewOptionValue('');
    setNewOptionLabel('');
  }, [selectedField, contextFilter]);

  // Initialize edit fields when field config is loaded
  useEffect(() => {
    if (selectedFieldConfig) {
      setEditLabel(selectedFieldConfig.label || '');
      setEditPlaceholder(selectedFieldConfig.placeholder || '');
      setEditHelpText(selectedFieldConfig.helpText || '');
    }
  }, [selectedFieldConfig]);

  // Calculate stats
  const stats = useMemo(() => {
    if (!allConfigs) return { totalFields: 0, totalOptions: 0, activeOptions: 0 };

    const configsForContext = allConfigs.filter(c => c.context === contextFilter);
    const uniqueFields = new Set(configsForContext.map(c => c.field_name));
    const options = configsForContext.filter(c => c.config_type === 'option');
    const activeOptions = options.filter(c => c.is_active);

    return {
      totalFields: uniqueFields.size,
      totalOptions: options.length,
      activeOptions: activeOptions.length,
    };
  }, [allConfigs, contextFilter]);

  // Context tabs
  const contextTabs: HubTab[] = [
    { id: 'onboarding.tutor', label: 'Tutor Onboarding', active: contextFilter === 'onboarding.tutor' },
    { id: 'onboarding.agent', label: 'Agent Onboarding', active: contextFilter === 'onboarding.agent' },
    { id: 'onboarding.client', label: 'Client Onboarding', active: contextFilter === 'onboarding.client' },
    { id: 'account.tutor', label: 'Tutor Account', active: contextFilter === 'account.tutor' },
    { id: 'account.agent', label: 'Agent Account', active: contextFilter === 'account.agent' },
    { id: 'account.client', label: 'Client Account', active: contextFilter === 'account.client' },
    { id: 'organisation.tutor', label: 'Tutor Organisation', active: contextFilter === 'organisation.tutor' },
    { id: 'organisation.agent', label: 'Agent Organisation', active: contextFilter === 'organisation.agent' },
    { id: 'organisation.client', label: 'Client Organisation', active: contextFilter === 'organisation.client' },
  ];

  // Handle save field metadata
  const handleSaveFieldMeta = () => {
    if (!selectedField) return;

    updateMetaMutation.mutate({
      fieldName: selectedField,
      context: contextFilter,
      updates: {
        field_label: editLabel,
        field_placeholder: editPlaceholder,
        field_help_text: editHelpText,
      },
    });
  };

  // Handle add option
  const handleAddOption = () => {
    if (!selectedField || !newOptionValue || !newOptionLabel) return;

    addOptionMutation.mutate({
      fieldName: selectedField,
      context: contextFilter,
      value: newOptionValue,
      label: newOptionLabel,
    });
  };

  // Handle update option
  const handleUpdateOption = (optionId: string, value: string, label: string) => {
    updateOptionMutation.mutate({
      optionId,
      updates: { option_value: value, option_label: label },
    });
  };

  // Handle delete option
  const handleDeleteOption = (optionId: string) => {
    if (confirm('Are you sure you want to deactivate this option?')) {
      deleteOptionMutation.mutate(optionId);
    }
  };

  // Handle drag end for reordering options
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || !selectedFieldConfig || active.id === over.id) return;

    const options = selectedFieldConfig.options;
    const oldIndex = options.findIndex(o => o.id === active.id);
    const newIndex = options.findIndex(o => o.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      // Calculate new display orders
      const reorderedOptions = arrayMove(options, oldIndex, newIndex);
      const optionIds = reorderedOptions.map(o => o.id);
      const newDisplayOrders = reorderedOptions.map((_, idx) => idx);

      reorderMutation.mutate({ optionIds, newDisplayOrders });
    }
  };

  return (
    <HubPageLayout
      header={
        <HubHeader
          title="Form Configuration"
          subtitle="Manage dynamic form fields, labels, and dropdown options"
          filters={
            <div className={filterStyles.filtersContainer}>
              <input
                type="search"
                placeholder="Search fields..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={filterStyles.searchInput}
              />
            </div>
          }
          actions={
            <div className={actionStyles.actionsContainer}>
              <Button
                variant="secondary"
                onClick={() => queryClient.invalidateQueries({ queryKey: ['admin', 'form-configs'] })}
                disabled={isFetchingConfigs}
              >
                {isFetchingConfigs ? 'Refreshing...' : 'Refresh'}
              </Button>
            </div>
          }
        />
      }
      tabs={<HubTabs tabs={contextTabs} onTabChange={handleContextChange} />}
      sidebar={
        <HubSidebar>
          <SidebarWidget title="Statistics">
            <div className={styles.statsGrid}>
              <div className={styles.statItem}>
                <div className={styles.statValue}>{stats.totalFields}</div>
                <div className={styles.statLabel}>Total Fields</div>
              </div>
              <div className={styles.statItem}>
                <div className={styles.statValue}>{stats.activeOptions}</div>
                <div className={styles.statLabel}>Active Options</div>
              </div>
            </div>
          </SidebarWidget>

          <SidebarWidget title="Help">
            <div className={styles.helpContent}>
              <p><strong>Select a field</strong> from the list to view and edit its configuration.</p>
              <p><strong>Field Metadata:</strong> Update labels, placeholders, and help text.</p>
              <p><strong>Options:</strong> Add, edit, or deactivate dropdown options.</p>
              <p><strong>Changes are immediate</strong> - no deployment needed!</p>
            </div>
          </SidebarWidget>
        </HubSidebar>
      }
    >
      <div className={styles.contentWrapper}>
        {/* Left: Field list */}
        <div className={styles.fieldList}>
          <div className={styles.fieldListHeader}>
            <h3>Fields ({filteredFieldNames?.length || 0})</h3>
          </div>

          {isLoadingFields ? (
            <div className={styles.loading}>Loading fields...</div>
          ) : filteredFieldNames && filteredFieldNames.length > 0 ? (
            <div className={styles.fieldItems}>
              {filteredFieldNames.map((fieldName) => (
                <button
                  key={fieldName}
                  onClick={() => setSelectedField(fieldName)}
                  className={`${styles.fieldItem} ${selectedField === fieldName ? styles.fieldItemActive : ''}`}
                >
                  <div className={styles.fieldName}>{fieldName}</div>
                </button>
              ))}
            </div>
          ) : (
            <HubEmptyState
              title="No fields found"
              description="No fields match your search query"
              icon={<RefreshCw size={48} strokeWidth={1} opacity={0.3} />}
            />
          )}
        </div>

        {/* Right: Field editor */}
        <div className={styles.fieldEditor}>
          {!selectedField ? (
            <HubEmptyState
              title="Select a field"
              description="Choose a field from the list to view and edit its configuration"
              icon={<Edit2 size={48} strokeWidth={1} opacity={0.3} />}
            />
          ) : isLoadingFieldConfig || (isFetchingFieldConfig && !selectedFieldConfig) ? (
            <div className={styles.loading}>Loading field configuration...</div>
          ) : selectedFieldConfig ? (
            <div className={styles.editorContent}>
              {/* Field name header */}
              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <h3>{selectedField}</h3>
                </div>
              </div>

              {/* Field Metadata Section */}
              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <h3>Field Metadata</h3>
                  <Button
                    variant="primary"
                    size="small"
                    onClick={handleSaveFieldMeta}
                    disabled={updateMetaMutation.isPending}
                  >
                    {updateMetaMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Field Label</label>
                  <input
                    type="text"
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    className={styles.input}
                    placeholder="Enter field label"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Placeholder</label>
                  <input
                    type="text"
                    value={editPlaceholder}
                    onChange={(e) => setEditPlaceholder(e.target.value)}
                    className={styles.input}
                    placeholder="Enter placeholder text"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Help Text</label>
                  <input
                    type="text"
                    value={editHelpText}
                    onChange={(e) => setEditHelpText(e.target.value)}
                    className={styles.input}
                    placeholder="Enter help text (optional)"
                  />
                </div>
              </div>

              {/* Options Section */}
              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <h3>Dropdown Options ({selectedFieldConfig.options.length})</h3>
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() => setIsAddingOption(!isAddingOption)}
                  >
                    {isAddingOption ? 'Cancel' : (
                      <>
                        <Plus size={16} style={{ marginRight: '4px' }} />
                        Add Option
                      </>
                    )}
                  </Button>
                </div>

                {isAddingOption && (
                  <div className={styles.addOptionForm}>
                    <div className={styles.formRow}>
                      <input
                        type="text"
                        value={newOptionValue}
                        onChange={(e) => setNewOptionValue(e.target.value)}
                        placeholder="Option value"
                        className={styles.input}
                      />
                      <input
                        type="text"
                        value={newOptionLabel}
                        onChange={(e) => setNewOptionLabel(e.target.value)}
                        placeholder="Option label"
                        className={styles.input}
                      />
                      <Button
                        variant="primary"
                        size="small"
                        onClick={handleAddOption}
                        disabled={!newOptionValue || !newOptionLabel || addOptionMutation.isPending}
                      >
                        {addOptionMutation.isPending ? 'Adding...' : 'Add'}
                      </Button>
                    </div>
                  </div>
                )}

                {selectedFieldConfig.options.length === 0 ? (
                  <div className={styles.noOptions}>
                    No dropdown options for this field. This is normal for text input fields.
                  </div>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={selectedFieldConfig.options.map(o => o.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className={styles.optionsList}>
                        {selectedFieldConfig.options.map((option, index) => (
                          <SortableOption
                            key={option.id}
                            option={option}
                            index={index}
                            isEditing={editingOption === option.id}
                            onEdit={() => setEditingOption(option.id)}
                            onDelete={() => handleDeleteOption(option.id)}
                            onSave={(value, label) => handleUpdateOption(option.id, value, label)}
                            onCancel={() => setEditingOption(null)}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </div>
            </div>
          ) : (
            <HubEmptyState
              title="Field not found"
              description="This field configuration could not be loaded"
              icon={<RefreshCw size={48} strokeWidth={1} opacity={0.3} />}
            />
          )}
        </div>
      </div>
    </HubPageLayout>
  );
}
