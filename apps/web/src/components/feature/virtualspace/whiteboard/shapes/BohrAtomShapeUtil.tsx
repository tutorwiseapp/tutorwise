/**
 * BohrAtomShapeUtil
 * Bohr model atom diagram — nucleus with element symbol + proton/neutron count,
 * configurable electron shells (1-4 shells, custom electron counts per shell).
 * Double-click to edit element / shell configuration.
 */

'use client';

import { ShapeUtil, TLBaseShape, T, Rectangle2d, HTMLContainer, useEditor } from '@tldraw/editor';
import { useState, useCallback } from 'react';

export type BohrAtomShape = TLBaseShape<
  'bohr-atom',
  {
    w: number;
    h: number;
    symbol: string;
    protons: number;
    neutrons: number;
    shells: string; // JSON number[] — electrons per shell e.g. [2,8,1]
    color: string;
    showNumbers: boolean;
  }
>;

// Common elements presets
const PRESETS: Array<{ name: string; symbol: string; protons: number; neutrons: number; shells: number[] }> = [
  { name: 'Hydrogen', symbol: 'H', protons: 1, neutrons: 0, shells: [1] },
  { name: 'Helium', symbol: 'He', protons: 2, neutrons: 2, shells: [2] },
  { name: 'Lithium', symbol: 'Li', protons: 3, neutrons: 4, shells: [2, 1] },
  { name: 'Carbon', symbol: 'C', protons: 6, neutrons: 6, shells: [2, 4] },
  { name: 'Nitrogen', symbol: 'N', protons: 7, neutrons: 7, shells: [2, 5] },
  { name: 'Oxygen', symbol: 'O', protons: 8, neutrons: 8, shells: [2, 6] },
  { name: 'Sodium', symbol: 'Na', protons: 11, neutrons: 12, shells: [2, 8, 1] },
  { name: 'Chlorine', symbol: 'Cl', protons: 17, neutrons: 18, shells: [2, 8, 7] },
  { name: 'Calcium', symbol: 'Ca', protons: 20, neutrons: 20, shells: [2, 8, 8, 2] },
];

function BohrAtomSvg({ shape }: { shape: BohrAtomShape }) {
  const { w, h, symbol, protons, neutrons, showNumbers, color } = shape.props;
  const shells: number[] = (() => { try { return JSON.parse(shape.props.shells); } catch { return [2, 8, 1]; } })();

  const cx = w / 2;
  const cy = h / 2;
  const nucleusR = Math.min(w, h) * 0.1;
  const shellStep = Math.min((Math.min(w, h) / 2 - nucleusR - 12) / shells.length, 40);

  return (
    <svg width={w} height={h} style={{ display: 'block', overflow: 'visible' }}>
      {/* Shell orbits */}
      {shells.map((_, i) => (
        <circle
          key={`orbit-${i}`}
          cx={cx}
          cy={cy}
          r={nucleusR + (i + 1) * shellStep}
          fill="none"
          stroke={color}
          strokeWidth={1}
          opacity={0.4}
          strokeDasharray="4 3"
        />
      ))}

      {/* Electrons on each shell */}
      {shells.map((count, si) => {
        const r = nucleusR + (si + 1) * shellStep;
        return Array.from({ length: count }).map((_, ei) => {
          const angle = (ei / count) * 2 * Math.PI - Math.PI / 2;
          const ex = cx + r * Math.cos(angle);
          const ey = cy + r * Math.sin(angle);
          return (
            <circle key={`e-${si}-${ei}`} cx={ex} cy={ey} r={4} fill="#ef4444" />
          );
        });
      })}

      {/* Nucleus */}
      <circle cx={cx} cy={cy} r={nucleusR} fill={color} opacity={0.15} stroke={color} strokeWidth={2} />
      <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle" fontSize={Math.max(10, nucleusR * 0.8)} fontWeight={700} fill={color} fontFamily="sans-serif">
        {symbol}
      </text>
      {showNumbers && (
        <>
          <text x={cx} y={cy + nucleusR * 0.4 + 4} textAnchor="middle" fontSize={8} fill={color} fontFamily="sans-serif" opacity={0.8}>
            {protons}p {neutrons}n
          </text>
        </>
      )}
    </svg>
  );
}

function BohrEditor({ shape, onClose }: { shape: BohrAtomShape; onClose: () => void }) {
  const editor = useEditor();
  const [symbol, setSymbol] = useState(shape.props.symbol);
  const [protons, setProtons] = useState(shape.props.protons);
  const [neutrons, setNeutrons] = useState(shape.props.neutrons);
  const [showNumbers, setShowNumbers] = useState(shape.props.showNumbers);
  const [shells, setShells] = useState<number[]>(() => { try { return JSON.parse(shape.props.shells); } catch { return [2, 8, 1]; } });

  const apply = useCallback(() => {
    (editor as any).updateShape({
      id: shape.id,
      type: 'bohr-atom',
      props: { symbol, protons: Number(protons), neutrons: Number(neutrons), showNumbers, shells: JSON.stringify(shells) },
    });
    onClose();
  }, [editor, shape.id, symbol, protons, neutrons, showNumbers, shells, onClose]);

  const applyPreset = (p: typeof PRESETS[0]) => {
    setSymbol(p.symbol);
    setProtons(p.protons);
    setNeutrons(p.neutrons);
    setShells(p.shells);
  };

  return (
    <div style={{ position: 'absolute', top: 0, left: '100%', marginLeft: 8, zIndex: 100, background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, width: 220, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', pointerEvents: 'all', maxHeight: 440, overflowY: 'auto' }}
      onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
      <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 8, color: '#dc2626' }}>Bohr Model</div>

      {/* Presets */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Quick select</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          {PRESETS.map((p) => (
            <button key={p.symbol} onClick={() => applyPreset(p)} style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, border: '1px solid #e2e8f0', cursor: 'pointer', background: symbol === p.symbol ? '#fef2f2' : 'white', color: symbol === p.symbol ? '#dc2626' : '#475569' }}>
              {p.symbol}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4, marginBottom: 8 }}>
        <div><div style={{ fontSize: 10, fontWeight: 500 }}>Symbol</div><input value={symbol} onChange={(e) => setSymbol(e.target.value)} style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 4, padding: '3px 4px', fontSize: 12, fontWeight: 700 }} /></div>
        <div><div style={{ fontSize: 10, fontWeight: 500 }}>Protons</div><input type="number" min={1} value={protons} onChange={(e) => setProtons(Number(e.target.value))} style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 4, padding: '3px 4px', fontSize: 12 }} /></div>
        <div><div style={{ fontSize: 10, fontWeight: 500 }}>Neutrons</div><input type="number" min={0} value={neutrons} onChange={(e) => setNeutrons(Number(e.target.value))} style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 4, padding: '3px 4px', fontSize: 12 }} /></div>
      </div>

      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 10, fontWeight: 500, marginBottom: 4 }}>Electrons per shell</div>
        {shells.map((count, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
            <span style={{ fontSize: 10, color: '#64748b', width: 40 }}>Shell {i + 1}</span>
            <input type="number" min={1} max={32} value={count} onChange={(e) => setShells((prev) => prev.map((s, j) => j === i ? Number(e.target.value) : s))} style={{ width: 48, border: '1px solid #d1d5db', borderRadius: 4, padding: '2px 4px', fontSize: 12 }} />
            <button onClick={() => setShells((prev) => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 14 }}>×</button>
          </div>
        ))}
        {shells.length < 4 && (
          <button onClick={() => setShells((prev) => [...prev, 1])} style={{ fontSize: 11, background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 4, padding: '3px 8px', cursor: 'pointer' }}>+ Shell</button>
        )}
      </div>

      <label style={{ fontSize: 11, display: 'flex', gap: 4, marginBottom: 10 }}>
        <input type="checkbox" checked={showNumbers} onChange={(e) => setShowNumbers(e.target.checked)} /> Show p/n count
      </label>
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={apply} style={{ flex: 1, background: '#dc2626', color: 'white', border: 'none', borderRadius: 4, padding: '5px 0', fontSize: 12, cursor: 'pointer' }}>Apply</button>
        <button onClick={onClose} style={{ flex: 1, background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 4, padding: '5px 0', fontSize: 12, cursor: 'pointer' }}>Cancel</button>
      </div>
    </div>
  );
}

function BohrAtomComponent({ shape }: { shape: BohrAtomShape }) {
  const editor = useEditor();
  const isEditing = editor.getEditingShapeId() === shape.id;
  return (
    <HTMLContainer>
      <div style={{ position: 'relative', width: shape.props.w, height: shape.props.h, userSelect: 'none' }}>
        <BohrAtomSvg shape={shape} />
        {isEditing && <BohrEditor shape={shape} onClose={() => editor.setEditingShape(null)} />}
      </div>
    </HTMLContainer>
  );
}

export class BohrAtomShapeUtil extends ShapeUtil<any> {
  static override type = 'bohr-atom' as const;

  static override props = {
    w: T.number,
    h: T.number,
    symbol: T.string,
    protons: T.number,
    neutrons: T.number,
    shells: T.string,
    color: T.string,
    showNumbers: T.boolean,
  };

  override isAspectRatioLocked = () => false;
  override canResize = () => true;
  override canEdit = () => true;

  getDefaultProps(): BohrAtomShape['props'] {
    return { w: 240, h: 240, symbol: 'Na', protons: 11, neutrons: 12, shells: JSON.stringify([2, 8, 1]), color: '#2563eb', showNumbers: true };
  }

  getGeometry(shape: BohrAtomShape) {
    return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true });
  }

  component(shape: BohrAtomShape) {
    return <BohrAtomComponent shape={shape} />;
  }

  indicator(shape: BohrAtomShape) {
    return <rect width={shape.props.w} height={shape.props.h} />;
  }
}
