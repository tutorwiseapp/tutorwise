'use client';

import { ShapeUtil, TLBaseShape, T, Rectangle2d, HTMLContainer } from '@tldraw/editor';

export type FunctionPlotShape = TLBaseShape<'function-plot', {
  w: number; h: number; xMin: number; xMax: number; yMin: number; yMax: number;
  showGrid: boolean; xLabel: string; yLabel: string; functions: string;
}>;

type FnDef = { type: 'linear'|'quadratic'|'sine'|'cosine'|'cubic'; params: number[]; color: string; label: string };

function evalFn(fn: FnDef, x: number): number {
  const p = fn.params;
  if (fn.type === 'linear')    return (p[0]??1)*x + (p[1]??0);
  if (fn.type === 'quadratic') return (p[0]??1)*x*x + (p[1]??0)*x + (p[2]??0);
  if (fn.type === 'sine')      return (p[0]??1)*Math.sin((p[1]??1)*x + (p[2]??0));
  if (fn.type === 'cosine')    return (p[0]??1)*Math.cos((p[1]??1)*x + (p[2]??0));
  if (fn.type === 'cubic')     return (p[0]??1)*x*x*x + (p[1]??0)*x*x + (p[2]??0)*x + (p[3]??0);
  return 0;
}

function FunctionPlotSvg({ shape }: { shape: FunctionPlotShape }) {
  const { w, h, xMin, xMax, yMin, yMax, showGrid, xLabel, yLabel, functions } = shape.props;
  const pad = { l: 36, r: 12, t: 12, b: 32 };
  const pw = w - pad.l - pad.r;
  const ph = h - pad.t - pad.b;

  const toSx = (x: number) => pad.l + ((x - xMin) / (xMax - xMin)) * pw;
  const toSy = (y: number) => pad.t + ((yMax - y) / (yMax - yMin)) * ph;

  const fns: FnDef[] = (() => { try { return JSON.parse(functions); } catch { return []; } })();

  // Grid ticks
  const xTicks: number[] = [];
  for (let x = Math.ceil(xMin); x <= xMax; x++) xTicks.push(x);
  const yTicks: number[] = [];
  for (let y = Math.ceil(yMin); y <= yMax; y++) yTicks.push(y);

  return (
    <svg width={w} height={h} style={{ display: 'block', overflow: 'hidden' }}>
      <rect x={pad.l} y={pad.t} width={pw} height={ph} fill="white" stroke="#e2e8f0" />
      {showGrid && xTicks.map(x => (
        <line key={`gx${x}`} x1={toSx(x)} y1={pad.t} x2={toSx(x)} y2={pad.t+ph} stroke="#e2e8f0" strokeWidth={1} />
      ))}
      {showGrid && yTicks.map(y => (
        <line key={`gy${y}`} x1={pad.l} y1={toSy(y)} x2={pad.l+pw} y2={toSy(y)} stroke="#e2e8f0" strokeWidth={1} />
      ))}
      {/* Axes */}
      {yMin <= 0 && yMax >= 0 && <line x1={pad.l} y1={toSy(0)} x2={pad.l+pw} y2={toSy(0)} stroke="#1e293b" strokeWidth={1.5} />}
      {xMin <= 0 && xMax >= 0 && <line x1={toSx(0)} y1={pad.t} x2={toSx(0)} y2={pad.t+ph} stroke="#1e293b" strokeWidth={1.5} />}
      {/* Tick labels */}
      {xTicks.filter(x => x !== 0).map(x => (
        <text key={`xl${x}`} x={toSx(x)} y={pad.t+ph+12} textAnchor="middle" fontSize={9} fill="#64748b" fontFamily="sans-serif">{x}</text>
      ))}
      {yTicks.filter(y => y !== 0).map(y => (
        <text key={`yl${y}`} x={pad.l-4} y={toSy(y)+3} textAnchor="end" fontSize={9} fill="#64748b" fontFamily="sans-serif">{y}</text>
      ))}
      {/* Axis labels */}
      <text x={pad.l+pw/2} y={h-4} textAnchor="middle" fontSize={11} fill="#475569" fontFamily="sans-serif">{xLabel}</text>
      <text x={10} y={pad.t+ph/2} textAnchor="middle" fontSize={11} fill="#475569" fontFamily="sans-serif" transform={`rotate(-90,10,${pad.t+ph/2})`}>{yLabel}</text>
      {/* Functions */}
      {fns.map((fn, i) => {
        const pts: string[] = [];
        const N = 100;
        for (let k = 0; k <= N; k++) {
          const x = xMin + (xMax - xMin) * k / N;
          const y = evalFn(fn, x);
          if (!isFinite(y)) continue;
          const sx = toSx(x);
          const sy = toSy(y);
          if (sy < pad.t - 2 || sy > pad.t + ph + 2) continue;
          pts.push(`${sx},${sy}`);
        }
        return pts.length > 1 ? <polyline key={i} points={pts.join(' ')} fill="none" stroke={fn.color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /> : null;
      })}
      {/* Legend */}
      {fns.map((fn, i) => (
        <g key={`lg${i}`}>
          <line x1={pad.l+pw-70} y1={pad.t+10+i*14} x2={pad.l+pw-56} y2={pad.t+10+i*14} stroke={fn.color} strokeWidth={2} />
          <text x={pad.l+pw-52} y={pad.t+14+i*14} fontSize={9} fill={fn.color} fontFamily="sans-serif">{fn.label}</text>
        </g>
      ))}
    </svg>
  );
}

export class FunctionPlotShapeUtil extends ShapeUtil<any> {
  static override type = 'function-plot' as const;
  static override props = {
    w: T.number, h: T.number, xMin: T.number, xMax: T.number,
    yMin: T.number, yMax: T.number, showGrid: T.boolean,
    xLabel: T.string, yLabel: T.string, functions: T.string,
  };
  override isAspectRatioLocked = () => false;
  override canResize = () => true;
  getDefaultProps(): FunctionPlotShape['props'] {
    return { w: 320, h: 320, xMin: -5, xMax: 5, yMin: -5, yMax: 5, showGrid: true, xLabel: 'x', yLabel: 'y', functions: JSON.stringify([{type:'linear',params:[1,0],color:'#3b82f6',label:'y = x'}]) };
  }
  getGeometry(shape: FunctionPlotShape) {
    return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true });
  }
  component(shape: FunctionPlotShape) {
    return <HTMLContainer><div style={{ width: shape.props.w, height: shape.props.h, background: 'white', borderRadius: 8, border: '1px solid #e2e8f0', overflow: 'hidden' }}><FunctionPlotSvg shape={shape} /></div></HTMLContainer>;
  }
  indicator(shape: FunctionPlotShape) {
    return <rect width={shape.props.w} height={shape.props.h} />;
  }
}
