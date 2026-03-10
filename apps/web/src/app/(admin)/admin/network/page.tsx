'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import HubPageLayout from '@/app/components/hub/layout/HubPageLayout';
import HubHeader from '@/app/components/hub/layout/HubHeader';
import { Network, Building2, GitBranch, TrendingUp } from 'lucide-react';
import styles from './page.module.css';

// Force dynamic rendering for admin pages
export const dynamic = 'force-dynamic';

// ── Types ────────────────────────────────────────────────────────────────────

interface TrendPoint {
  date: string;
  new_referrals: number;
  converted: number;
  k_coefficient: number;
}

interface NetworkHealth {
  avg_depth: number | null;
  max_depth: number | null;
  hub_count: number | null;
  ghost_rate_pct: number | null;
  delegation_adoption_pct: number | null;
  velocity_change_pct: number | null;
  last_30_days_trend: TrendPoint[];
}

interface OrgHealth {
  id: string;
  name: string;
  member_count: number;
  health_score: number | null;
  status: 'healthy' | 'at-risk' | 'needs-attention';
}

interface TopReferrer {
  profile_id: string;
  full_name: string;
  role: string;
  lifetime_commission_pence: number;
  referral_count: number;
}

interface Attribution {
  top_referrers: TopReferrer[];
  total_attributed_pence: number;
}

interface NetworkIntelligence {
  network_health: NetworkHealth;
  organisations: OrgHealth[];
  attribution: Attribution;
}

type NetworkTab = 'health' | 'organisations' | 'attribution';

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(value: number | null | undefined): string {
  if (value == null) return '—';
  return value.toLocaleString();
}

function fmtPct(value: number | null | undefined): string {
  if (value == null) return '—';
  return `${Number(value).toFixed(1)}%`;
}

function fmtPounds(pence: number): string {
  const pounds = (pence / 100).toFixed(2);
  return `£${parseFloat(pounds).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  } catch {
    return iso;
  }
}

// ── Status badge colors ───────────────────────────────────────────────────────

const STATUS_COLORS: Record<OrgHealth['status'], string> = {
  'healthy':         '#059669',
  'at-risk':         '#dc2626',
  'needs-attention': '#d97706',
};

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.statCard}>
      <div className={styles.statValue}>{value}</div>
      <div className={styles.statLabel}>{label}</div>
    </div>
  );
}

// ── Network Health Tab ────────────────────────────────────────────────────────

function NetworkHealthTab({ data }: { data: NetworkHealth }) {
  const trend = data.last_30_days_trend ?? [];

  return (
    <div>
      <div className={styles.statGrid}>
        <StatCard label="Avg Depth" value={data.avg_depth != null ? Number(data.avg_depth).toFixed(2) : '—'} />
        <StatCard label="Max Depth" value={fmt(data.max_depth)} />
        <StatCard label="Hub Nodes" value={fmt(data.hub_count)} />
        <StatCard label="Ghost Rate" value={fmtPct(data.ghost_rate_pct)} />
        <StatCard label="Delegation Adoption" value={fmtPct(data.delegation_adoption_pct)} />
        <StatCard
          label="Velocity Change"
          value={
            data.velocity_change_pct != null
              ? `${Number(data.velocity_change_pct) > 0 ? '+' : ''}${Number(data.velocity_change_pct).toFixed(1)}%`
              : '—'
          }
        />
      </div>

      {trend.length > 0 && (
        <>
          <h4 className={styles.sectionHeading}>Last 30 days trend</h4>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>New Referrals</th>
                  <th>Converted</th>
                  <th>K Coefficient</th>
                </tr>
              </thead>
              <tbody>
                {trend.map((row) => (
                  <tr key={row.date}>
                    <td>{fmtDate(row.date)}</td>
                    <td>{fmt(row.new_referrals)}</td>
                    <td>{fmt(row.converted)}</td>
                    <td>{Number(row.k_coefficient).toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// ── Organisations Tab ─────────────────────────────────────────────────────────

function OrganisationsTab({ data }: { data: OrgHealth[] }) {
  // Sort: healthy first, then by health_score desc
  const sorted = [...data].sort((a, b) => {
    if (a.status === b.status) {
      return (b.health_score ?? 0) - (a.health_score ?? 0);
    }
    const order: OrgHealth['status'][] = ['healthy', 'needs-attention', 'at-risk'];
    return order.indexOf(a.status) - order.indexOf(b.status);
  });

  if (sorted.length === 0) {
    return (
      <div className={styles.loading}>No organisation data available.</div>
    );
  }

  return (
    <div>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Organisation</th>
              <th>Members</th>
              <th>Health Score</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((org) => (
              <tr key={org.id}>
                <td>{org.name}</td>
                <td>{fmt(org.member_count)}</td>
                <td>{org.health_score != null ? Number(org.health_score).toFixed(1) : '—'}</td>
                <td>
                  <span
                    className={styles.statusBadge}
                    style={{ background: STATUS_COLORS[org.status] ?? '#6b7280' }}
                  >
                    {org.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={styles.infoNote}>
        Dormancy pipeline: Organisations marked as "at-risk" with no delegation activity in the
        last 30 days are candidates for automated re-engagement nudges via the Conductor workflow.
      </div>
    </div>
  );
}

// ── Attribution Tab ───────────────────────────────────────────────────────────

function AttributionTab({ data }: { data: Attribution }) {
  const referrers = data.top_referrers ?? [];

  return (
    <div>
      {referrers.length === 0 ? (
        <div className={styles.loading}>No attribution data available.</div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Referrer</th>
                <th>Role</th>
                <th>Referrals</th>
                <th>Lifetime Commission</th>
              </tr>
            </thead>
            <tbody>
              {referrers.map((r) => (
                <tr key={r.profile_id}>
                  <td>{r.full_name}</td>
                  <td>{r.role}</td>
                  <td>{fmt(r.referral_count)}</td>
                  <td>{fmtPounds(r.lifetime_commission_pence)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className={styles.attributionTotal}>
        <div>
          <div className={styles.attributionTotalValue}>
            {fmtPounds(data.total_attributed_pence ?? 0)}
          </div>
          <div className={styles.attributionTotalLabel}>Total attributed commission</div>
        </div>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

const TABS: { id: NetworkTab; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { id: 'health',        label: 'Network Health', icon: Network },
  { id: 'organisations', label: 'Organisation',   icon: Building2 },
  { id: 'attribution',   label: 'Attribution',    icon: GitBranch },
];

export default function NetworkIntelligencePage() {
  const [activeTab, setActiveTab] = useState<NetworkTab>('health');

  const { data, isFetching, error } = useQuery<NetworkIntelligence>({
    queryKey: ['network-intelligence'],
    queryFn: async () => {
      const res = await fetch('/api/admin/network/intelligence');
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      const json = await res.json();
      return json.data ?? json;
    },
    staleTime: 5 * 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  return (
    <HubPageLayout
      header={
        <HubHeader
          title="Network Intelligence"
          subtitle="Referral network health, organisation performance and attribution analytics"
        />
      }
    >
      {/* Tab bar */}
      <div className={styles.tabBar}>
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`${styles.tab} ${activeTab === id ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(id)}
            type="button"
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className={styles.error}>
          {error instanceof Error ? error.message : 'Failed to load network intelligence'}
        </div>
      )}

      {/* Loading */}
      {isFetching && !data && (
        <div className={styles.loading}>Loading network intelligence…</div>
      )}

      {/* Tab content */}
      {data && (
        <>
          {activeTab === 'health' && (
            <NetworkHealthTab data={data.network_health} />
          )}
          {activeTab === 'organisations' && (
            <OrganisationsTab data={data.organisations} />
          )}
          {activeTab === 'attribution' && (
            <AttributionTab data={data.attribution} />
          )}
        </>
      )}
    </HubPageLayout>
  );
}
