/**
 * Filename: apps/web/src/app/components/help-centre/widgets/SystemStatusWidget.tsx
 * Purpose: Display current system status and known issues
 * Created: 2025-01-19
 */

'use client';

import { useEffect, useState } from 'react';
import styles from './widgets.module.css';

interface SystemStatus {
  operational: boolean;
  message?: string;
  incidents?: {
    title: string;
    severity: 'minor' | 'major' | 'critical';
    status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
    updatedAt: string;
  }[];
}

export default function SystemStatusWidget() {
  const [status, setStatus] = useState<SystemStatus>({ operational: true });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch system status from API or status page
    // For now, using mock data
    const fetchStatus = async () => {
      try {
        // In production, fetch from /api/health or external status page
        // const response = await fetch('/api/health');
        // const data = await response.json();

        // Mock: All systems operational
        setStatus({ operational: true });
      } catch (error) {
        console.error('Failed to fetch system status:', error);
        setStatus({ operational: true });
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatus();
    // Poll every 5 minutes
    const interval = setInterval(fetchStatus, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Don't render if operational and no incidents
  if (!isLoading && status.operational && !status.incidents?.length) {
    return null;
  }

  if (isLoading) {
    return null; // Or loading skeleton
  }

  return (
    <div className={styles.widget}>
      <div className={styles.widgetHeader}>
        <h3 className={styles.widgetTitle}>System Status</h3>
        <a
          href="https://status.tutorwise.com"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.statusLink}
        >
          View Status Page
        </a>
      </div>

      <div className={styles.widgetContent}>
        {status.operational && !status.incidents?.length ? (
          <div className={styles.statusOperational}>
            <div className={styles.statusIndicator} data-status="operational"></div>
            <span className={styles.statusText}>All Systems Operational</span>
          </div>
        ) : (
          <div className={styles.statusIssues}>
            <div className={styles.statusIndicator} data-status="degraded"></div>
            <span className={styles.statusText}>
              {status.message || 'Some services experiencing issues'}
            </span>
          </div>
        )}

        {status.incidents && status.incidents.length > 0 && (
          <div className={styles.incidents}>
            <h4 className={styles.incidentsTitle}>Active Incidents</h4>
            {status.incidents.map((incident, index) => (
              <div key={index} className={styles.incident} data-severity={incident.severity}>
                <div className={styles.incidentHeader}>
                  <span className={styles.incidentTitle}>{incident.title}</span>
                  <span className={styles.incidentStatus} data-status={incident.status}>
                    {incident.status.charAt(0).toUpperCase() + incident.status.slice(1)}
                  </span>
                </div>
                <div className={styles.incidentMeta}>
                  Updated {new Date(incident.updatedAt).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
