/**
 * FractionCalculatorShapeUtil
 * React-based fraction calculator — uses the same edit-mode + bubble-phase
 * event-blocking pattern as UnitConverterShapeUtil so tldraw's overlay does not
 * intercept button clicks.  Double-click to activate.
 */

'use client';

import { ShapeUtil, TLBaseShape, T, Rectangle2d, HTMLContainer, useEditor } from '@tldraw/editor';
import { useState, useEffect, useRef } from 'react';

export type FractionCalculatorShape = TLBaseShape<'fraction-calculator', { w: number; h: number }>;

type Op = '+' | '−' | '×' | '÷';

function gcd(a: number, b: number): number {
  a = Math.abs(a); b = Math.abs(b);
  while (b) { const t = b; b = a % b; a = t; }
  return a;
}

function simplify(n: number, d: number): [number, number] | null {
  if (d === 0) return null;
  const g = gcd(Math.abs(n), Math.abs(d));
  const s = d < 0 ? -1 : 1;
  return [s * n / g, s * d / g];
}

function FractionCalculatorComponent({ shape }: { shape: FractionCalculatorShape }) {
  const editor = useEditor();
  const { w, h } = shape.props;
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Edit-mode tracking ───────────────────────────────────────────────────
  const [isEditing, setIsEditing] = useState(() => editor.getEditingShapeId() === shape.id);
  useEffect(() => {
    return editor.store.listen(() => setIsEditing(editor.getEditingShapeId() === shape.id));
  }, [editor, shape.id]);

  // ── Bubble-phase event blocking (lets clicks reach buttons) ──────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !isEditing) return;
    const stop = (e: PointerEvent) => e.stopPropagation();
    el.addEventListener('pointerdown', stop, false);
    el.addEventListener('pointermove', stop, false);
    el.addEventListener('pointerup', stop, false);
    return () => {
      el.removeEventListener('pointerdown', stop, false);
      el.removeEventListener('pointermove', stop, false);
      el.removeEventListener('pointerup', stop, false);
    };
  }, [isEditing]);

  // ── Calculator state ─────────────────────────────────────────────────────
  const [n1, setN1] = useState('1');
  const [d1, setD1] = useState('2');
  const [n2, setN2] = useState('1');
  const [d2, setD2] = useState('3');
  const [op, setOp] = useState<Op>('+');
  const [result, setResult] = useState<{ num: number; den: number; dec: number } | null>(null);
  const [error, setError] = useState('');

  const calculate = () => {
    const pn1 = parseInt(n1), pd1 = parseInt(d1), pn2 = parseInt(n2), pd2 = parseInt(d2);
    if ([pn1, pd1, pn2, pd2].some(isNaN) || pd1 === 0 || pd2 === 0) {
      setResult(null); setError('Invalid input'); return;
    }
    let r: [number, number] | null;
    if (op === '+') r = simplify(pn1 * pd2 + pn2 * pd1, pd1 * pd2);
    else if (op === '−') r = simplify(pn1 * pd2 - pn2 * pd1, pd1 * pd2);
    else if (op === '×') r = simplify(pn1 * pn2, pd1 * pd2);
    else {
      if (pn2 === 0) { setResult(null); setError('Division by zero'); return; }
      r = simplify(pn1 * pd2, pd1 * pn2);
    }
    if (!r) { setResult(null); setError('Error'); return; }
    setError('');
    setResult({ num: r[0], den: r[1], dec: r[0] / r[1] });
  };

  const sp = (e: React.PointerEvent) => e.stopPropagation();
  const INPUT: React.CSSProperties = {
    width: 52, textAlign: 'center', border: '1px solid #e2e8f0', borderRadius: 4,
    fontSize: 18, padding: '2px 4px', fontFamily: 'monospace', background: '#fff', outline: 'none',
  };

  return (
    <HTMLContainer>
      <div
        ref={containerRef}
        style={{ width: w, height: h, background: '#fff', border: '2px solid #7c3aed', borderRadius: 10, display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: 'system-ui', position: 'relative' }}
      >
        {/* Double-click overlay */}
        {!isEditing && (
          <div
            style={{ position: 'absolute', inset: 0, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(124,58,237,0.12)', borderRadius: 8, cursor: 'pointer' }}
            onDoubleClick={(e) => { e.stopPropagation(); editor.setEditingShape(shape.id); }}
          >
            <span style={{ color: '#7c3aed', fontSize: 12, background: 'rgba(255,255,255,0.9)', padding: '6px 14px', borderRadius: 6, fontWeight: 600 }}>Double-click to use</span>
          </div>
        )}

        {/* Header */}
        <div style={{ background: '#7c3aed', padding: '6px 12px', flexShrink: 0 }}>
          <span style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>FRACTION CALCULATOR</span>
        </div>

        {/* Body */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 12 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#7c3aed', letterSpacing: '.5px', textTransform: 'uppercase' }}>Enter fractions</span>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Fraction 1 */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <input type="number" value={n1} onChange={e => setN1(e.target.value)} onPointerDown={sp} onClick={sp} style={INPUT} />
              <div style={{ width: 52, height: 2, background: '#0f172a' }} />
              <input type="number" value={d1} onChange={e => setD1(e.target.value)} onPointerDown={sp} onClick={sp} style={INPUT} />
            </div>

            {/* Operator selector */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {(['+', '−', '×', '÷'] as Op[]).map(o => (
                <button
                  key={o}
                  onClick={() => setOp(o)}
                  onPointerDown={sp}
                  style={{ width: 28, height: 28, border: '1px solid #e2e8f0', borderRadius: 4, background: op === o ? '#7c3aed' : '#f8fafc', color: op === o ? '#fff' : '#0f172a', fontSize: 14, cursor: 'pointer', fontWeight: 600, fontFamily: 'system-ui' }}
                >
                  {o}
                </button>
              ))}
            </div>

            {/* Fraction 2 */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <input type="number" value={n2} onChange={e => setN2(e.target.value)} onPointerDown={sp} onClick={sp} style={INPUT} />
              <div style={{ width: 52, height: 2, background: '#0f172a' }} />
              <input type="number" value={d2} onChange={e => setD2(e.target.value)} onPointerDown={sp} onClick={sp} style={INPUT} />
            </div>
          </div>

          <button
            onClick={calculate}
            onPointerDown={sp}
            style={{ background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 24px', fontSize: 13, fontWeight: 600, cursor: 'pointer', width: '100%', fontFamily: 'system-ui' }}
          >
            Calculate
          </button>

          {(result || error) && (
            <div style={{ borderRadius: 6, padding: '8px 16px', textAlign: 'center', width: '100%', background: error ? '#fee2e2' : '#f0fdf4', border: `1px solid ${error ? '#fca5a5' : '#86efac'}` }}>
              {error ? (
                <span style={{ color: '#dc2626', fontSize: 13 }}>{error}</span>
              ) : result ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontSize: 18, fontFamily: 'monospace', fontWeight: 700, color: '#166534' }}>{result.num}</span>
                  <div style={{ width: 32, height: 2, background: '#166534', margin: '2px 0' }} />
                  <span style={{ fontSize: 18, fontFamily: 'monospace', fontWeight: 700, color: '#166534' }}>{result.den}</span>
                  <span style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>= {parseFloat(result.dec.toPrecision(6)).toString()}</span>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </HTMLContainer>
  );
}

export class FractionCalculatorShapeUtil extends ShapeUtil<any> {
  static override type = 'fraction-calculator' as const;

  static override props = {
    w: T.number,
    h: T.number,
  };

  override isAspectRatioLocked = () => false;
  override canResize = () => true;
  override canEdit = () => true;

  getDefaultProps(): FractionCalculatorShape['props'] {
    return { w: 280, h: 320 };
  }

  getGeometry(shape: FractionCalculatorShape) {
    return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true });
  }

  component(shape: FractionCalculatorShape) {
    return <FractionCalculatorComponent shape={shape} />;
  }

  indicator(shape: FractionCalculatorShape) {
    return <rect width={shape.props.w} height={shape.props.h} rx={10} />;
  }
}
