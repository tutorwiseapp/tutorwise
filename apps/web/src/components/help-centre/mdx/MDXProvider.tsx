/**
 * Filename: apps/web/src/app/components/help-centre/mdx/MDXProvider.tsx
 * Purpose: MDX components provider for help centre articles
 * Created: 2025-01-19
 */

'use client';

import { MDXProvider as BaseMDXProvider } from '@mdx-js/react';
import CalloutBox from './CalloutBox';
import CodeBlock from './CodeBlock';
import VideoEmbed from './VideoEmbed';
import Tabs, { Tab } from './Tabs';
import { ReactNode } from 'react';

const components = {
  // Custom components
  CalloutBox,
  CodeBlock,
  VideoEmbed,
  Tabs,
  Tab,

  // Override default HTML elements
  h1: (props: any) => <h1 className="help-h1" {...props} />,
  h2: (props: any) => <h2 className="help-h2" {...props} />,
  h3: (props: any) => <h3 className="help-h3" {...props} />,
  h4: (props: any) => <h4 className="help-h4" {...props} />,
  p: (props: any) => <p className="help-p" {...props} />,
  ul: (props: any) => <ul className="help-ul" {...props} />,
  ol: (props: any) => <ol className="help-ol" {...props} />,
  li: (props: any) => <li className="help-li" {...props} />,
  a: (props: any) => <a className="help-a" {...props} />,
  blockquote: (props: any) => <blockquote className="help-blockquote" {...props} />,
  code: (props: any) => <code className="help-inline-code" {...props} />,
  pre: (props: any) => <pre className="help-pre" {...props} />,
  table: (props: any) => <table className="help-table" {...props} />,
  th: (props: any) => <th className="help-th" {...props} />,
  td: (props: any) => <td className="help-td" {...props} />,
};

export default function MDXProvider({ children }: { children: ReactNode }) {
  return <BaseMDXProvider components={components}>{children}</BaseMDXProvider>;
}
