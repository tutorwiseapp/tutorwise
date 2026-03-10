import { BackgroundVariant } from 'reactflow';

/** Shared fitView options — used by all canvases for initial load and fit-view button */
export const FIT_VIEW_OPTIONS = {
  padding: 0.3,
  maxZoom: 0.8,
} as const;

/** Shared ReactFlow Background props */
export const BACKGROUND_CONFIG = {
  color: '#e5e7eb',
  gap: 16,
  size: 1,
  variant: BackgroundVariant.Dots,
} as const;

/** Default edge style for read-only canvases */
export const DEFAULT_EDGE_STYLE = {
  stroke: '#9ca3af',
  strokeWidth: 2,
} as const;
