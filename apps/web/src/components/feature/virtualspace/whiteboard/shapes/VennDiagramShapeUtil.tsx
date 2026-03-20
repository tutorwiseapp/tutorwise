/**
 * VennDiagramShapeUtil
 * Two overlapping circles for sorting / comparing concepts.
 * Editable labels for each section (left only, intersection, right only, title).
 */

'use client';

import { ShapeUtil, TLBaseShape, T, Rectangle2d, HTMLContainer, useEditor } from '@tldraw/editor';
import { useState, useCallback, useEffect, useRef } from 'react';

export type VennDiagramShape = TLBaseShape<
  'venn-diagram',
  {
    w: number;
    h: number;
    leftLabel: string;
    rightLabel: string;
    leftContent: string;
    centerContent: string;
    rightContent: string;
    title: string;
    leftColor: string;
    rightColor: string;
  }
>;

function VennComponent({ shape }: { shape: VennDiagramShape }) {
  const editor = useEditor();
  const isEditing = editor.getEditingShapeId() === shape.id;
  const [vals, setVals] = useState({
    leftLabel: shape.props.leftLabel,
    rightLabel: shape.props.rightLabel,
    leftContent: shape.props.leftContent,
    centerContent: shape.props.centerContent,
    rightContent: shape.props.rightContent,
    title: shape.props.title,
  });

  useEffect(() => {
    setVals({
      leftLabel: shape.props.leftLabel,
      rightLabel: shape.props.rightLabel,
      leftContent: shape.props.leftContent,
      centerContent: shape.props.centerContent,
      rightContent: shape.props.rightContent,
      title: shape.props.title,
    });
  }, [shape.props]);

  const save = useCallback((field: string, value: string) => {
    (editor as any).updateShape({
      id: shape.id,
      type: 'venn-diagram',
      props: { [field]: value },
    });
  }, [editor, shape.id]);

  const { w, h, leftColor, rightColor } = shape.props;

  // Circle geometry
  const cy = h / 2 + 12;
  const r = Math.min(w / 3.2, h / 2 - 16);
  const cx1 = w / 2 - r * 0.52;
  const cx2 = w / 2 + r * 0.52;

  const sectionStyle: React.CSSProperties = {
    fontSize: 11,
    lineHeight: 1.4,
    textAlign: 'center',
    color: '#1e293b',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  };

  return (
    <HTMLContainer>
      <div style={{ position: 'relative', width: w, height: h, userSelect: isEditing ? 'text' : 'none', pointerEvents: isEditing ? 'all' : undefined }}>
        {/* Title */}
        {isEditing ? (
          <input
            value={vals.title}
            onChange={(e) => setVals((v) => ({ ...v, title: e.target.value }))}
            onBlur={(e) => save('title', e.target.value)}
            placeholder="Diagram title..."
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            style={{ position: 'absolute', top: 4, left: '50%', transform: 'translateX(-50%)', border: '1px solid #e2e8f0', borderRadius: 4, padding: '2px 8px', fontSize: 13, fontWeight: 700, textAlign: 'center', outline: 'none', zIndex: 10, background: 'white', color: '#1e293b', width: '70%' }}
          />
        ) : vals.title ? (
          <div style={{ position: 'absolute', top: 6, left: 0, right: 0, textAlign: 'center', fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{vals.title}</div>
        ) : null}

        {/* SVG circles */}
        <svg style={{ position: 'absolute', inset: 0 }} width={w} height={h}>
          <circle cx={cx1} cy={cy} r={r} fill={leftColor} fillOpacity={0.15} stroke={leftColor} strokeWidth={2} />
          <circle cx={cx2} cy={cy} r={r} fill={rightColor} fillOpacity={0.15} stroke={rightColor} strokeWidth={2} />
        </svg>

        {/* Left label */}
        {isEditing ? (
          <input value={vals.leftLabel} onChange={(e) => setVals((v) => ({ ...v, leftLabel: e.target.value }))} onBlur={(e) => save('leftLabel', e.target.value)} onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()} style={{ position: 'absolute', left: cx1 - r + 6, top: cy - r - 20, width: r - 12, border: '1px solid #e2e8f0', borderRadius: 4, fontSize: 11, fontWeight: 700, textAlign: 'center', background: 'white', outline: 'none', padding: '2px 4px', color: leftColor }} />
        ) : (
          <div style={{ position: 'absolute', left: cx1 - r + 6, top: cy - r - 18, width: r - 12, fontSize: 11, fontWeight: 700, textAlign: 'center', color: leftColor }}>{vals.leftLabel}</div>
        )}

        {/* Right label */}
        {isEditing ? (
          <input value={vals.rightLabel} onChange={(e) => setVals((v) => ({ ...v, rightLabel: e.target.value }))} onBlur={(e) => save('rightLabel', e.target.value)} onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()} style={{ position: 'absolute', left: cx2 + 6, top: cy - r - 20, width: r - 12, border: '1px solid #e2e8f0', borderRadius: 4, fontSize: 11, fontWeight: 700, textAlign: 'center', background: 'white', outline: 'none', padding: '2px 4px', color: rightColor }} />
        ) : (
          <div style={{ position: 'absolute', left: cx2 + 6, top: cy - r - 18, width: r - 12, fontSize: 11, fontWeight: 700, textAlign: 'center', color: rightColor }}>{vals.rightLabel}</div>
        )}

        {/* Left section content */}
        {isEditing ? (
          <textarea value={vals.leftContent} onChange={(e) => setVals((v) => ({ ...v, leftContent: e.target.value }))} onBlur={(e) => save('leftContent', e.target.value)} onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()} placeholder="Left only..." style={{ position: 'absolute', left: cx1 - r + 8, top: cy - r / 2, width: r * 0.6, height: r, background: 'transparent', border: '1px dashed #cbd5e1', borderRadius: 4, fontSize: 11, resize: 'none', outline: 'none', textAlign: 'center', fontFamily: 'sans-serif', color: '#1e293b', padding: '4px' }} />
        ) : (
          <div style={{ ...sectionStyle, position: 'absolute', left: cx1 - r + 8, top: cy - r / 2, width: r * 0.6 }}>{vals.leftContent}</div>
        )}

        {/* Center content */}
        {isEditing ? (
          <textarea value={vals.centerContent} onChange={(e) => setVals((v) => ({ ...v, centerContent: e.target.value }))} onBlur={(e) => save('centerContent', e.target.value)} onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()} placeholder="Both..." style={{ position: 'absolute', left: w / 2 - r * 0.28, top: cy - r / 2, width: r * 0.56, height: r, background: 'transparent', border: '1px dashed #cbd5e1', borderRadius: 4, fontSize: 11, resize: 'none', outline: 'none', textAlign: 'center', fontFamily: 'sans-serif', color: '#1e293b', padding: '4px' }} />
        ) : (
          <div style={{ ...sectionStyle, position: 'absolute', left: w / 2 - r * 0.28, top: cy - r / 2, width: r * 0.56 }}>{vals.centerContent}</div>
        )}

        {/* Right section content */}
        {isEditing ? (
          <textarea value={vals.rightContent} onChange={(e) => setVals((v) => ({ ...v, rightContent: e.target.value }))} onBlur={(e) => save('rightContent', e.target.value)} onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()} placeholder="Right only..." style={{ position: 'absolute', left: cx2 + r * 0.34, top: cy - r / 2, width: r * 0.6, height: r, background: 'transparent', border: '1px dashed #cbd5e1', borderRadius: 4, fontSize: 11, resize: 'none', outline: 'none', textAlign: 'center', fontFamily: 'sans-serif', color: '#1e293b', padding: '4px' }} />
        ) : (
          <div style={{ ...sectionStyle, position: 'absolute', left: cx2 + r * 0.34, top: cy - r / 2, width: r * 0.6 }}>{vals.rightContent}</div>
        )}
      </div>
    </HTMLContainer>
  );
}

export class VennDiagramShapeUtil extends ShapeUtil<VennDiagramShape> {
  static override type = 'venn-diagram' as const;

  static override props = {
    w: T.number,
    h: T.number,
    leftLabel: T.string,
    rightLabel: T.string,
    leftContent: T.string,
    centerContent: T.string,
    rightContent: T.string,
    title: T.string,
    leftColor: T.string,
    rightColor: T.string,
  };

  override isAspectRatioLocked = () => false;
  override canResize = () => true;
  override canEdit = () => true;

  getDefaultProps(): VennDiagramShape['props'] {
    return {
      w: 340,
      h: 200,
      leftLabel: 'A',
      rightLabel: 'B',
      leftContent: '',
      centerContent: '',
      rightContent: '',
      title: '',
      leftColor: '#2563eb',
      rightColor: '#dc2626',
    };
  }

  getGeometry(shape: VennDiagramShape) {
    return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true });
  }

  component(shape: VennDiagramShape) {
    return <VennComponent shape={shape} />;
  }

  indicator(shape: VennDiagramShape) {
    return <rect width={shape.props.w} height={shape.props.h} rx={6} />;
  }
}
