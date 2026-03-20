'use client';

import { ShapeUtil, TLBaseShape, T, Rectangle2d, HTMLContainer } from '@tldraw/editor';

export type StoryMountainShape = TLBaseShape<'story-mountain', {
  w: number; h: number; title: string; stages: string;
}>;

type Stage = { label: string; description: string };

const STAGE_COLORS = ['#3b82f6', '#8b5cf6', '#ef4444', '#f59e0b', '#10b981'];

function StoryMountainSvg({ shape }: { shape: StoryMountainShape }) {
  const { w, h, title, stages: stagesStr } = shape.props;
  const stages: Stage[] = (() => { try { return JSON.parse(stagesStr); } catch { return []; } })();
  const titleH = title ? 22 : 0;
  const bottomPad = 10;
  const usableH = h - titleH - bottomPad;

  // Mountain points: peak at center top, base at bottom corners
  const peakX = w / 2;
  const peakY = titleH + 16;
  const baseY = h - bottomPad;
  const baseL = 10;
  const baseR = w - 10;

  // 5 stage positions along the mountain path
  // Left slope: 0 (base-left), 1 (mid-left), peak (2)
  // Right slope: 3 (mid-right), 4 (base-right)
  const stagePoints = [
    { x: baseL + (peakX - baseL) * 0.08,  y: baseY - usableH * 0.06 },
    { x: baseL + (peakX - baseL) * 0.50,  y: baseY - usableH * 0.52 },
    { x: peakX,                             y: peakY },
    { x: peakX + (baseR - peakX) * 0.50,  y: baseY - usableH * 0.52 },
    { x: peakX + (baseR - peakX) * 0.92,  y: baseY - usableH * 0.06 },
  ];

  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <rect width={w} height={h} fill="white" rx={8} />
      {title && (
        <text x={w/2} y={16} textAnchor="middle" fontSize={13} fontWeight={700} fill="#1e293b" fontFamily="sans-serif">{title}</text>
      )}
      {/* Mountain fill */}
      <polygon
        points={`${baseL},${baseY} ${peakX},${peakY} ${baseR},${baseY}`}
        fill="#bfdbfe" stroke="#2563eb" strokeWidth={2} strokeLinejoin="round"
      />
      {/* Stage dots and labels */}
      {stages.slice(0, 5).map((stage, i) => {
        const pt = stagePoints[i];
        const color = STAGE_COLORS[i] ?? '#3b82f6';
        const isLeft = i < 2;
        const isPeak = i === 2;
        const labelX = isPeak ? pt.x : isLeft ? pt.x - 8 : pt.x + 8;
        const anchor = isPeak ? 'middle' : isLeft ? 'end' : 'start';
        const labelY = pt.y - 10;
        const descY = pt.y + 18;
        return (
          <g key={i}>
            <circle cx={pt.x} cy={pt.y} r={6} fill={color} stroke="white" strokeWidth={2} />
            <text x={labelX} y={labelY} textAnchor={anchor} fontSize={11} fontWeight={700} fill={color} fontFamily="sans-serif">{stage.label}</text>
            <text x={labelX} y={descY} textAnchor={anchor} fontSize={9} fill="#64748b" fontFamily="sans-serif"
              style={{ maxWidth: '70px' }}>{stage.description}</text>
          </g>
        );
      })}
    </svg>
  );
}

export class StoryMountainShapeUtil extends ShapeUtil<StoryMountainShape> {
  static override type = 'story-mountain' as const;
  static override props = { w: T.number, h: T.number, title: T.string, stages: T.string };
  override isAspectRatioLocked = () => false;
  override canResize = () => true;
  getDefaultProps(): StoryMountainShape['props'] {
    return {
      w: 380, h: 280, title: '',
      stages: JSON.stringify([
        { label: 'Exposition',     description: 'Characters & setting introduced' },
        { label: 'Rising Action',  description: 'Conflict develops' },
        { label: 'Climax',         description: 'Turning point / peak tension' },
        { label: 'Falling Action', description: 'Tension resolves' },
        { label: 'Resolution',     description: 'New normal established' },
      ]),
    };
  }
  getGeometry(shape: StoryMountainShape) {
    return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true });
  }
  component(shape: StoryMountainShape) {
    return <HTMLContainer><div style={{ width: shape.props.w, height: shape.props.h, background: 'white', borderRadius: 8, border: '1px solid #e2e8f0', overflow: 'hidden' }}><StoryMountainSvg shape={shape} /></div></HTMLContainer>;
  }
  indicator(shape: StoryMountainShape) {
    return <rect width={shape.props.w} height={shape.props.h} />;
  }
}
