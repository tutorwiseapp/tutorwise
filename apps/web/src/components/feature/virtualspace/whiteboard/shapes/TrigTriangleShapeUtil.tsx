'use client';

import { ShapeUtil, TLBaseShape, T, Rectangle2d, HTMLContainer } from '@tldraw/editor';

export type TrigTriangleShape = TLBaseShape<'trig-triangle', {
  w: number; h: number; angleDeg: number; hypotenuse: number;
  showSOHCAHTOA: boolean; color: string; showWorking: boolean;
}>;

function TrigTriangleSvg({ shape }: { shape: TrigTriangleShape }) {
  const { w, angleDeg, hypotenuse, showSOHCAHTOA, color, showWorking } = shape.props;
  const boxH = showSOHCAHTOA ? (shape.props.h - 72) : (showWorking ? shape.props.h - 52 : shape.props.h);
  const pad = 36;
  const rad = angleDeg * Math.PI / 180;
  const opp = +(hypotenuse * Math.sin(rad)).toFixed(3);
  const adj = +(hypotenuse * Math.cos(rad)).toFixed(3);

  const maxW = w - pad * 2;
  const maxH = boxH - pad * 2;
  const scale = Math.min(maxW / adj, maxH / opp, 8);
  const sw = adj * scale;
  const sh = opp * scale;

  const bx = pad + (maxW - sw) / 2;
  const by = pad + (maxH - sh) / 2;
  const A = { x: bx, y: by + sh };
  const B = { x: bx, y: by };
  const C = { x: bx + sw, y: by + sh };

  return (
    <svg width={w} height={shape.props.h} style={{ display: 'block' }}>
      <polygon points={`${A.x},${A.y} ${B.x},${B.y} ${C.x},${C.y}`} fill="rgba(219,234,254,0.4)" stroke={color} strokeWidth={2} strokeLinejoin="round" />
      {/* Right angle */}
      <polyline points={`${A.x+10},${A.y} ${A.x+10},${A.y-10} ${A.x},${A.y-10}`} fill="none" stroke="#64748b" strokeWidth={1.5} />
      {/* Angle arc */}
      <path d={`M ${C.x-20},${C.y} A 20 20 0 0 1 ${C.x - 20*Math.cos(rad)},${C.y - 20*Math.sin(rad)}`} fill="none" stroke={color} strokeWidth={1.5} />
      <text x={C.x-34} y={C.y-8} fontSize={11} fontWeight={700} fill={color} fontFamily="sans-serif">θ={angleDeg}°</text>
      {/* Side labels */}
      <text x={A.x-28} y={(A.y+B.y)/2+4} fontSize={11} fontWeight={700} fill="#ef4444" fontFamily="sans-serif" textAnchor="middle">Opp={opp}</text>
      <text x={(A.x+C.x)/2} y={A.y+16} fontSize={11} fontWeight={700} fill="#2563eb" fontFamily="sans-serif" textAnchor="middle">Adj={adj}</text>
      <text x={(B.x+C.x)/2+6} y={(B.y+C.y)/2-8} fontSize={11} fontWeight={700} fill="#059669" fontFamily="sans-serif" textAnchor="middle"
        transform={`rotate(${-angleDeg},${(B.x+C.x)/2+6},${(B.y+C.y)/2-8})`}>Hyp={hypotenuse}</text>
      {/* SOHCAHTOA */}
      {showSOHCAHTOA && (
        <g>
          <rect x={8} y={shape.props.h-68} width={w-16} height={60} rx={6} fill="#f0f9ff" stroke="#bae6fd" strokeWidth={1} />
          <text x={w/2} y={shape.props.h-52} textAnchor="middle" fontSize={13} fontWeight={700} fill="#0369a1" fontFamily="monospace">SOH · CAH · TOA</text>
          <text x={w/2} y={shape.props.h-36} textAnchor="middle" fontSize={10} fill="#0369a1" fontFamily="monospace">sin=O/H  cos=A/H  tan=O/A</text>
          <text x={w/2} y={shape.props.h-18} textAnchor="middle" fontSize={10} fill="#475569" fontFamily="monospace">
            sin={angleDeg}°={opp}/{hypotenuse}  cos={angleDeg}°={adj}/{hypotenuse}
          </text>
        </g>
      )}
      {showWorking && !showSOHCAHTOA && (
        <g>
          <rect x={8} y={shape.props.h-48} width={w-16} height={40} rx={6} fill="#f8fafc" stroke="#e2e8f0" strokeWidth={1} />
          <text x={w/2} y={shape.props.h-30} textAnchor="middle" fontSize={10} fill="#475569" fontFamily="monospace">sin={angleDeg}°={opp}/{hypotenuse}  cos={angleDeg}°={adj}/{hypotenuse}</text>
          <text x={w/2} y={shape.props.h-14} textAnchor="middle" fontSize={10} fill="#475569" fontFamily="monospace">tan={angleDeg}°={(opp/adj).toFixed(3)}</text>
        </g>
      )}
    </svg>
  );
}

export class TrigTriangleShapeUtil extends ShapeUtil<TrigTriangleShape> {
  static override type = 'trig-triangle' as const;
  static override props = {
    w: T.number, h: T.number, angleDeg: T.number, hypotenuse: T.number,
    showSOHCAHTOA: T.boolean, color: T.string, showWorking: T.boolean,
  };
  override isAspectRatioLocked = () => false;
  override canResize = () => true;
  getDefaultProps(): TrigTriangleShape['props'] {
    return { w: 280, h: 240, angleDeg: 30, hypotenuse: 5, showSOHCAHTOA: true, color: '#3b82f6', showWorking: true };
  }
  getGeometry(shape: TrigTriangleShape) {
    return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true });
  }
  component(shape: TrigTriangleShape) {
    return <HTMLContainer><div style={{ width: shape.props.w, height: shape.props.h, background: 'white', borderRadius: 8, border: '1px solid #e2e8f0', overflow: 'hidden' }}><TrigTriangleSvg shape={shape} /></div></HTMLContainer>;
  }
  indicator(shape: TrigTriangleShape) {
    return <rect width={shape.props.w} height={shape.props.h} />;
  }
}
