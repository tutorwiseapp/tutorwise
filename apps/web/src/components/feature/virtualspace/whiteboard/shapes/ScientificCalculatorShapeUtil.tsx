/**
 * ScientificCalculatorShapeUtil
 * Interactive scientific calculator with expression display.
 * Evaluates expressions safely using Function constructor with Math context.
 */

'use client';

import { ShapeUtil, TLBaseShape, T, Rectangle2d, HTMLContainer, useEditor } from '@tldraw/editor';
import { useState, useCallback, useEffect, useRef } from 'react';

export type ScientificCalculatorShape = TLBaseShape<
  'sci-calculator',
  { w: number; h: number }
>;

// Safe expression evaluator — replaces user-facing symbols with JS equivalents
function evalExpr(expr: string): string {
  try {
    const sanitized = expr
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/π/g, 'Math.PI')
      .replace(/e(?![0-9a-zA-Z_])/g, 'Math.E')
      .replace(/sin\(/g, 'Math.sin(')
      .replace(/cos\(/g, 'Math.cos(')
      .replace(/tan\(/g, 'Math.tan(')
      .replace(/log\(/g, 'Math.log10(')
      .replace(/ln\(/g, 'Math.log(')
      .replace(/√\(/g, 'Math.sqrt(')
      .replace(/\^/g, '**');
    // Basic guard — only allow safe characters
    if (/[a-zA-Z]/.test(sanitized.replace(/Math\.(PI|E|sin|cos|tan|log10?|log|sqrt)/g, ''))) {
      return 'Error';
    }
    // eslint-disable-next-line no-new-func
    const result = new Function('Math', `"use strict"; return (${sanitized})`)(Math);
    if (typeof result !== 'number') return 'Error';
    if (!isFinite(result)) return result > 0 ? '∞' : result < 0 ? '-∞' : 'NaN';
    // Round to avoid floating point noise
    const rounded = parseFloat(result.toPrecision(12));
    return String(rounded);
  } catch {
    return 'Error';
  }
}

function toRad(deg: number) { return (deg * Math.PI) / 180; }

const BTN = {
  base: {
    width: 44,
    height: 36,
    border: 'none',
    borderRadius: 4,
    fontSize: 13,
    cursor: 'pointer',
    fontFamily: 'system-ui, sans-serif',
    fontWeight: 500,
  } as React.CSSProperties,
  num: { background: '#f1f5f9', color: '#0f172a' } as React.CSSProperties,
  op: { background: '#dbeafe', color: '#1d4ed8' } as React.CSSProperties,
  fn: { background: '#ede9fe', color: '#7c3aed' } as React.CSSProperties,
  eq: { background: '#7c3aed', color: 'white', width: 92 } as React.CSSProperties,
  clr: { background: '#fee2e2', color: '#dc2626' } as React.CSSProperties,
};

function CalcButton({
  label, style, onClick,
}: { label: string; style: React.CSSProperties; onClick: () => void }) {
  return (
    <button
      style={{ ...BTN.base, ...style }}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {label}
    </button>
  );
}

function ScientificCalculatorComponent({ shape }: { shape: ScientificCalculatorShape }) {
  const editor = useEditor();
  const { w, h } = shape.props;
  const containerRef = useRef<HTMLDivElement>(null);

  // Reactive edit state via store subscription (getEditingShapeId is not reactive in plain React)
  const [isEditing, setIsEditing] = useState(() => editor.getEditingShapeId() === shape.id);
  useEffect(() => {
    return editor.store.listen(() => {
      setIsEditing(editor.getEditingShapeId() === shape.id);
    });
  }, [editor, shape.id]);

  // When editing, add capture-phase listeners to block tldraw's overlay from intercepting events
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

  const [expr, setExpr] = useState('');
  const [result, setResult] = useState('');
  const [useDeg, setUseDeg] = useState(true);

  const press = useCallback((val: string) => {
    setExpr((e) => e + val);
    setResult('');
  }, []);

  const calculate = useCallback(() => {
    const adjusted = useDeg
      ? expr
          .replace(/sin\(([^)]+)\)/g, (_, a) => `sin(${toRad(parseFloat(a))}`)
          .replace(/cos\(([^)]+)\)/g, (_, a) => `cos(${toRad(parseFloat(a))}`)
          .replace(/tan\(([^)]+)\)/g, (_, a) => `tan(${toRad(parseFloat(a))}`)
      : expr;
    setResult(evalExpr(adjusted));
  }, [expr, useDeg]);

  const clear = useCallback(() => { setExpr(''); setResult(''); }, []);
  const backspace = useCallback(() => { setExpr((e) => e.slice(0, -1)); }, []);

  return (
    <HTMLContainer>
      <div
        ref={containerRef}
        style={{ width: w, height: h, background: '#0f172a', borderRadius: 10, overflow: 'hidden', userSelect: 'none', display: 'flex', flexDirection: 'column', position: 'relative' }}
      >
        {/* Activation overlay — shown when not editing; double-click explicitly enters edit mode */}
        {!isEditing && (
          <div
            style={{ position: 'absolute', inset: 0, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.5)', borderRadius: 10, cursor: 'pointer' }}
            onDoubleClick={(e) => { e.stopPropagation(); editor.setEditingShape(shape.id); }}
          >
            <span style={{ color: 'white', fontSize: 12, fontFamily: 'system-ui', background: 'rgba(0,0,0,0.6)', padding: '6px 14px', borderRadius: 6, fontWeight: 600 }}>Double-click to use</span>
          </div>
        )}
        {/* Header */}
        <div style={{ background: '#1e293b', padding: '6px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#94a3b8', fontSize: 11, fontWeight: 600, fontFamily: 'system-ui' }}>SCIENTIFIC CALCULATOR</span>
          <button
            style={{ background: useDeg ? '#3b82f6' : '#475569', color: 'white', border: 'none', borderRadius: 3, fontSize: 10, padding: '2px 6px', cursor: 'pointer', fontFamily: 'system-ui' }}
            onClick={() => setUseDeg((d) => !d)}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {useDeg ? 'DEG' : 'RAD'}
          </button>
        </div>

        {/* Display */}
        <div style={{ background: '#1e293b', padding: '8px 12px', borderBottom: '1px solid #334155' }}>
          <div style={{ color: '#94a3b8', fontSize: 11, fontFamily: 'monospace', minHeight: 16, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {expr || '0'}
          </div>
          <div style={{ color: result === 'Error' ? '#ef4444' : '#f8fafc', fontSize: 20, fontFamily: 'monospace', textAlign: 'right', minHeight: 28, fontWeight: 600 }}>
            {result || '\u00A0'}
          </div>
        </div>

        {/* Buttons */}
        <div style={{ flex: 1, padding: 8, display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto' }}>
          {/* Row 1: scientific functions */}
          <div style={{ display: 'flex', gap: 4 }}>
            <CalcButton label="sin(" style={BTN.fn} onClick={() => press('sin(')} />
            <CalcButton label="cos(" style={BTN.fn} onClick={() => press('cos(')} />
            <CalcButton label="tan(" style={BTN.fn} onClick={() => press('tan(')} />
            <CalcButton label="log(" style={BTN.fn} onClick={() => press('log(')} />
            <CalcButton label="ln(" style={BTN.fn} onClick={() => press('ln(')} />
          </div>
          {/* Row 2: power + constants */}
          <div style={{ display: 'flex', gap: 4 }}>
            <CalcButton label="√(" style={BTN.fn} onClick={() => press('√(')} />
            <CalcButton label="x²" style={BTN.fn} onClick={() => press('^2')} />
            <CalcButton label="xʸ" style={BTN.fn} onClick={() => press('^')} />
            <CalcButton label="π" style={BTN.fn} onClick={() => press('π')} />
            <CalcButton label="e" style={BTN.fn} onClick={() => press('e')} />
          </div>
          {/* Row 3: 7 8 9 ÷ ( ) */}
          <div style={{ display: 'flex', gap: 4 }}>
            <CalcButton label="(" style={BTN.op} onClick={() => press('(')} />
            <CalcButton label=")" style={BTN.op} onClick={() => press(')')} />
            <CalcButton label="7" style={BTN.num} onClick={() => press('7')} />
            <CalcButton label="8" style={BTN.num} onClick={() => press('8')} />
            <CalcButton label="9" style={BTN.num} onClick={() => press('9')} />
          </div>
          {/* Row 4 */}
          <div style={{ display: 'flex', gap: 4 }}>
            <CalcButton label="÷" style={BTN.op} onClick={() => press('÷')} />
            <CalcButton label="×" style={BTN.op} onClick={() => press('×')} />
            <CalcButton label="4" style={BTN.num} onClick={() => press('4')} />
            <CalcButton label="5" style={BTN.num} onClick={() => press('5')} />
            <CalcButton label="6" style={BTN.num} onClick={() => press('6')} />
          </div>
          {/* Row 5 */}
          <div style={{ display: 'flex', gap: 4 }}>
            <CalcButton label="−" style={BTN.op} onClick={() => press('-')} />
            <CalcButton label="+" style={BTN.op} onClick={() => press('+')} />
            <CalcButton label="1" style={BTN.num} onClick={() => press('1')} />
            <CalcButton label="2" style={BTN.num} onClick={() => press('2')} />
            <CalcButton label="3" style={BTN.num} onClick={() => press('3')} />
          </div>
          {/* Row 6 */}
          <div style={{ display: 'flex', gap: 4 }}>
            <CalcButton label="AC" style={BTN.clr} onClick={clear} />
            <CalcButton label="⌫" style={{ ...BTN.op, background: '#fef3c7', color: '#92400e' }} onClick={backspace} />
            <CalcButton label="0" style={BTN.num} onClick={() => press('0')} />
            <CalcButton label="." style={BTN.num} onClick={() => press('.')} />
            <CalcButton label="=" style={{ ...BTN.base, ...BTN.eq, width: 44 }} onClick={calculate} />
          </div>
        </div>
      </div>
    </HTMLContainer>
  );
}

export class ScientificCalculatorShapeUtil extends ShapeUtil<any> {
  static override type = 'sci-calculator' as const;

  static override props = {
    w: T.number,
    h: T.number,
  };

  override isAspectRatioLocked = () => false;
  override canResize = () => true;
  override canEdit = () => true;

  getDefaultProps(): ScientificCalculatorShape['props'] {
    return { w: 260, h: 380 };
  }

  getGeometry(shape: ScientificCalculatorShape) {
    return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true });
  }

  component(shape: ScientificCalculatorShape) {
    return <ScientificCalculatorComponent shape={shape} />;
  }

  indicator(shape: ScientificCalculatorShape) {
    return <rect width={shape.props.w} height={shape.props.h} rx={10} />;
  }
}
