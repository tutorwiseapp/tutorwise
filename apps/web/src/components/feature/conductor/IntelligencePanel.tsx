'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  RefreshCw, TrendingUp, Users, BookOpen, Search, ShoppingCart,
  List, DollarSign, Monitor, Share2, Activity,
} from 'lucide-react';
import styles from './IntelligencePanel.module.css';

// ── Sub-tab config ──────────────────────────────────────────────────────────

type IntelTab =
  | 'caas' | 'resources' | 'seo' | 'signal' | 'marketplace'
  | 'listings' | 'bookings' | 'financials' | 'virtualspace' | 'referral';

const INTEL_TABS: { id: IntelTab; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { id: 'caas',         label: 'CaaS',        icon: Users },
  { id: 'resources',   label: 'Resources',   icon: BookOpen },
  { id: 'seo',         label: 'SEO',         icon: Search },
  { id: 'signal',      label: 'Signal',      icon: Activity },
  { id: 'marketplace', label: 'Marketplace', icon: ShoppingCart },
  { id: 'listings',    label: 'Listings',    icon: List },
  { id: 'bookings',    label: 'Bookings',    icon: TrendingUp },
  { id: 'financials',  label: 'Financials',  icon: DollarSign },
  { id: 'virtualspace',label: 'VirtualSpace',icon: Monitor },
  { id: 'referral',    label: 'Referral',    icon: Share2 },
];

const TAB_ENDPOINTS: Record<IntelTab, string> = {
  caas:         '/api/admin/caas/analytics',
  resources:    '/api/admin/resources/intelligence',
  seo:          '/api/admin/seo/intelligence',
  signal:       '/api/admin/signal/intelligence',
  marketplace:  '/api/admin/signal/marketplace',
  listings:     '/api/admin/listings/intelligence',
  bookings:     '/api/admin/bookings/intelligence',
  financials:   '/api/admin/financials/intelligence',
  virtualspace: '/api/admin/virtualspace/intelligence',
  referral:     '/api/admin/referrals/analytics',
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function fmt(value: unknown): string {
  if (value == null) return '—';
  if (typeof value === 'number') return value.toLocaleString();
  return String(value);
}

function fmtPence(pence: unknown): string {
  if (pence == null) return '—';
  const pounds = (Number(pence) / 100).toFixed(2);
  return `£${parseFloat(pounds).toLocaleString()}`;
}

function fmtPct(value: unknown): string {
  if (value == null) return '—';
  return `${Number(value).toFixed(1)}%`;
}

// ── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className={styles.statCard}>
      <div className={styles.statValue}>{value}</div>
      <div className={styles.statLabel}>{label}</div>
      {sub && <div className={styles.statSub}>{sub}</div>}
    </div>
  );
}

// ── Section renderers ────────────────────────────────────────────────────────

function CaaSSection({ data }: { data: any }) {
  const latest = data?.latest;
  const byRole = data?.byRole ?? [];
  if (!latest) return <p className={styles.empty}>No CaaS metrics yet. Run the pg_cron at 05:30 UTC.</p>;

  return (
    <div>
      <div className={styles.statGrid}>
        <StatCard label="Avg CaaS Score" value={fmt(latest.avg_caas_score)} />
        <StatCard label="Band: Star" value={fmt(latest.star_count)} />
        <StatCard label="Band: Active" value={fmt(latest.active_count)} />
        <StatCard label="Band: Provisional" value={fmt(latest.provisional_count)} sub="needs verification" />
        <StatCard label="Stale Scores" value={fmt(latest.stale_count)} sub="not recalculated 30d+" />
        <StatCard label="Snapshot Date" value={latest.snapshot_date ?? '—'} />
      </div>
      {byRole.length > 0 && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th>Role</th><th>Avg Score</th><th>Provisional</th><th>Stale</th></tr></thead>
            <tbody>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {byRole.map((r: any) => (
                <tr key={r.role_type}>
                  <td>{r.role_type}</td>
                  <td>{fmt(r.avg_caas_score)}</td>
                  <td>{fmt(r.provisional_count)}</td>
                  <td>{fmt(r.stale_count)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ResourcesSection({ data }: { data: any }) {
  const latest = data?.health?.latest;
  const band = data?.health?.bandBreakdown ?? {};
  const editorial = data?.editorial ?? {};
  const opportunities = editorial.opportunityArticles ?? [];
  const hubGaps = editorial.hubsNeedingSpokes ?? [];

  if (!latest) return <p className={styles.empty}>No resources metrics yet. Run the pg_cron at 04:30 UTC.</p>;

  return (
    <div>
      <div className={styles.statGrid}>
        <StatCard label="Published Articles" value={fmt(latest.published_articles)} />
        <StatCard label="SEO Ready (≥70)" value={fmt(latest.seo_ready_articles)} />
        <StatCard label="Stars" value={fmt(band['Star'] ?? 0)} sub="intelligence band" />
        <StatCard label="Dead Weight" value={fmt(band['Dead Weight'] ?? 0)} sub="need attention" />
        <StatCard label="Avg Days Stale" value={fmt(latest.avg_days_stale)} />
        <StatCard label="Hub Count" value={fmt(latest.hub_count)} />
      </div>
      {opportunities.length > 0 && (
        <>
          <h4 className={styles.subHeading}>Opportunity Articles</h4>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>Article ID</th><th>Score</th><th>Band</th><th>Views 30d</th><th>Trend</th></tr></thead>
              <tbody>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {opportunities.slice(0, 10).map((a: any) => (
                  <tr key={a.article_id}>
                    <td className={styles.mono}>{a.article_id?.slice(0, 8)}…</td>
                    <td>{fmt(a.score)}</td>
                    <td>{a.band}</td>
                    <td>{fmt(a.views_30d)}</td>
                    <td>{a.traffic_trend}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {hubGaps.length > 0 && (
        <>
          <h4 className={styles.subHeading}>Hubs Needing Spokes</h4>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>Subject</th><th>Spoke Count</th><th>Status</th></tr></thead>
              <tbody>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {hubGaps.map((h: any) => (
                  <tr key={h.id}>
                    <td>{h.subject}</td>
                    <td>{fmt(h.spoke_count)}</td>
                    <td>{h.status}</td>
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

function SEOSection({ data }: { data: any }) {
  const latest = data?.health?.latest;
  const topKw = data?.health?.topKeywords ?? [];
  const opps = data?.opportunities?.keywords ?? [];

  if (!latest) return <p className={styles.empty}>No SEO metrics yet. Run the pg_cron at 05:00 UTC.</p>;

  return (
    <div>
      <div className={styles.statGrid}>
        <StatCard label="Keywords Tracked" value={fmt(latest.total_keywords)} />
        <StatCard label="Top-3 Keywords" value={fmt(latest.top3_count)} />
        <StatCard label="Page-1 (1–10)" value={fmt(latest.page1_count)} />
        <StatCard label="Avg Position" value={latest.avg_position ? Number(latest.avg_position).toFixed(1) : '—'} />
        <StatCard label="Position Δ (vs yesterday)" value={latest.avg_position_delta != null ? (Number(latest.avg_position_delta) > 0 ? `+${Number(latest.avg_position_delta).toFixed(1)}` : String(Number(latest.avg_position_delta).toFixed(1))) : '—'} sub="lower = better" />
        <StatCard label="Backlinks" value={fmt(latest.total_backlinks)} />
      </div>
      {opps.length > 0 && (
        <>
          <h4 className={styles.subHeading}>Page-1 Chase (pos 6–20)</h4>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>Keyword</th><th>Position</th><th>Search Volume</th><th>Clicks 28d</th></tr></thead>
              <tbody>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {opps.slice(0, 10).map((k: any) => (
                  <tr key={k.keyword}>
                    <td>{k.keyword}</td>
                    <td>{fmt(k.position)}</td>
                    <td>{fmt(k.search_volume)}</td>
                    <td>{fmt(k.clicks_28d)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {topKw.length > 0 && (
        <>
          <h4 className={styles.subHeading}>Top-Ranked Keywords</h4>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>Keyword</th><th>Position</th><th>Clicks 28d</th><th>CTR</th></tr></thead>
              <tbody>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {topKw.slice(0, 10).map((k: any) => (
                  <tr key={k.keyword}>
                    <td>{k.keyword}</td>
                    <td>{fmt(k.position)}</td>
                    <td>{fmt(k.clicks_28d)}</td>
                    <td>{fmtPct(k.ctr_pct)}</td>
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

function SignalSection({ data }: { data: any }) {
  const top = data?.topPerformers ?? [];
  const dead = data?.deadWeight ?? [];

  return (
    <div>
      <div className={styles.statGrid}>
        <StatCard label="Star Articles" value={fmt(top.length)} sub="score ≥ 80" />
        <StatCard label="Dead Weight" value={fmt(dead.length)} sub="score < 20" />
      </div>
      {top.length > 0 && (
        <>
          <h4 className={styles.subHeading}>Top Performers</h4>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>Article ID</th><th>Score</th><th>Conv %</th><th>Revenue 30d</th><th>Views 30d</th></tr></thead>
              <tbody>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {top.slice(0, 10).map((a: any) => (
                  <tr key={a.article_id}>
                    <td className={styles.mono}>{a.article_id?.slice(0, 8)}…</td>
                    <td>{fmt(a.score)}</td>
                    <td>{fmtPct(a.conv_rate_pct)}</td>
                    <td>{fmtPence(a.revenue_30d_pence)}</td>
                    <td>{fmt(a.views_30d)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {dead.length > 0 && (
        <>
          <h4 className={styles.subHeading}>Dead Weight (candidates for refresh/removal)</h4>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>Article ID</th><th>Score</th><th>Days Stale</th><th>Views 30d</th><th>Trend</th></tr></thead>
              <tbody>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {dead.slice(0, 10).map((a: any) => (
                  <tr key={a.article_id}>
                    <td className={styles.mono}>{a.article_id?.slice(0, 8)}…</td>
                    <td>{fmt(a.score)}</td>
                    <td>{fmt(a.days_stale)}</td>
                    <td>{fmt(a.views_30d)}</td>
                    <td>{a.traffic_trend}</td>
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

function MarketplaceSection({ data }: { data: any }) {
  const latest = data?.health?.latest;
  const gaps = data?.gap?.gaps ?? [];

  if (!latest) return <p className={styles.empty}>No marketplace metrics yet. Run the pg_cron at 06:00 UTC.</p>;

  return (
    <div>
      <div className={styles.statGrid}>
        <StatCard label="Active Tutors" value={fmt(latest.active_tutors)} />
        <StatCard label="Active Listings" value={fmt(latest.active_listings)} />
        <StatCard label="Zero-Result Rate" value={fmtPct(latest.zero_result_rate_pct)} sub="searches with no results" />
        <StatCard label="Searches (30d)" value={fmt(latest.total_searches_30d)} />
        <StatCard label="Listing-to-Booking Rate" value={fmtPct(latest.listing_booking_rate_pct)} />
        <StatCard label="AI Tutor Listings" value={fmt(latest.ai_tutor_listings)} />
      </div>
      {gaps.length > 0 && (
        <>
          <h4 className={styles.subHeading}>Supply/Demand Gaps (zero-result rate &gt; 20%)</h4>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>Subject</th><th>Searches</th><th>Zero-Result Rate</th><th>Active Listings</th></tr></thead>
              <tbody>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {gaps.map((g: any) => (
                  <tr key={g.subject}>
                    <td>{g.subject}</td>
                    <td>{fmt(g.searches)}</td>
                    <td>{fmtPct(g.zeroResultRate)}</td>
                    <td>{fmt(g.activeListings)}</td>
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

function ListingsSection({ data }: { data: any }) {
  const latest = data?.health?.latest;
  const incomplete = data?.health?.incompleteListings;
  const pricing = data?.pricing?.pricing ?? [];

  if (!latest) return <p className={styles.empty}>No listings metrics yet. Run the pg_cron at 07:00 UTC.</p>;

  return (
    <div>
      <div className={styles.statGrid}>
        <StatCard label="Active Listings" value={fmt(latest.active_listings)} />
        <StatCard label="Avg Completeness" value={fmtPct(latest.avg_completeness_score)} />
        <StatCard label="Incomplete (&lt; 70)" value={fmt(incomplete)} sub="need nudge" />
        <StatCard label="SEO Eligible" value={fmt(latest.seo_eligible_count)} />
        <StatCard label="Avg Hourly Rate" value={latest.avg_hourly_rate ? `£${Number(latest.avg_hourly_rate).toFixed(0)}` : '—'} />
        <StatCard label="New Listings 30d" value={fmt(latest.new_listings_30d)} />
      </div>
      {pricing.length > 0 && (
        <>
          <h4 className={styles.subHeading}>Pricing by Subject</h4>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>Subject</th><th>Level</th><th>Count</th><th>Min</th><th>Avg</th><th>Max</th></tr></thead>
              <tbody>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {pricing.slice(0, 15).map((p: any) => (
                  <tr key={`${p.subject}-${p.level}`}>
                    <td>{p.subject}</td>
                    <td>{p.level}</td>
                    <td>{fmt(p.count)}</td>
                    <td>£{fmt(p.min)}</td>
                    <td>£{fmt(p.avg)}</td>
                    <td>£{fmt(p.max)}</td>
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

function BookingsSection({ data }: { data: any }) {
  const trend = data?.trend ?? [];
  const latest = trend[0];

  if (!latest) return <p className={styles.empty}>No booking metrics yet. Run the pg_cron at 06:30 UTC.</p>;

  return (
    <div>
      <div className={styles.statGrid}>
        <StatCard label="Total Bookings 30d" value={fmt(latest.total_bookings_30d)} />
        <StatCard label="Completed 30d" value={fmt(latest.completed_30d)} />
        <StatCard label="Cancellation Rate" value={fmtPct(latest.cancellation_rate_pct)} />
        <StatCard label="No-Show Rate" value={fmtPct(latest.no_show_rate_pct)} />
        <StatCard label="GMV 30d" value={fmtPence(latest.gmv_30d_pence)} />
        <StatCard label="Stalled &gt;48h" value={fmt(data?.liveStalls48h ?? latest.stalled_over_48h)} sub="live" />
        <StatCard label="Active Disputes" value={fmt(data?.liveDisputes ?? latest.disputed_count)} sub="live" />
        <StatCard label="High-Cancel Tutors" value={fmt(latest.high_cancel_tutors)} />
      </div>
    </div>
  );
}

function FinancialsSection({ data }: { data: any }) {
  const trend = data?.trend ?? [];
  const latest = trend[0];

  if (!latest) return <p className={styles.empty}>No financial metrics yet. Run the pg_cron at 07:30 UTC.</p>;

  return (
    <div>
      <div className={styles.statGrid}>
        <StatCard label="In Clearing" value={fmtPence(latest.total_in_clearing_pence)} />
        <StatCard label="Stalled &gt;14d" value={fmt(latest.stalled_over_14d)} sub="clearing items" />
        <StatCard label="Net Revenue 30d" value={fmtPence(latest.net_platform_revenue_30d_pence)} />
        <StatCard label="Paid Out 30d" value={fmtPence(latest.total_paid_out_30d_pence)} />
        <StatCard label="Refund Rate" value={fmtPct(latest.refund_rate_pct)} />
        <StatCard label="Open Disputes" value={fmt(latest.open_disputes)} />
        <StatCard label="Unreversed Refunds" value={fmt(latest.unreversed_refunds)} sub="action needed" />
        <StatCard label="Duplicate Payout Risk" value={fmt(latest.duplicate_payout_risk)} sub="needs review" />
      </div>
    </div>
  );
}

function VirtualSpaceSection({ data }: { data: any }) {
  const trend = data?.trend ?? [];
  const latest = trend[0];

  if (!latest) return <p className={styles.empty}>No VirtualSpace metrics yet. Run the pg_cron at 08:00 UTC.</p>;

  return (
    <div>
      <div className={styles.statGrid}>
        <StatCard label="Booking Sessions 30d" value={fmt(latest.booking_sessions_30d)} />
        <StatCard label="Free Help Sessions 30d" value={fmt(latest.free_help_sessions_30d)} />
        <StatCard label="Adoption Rate" value={fmtPct(latest.adoption_rate_pct)} sub="of completed bookings" />
        <StatCard label="Completion Rate" value={fmtPct(latest.completion_rate_pct)} />
        <StatCard label="Free-Help Conversion" value={fmtPct(latest.free_help_conversion_pct)} sub="→ booking" />
        <StatCard label="Sessions Last 24h" value={fmt(data?.sessionsLast24h)} sub="live" />
      </div>
    </div>
  );
}

function ReferralSection({ data }: { data: any }) {
  const trend = data?.trend ?? [];
  const latest = trend[0];
  const network = data?.network;
  const funnel = data?.funnelLast30d ?? {};

  return (
    <div>
      <div className={styles.statGrid}>
        <StatCard label="K Coefficient" value={latest?.k_coefficient != null ? Number(latest.k_coefficient).toFixed(4) : '—'} sub="target ≥ 0.6" />
        <StatCard label="Invitations/User (I)" value={latest?.invitations_per_user != null ? Number(latest.invitations_per_user).toFixed(4) : '—'} />
        <StatCard label="Signup Rate (C1)" value={latest?.signup_rate != null ? fmtPct(Number(latest.signup_rate) * 100) : '—'} />
        <StatCard label="Booking Rate (C2)" value={latest?.booking_rate != null ? fmtPct(Number(latest.booking_rate) * 100) : '—'} />
        <StatCard label="Total Referred Users" value={fmt(network?.total_referred_users)} />
        <StatCard label="Ghost Rate" value={fmtPct(network?.ghost_rate_pct)} sub="no signup after 7d" />
        <StatCard label="Hub Nodes (≥10 refs)" value={fmt(network?.hub_count)} />
        <StatCard label="Avg Network Depth" value={network?.avg_depth != null ? Number(network.avg_depth).toFixed(2) : '—'} />
      </div>
      {Object.keys(funnel).length > 0 && (
        <>
          <h4 className={styles.subHeading}>Funnel (last 30d)</h4>
          <div className={styles.statGrid}>
            {Object.entries(funnel).map(([status, count]) => (
              <StatCard key={status} label={status} value={fmt(count)} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Section router ───────────────────────────────────────────────────────────

function SectionContent({ tab, data }: { tab: IntelTab; data: any }) {
  if (!data) return <p className={styles.empty}>No data loaded.</p>;
  switch (tab) {
    case 'caas':         return <CaaSSection data={data} />;
    case 'resources':    return <ResourcesSection data={data} />;
    case 'seo':          return <SEOSection data={data} />;
    case 'signal':       return <SignalSection data={data} />;
    case 'marketplace':  return <MarketplaceSection data={data} />;
    case 'listings':     return <ListingsSection data={data} />;
    case 'bookings':     return <BookingsSection data={data} />;
    case 'financials':   return <FinancialsSection data={data} />;
    case 'virtualspace': return <VirtualSpaceSection data={data} />;
    case 'referral':     return <ReferralSection data={data} />;
  }
}

// ── Main Panel ───────────────────────────────────────────────────────────────

export function IntelligencePanel() {
  const [activeTab, setActiveTab] = useState<IntelTab>('caas');

  // One query per active tab — React Query caches each tab's result for 5 min.
  // Switching tabs uses cached data instantly; re-fetches only when stale.
  const { data, isFetching, error, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['intel', activeTab],
    queryFn: async () => {
      const res = await fetch(TAB_ENDPOINTS[activeTab]);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      return json.data ?? json;
    },
    staleTime: 5 * 60_000,   // 5 min — analytics don't need constant refresh
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  const currentTab = INTEL_TABS.find((t) => t.id === activeTab)!;

  return (
    <div className={styles.panel}>
      {/* Sub-tab bar */}
      <div className={styles.tabBar}>
        {INTEL_TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`${styles.tab} ${activeTab === id ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(id)}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {/* Content area */}
      <div className={styles.content}>
        <div className={styles.contentHeader}>
          <h3 className={styles.contentTitle}>
            <currentTab.icon size={16} />
            {currentTab.label} Intelligence
          </h3>
          <div className={styles.headerRight}>
            {dataUpdatedAt > 0 && (
              <span className={styles.lastFetched}>
                Updated {new Date(dataUpdatedAt).toLocaleTimeString()}
              </span>
            )}
            <button
              className={styles.refreshBtn}
              onClick={() => refetch()}
              disabled={isFetching}
              title="Refresh"
            >
              <RefreshCw size={14} className={isFetching ? styles.spinning : undefined} />
            </button>
          </div>
        </div>

        {error && (
          <div className={styles.error}>
            {error instanceof Error ? error.message : 'Failed to load data'}
          </div>
        )}

        {isFetching && !data ? (
          <div className={styles.loading}>Loading {currentTab.label} intelligence…</div>
        ) : (
          <SectionContent tab={activeTab} data={data} />
        )}
      </div>
    </div>
  );
}
