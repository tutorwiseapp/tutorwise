import React from 'react';
import Card from '@/app/components/ui/data-display/Card';
import styles from './StatGrid.module.css';

interface Stat {
  title: string;
  value: string;
  icon: React.ReactNode;
}

interface StatGridProps {
  stats: Stat[];
}

const StatGrid = ({ stats }: StatGridProps) => {
  return (
    <div className={styles.statGrid}>
      {stats.map((stat, index) => (
        <Card key={index} className={styles.statCard}>
          <div className={styles.statIcon}>{stat.icon}</div>
          <div className={styles.statContent}>
            <p className={styles.statTitle}>{stat.title}</p>
            <h3 className={styles.statValue}>{stat.value}</h3>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default StatGrid;