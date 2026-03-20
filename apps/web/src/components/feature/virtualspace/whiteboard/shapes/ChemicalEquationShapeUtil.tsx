'use client';

import { ShapeUtil, TLBaseShape, T, Rectangle2d, HTMLContainer } from '@tldraw/editor';

export type ChemicalEquationShape = TLBaseShape<'chemical-equation', {
  w: number; h: number; reactants: string; products: string;
  arrow: string; conditions: string; isReversible: boolean; showStateSymbols: boolean;
}>;

function subscriptNumbers(text: string): React.ReactNode[] {
  const parts = text.split(/(\d+)/);
  return parts.map((p, i) =>
    /^\d+$/.test(p) ? <sub key={i} style={{ fontSize: '0.7em' }}>{p}</sub> : <span key={i}>{p}</span>
  );
}

function ChemicalEquationContent({ shape }: { shape: ChemicalEquationShape }) {
  const { w, h, reactants, products, conditions, isReversible } = shape.props;
  const arrowSymbol = isReversible ? '⇌' : '→';

  return (
    <div style={{
      width: w, height: h, background: 'white', borderRadius: 10,
      border: '2px solid #bae6fd', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: '12px 16px',
      boxSizing: 'border-box', fontFamily: 'Georgia, serif',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
        <span style={{ fontSize: 20, fontWeight: 600, color: '#1e293b' }}>{subscriptNumbers(reactants)}</span>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {conditions && (
            <span style={{ fontSize: 11, color: '#0369a1', fontFamily: 'sans-serif', marginBottom: 2, fontStyle: 'italic' }}>{conditions}</span>
          )}
          <span style={{ fontSize: 22, color: '#0369a1', lineHeight: 1 }}>{arrowSymbol}</span>
        </div>
        <span style={{ fontSize: 20, fontWeight: 600, color: '#1e293b' }}>{subscriptNumbers(products)}</span>
      </div>
      {isReversible && (
        <div style={{ fontSize: 10, color: '#64748b', fontFamily: 'sans-serif', marginTop: 6 }}>reversible reaction</div>
      )}
    </div>
  );
}

export class ChemicalEquationShapeUtil extends ShapeUtil<ChemicalEquationShape> {
  static override type = 'chemical-equation' as const;
  static override props = {
    w: T.number, h: T.number, reactants: T.string, products: T.string,
    arrow: T.string, conditions: T.string, isReversible: T.boolean, showStateSymbols: T.boolean,
  };
  override isAspectRatioLocked = () => false;
  override canResize = () => true;
  getDefaultProps(): ChemicalEquationShape['props'] {
    return { w: 360, h: 140, reactants: '2H₂ + O₂', products: '2H₂O', arrow: '→', conditions: '', isReversible: false, showStateSymbols: true };
  }
  getGeometry(shape: ChemicalEquationShape) {
    return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true });
  }
  component(shape: ChemicalEquationShape) {
    return <HTMLContainer><ChemicalEquationContent shape={shape} /></HTMLContainer>;
  }
  indicator(shape: ChemicalEquationShape) {
    return <rect width={shape.props.w} height={shape.props.h} />;
  }
}
