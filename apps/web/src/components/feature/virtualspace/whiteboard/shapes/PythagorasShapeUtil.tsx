/**
 * PythagorasShapeUtil
 * Right-angled triangle with labelled sides (a, b, c), angle markers,
 * computed hypotenuse, and optional step-by-step working.
 */

'use client';

import { ShapeUtil, TLBaseShape, T, Rectangle2d, HTMLContainer, useEditor } from '@tldraw/editor';
import { useState, useCallback } from 'react';

export type PythagorasShape = TLBaseShape<
  'pythagoras',
  {
    w: number;
    h: number;
    sideA: number;
    sideB: number;
    showWorking: boolean;
    showAngles: boolean;
    color: string;
  }
>;

function PythagorasSvg({ shape }: { shape: PythagorasShape }) {
  const { w, h, sideA, sideB, showAngles, color } = shape.props;

  const pad = 32;
  const maxW = w - pad * 2;
  const maxH = h - pad * 2;

  // Scale so triangle fits
  const scale = Math.min(maxW / sideB, maxH / sideA, 6);
  const scaledA = sideA * scale;
  const scaledB = sideB * scale;

  const x0 = pad;
  const y0 = pad + scaledA;
  const x1 = x0;
  const y1 = pad;
  const x2 = x0 + scaledB;
  const y2 = y0;

  const hyp = Math.sqrt(sideA ** 2 + sideB ** 2);

  // Angles
  const angleA = Math.atan2(sideA, sideB) * (180 / Math.PI); // at C
  const angleB = 90 - angleA; // at A

  return (
    <svg width={w} height={h} style={{ display: 'block', overflow: 'visible' }}>
      {/* Triangle */}
      <polygon
        points={`${x0},${y0} ${x1},${y1} ${x2},${y2}`}
        fill="rgba(219,234,254,0.4)"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
      />

      {/* Right angle marker */}
      <polyline
        points={`${x0 + 10},${y1} ${x0 + 10},${y1 + 10} ${x0},${y1 + 10}`}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
      />

      {/* Side labels */}
      {/* a — vertical left */}
      <text x={x0 - 14} y={(y0 + y1) / 2 + 4} fontSize={13} fontWeight={700} fill="#ef4444" fontFamily="sans-serif" textAnchor="middle">
        a={sideA}
      </text>
      {/* b — bottom */}
      <text x={(x0 + x2) / 2} y={y0 + 18} fontSize={13} fontWeight={700} fill="#2563eb" fontFamily="sans-serif" textAnchor="middle">
        b={sideB}
      </text>
      {/* c — hypotenuse */}
      <text
        x={(x1 + x2) / 2 + 10}
        y={(y1 + y2) / 2 - 6}
        fontSize={13}
        fontWeight={700}
        fill="#059669"
        fontFamily="sans-serif"
        textAnchor="middle"
        transform={`rotate(${-Math.atan2(y1 - y2, x2 - x1) * 180 / Math.PI}, ${(x1 + x2) / 2 + 10}, ${(y1 + y2) / 2 - 6})`}
      >
        c={hyp.toFixed(2)}
      </text>

      {/* Angles */}
      {showAngles && (
        <>
          <text x={x0 + 12} y={y0 - 6} fontSize={10} fill="#f59e0b" fontWeight={700} fontFamily="sans-serif">
            {angleB.toFixed(1)}°
          </text>
          <text x={x2 - 36} y={y2 - 6} fontSize={10} fill="#f59e0b" fontWeight={700} fontFamily="sans-serif">
            {angleA.toFixed(1)}°
          </text>
          <text x={x0 + 14} y={y1 + 22} fontSize={10} fill="#7c3aed" fontWeight={700} fontFamily="sans-serif">90°</text>
        </>
      )}
    </svg>
  );
}

function WorkingPanel({ shape }: { shape: PythagorasShape }) {
  const { sideA, sideB } = shape.props;
  const hyp = Math.sqrt(sideA ** 2 + sideB ** 2);
  return (
    <div style={{ padding: '8px 12px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', fontSize: 12, fontFamily: 'ui-monospace, monospace', lineHeight: 1.8, color: '#1e293b' }}>
      <div style={{ fontWeight: 700, marginBottom: 4, fontFamily: 'sans-serif' }}>Working:</div>
      <div>c² = a² + b²</div>
      <div>c² = {sideA}² + {sideB}²</div>
      <div>c² = {sideA ** 2} + {sideB ** 2}</div>
      <div>c² = {sideA ** 2 + sideB ** 2}</div>
      <div>c = √{sideA ** 2 + sideB ** 2}</div>
      <div style={{ fontWeight: 700, color: '#059669' }}>c ≈ {hyp.toFixed(2)}</div>
    </div>
  );
}

function PythagorasEditor({ shape, onClose }: { shape: PythagorasShape; onClose: () => void }) {
  const editor = useEditor();
  const [vals, setVals] = useState({ sideA: shape.props.sideA, sideB: shape.props.sideB, showWorking: shape.props.showWorking, showAngles: shape.props.showAngles });

  const apply = useCallback(() => {
    (editor as any).updateShape({
      id: shape.id,
      type: 'pythagoras',
      props: { sideA: Number(vals.sideA), sideB: Number(vals.sideB), showWorking: vals.showWorking, showAngles: vals.showAngles },
    });
    onClose();
  }, [editor, shape.id, vals, onClose]);

  const hyp = Math.sqrt(vals.sideA ** 2 + vals.sideB ** 2);

  return (
    <div style={{ position: 'absolute', top: 0, left: '100%', marginLeft: 8, zIndex: 100, background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, width: 190, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', pointerEvents: 'all' }}
      onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
      <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 8, color: '#2563eb' }}>Pythagoras</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 500, color: '#ef4444' }}>Side a</div>
          <input type="number" min={1} value={vals.sideA} onChange={(e) => setVals((v) => ({ ...v, sideA: Number(e.target.value) }))} style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 4, padding: '3px 6px', fontSize: 12 }} />
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 500, color: '#2563eb' }}>Side b</div>
          <input type="number" min={1} value={vals.sideB} onChange={(e) => setVals((v) => ({ ...v, sideB: Number(e.target.value) }))} style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 4, padding: '3px 6px', fontSize: 12 }} />
        </div>
      </div>
      <div style={{ background: '#f0fdf4', borderRadius: 6, padding: '4px 8px', fontSize: 12, color: '#059669', fontWeight: 600, marginBottom: 8 }}>
        c = {hyp.toFixed(3)}
      </div>
      <label style={{ fontSize: 11, display: 'flex', gap: 4, marginBottom: 4 }}>
        <input type="checkbox" checked={vals.showWorking} onChange={(e) => setVals((v) => ({ ...v, showWorking: e.target.checked }))} />
        Show working
      </label>
      <label style={{ fontSize: 11, display: 'flex', gap: 4, marginBottom: 10 }}>
        <input type="checkbox" checked={vals.showAngles} onChange={(e) => setVals((v) => ({ ...v, showAngles: e.target.checked }))} />
        Show angles
      </label>
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={apply} style={{ flex: 1, background: '#2563eb', color: 'white', border: 'none', borderRadius: 4, padding: '5px 0', fontSize: 12, cursor: 'pointer' }}>Apply</button>
        <button onClick={onClose} style={{ flex: 1, background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 4, padding: '5px 0', fontSize: 12, cursor: 'pointer' }}>Cancel</button>
      </div>
    </div>
  );
}

function PythagorasComponent({ shape }: { shape: PythagorasShape }) {
  const editor = useEditor();
  const isEditing = editor.getEditingShapeId() === shape.id;
  return (
    <HTMLContainer>
      <div style={{ position: 'relative', width: shape.props.w, height: shape.props.h, userSelect: 'none', display: 'flex', flexDirection: 'column', background: 'white', borderRadius: 8, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ flex: 1 }}>
          <PythagorasSvg shape={shape} />
        </div>
        {shape.props.showWorking && <WorkingPanel shape={shape} />}
        {isEditing && <PythagorasEditor shape={shape} onClose={() => editor.setEditingShape(null)} />}
      </div>
    </HTMLContainer>
  );
}

export class PythagorasShapeUtil extends ShapeUtil<PythagorasShape> {
  static override type = 'pythagoras' as const;

  static override props = {
    w: T.number,
    h: T.number,
    sideA: T.number,
    sideB: T.number,
    showWorking: T.boolean,
    showAngles: T.boolean,
    color: T.string,
  };

  override isAspectRatioLocked = () => false;
  override canResize = () => true;
  override canEdit = () => true;

  getDefaultProps(): PythagorasShape['props'] {
    return { w: 260, h: 220, sideA: 3, sideB: 4, showWorking: true, showAngles: true, color: '#2563eb' };
  }

  getGeometry(shape: PythagorasShape) {
    return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true });
  }

  component(shape: PythagorasShape) {
    return <PythagorasComponent shape={shape} />;
  }

  indicator(shape: PythagorasShape) {
    return <rect width={shape.props.w} height={shape.props.h} />;
  }
}
