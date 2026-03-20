'use client';

import { ShapeUtil, TLBaseShape, T, Rectangle2d, HTMLContainer } from '@tldraw/editor';

export type ForcesDiagramShape = TLBaseShape<'forces-diagram', {
  w: number; h: number; bodyLabel: string; forces: string;
}>;

type Force = { label: string; direction: number; magnitude: number; color: string };

function ForcesDiagramSvg({ shape }: { shape: ForcesDiagramShape }) {
  const { w, h, bodyLabel, forces: forcesStr } = shape.props;
  const forces: Force[] = (() => { try { return JSON.parse(forcesStr); } catch { return []; } })();

  const cx = w / 2;
  const cy = h / 2;
  const bodyW = 60;
  const bodyH = 44;

  const maxMag = Math.max(...forces.map(f => f.magnitude), 1);
  const arrowLen = Math.min(cx - bodyW / 2 - 28, cy - bodyH / 2 - 28, 60);

  // Grid dots
  const dots: React.ReactNode[] = [];
  for (let dx = 0; dx < w; dx += 20) {
    for (let dy = 0; dy < h; dy += 20) {
      dots.push(<circle key={`${dx}-${dy}`} cx={dx} cy={dy} r={1} fill="#e2e8f0" />);
    }
  }

  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <rect width={w} height={h} fill="white" />
      {dots}
      {/* Body */}
      <rect x={cx-bodyW/2} y={cy-bodyH/2} width={bodyW} height={bodyH} rx={6} fill="#f1f5f9" stroke="#475569" strokeWidth={2} />
      <text x={cx} y={cy+5} textAnchor="middle" fontSize={12} fontWeight={700} fill="#1e293b" fontFamily="sans-serif">{bodyLabel}</text>
      {/* Force arrows */}
      {forces.map((f, i) => {
        const rad = (f.direction - 90) * Math.PI / 180; // 0=up means -90deg from x-axis
        const len = (f.magnitude / maxMag) * arrowLen;
        const ex = cx + len * Math.cos(rad);
        const ey = cy + len * Math.sin(rad);
        // Arrow head
        const angle = Math.atan2(ey - cy, ex - cx);
        const ah = 8;
        const ax1 = ex - ah * Math.cos(angle - 0.4);
        const ay1 = ey - ah * Math.sin(angle - 0.4);
        const ax2 = ex - ah * Math.cos(angle + 0.4);
        const ay2 = ey - ah * Math.sin(angle + 0.4);
        // Label position
        const lx = ex + 12 * Math.cos(angle);
        const ly = ey + 12 * Math.sin(angle);
        return (
          <g key={i}>
            <line x1={cx} y1={cy} x2={ex} y2={ey} stroke={f.color} strokeWidth={2.5} />
            <polygon points={`${ex},${ey} ${ax1},${ay1} ${ax2},${ay2}`} fill={f.color} />
            <text x={lx} y={ly} textAnchor="middle" fontSize={10} fontWeight={600} fill={f.color} fontFamily="sans-serif"
              style={{ paintOrder: 'stroke', stroke: 'white', strokeWidth: 3 }}>{f.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

export class ForcesDiagramShapeUtil extends ShapeUtil<ForcesDiagramShape> {
  static override type = 'forces-diagram' as const;
  static override props = { w: T.number, h: T.number, bodyLabel: T.string, forces: T.string };
  override isAspectRatioLocked = () => false;
  override canResize = () => true;
  getDefaultProps(): ForcesDiagramShape['props'] {
    return {
      w: 280, h: 280, bodyLabel: 'Object',
      forces: JSON.stringify([
        { label: 'Weight (W)', direction: 180, magnitude: 80, color: '#ef4444' },
        { label: 'Normal (N)', direction: 0,   magnitude: 80, color: '#3b82f6' },
      ]),
    };
  }
  getGeometry(shape: ForcesDiagramShape) {
    return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true });
  }
  component(shape: ForcesDiagramShape) {
    return <HTMLContainer><div style={{ width: shape.props.w, height: shape.props.h, borderRadius: 8, border: '1px solid #e2e8f0', overflow: 'hidden' }}><ForcesDiagramSvg shape={shape} /></div></HTMLContainer>;
  }
  indicator(shape: ForcesDiagramShape) {
    return <rect width={shape.props.w} height={shape.props.h} />;
  }
}
