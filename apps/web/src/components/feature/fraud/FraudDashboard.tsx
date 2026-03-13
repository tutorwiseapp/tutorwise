'use client';

import { useEffect, useState } from 'react';

interface FraudStats {
  pending_investigations: number;
  confirmed_frauds: number;
  false_positives: number;
  high_severity_pending: number;
  total_blocked_commission: number;
}

interface FraudSignal {
  id: string;
  signal_type: string;
  severity: string;
  signal_data: any;
  created_at: string;
  referral_id: string;
}

export function FraudDashboard() {
  const [stats, setStats] = useState<FraudStats | null>(null);
  const [signals, setSignals] = useState<FraudSignal[]>([]);

  useEffect(() => {
    fetchStats();
    fetchSignals();
  }, []);

  const fetchStats = async () => {
    const res = await fetch('/api/fraud/stats');
    const data = await res.json();
    setStats(data);
  };

  const fetchSignals = async () => {
    const res = await fetch('/api/fraud/signals?status=pending&limit=10');
    const data = await res.json();
    setSignals(data);
  };

  const investigateSignal = async (signalId: string, resolution: string) => {
    await fetch(`/api/fraud/signals/${signalId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: resolution }),
    });
    fetchStats();
    fetchSignals();
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <div className="p-4 border rounded">
          <div className="text-sm text-gray-600">Pending</div>
          <div className="text-3xl font-bold">{stats?.pending_investigations || 0}</div>
        </div>
        <div className="p-4 border rounded">
          <div className="text-sm text-gray-600">High Severity</div>
          <div className="text-3xl font-bold text-orange-600">{stats?.high_severity_pending || 0}</div>
        </div>
        <div className="p-4 border rounded">
          <div className="text-sm text-gray-600">Confirmed Frauds</div>
          <div className="text-3xl font-bold text-red-600">{stats?.confirmed_frauds || 0}</div>
        </div>
        <div className="p-4 border rounded">
          <div className="text-sm text-gray-600">Blocked Commission</div>
          <div className="text-3xl font-bold">£{stats?.total_blocked_commission.toFixed(2) || '0.00'}</div>
        </div>
      </div>

      <div className="border rounded">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Pending Investigations</h3>
        </div>
        <div className="divide-y">
          {signals.map((signal) => (
            <div key={signal.id} className="p-4 flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded ${getSeverityColor(signal.severity)}`}>
                    {signal.severity}
                  </span>
                  <span className="font-medium">{signal.signal_type.replace('_', ' ')}</span>
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {JSON.stringify(signal.signal_data, null, 2).substring(0, 100)}...
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {new Date(signal.created_at).toLocaleString()}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => investigateSignal(signal.id, 'confirmed_fraud')}
                  className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Confirm Fraud
                </button>
                <button
                  onClick={() => investigateSignal(signal.id, 'false_positive')}
                  className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                >
                  False Positive
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
