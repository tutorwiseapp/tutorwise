'use client';

import { ShapeUtil, TLBaseShape, T, Rectangle2d, HTMLContainer } from '@tldraw/editor';

export type WaveDiagramShape = TLBaseShape<'wave-diagram', {
  w: number; h: number; amplitude: number; frequency: number;
  showLabels: boolean; color: string; label: string; waveType: string;
}>;

function TransverseWave({ w, h, amplitude, frequency, color, showLabels, label }: {
  w: number; h: number; amplitude: number; frequency: number; color: string; showLabels: boolean; label: string;
}) {
  const pad = { l: 16, r: 16, t: label ? 24 : 10, b: 10 };
  const pw = w - pad.l - pad.r;
  const ph = h - pad.t - pad.b;
  const cy = pad.t + ph / 2;
  const amp = Math.min(amplitude, ph / 2 - 10);

  const N = 200;
  const pts = Array.from({ length: N + 1 }, (_, i) => {
    const x = pad.l + (i / N) * pw;
    const y = cy - amp * Math.sin(2 * Math.PI * frequency * (i / N));
    return `${x},${y}`;
  }).join(' ');

  // One wavelength = pw / frequency
  const wl = pw / frequency;
  const wlStartX = pad.l;

  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      {label && <text x={w/2} y={16} textAnchor="middle" fontSize={12} fontWeight={700} fill="#1e293b" fontFamily="sans-serif">{label}</text>}
      {/* Centre line */}
      <line x1={pad.l} y1={cy} x2={pad.l+pw} y2={cy} stroke="#cbd5e1" strokeWidth={1} strokeDasharray="4,3" />
      {/* Wave */}
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      {showLabels && (
        <>
          {/* Amplitude arrow */}
          <line x1={pad.l+10} y1={cy} x2={pad.l+10} y2={cy-amp} stroke="#ef4444" strokeWidth={1.5} markerEnd="url(#amp-arrow)" />
          <line x1={pad.l+10} y1={cy} x2={pad.l+10} y2={cy+amp} stroke="#ef4444" strokeWidth={1.5} />
          <text x={pad.l+16} y={cy-amp/2} fontSize={10} fill="#ef4444" fontFamily="sans-serif">Amplitude</text>
          {/* Wavelength bracket */}
          <line x1={wlStartX} y1={pad.t+ph-8} x2={wlStartX+wl} y2={pad.t+ph-8} stroke="#059669" strokeWidth={1.5} />
          <line x1={wlStartX} y1={pad.t+ph-13} x2={wlStartX} y2={pad.t+ph-3} stroke="#059669" strokeWidth={1.5} />
          <line x1={wlStartX+wl} y1={pad.t+ph-13} x2={wlStartX+wl} y2={pad.t+ph-3} stroke="#059669" strokeWidth={1.5} />
          <text x={wlStartX+wl/2} y={pad.t+ph+6} textAnchor="middle" fontSize={11} fill="#059669" fontFamily="sans-serif">λ</text>
        </>
      )}
    </svg>
  );
}

function LongitudinalWave({ w, h, frequency, color, showLabels, label }: {
  w: number; h: number; frequency: number; color: string; showLabels: boolean; label: string;
}) {
  const pad = { l: 16, r: 16, t: label ? 28 : 14, b: showLabels ? 22 : 10 };
  const pw = w - pad.l - pad.r;
  const ph = h - pad.t - pad.b;
  const N = 60;
  const bars: React.ReactNode[] = [];
  for (let i = 0; i <= N; i++) {
    const frac = i / N;
    const density = 0.5 + 0.5 * Math.sin(2 * Math.PI * frequency * frac);
    const x = pad.l + frac * pw;
    const spacing = 4 + (1 - density) * 8;
    if (i % Math.round(spacing) === 0) {
      const opacity = 0.3 + density * 0.7;
      bars.push(<line key={i} x1={x} y1={pad.t} x2={x} y2={pad.t+ph} stroke={color} strokeWidth={1.5} opacity={opacity} />);
    }
  }
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      {label && <text x={w/2} y={16} textAnchor="middle" fontSize={12} fontWeight={700} fill="#1e293b" fontFamily="sans-serif">{label}</text>}
      <rect x={pad.l} y={pad.t} width={pw} height={ph} fill="#f8fafc" rx={4} />
      {bars}
      {showLabels && (
        <>
          <text x={pad.l + pw * 0.2} y={h-6} textAnchor="middle" fontSize={9} fill="#64748b" fontFamily="sans-serif">compression</text>
          <text x={pad.l + pw * 0.7} y={h-6} textAnchor="middle" fontSize={9} fill="#94a3b8" fontFamily="sans-serif">rarefaction</text>
        </>
      )}
    </svg>
  );
}

export class WaveDiagramShapeUtil extends ShapeUtil<WaveDiagramShape> {
  static override type = 'wave-diagram' as const;
  static override props = {
    w: T.number, h: T.number, amplitude: T.number, frequency: T.number,
    showLabels: T.boolean, color: T.string, label: T.string, waveType: T.string,
  };
  override isAspectRatioLocked = () => false;
  override canResize = () => true;
  getDefaultProps(): WaveDiagramShape['props'] {
    return { w: 360, h: 200, amplitude: 40, frequency: 2, showLabels: true, color: '#3b82f6', label: '', waveType: 'transverse' };
  }
  getGeometry(shape: WaveDiagramShape) {
    return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true });
  }
  component(shape: WaveDiagramShape) {
    const { w, h, amplitude, frequency, color, showLabels, label, waveType } = shape.props;
    return (
      <HTMLContainer>
        <div style={{ width: w, height: h, background: 'white', borderRadius: 8, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          {waveType === 'longitudinal'
            ? <LongitudinalWave w={w} h={h} frequency={frequency} color={color} showLabels={showLabels} label={label} />
            : <TransverseWave w={w} h={h} amplitude={amplitude} frequency={frequency} color={color} showLabels={showLabels} label={label} />
          }
        </div>
      </HTMLContainer>
    );
  }
  indicator(shape: WaveDiagramShape) {
    return <rect width={shape.props.w} height={shape.props.h} />;
  }
}
