/*
 * Filename: src/app/(admin)/admin/forms/components/FormFieldEditor.tsx
 * Purpose: Shared component for editing form field configurations
 * Created: 2026-01-12
 * Pattern: Reusable across onboarding/account/organisation pages
 */
'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
import { Edit2, Trash2, Plus, GripVertical } from 'lucide-react';
import HubEmptyState from '@/app/components/hub/content/HubEmptyState';
import Button from '@/app/components/ui/actions/Button';
import styles from '../page.module.css';
import {
  fetchFieldConfig,
  updateFieldMeta,
  addFieldOption,
  updateFieldOption,
  deleteFieldOption,
  reorderFieldOptions,
  getFieldNamesForContext,
  type FieldConfig,
} from '@/lib/api/formConfig';
import { ADMIN_TABLE_DEFAULTS } from '@/constants/admin';

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

function SortableOption({ option, isEditing, onEdit, onDelete, onSave, onCancel }: SortableOptionProps) {
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
            size="sm"
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
            size="sm"
            onClick={onCancel}
          >
            Cancel
          </Button>
        </div>
      ) : (
        <>
          <div className={styles.optionInfo}>
            <span className={styles.optionValue}>{option.value}</span>
            <span className={styles.optionLabel}>{option.label}</span>
            {!option.isActive && (
              <span className={styles.inactiveBadge}>Inactive</span>
            )}
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

interface FormFieldEditorProps {
  context: string;
  onFieldsCountChange?: (count: number) => void;
  onOptionsCountChange?: (count: number) => void;
}

export default function FormFieldEditor({ context, onFieldsCountChange, onOptionsCountChange }: FormFieldEditorProps) {
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [editingOption, setEditingOption] = useState<string | null>(null);
  const [isAddingOption, setIsAddingOption] = useState(false);

  // Form state
  const [newOptionValue, setNewOptionValue] = useState('');
  const [newOptionLabel, setNewOptionLabel] = useState('');
  const [editLabel, setEditLabel] = useState('');
  const [editPlaceholder, setEditPlaceholder] = useState('');
  const [editHelpText, setEditHelpText] = useState('');

  // Configure sensors for drag-and-drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch field names for current context
  const {
    data: fieldNames,
    isLoading: isLoadingFields,
  } = useQuery({
    queryKey: ['admin', 'field-names', context],
    queryFn: () => getFieldNamesForContext(context),
    placeholderData: keepPreviousData,
    staleTime: ADMIN_TABLE_DEFAULTS.STALE_TIME,
  });

  // Fetch selected field config
  const {
    data: selectedFieldConfig,
    isLoading: isLoadingFieldConfig,
  } = useQuery({
    queryKey: ['admin', 'field-config', selectedField, context],
    queryFn: () => fetchFieldConfig(selectedField!, context),
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
    mutationFn: ({ fieldName, context, optionValue, optionLabel }: { fieldName: string; context: string; optionValue: string; optionLabel: string }) =>
      addFieldOption(fieldName, context, optionValue, optionLabel),
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
    mutationFn: ({ id, value, label }: { id: string; value: string; label: string }) =>
      updateFieldOption(id, { option_value: value, option_label: label }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'form-configs'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'field-config'] });
      setEditingOption(null);
    },
  });

  // Delete option mutation
  const deleteOptionMutation = useMutation({
    mutationFn: (id: string) => deleteFieldOption(id),
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
      queryClient.invalidateQueries({ queryKey: ['admin', 'field-config'] });
    },
  });

  // Reset editing states when field or context changes
  useEffect(() => {
    setEditingOption(null);
    setIsAddingOption(false);
    setNewOptionValue('');
    setNewOptionLabel('');
  }, [selectedField, context]);

  // Update field metadata when selection changes
  useEffect(() => {
    if (selectedFieldConfig) {
      setEditLabel(selectedFieldConfig.label || '');
      setEditPlaceholder(selectedFieldConfig.placeholder || '');
      setEditHelpText(selectedFieldConfig.helpText || '');
    }
  }, [selectedFieldConfig]);

  // Notify parent of counts
  useEffect(() => {
    if (onFieldsCountChange && fieldNames) {
      onFieldsCountChange(fieldNames.length);
    }
  }, [fieldNames, onFieldsCountChange]);

  useEffect(() => {
    if (onOptionsCountChange && selectedFieldConfig) {
      const activeOptions = selectedFieldConfig.options.filter(opt => opt.isActive);
      onOptionsCountChange(activeOptions.length);
    }
  }, [selectedFieldConfig, onOptionsCountChange]);

  // Filter field names
  const filteredFieldNames = useMemo(() => {
    if (!fieldNames) return [];
    if (!searchQuery) return fieldNames;
    return fieldNames.filter(name =>
      name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [fieldNames, searchQuery]);

  // Handle save field metadata
  const handleSaveFieldMeta = () => {
    if (!selectedField) return;

    updateMetaMutation.mutate({
      fieldName: selectedField,
      context,
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
      context,
      optionValue: newOptionValue,
      optionLabel: newOptionLabel,
    });
  };

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || !selectedFieldConfig || active.id === over.id) return;

    const options = selectedFieldConfig.options;
    const oldIndex = options.findIndex(opt => opt.id === active.id);
    const newIndex = options.findIndex(opt => opt.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const newOptions = arrayMove(options, oldIndex, newIndex);
    const optionIds = newOptions.map(opt => opt.id);
    const newDisplayOrders = newOptions.map((_, index) => index);

    reorderMutation.mutate({
      optionIds,
      newDisplayOrders,
    });
  };

  return (
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
                <span className={styles.fieldName}>{fieldName}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className={styles.loading}>No fields found</div>
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
        ) : isLoadingFieldConfig ? (
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
                  size="sm"
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
            {selectedFieldConfig.options.length > 0 && (
              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <h3>Dropdown Options</h3>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsAddingOption(!isAddingOption)}
                  >
                    <Plus size={16} />
                    Add Option
                  </Button>
                </div>

                {/* Add Option Form */}
                {isAddingOption && (
                  <div className={styles.addOptionForm}>
                    <div className={styles.formRow}>
                      <input
                        type="text"
                        value={newOptionValue}
                        onChange={(e) => setNewOptionValue(e.target.value)}
                        placeholder="Option Value"
                        className={styles.input}
                      />
                      <input
                        type="text"
                        value={newOptionLabel}
                        onChange={(e) => setNewOptionLabel(e.target.value)}
                        placeholder="Option Label"
                        className={styles.input}
                      />
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleAddOption}
                        disabled={!newOptionValue || !newOptionLabel || addOptionMutation.isPending}
                      >
                        {addOptionMutation.isPending ? 'Adding...' : 'Add'}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Options List */}
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={selectedFieldConfig.options.map(opt => opt.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className={styles.optionsList}>
                      {selectedFieldConfig.options.map((option) => (
                        <SortableOption
                          key={option.id}
                          option={option}
                          isEditing={editingOption === option.id}
                          onEdit={() => setEditingOption(option.id)}
                          onDelete={() => {
                            if (confirm(`Deactivate "${option.label}"?`)) {
                              deleteOptionMutation.mutate(option.id);
                            }
                          }}
                          onSave={(value, label) => {
                            updateOptionMutation.mutate({
                              id: option.id,
                              value,
                              label,
                            });
                          }}
                          onCancel={() => setEditingOption(null)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            )}
          </div>
        ) : (
          <HubEmptyState
            title="No configuration found"
            description="This field does not have any configuration"
            icon={<Edit2 size={48} strokeWidth={1} opacity={0.3} />}
          />
        )}
      </div>
    </div>
  );
}
