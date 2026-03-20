/**
 * UnitConverterShapeUtil
 * Bidirectional unit converter. Categories: length, mass, temperature, volume, time, area.
 */

'use client';

import { ShapeUtil, TLBaseShape, T, Rectangle2d, HTMLContainer } from '@tldraw/editor';
import { useState, useCallback } from 'react';

export type UnitConverterShape = TLBaseShape<
  'unit-converter',
  { w: number; h: number }
>;

type Category = 'length' | 'mass' | 'temperature' | 'volume' | 'time' | 'area';

interface Unit { label: string; toBase: (v: number) => number; fromBase: (v: number) => number; }

const CATEGORIES: Record<Category, { label: string; units: Record<string, Unit> }> = {
  length: {
    label: 'Length',
    units: {
      mm:   { label: 'mm',    toBase: (v) => v / 1000,      fromBase: (v) => v * 1000 },
      cm:   { label: 'cm',    toBase: (v) => v / 100,       fromBase: (v) => v * 100 },
      m:    { label: 'm',     toBase: (v) => v,              fromBase: (v) => v },
      km:   { label: 'km',    toBase: (v) => v * 1000,       fromBase: (v) => v / 1000 },
      in:   { label: 'in',    toBase: (v) => v * 0.0254,     fromBase: (v) => v / 0.0254 },
      ft:   { label: 'ft',    toBase: (v) => v * 0.3048,     fromBase: (v) => v / 0.3048 },
      mi:   { label: 'mi',    toBase: (v) => v * 1609.344,   fromBase: (v) => v / 1609.344 },
    },
  },
  mass: {
    label: 'Mass',
    units: {
      mg:   { label: 'mg',    toBase: (v) => v / 1e6,   fromBase: (v) => v * 1e6 },
      g:    { label: 'g',     toBase: (v) => v / 1000,  fromBase: (v) => v * 1000 },
      kg:   { label: 'kg',    toBase: (v) => v,          fromBase: (v) => v },
      t:    { label: 'tonne', toBase: (v) => v * 1000,   fromBase: (v) => v / 1000 },
      oz:   { label: 'oz',    toBase: (v) => v * 0.0283495, fromBase: (v) => v / 0.0283495 },
      lb:   { label: 'lb',    toBase: (v) => v * 0.453592,  fromBase: (v) => v / 0.453592 },
    },
  },
  temperature: {
    label: 'Temperature',
    units: {
      C:  { label: '°C', toBase: (v) => v,                   fromBase: (v) => v },
      F:  { label: '°F', toBase: (v) => (v - 32) * 5 / 9,    fromBase: (v) => v * 9 / 5 + 32 },
      K:  { label: 'K',  toBase: (v) => v - 273.15,          fromBase: (v) => v + 273.15 },
    },
  },
  volume: {
    label: 'Volume',
    units: {
      ml:   { label: 'ml',  toBase: (v) => v / 1000,   fromBase: (v) => v * 1000 },
      L:    { label: 'L',   toBase: (v) => v,            fromBase: (v) => v },
      m3:   { label: 'm³',  toBase: (v) => v * 1000,    fromBase: (v) => v / 1000 },
      tsp:  { label: 'tsp', toBase: (v) => v * 0.00493, fromBase: (v) => v / 0.00493 },
      cup:  { label: 'cup', toBase: (v) => v * 0.2366,  fromBase: (v) => v / 0.2366 },
      gal:  { label: 'gal', toBase: (v) => v * 3.78541, fromBase: (v) => v / 3.78541 },
    },
  },
  time: {
    label: 'Time',
    units: {
      ms:   { label: 'ms',   toBase: (v) => v / 1000,       fromBase: (v) => v * 1000 },
      s:    { label: 's',    toBase: (v) => v,                fromBase: (v) => v },
      min:  { label: 'min',  toBase: (v) => v * 60,          fromBase: (v) => v / 60 },
      h:    { label: 'h',    toBase: (v) => v * 3600,        fromBase: (v) => v / 3600 },
      day:  { label: 'day',  toBase: (v) => v * 86400,       fromBase: (v) => v / 86400 },
      week: { label: 'week', toBase: (v) => v * 604800,      fromBase: (v) => v / 604800 },
      yr:   { label: 'year', toBase: (v) => v * 31557600,    fromBase: (v) => v / 31557600 },
    },
  },
  area: {
    label: 'Area',
    units: {
      mm2:  { label: 'mm²', toBase: (v) => v / 1e6,       fromBase: (v) => v * 1e6 },
      cm2:  { label: 'cm²', toBase: (v) => v / 10000,     fromBase: (v) => v * 10000 },
      m2:   { label: 'm²',  toBase: (v) => v,              fromBase: (v) => v },
      km2:  { label: 'km²', toBase: (v) => v * 1e6,        fromBase: (v) => v / 1e6 },
      in2:  { label: 'in²', toBase: (v) => v * 0.000645,   fromBase: (v) => v / 0.000645 },
      ft2:  { label: 'ft²', toBase: (v) => v * 0.0929,     fromBase: (v) => v / 0.0929 },
      acre: { label: 'acre',toBase: (v) => v * 4046.86,    fromBase: (v) => v / 4046.86 },
    },
  },
};

function fmt(v: number): string {
  if (!isFinite(v)) return '—';
  if (Math.abs(v) >= 1e9 || (Math.abs(v) < 1e-4 && v !== 0)) return v.toExponential(4);
  return parseFloat(v.toPrecision(8)).toString();
}

function convert(fromKey: string, toKey: string, cat: Category, value: number): number {
  const units = CATEGORIES[cat].units;
  const base = units[fromKey].toBase(value);
  return units[toKey].fromBase(base);
}

function UnitConverterComponent({ shape }: { shape: UnitConverterShape }) {
  const { w, h } = shape.props;
  const [cat, setCat] = useState<Category>('length');
  const units = CATEGORIES[cat].units;
  const unitKeys = Object.keys(units);

  const [fromUnit, setFromUnit] = useState(unitKeys[0]);
  const [toUnit, setToUnit] = useState(unitKeys[2] ?? unitKeys[1]);
  const [fromVal, setFromVal] = useState('1');
  const [toVal, setToVal] = useState('');

  const handleCatChange = useCallback((newCat: Category) => {
    setCat(newCat);
    const newKeys = Object.keys(CATEGORIES[newCat].units);
    setFromUnit(newKeys[0]);
    setToUnit(newKeys[2] ?? newKeys[1]);
    setFromVal('1');
    setToVal('');
  }, []);

  const handleFromVal = useCallback((v: string) => {
    setFromVal(v);
    const n = parseFloat(v);
    if (!isNaN(n)) {
      setToVal(fmt(convert(fromUnit, toUnit, cat, n)));
    } else {
      setToVal('');
    }
  }, [fromUnit, toUnit, cat]);

  const handleToVal = useCallback((v: string) => {
    setToVal(v);
    const n = parseFloat(v);
    if (!isNaN(n)) {
      setFromVal(fmt(convert(toUnit, fromUnit, cat, n)));
    } else {
      setFromVal('');
    }
  }, [fromUnit, toUnit, cat]);

  const handleFromUnit = useCallback((u: string) => {
    setFromUnit(u);
    const n = parseFloat(fromVal);
    if (!isNaN(n)) setToVal(fmt(convert(u, toUnit, cat, n)));
  }, [fromVal, toUnit, cat]);

  const handleToUnit = useCallback((u: string) => {
    setToUnit(u);
    const n = parseFloat(fromVal);
    if (!isNaN(n)) setToVal(fmt(convert(fromUnit, u, cat, n)));
  }, [fromVal, fromUnit, cat]);

  const swap = useCallback(() => {
    setFromUnit(toUnit);
    setToUnit(fromUnit);
    setFromVal(toVal);
    setToVal(fromVal);
  }, [fromUnit, toUnit, fromVal, toVal]);

  const INPUT: React.CSSProperties = {
    flex: 1, border: '1px solid #e2e8f0', borderRadius: 6, padding: '6px 8px',
    fontSize: 16, fontFamily: 'monospace', outline: 'none', width: 0,
  };
  const SELECT: React.CSSProperties = {
    border: '1px solid #e2e8f0', borderRadius: 6, padding: '6px 4px',
    fontSize: 12, background: 'white', cursor: 'pointer', outline: 'none',
  };

  return (
    <HTMLContainer>
      <div
        style={{ width: w, height: h, background: 'white', border: '2px solid #2563eb', borderRadius: 10, display: 'flex', flexDirection: 'column', overflow: 'hidden', userSelect: 'none', fontFamily: 'system-ui' }}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ background: '#2563eb', padding: '6px 12px' }}>
          <span style={{ color: 'white', fontSize: 12, fontWeight: 700 }}>Unit Converter</span>
        </div>

        {/* Category tabs */}
        <div style={{ display: 'flex', gap: 2, padding: '6px 8px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
          {(Object.keys(CATEGORIES) as Category[]).map((c) => (
            <button
              key={c}
              onClick={() => handleCatChange(c)}
              onPointerDown={(e) => e.stopPropagation()}
              style={{
                padding: '2px 8px', borderRadius: 4, border: 'none', fontSize: 11, cursor: 'pointer',
                background: cat === c ? '#2563eb' : '#e2e8f0',
                color: cat === c ? 'white' : '#475569',
                fontWeight: cat === c ? 600 : 400,
              }}
            >
              {CATEGORIES[c].label}
            </button>
          ))}
        </div>

        {/* Conversion area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 10, padding: '10px 12px' }}>
          {/* From */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input
              type="number"
              value={fromVal}
              onChange={(e) => handleFromVal(e.target.value)}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              style={INPUT}
              placeholder="0"
            />
            <select
              value={fromUnit}
              onChange={(e) => handleFromUnit(e.target.value)}
              onPointerDown={(e) => e.stopPropagation()}
              style={SELECT}
            >
              {unitKeys.map((k) => <option key={k} value={k}>{units[k].label}</option>)}
            </select>
          </div>

          {/* Swap button */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button
              onClick={swap}
              onPointerDown={(e) => e.stopPropagation()}
              style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 20, padding: '4px 16px', fontSize: 13, cursor: 'pointer', color: '#2563eb', fontWeight: 600 }}
            >
              ⇅ Swap
            </button>
          </div>

          {/* To */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input
              type="number"
              value={toVal}
              onChange={(e) => handleToVal(e.target.value)}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              style={{ ...INPUT, background: '#f0fdf4' }}
              placeholder="0"
            />
            <select
              value={toUnit}
              onChange={(e) => handleToUnit(e.target.value)}
              onPointerDown={(e) => e.stopPropagation()}
              style={SELECT}
            >
              {unitKeys.map((k) => <option key={k} value={k}>{units[k].label}</option>)}
            </select>
          </div>

          {/* Formula hint */}
          {fromVal && toVal && fromUnit !== toUnit && (
            <div style={{ fontSize: 10, color: '#94a3b8', textAlign: 'center' }}>
              1 {units[fromUnit].label} = {fmt(convert(fromUnit, toUnit, cat, 1))} {units[toUnit].label}
            </div>
          )}
        </div>
      </div>
    </HTMLContainer>
  );
}

export class UnitConverterShapeUtil extends ShapeUtil<any> {
  static override type = 'unit-converter' as const;

  static override props = {
    w: T.number,
    h: T.number,
  };

  override isAspectRatioLocked = () => false;
  override canResize = () => true;
  override canEdit = () => false;

  getDefaultProps(): UnitConverterShape['props'] {
    return { w: 280, h: 300 };
  }

  getGeometry(shape: UnitConverterShape) {
    return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true });
  }

  component(shape: UnitConverterShape) {
    return <UnitConverterComponent shape={shape} />;
  }

  indicator(shape: UnitConverterShape) {
    return <rect width={shape.props.w} height={shape.props.h} rx={10} />;
  }
}
