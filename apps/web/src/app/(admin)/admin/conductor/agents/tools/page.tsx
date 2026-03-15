'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Wrench, ArrowLeft, Play, Plus, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import styles from './page.module.css';

interface AnalystTool {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  input_schema: Record<string, unknown>;
  return_type: string;
  built_in: boolean;
  status: string;
  created_at: string;
}

interface TestResult {
  slug: string;
  result: unknown;
  error?: string;
}

async function fetchTools(): Promise<AnalystTool[]> {
  const res = await fetch('/api/admin/tools');
  const json = await res.json() as { success: boolean; data: AnalystTool[] };
  if (!json.success) throw new Error('Failed to fetch tools');
  return json.data;
}

export default function ToolsRegistryPage() {
  const queryClient = useQueryClient();
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [showRegister, setShowRegister] = useState(false);
  const [form, setForm] = useState({ slug: '', name: '', description: '', category: 'analytics' });

  const { data: tools = [], isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['admin-tools'],
    queryFn: fetchTools,
    staleTime: 60_000,
    retry: false,
  });

  const registerMutation = useMutation({
    mutationFn: async (payload: typeof form) => {
      const res = await fetch('/api/admin/tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json() as { success: boolean };
      if (!json.success) throw new Error('Registration failed');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tools'] });
      setShowRegister(false);
      setForm({ slug: '', name: '', description: '', category: 'analytics' });
    },
  });

  const testTool = async (tool: AnalystTool) => {
    setTesting(tool.slug);
    setTestResult(null);
    try {
      const res = await fetch(`/api/admin/agents/test-tool`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: tool.slug, input: {} }),
      });
      const json = await res.json() as { success: boolean; data: unknown; error?: string };
      setTestResult({ slug: tool.slug, result: json.data ?? null, error: json.error });
    } catch (err) {
      setTestResult({ slug: tool.slug, result: null, error: String(err) });
    } finally {
      setTesting(null);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link href="/admin/conductor?tab=registry" className={styles.backLink}>
          <ArrowLeft size={16} /> Agents
        </Link>
        <div className={styles.title}>
          <Wrench size={20} />
          <span>Tool Registry</span>
          <span className={styles.badge}>{tools.length}</span>
        </div>
        <div className={styles.headerActions}>
          <button
            className={styles.iconBtn}
            onClick={() => refetch()}
            disabled={isFetching}
            title="Refresh"
          >
            <RefreshCw size={14} className={isFetching ? styles.spinning : undefined} />
          </button>
          <button className={styles.addBtn} onClick={() => setShowRegister(!showRegister)}>
            <Plus size={14} /> Register Tool
          </button>
        </div>
      </div>

      {showRegister && (
        <div className={styles.registerForm}>
          <div className={styles.formTitle}>Register New Tool</div>
          <div className={styles.formRow}>
            <input className={styles.input} placeholder="slug" aria-label="Tool slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
            <input className={styles.input} placeholder="name" aria-label="Tool name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <select className={styles.select} aria-label="Tool category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              <option value="analytics">analytics</option>
              <option value="actions">actions</option>
              <option value="notifications">notifications</option>
            </select>
          </div>
          <input className={styles.input} placeholder="description" aria-label="Tool description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <button
            className={styles.submitBtn}
            onClick={() => registerMutation.mutate(form)}
            disabled={registerMutation.isPending || !form.slug || !form.name || !form.description}
          >
            {registerMutation.isPending ? 'Registering…' : 'Register'}
          </button>
          {registerMutation.isError && (
            <div className={styles.testError}>{String(registerMutation.error)}</div>
          )}
        </div>
      )}

      {isLoading ? (
        <div className={styles.loading}>Loading tools…</div>
      ) : error ? (
        <div className={styles.testError}>
          Failed to load tools. <button className={styles.testBtn} onClick={() => refetch()}>Retry</button>
        </div>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Slug</th>
              <th>Name</th>
              <th>Category</th>
              <th>Description</th>
              <th>Built-in</th>
              <th>Status</th>
              <th>Test</th>
            </tr>
          </thead>
          <tbody>
            {tools.map((tool) => (
              <tr key={tool.id}>
                <td className={styles.slug}>{tool.slug}</td>
                <td>{tool.name}</td>
                <td><span className={styles.categoryBadge}>{tool.category}</span></td>
                <td className={styles.desc}>{tool.description}</td>
                <td>{tool.built_in ? 'Yes' : 'No'}</td>
                <td>
                  <span className={`${styles.statusDot} ${tool.status === 'active' ? styles.active : styles.inactive}`} />
                  {tool.status}
                </td>
                <td>
                  <button
                    className={styles.testBtn}
                    onClick={() => testTool(tool)}
                    disabled={testing === tool.slug}
                  >
                    <Play size={12} />
                    {testing === tool.slug ? 'Running…' : 'Test'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {testResult && (
        <div className={styles.testResultPanel}>
          <div className={styles.testResultTitle}>
            Test result: <code>{testResult.slug}</code>
            <button className={styles.closeResult} onClick={() => setTestResult(null)}>×</button>
          </div>
          {testResult.error ? (
            <div className={styles.testError}>{testResult.error}</div>
          ) : (
            <pre className={styles.testOutput}>{JSON.stringify(testResult.result, null, 2)}</pre>
          )}
        </div>
      )}
    </div>
  );
}
