'use client';

import { ShapeUtil, TLBaseShape, T, Rectangle2d, HTMLContainer } from '@tldraw/editor';

export type FlowchartShape = TLBaseShape<'flowchart', {
  w: number; h: number; steps: string;
}>;

type Step = { type: 'start'|'end'|'process'|'decision'|'io'; label: string };

const NODE_COLORS: Record<string, { fill: string; stroke: string; text: string }> = {
  start:    { fill: '#dcfce7', stroke: '#16a34a', text: '#15803d' },
  end:      { fill: '#dcfce7', stroke: '#16a34a', text: '#15803d' },
  process:  { fill: '#dbeafe', stroke: '#2563eb', text: '#1d4ed8' },
  decision: { fill: '#fef9c3', stroke: '#ca8a04', text: '#92400e' },
  io:       { fill: '#f3e8ff', stroke: '#7c3aed', text: '#5b21b6' },
};

function NodeShape({ type, x, y, w, h, label }: { type: string; x: number; y: number; w: number; h: number; label: string }) {
  const c = NODE_COLORS[type] ?? NODE_COLORS.process;
  const cx = x + w / 2;
  const cy = y + h / 2;
  let shape: React.ReactNode;
  if (type === 'start' || type === 'end') {
    shape = <ellipse cx={cx} cy={cy} rx={w/2} ry={h/2} fill={c.fill} stroke={c.stroke} strokeWidth={1.5} />;
  } else if (type === 'decision') {
    const pts = `${cx},${y} ${x+w},${cy} ${cx},${y+h} ${x},${cy}`;
    shape = <polygon points={pts} fill={c.fill} stroke={c.stroke} strokeWidth={1.5} />;
  } else if (type === 'io') {
    const sk = 10;
    const pts = `${x+sk},${y} ${x+w},${y} ${x+w-sk},${y+h} ${x},${y+h}`;
    shape = <polygon points={pts} fill={c.fill} stroke={c.stroke} strokeWidth={1.5} />;
  } else {
    shape = <rect x={x} y={y} width={w} height={h} rx={4} fill={c.fill} stroke={c.stroke} strokeWidth={1.5} />;
  }
  return (
    <g>
      {shape}
      <text x={cx} y={cy+4} textAnchor="middle" fontSize={11} fontWeight={600} fill={c.text} fontFamily="sans-serif">{label}</text>
    </g>
  );
}

function FlowchartSvg({ shape }: { shape: FlowchartShape }) {
  const { w, h, steps: stepsStr } = shape.props;
  const steps: Step[] = (() => { try { return JSON.parse(stepsStr); } catch { return []; } })();
  if (steps.length === 0) return <svg width={w} height={h} />;

  const nodeW = w - 40;
  const nodeH = Math.min(44, (h - 20) / steps.length - 12);
  const gap = (h - 10 - steps.length * nodeH) / (steps.length + 1);
  const nodeX = 20;

  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <rect width={w} height={h} fill="white" rx={8} />
      {steps.map((step, i) => {
        const y = gap + i * (nodeH + gap);
        const cx = nodeX + nodeW / 2;
        const prevY = i > 0 ? gap + (i-1) * (nodeH + gap) + nodeH : null;
        return (
          <g key={i}>
            {prevY !== null && (
              <>
                <line x1={cx} y1={prevY} x2={cx} y2={y} stroke="#94a3b8" strokeWidth={1.5} />
                <polygon points={`${cx},${y} ${cx-4},${y-7} ${cx+4},${y-7}`} fill="#94a3b8" />
              </>
            )}
            <NodeShape type={step.type} x={nodeX} y={y} w={nodeW} h={nodeH} label={step.label} />
            {step.type === 'decision' && (
              <>
                <text x={cx + nodeW/2 + 4} y={y + nodeH/2 + 4} fontSize={9} fill="#ca8a04" fontFamily="sans-serif">Yes ↓</text>
                <text x={cx - nodeW/2 - 4} y={y + nodeH/2 + 4} fontSize={9} fill="#ca8a04" fontFamily="sans-serif" textAnchor="end">No</text>
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export class FlowchartShapeUtil extends ShapeUtil<FlowchartShape> {
  static override type = 'flowchart' as const;
  static override props = { w: T.number, h: T.number, steps: T.string };
  override isAspectRatioLocked = () => false;
  override canResize = () => true;
  getDefaultProps(): FlowchartShape['props'] {
    return {
      w: 260, h: 340,
      steps: JSON.stringify([
        { type: 'start', label: 'Start' },
        { type: 'process', label: 'Get input' },
        { type: 'decision', label: 'Valid?' },
        { type: 'process', label: 'Process data' },
        { type: 'end', label: 'End' },
      ]),
    };
  }
  getGeometry(shape: FlowchartShape) {
    return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true });
  }
  component(shape: FlowchartShape) {
    return <HTMLContainer><div style={{ width: shape.props.w, height: shape.props.h, background: 'white', borderRadius: 8, border: '1px solid #e2e8f0', overflow: 'hidden' }}><FlowchartSvg shape={shape} /></div></HTMLContainer>;
  }
  indicator(shape: FlowchartShape) {
    return <rect width={shape.props.w} height={shape.props.h} />;
  }
}
