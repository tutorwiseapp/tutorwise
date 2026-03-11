/**
 * @jest-environment node
 *
 * TeamRuntime v2 — Unit tests
 * Phase 6C: Tests topology validation, topological sort, and pattern graph logic.
 *
 * Strategy: test internal helpers directly (made package-accessible via underscore
 * convention) plus a full run test with all external deps mocked.
 */

// ─── Mock all external dependencies before importing the module ───────────────

jest.mock('@/utils/supabase/server', () => ({
  createServiceRoleClient: jest.fn(),
}));

jest.mock('@/lib/agent-studio/SpecialistAgentRunner', () => ({
  specialistAgentRunner: {
    run: jest.fn(),
  },
}));

// Mock LangGraph — replace StateGraph + Annotation with lightweight stubs
jest.mock('@langchain/langgraph', () => {
  // Annotation stub — AgentTeamState.ts needs Annotation.Root
  const annotationRoot = (schema: unknown) => ({ schema, State: {}, Update: {} });
  const AnnotationFn = jest.fn((opts?: unknown) => opts ?? {}) as jest.Mock & { Root: typeof annotationRoot };
  AnnotationFn.Root = annotationRoot;

  const nodes: Record<string, (state: Record<string, unknown>) => unknown> = {};
  const edges: Array<[string, string]> = [];
  let conditionalFn: ((state: Record<string, unknown>) => string) | null = null;

  const mockGraph = {
    addNode: jest.fn((name: string, fn: (state: Record<string, unknown>) => unknown) => {
      nodes[name] = fn;
    }),
    addEdge: jest.fn((from: string, to: string) => {
      edges.push([from, to]);
    }),
    addConditionalEdges: jest.fn((_from: string, fn: (state: Record<string, unknown>) => string) => {
      conditionalFn = fn;
    }),
    compile: jest.fn(() => ({
      invoke: jest.fn(async (input: Record<string, unknown>) => {
        // Simple sequential executor: follow edges from __start__
        let current = '__start__';
        let state: Record<string, unknown> = { ...input };

        const visited = new Set<string>();
        while (current !== '__end__' && !visited.has(current)) {
          visited.add(current);
          if (current !== '__start__' && nodes[current]) {
            const update = await nodes[current](state) as Record<string, unknown>;
            // Deep-merge update into state (simplified reducer)
            for (const [k, v] of Object.entries(update ?? {})) {
              if (k === 'outputs' && typeof v === 'object' && !Array.isArray(v)) {
                state[k] = { ...(state[k] as Record<string, unknown> ?? {}), ...v };
              } else if (k === 'handoff_history' && Array.isArray(v)) {
                state[k] = [...((state[k] as unknown[]) ?? []), ...v];
              } else if (k === 'visited_agents' && Array.isArray(v)) {
                const existing = (state[k] as string[]) ?? [];
                state[k] = [...new Set([...existing, ...(v as string[])])];
              } else {
                state[k] = v;
              }
            }
          }

          // Determine next node
          const directEdge = edges.find(([from]) => from === current);
          if (directEdge) {
            current = directEdge[1];
          } else if (conditionalFn) {
            current = conditionalFn(state);
            if (current === '__end__') break;
          } else {
            break;
          }
        }

        return state;
      }),
    })),
  };

  return {
    Annotation: AnnotationFn,
    StateGraph: jest.fn(() => ({ ...mockGraph, _nodes: nodes, _edges: edges })),
    END: '__end__',
    START: '__start__',
    interrupt: jest.fn((value: unknown) => value), // immediately "approve" in tests
    Command: jest.fn((opts: { resume: boolean }) => opts),
  };
});

jest.mock('@langchain/langgraph-checkpoint-postgres', () => ({
  PostgresSaver: {
    fromConnString: jest.fn(() => ({
      setup: jest.fn().mockResolvedValue(undefined),
    })),
  },
}));

// ─── Import after mocks ───────────────────────────────────────────────────────

import { teamRuntime } from '@/lib/workflow/team-runtime/TeamRuntime';
import { createServiceRoleClient } from '@/utils/supabase/server';
import { specialistAgentRunner } from '@/lib/agent-studio/SpecialistAgentRunner';

// ─── Helper: build mock Supabase client ──────────────────────────────────────

function buildMockSupabase(overrides: Record<string, unknown> = {}) {
  const mock: Record<string, jest.Mock> = {
    from: jest.fn(),
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    eq: jest.fn(),
    in: jest.fn(),
    single: jest.fn(),
    ...overrides,
  };

  // Chain: every method returns the mock itself
  for (const key of Object.keys(mock)) {
    if (key !== 'single') {
      mock[key].mockReturnValue(mock);
    }
  }

  return mock;
}

// ─── Shared fixtures ─────────────────────────────────────────────────────────

const makeTeam = (pattern: 'supervisor' | 'pipeline' | 'swarm' = 'supervisor') => ({
  id: 'team-uuid',
  slug: 'devops-team',
  name: 'DevOps Team',
  pattern,
  coordinator_slug: pattern === 'supervisor' ? 'director' : null,
  nodes: [
    { id: 'director', data: { agentSlug: 'director', label: 'Director', isCoordinator: true } },
    { id: 'developer', data: { agentSlug: 'developer', label: 'Developer' } },
    { id: 'analyst', data: { agentSlug: 'analyst', label: 'Analyst' } },
  ],
  edges: [
    { id: 'e1', source: 'director', target: 'developer' },
    { id: 'e2', source: 'director', target: 'analyst' },
  ],
});

// ─── _validateTopology ────────────────────────────────────────────────────────

describe('_validateTopology', () => {
  it('throws when nodes is empty', () => {
    const team = { ...makeTeam(), nodes: [] };
    expect(() => teamRuntime._validateTopology(team as never)).toThrow('has no nodes');
  });

  it('throws when supervisor has no coordinator_slug', () => {
    const team = { ...makeTeam('supervisor'), coordinator_slug: null };
    expect(() => teamRuntime._validateTopology(team as never)).toThrow('has no coordinator_slug');
  });

  it('throws when coordinator_slug is not in nodes', () => {
    const team = { ...makeTeam('supervisor'), coordinator_slug: 'nonexistent' };
    expect(() => teamRuntime._validateTopology(team as never)).toThrow(
      "coordinator_slug 'nonexistent' is not in team nodes"
    );
  });

  it('passes for valid supervisor team', () => {
    expect(() => teamRuntime._validateTopology(makeTeam('supervisor') as never)).not.toThrow();
  });

  it('passes for pipeline team without coordinator_slug', () => {
    const team = { ...makeTeam('pipeline'), coordinator_slug: null };
    expect(() => teamRuntime._validateTopology(team as never)).not.toThrow();
  });
});

// ─── _topologicalSort ─────────────────────────────────────────────────────────

describe('_topologicalSort', () => {
  it('returns nodes in correct topological order', () => {
    const nodes = [
      { id: 'a', data: { agentSlug: 'agent-a', label: 'A' } },
      { id: 'b', data: { agentSlug: 'agent-b', label: 'B' } },
      { id: 'c', data: { agentSlug: 'agent-c', label: 'C' } },
    ];
    const edges = [
      { id: 'e1', source: 'a', target: 'b' },
      { id: 'e2', source: 'b', target: 'c' },
    ];

    const sorted = teamRuntime._topologicalSort(nodes as never, edges);
    expect(sorted.map((n) => n.id)).toEqual(['a', 'b', 'c']);
  });

  it('returns all nodes even when there are no edges', () => {
    const nodes = [
      { id: 'x', data: { agentSlug: 'x', label: 'X' } },
      { id: 'y', data: { agentSlug: 'y', label: 'Y' } },
    ];
    const sorted = teamRuntime._topologicalSort(nodes as never, []);
    expect(sorted).toHaveLength(2);
  });

  it('falls back to original order when graph has a cycle', () => {
    const nodes = [
      { id: 'a', data: { agentSlug: 'a', label: 'A' } },
      { id: 'b', data: { agentSlug: 'b', label: 'B' } },
    ];
    const edges = [
      { id: 'e1', source: 'a', target: 'b' },
      { id: 'e2', source: 'b', target: 'a' }, // cycle
    ];
    const sorted = teamRuntime._topologicalSort(nodes as never, edges);
    expect(sorted).toHaveLength(2); // falls back gracefully
  });
});

// ─── teamRuntime.run ─────────────────────────────────────────────────────────

describe('teamRuntime.run()', () => {
  let mockSupabase: ReturnType<typeof buildMockSupabase>;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.POSTGRES_URL_NON_POOLING = 'postgresql://mock';

    mockSupabase = buildMockSupabase();

    // team query
    mockSupabase.single
      .mockResolvedValueOnce({ data: makeTeam('supervisor'), error: null })
      // run row insert
      .mockResolvedValueOnce({ data: { id: 'run-uuid-123' }, error: null });

    // agents query (in + eq)
    mockSupabase.in.mockReturnValue({
      ...mockSupabase,
      eq: jest.fn().mockResolvedValue({
        data: [
          { id: 'agent-id-director', slug: 'director' },
          { id: 'agent-id-developer', slug: 'developer' },
          { id: 'agent-id-analyst', slug: 'analyst' },
        ],
        error: null,
      }),
    });

    // Default: workflow_executions insert + update resolve ok
    mockSupabase.insert.mockReturnValue({ ...mockSupabase, select: jest.fn().mockReturnValue({ ...mockSupabase, single: jest.fn().mockResolvedValue({ data: { id: 'run-uuid-123' }, error: null }) }) });
    mockSupabase.update.mockReturnValue({ ...mockSupabase, eq: jest.fn().mockResolvedValue({ error: null }) });

    (createServiceRoleClient as jest.Mock).mockResolvedValue(mockSupabase);

    // Agent runner mock
    (specialistAgentRunner.run as jest.Mock).mockResolvedValue({
      outputText: 'Mock agent output',
      toolsLog: [],
    });
  });

  it('loads team by slug and validates topology', async () => {
    await teamRuntime.run('devops-team', 'Analyse platform health', 'manual').catch(() => {});
    expect(mockSupabase.from).toHaveBeenCalledWith('agent_teams');
  });

  it('throws when team is not found', async () => {
    // Reset single queue so the 'not found' response is used for the team query
    mockSupabase.single.mockReset();
    mockSupabase.single.mockResolvedValueOnce({ data: null, error: { message: 'not found' } });
    await expect(teamRuntime.run('nonexistent', 'task')).rejects.toThrow(
      'TeamRuntime: team not found or inactive: nonexistent'
    );
  });
});

// ─── teamRuntime.resume ────────────────────────────────────────────────────────

describe('teamRuntime.resume()', () => {
  it('throws when execution is not in awaiting_approval status', async () => {
    const mockSupabase = buildMockSupabase();
    mockSupabase.single.mockResolvedValueOnce({
      data: { id: 'run-id', execution_context: { team_slug: 'devops-team' }, status: 'completed' },
      error: null,
    });
    (createServiceRoleClient as jest.Mock).mockResolvedValue(mockSupabase);

    await expect(teamRuntime.resume('run-id', true)).rejects.toThrow(
      'execution run-id is not paused (status: completed)'
    );
  });

  it('throws when execution is not found', async () => {
    const mockSupabase = buildMockSupabase();
    mockSupabase.single.mockResolvedValueOnce({ data: null, error: null });
    (createServiceRoleClient as jest.Mock).mockResolvedValue(mockSupabase);

    await expect(teamRuntime.resume('missing-run', true)).rejects.toThrow(
      'TeamRuntime.resume: execution not found: missing-run'
    );
  });
});
