'use client';

/**
 * Sage Markdown Component
 *
 * Renders markdown content from Sage AI responses.
 * Supports code blocks, math notation, and educational formatting.
 *
 * @module components/feature/sage/SageMarkdown
 */

import React, { useMemo } from 'react';
import styles from './SageMarkdown.module.css';

interface SageMarkdownProps {
  content: string;
  className?: string;
}

// Simple markdown parser for common patterns
function parseMarkdown(content: string): React.ReactNode[] {
  const elements: React.ReactNode[] = [];
  let key = 0;

  // Split by code blocks first
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    // Add text before code block
    if (match.index > lastIndex) {
      const textBefore = content.slice(lastIndex, match.index);
      elements.push(...parseInlineMarkdown(textBefore, key));
      key += 100;
    }

    // Add code block
    const language = match[1] || 'text';
    const code = match[2].trim();
    elements.push(
      <pre key={`code-${key++}`} className={styles.codeBlock}>
        <code className={`language-${language}`}>{code}</code>
      </pre>
    );

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < content.length) {
    const remaining = content.slice(lastIndex);
    elements.push(...parseInlineMarkdown(remaining, key));
  }

  return elements;
}

// Parse inline markdown (bold, italic, inline code, links, lists)
function parseInlineMarkdown(text: string, startKey: number): React.ReactNode[] {
  const elements: React.ReactNode[] = [];
  let key = startKey;

  // Split by paragraphs
  const paragraphs = text.split(/\n\n+/);

  paragraphs.forEach((para, paraIndex) => {
    if (!para.trim()) return;

    const trimmedPara = para.trim();

    // Check for bullet list
    if (trimmedPara.match(/^[-*]\s/m)) {
      const items = trimmedPara.split(/\n/).filter(line => line.match(/^[-*]\s/));
      elements.push(
        <ul key={`ul-${key++}`} className={styles.list}>
          {items.map((item, i) => (
            <li key={i} className={styles.listItem}>
              {parseInlineElements(item.replace(/^[-*]\s/, ''))}
            </li>
          ))}
        </ul>
      );
      return;
    }

    // Check for numbered list
    if (trimmedPara.match(/^\d+\.\s/m)) {
      const items = trimmedPara.split(/\n/).filter(line => line.match(/^\d+\.\s/));
      elements.push(
        <ol key={`ol-${key++}`} className={styles.list}>
          {items.map((item, i) => (
            <li key={i} className={styles.listItem}>
              {parseInlineElements(item.replace(/^\d+\.\s/, ''))}
            </li>
          ))}
        </ol>
      );
      return;
    }

    // Check for heading
    const headingMatch = trimmedPara.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      // Map # levels 1-3 to h3-h5 (h1-h2 reserved for page structure)
      const headingLevel = (level + 2) as 3 | 4 | 5;
      const HeadingTag = `h${headingLevel}` as const;
      elements.push(
        React.createElement(
          HeadingTag,
          { key: `h-${key++}`, className: styles.heading },
          parseInlineElements(headingMatch[2])
        )
      );
      return;
    }

    // Regular paragraph
    elements.push(
      <p key={`p-${key++}`} className={styles.paragraph}>
        {parseInlineElements(trimmedPara.replace(/\n/g, ' '))}
      </p>
    );

    // Add spacing between paragraphs (except last)
    if (paraIndex < paragraphs.length - 1) {
      // Paragraph spacing is handled by CSS
    }
  });

  return elements;
}

// Parse inline elements (bold, italic, code, links)
function parseInlineElements(text: string): React.ReactNode[] {
  const elements: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  // Pattern to match: **bold**, *italic*, `code`, [link](url)
  const inlineRegex = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(`([^`]+)`)|(\[([^\]]+)\]\(([^)]+)\))/g;

  let match;
  let lastIndex = 0;

  while ((match = inlineRegex.exec(remaining)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      elements.push(remaining.slice(lastIndex, match.index));
    }

    if (match[1]) {
      // Bold
      elements.push(<strong key={`b-${key++}`}>{match[2]}</strong>);
    } else if (match[3]) {
      // Italic
      elements.push(<em key={`i-${key++}`}>{match[4]}</em>);
    } else if (match[5]) {
      // Inline code
      elements.push(
        <code key={`c-${key++}`} className={styles.inlineCode}>
          {match[6]}
        </code>
      );
    } else if (match[7]) {
      // Link
      elements.push(
        <a
          key={`a-${key++}`}
          href={match[9]}
          className={styles.link}
          target="_blank"
          rel="noopener noreferrer"
        >
          {match[8]}
        </a>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < remaining.length) {
    elements.push(remaining.slice(lastIndex));
  }

  return elements.length > 0 ? elements : [text];
}

export default function SageMarkdown({ content, className }: SageMarkdownProps) {
  const parsedContent = useMemo(() => parseMarkdown(content), [content]);

  return (
    <div className={`${styles.markdown} ${className || ''}`}>
      {parsedContent}
    </div>
  );
}
