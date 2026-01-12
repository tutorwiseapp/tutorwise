/**
 * Filename: apps/web/src/lib/api/formConfig.ts
 * Purpose: API functions for managing form_config table (CRUD operations)
 * Created: 2026-01-12
 *
 * Provides functions for admin to manage dynamic form configurations:
 * - Field metadata (labels, placeholders, help text)
 * - Field options (dropdown values)
 * - Display order and active status
 */

import { createClient } from '@/utils/supabase/client';

export interface FormConfigRow {
  id: string;
  config_type: 'field_meta' | 'option';
  field_name: string;
  context: string;
  field_label?: string;
  field_placeholder?: string;
  field_help_text?: string;
  option_value?: string;
  option_label?: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FieldConfig {
  fieldName: string;
  context: string;
  label?: string;
  placeholder?: string;
  helpText?: string;
  options: Array<{
    id: string;
    value: string;
    label: string;
    displayOrder: number;
    isActive: boolean;
  }>;
}

/**
 * Fetch all form configurations grouped by context and field
 */
export async function fetchAllFormConfigs(): Promise<FormConfigRow[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('form_config')
    .select('*')
    .order('context')
    .order('field_name')
    .order('display_order');

  if (error) {
    console.error('[fetchAllFormConfigs] Error:', error);
    throw error;
  }

  return data || [];
}

/**
 * Fetch form configuration for a specific field and context
 */
export async function fetchFieldConfig(
  fieldName: string,
  context: string
): Promise<FieldConfig> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('form_config')
    .select('*')
    .eq('field_name', fieldName)
    .eq('context', context)
    .order('display_order');

  if (error) {
    console.error('[fetchFieldConfig] Error:', error);
    throw error;
  }

  if (!data || data.length === 0) {
    throw new Error(`No config found for field "${fieldName}" in context "${context}"`);
  }

  const metaRow = data.find(row => row.config_type === 'field_meta');
  const optionRows = data.filter(row => row.config_type === 'option');

  return {
    fieldName,
    context,
    label: metaRow?.field_label,
    placeholder: metaRow?.field_placeholder,
    helpText: metaRow?.field_help_text,
    options: optionRows.map(row => ({
      id: row.id,
      value: row.option_value!,
      label: row.option_label!,
      displayOrder: row.display_order,
      isActive: row.is_active,
    })),
  };
}

/**
 * Update field metadata (label, placeholder, help text)
 */
export async function updateFieldMeta(
  fieldName: string,
  context: string,
  updates: {
    field_label?: string;
    field_placeholder?: string;
    field_help_text?: string;
  }
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('form_config')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('field_name', fieldName)
    .eq('context', context)
    .eq('config_type', 'field_meta');

  if (error) {
    console.error('[updateFieldMeta] Error:', error);
    throw error;
  }
}

/**
 * Add a new option to a field
 */
export async function addFieldOption(
  fieldName: string,
  context: string,
  optionValue: string,
  optionLabel: string,
  displayOrder?: number
): Promise<string> {
  const supabase = createClient();

  // If no display order provided, get the max and add 1
  if (displayOrder === undefined) {
    const { data: existingOptions } = await supabase
      .from('form_config')
      .select('display_order')
      .eq('field_name', fieldName)
      .eq('context', context)
      .eq('config_type', 'option')
      .order('display_order', { ascending: false })
      .limit(1);

    displayOrder = existingOptions && existingOptions.length > 0
      ? existingOptions[0].display_order + 1
      : 0;
  }

  const { data, error } = await supabase
    .from('form_config')
    .insert({
      config_type: 'option',
      field_name: fieldName,
      context,
      option_value: optionValue,
      option_label: optionLabel,
      display_order: displayOrder,
      is_active: true,
    })
    .select('id')
    .single();

  if (error) {
    console.error('[addFieldOption] Error:', error);
    throw error;
  }

  return data.id;
}

/**
 * Update an existing option
 */
export async function updateFieldOption(
  optionId: string,
  updates: {
    option_value?: string;
    option_label?: string;
    display_order?: number;
    is_active?: boolean;
  }
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('form_config')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', optionId);

  if (error) {
    console.error('[updateFieldOption] Error:', error);
    throw error;
  }
}

/**
 * Delete an option (soft delete by setting is_active to false)
 */
export async function deleteFieldOption(optionId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('form_config')
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', optionId);

  if (error) {
    console.error('[deleteFieldOption] Error:', error);
    throw error;
  }
}

/**
 * Hard delete an option (permanent removal)
 */
export async function hardDeleteFieldOption(optionId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('form_config')
    .delete()
    .eq('id', optionId);

  if (error) {
    console.error('[hardDeleteFieldOption] Error:', error);
    throw error;
  }
}

/**
 * Reorder options by updating display_order values
 */
export async function reorderFieldOptions(
  optionIds: string[],
  newDisplayOrders: number[]
): Promise<void> {
  if (optionIds.length !== newDisplayOrders.length) {
    throw new Error('optionIds and newDisplayOrders must have same length');
  }

  const supabase = createClient();

  // Update each option's display_order
  const promises = optionIds.map((id, index) =>
    supabase
      .from('form_config')
      .update({
        display_order: newDisplayOrders[index],
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
  );

  const results = await Promise.all(promises);

  const errors = results.filter(r => r.error);
  if (errors.length > 0) {
    console.error('[reorderFieldOptions] Errors:', errors);
    throw new Error('Failed to reorder some options');
  }
}

/**
 * Get unique contexts from form_config table
 */
export async function getAvailableContexts(): Promise<string[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('form_config')
    .select('context')
    .order('context');

  if (error) {
    console.error('[getAvailableContexts] Error:', error);
    throw error;
  }

  // Get unique contexts
  const uniqueContexts = Array.from(new Set(data.map(row => row.context)));
  return uniqueContexts;
}

/**
 * Get unique field names for a given context
 */
export async function getFieldNamesForContext(context: string): Promise<string[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('form_config')
    .select('field_name')
    .eq('context', context)
    .order('field_name');

  if (error) {
    console.error('[getFieldNamesForContext] Error:', error);
    throw error;
  }

  // Get unique field names
  const uniqueFieldNames = Array.from(new Set(data.map(row => row.field_name)));
  return uniqueFieldNames;
}
