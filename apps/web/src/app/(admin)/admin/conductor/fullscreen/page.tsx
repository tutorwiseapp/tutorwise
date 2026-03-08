'use client';

import { useRouter } from 'next/navigation';
import { Minimize2 } from 'lucide-react';
import { WorkflowCanvas } from '@/components/feature/workflow';

export default function ConductorFullscreenPage() {
  const router = useRouter();

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 16px',
        borderBottom: '1px solid #e5e7eb',
        background: '#fff',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>
          Conductor — Fullscreen
        </span>
        <button
          onClick={() => router.push('/admin/conductor')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            background: '#fff',
            color: '#374151',
            fontSize: '13px',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          <Minimize2 size={14} />
          Exit Fullscreen
        </button>
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <WorkflowCanvas />
      </div>
    </div>
  );
}
