/**
 * GCSE/A-Level Maths Topics
 *
 * Topic hierarchy for mathematics curriculum.
 */

import type { TopicHierarchy, TopicCategory } from '../types';

// --- GCSE Maths Topics ---

export const GCSE_MATHS_TOPICS: TopicCategory[] = [
  {
    id: 'number',
    name: 'Number',
    topics: [
      {
        id: 'number-types',
        name: 'Types of Number',
        subtopics: [
          { id: 'integers', name: 'Integers', skills: ['identify', 'order', 'compare'] },
          { id: 'fractions', name: 'Fractions', skills: ['simplify', 'convert', 'compare'] },
          { id: 'decimals', name: 'Decimals', skills: ['convert', 'round', 'order'] },
          { id: 'percentages', name: 'Percentages', skills: ['convert', 'calculate', 'increase/decrease'] },
        ],
        skills: ['identify number types', 'convert between forms'],
      },
      {
        id: 'operations',
        name: 'Operations',
        subtopics: [
          { id: 'bodmas', name: 'Order of Operations (BODMAS)', skills: ['apply order', 'evaluate expressions'] },
          { id: 'negative-numbers', name: 'Negative Numbers', skills: ['add', 'subtract', 'multiply', 'divide'] },
        ],
        skills: ['calculate accurately', 'use correct order'],
      },
      {
        id: 'factors-multiples',
        name: 'Factors and Multiples',
        subtopics: [
          { id: 'hcf', name: 'Highest Common Factor (HCF)', skills: ['find HCF', 'prime factorisation'] },
          { id: 'lcm', name: 'Lowest Common Multiple (LCM)', skills: ['find LCM', 'prime factorisation'] },
          { id: 'primes', name: 'Prime Numbers', skills: ['identify', 'factorise'] },
        ],
        skills: ['find factors', 'find multiples', 'prime factorisation'],
      },
      {
        id: 'powers-roots',
        name: 'Powers and Roots',
        subtopics: [
          { id: 'indices', name: 'Index Laws', skills: ['multiply', 'divide', 'power of power'] },
          { id: 'square-roots', name: 'Square Roots', skills: ['calculate', 'estimate'] },
          { id: 'cube-roots', name: 'Cube Roots', skills: ['calculate', 'estimate'] },
        ],
        skills: ['apply index laws', 'calculate roots'],
        formulas: ['a^m × a^n = a^{m+n}', 'a^m ÷ a^n = a^{m-n}', '(a^m)^n = a^{mn}'],
      },
      {
        id: 'standard-form',
        name: 'Standard Form',
        skills: ['convert to/from standard form', 'calculate in standard form'],
        formulas: ['A × 10^n where 1 ≤ A < 10'],
      },
    ],
  },
  {
    id: 'algebra',
    name: 'Algebra',
    topics: [
      {
        id: 'expressions',
        name: 'Algebraic Expressions',
        subtopics: [
          { id: 'simplifying', name: 'Simplifying', skills: ['collect like terms', 'simplify products'] },
          { id: 'expanding', name: 'Expanding Brackets', skills: ['single bracket', 'double brackets'] },
          { id: 'factorising', name: 'Factorising', skills: ['common factor', 'quadratic'] },
        ],
        skills: ['manipulate expressions', 'expand and simplify'],
      },
      {
        id: 'equations',
        name: 'Equations',
        subtopics: [
          { id: 'linear', name: 'Linear Equations', skills: ['solve one-step', 'solve multi-step', 'with brackets'] },
          { id: 'quadratic', name: 'Quadratic Equations', skills: ['factorise', 'formula', 'completing square'] },
          { id: 'simultaneous', name: 'Simultaneous Equations', skills: ['elimination', 'substitution', 'graphical'] },
        ],
        skills: ['solve equations', 'form equations from context'],
        formulas: ['x = \\frac{-b ± \\sqrt{b^2 - 4ac}}{2a}'],
      },
      {
        id: 'graphs',
        name: 'Graphs',
        subtopics: [
          { id: 'linear-graphs', name: 'Linear Graphs', skills: ['plot', 'find gradient', 'y=mx+c'] },
          { id: 'quadratic-graphs', name: 'Quadratic Graphs', skills: ['plot', 'identify features', 'turning points'] },
          { id: 'other-graphs', name: 'Other Graphs', skills: ['cubic', 'reciprocal', 'exponential'] },
        ],
        skills: ['plot graphs', 'interpret graphs', 'find intersections'],
        formulas: ['y = mx + c', 'm = \\frac{y_2 - y_1}{x_2 - x_1}'],
      },
      {
        id: 'sequences',
        name: 'Sequences',
        subtopics: [
          { id: 'arithmetic', name: 'Arithmetic Sequences', skills: ['find nth term', 'find sum'] },
          { id: 'geometric', name: 'Geometric Sequences', skills: ['find nth term', 'common ratio'] },
          { id: 'quadratic-sequences', name: 'Quadratic Sequences', skills: ['find nth term'] },
        ],
        skills: ['generate sequences', 'find nth term'],
        formulas: ['T_n = a + (n-1)d', 'T_n = ar^{n-1}'],
      },
    ],
  },
  {
    id: 'ratio',
    name: 'Ratio, Proportion and Rates of Change',
    topics: [
      {
        id: 'ratio-basics',
        name: 'Ratio',
        skills: ['simplify ratios', 'share in ratio', 'combine ratios'],
      },
      {
        id: 'proportion',
        name: 'Proportion',
        subtopics: [
          { id: 'direct', name: 'Direct Proportion', skills: ['identify', 'calculate', 'graph'] },
          { id: 'inverse', name: 'Inverse Proportion', skills: ['identify', 'calculate', 'graph'] },
        ],
        skills: ['solve proportion problems', 'use proportion graphs'],
        formulas: ['y = kx', 'y = \\frac{k}{x}'],
      },
      {
        id: 'percentages-change',
        name: 'Percentage Change',
        skills: ['increase/decrease', 'reverse percentages', 'compound interest'],
        formulas: ['\\text{New} = \\text{Original} × (1 ± \\frac{r}{100})^n'],
      },
    ],
  },
  {
    id: 'geometry',
    name: 'Geometry and Measures',
    topics: [
      {
        id: 'angles',
        name: 'Angles',
        subtopics: [
          { id: 'angle-facts', name: 'Angle Facts', skills: ['angles on line', 'vertically opposite', 'parallel lines'] },
          { id: 'polygon-angles', name: 'Polygon Angles', skills: ['interior angles', 'exterior angles'] },
        ],
        skills: ['calculate missing angles', 'use angle facts'],
        formulas: ['\\text{Sum of interior angles} = (n-2) × 180°'],
      },
      {
        id: 'area-perimeter',
        name: 'Area and Perimeter',
        skills: ['calculate areas', 'calculate perimeters', 'compound shapes'],
        formulas: [
          'A_{\\text{rectangle}} = l × w',
          'A_{\\text{triangle}} = \\frac{1}{2} × b × h',
          'A_{\\text{circle}} = πr^2',
          'C = 2πr',
        ],
      },
      {
        id: 'volume-surface',
        name: 'Volume and Surface Area',
        skills: ['calculate volumes', 'calculate surface areas', '3D shapes'],
        formulas: [
          'V_{\\text{cuboid}} = l × w × h',
          'V_{\\text{cylinder}} = πr^2h',
          'V_{\\text{sphere}} = \\frac{4}{3}πr^3',
        ],
      },
      {
        id: 'pythagoras',
        name: 'Pythagoras Theorem',
        skills: ['find hypotenuse', 'find shorter side', 'apply in context'],
        formulas: ['a^2 + b^2 = c^2'],
      },
      {
        id: 'trigonometry',
        name: 'Trigonometry',
        subtopics: [
          { id: 'right-angle-trig', name: 'Right-Angle Trigonometry', skills: ['find sides', 'find angles', 'SOHCAHTOA'] },
          { id: 'sine-cosine-rules', name: 'Sine and Cosine Rules', skills: ['apply sine rule', 'apply cosine rule'] },
        ],
        skills: ['solve trigonometry problems', 'apply in context'],
        formulas: [
          '\\sin θ = \\frac{O}{H}',
          '\\cos θ = \\frac{A}{H}',
          '\\tan θ = \\frac{O}{A}',
          '\\frac{a}{\\sin A} = \\frac{b}{\\sin B}',
          'a^2 = b^2 + c^2 - 2bc\\cos A',
        ],
      },
      {
        id: 'transformations',
        name: 'Transformations',
        subtopics: [
          { id: 'reflection', name: 'Reflection', skills: ['reflect shapes', 'describe reflection'] },
          { id: 'rotation', name: 'Rotation', skills: ['rotate shapes', 'describe rotation'] },
          { id: 'translation', name: 'Translation', skills: ['translate shapes', 'use vectors'] },
          { id: 'enlargement', name: 'Enlargement', skills: ['enlarge shapes', 'find scale factor'] },
        ],
        skills: ['perform transformations', 'describe transformations'],
      },
    ],
  },
  {
    id: 'probability',
    name: 'Probability',
    topics: [
      {
        id: 'basic-probability',
        name: 'Basic Probability',
        skills: ['calculate probability', 'probability scale', 'expected outcomes'],
        formulas: ['P(A) = \\frac{\\text{favourable outcomes}}{\\text{total outcomes}}'],
      },
      {
        id: 'combined-events',
        name: 'Combined Events',
        subtopics: [
          { id: 'tree-diagrams', name: 'Tree Diagrams', skills: ['draw', 'calculate probabilities'] },
          { id: 'venn-diagrams', name: 'Venn Diagrams', skills: ['draw', 'use notation', 'calculate'] },
        ],
        skills: ['calculate combined probabilities', 'AND/OR rules'],
        formulas: ['P(A \\text{ and } B) = P(A) × P(B)', 'P(A \\text{ or } B) = P(A) + P(B) - P(A \\text{ and } B)'],
      },
    ],
  },
  {
    id: 'statistics',
    name: 'Statistics',
    topics: [
      {
        id: 'averages',
        name: 'Averages and Spread',
        skills: ['calculate mean', 'calculate median', 'calculate mode', 'calculate range'],
        formulas: ['\\bar{x} = \\frac{\\sum x}{n}'],
      },
      {
        id: 'data-representation',
        name: 'Data Representation',
        subtopics: [
          { id: 'charts', name: 'Charts and Graphs', skills: ['bar charts', 'pie charts', 'histograms'] },
          { id: 'scatter-graphs', name: 'Scatter Graphs', skills: ['plot', 'correlation', 'line of best fit'] },
          { id: 'cumulative-freq', name: 'Cumulative Frequency', skills: ['draw', 'find median', 'quartiles'] },
        ],
        skills: ['represent data', 'interpret data'],
      },
    ],
  },
];

// --- Export Topic Hierarchy ---

export const gcseMathsTopicHierarchy: TopicHierarchy = {
  subject: 'maths',
  level: 'GCSE',
  root: GCSE_MATHS_TOPICS,
};

// --- Topic Lookup ---

export function findTopic(topicId: string): { category: TopicCategory; topic: any } | null {
  for (const category of GCSE_MATHS_TOPICS) {
    for (const topic of category.topics) {
      if (topic.id === topicId) {
        return { category, topic };
      }
      if (topic.subtopics) {
        for (const subtopic of topic.subtopics) {
          if (subtopic.id === topicId) {
            return { category, topic: subtopic };
          }
        }
      }
    }
  }
  return null;
}

export function getTopicsByCategory(categoryId: string): any[] {
  const category = GCSE_MATHS_TOPICS.find(c => c.id === categoryId);
  return category?.topics || [];
}

export function getAllTopicIds(): string[] {
  const ids: string[] = [];
  for (const category of GCSE_MATHS_TOPICS) {
    for (const topic of category.topics) {
      ids.push(topic.id);
      if (topic.subtopics) {
        for (const subtopic of topic.subtopics) {
          ids.push(subtopic.id);
        }
      }
    }
  }
  return ids;
}
