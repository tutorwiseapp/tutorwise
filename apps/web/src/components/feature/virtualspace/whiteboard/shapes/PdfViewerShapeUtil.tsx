/**
 * PdfViewerShapeUtil — tldraw shape that renders a PDF via pdfjs-dist
 *
 * Tutors upload a PDF (stored in Supabase Storage). Each page renders as a
 * canvas element inside an HTMLContainer. Both participants can draw over it
 * with native tldraw tools — the shape syncs via the existing Ably draw channel.
 */

'use client';

import { ShapeUtil, HTMLContainer } from 'tldraw';
import { useEffect, useRef, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, FileText } from 'lucide-react';

// ── Shape type ──────────────────────────────────────────────────────────────

export type PdfViewerShape = {
  id: string;
  type: 'pdf-viewer';
  x: number;
  y: number;
  rotation: number;
  isLocked: boolean;
  opacity: number;
  meta: Record<string, unknown>;
  props: {
    w: number;
    h: number;
    pdfUrl: string;
    page: number;
    totalPages: number;
    label: string;
  };
};

// ── PDF Renderer ────────────────────────────────────────────────────────────

function PdfPage({ pdfUrl, page }: { pdfUrl: string; page: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!pdfUrl || !canvasRef.current) return;
    let cancelled = false;

    (async () => {
      try {
        // Dynamic import to avoid SSR issues with pdfjs-dist
        const pdfjsLib = await import('pdfjs-dist');
        // Use the legacy build worker path for Next.js compatibility
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

        const pdf = await pdfjsLib.getDocument(pdfUrl).promise;
        if (cancelled) return;

        const pdfPage = await pdf.getPage(page);
        if (cancelled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const viewport = pdfPage.getViewport({ scale: 1.5 });
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await pdfPage.render({ canvasContext: ctx, viewport, canvas } as any).promise;
      } catch (err: any) {
        if (!cancelled) setError(err?.message || 'Failed to render PDF');
      }
    })();

    return () => { cancelled = true; };
  }, [pdfUrl, page]);

  if (error) {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#ef4444',
        fontSize: 12,
        padding: 8,
        textAlign: 'center',
      }}>
        {error}
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: 'calc(100% - 36px)', objectFit: 'contain' }}
    />
  );
}

// ── Shape Util ──────────────────────────────────────────────────────────────

export class PdfViewerShapeUtil extends ShapeUtil<any> {
  static override type = 'pdf-viewer' as const;

  override getDefaultProps() {
    return {
      w: 520,
      h: 680,
      pdfUrl: '',
      page: 1,
      totalPages: 1,
      label: 'PDF Document',
    };
  }

  override canEdit() { return false; }
  override canResize() { return true; }
  override canScroll() { return false; }

  override getGeometry(shape: any) {
    const { Rectangle2d } = require('@tldraw/editor');
    return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true });
  }

  override component(shape: any) {
    const { pdfUrl, page, totalPages, label } = shape.props;

    return (
      <HTMLContainer
        id={shape.id}
        style={{
          width: shape.props.w,
          height: shape.props.h,
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 6,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '5px 10px',
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          fontSize: 11,
          color: '#475569',
          flexShrink: 0,
          height: 36,
        }}>
          <FileText size={13} color="#006c67" />
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {label}
          </span>
          {totalPages > 1 && (
            <div
              style={{ display: 'flex', alignItems: 'center', gap: 4 }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => {
                  if (page > 1) {
                    this.editor.updateShape({
                      id: shape.id,
                      type: 'pdf-viewer',
                      props: { ...shape.props, page: page - 1 },
                    } as any);
                  }
                }}
                disabled={page <= 1}
                style={{
                  background: 'none',
                  border: '1px solid #e2e8f0',
                  borderRadius: 3,
                  padding: '1px 4px',
                  cursor: page <= 1 ? 'not-allowed' : 'pointer',
                  color: page <= 1 ? '#cbd5e1' : '#475569',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <ChevronLeft size={12} />
              </button>
              <span style={{ fontSize: 10, whiteSpace: 'nowrap' }}>
                {page} / {totalPages}
              </span>
              <button
                onClick={() => {
                  if (page < totalPages) {
                    this.editor.updateShape({
                      id: shape.id,
                      type: 'pdf-viewer',
                      props: { ...shape.props, page: page + 1 },
                    } as any);
                  }
                }}
                disabled={page >= totalPages}
                style={{
                  background: 'none',
                  border: '1px solid #e2e8f0',
                  borderRadius: 3,
                  padding: '1px 4px',
                  cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                  color: page >= totalPages ? '#cbd5e1' : '#475569',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <ChevronRight size={12} />
              </button>
            </div>
          )}
        </div>

        {/* PDF Page */}
        <div style={{ flex: 1, overflow: 'hidden', background: '#f1f5f9' }}>
          {pdfUrl ? (
            <PdfPage pdfUrl={pdfUrl} page={page} />
          ) : (
            <div style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#94a3b8',
              fontSize: 12,
              flexDirection: 'column',
              gap: 8,
            }}>
              <FileText size={32} color="#cbd5e1" />
              <span>No PDF loaded</span>
            </div>
          )}
        </div>
      </HTMLContainer>
    );
  }

  override indicator(shape: any) {
    return <rect width={shape.props.w} height={shape.props.h} rx={6} />;
  }
}
