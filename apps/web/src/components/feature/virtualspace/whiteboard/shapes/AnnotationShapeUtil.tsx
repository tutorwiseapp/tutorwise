/**
 * AnnotationShapeUtil
 * English / Humanities — a sticky annotation card with a highlight colour band.
 * Used to annotate text excerpts on the whiteboard: highlight + comment.
 * Double-click to edit comment text.
 */

'use client';

import { ShapeUtil, TLBaseShape, T, Rectangle2d, HTMLContainer, useEditor } from '@tldraw/editor';
import { useState, useEffect, useRef, useCallback } from 'react';

export type AnnotationType = 'highlight' | 'comment' | 'technique' | 'quote' | 'question';

export type AnnotationShape = TLBaseShape<
  'annotation',
  {
    w: number;
    h: number;
    text: string;
    highlightColor: string;
    annotationType: AnnotationType;
    label: string; // e.g. "Metaphor", "Theme: Power"
    showBadge: boolean;
  }
>;

const ANNOTATION_TYPE_CONFIG: Record<AnnotationType, { label: string; color: string; bg: string }> = {
  highlight: { label: 'Highlight', color: '#d97706', bg: '#fef3c7' },
  comment: { label: 'Comment', color: '#2563eb', bg: '#dbeafe' },
  technique: { label: 'Technique', color: '#7c3aed', bg: '#ede9fe' },
  quote: { label: 'Quote', color: '#059669', bg: '#d1fae5' },
  question: { label: 'Question', color: '#dc2626', bg: '#fee2e2' },
};

function AnnotationComponent({ shape }: { shape: AnnotationShape }) {
  const editor = useEditor();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(() => editor.getEditingShapeId() === shape.id);
  useEffect(() => {
    return editor.store.listen(() => setIsEditing(editor.getEditingShapeId() === shape.id));
  }, [editor, shape.id]);
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !isEditing) return;
    const stop = (e: PointerEvent) => e.stopPropagation();
    el.addEventListener('pointerdown', stop, false);
    el.addEventListener('pointermove', stop, false);
    el.addEventListener('pointerup', stop, false);
    return () => {
      el.removeEventListener('pointerdown', stop, false);
      el.removeEventListener('pointermove', stop, false);
      el.removeEventListener('pointerup', stop, false);
    };
  }, [isEditing]);
  const [text, setText] = useState(shape.props.text);
  const [label, setLabel] = useState(shape.props.label);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const typeConfig = ANNOTATION_TYPE_CONFIG[shape.props.annotationType];

  useEffect(() => {
    setText(shape.props.text);
    setLabel(shape.props.label);
  }, [shape.props.text, shape.props.label]);

  useEffect(() => {
    if (isEditing && textRef.current) {
      textRef.current.focus();
      textRef.current.select();
    }
  }, [isEditing]);

  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setText(e.target.value);
      (editor as any).updateShape({
        id: shape.id,
        type: 'annotation',
        props: { text: e.target.value },
      });
    },
    [editor, shape.id]
  );

  const handleLabelChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setLabel(e.target.value);
      (editor as any).updateShape({
        id: shape.id,
        type: 'annotation',
        props: { label: e.target.value },
      });
    },
    [editor, shape.id]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') editor.setEditingShape(null);
      e.stopPropagation();
    },
    [editor]
  );

  return (
    <HTMLContainer>
      <div
        ref={containerRef}
        style={{
          width: shape.props.w,
          height: shape.props.h,
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 6,
          border: `2px solid ${typeConfig.color}`,
          background: typeConfig.bg,
          overflow: 'hidden',
          userSelect: isEditing ? 'text' : 'none',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          pointerEvents: isEditing ? 'all' : undefined,
        }}
      >
        {/* Header bar */}
        <div
          style={{
            background: typeConfig.color,
            padding: '3px 8px',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 9, fontWeight: 700, color: 'white', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {typeConfig.label}
          </span>
          {isEditing ? (
            <input
              value={label}
              onChange={handleLabelChange}
              onKeyDown={handleKeyDown}
              onClick={(e) => e.stopPropagation()}
              placeholder="Add label..."
              style={{
                flex: 1, fontSize: 9, border: 'none', background: 'rgba(255,255,255,0.25)',
                borderRadius: 2, padding: '1px 4px', color: 'white', outline: 'none', fontFamily: 'sans-serif',
              }}
            />
          ) : label ? (
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.9)', fontFamily: 'sans-serif' }}>— {label}</span>
          ) : null}
        </div>

        {/* Body */}
        <div style={{ flex: 1, padding: '6px 8px', overflow: 'hidden' }}>
          {isEditing ? (
            <textarea
              ref={textRef}
              value={text}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                background: 'transparent',
                fontSize: 12,
                fontFamily: 'sans-serif',
                color: '#1e293b',
                resize: 'none',
                outline: 'none',
                lineHeight: 1.5,
              }}
              placeholder="Type your annotation here..."
            />
          ) : (
            <p
              style={{
                margin: 0,
                fontSize: 12,
                fontFamily: 'sans-serif',
                color: '#1e293b',
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap',
                overflow: 'hidden',
              }}
            >
              {shape.props.text || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Double-click to add annotation...</span>}
            </p>
          )}
        </div>
      </div>
    </HTMLContainer>
  );
}

export class AnnotationShapeUtil extends ShapeUtil<any> {
  static override type = 'annotation' as const;

  static override props = {
    w: T.number,
    h: T.number,
    text: T.string,
    highlightColor: T.string,
    annotationType: T.string as any,
    label: T.string,
    showBadge: T.boolean,
  };

  override isAspectRatioLocked = () => false;
  override canResize = () => true;
  override canEdit = () => true;

  getDefaultProps(): AnnotationShape['props'] {
    return {
      w: 200,
      h: 100,
      text: '',
      highlightColor: '#fef3c7',
      annotationType: 'highlight',
      label: '',
      showBadge: true,
    };
  }

  getGeometry(shape: AnnotationShape) {
    return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true });
  }

  component(shape: AnnotationShape) {
    return <AnnotationComponent shape={shape} />;
  }

  indicator(shape: AnnotationShape) {
    return <rect width={shape.props.w} height={shape.props.h} rx={6} />;
  }
}
