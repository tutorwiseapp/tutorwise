/**
 * Shared Fields API utilities
 * Handles CRUD operations for shared_fields table
 */

import { createClient } from '@/utils/supabase/client';

export interface SharedField {
  id: string;
  field_name: string;
  field_type: 'text' | 'textarea' | 'select' | 'multiselect' | 'number' | 'date' | 'email' | 'url';
  label: string;
  placeholder?: string;
  help_text?: string;
  options?: Array<{ value: string; label: string }>;
  validation_rules?: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface FormContextField {
  id: string;
  context: string;
  shared_field_id: string;
  custom_label?: string;
  custom_placeholder?: string;
  custom_help_text?: string;
  is_enabled: boolean;
  is_required: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  // Joined data from shared_fields
  field_name?: string;
  field_type?: string;
  label?: string;
  placeholder?: string;
  help_text?: string;
  options?: Array<{ value: string; label: string }>;
}

/**
 * Fetch all shared fields
 */
export async function fetchSharedFields(): Promise<SharedField[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('shared_fields')
    .select('*')
    .eq('is_active', true)
    .order('field_name', { ascending: true });

  if (error) {
    console.error('Error fetching shared fields:', error);
    throw error;
  }

  return data as SharedField[];
}

/**
 * Fetch a single shared field by ID
 */
export async function fetchSharedField(id: string): Promise<SharedField | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('shared_fields')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching shared field:', error);
    throw error;
  }

  return data as SharedField;
}

/**
 * Create a new shared field
 */
export async function createSharedField(
  field: Omit<SharedField, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by'>
): Promise<SharedField> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('shared_fields')
    .insert({
      ...field,
      created_by: user.id,
      updated_by: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating shared field:', error);
    throw error;
  }

  return data as SharedField;
}

/**
 * Update a shared field
 */
export async function updateSharedField(
  id: string,
  updates: Partial<Omit<SharedField, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by'>>
): Promise<SharedField> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('shared_fields')
    .update({
      ...updates,
      updated_by: user.id,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating shared field:', error);
    throw error;
  }

  return data as SharedField;
}

/**
 * Delete a shared field (soft delete by setting is_active = false)
 */
export async function deleteSharedField(id: string): Promise<void> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { error } = await supabase
    .from('shared_fields')
    .update({
      is_active: false,
      updated_by: user.id,
    })
    .eq('id', id);

  if (error) {
    console.error('Error deleting shared field:', error);
    throw error;
  }
}

/**
 * Fetch form context fields for a specific context
 */
export async function fetchFormContextFields(context: string): Promise<FormContextField[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('form_context_fields')
    .select(`
      *,
      shared_fields:shared_field_id (
        field_name,
        field_type,
        label,
        placeholder,
        help_text,
        options
      )
    `)
    .eq('context', context)
    .eq('is_enabled', true)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Error fetching form context fields:', error);
    throw error;
  }

  // Flatten the joined data
  return (data as any[]).map((item) => ({
    ...item,
    field_name: item.shared_fields?.field_name,
    field_type: item.shared_fields?.field_type,
    label: item.shared_fields?.label,
    placeholder: item.shared_fields?.placeholder,
    help_text: item.shared_fields?.help_text,
    options: item.shared_fields?.options,
    shared_fields: undefined, // Remove nested object
  })) as FormContextField[];
}

/**
 * Update form context field configuration
 */
export async function updateFormContextField(
  id: string,
  updates: Partial<Omit<FormContextField, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by'>>
): Promise<FormContextField> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('form_context_fields')
    .update({
      ...updates,
      updated_by: user.id,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating form context field:', error);
    throw error;
  }

  return data as FormContextField;
}

/**
 * Reorder form context fields (bulk update display_order)
 */
export async function reorderFormContextFields(
  context: string,
  fieldOrders: Array<{ id: string; display_order: number }>
): Promise<void> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  // Perform bulk update using individual updates
  // Note: Supabase doesn't support bulk upsert with different values easily,
  // so we'll do multiple updates in parallel
  const updates = fieldOrders.map(({ id, display_order }) =>
    supabase
      .from('form_context_fields')
      .update({
        display_order,
        updated_by: user.id,
      })
      .eq('id', id)
      .eq('context', context)
  );

  const results = await Promise.all(updates);
  const errors = results.filter((r) => r.error);

  if (errors.length > 0) {
    console.error('Error reordering form context fields:', errors);
    throw errors[0].error;
  }
}

/**
 * Get contexts using a specific shared field
 */
export async function getFieldUsage(fieldId: string): Promise<string[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('form_context_fields')
    .select('context')
    .eq('shared_field_id', fieldId)
    .eq('is_enabled', true);

  if (error) {
    console.error('Error fetching field usage:', error);
    throw error;
  }

  return data.map((item) => item.context);
}

/**
 * Fetch fields for a specific context with merged context configuration
 * Returns shared field data + context-specific overrides (custom labels, required, etc.)
 */
export async function fetchFieldsForContext(context: string): Promise<Array<SharedField & {
  contextId: string;
  customLabel?: string;
  customPlaceholder?: string;
  customHelpText?: string;
  isRequired: boolean;
  isEnabled: boolean;
  displayOrder: number;
}>> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('form_context_fields')
    .select(`
      id,
      custom_label,
      custom_placeholder,
      custom_help_text,
      is_required,
      is_enabled,
      display_order,
      shared_fields:shared_field_id (
        id,
        field_name,
        field_type,
        label,
        placeholder,
        help_text,
        options,
        validation_rules,
        is_active,
        created_at,
        updated_at
      )
    `)
    .eq('context', context)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Error fetching fields for context:', error);
    throw error;
  }

  // Flatten and merge the data
  return (data as any[]).map((item) => ({
    ...(item.shared_fields as SharedField),
    contextId: item.id,
    customLabel: item.custom_label,
    customPlaceholder: item.custom_placeholder,
    customHelpText: item.custom_help_text,
    isRequired: item.is_required,
    isEnabled: item.is_enabled,
    displayOrder: item.display_order,
  }));
}

/**
 * Get all available contexts
 */
export async function getAvailableContexts(): Promise<string[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('form_context_fields')
    .select('context')
    .order('context', { ascending: true });

  if (error) {
    console.error('Error fetching contexts:', error);
    throw error;
  }

  // Return unique contexts
  return Array.from(new Set(data.map((item) => item.context)));
}
