    'use client';

    import { useState } from 'react';

    type Status = 'idle' | 'pending' | 'ok' | 'error';

    export default function SystemTestPage() {
      const [testStatus, setTestStatus] = useState<'idle' | 'running' | 'complete'>('idle');
      const [supabaseResult, setSupabaseResult] = useState<Status>('idle');
      const [neo4jResult, setNeo4jResult] = useState<Status>('idle');
      const [errorMessage, setErrorMessage] = useState<string | null>(null);

      const handleRunTest = async () => {
        setTestStatus('running');
        setSupabaseResult('pending');
        setNeo4jResult('pending');
        setErrorMessage(null);

        try {
          const response = await fetch('/api/system-test', {
            method: 'POST',
          });
          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.message || 'The test API route returned an error.');
          }

          setSupabaseResult(data.supabase);
          setNeo4jResult(data.neo4j);

        } catch (error) {
            if (error instanceof Error) {
                setErrorMessage(error.message);
            } else {
                setErrorMessage('An unknown error occurred.');
            }
          setSupabaseResult(s => (s === 'pending' ? 'error' : s));
          setNeo4jResult(n => (n === 'pending' ? 'error' : n));
        } finally {
          setTestStatus('complete');
        }
      };

      const StatusIndicator = ({ status }: { status: Status }) => {
        const statusMap = {
          idle: { text: 'Not Run', color: 'bg-gray-400' },
          pending: { text: 'Running...', color: 'bg-yellow-400 animate-pulse' },
          ok: { text: 'Success', color: 'bg-green-500' },
          error: { text: 'Failed', color: 'bg-red-500' },
        };
        const { text, color } = statusMap[status];
        return (
            <span className={`px-3 py-1 text-sm font-semibold text-white rounded-full ${color}`}>
                {text}
            </span>
        );
      };

      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
          <div className="w-full max-w-2xl p-8 space-y-6 bg-white rounded-lg shadow-md">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-800">End-to-End System Test</h1>
              <p className="mt-2 text-gray-600">
                This page validates the entire application stack from frontend to backend databases.
              </p>
            </div>
            
            <div className="space-y-4 p-6 border rounded-lg">
              <div className="flex items-center justify-between">
                <p className="font-medium text-gray-700">1. Vercel Frontend → Supabase DB Write</p>
                <StatusIndicator status={supabaseResult} />
              </div>
              <div className="flex items-center justify-between">
                <p className="font-medium text-gray-700">2. Vercel Frontend → Railway Backend → Neo4j DB Write</p>
                <StatusIndicator status={neo4jResult} />
              </div>
            </div>

            <div className="text-center">
                <button
                onClick={handleRunTest}
                disabled={testStatus === 'running'}
                className="w-full px-6 py-3 text-lg font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                {testStatus === 'running' ? 'Test in Progress...' : 'Run System Test'}
                </button>
            </div>
            {errorMessage && (
                <div className="p-4 mt-4 text-center text-red-800 bg-red-100 border border-red-200 rounded-lg">
                    <p className="font-bold">An error occurred:</p>
                    <p>{errorMessage}</p>
                </div>
            )}
          </div>
        </div>
      );
    }
    