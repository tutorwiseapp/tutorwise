/**
 * FractionCalculatorShapeUtil
 * Interactive fraction calculator: two fraction inputs, operation selector,
 * result as simplified fraction + decimal.
 */

'use client';

import { ShapeUtil, TLBaseShape, T, Rectangle2d, HTMLContainer, useEditor } from '@tldraw/editor';
import { useState, useCallback, useEffect, useRef } from 'react';

export type FractionCalculatorShape = TLBaseShape<
  'fraction-calculator',
  { w: number; h: number }
>;

function gcd(a: number, b: number): number {
  a = Math.abs(a); b = Math.abs(b);
  while (b) { [a, b] = [b, a % b]; }
  return a;
}

function simplify(num: number, den: number): [number, number] {
  if (den === 0) return [num, den];
  const g = gcd(Math.abs(num), Math.abs(den));
  const sign = den < 0 ? -1 : 1;
  return [sign * num / g, sign * den / g];
}

function compute(n1: number, d1: number, op: string, n2: number, d2: number): [number, number] | null {
  if (d1 === 0 || d2 === 0) return null;
  switch (op) {
    case '+': return simplify(n1 * d2 + n2 * d1, d1 * d2);
    case '−': return simplify(n1 * d2 - n2 * d1, d1 * d2);
    case '×': return simplify(n1 * n2, d1 * d2);
    case '÷': return d2 === 0 ? null : simplify(n1 * d2, d1 * n2);
    default: return null;
  }
}

const INPUT_STYLE: React.CSSProperties = {
  width: 52,
  textAlign: 'center',
  border: '1px solid #e2e8f0',
  borderRadius: 4,
  fontSize: 18,
  padding: '2px 4px',
  fontFamily: 'monospace',
  background: 'white',
  outline: 'none',
};

const HDR: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: '#7c3aed',
  letterSpacing: 0.5,
  textTransform: 'uppercase' as const,
  marginBottom: 4,
  fontFamily: 'system-ui',
};

function FractionInput({ num, den, onNum, onDen }: {
  num: string; den: string;
  onNum: (v: string) => void; onDen: (v: string) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <input
        type="number"
        value={num}
        onChange={(e) => onNum(e.target.value)}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        style={INPUT_STYLE}
      />
      <div style={{ width: 52, height: 2, background: '#0f172a' }} />
      <input
        type="number"
        value={den}
        onChange={(e) => onDen(e.target.value)}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        style={INPUT_STYLE}
      />
    </div>
  );
}

function FractionCalculatorComponent({ shape }: { shape: FractionCalculatorShape }) {
  const editor = useEditor();
  const { w, h } = shape.props;
  const containerRef = useRef<HTMLDivElement>(null);

  const [isEditing, setIsEditing] = useState(() => editor.getEditingShapeId() === shape.id);
  useEffect(() => {
    return editor.store.listen(() => {
      setIsEditing(editor.getEditingShapeId() === shape.id);
    });
  }, [editor, shape.id]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !isEditing) return;
    const stop = (e: PointerEvent) => e.stopPropagation();
    el.addEventListener('pointerdown', stop, true);
    el.addEventListener('pointermove', stop, true);
    el.addEventListener('pointerup', stop, true);
    return () => {
      el.removeEventListener('pointerdown', stop, true);
      el.removeEventListener('pointermove', stop, true);
      el.removeEventListener('pointerup', stop, true);
    };
  }, [isEditing]);
  const [n1, setN1] = useState('1');
  const [d1, setD1] = useState('2');
  const [op, setOp] = useState('+');
  const [n2, setN2] = useState('1');
  const [d2, setD2] = useState('3');
  const [result, setResult] = useState<[number, number] | null | 'error'>(null);

  const calculate = useCallback(() => {
    const pn1 = parseInt(n1); const pd1 = parseInt(d1);
    const pn2 = parseInt(n2); const pd2 = parseInt(d2);
    if ([pn1, pd1, pn2, pd2].some(isNaN)) { setResult('error'); return; }
    const r = compute(pn1, pd1, op, pn2, pd2);
    setResult(r ?? 'error');
  }, [n1, d1, op, n2, d2]);

  const reset = useCallback(() => setResult(null), []);

  return (
    <HTMLContainer>
      <div
        ref={containerRef}
        style={{ width: w, height: h, background: 'white', border: '2px solid #7c3aed', borderRadius: 10, overflow: 'hidden', display: 'flex', flexDirection: 'column', userSelect: 'none', fontFamily: 'system-ui', position: 'relative' }}
      >
        {!isEditing && (
          <div
            style={{ position: 'absolute', inset: 0, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(124,58,237,0.15)', borderRadius: 8, cursor: 'pointer' }}
            onDoubleClick={(e) => { e.stopPropagation(); editor.setEditingShape(shape.id); }}
          >
            <span style={{ color: '#7c3aed', fontSize: 12, fontFamily: 'system-ui', background: 'rgba(255,255,255,0.9)', padding: '6px 14px', borderRadius: 6, fontWeight: 600 }}>Double-click to use</span>
          </div>
        )}
        {/* Header */}
        <div style={{ background: '#7c3aed', padding: '6px 12px' }}>
          <span style={{ color: 'white', fontSize: 12, fontWeight: 700 }}>Fraction Calculator</span>
        </div>

        {/* Input area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 12 }}>
          <div style={HDR}>Enter fractions</div>

          {/* Fraction inputs row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FractionInput num={n1} den={d1} onNum={setN1} onDen={setD1} />

            {/* Operation selector */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {['+', '−', '×', '÷'].map((o) => (
                <button
                  key={o}
                  onClick={() => { setOp(o); reset(); }}
                  onPointerDown={(e) => e.stopPropagation()}
                  style={{
                    width: 28, height: 28, border: '1px solid #e2e8f0', borderRadius: 4,
                    background: op === o ? '#7c3aed' : '#f8fafc',
                    color: op === o ? 'white' : '#0f172a',
                    fontSize: 14, cursor: 'pointer', fontWeight: 600,
                  }}
                >
                  {o}
                </button>
              ))}
            </div>

            <FractionInput num={n2} den={d2} onNum={setN2} onDen={setD2} />
          </div>

          {/* Calculate button */}
          <button
            onClick={calculate}
            onPointerDown={(e) => e.stopPropagation()}
            style={{ background: '#7c3aed', color: 'white', border: 'none', borderRadius: 6, padding: '6px 24px', fontSize: 13, fontWeight: 600, cursor: 'pointer', width: '100%' }}
          >
            Calculate
          </button>

          {/* Result */}
          {result !== null && (
            <div style={{ background: result === 'error' ? '#fee2e2' : '#f0fdf4', border: `1px solid ${result === 'error' ? '#fca5a5' : '#86efac'}`, borderRadius: 6, padding: '8px 16px', textAlign: 'center', width: '100%' }}>
              {result === 'error' ? (
                <span style={{ color: '#dc2626', fontSize: 13 }}>Invalid input</span>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 4 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span style={{ fontSize: 18, fontFamily: 'monospace', fontWeight: 700, color: '#166534' }}>{result[0]}</span>
                      <div style={{ width: 32, height: 2, background: '#166534' }} />
                      <span style={{ fontSize: 18, fontFamily: 'monospace', fontWeight: 700, color: '#166534' }}>{result[1]}</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>
                    = {(result[0] / result[1]).toPrecision(6).replace(/\.?0+$/, '')}
                  </div>
                </>
              )}
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
