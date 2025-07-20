/*
 * Filename: src/app/(dev)/apptest/page.tsx
 * Purpose: A standalone, single-file simulator to test the Vinite protocol's end-to-end referral flows.
 *
 * Change History:
 * C003 - 2025-07-20 : 13:30 - Made file fully independent by removing all internal app dependencies.
 * C002 - 2025-07-20 : 13:15 - Fixed TypeScript error by converting mock user ID to a string.
 * C001 - [Date] : [Time] - Initial creation.
 *
 * Last Modified: 2025-07-20 : 13:30
 * Requirement ID (optional): VIN-DEV-001
 *
 * Change Summary:
 * This file is now fully standalone. It no longer imports from the main Vinite app's /lib or /types.
 * It now defines its own local `SimulatorUser` type and creates its own local Supabase client instance.
 * The mock data model was also updated to consistently use snake_case, matching the database schema.
 * This resolves the deployment error and respects the tool's architectural independence.
 *
 * Impact Analysis:
 * This change fixes the deployment blocker and correctly decouples this development tool from the main
 * application, making both more maintainable.
 *
 * Dependencies: "react", "@supabase/supabase-js".
 */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

// --- FIX: Create a local, independent Supabase client ---
// This tool should not depend on the main app's shared client.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL or Anon Key is not defined in environment variables.");
}
const supabase = createClient(supabaseUrl, supabaseAnonKey);


// --- FIX: Define local, independent types for this tool ---
// This removes the dependency on the main app's `src/types/index.ts`.
interface SimulatorUser {
  id: string;
  agent_id: string;
  display_name: string;
  email: string;
  roles: ('agent' | 'provider')[];
  created_at: string;
  // Add other properties as needed by the simulator, keeping them partial
  first_name?: string;
  last_name?: string;
}
interface ClickLogEntry {
  id: number;
  created_at: string;
  agent_id: string;
  destination_url: string;
  status: string | null;
  ip_address: string | null;
  user_agent: string | null;
  channel_origin: string | null;
}

// --- THIS IS THE FIX: All CSS is self-contained ---
const SimulatorStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@600&family=Poppins:wght@400;500&display=swap');
    :root { 
      --sim-blue: #0d6efd; --sim-green: #198754; --sim-red: #dc3545; --sim-gray: #6c757d; --sim-light-gray: #f8f9fa;
      --sim-label-color: #666666;
    }
    .sim-body { font-family: 'Poppins', sans-serif; background-color: #f4f7f9; color: #212529; margin: 0; font-size: 14px; }
    .sim-container { max-width: 1400px; margin: 0 auto; padding: 2rem; }
    .sim-header h1, .sim-card-title { font-family: 'Inter', sans-serif; }
    .sim-header h1 { font-size: 2rem; } .sim-header p { color: var(--sim-gray); }
    .sim-grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 24px; margin-top: 1rem; }
    .sim-col-span-4 { grid-column: span 12; } @media (min-width: 768px) { .sim-col-span-4 { grid-column: span 6; } } @media (min-width: 1200px) { .sim-col-span-4 { grid-column: span 4; } }
    .sim-col-span-8 { grid-column: span 12; } @media (min-width: 1200px) { .sim-col-span-8 { grid-column: span 8; } }
    .sim-card { background-color: #ffffff; border: 1px solid #dee2e6; border-radius: 0.5rem; padding: 1.5rem; }
    .sim-card-title { font-size: 1.25rem; font-weight: 600; margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid #e9ecef; }
    .sim-form-group { margin-bottom: 1rem; }
    .sim-form-group label { display: block; margin-bottom: 8px; font-weight: 500; color: var(--sim-label-color); }
    .sim-input { width: 100%; padding: 0.5rem 0.75rem; border-radius: 0.375rem; border: 1px solid #ced4da; font-size: 14px; font-family: 'Poppins', sans-serif; }
    .sim-btn { display: inline-flex; align-items: center; justify-content: center; padding: 0.5rem 1rem; font-size: 14px; border-radius: 0.375rem; border: 1px solid transparent; cursor: pointer; text-align: center; }
    .sim-btn-primary { background-color: var(--sim-blue); color: white; }
    .sim-btn-secondary { background-color: var(--sim-gray); color: white; }
    .sim-btn-danger { background-color: var(--sim-red); color: white; }
    .sim-btn-full { width: 100%; }
    .sim-persona-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .sim-user-status { margin-bottom: 8px; }
    .sim-api-log, .sim-db-log { background-color: #212529; color: #f8f9fa; border-radius: 0.5rem; padding: 1rem; font-family: "SF Mono", "Menlo", monospace; font-size: 0.875rem; height: 400px; overflow-y: auto; white-space: pre-wrap; }
    .sim-log-get { color: #0d6efd; } .sim-log-post { color: #198754; } .sim-log-delete { color: #dc3545; } .sim-log-patch { color: #fd7e14; }
    .sim-log-path { color: #adb5bd; }
    .sim-generated-link { margin-top: 1rem; padding: 1rem; background-color: var(--sim-light-gray); border-radius: 0.375rem; word-break: break-all; }
    .sim-actions-panel { height: 80px; background-color: #ffffff; border: 1px solid #dee2e6; border-radius: 0.5rem; margin-top: 2rem; padding: 0 1.5rem; display: flex; align-items: center; justify-content: space-between; }
    .sim-actions-group { display: flex; align-items: center; gap: 1rem; }
    .sim-actions-panel .sim-btn-secondary { background-color: #e9ecef; color: #495057; }
    .sim-actions-panel .sim-btn-secondary.active { background-color: var(--sim-blue); color: white; }
  `}</style>
);

// --- FIX: MOCK DATA updated to use the local `SimulatorUser` type and snake_case properties ---
const createMockUser = (base: Partial<SimulatorUser>): SimulatorUser => ({
  id: Math.random().toString(), // Ensure ID is a string
  first_name: 'Test',
  last_name: 'User',
  display_name: 'Test User',
  email: 'test@example.com',
  agent_id: `A1-JS${Math.floor(100000 + Math.random() * 900000)}`,
  created_at: new Date().toISOString(),
  roles: ['agent'],
  ...base
});
const agentA = createMockUser({ first_name: 'Agent', last_name: 'A', display_name: 'Agent A', email: 'agent.a@vinite.com', agent_id: 'A1-AGENTA' });
const providerB = createMockUser({ first_name: 'Provider', last_name: 'B', display_name: 'Provider B LLC', email: 'provider.b@vinite.com', agent_id: 'P1-PROVB', roles: ['provider'] });

const ViniteProtocolSimulator = () => {
  const [currentUser, setCurrentUser] = useState<SimulatorUser | null>(null); // Use local type
  const [apiLog, setApiLog] = useState<string[]>([]);
  const [dbLog, setDbLog] = useState<ClickLogEntry[]>([]);
  const [destUrl, setDestUrl] = useState('https://exampleservice.com/product');
  const [channel, setChannel] = useState('test-suite');
  const [generatedLink, setGeneratedLink] = useState('');
  
  const logApiCall = (method: 'GET' | 'POST' | 'DELETE' | 'PATCH', path: string, data?: Record<string, unknown>) => {
    const entry = `<span class="sim-log-${method.toLowerCase()}">${method}</span> <span class="sim-log-path">${path}</span> ${data ? JSON.stringify(data) : ''}`;
    setApiLog(prev => [entry, ...prev]);
  };

  const fetchDbLog = useCallback(async () => {
    logApiCall('GET', '/rest/v1/ClickLog?select=*');
    const { data, error } = await supabase.from('ClickLog').select('*').order('created_at', { ascending: false }).limit(10);
    if (error) { console.error("Failed to fetch DB log:", error); }
    else { setDbLog(data as ClickLogEntry[]); } // Assert type here
  }, []);

  useEffect(() => { fetchDbLog(); }, [fetchDbLog]);

  const handleLogin = (user: SimulatorUser) => { setCurrentUser(user); logApiCall('POST', '/api/auth/login', { email: user.email }); };
  const handleLogout = () => { setCurrentUser(null); logApiCall('POST', '/api/auth/logout'); };

  const handleGenerateLink = () => {
    const agentId = currentUser?.agent_id || `T1-GUEST${Math.floor(100000 + Math.random() * 900000)}`;
    const url = new URL(`https://vinite.com/a/${agentId}`);
    url.searchParams.set('u', destUrl);
    url.searchParams.set('channel_origin', channel);
    setGeneratedLink(url.toString());
    logApiCall('POST', '/api/v1/links', { destination: destUrl, channel });
  };
  
  const simulateClick = async () => {
    if (!generatedLink) return;
    const url = new URL(generatedLink);
    const agentId = url.pathname.split('/')[2];
    const u = url.searchParams.get('u');
    const channelOrigin = url.searchParams.get('channel_origin');
    logApiCall('GET', url.pathname + url.search);
    await supabase.from('ClickLog').insert([{ agent_id: agentId, destination_url: u, channel_origin: channelOrigin, ip_address: '127.0.0.1', user_agent: 'Simulator', status: 'Clicked' }]);
    fetchDbLog();
  };

  const simulateConversion = async () => {
    const lastClick = dbLog.find(log => log.status === 'Clicked');
    if (!lastClick) { alert("No 'Clicked' event found to convert. Please simulate a click first."); return; }
    logApiCall('PATCH', `/rest/v1/ClickLog?id=eq.${lastClick.id}`, { status: 'Converted' });
    await supabase.from('ClickLog').update({ status: 'Converted' }).eq('id', lastClick.id);
    logApiCall('POST', '/rest/v1/PendingRewards', { temp_agent_id: lastClick.agent_id });
    await supabase.from('PendingRewards').insert([{ temp_agent_id: lastClick.agent_id, service_name: new URL(lastClick.destination_url).hostname, reward_amount: 12.50, seeker_email: `seeker-${Date.now()}@example.com` }]);
    fetchDbLog();
  };

  const handleFullReset = async () => {
    logApiCall('DELETE', 'Full State Reset');
    await supabase.from('ClickLog').delete().gt('id', 0);
    await supabase.from('PendingRewards').delete().gt('id', 0);
    fetchDbLog();
    setApiLog([]);
    setGeneratedLink('');
    handleLogout();
  };

  return (
    <div className="sim-body">
      <SimulatorStyles />
      <div className="sim-container">
        <header className="sim-header"><h1>Vinite Protocol Simulator</h1><p>An independent tool to test and validate end-to-end referral flows.</p></header>
        <div className="sim-actions-panel">
          <div className="sim-actions-group">
            <span style={{fontWeight: 500}}>Test Mode:</span>
            <button className="sim-btn sim-btn-secondary active">Referral Flow</button>
            <button className="sim-btn sim-btn-secondary" disabled>Payouts (coming soon)</button>
            <button className="sim-btn sim-btn-secondary" disabled>Disputes (coming soon)</button>
          </div>
          <div className="sim-actions-group">
            <button className="sim-btn sim-btn-danger" onClick={handleFullReset}>Reset All Simulator Data</button>
          </div>
        </div>
        <div className="sim-grid">
          <div className="sim-col-span-4">
            <div className="sim-card">
              <h3 className="sim-card-title">1. Persona Simulation</h3>
              <p className="sim-user-status">Current User: <strong>{currentUser?.display_name || 'Guest'}</strong></p>
              <div className="sim-persona-grid">
                <button className="sim-btn sim-btn-primary" onClick={() => handleLogin(agentA)}>Login as Agent A</button>
                <button className="sim-btn sim-btn-primary" onClick={() => handleLogin(providerB)}>Login as Provider B</button>
              </div>
              <button className="sim-btn sim-btn-secondary sim-btn-full" style={{marginTop: '1rem'}} onClick={handleLogout} disabled={!currentUser}>Logout</button>
            </div>
            <div className="sim-card" style={{marginTop: '24px'}}>
              <h3 className="sim-card-title">2. Generate Referral Link</h3>
              <div className="sim-form-group"><label htmlFor="destUrl">Destination URL</label><input id="destUrl" className="sim-input" value={destUrl} onChange={e => setDestUrl(e.target.value)} /></div>
              <div className="sim-form-group"><label htmlFor="channel">Channel Origin</label><input id="channel" className="sim-input" value={channel} onChange={e => setChannel(e.target.value)} /></div>
              <button className="sim-btn sim-btn-primary sim-btn-full" onClick={handleGenerateLink}>Generate Link</button>
              {generatedLink && <div className="sim-generated-link">{generatedLink}</div>}
            </div>
            <div className="sim-card" style={{marginTop: '24px'}}>
              <h3 className="sim-card-title">3. Simulate Lifecycle</h3>
              <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                <button className="sim-btn sim-btn-primary sim-btn-full" onClick={simulateClick} disabled={!generatedLink}>Simulate Seeker Click</button>
                <button className="sim-btn sim-btn-primary sim-btn-full" onClick={simulateConversion}>Simulate Conversion</button>
              </div>
            </div>
          </div>
          <div className="sim-col-span-8">
            <div className="sim-card"><h3 className="sim-card-title">API Call Simulation Log</h3><div className="sim-api-log" dangerouslySetInnerHTML={{ __html: apiLog.join('\n') }} /></div>
            <div className="sim-card" style={{marginTop: '24px'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e9ecef', paddingBottom: '1rem', marginBottom: '1rem'}}>
                <h3 className="sim-card-title" style={{border: 0, padding: 0, margin: 0}}>Supabase `ClickLog` Table (Live)</h3>
                <div>
                  <button className="sim-btn sim-btn-secondary" onClick={fetchDbLog} style={{marginRight: '1rem'}}>Refresh</button>
                </div>
              </div>
              <div className="sim-db-log">{dbLog.map(log => <div key={log.id}>{JSON.stringify(log)}</div>)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViniteProtocolSimulator;