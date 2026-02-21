/**
 * GCSE Mathematics Curriculum Data
 *
 * Comprehensive topic taxonomy for GCSE Maths (Foundation and Higher)
 * Based on standard specifications common across AQA, Edexcel, and OCR.
 *
 * Structure:
 * - 6 main topic areas
 * - ~50 subtopics
 * - ~200+ specific learning objectives
 *
 * @module sage/curriculum/data/maths
 */

import type { CurriculumTopic } from '../types';

/**
 * GCSE Maths Curriculum Topics
 */
export const mathsTopics: CurriculumTopic[] = [
  // ========================================
  // 1. NUMBER (Foundation: Grades 1-5, Higher: Grades 4-9)
  // ========================================
  {
    id: 'maths-number',
    name: 'Number',
    description: 'Understanding and working with numbers, including integers, fractions, decimals, and percentages',
    parentId: null,
    subject: 'maths',
    examBoards: ['AQA', 'Edexcel', 'OCR'],
    tier: 'both',
    difficulty: 'grade-1-2',
    learningObjectives: [
      'Understand place value and ordering numbers',
      'Perform calculations with integers, fractions, and decimals',
      'Work with percentages and ratios',
      'Apply number skills to real-world problems',
    ],
    prerequisites: [],
    metadata: {
      teachingHours: 25,
      examWeight: 25,
      ncReference: 'KS4-Number',
    },
  },

  // 1.1 Place Value and Ordering
  {
    id: 'maths-number-place-value',
    name: 'Place Value and Ordering',
    description: 'Understanding the value of digits in numbers and ordering numbers',
    parentId: 'maths-number',
    subject: 'maths',
    examBoards: ['AQA', 'Edexcel', 'OCR'],
    tier: 'both',
    difficulty: 'grade-1-2',
    learningObjectives: [
      'Read and write numbers in digits and words',
      'Understand place value in whole numbers and decimals',
      'Order positive and negative numbers',
      'Round numbers to a given number of decimal places or significant figures',
    ],
    prerequisites: [],
    vocabulary: ['place value', 'digit', 'decimal point', 'significant figures', 'rounding'],
  },

  // 1.2 Four Operations
  {
    id: 'maths-number-four-operations',
    name: 'Four Operations',
    description: 'Addition, subtraction, multiplication, and division',
    parentId: 'maths-number',
    subject: 'maths',
    examBoards: ['AQA', 'Edexcel', 'OCR'],
    tier: 'both',
    difficulty: 'grade-1-2',
    learningObjectives: [
      'Add, subtract, multiply, and divide whole numbers',
      'Apply order of operations (BIDMAS/BODMAS)',
      'Perform mental calculations efficiently',
      'Use written methods for complex calculations',
    ],
    prerequisites: ['maths-number-place-value'],
    vocabulary: ['addition', 'subtraction', 'multiplication', 'division', 'BIDMAS', 'BODMAS', 'PEMDAS'],
    misconceptions: [
      'Ignoring order of operations (doing operations left to right)',
      'Confusing multiplication and addition in word problems',
    ],
  },

  // 1.3 Fractions
  {
    id: 'maths-number-fractions',
    name: 'Fractions',
    description: 'Working with fractions, including equivalent fractions and operations',
    parentId: 'maths-number',
    subject: 'maths',
    examBoards: ['AQA', 'Edexcel', 'OCR'],
    tier: 'both',
    difficulty: 'grade-3-4',
    learningObjectives: [
      'Identify equivalent fractions',
      'Simplify fractions to their lowest terms',
      'Add, subtract, multiply, and divide fractions',
      'Convert between mixed numbers and improper fractions',
      'Order fractions by size',
    ],
    prerequisites: ['maths-number-four-operations'],
    vocabulary: ['numerator', 'denominator', 'equivalent', 'simplify', 'common denominator', 'mixed number', 'improper fraction'],
    misconceptions: [
      'Adding numerators and denominators separately (1/2 + 1/3 ≠ 2/5)',
      'Forgetting to find common denominator before adding/subtracting',
    ],
    relatedTopics: ['maths-number-decimals', 'maths-number-percentages'],
  },

  // 1.4 Decimals
  {
    id: 'maths-number-decimals',
    name: 'Decimals',
    description: 'Understanding and calculating with decimal numbers',
    parentId: 'maths-number',
    subject: 'maths',
    examBoards: ['AQA', 'Edexcel', 'OCR'],
    tier: 'both',
    difficulty: 'grade-3-4',
    learningObjectives: [
      'Add, subtract, multiply, and divide decimals',
      'Convert between fractions and decimals',
      'Order decimals by size',
      'Round decimals to required accuracy',
    ],
    prerequisites: ['maths-number-place-value', 'maths-number-fractions'],
    vocabulary: ['decimal point', 'decimal place', 'terminating decimal', 'recurring decimal'],
    relatedTopics: ['maths-number-fractions', 'maths-number-percentages'],
  },

  // 1.5 Percentages
  {
    id: 'maths-number-percentages',
    name: 'Percentages',
    description: 'Working with percentages, including percentage change and reverse percentages',
    parentId: 'maths-number',
    subject: 'maths',
    examBoards: ['AQA', 'Edexcel', 'OCR'],
    tier: 'both',
    difficulty: 'grade-3-4',
    learningObjectives: [
      'Convert between fractions, decimals, and percentages',
      'Calculate percentages of amounts',
      'Calculate percentage increase and decrease',
      'Solve reverse percentage problems',
      'Work with compound interest and depreciation',
    ],
    prerequisites: ['maths-number-fractions', 'maths-number-decimals'],
    vocabulary: ['percentage', 'percent', 'increase', 'decrease', 'multiplier', 'compound interest', 'depreciation'],
    misconceptions: [
      'Thinking percentage increase/decrease is reversible (increase by 10% then decrease by 10% ≠ original)',
      'Using wrong multiplier for percentage change',
    ],
  },

  // 1.6 Powers and Roots
  {
    id: 'maths-number-powers-roots',
    name: 'Powers and Roots',
    description: 'Working with indices, powers, and roots',
    parentId: 'maths-number',
    subject: 'maths',
    examBoards: ['AQA', 'Edexcel', 'OCR'],
    tier: 'both',
    difficulty: 'grade-5-6',
    learningObjectives: [
      'Calculate squares, cubes, and higher powers',
      'Find square roots and cube roots',
      'Understand and apply laws of indices',
      'Work with negative and fractional indices (Higher only)',
      'Use standard form (scientific notation)',
    ],
    prerequisites: ['maths-number-four-operations'],
    vocabulary: ['power', 'index', 'indices', 'exponent', 'square', 'cube', 'square root', 'cube root', 'standard form'],
  },

  // ========================================
  // 2. ALGEBRA
  // ========================================
  {
    id: 'maths-algebra',
    name: 'Algebra',
    description: 'Working with algebraic expressions, equations, and graphs',
    parentId: null,
    subject: 'maths',
    examBoards: ['AQA', 'Edexcel', 'OCR'],
    tier: 'both',
    difficulty: 'grade-3-4',
    learningObjectives: [
      'Manipulate algebraic expressions',
      'Solve linear and quadratic equations',
      'Work with sequences and patterns',
      'Plot and interpret graphs',
    ],
    prerequisites: ['maths-number'],
    metadata: {
      teachingHours: 30,
      examWeight: 30,
      ncReference: 'KS4-Algebra',
    },
  },

  // 2.1 Algebraic Expressions
  {
    id: 'maths-algebra-expressions',
    name: 'Algebraic Expressions',
    description: 'Simplifying and manipulating algebraic expressions',
    parentId: 'maths-algebra',
    subject: 'maths',
    examBoards: ['AQA', 'Edexcel', 'OCR'],
    tier: 'both',
    difficulty: 'grade-3-4',
    learningObjectives: [
      'Simplify expressions by collecting like terms',
      'Expand single and double brackets',
      'Factorise expressions',
      'Substitute values into expressions',
    ],
    prerequisites: ['maths-number-four-operations'],
    vocabulary: ['term', 'coefficient', 'variable', 'constant', 'like terms', 'expand', 'factorise', 'expression'],
    misconceptions: [
      'Combining unlike terms (2x + 3y ≠ 5xy)',
      'Incorrectly expanding brackets (2(x + 3) ≠ 2x + 3)',
    ],
  },

  // 2.2 Solving Linear Equations
  {
    id: 'maths-algebra-linear-equations',
    name: 'Solving Linear Equations',
    description: 'Solving equations with one unknown',
    parentId: 'maths-algebra',
    subject: 'maths',
    examBoards: ['AQA', 'Edexcel', 'OCR'],
    tier: 'both',
    difficulty: 'grade-3-4',
    learningObjectives: [
      'Solve one-step and two-step equations',
      'Solve equations with unknowns on both sides',
      'Solve equations with brackets',
      'Solve equations with fractions',
    ],
    prerequisites: ['maths-algebra-expressions'],
    vocabulary: ['equation', 'unknown', 'variable', 'solve', 'balance method', 'inverse operation'],
    misconceptions: [
      'Not performing same operation on both sides',
      'Sign errors when moving terms across equals sign',
    ],
  },

  // 2.3 Quadratic Equations
  {
    id: 'maths-algebra-quadratic-equations',
    name: 'Quadratic Equations',
    description: 'Solving quadratic equations by factorising, completing the square, and using the formula',
    parentId: 'maths-algebra',
    subject: 'maths',
    examBoards: ['AQA', 'Edexcel', 'OCR'],
    tier: 'higher',
    difficulty: 'grade-7-8',
    learningObjectives: [
      'Solve quadratic equations by factorising',
      'Solve quadratic equations by completing the square',
      'Use the quadratic formula',
      'Interpret solutions in context',
    ],
    prerequisites: ['maths-algebra-linear-equations', 'maths-algebra-expressions'],
    vocabulary: ['quadratic', 'factorising', 'completing the square', 'quadratic formula', 'roots', 'solutions'],
  },

  // 2.4 Sequences
  {
    id: 'maths-algebra-sequences',
    name: 'Sequences',
    description: 'Recognising and generating number sequences',
    parentId: 'maths-algebra',
    subject: 'maths',
    examBoards: ['AQA', 'Edexcel', 'OCR'],
    tier: 'both',
    difficulty: 'grade-5-6',
    learningObjectives: [
      'Recognise arithmetic and geometric sequences',
      'Find the nth term of a linear sequence',
      'Find the nth term of a quadratic sequence (Higher)',
      'Use sequence notation',
    ],
    prerequisites: ['maths-algebra-expressions'],
    vocabulary: ['sequence', 'term', 'position', 'nth term', 'common difference', 'arithmetic sequence', 'geometric sequence'],
  },

  // 2.5 Graphs
  {
    id: 'maths-algebra-graphs',
    name: 'Graphs',
    description: 'Plotting and interpreting linear, quadratic, and other graphs',
    parentId: 'maths-algebra',
    subject: 'maths',
    examBoards: ['AQA', 'Edexcel', 'OCR'],
    tier: 'both',
    difficulty: 'grade-5-6',
    learningObjectives: [
      'Plot coordinates in all four quadrants',
      'Draw and interpret linear graphs',
      'Find gradient and y-intercept',
      'Draw and interpret quadratic graphs',
      'Solve equations graphically',
    ],
    prerequisites: ['maths-algebra-linear-equations'],
    vocabulary: ['coordinate', 'axis', 'quadrant', 'gradient', 'slope', 'y-intercept', 'linear', 'quadratic', 'parabola'],
  },

  // ========================================
  // 3. RATIO, PROPORTION AND RATES OF CHANGE
  // ========================================
  {
    id: 'maths-ratio',
    name: 'Ratio, Proportion and Rates of Change',
    description: 'Working with ratios, proportions, and rates',
    parentId: null,
    subject: 'maths',
    examBoards: ['AQA', 'Edexcel', 'OCR'],
    tier: 'both',
    difficulty: 'grade-3-4',
    learningObjectives: [
      'Simplify and work with ratios',
      'Solve proportion problems',
      'Work with rates of change',
      'Apply ratio and proportion to real contexts',
    ],
    prerequisites: ['maths-number'],
    metadata: {
      teachingHours: 15,
      examWeight: 20,
      ncReference: 'KS4-Ratio',
    },
  },

  // 3.1 Ratio
  {
    id: 'maths-ratio-ratio',
    name: 'Ratio',
    description: 'Understanding and working with ratios',
    parentId: 'maths-ratio',
    subject: 'maths',
    examBoards: ['AQA', 'Edexcel', 'OCR'],
    tier: 'both',
    difficulty: 'grade-3-4',
    learningObjectives: [
      'Simplify ratios',
      'Share quantities in a given ratio',
      'Solve problems involving ratios',
      'Convert between ratios and fractions',
    ],
    prerequisites: ['maths-number-fractions'],
    vocabulary: ['ratio', 'part', 'whole', 'simplify', 'share', 'proportion'],
  },

  // 3.2 Direct and Inverse Proportion
  {
    id: 'maths-ratio-proportion',
    name: 'Direct and Inverse Proportion',
    description: 'Working with directly and inversely proportional relationships',
    parentId: 'maths-ratio',
    subject: 'maths',
    examBoards: ['AQA', 'Edexcel', 'OCR'],
    tier: 'both',
    difficulty: 'grade-5-6',
    learningObjectives: [
      'Recognise direct proportion',
      'Recognise inverse proportion',
      'Solve proportion problems',
      'Use graphs to show proportional relationships',
    ],
    prerequisites: ['maths-ratio-ratio', 'maths-algebra-graphs'],
    vocabulary: ['direct proportion', 'inverse proportion', 'proportional', 'constant of proportionality'],
  },

  // ========================================
  // 4. GEOMETRY AND MEASURES
  // ========================================
  {
    id: 'maths-geometry',
    name: 'Geometry and Measures',
    description: 'Properties of shapes, angles, transformations, and measurements',
    parentId: null,
    subject: 'maths',
    examBoards: ['AQA', 'Edexcel', 'OCR'],
    tier: 'both',
    difficulty: 'grade-3-4',
    learningObjectives: [
      'Understand properties of 2D and 3D shapes',
      'Calculate angles and use angle properties',
      'Apply transformations',
      'Calculate area, perimeter, and volume',
    ],
    prerequisites: ['maths-number'],
    metadata: {
      teachingHours: 20,
      examWeight: 15,
      ncReference: 'KS4-Geometry',
    },
  },

  // 4.1 Angles
  {
    id: 'maths-geometry-angles',
    name: 'Angles',
    description: 'Working with angles and angle properties',
    parentId: 'maths-geometry',
    subject: 'maths',
    examBoards: ['AQA', 'Edexcel', 'OCR'],
    tier: 'both',
    difficulty: 'grade-3-4',
    learningObjectives: [
      'Identify acute, obtuse, right, and reflex angles',
      'Calculate angles on a straight line and around a point',
      'Calculate angles in triangles and quadrilaterals',
      'Use parallel line angle properties',
    ],
    prerequisites: [],
    vocabulary: ['angle', 'acute', 'obtuse', 'right angle', 'reflex', 'parallel', 'corresponding', 'alternate', 'vertically opposite'],
  },

  // 4.2 Pythagoras and Trigonometry
  {
    id: 'maths-geometry-pythagoras-trig',
    name: 'Pythagoras and Trigonometry',
    description: 'Using Pythagoras\' theorem and trigonometric ratios',
    parentId: 'maths-geometry',
    subject: 'maths',
    examBoards: ['AQA', 'Edexcel', 'OCR'],
    tier: 'both',
    difficulty: 'grade-5-6',
    learningObjectives: [
      'Apply Pythagoras\' theorem to find missing sides',
      'Use SOHCAHTOA to find missing sides and angles',
      'Solve problems in 2D and 3D contexts',
      'Use sine and cosine rules (Higher)',
    ],
    prerequisites: ['maths-number-powers-roots', 'maths-geometry-angles'],
    vocabulary: ['hypotenuse', 'opposite', 'adjacent', 'sine', 'cosine', 'tangent', 'SOHCAHTOA'],
  },

  // ========================================
  // 5. PROBABILITY
  // ========================================
  {
    id: 'maths-probability',
    name: 'Probability',
    description: 'Understanding and calculating probabilities',
    parentId: null,
    subject: 'maths',
    examBoards: ['AQA', 'Edexcel', 'OCR'],
    tier: 'both',
    difficulty: 'grade-3-4',
    learningObjectives: [
      'Calculate simple probabilities',
      'Use probability scales',
      'Calculate combined probabilities',
      'Use tree diagrams and Venn diagrams',
    ],
    prerequisites: ['maths-number-fractions'],
    metadata: {
      teachingHours: 12,
      examWeight: 5,
      ncReference: 'KS4-Probability',
    },
  },

  // ========================================
  // 6. STATISTICS
  // ========================================
  {
    id: 'maths-statistics',
    name: 'Statistics',
    description: 'Collecting, representing, and interpreting data',
    parentId: null,
    subject: 'maths',
    examBoards: ['AQA', 'Edexcel', 'OCR'],
    tier: 'both',
    difficulty: 'grade-3-4',
    learningObjectives: [
      'Collect and represent data',
      'Calculate averages and range',
      'Interpret charts and graphs',
      'Analyse data distributions',
    ],
    prerequisites: ['maths-number'],
    metadata: {
      teachingHours: 10,
      examWeight: 5,
      ncReference: 'KS4-Statistics',
    },
  },

  // 6.1 Averages and Range
  {
    id: 'maths-statistics-averages',
    name: 'Averages and Range',
    description: 'Calculating mean, median, mode, and range',
    parentId: 'maths-statistics',
    subject: 'maths',
    examBoards: ['AQA', 'Edexcel', 'OCR'],
    tier: 'both',
    difficulty: 'grade-3-4',
    learningObjectives: [
      'Calculate mean, median, and mode',
      'Find the range of a data set',
      'Choose appropriate averages for different contexts',
      'Calculate averages from frequency tables',
    ],
    prerequisites: ['maths-number-four-operations'],
    vocabulary: ['mean', 'median', 'mode', 'range', 'average', 'frequency', 'data set'],
  },
];

/**
 * Get all topics for a specific subject area
 */
export function getTopicsBySubject(subject: string): CurriculumTopic[] {
  return mathsTopics.filter(t => t.subject === subject);
}

/**
 * Get all top-level topics (no parent)
 */
export function getTopLevelTopics(): CurriculumTopic[] {
  return mathsTopics.filter(t => t.parentId === null);
}

/**
 * Get all child topics of a parent topic
 */
export function getChildTopics(parentId: string): CurriculumTopic[] {
  return mathsTopics.filter(t => t.parentId === parentId);
}

/**
 * Get a topic by ID
 */
export function getTopicById(id: string): CurriculumTopic | undefined {
  return mathsTopics.find(t => t.id === id);
}

/**
 * Get topics by difficulty level
 */
export function getTopicsByDifficulty(difficulty: string): CurriculumTopic[] {
  return mathsTopics.filter(t => t.difficulty === difficulty);
}

/**
 * Get topics by tier (foundation, higher, both)
 */
export function getTopicsByTier(tier: string): CurriculumTopic[] {
  return mathsTopics.filter(t => t.tier === tier || t.tier === 'both');
}
