/**
 * KS3 Mathematics Curriculum Data
 *
 * Comprehensive topic taxonomy for Key Stage 3 Maths (Years 7-9)
 * Based on the National Curriculum Programme of Study for Mathematics.
 *
 * Structure:
 * - 4 main strands: Number, Algebra, Geometry, Statistics & Probability
 * - ~25 topics across all strands
 * - Single tier (no exam board at KS3)
 *
 * @module sage/curriculum/data/ks3-maths
 */

import type { CurriculumTopic } from '../types';

/**
 * KS3 Maths Curriculum Topics
 */
export const ks3MathsTopics: CurriculumTopic[] = [
  // ========================================
  // NUMBER
  // ========================================
  {
    id: 'ks3-maths-negative-numbers',
    name: 'Negative Numbers',
    description: 'Understanding, ordering and calculating with negative numbers in context',
    parentId: null,
    subject: 'maths',
    examBoards: [],
    tier: 'single',
    level: 'KS3',
    difficulty: 'ks3-developing',
    learningObjectives: [
      'Order positive and negative integers on a number line',
      'Add, subtract, multiply and divide with negative numbers',
      'Use negative numbers in context such as temperature and bank balances',
      'Understand the rules for multiplying and dividing negative numbers',
    ],
    prerequisites: [],
    misconceptions: [
      'Thinking subtracting a negative makes a smaller number',
      'Believing -3 is larger than -1 because 3 > 1',
      'Confusing the rules for adding vs multiplying negatives',
    ],
    vocabulary: ['integer', 'negative', 'positive', 'absolute value', 'directed number'],
    metadata: {
      ncReference: 'KS3-Number',
    },
  },

  {
    id: 'ks3-maths-hcf-lcm-primes',
    name: 'HCF, LCM & Prime Factorisation',
    description: 'Finding highest common factors, lowest common multiples and expressing numbers as products of primes',
    parentId: null,
    subject: 'maths',
    examBoards: [],
    tier: 'single',
    level: 'KS3',
    difficulty: 'ks3-secure',
    learningObjectives: [
      'Identify prime numbers and recall primes up to 50',
      'Express a number as a product of its prime factors using factor trees or division',
      'Find the HCF and LCM of two or more numbers using prime factorisation',
      'Use Venn diagrams to organise prime factors and determine HCF/LCM',
    ],
    prerequisites: [],
    misconceptions: [
      'Thinking 1 is a prime number',
      'Confusing factors with multiples',
      'Not completing the factor tree to fully prime factors',
    ],
    vocabulary: ['prime number', 'factor', 'multiple', 'highest common factor', 'lowest common multiple', 'prime factorisation', 'product'],
    metadata: {
      ncReference: 'KS3-Number',
    },
  },

  {
    id: 'ks3-maths-fractions-decimals-percentages',
    name: 'Fractions, Decimals & Percentages',
    description: 'Converting between and calculating with fractions, decimals and percentages',
    parentId: null,
    subject: 'maths',
    examBoards: [],
    tier: 'single',
    level: 'KS3',
    difficulty: 'ks3-secure',
    learningObjectives: [
      'Convert fluently between fractions, decimals and percentages',
      'Add, subtract, multiply and divide fractions and mixed numbers',
      'Calculate percentages of amounts including percentage increase and decrease',
      'Order fractions, decimals and percentages on a number line',
      'Express one quantity as a fraction or percentage of another',
    ],
    prerequisites: ['ks3-maths-negative-numbers'],
    misconceptions: [
      'Thinking 1/3 = 0.3 exactly rather than a recurring decimal',
      'Adding fractions by adding numerators and denominators separately',
      'Confusing finding a percentage of an amount with finding what percentage one number is of another',
    ],
    vocabulary: ['fraction', 'decimal', 'percentage', 'equivalent', 'mixed number', 'improper fraction', 'recurring decimal', 'terminating decimal'],
    metadata: {
      ncReference: 'KS3-Number',
    },
  },

  {
    id: 'ks3-maths-ratio-proportion',
    name: 'Ratio & Proportion',
    description: 'Understanding and applying ratio and proportion in a range of contexts',
    parentId: null,
    subject: 'maths',
    examBoards: [],
    tier: 'single',
    level: 'KS3',
    difficulty: 'ks3-secure',
    learningObjectives: [
      'Simplify ratios and express them in their simplest form',
      'Share a quantity in a given ratio',
      'Solve problems involving direct proportion',
      'Use the unitary method to solve proportion problems',
      'Understand and apply scale factors in maps and diagrams',
    ],
    prerequisites: ['ks3-maths-fractions-decimals-percentages'],
    misconceptions: [
      'Confusing ratio with fractions (e.g. 2:3 means 2/3 rather than 2/5)',
      'Adding ratio parts incorrectly when sharing quantities',
      'Thinking ratio order does not matter',
    ],
    vocabulary: ['ratio', 'proportion', 'simplify', 'share', 'unitary method', 'scale factor', 'direct proportion'],
    metadata: {
      ncReference: 'KS3-Number',
    },
  },

  {
    id: 'ks3-maths-powers-roots',
    name: 'Powers & Roots',
    description: 'Working with squares, cubes, indices and roots',
    parentId: null,
    subject: 'maths',
    examBoards: [],
    tier: 'single',
    level: 'KS3',
    difficulty: 'ks3-secure',
    learningObjectives: [
      'Calculate squares, cubes and their roots',
      'Use index notation for positive integer powers',
      'Apply the laws of indices for multiplication and division of powers',
      'Estimate square roots of non-perfect squares',
    ],
    prerequisites: ['ks3-maths-hcf-lcm-primes'],
    misconceptions: [
      'Thinking 2^3 means 2 x 3 rather than 2 x 2 x 2',
      'Confusing square roots with halving',
      'Believing the square root of a number always gives a whole number',
    ],
    vocabulary: ['power', 'index', 'exponent', 'square', 'cube', 'square root', 'cube root', 'base'],
    metadata: {
      ncReference: 'KS3-Number',
    },
  },

  {
    id: 'ks3-maths-standard-form-intro',
    name: 'Standard Form Introduction',
    description: 'Introduction to writing very large and very small numbers in standard form',
    parentId: null,
    subject: 'maths',
    examBoards: [],
    tier: 'single',
    level: 'KS3',
    difficulty: 'ks3-extending',
    learningObjectives: [
      'Understand why standard form is useful for very large and very small numbers',
      'Convert numbers to and from standard form',
      'Order numbers written in standard form',
      'Perform simple calculations with numbers in standard form',
    ],
    prerequisites: ['ks3-maths-powers-roots'],
    misconceptions: [
      'Writing 35 x 10^4 instead of 3.5 x 10^5 (first number must be between 1 and 10)',
      'Using negative powers for large numbers instead of small numbers',
      'Forgetting that the coefficient must be at least 1 and less than 10',
    ],
    vocabulary: ['standard form', 'scientific notation', 'coefficient', 'power of ten', 'order of magnitude'],
    metadata: {
      ncReference: 'KS3-Number',
    },
  },

  // ========================================
  // ALGEBRA
  // ========================================
  {
    id: 'ks3-maths-expressions-simplifying',
    name: 'Expressions & Simplifying',
    description: 'Writing, simplifying and manipulating algebraic expressions',
    parentId: null,
    subject: 'maths',
    examBoards: [],
    tier: 'single',
    level: 'KS3',
    difficulty: 'ks3-developing',
    learningObjectives: [
      'Use letters to represent unknown values and write algebraic expressions',
      'Collect like terms to simplify expressions',
      'Multiply and divide algebraic terms',
      'Expand single brackets',
      'Factorise expressions by taking out common factors',
    ],
    prerequisites: [],
    misconceptions: [
      'Thinking 3a means 3 + a rather than 3 x a',
      'Combining unlike terms such as 2a + 3b = 5ab',
      'Forgetting to multiply every term inside a bracket when expanding',
    ],
    vocabulary: ['expression', 'term', 'coefficient', 'variable', 'simplify', 'collect like terms', 'expand', 'factorise'],
    metadata: {
      ncReference: 'KS3-Algebra',
    },
  },

  {
    id: 'ks3-maths-solving-linear-equations',
    name: 'Solving Linear Equations',
    description: 'Setting up and solving one-step and two-step linear equations',
    parentId: null,
    subject: 'maths',
    examBoards: [],
    tier: 'single',
    level: 'KS3',
    difficulty: 'ks3-secure',
    learningObjectives: [
      'Solve one-step equations using inverse operations',
      'Solve two-step equations including unknowns on both sides',
      'Form equations from worded problems',
      'Check solutions by substituting back into the original equation',
    ],
    prerequisites: ['ks3-maths-expressions-simplifying'],
    misconceptions: [
      'Performing different operations on each side of the equation',
      'Forgetting to apply inverse operations in the correct order',
      'Thinking the equals sign means "write the answer" rather than balance',
    ],
    vocabulary: ['equation', 'solve', 'inverse operation', 'solution', 'unknown', 'balance'],
    metadata: {
      ncReference: 'KS3-Algebra',
    },
  },

  {
    id: 'ks3-maths-coordinates-linear-graphs',
    name: 'Coordinates & Linear Graphs',
    description: 'Plotting coordinates and drawing straight-line graphs from equations',
    parentId: null,
    subject: 'maths',
    examBoards: [],
    tier: 'single',
    level: 'KS3',
    difficulty: 'ks3-secure',
    learningObjectives: [
      'Plot coordinates in all four quadrants',
      'Recognise and draw horizontal and vertical lines (y = c, x = c)',
      'Generate coordinate pairs from a linear equation and plot the graph',
      'Identify the gradient and y-intercept of a straight-line graph',
      'Interpret real-life graphs including distance-time graphs',
    ],
    prerequisites: ['ks3-maths-solving-linear-equations', 'ks3-maths-negative-numbers'],
    misconceptions: [
      'Mixing up the x and y coordinates when plotting points',
      'Thinking a steeper line has a smaller gradient',
      'Confusing the y-intercept with the x-intercept',
    ],
    vocabulary: ['coordinate', 'axis', 'quadrant', 'gradient', 'y-intercept', 'linear', 'slope', 'origin'],
    metadata: {
      ncReference: 'KS3-Algebra',
    },
  },

  {
    id: 'ks3-maths-sequences',
    name: 'Sequences',
    description: 'Recognising, describing and generating term-to-term and position-to-term rules',
    parentId: null,
    subject: 'maths',
    examBoards: [],
    tier: 'single',
    level: 'KS3',
    difficulty: 'ks3-secure',
    learningObjectives: [
      'Continue linear and simple non-linear sequences',
      'Describe term-to-term rules for sequences',
      'Find and use the nth term rule for arithmetic sequences',
      'Recognise special sequences including square, triangular and Fibonacci numbers',
    ],
    prerequisites: ['ks3-maths-expressions-simplifying'],
    misconceptions: [
      'Confusing the term-to-term rule with the nth term expression',
      'Thinking the nth term of 3, 5, 7, 9 is 2n instead of 2n + 1',
      'Not checking the nth term formula works for all given terms',
    ],
    vocabulary: ['sequence', 'term', 'nth term', 'arithmetic sequence', 'common difference', 'linear sequence', 'Fibonacci'],
    metadata: {
      ncReference: 'KS3-Algebra',
    },
  },

  {
    id: 'ks3-maths-inequalities',
    name: 'Inequalities',
    description: 'Understanding inequality notation and solving simple linear inequalities',
    parentId: null,
    subject: 'maths',
    examBoards: [],
    tier: 'single',
    level: 'KS3',
    difficulty: 'ks3-extending',
    learningObjectives: [
      'Understand and use inequality symbols (<, >, ≤, ≥)',
      'Represent inequalities on a number line',
      'List integer values that satisfy an inequality',
      'Solve simple linear inequalities in one variable',
    ],
    prerequisites: ['ks3-maths-solving-linear-equations'],
    misconceptions: [
      'Reversing the inequality sign when it is not necessary',
      'Confusing open and closed circles on number lines',
      'Treating an inequality exactly like an equation and giving a single answer',
    ],
    vocabulary: ['inequality', 'greater than', 'less than', 'at least', 'at most', 'integer', 'satisfy'],
    metadata: {
      ncReference: 'KS3-Algebra',
    },
  },

  {
    id: 'ks3-maths-formulae-substitution',
    name: 'Formulae & Substitution',
    description: 'Using and substituting into formulae, including deriving simple formulae from context',
    parentId: null,
    subject: 'maths',
    examBoards: [],
    tier: 'single',
    level: 'KS3',
    difficulty: 'ks3-secure',
    learningObjectives: [
      'Substitute positive and negative numbers into formulae',
      'Derive simple formulae from real-life contexts',
      'Rearrange simple formulae to change the subject',
      'Understand the difference between an expression, equation, formula and identity',
    ],
    prerequisites: ['ks3-maths-expressions-simplifying', 'ks3-maths-negative-numbers'],
    misconceptions: [
      'Forgetting BIDMAS when substituting into formulae with multiple operations',
      'Substituting -3 and squaring to get -9 instead of 9',
      'Confusing formulae with equations',
    ],
    vocabulary: ['formula', 'substitute', 'subject', 'rearrange', 'expression', 'identity', 'variable'],
    metadata: {
      ncReference: 'KS3-Algebra',
    },
  },

  // ========================================
  // GEOMETRY & MEASURES
  // ========================================
  {
    id: 'ks3-maths-angles-polygons',
    name: 'Angles in Polygons',
    description: 'Calculating interior and exterior angles of regular and irregular polygons',
    parentId: null,
    subject: 'maths',
    examBoards: [],
    tier: 'single',
    level: 'KS3',
    difficulty: 'ks3-secure',
    learningObjectives: [
      'Calculate angles on a straight line, at a point and vertically opposite angles',
      'Find missing angles in triangles and quadrilaterals',
      'Calculate interior and exterior angles of regular polygons',
      'Understand and apply the angle sum formula (n-2) x 180 for polygons',
    ],
    prerequisites: [],
    misconceptions: [
      'Assuming all triangles have a right angle',
      'Confusing interior and exterior angles',
      'Thinking exterior angles of a polygon do not always sum to 360 degrees',
    ],
    vocabulary: ['polygon', 'interior angle', 'exterior angle', 'regular polygon', 'triangle', 'quadrilateral', 'vertically opposite', 'supplementary'],
    metadata: {
      ncReference: 'KS3-Geometry',
    },
  },

  {
    id: 'ks3-maths-transformations',
    name: 'Transformations',
    description: 'Performing and describing reflections, rotations, translations and enlargements',
    parentId: null,
    subject: 'maths',
    examBoards: [],
    tier: 'single',
    level: 'KS3',
    difficulty: 'ks3-secure',
    learningObjectives: [
      'Reflect shapes in horizontal, vertical and diagonal mirror lines',
      'Rotate shapes about a given centre through 90, 180 or 270 degrees',
      'Translate shapes using column vectors',
      'Enlarge shapes from a given centre by a positive integer scale factor',
      'Describe single transformations fully',
    ],
    prerequisites: ['ks3-maths-coordinates-linear-graphs'],
    misconceptions: [
      'Forgetting to state the mirror line when describing a reflection',
      'Confusing clockwise and anticlockwise rotations',
      'Thinking enlargement always makes a shape bigger (scale factors between 0 and 1 shrink it)',
    ],
    vocabulary: ['reflection', 'rotation', 'translation', 'enlargement', 'scale factor', 'centre of rotation', 'mirror line', 'column vector', 'congruent', 'similar'],
    metadata: {
      ncReference: 'KS3-Geometry',
    },
  },

  {
    id: 'ks3-maths-area-perimeter-compound',
    name: 'Area & Perimeter of Compound Shapes',
    description: 'Calculating area and perimeter of rectangles, triangles, parallelograms, trapeziums and compound shapes',
    parentId: null,
    subject: 'maths',
    examBoards: [],
    tier: 'single',
    level: 'KS3',
    difficulty: 'ks3-secure',
    learningObjectives: [
      'Calculate the area and perimeter of rectangles, triangles and parallelograms',
      'Find the area of trapeziums using the formula',
      'Decompose compound shapes into simpler shapes to find total area',
      'Calculate the circumference and area of circles',
    ],
    prerequisites: [],
    misconceptions: [
      'Confusing area and perimeter (area is space inside, perimeter is distance around)',
      'Using the slant height instead of the perpendicular height for triangle and parallelogram area',
      'Forgetting to halve when using the triangle area formula',
    ],
    vocabulary: ['area', 'perimeter', 'compound shape', 'perpendicular height', 'base', 'trapezium', 'parallelogram', 'circumference', 'radius', 'diameter', 'pi'],
    metadata: {
      ncReference: 'KS3-Geometry',
    },
  },

  {
    id: 'ks3-maths-volume-prisms',
    name: 'Volume of Prisms',
    description: 'Calculating the volume of cubes, cuboids and other prisms',
    parentId: null,
    subject: 'maths',
    examBoards: [],
    tier: 'single',
    level: 'KS3',
    difficulty: 'ks3-secure',
    learningObjectives: [
      'Calculate the volume of cubes and cuboids',
      'Find the volume of triangular prisms and other prisms using cross-section area x length',
      'Convert between units of volume (cm^3, m^3, litres)',
      'Calculate surface area of cubes and cuboids',
    ],
    prerequisites: ['ks3-maths-area-perimeter-compound'],
    misconceptions: [
      'Confusing volume with surface area',
      'Forgetting that volume is measured in cubic units not square units',
      'Using incorrect cross-section when calculating prism volume',
    ],
    vocabulary: ['volume', 'prism', 'cross-section', 'cube', 'cuboid', 'surface area', 'capacity', 'net'],
    metadata: {
      ncReference: 'KS3-Geometry',
    },
  },

  {
    id: 'ks3-maths-pythagoras-intro',
    name: 'Pythagoras Intro',
    description: 'Introduction to Pythagoras theorem for right-angled triangles',
    parentId: null,
    subject: 'maths',
    examBoards: [],
    tier: 'single',
    level: 'KS3',
    difficulty: 'ks3-extending',
    learningObjectives: [
      'Understand and state Pythagoras theorem: a^2 + b^2 = c^2',
      'Identify the hypotenuse of a right-angled triangle',
      'Calculate the length of the hypotenuse given two shorter sides',
      'Calculate the length of a shorter side given the hypotenuse and one other side',
    ],
    prerequisites: ['ks3-maths-powers-roots', 'ks3-maths-area-perimeter-compound'],
    misconceptions: [
      'Using the theorem on non-right-angled triangles',
      'Forgetting to square root at the final step when finding a side',
      'Adding all three sides squared instead of the two shorter sides',
    ],
    vocabulary: ['Pythagoras', 'hypotenuse', 'right-angled triangle', 'theorem', 'square root'],
    metadata: {
      ncReference: 'KS3-Geometry',
    },
  },

  {
    id: 'ks3-maths-constructions-loci',
    name: 'Constructions & Loci',
    description: 'Using ruler and compasses for constructions and understanding loci',
    parentId: null,
    subject: 'maths',
    examBoards: [],
    tier: 'single',
    level: 'KS3',
    difficulty: 'ks3-secure',
    learningObjectives: [
      'Construct triangles accurately using a ruler, protractor and compasses',
      'Construct perpendicular bisectors and angle bisectors',
      'Understand the concept of a locus and draw standard loci',
      'Solve simple loci problems involving intersecting regions',
    ],
    prerequisites: ['ks3-maths-angles-polygons'],
    misconceptions: [
      'Thinking constructions can be drawn freehand without compasses',
      'Confusing perpendicular bisector with angle bisector',
      'Not leaving construction arcs visible as evidence of method',
    ],
    vocabulary: ['construction', 'locus', 'loci', 'perpendicular bisector', 'angle bisector', 'compasses', 'arc', 'equidistant'],
    metadata: {
      ncReference: 'KS3-Geometry',
    },
  },

  {
    id: 'ks3-maths-bearings',
    name: 'Bearings',
    description: 'Measuring and calculating three-figure bearings',
    parentId: null,
    subject: 'maths',
    examBoards: [],
    tier: 'single',
    level: 'KS3',
    difficulty: 'ks3-extending',
    learningObjectives: [
      'Understand that bearings are measured clockwise from North as three-figure values',
      'Measure bearings from a diagram using a protractor',
      'Calculate back bearings',
      'Solve problems involving bearings and scale drawings',
    ],
    prerequisites: ['ks3-maths-angles-polygons'],
    misconceptions: [
      'Measuring bearings anticlockwise instead of clockwise from North',
      'Writing bearings with fewer than three figures (e.g. 45 instead of 045)',
      'Confusing compass directions with bearing measurements',
    ],
    vocabulary: ['bearing', 'three-figure bearing', 'North', 'clockwise', 'back bearing', 'scale drawing'],
    metadata: {
      ncReference: 'KS3-Geometry',
    },
  },

  // ========================================
  // STATISTICS & PROBABILITY
  // ========================================
  {
    id: 'ks3-maths-collecting-representing-data',
    name: 'Collecting & Representing Data',
    description: 'Designing surveys, collecting data and presenting it in tables, charts and diagrams',
    parentId: null,
    subject: 'maths',
    examBoards: [],
    tier: 'single',
    level: 'KS3',
    difficulty: 'ks3-developing',
    learningObjectives: [
      'Design and use data collection sheets and questionnaires',
      'Classify data as discrete or continuous, primary or secondary',
      'Represent data using bar charts, pictograms and frequency tables',
      'Choose appropriate diagrams for different types of data',
    ],
    prerequisites: [],
    misconceptions: [
      'Using overlapping class intervals in grouped frequency tables',
      'Drawing bars of unequal width in bar charts',
      'Confusing discrete and continuous data',
    ],
    vocabulary: ['data', 'discrete', 'continuous', 'primary data', 'secondary data', 'frequency', 'tally', 'class interval'],
    metadata: {
      ncReference: 'KS3-Statistics',
    },
  },

  {
    id: 'ks3-maths-averages-range',
    name: 'Averages & Range',
    description: 'Calculating and interpreting mean, median, mode and range',
    parentId: null,
    subject: 'maths',
    examBoards: [],
    tier: 'single',
    level: 'KS3',
    difficulty: 'ks3-developing',
    learningObjectives: [
      'Calculate the mean, median and mode from a list of data',
      'Find the range of a data set',
      'Choose the most appropriate average for a given situation',
      'Calculate averages from a frequency table',
      'Compare two data sets using averages and range',
    ],
    prerequisites: ['ks3-maths-collecting-representing-data'],
    misconceptions: [
      'Thinking the mode is always the most useful average',
      'Forgetting to order data before finding the median',
      'Confusing the range with the highest value',
    ],
    vocabulary: ['mean', 'median', 'mode', 'range', 'average', 'frequency table', 'data set'],
    metadata: {
      ncReference: 'KS3-Statistics',
    },
  },

  {
    id: 'ks3-maths-probability',
    name: 'Probability',
    description: 'Understanding experimental and theoretical probability including sample spaces',
    parentId: null,
    subject: 'maths',
    examBoards: [],
    tier: 'single',
    level: 'KS3',
    difficulty: 'ks3-secure',
    learningObjectives: [
      'Understand the probability scale from 0 (impossible) to 1 (certain)',
      'Calculate theoretical probabilities for equally likely outcomes',
      'Record and analyse experimental probability (relative frequency)',
      'List outcomes systematically using sample space diagrams and two-way tables',
      'Understand that relative frequency approaches theoretical probability with more trials',
    ],
    prerequisites: ['ks3-maths-fractions-decimals-percentages'],
    misconceptions: [
      'Thinking probability can be greater than 1 or less than 0',
      'Believing past results affect independent future outcomes (gambler\'s fallacy)',
      'Thinking all outcomes are always equally likely',
    ],
    vocabulary: ['probability', 'outcome', 'event', 'equally likely', 'sample space', 'relative frequency', 'theoretical probability', 'experimental probability', 'trial'],
    metadata: {
      ncReference: 'KS3-Statistics',
    },
  },

  {
    id: 'ks3-maths-pie-charts-scatter-graphs',
    name: 'Pie Charts & Scatter Graphs',
    description: 'Drawing and interpreting pie charts and scatter graphs including correlation',
    parentId: null,
    subject: 'maths',
    examBoards: [],
    tier: 'single',
    level: 'KS3',
    difficulty: 'ks3-secure',
    learningObjectives: [
      'Draw and interpret pie charts using angle calculations',
      'Plot scatter graphs from paired data',
      'Describe the type and strength of correlation between two variables',
      'Draw and use a line of best fit to make predictions',
    ],
    prerequisites: ['ks3-maths-collecting-representing-data', 'ks3-maths-fractions-decimals-percentages'],
    misconceptions: [
      'Thinking a larger sector in a pie chart always means a larger frequency (depends on total)',
      'Confusing correlation with causation',
      'Drawing a line of best fit that passes through every point instead of showing the trend',
    ],
    vocabulary: ['pie chart', 'sector', 'scatter graph', 'correlation', 'positive correlation', 'negative correlation', 'line of best fit', 'outlier'],
    metadata: {
      ncReference: 'KS3-Statistics',
    },
  },

  {
    id: 'ks3-maths-venn-diagrams-sets',
    name: 'Venn Diagrams & Sets',
    description: 'Using set notation and Venn diagrams to sort and reason about data',
    parentId: null,
    subject: 'maths',
    examBoards: [],
    tier: 'single',
    level: 'KS3',
    difficulty: 'ks3-extending',
    learningObjectives: [
      'Use set notation including union, intersection and complement',
      'Draw and interpret two-circle and three-circle Venn diagrams',
      'Place elements correctly in Venn diagrams from given information',
      'Use Venn diagrams to calculate probabilities',
    ],
    prerequisites: ['ks3-maths-probability', 'ks3-maths-hcf-lcm-primes'],
    misconceptions: [
      'Placing items in the wrong region when sets overlap',
      'Confusing union and intersection notation',
      'Forgetting the region outside all circles represents elements not in any set',
    ],
    vocabulary: ['set', 'Venn diagram', 'union', 'intersection', 'complement', 'element', 'universal set', 'subset'],
    metadata: {
      ncReference: 'KS3-Statistics',
    },
  },
];
