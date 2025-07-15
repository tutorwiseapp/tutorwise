import React from 'react';
import Card from '../Card'; // Reusing our base Card
import styles from './StatCard.module.css';

interface StatCardProps {
  title: string;
  value: string | number;
}

const StatCard = ({ title, value }: StatCardProps) => {
  return (
    <Card className={styles.statCard}>
      <h3 className={styles.title}>{title}</h3>
      <div className={styles.value}>{value}</div>
    </Card>
  );
};

export default StatCard;