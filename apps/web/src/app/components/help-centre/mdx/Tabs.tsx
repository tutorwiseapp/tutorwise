/**
 * Filename: apps/web/src/app/components/help-centre/mdx/Tabs.tsx
 * Purpose: Tabs component for organizing content
 * Created: 2025-01-19
 */

'use client';

import { ReactNode, useState, Children, isValidElement } from 'react';
import styles from './Tabs.module.css';

interface TabProps {
  label: string;
  children: ReactNode;
}

function Tab({ children }: TabProps) {
  return <div>{children}</div>;
}

interface TabsProps {
  children: ReactNode;
  defaultTab?: number;
}

function Tabs({ children, defaultTab = 0 }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);

  // Extract tab labels and content
  const tabs = Children.toArray(children).filter(isValidElement);

  return (
    <div className={styles.tabs}>
      <div className={styles.tabList} role="tablist">
        {tabs.map((tab, index) => {
          if (!isValidElement(tab)) return null;
          const label = tab.props.label;

          return (
            <button
              key={index}
              className={`${styles.tabButton} ${activeTab === index ? styles.active : ''}`}
              onClick={() => setActiveTab(index)}
              role="tab"
              aria-selected={activeTab === index}
              aria-controls={`tabpanel-${index}`}
              id={`tab-${index}`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className={styles.tabPanels}>
        {tabs.map((tab, index) => {
          if (!isValidElement(tab)) return null;

          return (
            <div
              key={index}
              className={`${styles.tabPanel} ${activeTab === index ? styles.activePanel : ''}`}
              role="tabpanel"
              id={`tabpanel-${index}`}
              aria-labelledby={`tab-${index}`}
              hidden={activeTab !== index}
            >
              {tab.props.children}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Compound component pattern
Tabs.Tab = Tab;

export default Tabs;
