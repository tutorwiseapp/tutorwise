/**
 * MathEquationShapeUtil
 * Renders LaTeX equations on the whiteboard using KaTeX.
 * Double-click to edit. Supports inline and display mode.
 */

'use client';

import { ShapeUtil, TLBaseShape, T, Rectangle2d, HTMLContainer, useEditor } from '@tldraw/editor';
import { useState, useEffect, useRef, useCallback } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

export type MathEquationShape = TLBaseShape<
  'math-equation',
  {
    w: number;
    h: number;
    latex: string;
    displayMode: boolean;
    color: string;
    fontSize: number;
  }
>;

function MathEquationComponent({ shape, isEditing }: { shape: MathEquationShape; isEditing: boolean }) {
  const editor = useEditor();
  const [inputValue, setInputValue] = useState(shape.props.latex);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setInputValue(shape.props.latex);
  }, [shape.props.latex]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInputValue(e.target.value);
      (editor as any).updateShape({
        id: shape.id,
        type: 'math-equation',
        props: { latex: e.target.value },
      });
    },
    [editor, shape.id]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        editor.setEditingShape(null);
      }
      // Allow Shift+Enter for new line; Enter alone exits editing
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        editor.setEditingShape(null);
      }
      e.stopPropagation();
    },
    [editor]
  );

  // Render KaTeX
  let renderedHtml = '';
  let renderError = '';
  try {
    renderedHtml = katex.renderToString(shape.props.latex || '\\text{(empty)}', {
      displayMode: shape.props.displayMode,
      throwOnError: false,
      errorColor: '#cc0000',
      macros: {
        '\\R': '\\mathbb{R}',
        '\\N': '\\mathbb{N}',
        '\\Z': '\\mathbb{Z}',
        '\\Q': '\\mathbb{Q}',
        '\\C': '\\mathbb{C}',
        '\\vec': '\\overrightarrow',
      },
    });
  } catch {
    renderError = 'Invalid LaTeX';
  }

  if (isEditing) {
    return (
      <HTMLContainer>
        <div
          style={{
            width: shape.props.w,
            minHeight: shape.props.h,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            padding: 12,
            background: '#fff',
            border: '2px solid #006c67',
            borderRadius: 8,
            boxShadow: '0 4px 16px rgba(0,108,103,0.15)',
            pointerEvents: 'all',
          }}
        >
          <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace', marginBottom: 2 }}>
            LaTeX — Enter to save, Shift+Enter for new line
          </div>
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              minHeight: 60,
              fontSize: 13,
              fontFamily: 'monospace',
              border: '1px solid #d1d5db',
              borderRadius: 4,
              padding: '6px 8px',
              resize: 'vertical',
              outline: 'none',
              background: '#f8fafc',
            }}
            placeholder="e.g. x = \frac{-b \pm \sqrt{b^2-4ac}}{2a}"
          />
          <div style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'monospace' }}>
            Preview:
          </div>
          <div
            style={{ padding: '4px 8px', background: '#f8f9fa', borderRadius: 4, minHeight: 32 }}
            dangerouslySetInnerHTML={{ __html: renderedHtml }}
          />
        </div>
      </HTMLContainer>
    );
  }

  return (
    <HTMLContainer>
      <div
        style={{
          width: shape.props.w,
          minHeight: shape.props.h,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 12,
          background: 'white',
          border: '1.5px solid #e2e8f0',
          borderRadius: 8,
          cursor: 'default',
          userSelect: 'none',
          overflow: 'hidden',
        }}
      >
        {renderError ? (
          <span style={{ color: '#cc0000', fontSize: 12 }}>{renderError}</span>
        ) : (
          <div
            style={{ color: shape.props.color, fontSize: shape.props.fontSize }}
            dangerouslySetInnerHTML={{ __html: renderedHtml }}
          />
        )}
      </div>
    </HTMLContainer>
  );
}

export class MathEquationShapeUtil extends ShapeUtil<any> {
  static override type = 'math-equation' as const;

  static override props = {
    w: T.number,
    h: T.number,
    latex: T.string,
    displayMode: T.boolean,
    color: T.string,
    fontSize: T.number,
  };

  override isAspectRatioLocked = () => false;
  override canResize = () => true;
  override canEdit = () => true;

  getDefaultProps(): MathEquationShape['props'] {
    return {
      w: 280,
      h: 80,
      latex: 'x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}',
      displayMode: true,
      color: '#1e293b',
      fontSize: 16,
    };
  }

  getGeometry(shape: MathEquationShape) {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    });
  }

  component(shape: MathEquationShape) {
    // useIsEditing is not available as import, check via editor
    return <MathEquationComponentWrapper shape={shape} />;
  }

  indicator(shape: MathEquationShape) {
    return <rect width={shape.props.w} height={shape.props.h} rx={8} />;
  }
}

function MathEquationComponentWrapper({ shape }: { shape: MathEquationShape }) {
  const editor = useEditor();
  const isEditing = editor.getEditingShapeId() === shape.id;
  return <MathEquationComponent shape={shape} isEditing={isEditing} />;
}
