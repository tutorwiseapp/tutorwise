/**
 * Filename: organisationSettingsConfig.ts
 * Purpose: Shared configuration for Organisation Settings pages
 * Created: 2026-01-08
 */

export const ORGANISATION_SETTINGS_TABS = [
  { id: 'billing', label: 'Billing & Subscription' },
  { id: 'team-permissions', label: 'Team Permissions' },
  { id: 'integrations', label: 'Integrations' },
] as const;

export type OrganisationSettingsTabId = typeof ORGANISATION_SETTINGS_TABS[number]['id'];
