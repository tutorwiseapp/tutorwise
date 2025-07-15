'use client';

import React, { useState, useEffect } from 'react';

// ===================================================================================
//  Vinite Testapp: Self-Contained Development & Simulation Tool
//  ---------------------------------------------------------------------------------
//  This page is 100% independent of the main Vinite application's components.
//  It includes its own mock components and styles to ensure it can be developed
//  and used for testing without any dependencies on the production UI library.
// ===================================================================================


// --- 1. EMBEDDED STYLES ---
// All CSS for this page is contained here. This makes the component portable.
const TestappStyles = () => (
  <style>{`
    /* Basic Resets and Body Styles */
    .testapp-body {
        font-family: 'Poppins', sans-serif;
        background-color: #f8f9fa;
        color: #202124;
        margin: 0;
    }
    .testapp-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
    }
    
    /* Page Header Styles */
    .testapp-header h1 {
        font-family: 'Inter', sans-serif;
        font-size: 32px; /* H1 Size */
        font-weight: 600;
        margin: 0;
    }
    .testapp-header p {
        margin-top: 8px;
        font-size: 18px;
        color: #5f6368;
    }

    /* Main Layout Grid */
    .controlsGrid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 32px;
      margin-top: 32px; /* Vertical spacing from subtitle */
    }
    @media (min-width: 1024px) { .controlsGrid { grid-template-columns: repeat(2, 1fr); } }
    
    /* Card Styling (previously ContentBox) */
    .card {
        background-color: #ffffff;
        border: 1px solid #dfe1e5;
        border-radius: 8px;
        padding: 2rem;
    }
    .sectionTitle {
      font-family: 'Inter', sans-serif;
      font-size: 20px; /* H3 Size */
      font-weight: 600;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid #f8f9fa;
    }
    .sectionSubtitle {
      font-size: 14px;
      color: #5f6368;
      margin-bottom: 24px;
    }

    /* Form & Input Styling */
    .form {
        display: flex;
        flex-direction: column;
        gap: 32px; /* Vertical spacing between fields */
    }
    .form-group label {
        display: block;
        margin-bottom: 8px;
        font-family: 'Poppins', sans-serif;
        font-size: 14px;
        color: #666666;
        font-weight: 400;
    }
    .form-group input {
        width: 100%;
        height: 48px;
        padding: 0 1rem;
        border-radius: 8px;
        border: 1px solid #dfe1e5;
        font-family: 'Poppins', sans-serif;
        font-size: 14px;
        color: #000000;
        font-weight: 400;
    }
    .form-group input:disabled {
        background-color: #f8f9fa;
        cursor: not-allowed;
    }


    /* Persona Simulation Styles */
    .personaGrid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 32px; }
    .personaGroup { display: flex; flex-direction: column; gap: 16px; }
    .personaTitle {
      font-weight: 600;
      color: #5f6368;
      font-size: 14px;
      border-bottom: 1px solid #f8f9fa;
      padding-bottom: 8px;
      margin-bottom: 8px;
    }
    .logoutSection {
      margin-top: 24px;
      padding-top: 24px;
      border-top: 1px solid #f8f9fa;
    }

    /* Lifecycle Simulation Styles */
    .lifecycle {
        display: flex;
        flex-wrap: wrap;
        position: relative;
        justify-content: space-between;
        gap: 32px;
    }
    .lifecycle > button { flex-grow: 1; }
    .lifecycle > button:not(:last-child)::after {
        content: '→';
        position: absolute;
        right: -24px;
        top: 50%;
        transform: translateY(-50%);
        color: #dfe1e5;
        font-weight: 600;
    }

    /* Utility Styles */
    .spanTwo { grid-column: span 1; }
    @media (min-width: 1024px) { .spanTwo { grid-column: span 2; } }
    
    /* State Inspector Styles */
    .stateInspector {
        background-color: #f8f9fa;
        border-radius: 8px;
        padding: 1rem;
        font-family: monospace;
        font-size: 12px;
        white-space: pre-wrap;
        word-break: break-all;
        max-height: 400px;
        overflow-y: auto;
        border: 1px solid #dfe1e5;
    }
    .generatedLinkDisplay {
        margin-top: 24px;
        padding: 1rem;
        background-color: #f8f9fa;
        border-radius: 8px;
        font-size: 14px;
        word-break: break-all;
        border: 1px solid #dfe1e5;
    }
    .generatedLinkDisplay strong {
        font-weight: 600;
        color: #202124;
        display: block;
        margin-bottom: 8px;
    }

    /* Toast Message Styles */
    .toastMessage {
      position: fixed;
      top: 24px;
      right: 24px;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0,0,0,0.08);
      z-index: 1000;
      opacity: 0;
      animation: fadeInOut 4s ease-in-out forwards;
      border: 1px solid;
    }
    .toastMessage.success { background-color: #e8f5e8; color: #137333; border-color: #c4e7c4; }
    .toastMessage.error { background-color: #fce8e6; color: #d93025; border-color: #f5c6cb; }
    .toastMessage.warning { background-color: #fef7e0; color: #b06000; border-color: #fdd663; }
    @keyframes fadeInOut {
      0% { opacity: 0; transform: translateY(-20px); }
      10% { opacity: 1; transform: translateY(0); }
      90% { opacity: 1; transform: translateY(0); }
      100% { opacity: 0; transform: translateY(-20px); }
    }
    .dangerButton {
      border-color: #d93025 !important;
      color: #d93025 !important;
      background-color: transparent !important;
    }
    .dangerButton:hover { background-color: #fce8e6 !important; }
  `}</style>
);

// --- 2. INDEPENDENT MOCK COMPONENTS ---
// These components are defined locally for this page only.
const Container = ({ children }: { children: React.ReactNode }) => <div className="testapp-container">{children}</div>;
const PageHeader = ({ title, subtitle }: { title: string, subtitle?: string }) => (
  <div className="testapp-header">
    <h1>{title}</h1>
    {subtitle && <p>{subtitle}</p>}
  </div>
);
const Card = ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode; className?: string }) => {
    const cardClasses = `${className || ''} card`;
    return <div className={cardClasses} {...props}>{children}</div>;
};
const FormGroup = ({ label, htmlFor, children }: { label: string, htmlFor?: string, children: React.ReactNode }) => (
    <div className="form-group">
        <label htmlFor={htmlFor}>{label}</label>
        {children}
    </div>
);
const Input = (props: React.ComponentPropsWithoutRef<'input'>) => <input {...props} />;
const Button = ({ children, variant, className, fullWidth, ...props }: React.ComponentPropsWithoutRef<'button'> & {variant?: string, fullWidth?: boolean}) => {
    const baseStyle: React.CSSProperties = {
        height: '40px', padding: '0 1.5rem', borderRadius: '8px', cursor: 'pointer',
        fontSize: '14px', fontWeight: 500, border: '1px solid #dfe1e5',
        transition: 'all 0.2s ease-in-out', color: '#202124', backgroundColor: '#f1f3f4',
        width: fullWidth ? '100%' : 'auto',
    };
    const primaryStyle: React.CSSProperties = { ...baseStyle, backgroundColor: '#4CAEAD', color: 'white', borderColor: '#4CAEAD' };
    const secondaryStyle: React.CSSProperties = { ...baseStyle, backgroundColor: 'transparent', color: '#006C67', borderColor: '#006C67' };
    let style = baseStyle;
    if (variant === 'primary') style = primaryStyle;
    else if (variant === 'secondary') style = secondaryStyle;
    return <button style={style} className={className} {...props}>{children}</button>;
};

// --- 3. MOCK TYPE DEFINITIONS ---
interface User {
  firstName: string; lastName: string; displayName: string; email: string;
  agentId: string; createdAt: string; roles: string[];
}
interface Referral {
  id: number; date: string; seeker: string; agent: string;
  provider: string; type: string; channel: string;
  amount: number; status: string;
}

// --- 4. MOCK DATA AND PERSONAS ---
const createMockUser = (base: Partial<User>): User => ({
  firstName: 'Test', lastName: 'User', displayName: 'Test User', email: 'test@example.com',
  agentId: `A1-JS${Math.floor(100000 + Math.random() * 900000)}`, createdAt: new Date().toISOString(), roles: ['agent'], ...base,
});
const agentA = createMockUser({ firstName: 'Agent', lastName: 'A', displayName: 'Agent A', email: 'agent.a@vinite.com', agentId: 'A1-AAAAAA' });
const agentB = createMockUser({ firstName: 'Agent', lastName: 'B', displayName: 'Agent B', email: 'agent.b@vinite.com', agentId: 'B2-BBBBBB' });
const seekerA = createMockUser({ firstName: 'Seeker', lastName: 'A', displayName: 'Seeker A', email: 'seeker.a@vinite.com', agentId: 'S1-SAAAAA', roles: ['seeker'] });
const seekerB = createMockUser({ firstName: 'Seeker', lastName: 'B', displayName: 'Seeker B', email: 'seeker.b@vinite.com', agentId: 'S2-SBBBBB', roles: ['seeker'] });
const providerA = createMockUser({ firstName: 'Provider', lastName: 'A', displayName: 'Provider A Inc.', email: 'provider.a@vinite.com', agentId: 'P1-PAAAAA', roles: ['provider'] });
const providerB = createMockUser({ firstName: 'Provider', lastName: 'B', displayName: 'Provider B LLC', email: 'provider.b@vinite.com', agentId: 'P2-PBBBBB', roles: ['provider'] });
const adminUser = createMockUser({ firstName: 'Admin', lastName: 'User', displayName: 'Admin User', email: 'admin@vinite.com', agentId: 'ADM-001', roles: ['admin'] });
const superAdminUser = createMockUser({ firstName: 'Super', lastName: 'Admin', displayName: 'Super Admin', email: 'super@vinite.com', agentId: 'SADM-001', roles: ['admin', 'super_admin'] });

// --- 5. THE MAIN TESTAPP PAGE COMPONENT ---
const TestappPage = () => {
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'warning' } | null>(null);
  const [localStorageState, setLocalStorageState] = useState('');
  const [linkGenUrl, setLinkGenUrl] = useState('https://example.com');
  const [linkGenAgentId, setLinkGenAgentId] = useState('');
  const [lastGeneratedLink, setLastGeneratedLink] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // Mock router for this environment
  const router = { push: (path: string) => console.log(`Navigating to: ${path}`) };

  const updateStateView = () => {
    if (typeof window !== 'undefined') {
      const user = localStorage.getItem('vinite_loggedin_user');
      setCurrentUser(JSON.parse(user || 'null'));
      const referrals = localStorage.getItem('vinite_referrals');
      const stateString = `// Logged-in User:\n${JSON.stringify(JSON.parse(user || 'null'), null, 2)}\n\n// Referrals:\n${JSON.stringify(JSON.parse(referrals || '[]'), null, 2)}`;
      setLocalStorageState(stateString);
    }
  };

  useEffect(() => {
    updateStateView();
  }, []);

  const showMessage = (text: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setMessage({ text, type });
    updateStateView();
    setTimeout(() => setMessage(null), 4000);
  };

  const handleLogin = (user: User) => {
    localStorage.setItem('vinite_loggedin_user', JSON.stringify(user));
    setLinkGenAgentId(user.agentId);
    showMessage(`Logged in as ${user.displayName}.`);
    if (user.roles.includes('admin')) {
      router.push('/admin');
    } else {
      router.push('/dashboard');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('vinite_loggedin_user');
    setLinkGenAgentId('');
    showMessage('Logged out successfully.');
    router.push('/');
  };

  const handleGenerateLink = () => {
    if (!linkGenUrl) {
        showMessage('Please enter a destination URL.', 'error');
        return;
    }
    const agentId = linkGenAgentId || `T1-${Math.floor(100000 + Math.random() * 900000)}`;
    const newLink = `https://vinite.com/a/${encodeURIComponent(agentId)}?u=${encodeURIComponent(linkGenUrl)}`;
    setLastGeneratedLink(newLink);
    
    const newReferral: Referral = {
        id: Date.now(), date: new Date().toISOString(), seeker: 'N/A', agent: agentId,
        provider: new URL(linkGenUrl).hostname, type: 'Link', channel: 'DevTool', amount: 0, status: 'Open',
    };
    const existing: Referral[] = JSON.parse(localStorage.getItem('vinite_referrals') || '[]');
    localStorage.setItem('vinite_referrals', JSON.stringify([newReferral, ...existing]));
    showMessage(`Generated new link for ${agentId}.`);
  };
  
  const simulateLifecycleStep = (newStatus: Referral['status']) => {
      const referrals: Referral[] = JSON.parse(localStorage.getItem('vinite_referrals') || '[]');
      if(referrals.length === 0) {
          showMessage('No referrals to update. Generate a link first.', 'warning');
          return;
      }
      referrals[0].status = newStatus;
      if (newStatus === 'Paid') {
          referrals[0].amount = Math.floor(Math.random() * 200) + 20;
      }
      localStorage.setItem('vinite_referrals', JSON.stringify(referrals));
      showMessage(`Updated latest referral status to: ${newStatus}`);
  };

  const handleClearAll = () => {
    localStorage.removeItem('vinite_loggedin_user');
    localStorage.removeItem('vinite_referrals');
    setLinkGenAgentId('');
    setLastGeneratedLink('');
    showMessage('All localStorage data cleared.');
  }

  return (
    <div className="testapp-body">
      <TestappStyles />
      <Container>
        {message && 
          <div className={`toastMessage ${message.type}`}>
            {message.text}
          </div>
        }

        <PageHeader 
          title="Vinite Testapp"
          subtitle="Use these tools to simulate different application states and personas."
        />

        <div className="controlsGrid">
          <Card>
            <h3 className="sectionTitle">Persona Simulation</h3>
            <p className="sectionSubtitle">
              Current User: <strong>{currentUser?.displayName || 'None'}</strong>
            </p>
            <div className="personaGrid">
              <div className="personaGroup">
                <h4 className="personaTitle">Agents</h4>
                <Button onClick={() => handleLogin(agentA)}>Login Agent A</Button>
                <Button onClick={() => handleLogin(agentB)}>Login Agent B</Button>
              </div>
              <div className="personaGroup">
                <h4 className="personaTitle">Seekers</h4>
                <Button onClick={() => handleLogin(seekerA)}>Login Seeker A</Button>
                <Button onClick={() => handleLogin(seekerB)}>Login Seeker B</Button>
              </div>
              <div className="personaGroup">
                <h4 className="personaTitle">Providers</h4>
                <Button onClick={() => handleLogin(providerA)}>Login Provider A</Button>
                <Button onClick={() => handleLogin(providerB)}>Login Provider B</Button>
              </div>
              <div className="personaGroup">
                <h4 className="personaTitle">Admins</h4>
                <Button onClick={() => handleLogin(adminUser)}>Login Admin</Button>
                <Button onClick={() => handleLogin(superAdminUser)}>Login Super Admin</Button>
              </div>
            </div>
            <div className="logoutSection">
              <Button onClick={handleLogout} variant="secondary">Logout Current User</Button>
            </div>
          </Card>

          <Card>
            <h3 className="sectionTitle">Generate Vinite Link</h3>
            <div className="form">
                  <FormGroup label="Destination URL" htmlFor="destUrl">
                      <Input id="destUrl" value={linkGenUrl} onChange={e => setLinkGenUrl(e.target.value)} />
                  </FormGroup>
                  <FormGroup label="Agent ID (auto-filled on login)" htmlFor="agentId">
                      <Input id="agentId" value={linkGenAgentId} onChange={e => setLinkGenAgentId(e.target.value)} disabled={!!currentUser} />
                  </FormGroup>
                  <Button onClick={handleGenerateLink} variant="primary" fullWidth>1. Generate Link</Button>
              </div>
              {lastGeneratedLink && (
                  <div className="generatedLinkDisplay">
                      <strong>Last Generated Link:</strong>
                      <span>{lastGeneratedLink}</span>
                  </div>
              )}
          </Card>

          <Card className="spanTwo">
            <h3 className="sectionTitle">Referral Lifecycle Simulation (Acts on Latest Referral)</h3>
            <div className="buttonGroup lifecycle">
              <Button onClick={() => simulateLifecycleStep('Shared')}>2. Simulate Share</Button>
              <Button onClick={() => simulateLifecycleStep('Accepted')}>3. Simulate Conversion</Button>
              <Button onClick={() => simulateLifecycleStep('Paid')}>4. Simulate Reward</Button>
              <Button onClick={() => showMessage("Rating simulation would go here.")} variant="secondary">5. Simulate Rating</Button>
            </div>
          </Card>
          
          <Card className="spanTwo">
              <h3 className="sectionTitle">Current LocalStorage State</h3>
              <div className="buttonGroup" style={{marginBottom: '16px'}}>
                  <Button onClick={updateStateView}>Refresh View</Button>
                  <Button onClick={handleClearAll} variant="secondary" className="dangerButton">Clear All Data</Button>
              </div>
              <pre className="stateInspector">{localStorageState}</pre>
          </Card>
        </div>
      </Container>
    </div>
  );
};

export default TestappPage;