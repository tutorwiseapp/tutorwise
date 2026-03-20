/**
 * ScientificCalculatorShapeUtil
 * React-based scientific calculator — uses the same edit-mode + bubble-phase
 * event-blocking pattern as UnitConverterShapeUtil so tldraw's overlay does not
 * intercept button clicks.  Double-click to activate.
 */

'use client';

import { ShapeUtil, TLBaseShape, T, Rectangle2d, HTMLContainer, useEditor } from '@tldraw/editor';
import { useState, useEffect, useRef, useCallback } from 'react';

export type ScientificCalculatorShape = TLBaseShape<'sci-calculator', { w: number; h: number }>;

const BTN_BASE: React.CSSProperties = {
  flex: 1, border: 'none', borderRadius: 4, fontSize: 11,
  cursor: 'pointer', fontFamily: 'system-ui', fontWeight: 500,
};
const N: React.CSSProperties = { ...BTN_BASE, background: '#f1f5f9', color: '#0f172a' };
const O: React.CSSProperties = { ...BTN_BASE, background: '#dbeafe', color: '#1d4ed8' };
const F: React.CSSProperties = { ...BTN_BASE, background: '#ede9fe', color: '#7c3aed' };
const C: React.CSSProperties = { ...BTN_BASE, background: '#fee2e2', color: '#dc2626' };
const BK: React.CSSProperties = { ...BTN_BASE, background: '#fef3c7', color: '#92400e' };
const EQ: React.CSSProperties = { ...BTN_BASE, background: '#7c3aed', color: '#fff' };

function ScientificCalculatorComponent({ shape }: { shape: ScientificCalculatorShape }) {
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
  const [expr, setExpr] = useState('');
  const [result, setResult] = useState('\u00a0');
  const [isErr, setIsErr] = useState(false);
  const [isDeg, setIsDeg] = useState(true);

  const push = (v: string) => setExpr(p => p + v);
  const clr = () => { setExpr(''); setResult('\u00a0'); setIsErr(false); };
  const bk = () => setExpr(p => p.slice(0, -1));

  const calc = useCallback(() => {
    try {
      const SF = (v: number) => isDeg ? Math.sin(v * Math.PI / 180) : Math.sin(v);
      const CF = (v: number) => isDeg ? Math.cos(v * Math.PI / 180) : Math.cos(v);
      const TF = (v: number) => isDeg ? Math.tan(v * Math.PI / 180) : Math.tan(v);
      const LG = Math.log10, LN = Math.log, sq = Math.sqrt;
      const PI = Math.PI, E = Math.E;
      const s = expr
        .replace(/\^/g, '**')
        .replace(/sin\(/g, 'SF(').replace(/cos\(/g, 'CF(').replace(/tan\(/g, 'TF(')
        .replace(/log\(/g, 'LG(').replace(/ln\(/g, 'LN(');
      // eslint-disable-next-line no-new-func
      const val = Function('SF', 'CF', 'TF', 'LG', 'LN', 'sq', 'PI', 'E', 'return ' + s)(SF, CF, TF, LG, LN, sq, PI, E);
      if (typeof val !== 'number') throw 0;
      setIsErr(false);
      setResult(isFinite(val) ? String(parseFloat(val.toPrecision(12))) : val > 0 ? 'Inf' : '-Inf');
    } catch { setIsErr(true); setResult('Error'); }
  }, [expr, isDeg]);

  const sp = (e: React.PointerEvent) => e.stopPropagation();
  const ROW: React.CSSProperties = { display: 'flex', gap: 3, flex: 1 };

  return (
    <HTMLContainer>
      <div
        ref={containerRef}
        style={{ width: w, height: h, background: '#0f172a', border: '2px solid #1e293b', borderRadius: 10, display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: 'system-ui', position: 'relative' }}
      >
        {/* Double-click overlay */}
        {!isEditing && (
          <div
            style={{ position: 'absolute', inset: 0, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.7)', borderRadius: 8, cursor: 'pointer' }}
            onDoubleClick={(e) => { e.stopPropagation(); editor.setEditingShape(shape.id); }}
          >
            <span style={{ color: '#f8fafc', fontSize: 12, background: '#334155', padding: '6px 14px', borderRadius: 6, fontWeight: 600, border: '1px solid #475569' }}>Double-click to use</span>
          </div>
        )}

        {/* Header */}
        <div style={{ background: '#1e293b', padding: '4px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <span style={{ color: '#94a3b8', fontSize: 10, fontWeight: 700, letterSpacing: '.5px' }}>SCIENTIFIC CALCULATOR</span>
          <button
            onClick={() => setIsDeg(d => !d)}
            onPointerDown={sp}
            style={{ background: isDeg ? '#3b82f6' : '#475569', color: '#fff', border: 'none', borderRadius: 3, fontSize: 9, padding: '2px 6px', cursor: 'pointer', fontFamily: 'system-ui' }}
          >
            {isDeg ? 'DEG' : 'RAD'}
          </button>
        </div>

        {/* Display */}
        <div style={{ background: '#1e293b', padding: '6px 10px', borderBottom: '1px solid #334155', flexShrink: 0 }}>
          <div style={{ color: '#94a3b8', fontSize: 10, fontFamily: 'monospace', textAlign: 'right', height: 14, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{expr || '0'}</div>
          <div style={{ color: isErr ? '#ef4444' : '#f8fafc', fontSize: 18, fontFamily: 'monospace', textAlign: 'right', fontWeight: 700, minHeight: 22 }}>{result}</div>
        </div>

        {/* Button pad — inline buttons only, no inner component (avoids React remount-on-render bug) */}
        <div style={{ flex: 1, padding: '5px 5px 12px 5px', display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div style={ROW}>
            <button style={F} onClick={() => push('sin(')} onPointerDown={sp}>sin(</button>
            <button style={F} onClick={() => push('cos(')} onPointerDown={sp}>cos(</button>
            <button style={F} onClick={() => push('tan(')} onPointerDown={sp}>tan(</button>
            <button style={F} onClick={() => push('log(')} onPointerDown={sp}>log(</button>
            <button style={F} onClick={() => push('ln(')} onPointerDown={sp}>ln(</button>
          </div>
          <div style={ROW}>
            <button style={F} onClick={() => push('sq(')} onPointerDown={sp}>√(</button>
            <button style={F} onClick={() => push('^2')} onPointerDown={sp}>x²</button>
            <button style={F} onClick={() => push('^')} onPointerDown={sp}>xʸ</button>
            <button style={F} onClick={() => push('PI')} onPointerDown={sp}>π</button>
            <button style={F} onClick={() => push('E')} onPointerDown={sp}>e</button>
          </div>
          <div style={ROW}>
            <button style={O} onClick={() => push('(')} onPointerDown={sp}>(</button>
            <button style={O} onClick={() => push(')')} onPointerDown={sp}>)</button>
            <button style={N} onClick={() => push('7')} onPointerDown={sp}>7</button>
            <button style={N} onClick={() => push('8')} onPointerDown={sp}>8</button>
            <button style={N} onClick={() => push('9')} onPointerDown={sp}>9</button>
          </div>
          <div style={ROW}>
            <button style={O} onClick={() => push('/')} onPointerDown={sp}>÷</button>
            <button style={O} onClick={() => push('*')} onPointerDown={sp}>×</button>
            <button style={N} onClick={() => push('4')} onPointerDown={sp}>4</button>
            <button style={N} onClick={() => push('5')} onPointerDown={sp}>5</button>
            <button style={N} onClick={() => push('6')} onPointerDown={sp}>6</button>
          </div>
          <div style={ROW}>
            <button style={O} onClick={() => push('-')} onPointerDown={sp}>−</button>
            <button style={O} onClick={() => push('+')} onPointerDown={sp}>+</button>
            <button style={N} onClick={() => push('1')} onPointerDown={sp}>1</button>
            <button style={N} onClick={() => push('2')} onPointerDown={sp}>2</button>
            <button style={N} onClick={() => push('3')} onPointerDown={sp}>3</button>
          </div>
          <div style={ROW}>
            <button style={C} onClick={clr} onPointerDown={sp}>AC</button>
            <button style={BK} onClick={bk} onPointerDown={sp}>⌫</button>
            <button style={N} onClick={() => push('0')} onPointerDown={sp}>0</button>
            <button style={N} onClick={() => push('.')} onPointerDown={sp}>.</button>
            <button style={EQ} onClick={calc} onPointerDown={sp}>=</button>
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
