/**
 * CAS Unified Dashboard
 *
 * Combined view showing:
 * 1. Live runtime status with greyed-out unavailable features
 * 2. Migration progress tracking
 * 3. Feature comparison side-by-side
 * 4. Next steps and recommendations
 */

import React from 'react';
import { CASRuntimeDashboard } from './CASRuntimeDashboard';
import { MigrationStatusDashboard } from './MigrationStatusDashboard';

export const CASUnifiedDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState<'runtime' | 'migration'>('runtime');

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      {/* Top Navigation */}
      <div style={{
        background: 'white',
        borderBottom: '2px solid #e5e7eb',
        padding: '16px 24px',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '4px' }}>
                CAS Control Center
              </h1>
              <p style={{ fontSize: '14px', color: '#666' }}>
                Runtime Status • Migration Progress • Feature Comparison
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setActiveTab('runtime')}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: `2px solid ${activeTab === 'runtime' ? '#3b82f6' : '#e5e7eb'}`,
                  background: activeTab === 'runtime' ? '#eff6ff' : 'white',
                  color: activeTab === 'runtime' ? '#1e40af' : '#374151',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <span style={{ fontSize: '20px' }}>🔴</span>
                <span>Live Status</span>
              </button>

              <button
                onClick={() => setActiveTab('migration')}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: `2px solid ${activeTab === 'migration' ? '#3b82f6' : '#e5e7eb'}`,
                  background: activeTab === 'migration' ? '#eff6ff' : 'white',
                  color: activeTab === 'migration' ? '#1e40af' : '#374151',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <span style={{ fontSize: '20px' }}>📊</span>
                <span>Migration Progress</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px' }}>
        {activeTab === 'runtime' && (
          <div>
            {/* Quick Stats Banner */}
            <div style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '12px',
              padding: '24px',
              marginBottom: '24px',
              color: 'white'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
                <div>
                  <div style={{ fontSize: '32px', fontWeight: 'bold' }}>2</div>
                  <div style={{ fontSize: '14px', opacity: 0.9 }}>Active Runtimes</div>
                </div>
                <div>
                  <div style={{ fontSize: '32px', fontWeight: 'bold' }}>8</div>
                  <div style={{ fontSize: '14px', opacity: 0.9 }}>AI Agents</div>
                </div>
                <div>
                  <div style={{ fontSize: '32px', fontWeight: 'bold' }}>17%</div>
                  <div style={{ fontSize: '14px', opacity: 0.9 }}>Migration Progress</div>
                </div>
                <div>
                  <div style={{ fontSize: '32px', fontWeight: 'bold' }}>4</div>
                  <div style={{ fontSize: '14px', opacity: 0.9 }}>Workflows</div>
                </div>
              </div>
            </div>

            <CASRuntimeDashboard />
          </div>
        )}

        {activeTab === 'migration' && (
          <div>
            {/* Migration Quick Stats */}
            <div style={{
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              borderRadius: '12px',
              padding: '24px',
              marginBottom: '24px',
              color: 'white'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
                <div>
                  <div style={{ fontSize: '32px', fontWeight: 'bold' }}>5</div>
                  <div style={{ fontSize: '14px', opacity: 0.9 }}>Migration Phases</div>
                </div>
                <div>
                  <div style={{ fontSize: '32px', fontWeight: 'bold' }}>18</div>
                  <div style={{ fontSize: '14px', opacity: 0.9 }}>Features to Implement</div>
                </div>
                <div>
                  <div style={{ fontSize: '32px', fontWeight: 'bold' }}>25h</div>
                  <div style={{ fontSize: '14px', opacity: 0.9 }}>Estimated Work</div>
                </div>
                <div>
                  <div style={{ fontSize: '32px', fontWeight: 'bold' }}>12</div>
                  <div style={{ fontSize: '14px', opacity: 0.9 }}>Critical Features</div>
                </div>
              </div>
            </div>

            <MigrationStatusDashboard />
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        background: 'white',
        borderTop: '1px solid #e5e7eb',
        padding: '24px',
        marginTop: '48px'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', textAlign: 'center', color: '#666', fontSize: '14px' }}>
          <p>
            CAS Runtime Dashboard • CustomAgentRuntime vs LangGraphRuntime
          </p>
          <p style={{ marginTop: '8px', fontSize: '12px' }}>
            Last updated: {new Date().toLocaleString()} • Auto-refresh every 30s
          </p>
        </div>
      </div>
    </div>
  );
};

export default CASUnifiedDashboard;
