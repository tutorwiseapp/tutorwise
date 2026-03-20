/**
 * EmbedShapeUtil
 * Embeds Desmos, GeoGebra, or any safe iframe URL into the whiteboard.
 * Double-click to change the embed URL.
 * Sandboxed iframe with allow-scripts allow-same-origin for calculator functionality.
 */

'use client';

import { ShapeUtil, TLBaseShape, T, Rectangle2d, HTMLContainer, useEditor } from '@tldraw/editor';
import { useState, useCallback } from 'react';

export type EmbedShape = TLBaseShape<
  'tool-embed',
  {
    w: number;
    h: number;
    url: string;
    label: string;
  }
>;

const PRESETS = [
  { label: 'Desmos Graphing', url: 'https://www.desmos.com/calculator' },
  { label: 'Desmos Geometry', url: 'https://www.desmos.com/geometry' },
  { label: 'GeoGebra Graphing', url: 'https://www.geogebra.org/graphing' },
  { label: 'GeoGebra Geometry', url: 'https://www.geogebra.org/geometry' },
  { label: 'GeoGebra 3D', url: 'https://www.geogebra.org/3d' },
];

// Allowlist for safety — only known education embed domains
const ALLOWED_ORIGINS = ['desmos.com', 'geogebra.org', 'www.desmos.com', 'www.geogebra.org'];

function isSafeUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return ALLOWED_ORIGINS.some((o) => u.hostname === o || u.hostname.endsWith(`.${o}`));
  } catch {
    return false;
  }
}

function EmbedEditor({ shape, onClose }: { shape: EmbedShape; onClose: () => void }) {
  const editor = useEditor();
  const [url, setUrl] = useState(shape.props.url);
  const [label, setLabel] = useState(shape.props.label);

  const apply = useCallback(() => {
    if (!isSafeUrl(url)) {
      alert('Only Desmos and GeoGebra embeds are supported.');
      return;
    }
    (editor as any).updateShape({
      id: shape.id,
      type: 'tool-embed',
      props: { url, label },
    });
    onClose();
  }, [editor, shape.id, url, label, onClose]);

  return (
    <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', marginTop: 8, zIndex: 100, background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: 14, width: 280, boxShadow: '0 4px 16px rgba(0,0,0,0.15)', pointerEvents: 'all' }}
      onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10, color: '#7c3aed' }}>Embed Tool</div>
      <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 6 }}>Quick presets</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
        {PRESETS.map((p) => (
          <button key={p.url} onClick={() => { setUrl(p.url); setLabel(p.label); }} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 4, border: '1px solid #e2e8f0', cursor: 'pointer', background: url === p.url ? '#ede9fe' : 'white', color: url === p.url ? '#7c3aed' : '#475569', fontWeight: url === p.url ? 600 : 400 }}>
            {p.label}
          </button>
        ))}
      </div>
      <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 4 }}>Custom URL</div>
      <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.desmos.com/calculator" style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 4, padding: '4px 8px', fontSize: 12, marginBottom: 8, boxSizing: 'border-box', outline: 'none' }} />
      <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 4 }}>Label</div>
      <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Desmos Calculator" style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 4, padding: '4px 8px', fontSize: 12, marginBottom: 10, boxSizing: 'border-box', outline: 'none' }} />
      <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 10 }}>Supported: Desmos, GeoGebra</div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={apply} style={{ flex: 1, background: '#7c3aed', color: 'white', border: 'none', borderRadius: 4, padding: '6px 0', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Load</button>
        <button onClick={onClose} style={{ flex: 1, background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 4, padding: '6px 0', fontSize: 12, cursor: 'pointer' }}>Cancel</button>
      </div>
    </div>
  );
}

function EmbedComponent({ shape }: { shape: EmbedShape }) {
  const editor = useEditor();
  const isEditing = editor.getEditingShapeId() === shape.id;
  const { w, h, url, label } = shape.props;
  const safe = isSafeUrl(url);

  return (
    <HTMLContainer>
      <div style={{ position: 'relative', width: w, height: h, userSelect: 'none', overflow: 'hidden', borderRadius: 8, border: '1px solid #e2e8f0' }}>
        {/* Header */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 28, background: '#1e293b', display: 'flex', alignItems: 'center', padding: '0 10px', zIndex: 2 }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>{label || 'Embed'}</span>
        </div>

        {safe ? (
          <iframe
            src={url}
            style={{
              position: 'absolute',
              top: 28,
              left: 0,
              width: '100%',
              height: h - 28,
              border: 'none',
              pointerEvents: isEditing ? 'none' : 'all',
            }}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            title={label}
          />
        ) : (
          <div style={{ position: 'absolute', top: 28, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8, color: '#94a3b8', fontSize: 13 }}>
            <span>Double-click to configure embed</span>
            <span style={{ fontSize: 11 }}>(Desmos · GeoGebra)</span>
          </div>
        )}

        {isEditing && <EmbedEditor shape={shape} onClose={() => editor.setEditingShape(null)} />}
      </div>
    </HTMLContainer>
  );
}

export class EmbedShapeUtil extends ShapeUtil<any> {
  static override type = 'tool-embed' as const;

  static override props = {
    w: T.number,
    h: T.number,
    url: T.string,
    label: T.string,
  };

  override isAspectRatioLocked = () => false;
  override canResize = () => true;
  override canEdit = () => true;

  getDefaultProps(): EmbedShape['props'] {
    return { w: 480, h: 360, url: '', label: 'Desmos Graphing' };
  }

  getGeometry(shape: EmbedShape) {
    return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true });
  }

  component(shape: EmbedShape) {
    return <EmbedComponent shape={shape} />;
  }

  indicator(shape: EmbedShape) {
    return <rect width={shape.props.w} height={shape.props.h} rx={8} />;
  }
}
