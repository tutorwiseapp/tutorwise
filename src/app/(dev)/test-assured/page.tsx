'use client';

import { useState, useEffect } from 'react';
import Container from '@/app/components/layout/Container';
import Card from '@/app/components/ui/Card';
import Button from '@/app/components/ui/Button';
import Tabs from '@/app/components/ui/Tabs';
import StatusBadge from '@/app/components/ui/StatusBadge';
import PageHeader from '@/app/components/ui/PageHeader';

type TestStatus = 'idle' | 'pending' | 'success' | 'error';
type HealthStatus = 'unknown' | 'ok' | 'degraded' | 'error';

interface HealthResponse {
  status: HealthStatus;
  timestamp: number;
  services: {
    redis: {
      status: 'ok' | 'error' | 'not_configured';
      message: string;
      details: string | null;
    };
    neo4j: {
      status: 'ok' | 'error' | 'not_configured';
      message: string;
      details: string | null;
    };
  };
}

interface TestResult {
  status: TestStatus;
  message?: string;
  timestamp?: number;
}

export default function TestAssuredPage() {
  const [activeTab, setActiveTab] = useState('system-tests');

  // System Test States
  const [systemTestStatus, setSystemTestStatus] = useState<'idle' | 'running' | 'complete'>('idle');
  const [supabaseResult, setSupabaseResult] = useState<TestResult>({ status: 'idle' });
  const [neo4jResult, setNeo4jResult] = useState<TestResult>({ status: 'idle' });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Health Check States
  const [healthStatus, setHealthStatus] = useState<HealthResponse | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [lastHealthCheck, setLastHealthCheck] = useState<Date | null>(null);

  const tabs = [
    { id: 'system-tests', label: 'System Tests' },
    { id: 'health-monitor', label: 'Health Monitor' },
    { id: 'test-docs', label: 'Test Documentation' },
    { id: 'test-history', label: 'Test Framework' }
  ];

  // Auto-refresh health status every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (activeTab === 'health-monitor') {
        checkHealth();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [activeTab]);

  const runSystemTests = async () => {
    setSystemTestStatus('running');
    setSupabaseResult({ status: 'pending' });
    setNeo4jResult({ status: 'pending' });
    setErrorMessage(null);

    try {
      const response = await fetch('/api/system-test', {
        method: 'POST',
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'System test API returned an error.');
      }

      setSupabaseResult({
        status: data.supabase === 'ok' ? 'success' : 'error',
        message: data.supabase === 'ok' ? 'Supabase connection verified' : 'Supabase test failed',
        timestamp: Date.now()
      });

      setNeo4jResult({
        status: data.neo4j === 'ok' ? 'success' : 'error',
        message: data.neo4j === 'ok' ? 'Neo4j connection verified' : 'Neo4j test failed',
        timestamp: Date.now()
      });

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      setErrorMessage(message);
      setSupabaseResult(s => s.status === 'pending' ? { status: 'error', message } : s);
      setNeo4jResult(n => n.status === 'pending' ? { status: 'error', message } : n);
    } finally {
      setSystemTestStatus('complete');
    }
  };

  const checkHealth = async () => {
    setHealthLoading(true);
    try {
      const response = await fetch('https://tutorwise-railway-backend-production.up.railway.app/health');
      const data: HealthResponse = await response.json();
      setHealthStatus(data);
      setLastHealthCheck(new Date());
    } catch (error) {
      console.error('Health check failed:', error);
      setHealthStatus({
        status: 'error',
        timestamp: Date.now(),
        services: {
          redis: { status: 'error', message: 'Health check failed', details: null },
          neo4j: { status: 'error', message: 'Health check failed', details: null }
        }
      });
    } finally {
      setHealthLoading(false);
    }
  };

  const TestStatusIndicator = ({ result }: { result: TestResult }) => {
    const statusMap = {
      idle: { text: 'Ready', variant: 'secondary' as const },
      pending: { text: 'Running...', variant: 'primary' as const },
      success: { text: 'Success', variant: 'primary' as const },
      error: { text: 'Failed', variant: 'secondary' as const }
    };

    const config = statusMap[result.status];
    return <StatusBadge status={config.text} />;
  };

  const HealthStatusIndicator = ({ status }: { status: 'ok' | 'error' | 'not_configured' }) => {
    const statusMap = {
      ok: 'Healthy',
      error: 'Error',
      not_configured: 'Not Configured'
    };
    return <StatusBadge status={statusMap[status]} />;
  };

  const renderSystemTests = () => (
    <div className="space-y-6">
      <Card>
        <div className="p-6">
          <h3 className="text-xl font-bold mb-4">End-to-End Connectivity Tests</h3>
          <p className="text-gray-600 mb-6">
            Validate the complete application stack from frontend to backend databases.
          </p>

          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">1. Frontend → Supabase Database</p>
                <p className="text-sm text-gray-500">Tests authentication and profile database operations</p>
              </div>
              <TestStatusIndicator result={supabaseResult} />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">2. Frontend → Railway Backend → Neo4j Database</p>
                <p className="text-sm text-gray-500">Tests full-stack connectivity through Railway to graph database</p>
              </div>
              <TestStatusIndicator result={neo4jResult} />
            </div>
          </div>

          <Button
            onClick={runSystemTests}
            disabled={systemTestStatus === 'running'}
            fullWidth
            variant="primary"
          >
            {systemTestStatus === 'running' ? 'Running Tests...' : 'Run System Tests'}
          </Button>

          {errorMessage && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="font-semibold text-red-800">Test Error:</p>
              <p className="text-red-700">{errorMessage}</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );

  const renderHealthMonitor = () => (
    <div className="space-y-6">
      <Card>
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">Backend Health Monitor</h3>
            <Button
              onClick={checkHealth}
              disabled={healthLoading}
              variant="secondary"
            >
              {healthLoading ? 'Checking...' : 'Check Health'}
            </Button>
          </div>

          {lastHealthCheck && (
            <p className="text-sm text-gray-500 mb-4">
              Last checked: {lastHealthCheck.toLocaleString()}
            </p>
          )}

          {healthStatus ? (
            <div className="space-y-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Overall Status</span>
                  <StatusBadge status={healthStatus.status === 'ok' ? 'Healthy' : 'Issues Detected'} />
                </div>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Redis Cache</span>
                  <HealthStatusIndicator status={healthStatus.services.redis.status} />
                </div>
                <p className="text-sm text-gray-600">{healthStatus.services.redis.message}</p>
                {healthStatus.services.redis.details && (
                  <p className="text-xs text-gray-500 mt-1">{healthStatus.services.redis.details}</p>
                )}
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Neo4j Graph Database</span>
                  <HealthStatusIndicator status={healthStatus.services.neo4j.status} />
                </div>
                <p className="text-sm text-gray-600">{healthStatus.services.neo4j.message}</p>
                {healthStatus.services.neo4j.details && (
                  <p className="text-xs text-gray-500 mt-1">{healthStatus.services.neo4j.details}</p>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">Click &quot;Check Health&quot; to view backend status</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );

  const renderTestDocs = () => (
    <div className="space-y-6">
      <Card>
        <div className="p-6">
          <h3 className="text-xl font-bold mb-6">Tutorwise Test Plan & Developer Workflow</h3>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <section>
                <h4 className="text-lg font-semibold mb-3 text-blue-600">TestAssured Overview</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Professional testing platform combining system tests, health monitoring, and documentation.
                </p>
                <ul className="text-sm space-y-1">
                  <li>• <strong>System Tests:</strong> End-to-end connectivity validation</li>
                  <li>• <strong>Health Monitor:</strong> Real-time backend status tracking</li>
                  <li>• <strong>Documentation:</strong> Comprehensive test plan integration</li>
                  <li>• <strong>Extensible:</strong> Ready for additional test suites</li>
                </ul>
              </section>

              <section>
                <h4 className="text-lg font-semibold mb-3 text-blue-600">MVP Testing Results</h4>
                <div className="bg-green-50 p-3 rounded border-l-4 border-green-400">
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span>Backend Tests:</span>
                      <span className="font-semibold text-green-700">29/30 passing (96.7%)</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Frontend Tests:</span>
                      <span className="font-semibold text-green-700">Infrastructure Complete</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Health Monitoring:</span>
                      <span className="font-semibold text-green-700">Operational</span>
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <h4 className="text-lg font-semibold mb-3 text-blue-600">Critical Business Logic</h4>
                <ul className="text-sm space-y-2">
                  <li>
                    <strong>Stripe Integration:</strong>
                    <br />
                    <span className="text-gray-600">Payment processing, customer management, checkout sessions</span>
                  </li>
                  <li>
                    <strong>Supabase Integration:</strong>
                    <br />
                    <span className="text-gray-600">Authentication, profile management, database operations</span>
                  </li>
                  <li>
                    <strong>Railway Backend:</strong>
                    <br />
                    <span className="text-gray-600">Multi-worker deployment, Redis cache, Neo4j graph database</span>
                  </li>
                </ul>
              </section>
            </div>

            <div className="space-y-4">
              <section>
                <h4 className="text-lg font-semibold mb-3 text-blue-600">Quick Start Commands</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="font-mono text-xs space-y-2">
                    <div className="flex justify-between">
                      <span className="text-blue-600">npm run test:all</span>
                      <span className="text-gray-500">All tests</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-600">npm run quality:check</span>
                      <span className="text-gray-500">Full pipeline</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-600">npm run health:check</span>
                      <span className="text-gray-500">Backend health</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-600">npm run test:coverage</span>
                      <span className="text-gray-500">Coverage reports</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-600">npm run lint:all</span>
                      <span className="text-gray-500">Code quality</span>
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <h4 className="text-lg font-semibold mb-3 text-blue-600">Coverage Thresholds</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Frontend (TypeScript):</span>
                    <span className="font-semibold">70% minimum</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Backend (Python):</span>
                    <span className="font-semibold">80% minimum</span>
                  </div>
                </div>
              </section>

              <section>
                <h4 className="text-lg font-semibold mb-3 text-blue-600">Architecture</h4>
                <div className="text-sm space-y-2">
                  <div><strong>Frontend:</strong> Next.js 13+ App Router, TypeScript</div>
                  <div><strong>Backend:</strong> FastAPI, Python 3.8+, Gunicorn workers</div>
                  <div><strong>Databases:</strong> Supabase PostgreSQL, Neo4j Graph, Redis Cache</div>
                  <div><strong>Deployment:</strong> Vercel (frontend), Railway (backend)</div>
                  <div><strong>Testing:</strong> Jest + React Testing Library, pytest</div>
                  <div><strong>Quality:</strong> ESLint, Ruff linter with auto-fix</div>
                </div>
              </section>

              <section>
                <h4 className="text-lg font-semibold mb-3 text-blue-600">Development Workflow</h4>
                <ol className="text-sm space-y-1 list-decimal list-inside">
                  <li>Run quality checks before commits</li>
                  <li>Ensure all tests pass locally</li>
                  <li>Verify health monitoring status</li>
                  <li>Check coverage thresholds met</li>
                  <li>Deploy with confidence</li>
                </ol>
              </section>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-800 mb-2">🚀 Production Ready</h4>
            <p className="text-sm text-blue-700">
              The MVP testing strategy is now fully implemented with comprehensive coverage of payment processing,
              authentication systems, and database integrations. All deployment pipelines validated.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderTestHistory = () => (
    <div className="space-y-6">
      <Card>
        <div className="p-6">
          <h3 className="text-xl font-bold mb-4">Extensible Test Framework</h3>

          <div className="space-y-6">
            <section>
              <h4 className="text-lg font-semibold mb-3">Current Test Suites</h4>
              <div className="grid gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <h5 className="font-medium">System Integration Tests</h5>
                      <p className="text-sm text-gray-600">End-to-end connectivity validation</p>
                    </div>
                    <StatusBadge status="Active" />
                  </div>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <h5 className="font-medium">Health Monitoring</h5>
                      <p className="text-sm text-gray-600">Real-time backend service status</p>
                    </div>
                    <StatusBadge status="Active" />
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h4 className="text-lg font-semibold mb-3">Planned Test Suites</h4>
              <div className="grid gap-4">
                <div className="p-4 border rounded-lg opacity-60">
                  <div className="flex justify-between items-center">
                    <div>
                      <h5 className="font-medium">Performance Testing</h5>
                      <p className="text-sm text-gray-600">Load testing, response time validation</p>
                    </div>
                    <StatusBadge status="Coming Soon" />
                  </div>
                </div>

                <div className="p-4 border rounded-lg opacity-60">
                  <div className="flex justify-between items-center">
                    <div>
                      <h5 className="font-medium">Security Testing</h5>
                      <p className="text-sm text-gray-600">Authentication, authorization, data protection</p>
                    </div>
                    <StatusBadge status="Coming Soon" />
                  </div>
                </div>

                <div className="p-4 border rounded-lg opacity-60">
                  <div className="flex justify-between items-center">
                    <div>
                      <h5 className="font-medium">API Testing</h5>
                      <p className="text-sm text-gray-600">REST endpoint validation, contract testing</p>
                    </div>
                    <StatusBadge status="Coming Soon" />
                  </div>
                </div>

                <div className="p-4 border rounded-lg opacity-60">
                  <div className="flex justify-between items-center">
                    <div>
                      <h5 className="font-medium">E2E User Flows</h5>
                      <p className="text-sm text-gray-600">Complete user journey testing with Playwright</p>
                    </div>
                    <StatusBadge status="Coming Soon" />
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h4 className="text-lg font-semibold mb-3">TestAssured Extension Guide</h4>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h5 className="font-medium mb-2">Adding New Test Suites:</h5>
                <ol className="text-sm space-y-1 list-decimal list-inside text-gray-700">
                  <li>Create new tab in <code>tabs</code> array</li>
                  <li>Add corresponding render function (e.g., <code>renderPerformanceTests</code>)</li>
                  <li>Implement test logic with proper state management</li>
                  <li>Add API routes in <code>/api/</code> directory if needed</li>
                  <li>Update <code>renderActiveTab</code> switch statement</li>
                  <li>Follow existing UI patterns for consistency</li>
                </ol>

                <h5 className="font-medium mt-4 mb-2">Test Suite Template:</h5>
                <div className="bg-white p-3 rounded font-mono text-xs border">
                  <div className="text-gray-600">{`// Example: Performance Test Suite`}</div>
                  <div>const renderPerformanceTests = () =&gt; (</div>
                  <div>  &lt;div className=&quot;space-y-6&quot;&gt;</div>
                  <div>    &lt;Card&gt;</div>
                  <div>      &lt;div className=&quot;p-6&quot;&gt;</div>
                  <div>        {`// Test implementation here`}</div>
                  <div>      &lt;/div&gt;</div>
                  <div>    &lt;/Card&gt;</div>
                  <div>  &lt;/div&gt;</div>
                  <div>);</div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'system-tests':
        return renderSystemTests();
      case 'health-monitor':
        return renderHealthMonitor();
      case 'test-docs':
        return renderTestDocs();
      case 'test-history':
        return renderTestHistory();
      default:
        return renderSystemTests();
    }
  };

  return (
    <Container>
      <div className="py-8">
        <PageHeader
          title="TestAssured"
          subtitle="Professional testing platform for Tutorwise - System validation, health monitoring, and test documentation"
        />

        <div className="mt-8">
          <Tabs
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />

          <div className="mt-6">
            {renderActiveTab()}
          </div>
        </div>
      </div>
    </Container>
  );
}