/**
 * SubjectToolsPanel
 * Floating panel rendered via InFrontOfTheCanvas — gives access to
 * subject-specific shapes and templates for Maths, English, and Science.
 *
 * Uses useEditor() to stamp shapes directly onto the canvas.
 */

'use client';

import { useEditor } from '@tldraw/editor';
import { useState, useCallback } from 'react';
import { createShapeId } from 'tldraw';
import type { CircuitComponentType } from '../shapes/CircuitShapeUtil';
import type { AnnotationType } from '../shapes/AnnotationShapeUtil';

// ── Types ──────────────────────────────────────────────────────────────────

type Tab = 'maths' | 'english' | 'science';

interface ToolItem {
  id: string;
  label: string;
  icon: string;
  description?: string;
  onClick: (editor: ReturnType<typeof useEditor>) => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────

type AnyEditor = ReturnType<typeof useEditor>;

function getViewportCenter(editor: AnyEditor) {
  const vp = editor.getViewportPageBounds();
  return { x: vp.x + vp.w / 2, y: vp.y + vp.h / 2 };
}

// Custom shapes aren't in tldraw's built-in type union — cast required
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function create(editor: AnyEditor, shape: any) {
  editor.createShape(shape);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function stampShape(editor: AnyEditor, shape: any) {
  create(editor, shape);
  editor.setSelectedShapes([shape.id!]);
}

// ── Maths Tools ──────────────────────────────────────────────────────────

function getMathsTools(): ToolItem[] {
  return [
    {
      id: 'equation',
      label: 'Equation',
      icon: '∑',
      description: 'LaTeX equation (double-click to edit)',
      onClick: (editor) => {
        const { x, y } = getViewportCenter(editor);
        stampShape(editor, {
          id: createShapeId(),
          type: 'math-equation',
          x: x - 140,
          y: y - 40,
          props: { w: 280, h: 80, latex: 'x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}', displayMode: true, color: '#1e293b', fontSize: 16 },
        });
      },
    },
    {
      id: 'equation-blank',
      label: 'Blank Equation',
      icon: 'λ',
      description: 'Empty equation box — type your own LaTeX',
      onClick: (editor) => {
        const { x, y } = getViewportCenter(editor);
        const id = createShapeId();
        create(editor, {
          id,
          type: 'math-equation',
          x: x - 140,
          y: y - 40,
          props: { w: 280, h: 80, latex: '', displayMode: true, color: '#1e293b', fontSize: 16 },
        });
        editor.setSelectedShapes([id]);
        editor.setEditingShape(id);
      },
    },
    {
      id: 'graph-axes',
      label: 'Graph Axes',
      icon: '📈',
      description: 'Cartesian plane (double-click to set range)',
      onClick: (editor) => {
        const { x, y } = getViewportCenter(editor);
        stampShape(editor, {
          id: createShapeId(),
          type: 'graph-axes',
          x: x - 160,
          y: y - 130,
          props: { w: 320, h: 260, xMin: -5, xMax: 5, yMin: -5, yMax: 5, showGrid: true, showLabels: true, gridColor: '#e2e8f0', axisColor: '#1e293b', labelColor: '#475569', title: '', xLabel: 'x', yLabel: 'y' },
        });
      },
    },
    {
      id: 'graph-quad',
      label: 'Quadrant I Only',
      icon: '↗',
      description: 'First-quadrant graph (0 to 10)',
      onClick: (editor) => {
        const { x, y } = getViewportCenter(editor);
        stampShape(editor, {
          id: createShapeId(),
          type: 'graph-axes',
          x: x - 160,
          y: y - 130,
          props: { w: 320, h: 260, xMin: 0, xMax: 10, yMin: 0, yMax: 10, showGrid: true, showLabels: true, gridColor: '#e2e8f0', axisColor: '#1e293b', labelColor: '#475569', title: '', xLabel: 'x', yLabel: 'y' },
        });
      },
    },
    {
      id: 'number-line',
      label: 'Number Line',
      icon: '←→',
      description: 'Number line -5 to 5 (double-click to edit)',
      onClick: (editor) => {
        const { x, y } = getViewportCenter(editor);
        stampShape(editor, {
          id: createShapeId(),
          type: 'number-line',
          x: x - 200,
          y: y - 36,
          props: { w: 400, h: 72, min: -5, max: 5, step: 1, showMinorTicks: true, minorStep: 0.5, markers: [], label: '', color: '#1e293b', showArrows: true, showFractions: false },
        });
      },
    },
    {
      id: 'number-line-0-20',
      label: 'Number Line 0–20',
      icon: '0→',
      description: 'Number line 0 to 20 for KS1/KS2',
      onClick: (editor) => {
        const { x, y } = getViewportCenter(editor);
        stampShape(editor, {
          id: createShapeId(),
          type: 'number-line',
          x: x - 250,
          y: y - 36,
          props: { w: 500, h: 72, min: 0, max: 20, step: 2, showMinorTicks: true, minorStep: 1, markers: [], label: 'Count to 20', color: '#006c67', showArrows: true, showFractions: false },
        });
      },
    },
    {
      id: 'fraction-half',
      label: '½ Fraction Bar',
      icon: '½',
      description: '1/2 fraction bar',
      onClick: (editor) => {
        const { x, y } = getViewportCenter(editor);
        stampShape(editor, {
          id: createShapeId(),
          type: 'fraction-bar',
          x: x - 140,
          y: y - 36,
          props: { w: 280, h: 72, numerator: 1, denominator: 2, showLabel: true, color: '#006c67', bgColor: '#e6f0f0', label: '', showEquivalent: false, eqNumerator: 2, eqDenominator: 4 },
        });
      },
    },
    {
      id: 'fraction-compare',
      label: 'Compare Fractions',
      icon: '⅓=⅔',
      description: 'Two fraction bars for comparison (double-click to edit)',
      onClick: (editor) => {
        const { x, y } = getViewportCenter(editor);
        stampShape(editor, {
          id: createShapeId(),
          type: 'fraction-bar',
          x: x - 140,
          y: y - 52,
          props: { w: 280, h: 104, numerator: 3, denominator: 4, showLabel: true, color: '#006c67', bgColor: '#e6f0f0', label: '', showEquivalent: true, eqNumerator: 6, eqDenominator: 8 },
        });
      },
    },
    {
      id: 'pythagoras',
      label: 'Pythagoras',
      icon: 'a²+b²',
      description: 'Pythagoras theorem equation',
      onClick: (editor) => {
        const { x, y } = getViewportCenter(editor);
        stampShape(editor, {
          id: createShapeId(),
          type: 'math-equation',
          x: x - 140,
          y: y - 40,
          props: { w: 280, h: 80, latex: 'a^2 + b^2 = c^2', displayMode: true, color: '#1e293b', fontSize: 20 },
        });
      },
    },
    {
      id: 'quadratic',
      label: 'Quadratic Formula',
      icon: 'ax²',
      description: 'Quadratic formula',
      onClick: (editor) => {
        const { x, y } = getViewportCenter(editor);
        stampShape(editor, {
          id: createShapeId(),
          type: 'math-equation',
          x: x - 160,
          y: y - 40,
          props: { w: 320, h: 80, latex: 'x = \\dfrac{-b \\pm \\sqrt{b^2-4ac}}{2a}', displayMode: true, color: '#1e293b', fontSize: 16 },
        });
      },
    },
    {
      id: 'trig',
      label: 'Trig Ratios',
      icon: 'sin',
      description: 'SOH CAH TOA',
      onClick: (editor) => {
        const { x, y } = getViewportCenter(editor);
        const baseY = y - 60;
        [
          { latex: '\\sin\\theta = \\dfrac{\\text{opp}}{\\text{hyp}}', dx: -360 },
          { latex: '\\cos\\theta = \\dfrac{\\text{adj}}{\\text{hyp}}', dx: -100 },
          { latex: '\\tan\\theta = \\dfrac{\\text{opp}}{\\text{adj}}', dx: 160 },
        ].forEach(({ latex, dx }) => {
          create(editor, {
            id: createShapeId(),
            type: 'math-equation',
            x: x + dx,
            y: baseY,
            props: { w: 220, h: 80, latex, displayMode: true, color: '#1e293b', fontSize: 14 },
          });
        });
      },
    },
    {
      id: 'circle-area',
      label: 'Circle Area',
      icon: 'πr²',
      description: 'Circle area formula',
      onClick: (editor) => {
        const { x, y } = getViewportCenter(editor);
        stampShape(editor, {
          id: createShapeId(),
          type: 'math-equation',
          x: x - 120,
          y: y - 40,
          props: { w: 240, h: 80, latex: 'A = \\pi r^2', displayMode: true, color: '#1e293b', fontSize: 22 },
        });
      },
    },
    {
      id: 'probability',
      label: 'Probability',
      icon: 'P(A)',
      description: 'Probability notation',
      onClick: (editor) => {
        const { x, y } = getViewportCenter(editor);
        stampShape(editor, {
          id: createShapeId(),
          type: 'math-equation',
          x: x - 180,
          y: y - 40,
          props: { w: 360, h: 80, latex: 'P(A \\cup B) = P(A) + P(B) - P(A \\cap B)', displayMode: true, color: '#1e293b', fontSize: 14 },
        });
      },
    },
    {
      id: 'matrix-2x2',
      label: '2×2 Matrix',
      icon: '[]',
      description: 'Sample 2×2 matrix',
      onClick: (editor) => {
        const { x, y } = getViewportCenter(editor);
        stampShape(editor, {
          id: createShapeId(),
          type: 'math-equation',
          x: x - 120,
          y: y - 40,
          props: { w: 240, h: 80, latex: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}', displayMode: true, color: '#1e293b', fontSize: 18 },
        });
      },
    },
    {
      id: 'integral',
      label: 'Integral',
      icon: '∫',
      description: 'Definite integral',
      onClick: (editor) => {
        const { x, y } = getViewportCenter(editor);
        stampShape(editor, {
          id: createShapeId(),
          type: 'math-equation',
          x: x - 140,
          y: y - 40,
          props: { w: 280, h: 80, latex: '\\int_a^b f(x)\\,dx = F(b) - F(a)', displayMode: true, color: '#1e293b', fontSize: 16 },
        });
      },
    },
    {
      id: 'derivative',
      label: 'Derivative',
      icon: "f'",
      description: 'Derivative notation',
      onClick: (editor) => {
        const { x, y } = getViewportCenter(editor);
        stampShape(editor, {
          id: createShapeId(),
          type: 'math-equation',
          x: x - 140,
          y: y - 40,
          props: { w: 280, h: 80, latex: "f'(x) = \\lim_{h \\to 0} \\frac{f(x+h)-f(x)}{h}", displayMode: true, color: '#1e293b', fontSize: 14 },
        });
      },
    },
    {
      id: 'protractor',
      label: 'Protractor',
      icon: '180°',
      description: 'Interactive protractor with adjustable angle arm',
      onClick: (editor) => {
        const { x, y } = getViewportCenter(editor);
        stampShape(editor, {
          id: createShapeId(),
          type: 'protractor',
          x: x - 110,
          y: y - 65,
          props: { w: 220, h: 130, angle: 45, showArm: true, showLabels: true, color: '#4338ca' },
        });
      },
    },
    {
      id: 'unit-circle',
      label: 'Unit Circle',
      icon: 'sinθ',
      description: 'Unit circle with trig values (double-click to adjust angle)',
      onClick: (editor) => {
        const { x, y } = getViewportCenter(editor);
        stampShape(editor, {
          id: createShapeId(),
          type: 'unit-circle',
          x: x - 130,
          y: y - 130,
          props: { w: 260, h: 260, angleDeg: 45, showCoords: true, showSpecialAngles: true, showGrid: true, color: '#2563eb' },
        });
      },
    },
    {
      id: 'pythagoras-triangle',
      label: 'Pythagoras Triangle',
      icon: '△',
      description: 'Right-angled triangle with labelled sides and working',
      onClick: (editor) => {
        const { x, y } = getViewportCenter(editor);
        stampShape(editor, {
          id: createShapeId(),
          type: 'pythagoras',
          x: x - 130,
          y: y - 110,
          props: { w: 260, h: 220, sideA: 3, sideB: 4, showWorking: true, showAngles: true, color: '#2563eb' },
        });
      },
    },
    {
      id: 'pie-chart',
      label: 'Pie Chart',
      icon: '◔',
      description: 'Editable pie chart (double-click to edit segments)',
      onClick: (editor) => {
        const { x, y } = getViewportCenter(editor);
        stampShape(editor, {
          id: createShapeId(),
          type: 'pie-chart',
          x: x - 120,
          y: y - 120,
          props: { w: 240, h: 240, segments: JSON.stringify([{label:'A',value:35,color:'#2563eb'},{label:'B',value:25,color:'#dc2626'},{label:'C',value:20,color:'#16a34a'},{label:'D',value:20,color:'#d97706'}]), title: '', showLabels: true, showPercentages: true },
        });
      },
    },
    {
      id: 'bar-chart',
      label: 'Bar Chart',
      icon: '▇',
      description: 'Editable bar chart (double-click to edit bars)',
      onClick: (editor) => {
        const { x, y } = getViewportCenter(editor);
        stampShape(editor, {
          id: createShapeId(),
          type: 'bar-chart',
          x: x - 150,
          y: y - 110,
          props: { w: 300, h: 220, bars: JSON.stringify([{label:'Mon',value:40,color:'#2563eb'},{label:'Tue',value:65,color:'#dc2626'},{label:'Wed',value:50,color:'#16a34a'},{label:'Thu',value:80,color:'#d97706'},{label:'Fri',value:30,color:'#7c3aed'}]), title: '', xLabel: '', yLabel: '', showValues: true, showGrid: true },
        });
      },
    },
    {
      id: 'desmos',
      label: 'Desmos',
      icon: '∫',
      description: 'Embed Desmos graphing calculator',
      onClick: (editor) => {
        const { x, y } = getViewportCenter(editor);
        const id = createShapeId();
        create(editor, {
          id,
          type: 'tool-embed',
          x: x - 240,
          y: y - 180,
          props: { w: 480, h: 360, url: 'https://www.desmos.com/calculator', label: 'Desmos Graphing' },
        });
        editor.setSelectedShapes([id]);
        editor.setEditingShape(id);
      },
    },
  ];
}

// ── English Tools ────────────────────────────────────────────────────────

function getEnglishTools(): ToolItem[] {
  const annotationTool = (type: AnnotationType, labelText: string, icon: string, desc: string): ToolItem => ({
    id: `annotation-${type}`,
    label: labelText,
    icon,
    description: desc,
    onClick: (editor) => {
      const { x, y } = getViewportCenter(editor);
      stampShape(editor, {
        id: createShapeId(),
        type: 'annotation',
        x: x - 100,
        y: y - 50,
        props: { w: 200, h: 100, text: '', highlightColor: '', annotationType: type, label: '', showBadge: true },
      });
    },
  });

  return [
    annotationTool('highlight', 'Highlight', '✏️', 'Highlight a word/phrase'),
    annotationTool('technique', 'Technique', '🔬', 'Name a literary technique (e.g. Metaphor)'),
    annotationTool('comment', 'Comment', '💬', 'Add an analytical comment'),
    annotationTool('quote', 'Quote', '"…"', 'Box a key quote'),
    annotationTool('question', 'Question', '?', 'Add a question / prompt'),
    {
      id: 'essay-planner',
      label: 'Essay Planner',
      icon: '📝',
      description: 'Introduction → Para 1 → Para 2 → Conclusion',
      onClick: (editor) => {
        const { x, y } = getViewportCenter(editor);
        const sections = ['Introduction', 'Paragraph 1', 'Paragraph 2', 'Paragraph 3', 'Conclusion'];
        const colors: AnnotationType[] = ['highlight', 'comment', 'comment', 'comment', 'quote'];
        sections.forEach((title, i) => {
          create(editor, {
            id: createShapeId(),
            type: 'annotation',
            x: x - 400,
            y: y - 180 + i * 96,
            props: { w: 360, h: 88, text: '', highlightColor: '', annotationType: colors[i], label: title, showBadge: true },
          });
        });
      },
    },
    {
      id: 'pee-structure',
      label: 'PEE Paragraph',
      icon: 'PEE',
      description: 'Point → Evidence → Explain cards',
      onClick: (editor) => {
        const { x, y } = getViewportCenter(editor);
        const parts = [
          { label: 'Point', type: 'highlight' as AnnotationType, desc: 'Make your point...' },
          { label: 'Evidence', type: 'quote' as AnnotationType, desc: '"Quote from text..."' },
          { label: 'Explain', type: 'comment' as AnnotationType, desc: 'This shows / suggests...' },
        ];
        parts.forEach(({ label, type, desc }, i) => {
          create(editor, {
            id: createShapeId(),
            type: 'annotation',
            x: x - 160 + i * 200,
            y: y - 50,
            props: { w: 190, h: 100, text: desc, highlightColor: '', annotationType: type, label, showBadge: true },
          });
        });
      },
    },
    {
      id: 'comparison',
      label: 'Compare Texts',
      icon: '↔',
      description: 'Two-column comparison frame',
      onClick: (editor) => {
        const { x, y } = getViewportCenter(editor);
        [
          { label: 'Text A', dx: -220 },
          { label: 'Text B', dx: 20 },
        ].forEach(({ label, dx }) => {
          for (let row = 0; row < 3; row++) {
            create(editor, {
              id: createShapeId(),
              type: 'annotation',
              x: x + dx,
              y: y - 150 + row * 110,
              props: { w: 200, h: 100, text: '', highlightColor: '', annotationType: 'highlight' as AnnotationType, label: `${label} — point ${row + 1}`, showBadge: true },
            });
          }
        });
      },
    },
    {
      id: 'venn-diagram',
      label: 'Venn Diagram',
      icon: '⊙',
      description: 'Two overlapping circles for compare/contrast (double-click to edit)',
      onClick: (editor) => {
        const { x, y } = getViewportCenter(editor);
        stampShape(editor, {
          id: createShapeId(),
          type: 'venn-diagram',
          x: x - 170,
          y: y - 100,
          props: { w: 340, h: 200, leftLabel: 'Text A', rightLabel: 'Text B', leftContent: '', centerContent: 'Both', rightContent: '', title: '', leftColor: '#2563eb', rightColor: '#dc2626' },
        });
      },
    },
    {
      id: 'timeline',
      label: 'Timeline',
      icon: '—→',
      description: 'Horizontal timeline with events (double-click to edit)',
      onClick: (editor) => {
        const { x, y } = getViewportCenter(editor);
        stampShape(editor, {
          id: createShapeId(),
          type: 'timeline',
          x: x - 240,
          y: y - 80,
          props: { w: 480, h: 160, events: JSON.stringify([{label:'Event 1',date:'1066',color:'#2563eb',above:true},{label:'Event 2',date:'1215',color:'#dc2626',above:false},{label:'Event 3',date:'1348',color:'#16a34a',above:true},{label:'Event 4',date:'1492',color:'#d97706',above:false}]), title: '', lineColor: '#475569' },
        });
      },
    },
    {
      id: 'spider-diagram',
      label: 'Spider Diagram',
      icon: '🕷',
      description: 'Central theme with 5 branches',
      onClick: (editor) => {
        const { x, y } = getViewportCenter(editor);
        // Central idea
        create(editor, {
          id: createShapeId(),
          type: 'annotation',
          x: x - 80,
          y: y - 40,
          props: { w: 160, h: 80, text: 'Central\nTheme', highlightColor: '', annotationType: 'technique' as AnnotationType, label: 'Central Idea', showBadge: true },
        });
        // Branches
        const angles = [0, 72, 144, 216, 288];
        angles.forEach((deg, i) => {
          const rad = (deg - 90) * (Math.PI / 180);
          const bx = x + Math.cos(rad) * 200 - 80;
          const by = y + Math.sin(rad) * 160 - 40;
          create(editor, {
            id: createShapeId(),
            type: 'annotation',
            x: bx,
            y: by,
            props: { w: 160, h: 80, text: '', highlightColor: '', annotationType: 'comment' as AnnotationType, label: `Branch ${i + 1}`, showBadge: true },
          });
        });
      },
    },
  ];
}

// ── Science Tools ────────────────────────────────────────────────────────

function getScienceTools(): ToolItem[] {
  const circuitTool = (type: CircuitComponentType, label: string, icon: string, desc: string, value = ''): ToolItem => ({
    id: `circuit-${type}`,
    label,
    icon,
    description: desc,
    onClick: (editor) => {
      const { x, y } = getViewportCenter(editor);
      stampShape(editor, {
        id: createShapeId(),
        type: 'circuit-component',
        x: x - 40,
        y: y - 22,
        props: { w: 80, h: 44, componentType: type, label: '', color: '#1e293b', showLabel: true, value },
      });
    },
  });

  return [
    circuitTool('resistor', 'Resistor', '⊓⊓', 'Resistor symbol', '10Ω'),
    circuitTool('capacitor', 'Capacitor', '||', 'Capacitor symbol', '100μF'),
    circuitTool('battery', 'Battery', '⊣⊢', 'Battery / EMF source', '6V'),
    circuitTool('bulb', 'Bulb', '💡', 'Light bulb'),
    circuitTool('switch-open', 'Switch (open)', '/ ', 'Open switch'),
    circuitTool('switch-closed', 'Switch (closed)', '—', 'Closed switch'),
    circuitTool('led', 'LED', '▶|', 'Light-emitting diode'),
    circuitTool('diode', 'Diode', '▶|', 'Rectifying diode'),
    circuitTool('ammeter', 'Ammeter', 'A', 'Ammeter (measures current)'),
    circuitTool('voltmeter', 'Voltmeter', 'V', 'Voltmeter (measures voltage)'),
    circuitTool('ground', 'Earth/Ground', '⏚', 'Earth connection'),
    circuitTool('wire-junction', 'Junction', '•', 'Wire junction'),
    {
      id: 'simple-circuit',
      label: 'Simple Circuit',
      icon: '⬜',
      description: 'Battery + bulb + switch (series)',
      onClick: (editor) => {
        const { x, y } = getViewportCenter(editor);
        const components: { type: CircuitComponentType; dx: number; dy: number; value: string }[] = [
          { type: 'battery', dx: -180, dy: 0, value: '6V' },
          { type: 'switch-open', dx: -80, dy: 0, value: '' },
          { type: 'bulb', dx: 40, dy: 0, value: '' },
        ];
        components.forEach(({ type, dx, dy, value }) => {
          create(editor, {
            id: createShapeId(),
            type: 'circuit-component',
            x: x + dx,
            y: y + dy - 22,
            props: { w: 80, h: 44, componentType: type, label: '', color: '#1e293b', showLabel: true, value },
          });
        });
      },
    },
    {
      id: 'ohms-law',
      label: "Ohm's Law",
      icon: 'V=IR',
      description: "V = IR with triangle",
      onClick: (editor) => {
        const { x, y } = getViewportCenter(editor);
        [
          { latex: 'V = IR', dy: -60 },
          { latex: 'I = \\dfrac{V}{R}', dy: 0 },
          { latex: 'R = \\dfrac{V}{I}', dy: 60 },
        ].forEach(({ latex, dy }) => {
          create(editor, {
            id: createShapeId(),
            type: 'math-equation',
            x: x - 100,
            y: y + dy - 30,
            props: { w: 200, h: 60, latex, displayMode: true, color: '#1e293b', fontSize: 16 },
          });
        });
      },
    },
    {
      id: 'periodic-H',
      label: 'Element: H',
      icon: 'H',
      description: 'Hydrogen element tile',
      onClick: (editor) => insertElementTile(editor, 1, 'H', 'Hydrogen', '1.008'),
    },
    {
      id: 'periodic-C',
      label: 'Element: C',
      icon: 'C',
      description: 'Carbon element tile',
      onClick: (editor) => insertElementTile(editor, 6, 'C', 'Carbon', '12.01'),
    },
    {
      id: 'periodic-O',
      label: 'Element: O',
      icon: 'O',
      description: 'Oxygen element tile',
      onClick: (editor) => insertElementTile(editor, 8, 'O', 'Oxygen', '16.00'),
    },
    {
      id: 'periodic-Na',
      label: 'Element: Na',
      icon: 'Na',
      description: 'Sodium element tile',
      onClick: (editor) => insertElementTile(editor, 11, 'Na', 'Sodium', '22.99'),
    },
    {
      id: 'kinetic-energy',
      label: 'KE Formula',
      icon: 'KE',
      description: 'Kinetic energy formula',
      onClick: (editor) => {
        const { x, y } = getViewportCenter(editor);
        stampShape(editor, {
          id: createShapeId(),
          type: 'math-equation',
          x: x - 140,
          y: y - 40,
          props: { w: 280, h: 80, latex: 'E_k = \\dfrac{1}{2}mv^2', displayMode: true, color: '#1e293b', fontSize: 18 },
        });
      },
    },
    {
      id: 'newtons-2nd',
      label: "Newton's 2nd",
      icon: 'F=ma',
      description: 'Newton\'s second law',
      onClick: (editor) => {
        const { x, y } = getViewportCenter(editor);
        stampShape(editor, {
          id: createShapeId(),
          type: 'math-equation',
          x: x - 120,
          y: y - 40,
          props: { w: 240, h: 80, latex: 'F = ma', displayMode: true, color: '#1e293b', fontSize: 22 },
        });
      },
    },
    {
      id: 'bohr-atom',
      label: 'Bohr Atom',
      icon: '⚛',
      description: 'Bohr model atom diagram (double-click to choose element)',
      onClick: (editor) => {
        const { x, y } = getViewportCenter(editor);
        stampShape(editor, {
          id: createShapeId(),
          type: 'bohr-atom',
          x: x - 120,
          y: y - 120,
          props: { w: 240, h: 240, symbol: 'Na', protons: 11, neutrons: 12, shells: JSON.stringify([2, 8, 1]), color: '#2563eb', showNumbers: true },
        });
      },
    },
    {
      id: 'science-timeline',
      label: 'Timeline',
      icon: '—→',
      description: 'Timeline for discoveries, history of science',
      onClick: (editor) => {
        const { x, y } = getViewportCenter(editor);
        stampShape(editor, {
          id: createShapeId(),
          type: 'timeline',
          x: x - 240,
          y: y - 80,
          props: { w: 480, h: 160, events: JSON.stringify([{label:'Discovery 1',date:'Year',color:'#dc2626',above:true},{label:'Discovery 2',date:'Year',color:'#2563eb',above:false},{label:'Discovery 3',date:'Year',color:'#16a34a',above:true}]), title: 'History of Science', lineColor: '#475569' },
        });
      },
    },
    {
      id: 'geogebra',
      label: 'GeoGebra',
      icon: '◯',
      description: 'Embed GeoGebra geometry tool',
      onClick: (editor) => {
        const { x, y } = getViewportCenter(editor);
        const id = createShapeId();
        create(editor, {
          id,
          type: 'tool-embed',
          x: x - 240,
          y: y - 180,
          props: { w: 480, h: 360, url: 'https://www.geogebra.org/graphing', label: 'GeoGebra Graphing' },
        });
        editor.setSelectedShapes([id]);
        editor.setEditingShape(id);
      },
    },
  ];
}

function insertElementTile(editor: ReturnType<typeof useEditor>, number: number, symbol: string, name: string, mass: string) {
  const { x, y } = getViewportCenter(editor);
  // Use a text shape for element tiles — tldraw built-in geo shape
  create(editor, {
    id: createShapeId(),
    type: 'geo',
    x: x - 36,
    y: y - 44,
    props: {
      geo: 'rectangle',
      w: 72,
      h: 88,
      color: 'violet',
      fill: 'solid',
      size: 's',
      text: `${number}\n${symbol}\n${name}\n${mass}`,
      font: 'mono',
      align: 'middle',
    },
  });
}

// ── Panel Component ───────────────────────────────────────────────────────

// ── Per-subject config ────────────────────────────────────────────────────

const SUBJECT_CONFIG = {
  maths: {
    label: 'Maths',
    // Light green circle
    dotColor: '#86efac',       // tailwind green-300
    dotBorder: '#4ade80',      // green-400
    panelAccent: '#16a34a',    // green-600
    panelBg: '#f0fdf4',
  },
  science: {
    label: 'Science',
    // Light red circle
    dotColor: '#fca5a5',       // tailwind red-300
    dotBorder: '#f87171',      // red-400
    panelAccent: '#dc2626',    // red-600
    panelBg: '#fef2f2',
  },
  english: {
    label: 'English',
    // Light blue circle
    dotColor: '#93c5fd',       // tailwind blue-300
    dotBorder: '#60a5fa',      // blue-400
    panelAccent: '#2563eb',    // blue-600
    panelBg: '#eff6ff',
  },
} as const;

// ── Panel for a single subject ────────────────────────────────────────────

function SubjectPanel({
  subject,
  tools,
  onClose,
}: {
  subject: Tab;
  tools: ToolItem[];
  onClose: () => void;
}) {
  const editor = useEditor();
  const [search, setSearch] = useState('');
  const cfg = SUBJECT_CONFIG[subject];

  const filtered = tools.filter(
    (t) =>
      !search ||
      t.label.toLowerCase().includes(search.toLowerCase()) ||
      (t.description?.toLowerCase().includes(search.toLowerCase()) ?? false)
  );

  return (
    <div
      style={{
        background: 'white',
        border: `1.5px solid ${cfg.dotBorder}`,
        borderRadius: 10,
        boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
        width: 228,
        maxHeight: 'calc(100vh - 180px)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div
        style={{
          background: cfg.panelBg,
          borderBottom: `1px solid ${cfg.dotBorder}40`,
          padding: '8px 10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: cfg.dotColor,
              border: `2px solid ${cfg.dotBorder}`,
              flexShrink: 0,
              display: 'inline-block',
            }}
          />
          <span style={{ fontSize: 12, fontWeight: 700, color: cfg.panelAccent, fontFamily: 'sans-serif' }}>
            {cfg.label} Tools
          </span>
        </div>
        <button
          onClick={onClose}
          style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 14, lineHeight: 1, padding: 2 }}
        >
          ✕
        </button>
      </div>

      {/* Search */}
      <div style={{ padding: '6px 8px', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Search ${cfg.label.toLowerCase()} tools…`}
          style={{
            width: '100%',
            border: '1px solid #e2e8f0',
            borderRadius: 4,
            padding: '4px 8px',
            fontSize: 11,
            outline: 'none',
            fontFamily: 'sans-serif',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Tool list */}
      <div style={{ overflowY: 'auto', flex: 1, padding: '4px 0' }}>
        {filtered.length === 0 && (
          <div style={{ padding: '12px', fontSize: 11, color: '#94a3b8', textAlign: 'center' }}>
            No tools match &ldquo;{search}&rdquo;
          </div>
        )}
        {filtered.map((tool) => (
          <button
            key={tool.id}
            onClick={() => tool.onClick(editor)}
            title={tool.description}
            style={{
              width: '100%',
              textAlign: 'left',
              border: 'none',
              background: 'none',
              padding: '5px 10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              borderRadius: 4,
              transition: 'background 0.1s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = cfg.panelBg)}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
          >
            <span
              style={{
                width: 28,
                height: 28,
                background: cfg.dotColor + '60',
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 700,
                color: cfg.panelAccent,
                flexShrink: 0,
                fontFamily: 'monospace',
              }}
            >
              {tool.icon.length > 3 ? tool.icon.slice(0, 3) : tool.icon}
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#1e293b', fontFamily: 'sans-serif' }}>
                {tool.label}
              </div>
              {tool.description && (
                <div style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'sans-serif', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {tool.description}
                </div>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Footer */}
      <div style={{ padding: '5px 10px', borderTop: '1px solid #f1f5f9', flexShrink: 0 }}>
        <p style={{ margin: 0, fontSize: 9, color: '#cbd5e1', fontFamily: 'sans-serif' }}>
          Click to stamp · Double-click shapes to edit
        </p>
      </div>
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────

export function SubjectToolsPanel() {
  const editor = useEditor();
  const [openTab, setOpenTab] = useState<Tab | null>(null);

  const allTools: Record<Tab, ToolItem[]> = {
    maths: getMathsTools(),
    english: getEnglishTools(),
    science: getScienceTools(),
  };

  const handleToolClick = useCallback(
    (tool: ToolItem) => { tool.onClick(editor); },
    [editor]
  );
  void handleToolClick; // used inside SubjectPanel via closure

  const toggle = useCallback((t: Tab) => {
    setOpenTab((cur) => (cur === t ? null : t));
  }, []);

  return (
    <div
      style={{
        position: 'absolute',
        left: 264,
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 500,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        pointerEvents: 'all',
      }}
    >
      {/* 3 CTA buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {(['maths', 'science', 'english'] as Tab[]).map((t) => {
          const cfg = SUBJECT_CONFIG[t];
          const active = openTab === t;

          // science = triangle via clip-path, english = square (rounded), maths = circle
          const extraStyle: React.CSSProperties =
            t === 'science'
              ? { clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)', borderRadius: 0, border: 'none' }
              : t === 'english'
              ? { borderRadius: 6 }
              : { borderRadius: '50%' };

          return (
            <button
              key={t}
              onClick={() => toggle(t)}
              title={`${cfg.label} tools`}
              style={{
                width: 36,
                height: 36,
                border: t === 'science' ? 'none' : `2.5px solid ${active ? cfg.dotBorder : cfg.dotBorder + '80'}`,
                background: active ? cfg.dotColor : cfg.dotColor + 'aa',
                cursor: 'pointer',
                display: 'block',
                boxShadow: active ? `0 0 0 3px ${cfg.dotBorder}40` : '0 2px 6px rgba(0,0,0,0.12)',
                transition: 'all 0.15s',
                padding: 0,
                flexShrink: 0,
                ...extraStyle,
              }}
            />
          );
        })}
      </div>

      {/* Open panel (only one at a time) */}
      {openTab && (
        <SubjectPanel
          subject={openTab}
          tools={allTools[openTab]}
          onClose={() => setOpenTab(null)}
        />
      )}
    </div>
  );
}
