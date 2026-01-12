'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

/**
 * Form field configuration structure
 */
export interface FormFieldConfig {
  label?: string;
  placeholder?: string;
  helpText?: string;
  options?: Array<{ value: string; label: string }>;
}

/**
 * Parameters for useFormConfig hook
 */
export interface UseFormConfigParams {
  fieldName: string;
  context: string;
  fallback?: FormFieldConfig;
}

/**
 * Return type for useFormConfig hook
 */
export interface UseFormConfigReturn {
  config: FormFieldConfig;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Custom hook for fetching dynamic form configuration from the database
 *
 * @param params - Configuration parameters
 * @param params.fieldName - Name of the field (e.g., 'subjects', 'bio', 'keyStages')
 * @param params.context - Context where this config applies (e.g., 'onboarding.tutor', 'account')
 * @param params.fallback - Fallback configuration if database fetch fails or returns no data
 *
 * @returns Object containing config, loading state, and error
 *
 * @example
 * ```tsx
 * const { config, isLoading } = useFormConfig({
 *   fieldName: 'subjects',
 *   context: 'onboarding.tutor',
 *   fallback: {
 *     label: 'Subjects',
 *     placeholder: 'Select subjects',
 *     options: [
 *       { value: 'Mathematics', label: 'Mathematics' },
 *       { value: 'English', label: 'English' }
 *     ]
 *   }
 * });
 *
 * if (isLoading) return <div>Loading...</div>;
 *
 * return (
 *   <Select
 *     label={config.label}
 *     placeholder={config.placeholder}
 *     options={config.options}
 *   />
 * );
 * ```
 */
export function useFormConfig({
  fieldName,
  context,
  fallback = {}
}: UseFormConfigParams): UseFormConfigReturn {
  const [config, setConfig] = useState<FormFieldConfig>(fallback);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const supabase = createClient();

    // Fetch form configuration from database
    const fetchConfig = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from('form_config')
          .select('*')
          .eq('field_name', fieldName)
          .eq('context', context)
          .eq('is_active', true)
          .order('display_order');

        if (fetchError) {
          console.error('[useFormConfig] Database error:', fetchError);
          setError(fetchError as Error);
          setConfig(fallback);
          setIsLoading(false);
          return;
        }

        if (!data || data.length === 0) {
          console.warn(`[useFormConfig] No config found for field "${fieldName}" in context "${context}", using fallback`);
          setConfig(fallback);
          setIsLoading(false);
          return;
        }

        // Separate metadata row from option rows
        const metaRow = data.find(row => row.config_type === 'field_meta');
        const optionRows = data.filter(row => row.config_type === 'option');

        // Build configuration object
        const fetchedConfig: FormFieldConfig = {
          label: metaRow?.field_label || fallback.label,
          placeholder: metaRow?.field_placeholder || fallback.placeholder,
          helpText: metaRow?.field_help_text || fallback.helpText,
          options: optionRows.length > 0
            ? optionRows.map(row => ({
                value: row.option_value!,
                label: row.option_label!
              }))
            : fallback.options || [],
        };

        setConfig(fetchedConfig);
        setIsLoading(false);
      } catch (err) {
        console.error('[useFormConfig] Unexpected error:', err);
        setError(err as Error);
        setConfig(fallback);
        setIsLoading(false);
      }
    };

    fetchConfig();
  }, [fieldName, context, fallback]);

  return { config, isLoading, error };
}

/**
 * Batch hook for fetching multiple form configs at once
 * Useful for forms with many dynamic fields
 *
 * @param configs - Array of config parameters
 * @returns Object containing configs map, loading state, and error
 *
 * @example
 * ```tsx
 * const { configs, isLoading } = useFormConfigs([
 *   { fieldName: 'subjects', context: 'onboarding.tutor', fallback: {...} },
 *   { fieldName: 'keyStages', context: 'onboarding.tutor', fallback: {...} },
 * ]);
 *
 * const subjectsConfig = configs.get('subjects');
 * const keyStagesConfig = configs.get('keyStages');
 * ```
 */
export function useFormConfigs(
  configs: UseFormConfigParams[]
): {
  configs: Map<string, FormFieldConfig>;
  isLoading: boolean;
  error: Error | null;
} {
  const [configsMap, setConfigsMap] = useState<Map<string, FormFieldConfig>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const supabase = createClient();

    const fetchAllConfigs = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch all configs in a single query
        const fieldNames = configs.map(c => c.fieldName);
        const contexts = configs.map(c => c.context);

        const { data, error: fetchError } = await supabase
          .from('form_config')
          .select('*')
          .in('field_name', fieldNames)
          .in('context', contexts)
          .eq('is_active', true)
          .order('display_order');

        if (fetchError) {
          console.error('[useFormConfigs] Database error:', fetchError);
          setError(fetchError as Error);

          // Use all fallbacks
          const fallbackMap = new Map<string, FormFieldConfig>();
          configs.forEach(c => {
            if (c.fallback) {
              fallbackMap.set(c.fieldName, c.fallback);
            }
          });
          setConfigsMap(fallbackMap);
          setIsLoading(false);
          return;
        }

        // Build configs map
        const newConfigsMap = new Map<string, FormFieldConfig>();

        configs.forEach(configParam => {
          const relevantData = data?.filter(
            row => row.field_name === configParam.fieldName && row.context === configParam.context
          ) || [];

          if (relevantData.length === 0) {
            // Use fallback if no data found
            if (configParam.fallback) {
              newConfigsMap.set(configParam.fieldName, configParam.fallback);
            }
            return;
          }

          const metaRow = relevantData.find(row => row.config_type === 'field_meta');
          const optionRows = relevantData.filter(row => row.config_type === 'option');

          newConfigsMap.set(configParam.fieldName, {
            label: metaRow?.field_label || configParam.fallback?.label,
            placeholder: metaRow?.field_placeholder || configParam.fallback?.placeholder,
            helpText: metaRow?.field_help_text || configParam.fallback?.helpText,
            options: optionRows.length > 0
              ? optionRows.map(row => ({
                  value: row.option_value!,
                  label: row.option_label!
                }))
              : configParam.fallback?.options || [],
          });
        });

        setConfigsMap(newConfigsMap);
        setIsLoading(false);
      } catch (err) {
        console.error('[useFormConfigs] Unexpected error:', err);
        setError(err as Error);

        // Use all fallbacks
        const fallbackMap = new Map<string, FormFieldConfig>();
        configs.forEach(c => {
          if (c.fallback) {
            fallbackMap.set(c.fieldName, c.fallback);
          }
        });
        setConfigsMap(fallbackMap);
        setIsLoading(false);
      }
    };

    fetchAllConfigs();
  }, [configs]);

  return { configs: configsMap, isLoading, error };
}
