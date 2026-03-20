/**
 * LineShapeUtil
 * A labeled line segment between two points (x1,y1) → (x2,y2).
 * Renders on a mini coordinate background with optional point labels.
 */

'use client';

import { ShapeUtil, TLBaseShape, T, Rectangle2d, HTMLContainer } from '@tldraw/editor';

export type LineShape = TLBaseShape<
  'line-segment',
  {
    w: number;
    h: number;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    label: string;
    color: string;
    showGrid: boolean;
    labelA: string;
    labelB: string;
  }
>;

function LineSegmentSvg({ shape }: { shape: LineShape }) {
  const { w, h, x1, y1, x2, y2, color, showGrid, labelA, labelB, label } = shape.props;

  const pad = 40;
  const innerW = w - pad * 2;
  const innerH = h - pad * 2;

  // Compute axis bounds with a bit of margin around the two points
  const minX = Math.min(x1, x2, 0);
  const maxX = Math.max(x1, x2, 0);
  const minY = Math.min(y1, y2, 0);
  const maxY = Math.max(y1, y2, 0);
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;

  // add 15% margin on each side
  const marginX = rangeX * 0.2;
  const marginY = rangeY * 0.2;
  const axMinX = minX - marginX;
  const axMaxX = maxX + marginX;
  const axMinY = minY - marginY;
  const axMaxY = maxY + marginY;
  const axRangeX = axMaxX - axMinX;
  const axRangeY = axMaxY - axMinY;

  const toSvgX = (v: number) => pad + ((v - axMinX) / axRangeX) * innerW;
  const toSvgY = (v: number) => pad + ((axMaxY - v) / axRangeY) * innerH;

  const sx1 = toSvgX(x1);
  const sy1 = toSvgY(y1);
  const sx2 = toSvgX(x2);
  const sy2 = toSvgY(y2);
  const ox = toSvgX(0);
  const oy = toSvgY(0);

  // Grid lines
  const gridLines: React.ReactElement[] = [];
  if (showGrid) {
    const stepX = axRangeX / 6;
    const stepY = axRangeY / 6;
    for (let i = 0; i <= 6; i++) {
      const gx = pad + (i / 6) * innerW;
      const gy = pad + (i / 6) * innerH;
      gridLines.push(
        <line key={`gx${i}`} x1={gx} y1={pad} x2={gx} y2={h - pad} stroke="#e2e8f0" strokeWidth={0.75} />,
        <line key={`gy${i}`} x1={pad} y1={gy} x2={w - pad} y2={gy} stroke="#e2e8f0" strokeWidth={0.75} />,
      );
      // Tick labels
      const vx = axMinX + i * stepX;
      const vy = axMaxY - i * stepY;
      if (Math.abs(vx) > 0.01) {
        gridLines.push(
          <text key={`lx${i}`} x={gx} y={oy + 12} textAnchor="middle" fontSize={9} fill="#94a3b8">{vx.toFixed(1)}</text>
        );
      }
      if (Math.abs(vy) > 0.01) {
        gridLines.push(
          <text key={`ly${i}`} x={ox - 4} y={gy + 3} textAnchor="end" fontSize={9} fill="#94a3b8">{vy.toFixed(1)}</text>
        );
      }
    }
  }

  return (
    <svg width={w} height={h} style={{ display: 'block', overflow: 'visible' }}>
      {/* Background */}
      <rect width={w} height={h} fill="white" rx={6} />

      {/* Grid */}
      {gridLines}

      {/* Axes */}
      {axMinX <= 0 && axMaxX >= 0 && (
        <line x1={ox} y1={pad} x2={ox} y2={h - pad} stroke="#cbd5e1" strokeWidth={1} />
      )}
      {axMinY <= 0 && axMaxY >= 0 && (
        <line x1={pad} y1={oy} x2={w - pad} y2={oy} stroke="#cbd5e1" strokeWidth={1} />
      )}

      {/* The line segment */}
      <line x1={sx1} y1={sy1} x2={sx2} y2={sy2} stroke={color} strokeWidth={2.5} strokeLinecap="round" />

      {/* Endpoint dots */}
      <circle cx={sx1} cy={sy1} r={5} fill={color} />
      <circle cx={sx2} cy={sy2} r={5} fill={color} />

      {/* Point labels */}
      <text x={sx1} y={sy1 - 8} textAnchor="middle" fontSize={11} fontWeight="600" fill={color}>
        {labelA || `(${x1},${y1})`}
      </text>
      <text x={sx2} y={sy2 - 8} textAnchor="middle" fontSize={11} fontWeight="600" fill={color}>
        {labelB || `(${x2},${y2})`}
      </text>

      {/* Optional title label */}
      {label && (
        <text x={w / 2} y={16} textAnchor="middle" fontSize={11} fontWeight="600" fill="#1e293b">{label}</text>
      )}
    </svg>
  );
}

export class LineShapeUtil extends ShapeUtil<any> {
  static override type = 'line-segment' as const;

  static override props = {
    w: T.number,
    h: T.number,
    x1: T.number,
    y1: T.number,
    x2: T.number,
    y2: T.number,
    label: T.string,
    color: T.string,
    showGrid: T.boolean,
    labelA: T.string,
    labelB: T.string,
  };

  override isAspectRatioLocked = () => false;
  override canResize = () => true;
  override canEdit = () => false;

  getDefaultProps(): LineShape['props'] {
    return {
      w: 320,
      h: 260,
      x1: 0,
      y1: 0,
      x2: 4,
      y2: 3,
      label: '',
      color: '#3b82f6',
      showGrid: true,
      labelA: 'A',
      labelB: 'B',
    };
  }

  getGeometry(shape: LineShape) {
    return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true });
  }

  component(shape: LineShape) {
    return (
      <HTMLContainer>
        <div style={{ width: shape.props.w, height: shape.props.h, borderRadius: 8, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <LineSegmentSvg shape={shape} />
        </div>
      </HTMLContainer>
    );
  }

  indicator(shape: LineShape) {
    return <rect width={shape.props.w} height={shape.props.h} />;
  }
}
