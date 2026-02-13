/**
 * Project Paths Configuration
 *
 * Central configuration for CAS to access TutorWise project documentation,
 * design systems, and context files.
 *
 * All paths are relative to the project root (tutorwise/)
 */

import * as path from 'path';

// Navigate up from cas/packages/core/src/config to project root
const PROJECT_ROOT = path.resolve(__dirname, '../../../../..');

/**
 * Path configuration for TutorWise project context files
 */
export const ProjectPaths = {
  // Root directories
  projectRoot: PROJECT_ROOT,
  casRoot: path.join(PROJECT_ROOT, 'cas'),
  aiContextRoot: path.join(PROJECT_ROOT, '.ai'),

  // Context files in .ai/ folder
  contextFiles: {
    architecture: path.join(PROJECT_ROOT, '.ai/1-ARCHITECTURE.md'),
    techStack: path.join(PROJECT_ROOT, '.ai/2-TECH-STACK.md'),
    systemNavigation: path.join(PROJECT_ROOT, '.ai/3-SYSTEM-NAVIGATION.md'),
    patterns: path.join(PROJECT_ROOT, '.ai/4-PATTERNS.md'),
    contextMap: path.join(PROJECT_ROOT, '.ai/5-CONTEXT-MAP.md'),
    designSystem: path.join(PROJECT_ROOT, '.ai/6-DESIGN-SYSTEM.md'),
    devGuidelines: path.join(PROJECT_ROOT, '.ai/7-DEV-GUIDELINES.md'),
    userJourneyMap: path.join(PROJECT_ROOT, '.ai/8-USER-JOURNEY-MAP.md'),
    sharedFields: path.join(PROJECT_ROOT, '.ai/SHARED-FIELDS.md'),
  },

  // Application directories
  webApp: {
    root: path.join(PROJECT_ROOT, 'apps/web'),
    src: path.join(PROJECT_ROOT, 'apps/web/src'),
    components: path.join(PROJECT_ROOT, 'apps/web/src/components'),
    pages: path.join(PROJECT_ROOT, 'apps/web/src/app'),
    lib: path.join(PROJECT_ROOT, 'apps/web/src/lib'),
    styles: path.join(PROJECT_ROOT, 'apps/web/src/styles'),
  },

  // CAS directories
  cas: {
    agents: path.join(PROJECT_ROOT, 'cas/agents'),
    packages: path.join(PROJECT_ROOT, 'cas/packages'),
    docs: path.join(PROJECT_ROOT, 'cas/docs'),
    process: path.join(PROJECT_ROOT, 'cas/process'),
  },

  // Database and migrations
  database: {
    migrations: path.join(PROJECT_ROOT, 'supabase/migrations'),
    schema: path.join(PROJECT_ROOT, 'supabase/schema.sql'),
  },

  // Documentation
  docs: {
    root: path.join(PROJECT_ROOT, 'docs'),
    reference: path.join(PROJECT_ROOT, 'docs/reference'),
    guides: path.join(PROJECT_ROOT, 'docs/guides'),
    feature: path.join(PROJECT_ROOT, 'docs/feature'),
  },
};

/**
 * Get a context file by key
 */
export function getContextFile(key: keyof typeof ProjectPaths.contextFiles): string {
  return ProjectPaths.contextFiles[key];
}

/**
 * Get the design system documentation path
 * Uses .ai/6-DESIGN-SYSTEM.md for TutorWise design patterns
 */
export function getDesignSystemPath(): string {
  return ProjectPaths.contextFiles.designSystem;
}

/**
 * Get all AI context files as an array
 */
export function getAllContextFiles(): string[] {
  return Object.values(ProjectPaths.contextFiles);
}

/**
 * Resolve a path relative to the project root
 */
export function resolveFromRoot(...segments: string[]): string {
  return path.join(PROJECT_ROOT, ...segments);
}

/**
 * Get the feature documentation directory
 * Contains TutorWise platform feature documentation
 */
export function getFeatureDocsPath(): string {
  return ProjectPaths.docs.feature;
}

/**
 * Get a specific feature doc file path
 */
export function getFeatureDocPath(filename: string): string {
  return path.join(ProjectPaths.docs.feature, filename);
}

export default ProjectPaths;
