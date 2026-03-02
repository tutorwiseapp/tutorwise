/**
 * Status Enum Scanner
 *
 * Scans TypeScript type files for status enum types and converts them to workflow graphs.
 * Structured scanner — produces direct-mapped graphs from union type values.
 * Where explicit VALID_TRANSITIONS maps exist, those are used for edges.
 */

import fs from 'fs/promises';
import path from 'path';
import type { ProcessNode, ProcessEdge } from '@/components/feature/process-studio/types';
import type { SourceScanner, RawDiscovery, ConfidenceLevel } from '../types';

const TYPES_DIR = path.join(process.cwd(), 'src/types');

// Known status types and their business categories
const STATUS_CATEGORIES: Record<string, string> = {
  BookingStatus: 'bookings',
  PaymentStatus: 'financials',
  SchedulingStatus: 'bookings',
  TransactionStatus: 'financials',
  ReferralStatus: 'referrals',
  RelationshipStatus: 'bookings',
  CalendarConnectionStatus: 'bookings',
  CalendarEventSyncStatus: 'bookings',
  BookingReviewStatus: 'reviews',
  NoShowStatus: 'bookings',
  ReminderStatus: 'bookings',
  SeriesStatus: 'bookings',
  SubscriptionStatus: 'financials',
  TruelayerPaymentStatus: 'financials',
};

// Known explicit transition maps (hard-coded from codebase analysis)
const KNOWN_TRANSITIONS: Record<string, Record<string, string[]>> = {
  BookingStatus: {
    Pending: ['Confirmed', 'Cancelled', 'Declined'],
    Confirmed: ['Completed', 'Cancelled'],
    Completed: [],
    Cancelled: [],
    Declined: [],
  },
};

interface StatusTypeInfo {
  name: string;
  values: string[];
  filePath: string;
  transitions?: Record<string, string[]>;
}

/**
 * Parse status type union values from a TypeScript source line.
 * e.g. "export type BookingStatus = 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';"
 */
function parseUnionValues(content: string, typeName: string): string[] {
  // Match multi-line union types
  const pattern = new RegExp(
    `export\\s+type\\s+${typeName}\\s*=\\s*([^;]+);`,
    's'
  );
  const match = content.match(pattern);
  if (!match) return [];

  const unionStr = match[1];
  const values: string[] = [];
  const valuePattern = /'([^']+)'/g;
  let m: RegExpExecArray | null;
  while ((m = valuePattern.exec(unionStr)) !== null) {
    values.push(m[1]);
  }
  return values;
}

/**
 * Build a workflow graph from status values and optional transitions.
 */
function buildStatusGraph(
  info: StatusTypeInfo
): { nodes: ProcessNode[]; edges: ProcessEdge[]; previewSteps: string[] } {
  const nodes: ProcessNode[] = [];
  const edges: ProcessEdge[] = [];
  let y = 50;

  // Trigger
  const triggerId = 'trigger-1';
  nodes.push({
    id: triggerId,
    type: 'processStep',
    position: { x: 300, y },
    data: {
      label: `${info.name.replace('Status', '')} Created`,
      type: 'trigger',
      description: `A new ${info.name.replace('Status', '').toLowerCase()} record is created`,
      editable: false,
    },
  });
  y += 120;

  // Create a node for each status value
  const statusNodeIds: Record<string, string> = {};
  const terminalStatuses = new Set<string>();

  if (info.transitions) {
    // Determine terminal statuses (no outgoing transitions)
    for (const [status, targets] of Object.entries(info.transitions)) {
      if (targets.length === 0) terminalStatuses.add(status);
    }
  }

  for (let i = 0; i < info.values.length; i++) {
    const status = info.values[i];
    const nodeId = `status-${i + 1}`;
    statusNodeIds[status] = nodeId;

    const isTerminal = terminalStatuses.has(status);
    const isFirst = i === 0;

    let nodeType: 'action' | 'condition' | 'end' = 'action';
    if (isTerminal && info.transitions) nodeType = 'end';

    // If this status has multiple outgoing transitions, make it a condition
    if (info.transitions && (info.transitions[status]?.length ?? 0) > 1) {
      nodeType = 'condition';
    }

    nodes.push({
      id: nodeId,
      type: 'processStep',
      position: { x: 300, y },
      data: {
        label: status,
        type: nodeType === 'end' ? 'end' : nodeType,
        description: `${info.name.replace('Status', '')} is in "${status}" state`,
        editable: nodeType !== 'end',
      },
    });

    // If no explicit transitions, connect linearly
    if (!info.transitions && i === 0) {
      edges.push({
        id: `e-${triggerId}-${nodeId}`,
        source: triggerId,
        target: nodeId,
        animated: true,
      });
    } else if (!info.transitions && i > 0) {
      const prevId = `status-${i}`;
      edges.push({
        id: `e-${prevId}-${nodeId}`,
        source: prevId,
        target: nodeId,
        animated: true,
      });
    }

    // Connect trigger to first status if using transitions
    if (info.transitions && isFirst) {
      edges.push({
        id: `e-${triggerId}-${nodeId}`,
        source: triggerId,
        target: nodeId,
        animated: true,
      });
    }

    y += 120;
  }

  // Add edges from explicit transitions
  if (info.transitions) {
    for (const [from, targets] of Object.entries(info.transitions)) {
      const fromId = statusNodeIds[from];
      if (!fromId) continue;
      for (const to of targets) {
        const toId = statusNodeIds[to];
        if (!toId) continue;
        edges.push({
          id: `e-${fromId}-${toId}`,
          source: fromId,
          target: toId,
          animated: true,
        });
      }
    }
  }

  // If no terminal statuses found, add an end node
  if (terminalStatuses.size === 0 || !info.transitions) {
    const endId = 'end-1';
    const lastStatusId = `status-${info.values.length}`;
    nodes.push({
      id: endId,
      type: 'processStep',
      position: { x: 300, y },
      data: {
        label: 'Process End',
        type: 'end',
        description: `${info.name.replace('Status', '')} lifecycle complete`,
        editable: false,
      },
    });
    if (!info.transitions) {
      edges.push({
        id: `e-${lastStatusId}-${endId}`,
        source: lastStatusId,
        target: endId,
        animated: true,
      });
    }
  }

  const previewSteps = info.values.slice(0, 5);

  return { nodes, edges, previewSteps };
}

export class StatusEnumScanner implements SourceScanner {
  sourceType = 'status_enum' as const;
  isStructured = true;

  async scan(): Promise<RawDiscovery[]> {
    const results: RawDiscovery[] = [];

    // Scan all .ts files in the types directory
    const typesFiles = ['index.ts', 'reviews.ts'];

    for (const fileName of typesFiles) {
      const filePath = path.join(TYPES_DIR, fileName);
      let content: string;
      try {
        content = await fs.readFile(filePath, 'utf-8');
      } catch {
        continue;
      }

      // Find all Status type exports
      const statusPattern = /export\s+type\s+(\w+Status)\s*=/g;
      let match: RegExpExecArray | null;

      while ((match = statusPattern.exec(content)) !== null) {
        const typeName = match[1];
        const values = parseUnionValues(content, typeName);
        if (values.length < 2) continue;

        const info: StatusTypeInfo = {
          name: typeName,
          values,
          filePath: `apps/web/src/types/${fileName}`,
          transitions: KNOWN_TRANSITIONS[typeName],
        };

        const { nodes, edges, previewSteps } = buildStatusGraph(info);
        const hasTransitions = !!info.transitions;

        const confidence: ConfidenceLevel = hasTransitions ? 'high' : 'high';
        const confidenceReason = hasTransitions
          ? 'Directly mapped from explicit VALID_TRANSITIONS map'
          : 'Directly mapped from typed union values — linear sequence';

        const humanName = typeName
          .replace('Status', ' Lifecycle')
          .replace(/([a-z])([A-Z])/g, '$1 $2');

        results.push({
          name: humanName,
          description: `State machine derived from ${typeName}: ${values.join(' → ')}`,
          sourceType: this.sourceType,
          sourceIdentifier: typeName,
          sourceFilePaths: [info.filePath],
          category: STATUS_CATEGORIES[typeName] || 'other',
          rawContent: `export type ${typeName} = ${values.map((v) => `'${v}'`).join(' | ')};`,
          confidence,
          confidenceReason,
          stepCount: nodes.length,
          stepNames: values,
          nodes,
          edges,
          previewSteps,
        });
      }
    }

    return results;
  }
}
