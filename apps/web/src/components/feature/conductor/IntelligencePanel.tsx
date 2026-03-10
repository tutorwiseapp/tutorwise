'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  RefreshCw, TrendingUp, Users, BookOpen, Search, ShoppingCart,
  List, DollarSign, Monitor, Share2, Activity, BarChart2,
  Heart, Bot, Building2, Layers,
} from 'lucide-react';
import styles from './IntelligencePanel.module.css';

// ── Sub-tab config ──────────────────────────────────────────────────────────

type IntelTab =
  | 'caas' | 'resources' | 'seo' | 'signal' | 'marketplace'
  | 'listings' | 'bookings' | 'financials' | 'virtualspace' | 'referral'
  | 'retention' | 'ai_adoption' | 'org_conversion' | 'ai_studio';

const INTEL_TABS: { id: IntelTab; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { id: 'caas',          label: 'CaaS',        icon: Users },
  { id: 'resources',    label: 'Resources',   icon: BookOpen },
  { id: 'seo',          label: 'SEO',         icon: Search },
  { id: 'signal',       label: 'Signal',      icon: Activity },
  { id: 'marketplace',  label: 'Marketplace', icon: ShoppingCart },
  { id: 'listings',     label: 'Listings',    icon: List },
  { id: 'bookings',     label: 'Bookings',    icon: TrendingUp },
  { id: 'financials',   label: 'Financials',  icon: DollarSign },
  { id: 'virtualspace', label: 'VirtualSpace',icon: Monitor },
  { id: 'referral',     label: 'Referral',    icon: Share2 },
  { id: 'retention',    label: 'Retention',   icon: Heart },
  { id: 'ai_adoption',  label: 'AI Adoption', icon: Bot },
  { id: 'org_conversion', label: 'Orgs',      icon: Building2 },
  { id: 'ai_studio',    label: 'AI Studio',   icon: Layers },
];

const TAB_ENDPOINTS: Record<IntelTab, string> = {
  caas:          '/api/admin/caas/analytics',
  resources:     '/api/admin/resources/intelligence',
  seo:           '/api/admin/seo/intelligence',
  signal:        '/api/admin/signal/intelligence',
  marketplace:   '/api/admin/signal/marketplace',
  listings:      '/api/admin/listings/intelligence',
  bookings:      '/api/admin/bookings/intelligence',
  financials:    '/api/admin/financials/intelligence',
  virtualspace:  '/api/admin/virtualspace/intelligence',
  referral:      '/api/admin/referrals/analytics',
  retention:     '/api/admin/retention/intelligence',
  ai_adoption:   '/api/admin/ai/intelligence?view=adoption',
  org_conversion:'/api/admin/organisations/intelligence',
  ai_studio:     '/api/admin/ai/intelligence?view=studio',
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

// ── Inline Empty State ───────────────────────────────────────────────────────

function InlineEmpty({
  icon: Icon,
  message,
  hint,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  message: string;
  hint?: string;
}) {
  return (
    <div className={styles.empty}>
      <Icon size={32} className={styles.emptyIcon} />
      <span>{message}</span>
      {hint && <span className={styles.emptyHint}>{hint}</span>}
    </div>
  );
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
  if (!latest) return <InlineEmpty icon={Users} message="No CaaS metrics yet." hint="Populates daily at 05:30 UTC" />;

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

  if (!latest) return <InlineEmpty icon={BookOpen} message="No resources metrics yet." hint="Populates daily at 04:30 UTC" />;

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

  if (!latest) return <InlineEmpty icon={Search} message="No SEO metrics yet." hint="Populates daily at 05:00 UTC" />;

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

  if (!latest) return <InlineEmpty icon={ShoppingCart} message="No marketplace metrics yet." hint="Populates daily at 06:00 UTC" />;

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

  if (!latest) return <InlineEmpty icon={List} message="No listings metrics yet." hint="Populates daily at 07:00 UTC" />;

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

  if (!latest) return <InlineEmpty icon={TrendingUp} message="No booking metrics yet." hint="Populates daily at 06:30 UTC" />;

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

  if (!latest) return <InlineEmpty icon={DollarSign} message="No financial metrics yet." hint="Populates daily at 07:30 UTC" />;

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

  if (!latest) return <InlineEmpty icon={Monitor} message="No VirtualSpace metrics yet." hint="Populates daily at 08:00 UTC" />;

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

// ── Retention Section ────────────────────────────────────────────────────────

function AlertBadge({ severity }: { severity: string }) {
  const color = severity === 'critical' ? '#ef4444' : severity === 'warning' ? '#f59e0b' : '#3b82f6';
  return <span style={{ color, fontWeight: 600, marginRight: 4 }}>{severity === 'critical' ? '✖' : severity === 'warning' ? '⚠' : 'ℹ'}</span>;
}

function RetentionSection({ data }: { data: any }) {
  const cohorts = data?.cohorts;
  const churn = data?.churn_signals;
  const onboarding = data?.onboarding;
  const ltv = data?.ltv;
  const alerts: any[] = data?.alerts ?? [];

  if (!cohorts) return <InlineEmpty icon={Heart} message="No retention metrics yet." hint="Populates daily at 09:30 UTC" />;

  const roles: Array<{ key: string; label: string }> = [
    { key: 'tutor', label: 'Tutors' },
    { key: 'client', label: 'Clients' },
    { key: 'agent', label: 'Agents' },
    { key: 'organisation', label: 'Orgs' },
  ];

  return (
    <div>
      <h4 className={styles.subHeading}>User Lifecycle Cohorts</h4>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Role</th><th>Onboarding</th><th>Activated</th><th>Retained</th><th>Re-engage</th><th>Win-back</th>
            </tr>
          </thead>
          <tbody>
            {roles.map(({ key, label }) => {
              const c = cohorts[key] ?? {};
              return (
                <tr key={key}>
                  <td><strong>{label}</strong></td>
                  <td>{fmt(c.onboarding)}</td>
                  <td>{fmt(c.activated)}</td>
                  <td>{fmt(c.retained)}</td>
                  <td>{fmt(c.re_engagement)}</td>
                  <td>{fmt(c.win_back)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className={styles.statGrid}>
        <StatCard label="Score Drop Alerts (7d)" value={fmt(churn?.score_drop_alerts_7d)} sub="Growth Score drop > 5pts" />
        <StatCard label="High-Value At Risk" value={fmt(churn?.high_value_at_risk)} sub="retained users, drop > 10pts" />
        <StatCard label="Stuck Tutors >14d" value={fmt(onboarding?.stuck_tutors_14d)} sub="no booking yet" />
        <StatCard label="Stuck Clients >14d" value={fmt(onboarding?.stuck_clients_14d)} sub="no booking yet" />
        <StatCard label="Activation Rate 30d" value={onboarding?.activation_rate_30d != null ? fmtPct(onboarding.activation_rate_30d) : '—'} sub="target ≥ 40%" />
        <StatCard label="Avg Client Lifetime Bookings" value={ltv?.avg_bookings_per_client_lifetime != null ? Number(ltv.avg_bookings_per_client_lifetime).toFixed(1) : '—'} />
        <StatCard label="Referral vs Organic LTV" value={ltv?.referral_vs_organic_ltv_ratio != null ? `${Number(ltv.referral_vs_organic_ltv_ratio).toFixed(2)}x` : '—'} sub="referred / organic avg bookings" />
      </div>
      {alerts.length > 0 && (
        <>
          <h4 className={styles.subHeading}>Alerts</h4>
          <div>
            {alerts.map((a: any, i: number) => (
              <div key={i} style={{ padding: '6px 0', borderBottom: '1px solid #e5e7eb', fontSize: '0.875rem' }}>
                <AlertBadge severity={a.severity} />
                <strong>{a.message}</strong>
                {a.action && <span style={{ color: '#6b7280', marginLeft: 8 }}>→ {a.action}</span>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── AI Adoption Section ──────────────────────────────────────────────────────

function AIAdoptionSection({ data }: { data: any }) {
  const sage = data?.sage_pro;
  const growth = data?.growth_agent;
  const marketplace = data?.ai_marketplace;
  const combined = data?.combined;
  const alerts: any[] = data?.alerts ?? [];

  if (!marketplace) return <InlineEmpty icon={Bot} message="No AI adoption metrics yet." hint="Populates daily at 10:00 UTC" />;

  return (
    <div>
      <h4 className={styles.subHeading}>Sage Pro</h4>
      <div className={styles.statGrid}>
        <StatCard label="Active Subscribers" value={fmt(sage?.active_subscribers)} />
        <StatCard label="New (30d)" value={fmt(sage?.new_subscriptions_30d)} />
        <StatCard label="Churned (30d)" value={fmt(sage?.cancellations_30d)} />
        <StatCard label="Churn Rate" value={sage?.churn_rate != null ? fmtPct(sage.churn_rate) : '—'} />
        <StatCard label="MRR" value={fmtPence(sage?.mrr_pence)} />
        <StatCard label="Trial→Paid Rate" value={sage?.trial_to_paid_rate != null ? fmtPct(sage.trial_to_paid_rate) : '—'} />
      </div>
      <h4 className={styles.subHeading}>Growth Agent</h4>
      <div className={styles.statGrid}>
        <StatCard label="Active Subscribers" value={fmt(growth?.active_subscribers)} />
        <StatCard label="New (30d)" value={fmt(growth?.new_subscriptions_30d)} />
        <StatCard label="Churn Rate" value={growth?.churn_rate != null ? fmtPct(growth.churn_rate) : '—'} />
        <StatCard label="MRR" value={fmtPence(growth?.mrr_pence)} />
        <StatCard label="Sessions (30d)" value={fmt(growth?.sessions_30d)} />
        <StatCard label="Power Users" value={fmt(growth?.power_users_30d)} sub="> 5 sessions in 30d" />
        <StatCard label="Free Audit→Paid" value={growth?.free_audit_to_paid_rate != null ? fmtPct(growth.free_audit_to_paid_rate) : '—'} />
      </div>
      <h4 className={styles.subHeading}>AI Marketplace</h4>
      <div className={styles.statGrid}>
        <StatCard label="Active AI Agents" value={fmt(marketplace?.active_ai_agents)} />
        <StatCard label="AI Bookings (30d)" value={fmt(marketplace?.ai_bookings_30d)} />
        <StatCard label="AI GMV (30d)" value={fmtPence(marketplace?.ai_gmv_30d_pence)} />
        <StatCard label="AI Booking Share" value={marketplace?.ai_booking_share != null ? fmtPct(marketplace.ai_booking_share) : '—'} />
        <StatCard label="Agents 0 Bookings" value={fmt(marketplace?.ai_agents_with_0_bookings_30d)} sub="last 30d" />
        <StatCard label="Combined AI MRR" value={fmtPence(combined?.total_ai_mrr_pence)} />
        <StatCard label="AI Revenue Share" value={combined?.ai_revenue_share != null ? fmtPct(combined.ai_revenue_share) : '—'} />
      </div>
      {alerts.length > 0 && (
        <>
          <h4 className={styles.subHeading}>Alerts</h4>
          <div>
            {alerts.map((a: any, i: number) => (
              <div key={i} style={{ padding: '6px 0', borderBottom: '1px solid #e5e7eb', fontSize: '0.875rem' }}>
                <AlertBadge severity={a.severity} />
                <strong>{a.message}</strong>
                {a.action && <span style={{ color: '#6b7280', marginLeft: 8 }}>→ {a.action}</span>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Org Conversion Section ───────────────────────────────────────────────────

function OrgConversionSection({ data }: { data: any }) {
  const pipeline = data?.candidate_pipeline;
  const newOrgs = data?.new_orgs;
  const health = data?.org_health;
  const alerts: any[] = data?.alerts ?? [];

  if (!pipeline) return <InlineEmpty icon={Building2} message="No org conversion metrics yet." hint="Populates daily at 10:30 UTC" />;

  return (
    <div>
      <h4 className={styles.subHeading}>Candidate Pipeline</h4>
      <div className={styles.statGrid}>
        <StatCard label="Tier 1 (Emerging)" value={fmt(pipeline?.tier_1_candidates)} sub="Growth Score ≥ 60, 3+ managed" />
        <StatCard label="Tier 2 (Strong)" value={fmt(pipeline?.tier_2_candidates)} sub="Growth Score ≥ 75, 5+ managed" />
        <StatCard label="Tier 3 (Ready)" value={fmt(pipeline?.tier_3_ready)} sub="> 30d at Tier 2, no action" />
        <StatCard label="Nudged (30d)" value={fmt(pipeline?.candidates_nudged_30d)} />
        <StatCard label="Conversion Rate" value={pipeline?.conversion_rate_30d != null ? fmtPct(pipeline.conversion_rate_30d) : '—'} sub="nudge → org created" />
        <StatCard label="Avg Days to Convert" value={pipeline?.avg_days_nudge_to_creation != null ? `${Number(pipeline.avg_days_nudge_to_creation).toFixed(1)}d` : '—'} />
      </div>
      <h4 className={styles.subHeading}>New Orgs (30d)</h4>
      <div className={styles.statGrid}>
        <StatCard label="Created" value={fmt(newOrgs?.orgs_created_30d)} />
        <StatCard label="From Conductor Nudge" value={fmt(newOrgs?.orgs_from_conductor_nudge)} />
        <StatCard label="Organic" value={fmt(newOrgs?.organic_org_creation)} />
      </div>
      <h4 className={styles.subHeading}>Org Health</h4>
      <div className={styles.statGrid}>
        <StatCard label="Active Orgs" value={fmt(health?.total_active_orgs)} />
        <StatCard label="Onboarding Stall" value={fmt(health?.new_org_onboarding_stall)} sub="new orgs, no delegation in 7d" />
        <StatCard label="Avg Members/Org" value={health?.avg_members_per_org != null ? Number(health.avg_members_per_org).toFixed(1) : '—'} />
        <StatCard label="Avg Org Growth Score" value={health?.avg_org_growth_score != null ? Number(health.avg_org_growth_score).toFixed(1) : '—'} />
        <StatCard label="Struggling Orgs" value={fmt(health?.orgs_below_threshold)} sub="score < 40" />
      </div>
      {alerts.length > 0 && (
        <>
          <h4 className={styles.subHeading}>Alerts</h4>
          <div>
            {alerts.map((a: any, i: number) => (
              <div key={i} style={{ padding: '6px 0', borderBottom: '1px solid #e5e7eb', fontSize: '0.875rem' }}>
                <AlertBadge severity={a.severity} />
                <strong>{a.message}</strong>
                {a.action && <span style={{ color: '#6b7280', marginLeft: 8 }}>→ {a.action}</span>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── AI Studio Section ────────────────────────────────────────────────────────

function AIStudioSection({ data }: { data: any }) {
  const funnel = data?.funnel;
  const cohorts = data?.creator_cohorts;
  const quality = data?.quality;
  const revenue = data?.revenue;
  const alerts: any[] = data?.alerts ?? [];
  const topAgents: any[] = quality?.top_agents_by_bookings ?? [];

  if (!funnel) return <InlineEmpty icon={Layers} message="No AI Studio metrics yet." hint="Populates daily at 11:00 UTC" />;

  return (
    <div>
      <h4 className={styles.subHeading}>Creator Funnel (30d)</h4>
      <div className={styles.statGrid}>
        <StatCard label="Created" value={fmt(funnel?.created_30d)} />
        <StatCard label="Published" value={fmt(funnel?.published_30d)} />
        <StatCard label="Publish Rate" value={funnel?.publish_rate != null ? fmtPct(funnel.publish_rate) : '—'} sub="target ≥ 50%" />
        <StatCard label="First Booking Rate" value={funnel?.first_booking_rate != null ? fmtPct(funnel.first_booking_rate) : '—'} sub="within 14d of publish" />
        <StatCard label="Avg Days → Publish" value={funnel?.avg_days_create_to_publish != null ? `${Number(funnel.avg_days_create_to_publish).toFixed(1)}d` : '—'} />
        <StatCard label="Avg Days → First Booking" value={funnel?.avg_days_publish_to_first_booking != null ? `${Number(funnel.avg_days_publish_to_first_booking).toFixed(1)}d` : '—'} />
      </div>
      <h4 className={styles.subHeading}>Creator Cohorts</h4>
      <div className={styles.statGrid}>
        <StatCard label="Stuck in Draft (>7d)" value={fmt(cohorts?.stuck_in_draft)} />
        <StatCard label="Published, 0 Bookings (>14d)" value={fmt(cohorts?.published_zero_bookings_14d)} />
        <StatCard label="Active Earning" value={fmt(cohorts?.active_earning)} sub="≥1 booking in 30d" />
        <StatCard label="Scaling" value={fmt(cohorts?.scaling)} sub="3+/mo or 10+ total sessions" />
      </div>
      <h4 className={styles.subHeading}>Quality</h4>
      <div className={styles.statGrid}>
        <StatCard label="Avg Rating (all agents)" value={quality?.avg_rating_all_ai_agents != null ? Number(quality.avg_rating_all_ai_agents).toFixed(2) : '—'} />
        <StatCard label="Below Threshold" value={fmt(quality?.agents_below_threshold)} sub="avg rating < 4.0, ≥3 reviews" />
        <StatCard label="No Reviews Yet" value={fmt(quality?.agents_with_no_reviews)} />
        <StatCard label="AI GMV (30d)" value={fmtPence(revenue?.total_ai_gmv_30d_pence)} />
        <StatCard label="Avg Revenue/Agent" value={fmtPence(revenue?.avg_revenue_per_active_agent_pence)} sub="per month" />
        <StatCard label="Top 10% Revenue Share" value={revenue?.top_10_pct_revenue_share != null ? fmtPct(revenue.top_10_pct_revenue_share) : '—'} />
      </div>
      {topAgents.length > 0 && (
        <>
          <h4 className={styles.subHeading}>Top AI Agents</h4>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>Agent</th><th>Sessions</th><th>Avg Rating</th><th>Revenue</th></tr></thead>
              <tbody>
                {topAgents.slice(0, 10).map((a: any) => (
                  <tr key={a.agent_id}>
                    <td>{a.agent_name}</td>
                    <td>{fmt(a.bookings_30d)}</td>
                    <td>{a.avg_rating != null ? Number(a.avg_rating).toFixed(2) : '—'}</td>
                    <td>{fmtPence(a.revenue_30d_pence)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {alerts.length > 0 && (
        <>
          <h4 className={styles.subHeading}>Alerts</h4>
          <div>
            {alerts.map((a: any, i: number) => (
              <div key={i} style={{ padding: '6px 0', borderBottom: '1px solid #e5e7eb', fontSize: '0.875rem' }}>
                <AlertBadge severity={a.severity} />
                <strong>{a.message}</strong>
                {a.action && <span style={{ color: '#6b7280', marginLeft: 8 }}>→ {a.action}</span>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Section router ───────────────────────────────────────────────────────────

function SectionContent({ tab, data }: { tab: IntelTab; data: any }) {
  if (!data) return <InlineEmpty icon={BarChart2} message="No data loaded." />;
  switch (tab) {
    case 'caas':           return <CaaSSection data={data} />;
    case 'resources':      return <ResourcesSection data={data} />;
    case 'seo':            return <SEOSection data={data} />;
    case 'signal':         return <SignalSection data={data} />;
    case 'marketplace':    return <MarketplaceSection data={data} />;
    case 'listings':       return <ListingsSection data={data} />;
    case 'bookings':       return <BookingsSection data={data} />;
    case 'financials':     return <FinancialsSection data={data} />;
    case 'virtualspace':   return <VirtualSpaceSection data={data} />;
    case 'referral':       return <ReferralSection data={data} />;
    case 'retention':      return <RetentionSection data={data} />;
    case 'ai_adoption':    return <AIAdoptionSection data={data} />;
    case 'org_conversion': return <OrgConversionSection data={data} />;
    case 'ai_studio':      return <AIStudioSection data={data} />;
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

        <div className={styles.contentBody}>
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
    </div>
  );
}
