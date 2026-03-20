'use client';

import { ShapeUtil, TLBaseShape, T, Rectangle2d, HTMLContainer } from '@tldraw/editor';

export type ProbabilityTreeShape = TLBaseShape<'probability-tree', {
  w: number; h: number; title: string; branches: string;
}>;

type Leaf = { label: string; prob: string; color: string };
type Branch = Leaf & { children: Leaf[] };

function ProbabilityTreeSvg({ shape }: { shape: ProbabilityTreeShape }) {
  const { w, h, title, branches: branchesStr } = shape.props;
  const branches: Branch[] = (() => { try { return JSON.parse(branchesStr); } catch { return []; } })();

  const rootX = 28;
  const titleH = title ? 20 : 0;
  const mid1X = w * 0.38;
  const mid2X = w * 0.72;
  const usableH = h - titleH - 16;

  const l1Count = branches.length;
  const l1Ys = branches.map((_, i) => titleH + 12 + (i + 0.5) * (usableH / l1Count));

  const allLeafs: Array<{ x: number; y: number; label: string; color: string; pathLabel: string; combinedProb: string }> = [];
  branches.forEach((b, bi) => {
    const l1Y = l1Ys[bi];
    (b.children ?? []).forEach((c, ci) => {
      const total = b.children.length;
      const leafY = titleH + 12 + (bi * total + ci + 0.5) * (usableH / (l1Count * total));
      allLeafs.push({ x: mid2X, y: leafY, label: c.label, color: c.color, pathLabel: b.label + c.label, combinedProb: b.prob + '×' + c.prob });
    });
    return l1Y;
  });

  let leafIdx = 0;
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      {title && <text x={w/2} y={14} textAnchor="middle" fontSize={12} fontWeight={700} fill="#1e293b" fontFamily="sans-serif">{title}</text>}
      {/* Root dot */}
      <circle cx={rootX} cy={h/2} r={5} fill="#475569" />
      {branches.map((b, bi) => {
        const l1Y = l1Ys[bi];
        const myLeafs = allLeafs.slice(leafIdx, leafIdx + (b.children?.length ?? 0));
        leafIdx += b.children?.length ?? 0;
        return (
          <g key={bi}>
            <line x1={rootX+5} y1={h/2} x2={mid1X-6} y2={l1Y} stroke="#94a3b8" strokeWidth={1.5} />
            <circle cx={mid1X} cy={l1Y} r={5} fill={b.color} />
            <text x={(rootX+mid1X)/2} y={l1Y-5} textAnchor="middle" fontSize={10} fill={b.color} fontWeight={600} fontFamily="sans-serif">{b.prob}</text>
            <text x={mid1X+8} y={l1Y+4} fontSize={11} fontWeight={600} fill={b.color} fontFamily="sans-serif">{b.label}</text>
            {myLeafs.map((lf, li) => (
              <g key={li}>
                <line x1={mid1X+5} y1={l1Y} x2={mid2X-6} y2={lf.y} stroke="#94a3b8" strokeWidth={1.5} />
                <circle cx={mid2X} cy={lf.y} r={4} fill={lf.color} />
                <text x={(mid1X+mid2X)/2} y={lf.y-5} textAnchor="middle" fontSize={9} fill={lf.color} fontWeight={600} fontFamily="sans-serif">{b.children[li].prob}</text>
                <text x={mid2X+8} y={lf.y+4} fontSize={10} fontWeight={600} fill={lf.color} fontFamily="sans-serif">{lf.label}</text>
                <text x={mid2X+26} y={lf.y+4} fontSize={9} fill="#64748b" fontFamily="sans-serif">{lf.pathLabel} ({lf.combinedProb})</text>
              </g>
            ))}
          </g>
        );
      })}
    </svg>
  );
}

export class ProbabilityTreeShapeUtil extends ShapeUtil<ProbabilityTreeShape> {
  static override type = 'probability-tree' as const;
  static override props = { w: T.number, h: T.number, title: T.string, branches: T.string };
  override isAspectRatioLocked = () => false;
  override canResize = () => true;
  getDefaultProps(): ProbabilityTreeShape['props'] {
    return {
      w: 380, h: 280, title: 'Probability Tree',
      branches: JSON.stringify([
        {label:'H',prob:'1/2',color:'#3b82f6',children:[{label:'H',prob:'1/2',color:'#3b82f6'},{label:'T',prob:'1/2',color:'#ef4444'}]},
        {label:'T',prob:'1/2',color:'#ef4444',children:[{label:'H',prob:'1/2',color:'#3b82f6'},{label:'T',prob:'1/2',color:'#ef4444'}]},
      ]),
    };
  }
  getGeometry(shape: ProbabilityTreeShape) {
    return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true });
  }
  component(shape: ProbabilityTreeShape) {
    return <HTMLContainer><div style={{ width: shape.props.w, height: shape.props.h, background: 'white', borderRadius: 8, border: '1px solid #e2e8f0', overflow: 'hidden' }}><ProbabilityTreeSvg shape={shape} /></div></HTMLContainer>;
  }
  indicator(shape: ProbabilityTreeShape) {
    return <rect width={shape.props.w} height={shape.props.h} />;
  }
}
