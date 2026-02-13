'use client';

/**
 * Lexi Markdown Renderer
 *
 * Simple markdown renderer for Lexi chat messages.
 * Supports basic markdown syntax without external dependencies.
 *
 * Supported syntax:
 * - **bold** or __bold__
 * - *italic* or _italic_
 * - `inline code`
 * - ```code blocks```
 * - [links](url)
 * - - unordered lists
 * - 1. ordered lists
 * - > blockquotes
 *
 * @module components/feature/lexi/LexiMarkdown
 */

import React, { useMemo } from 'react';
import styles from './LexiMarkdown.module.css';

interface LexiMarkdownProps {
  content: string;
  className?: string;
}

interface ParsedNode {
  type: 'text' | 'bold' | 'italic' | 'code' | 'codeblock' | 'link' | 'list' | 'listitem' | 'blockquote' | 'paragraph' | 'linebreak';
  content?: string;
  children?: ParsedNode[];
  href?: string;
  ordered?: boolean;
  language?: string;
}

export default function LexiMarkdown({ content, className }: LexiMarkdownProps) {
  const rendered = useMemo(() => {
    const nodes = parseMarkdown(content);
    return renderNodes(nodes);
  }, [content]);

  return <div className={`${styles.markdown} ${className || ''}`}>{rendered}</div>;
}

// --- Parser ---

function parseMarkdown(text: string): ParsedNode[] {
  const lines = text.split('\n');
  const nodes: ParsedNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block (```)
    if (line.startsWith('```')) {
      const language = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      nodes.push({
        type: 'codeblock',
        content: codeLines.join('\n'),
        language,
      });
      i++;
      continue;
    }

    // Blockquote (>)
    if (line.startsWith('> ')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith('> ')) {
        quoteLines.push(lines[i].slice(2));
        i++;
      }
      nodes.push({
        type: 'blockquote',
        children: parseInline(quoteLines.join(' ')),
      });
      continue;
    }

    // Unordered list (- or *)
    if (line.match(/^[-*]\s/)) {
      const listItems: ParsedNode[] = [];
      while (i < lines.length && lines[i].match(/^[-*]\s/)) {
        listItems.push({
          type: 'listitem',
          children: parseInline(lines[i].slice(2)),
        });
        i++;
      }
      nodes.push({
        type: 'list',
        ordered: false,
        children: listItems,
      });
      continue;
    }

    // Ordered list (1. 2. etc)
    if (line.match(/^\d+\.\s/)) {
      const listItems: ParsedNode[] = [];
      while (i < lines.length && lines[i].match(/^\d+\.\s/)) {
        listItems.push({
          type: 'listitem',
          children: parseInline(lines[i].replace(/^\d+\.\s/, '')),
        });
        i++;
      }
      nodes.push({
        type: 'list',
        ordered: true,
        children: listItems,
      });
      continue;
    }

    // Empty line - add line break
    if (line.trim() === '') {
      if (nodes.length > 0 && nodes[nodes.length - 1].type !== 'linebreak') {
        nodes.push({ type: 'linebreak' });
      }
      i++;
      continue;
    }

    // Regular paragraph
    const paragraphLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].startsWith('```') &&
      !lines[i].startsWith('> ') &&
      !lines[i].match(/^[-*]\s/) &&
      !lines[i].match(/^\d+\.\s/)
    ) {
      paragraphLines.push(lines[i]);
      i++;
    }

    if (paragraphLines.length > 0) {
      nodes.push({
        type: 'paragraph',
        children: parseInline(paragraphLines.join(' ')),
      });
    }
  }

  return nodes;
}

function parseInline(text: string): ParsedNode[] {
  const nodes: ParsedNode[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    // Inline code (`code`)
    const codeMatch = remaining.match(/^`([^`]+)`/);
    if (codeMatch) {
      nodes.push({ type: 'code', content: codeMatch[1] });
      remaining = remaining.slice(codeMatch[0].length);
      continue;
    }

    // Bold (**text** or __text__)
    const boldMatch = remaining.match(/^(\*\*|__)(.+?)\1/);
    if (boldMatch) {
      nodes.push({ type: 'bold', content: boldMatch[2] });
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }

    // Italic (*text* or _text_)
    const italicMatch = remaining.match(/^(\*|_)([^*_]+)\1/);
    if (italicMatch) {
      nodes.push({ type: 'italic', content: italicMatch[2] });
      remaining = remaining.slice(italicMatch[0].length);
      continue;
    }

    // Link [text](url)
    const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch) {
      nodes.push({ type: 'link', content: linkMatch[1], href: linkMatch[2] });
      remaining = remaining.slice(linkMatch[0].length);
      continue;
    }

    // Plain text - consume until next special character
    const textMatch = remaining.match(/^[^`*_[]+/);
    if (textMatch) {
      nodes.push({ type: 'text', content: textMatch[0] });
      remaining = remaining.slice(textMatch[0].length);
      continue;
    }

    // Single special character (no match found)
    nodes.push({ type: 'text', content: remaining[0] });
    remaining = remaining.slice(1);
  }

  return nodes;
}

// --- Renderer ---

function renderNodes(nodes: ParsedNode[]): React.ReactNode[] {
  return nodes.map((node, index) => renderNode(node, index));
}

function renderNode(node: ParsedNode, key: number | string): React.ReactNode {
  switch (node.type) {
    case 'text':
      return <span key={key}>{node.content}</span>;

    case 'bold':
      return <strong key={key} className={styles.bold}>{node.content}</strong>;

    case 'italic':
      return <em key={key} className={styles.italic}>{node.content}</em>;

    case 'code':
      return <code key={key} className={styles.inlineCode}>{node.content}</code>;

    case 'codeblock':
      return (
        <pre key={key} className={styles.codeBlock}>
          <code className={node.language ? styles[`lang-${node.language}`] : ''}>
            {node.content}
          </code>
        </pre>
      );

    case 'link':
      return (
        <a
          key={key}
          href={node.href}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.link}
        >
          {node.content}
        </a>
      );

    case 'list': {
      const ListTag = node.ordered ? 'ol' : 'ul';
      return (
        <ListTag key={key} className={styles.list}>
          {node.children?.map((child, i) => renderNode(child, `${key}-${i}`))}
        </ListTag>
      );
    }

    case 'listitem':
      return (
        <li key={key} className={styles.listItem}>
          {node.children?.map((child, i) => renderNode(child, `${key}-${i}`))}
        </li>
      );

    case 'blockquote':
      return (
        <blockquote key={key} className={styles.blockquote}>
          {node.children?.map((child, i) => renderNode(child, `${key}-${i}`))}
        </blockquote>
      );

    case 'paragraph':
      return (
        <p key={key} className={styles.paragraph}>
          {node.children?.map((child, i) => renderNode(child, `${key}-${i}`))}
        </p>
      );

    case 'linebreak':
      return <br key={key} />;

    default:
      return null;
  }
}

export { LexiMarkdown };
