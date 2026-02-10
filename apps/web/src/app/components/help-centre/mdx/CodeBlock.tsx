/**
 * Filename: apps/web/src/app/components/help-centre/mdx/CodeBlock.tsx
 * Purpose: Code block component with syntax highlighting
 * Created: 2025-01-19
 */

'use client';

import { useState } from 'react';
import styles from './CodeBlock.module.css';

interface CodeBlockProps {
  children: string;
  language?: string;
  title?: string;
  showLineNumbers?: boolean;
}

export default function CodeBlock({
  children,
  language = 'typescript',
  title,
  showLineNumbers = true,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Split code into lines
  const lines = children.trim().split('\n');

  return (
    <div className={styles.codeBlock}>
      {title && (
        <div className={styles.header}>
          <span className={styles.title}>{title}</span>
          <span className={styles.language}>{language}</span>
        </div>
      )}
      <div className={styles.toolbar}>
        {!title && <span className={styles.language}>{language}</span>}
        <button
          className={styles.copyButton}
          onClick={handleCopy}
          aria-label="Copy code"
        >
          {copied ? '✓ Copied!' : '📋 Copy'}
        </button>
      </div>
      <pre className={styles.pre}>
        <code className={styles.code}>
          {showLineNumbers ? (
            <table className={styles.table}>
              <tbody>
                {lines.map((line, index) => (
                  <tr key={index}>
                    <td className={styles.lineNumber}>{index + 1}</td>
                    <td className={styles.lineContent}>{line}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            children
          )}
        </code>
      </pre>
    </div>
  );
}
