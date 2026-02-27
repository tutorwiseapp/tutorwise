/**
 * Fullscreen Workflow Visualizer Page
 *
 * Dedicated page for viewing and editing the Planning Graph workflow in fullscreen mode.
 */

'use client';

import React from 'react';
import { WorkflowVisualizer } from '@cas/packages/core/src/admin';

export default function WorkflowFullscreenPage() {
  const [demoRunning, setDemoRunning] = React.useState(false);
  const [demoState, setDemoState] = React.useState<{
    currentStep?: string;
    completedSteps?: string[];
  }>({});

  // Simulate workflow execution
  const runDemoExecution = React.useCallback(() => {
    const steps = ['analyst', 'developer', 'tester', 'qa', 'security', 'engineer', 'marketer', 'planner'];
    let currentIndex = 0;

    setDemoRunning(true);
    setDemoState({ currentStep: steps[0], completedSteps: [] });

    const interval = setInterval(() => {
      if (currentIndex >= steps.length) {
        clearInterval(interval);
        setDemoRunning(false);
        setDemoState({ completedSteps: steps });
        return;
      }

      setDemoState({
        currentStep: steps[currentIndex],
        completedSteps: steps.slice(0, currentIndex),
      });

      currentIndex++;
    }, 1500);
  }, []);

  const stopDemo = React.useCallback(() => {
    setDemoRunning(false);
    setDemoState({});
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '16px 24px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>
            🎯 LangGraph Planning Graph - Fullscreen Mode
          </h1>
          <p style={{ fontSize: '14px', margin: '4px 0 0 0', opacity: 0.9 }}>
            8-agent workflow orchestration visualization
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          {!demoRunning ? (
            <button
              onClick={runDemoExecution}
              style={{
                padding: '10px 20px',
                background: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>▶️</span>
              <span>Run Demo</span>
            </button>
          ) : (
            <button
              onClick={stopDemo}
              style={{
                padding: '10px 20px',
                background: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>⏹️</span>
              <span>Stop Demo</span>
            </button>
          )}
          <button
            onClick={() => window.close()}
            style={{
              padding: '10px 20px',
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>

      {/* Visualizer */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <WorkflowVisualizer executionState={demoState} editable={true} />
      </div>
    </div>
  );
}
