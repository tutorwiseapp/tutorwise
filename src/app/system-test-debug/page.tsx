// src/app/system-test-debug/page.tsx
'use client';

// This is a minimal component for the sole purpose of debugging deployment and routing.
// It has no dependencies on other components or CSS modules.
export default function SystemTestDebugPage() {
  return (
    <div style={{
      backgroundColor: '#ff0000', // Bright red background
      color: 'white',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      fontFamily: 'sans-serif',
      textAlign: 'center',
      padding: '20px'
    }}>
      <h1 style={{ fontSize: '48px', fontWeight: 'bold' }}>SYSTEM TEST DEBUG PAGE</h1>
      <p style={{ fontSize: '24px', marginTop: '20px' }}>
        If you can see this red page, the deployment and routing are working correctly.
      </p>
      <p style={{ fontSize: '18px', marginTop: '40px' }}>
        The problem is likely related to the original code in the system-test component or its route group.
      </p>
    </div>
  );
}