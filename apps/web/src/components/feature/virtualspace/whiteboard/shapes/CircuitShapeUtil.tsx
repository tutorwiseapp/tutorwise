/**
 * CircuitShapeUtil
 * Physics/Science — standard circuit diagram components.
 * Each shape is a single component: resistor, capacitor, battery, bulb, switch, LED, wire junction.
 * Uses standard IEEE/IEC SVG symbols.
 */

'use client';

import { ShapeUtil, TLBaseShape, T, Rectangle2d, HTMLContainer, useEditor } from '@tldraw/editor';
import { useState, useCallback } from 'react';

export type CircuitComponentType =
  | 'resistor'
  | 'capacitor'
  | 'battery'
  | 'bulb'
  | 'switch-open'
  | 'switch-closed'
  | 'led'
  | 'diode'
  | 'ammeter'
  | 'voltmeter'
  | 'wire-junction'
  | 'ground';

export type CircuitShape = TLBaseShape<
  'circuit-component',
  {
    w: number;
    h: number;
    componentType: CircuitComponentType;
    label: string;
    color: string;
    showLabel: boolean;
    value: string; // e.g. "10Ω", "100μF"
  }
>;

const CIRCUIT_SIZE = { w: 80, h: 44 };

function ResistorSvg({ w, h, color, label, value }: { w: number; h: number; color: string; label: string; value: string }) {
  const cx = w / 2, cy = h / 2;
  const bw = w * 0.45, bh = h * 0.36;
  return (
    <g>
      <line x1={0} y1={cy} x2={cx - bw / 2} y2={cy} stroke={color} strokeWidth={1.8} />
      <rect x={cx - bw / 2} y={cy - bh / 2} width={bw} height={bh} fill="none" stroke={color} strokeWidth={1.8} />
      <line x1={cx + bw / 2} y1={cy} x2={w} y2={cy} stroke={color} strokeWidth={1.8} />
      {(label || value) && <text x={cx} y={cy - bh / 2 - 3} textAnchor="middle" fontSize={9} fill={color} fontFamily="sans-serif">{label || value}</text>}
    </g>
  );
}

function CapacitorSvg({ w, h, color, label, value }: { w: number; h: number; color: string; label: string; value: string }) {
  const cx = w / 2, cy = h / 2;
  const gap = 5, plateH = h * 0.55;
  return (
    <g>
      <line x1={0} y1={cy} x2={cx - gap / 2} y2={cy} stroke={color} strokeWidth={1.8} />
      <line x1={cx - gap / 2} y1={cy - plateH / 2} x2={cx - gap / 2} y2={cy + plateH / 2} stroke={color} strokeWidth={2.5} />
      <line x1={cx + gap / 2} y1={cy - plateH / 2} x2={cx + gap / 2} y2={cy + plateH / 2} stroke={color} strokeWidth={2.5} />
      <line x1={cx + gap / 2} y1={cy} x2={w} y2={cy} stroke={color} strokeWidth={1.8} />
      {(label || value) && <text x={cx} y={cy - plateH / 2 - 3} textAnchor="middle" fontSize={9} fill={color} fontFamily="sans-serif">{label || value}</text>}
    </g>
  );
}

function BatterySvg({ w, h, color, label, value }: { w: number; h: number; color: string; label: string; value: string }) {
  const cx = w / 2, cy = h / 2;
  const gap = 3, longH = h * 0.65, shortH = h * 0.38;
  return (
    <g>
      <line x1={0} y1={cy} x2={cx - gap - 2} y2={cy} stroke={color} strokeWidth={1.8} />
      <line x1={cx - gap - 2} y1={cy - longH / 2} x2={cx - gap - 2} y2={cy + longH / 2} stroke={color} strokeWidth={2.5} />
      <line x1={cx + gap - 2} y1={cy - shortH / 2} x2={cx + gap - 2} y2={cy + shortH / 2} stroke={color} strokeWidth={2} strokeDasharray="" />
      <line x1={cx + gap + 1} y1={cy - longH / 2} x2={cx + gap + 1} y2={cy + longH / 2} stroke={color} strokeWidth={2.5} />
      <line x1={cx + gap + 3} y1={cy - shortH / 2} x2={cx + gap + 3} y2={cy + shortH / 2} stroke={color} strokeWidth={2} />
      <line x1={cx + gap + 3} y1={cy} x2={w} y2={cy} stroke={color} strokeWidth={1.8} />
      {/* + and - signs */}
      <text x={cx - gap - 2} y={cy - longH / 2 - 2} textAnchor="middle" fontSize={9} fill={color} fontFamily="sans-serif">−</text>
      <text x={cx + gap + 1} y={cy - longH / 2 - 2} textAnchor="middle" fontSize={9} fill={color} fontFamily="sans-serif">+</text>
      {(label || value) && <text x={cx} y={h - 2} textAnchor="middle" fontSize={9} fill={color} fontFamily="sans-serif">{label || value}</text>}
    </g>
  );
}

function BulbSvg({ w, h, color, label }: { w: number; h: number; color: string; label: string }) {
  const cx = w / 2, cy = h / 2, r = Math.min(w, h) * 0.28;
  return (
    <g>
      <line x1={0} y1={cy} x2={cx - r} y2={cy} stroke={color} strokeWidth={1.8} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={1.8} />
      <line x1={cx - r * 0.7} y1={cy - r * 0.7} x2={cx + r * 0.7} y2={cy + r * 0.7} stroke={color} strokeWidth={1.5} />
      <line x1={cx + r * 0.7} y1={cy - r * 0.7} x2={cx - r * 0.7} y2={cy + r * 0.7} stroke={color} strokeWidth={1.5} />
      <line x1={cx + r} y1={cy} x2={w} y2={cy} stroke={color} strokeWidth={1.8} />
      {label && <text x={cx} y={cy - r - 3} textAnchor="middle" fontSize={9} fill={color} fontFamily="sans-serif">{label}</text>}
    </g>
  );
}

function SwitchSvg({ w, h, color, isOpen, label }: { w: number; h: number; color: string; isOpen: boolean; label: string }) {
  const cy = h / 2, padX = w * 0.18;
  return (
    <g>
      <line x1={0} y1={cy} x2={padX} y2={cy} stroke={color} strokeWidth={1.8} />
      <circle cx={padX} cy={cy} r={3} fill={color} />
      {isOpen
        ? <line x1={padX} y1={cy} x2={w - padX} y2={cy - h * 0.28} stroke={color} strokeWidth={1.8} />
        : <line x1={padX} y1={cy} x2={w - padX} y2={cy} stroke={color} strokeWidth={1.8} />
      }
      <circle cx={w - padX} cy={cy} r={3} fill="none" stroke={color} strokeWidth={1.8} />
      <line x1={w - padX} y1={cy} x2={w} y2={cy} stroke={color} strokeWidth={1.8} />
      {label && <text x={w / 2} y={cy - h * 0.3 - 4} textAnchor="middle" fontSize={9} fill={color} fontFamily="sans-serif">{label}</text>}
    </g>
  );
}

function LedSvg({ w, h, color, label }: { w: number; h: number; color: string; label: string }) {
  const cx = w / 2, cy = h / 2, bh = h * 0.55, bw = bh * 0.6;
  return (
    <g>
      <line x1={0} y1={cy} x2={cx - bw / 2} y2={cy} stroke={color} strokeWidth={1.8} />
      <polygon points={`${cx - bw / 2},${cy - bh / 2} ${cx - bw / 2},${cy + bh / 2} ${cx + bw / 2},${cy}`} fill={color} stroke={color} strokeWidth={1} />
      <line x1={cx + bw / 2} y1={cy - bh / 2} x2={cx + bw / 2} y2={cy + bh / 2} stroke={color} strokeWidth={2} />
      <line x1={cx + bw / 2} y1={cy} x2={w} y2={cy} stroke={color} strokeWidth={1.8} />
      {/* Light rays */}
      <line x1={cx + bw / 2 + 3} y1={cy - bh / 2 - 2} x2={cx + bw / 2 + 9} y2={cy - bh / 2 - 8} stroke="#f59e0b" strokeWidth={1.2} />
      <line x1={cx + bw / 2 + 5} y1={cy - 2} x2={cx + bw / 2 + 11} y2={cy - 6} stroke="#f59e0b" strokeWidth={1.2} />
      {label && <text x={cx} y={cy + bh / 2 + 11} textAnchor="middle" fontSize={9} fill={color} fontFamily="sans-serif">{label}</text>}
    </g>
  );
}

function DiodeSvg({ w, h, color, label }: { w: number; h: number; color: string; label: string }) {
  const cx = w / 2, cy = h / 2, bh = h * 0.55, bw = bh * 0.6;
  return (
    <g>
      <line x1={0} y1={cy} x2={cx - bw / 2} y2={cy} stroke={color} strokeWidth={1.8} />
      <polygon points={`${cx - bw / 2},${cy - bh / 2} ${cx - bw / 2},${cy + bh / 2} ${cx + bw / 2},${cy}`} fill={color} stroke={color} strokeWidth={1} />
      <line x1={cx + bw / 2} y1={cy - bh / 2} x2={cx + bw / 2} y2={cy + bh / 2} stroke={color} strokeWidth={2} />
      <line x1={cx + bw / 2} y1={cy} x2={w} y2={cy} stroke={color} strokeWidth={1.8} />
      {label && <text x={cx} y={cy + bh / 2 + 11} textAnchor="middle" fontSize={9} fill={color} fontFamily="sans-serif">{label}</text>}
    </g>
  );
}

function MeterSvg({ w, h, color, label, symbol }: { w: number; h: number; color: string; label: string; symbol: string }) {
  const cx = w / 2, cy = h / 2, r = Math.min(w, h) * 0.32;
  return (
    <g>
      <line x1={0} y1={cy} x2={cx - r} y2={cy} stroke={color} strokeWidth={1.8} />
      <circle cx={cx} cy={cy} r={r} fill="white" stroke={color} strokeWidth={1.8} />
      <text x={cx} y={cy + 4} textAnchor="middle" fontSize={10} fontWeight={700} fill={color} fontFamily="sans-serif">{symbol}</text>
      <line x1={cx + r} y1={cy} x2={w} y2={cy} stroke={color} strokeWidth={1.8} />
      {label && <text x={cx} y={cy - r - 3} textAnchor="middle" fontSize={9} fill={color} fontFamily="sans-serif">{label}</text>}
    </g>
  );
}

function GroundSvg({ w, h, color }: { w: number; h: number; color: string }) {
  const cx = w / 2;
  return (
    <g>
      <line x1={cx} y1={0} x2={cx} y2={h * 0.45} stroke={color} strokeWidth={1.8} />
      <line x1={cx - w * 0.3} y1={h * 0.45} x2={cx + w * 0.3} y2={h * 0.45} stroke={color} strokeWidth={2} />
      <line x1={cx - w * 0.2} y1={h * 0.6} x2={cx + w * 0.2} y2={h * 0.6} stroke={color} strokeWidth={1.8} />
      <line x1={cx - w * 0.1} y1={h * 0.75} x2={cx + w * 0.1} y2={h * 0.75} stroke={color} strokeWidth={1.5} />
    </g>
  );
}

function JunctionSvg({ w, h, color }: { w: number; h: number; color: string }) {
  const cx = w / 2, cy = h / 2;
  return (
    <g>
      <circle cx={cx} cy={cy} r={5} fill={color} />
    </g>
  );
}

function CircuitComponentSvg({ shape }: { shape: CircuitShape }) {
  const { w, h, componentType, color, label, value } = shape.props;
  switch (componentType) {
    case 'resistor': return <svg width={w} height={h}><ResistorSvg w={w} h={h} color={color} label={label} value={value} /></svg>;
    case 'capacitor': return <svg width={w} height={h}><CapacitorSvg w={w} h={h} color={color} label={label} value={value} /></svg>;
    case 'battery': return <svg width={w} height={h}><BatterySvg w={w} h={h} color={color} label={label} value={value} /></svg>;
    case 'bulb': return <svg width={w} height={h}><BulbSvg w={w} h={h} color={color} label={label} /></svg>;
    case 'switch-open': return <svg width={w} height={h}><SwitchSvg w={w} h={h} color={color} isOpen={true} label={label} /></svg>;
    case 'switch-closed': return <svg width={w} height={h}><SwitchSvg w={w} h={h} color={color} isOpen={false} label={label} /></svg>;
    case 'led': return <svg width={w} height={h}><LedSvg w={w} h={h} color={color} label={label} /></svg>;
    case 'diode': return <svg width={w} height={h}><DiodeSvg w={w} h={h} color={color} label={label} /></svg>;
    case 'ammeter': return <svg width={w} height={h}><MeterSvg w={w} h={h} color={color} label={label} symbol="A" /></svg>;
    case 'voltmeter': return <svg width={w} height={h}><MeterSvg w={w} h={h} color={color} label={label} symbol="V" /></svg>;
    case 'ground': return <svg width={w} height={h}><GroundSvg w={w} h={h} color={color} /></svg>;
    case 'wire-junction': return <svg width={w} height={h}><JunctionSvg w={w} h={h} color={color} /></svg>;
    default: return null;
  }
}

function CircuitEditor({ shape, onClose }: { shape: CircuitShape; onClose: () => void }) {
  const editor = useEditor();
  const [label, setLabel] = useState(shape.props.label);
  const [value, setValue] = useState(shape.props.value);

  const apply = useCallback(() => {
    (editor as any).updateShape({
      id: shape.id,
      type: 'circuit-component',
      props: { label, value },
    });
    onClose();
  }, [editor, shape.id, label, value, onClose]);

  return (
    <div
      style={{ position: 'absolute', top: -80, left: 0, zIndex: 100, background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: 10, width: 180, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', pointerEvents: 'all' }}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div style={{ fontWeight: 600, fontSize: 11, marginBottom: 6, color: '#006c67' }}>Component Label / Value</div>
      <input type="text" value={label} onChange={(e) => setLabel(e.target.value)}
        placeholder="Label (e.g. R1)"
        style={{ border: '1px solid #d1d5db', borderRadius: 4, padding: '3px 6px', fontSize: 11, width: '100%', marginBottom: 4 }} />
      <input type="text" value={value} onChange={(e) => setValue(e.target.value)}
        placeholder="Value (e.g. 10Ω)"
        style={{ border: '1px solid #d1d5db', borderRadius: 4, padding: '3px 6px', fontSize: 11, width: '100%', marginBottom: 6 }} />
      <div style={{ display: 'flex', gap: 4 }}>
        <button onClick={apply} style={{ flex: 1, background: '#006c67', color: 'white', border: 'none', borderRadius: 4, padding: '4px 0', fontSize: 11, cursor: 'pointer' }}>Save</button>
        <button onClick={onClose} style={{ flex: 1, background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 4, padding: '4px 0', fontSize: 11, cursor: 'pointer' }}>Cancel</button>
      </div>
    </div>
  );
}

function CircuitComponent({ shape }: { shape: CircuitShape }) {
  const editor = useEditor();
  const isEditing = editor.getEditingShapeId() === shape.id;
  return (
    <HTMLContainer>
      <div style={{ position: 'relative', width: shape.props.w, height: shape.props.h, userSelect: 'none' }}>
        <CircuitComponentSvg shape={shape} />
        {isEditing && <CircuitEditor shape={shape} onClose={() => editor.setEditingShape(null)} />}
      </div>
    </HTMLContainer>
  );
}

export class CircuitShapeUtil extends ShapeUtil<CircuitShape> {
  static override type = 'circuit-component' as const;

  static override props = {
    w: T.number,
    h: T.number,
    componentType: T.string as any,
    label: T.string,
    color: T.string,
    showLabel: T.boolean,
    value: T.string,
  };

  override isAspectRatioLocked = () => false;
  override canResize = () => true;
  override canEdit = () => true;

  getDefaultProps(): CircuitShape['props'] {
    return {
      w: CIRCUIT_SIZE.w,
      h: CIRCUIT_SIZE.h,
      componentType: 'resistor',
      label: '',
      color: '#1e293b',
      showLabel: true,
      value: '',
    };
  }

  getGeometry(shape: CircuitShape) {
    return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: false });
  }

  component(shape: CircuitShape) {
    return <CircuitComponent shape={shape} />;
  }

  indicator(shape: CircuitShape) {
    return <rect width={shape.props.w} height={shape.props.h} />;
  }
}
