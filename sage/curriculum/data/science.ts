/**
 * GCSE Science Curriculum Data
 *
 * Comprehensive topic taxonomy for GCSE Combined Science, Biology, Chemistry, and Physics
 * Based on standard specifications common across AQA, Edexcel, and OCR.
 *
 * Structure:
 * - Combined Science (Foundation and Higher tiers)
 * - Separate sciences available for Triple Science students
 *
 * @module sage/curriculum/data/science
 */

import type { CurriculumTopic } from '../types';

/**
 * GCSE Science Curriculum Topics
 */
export const scienceTopics: CurriculumTopic[] = [
  // ========================================
  // BIOLOGY
  // ========================================
  {
    id: 'biology-main',
    name: 'Biology',
    description: 'The study of living organisms, their structure, function, growth, evolution, and distribution',
    parentId: null,
    subject: 'biology',
    examBoards: ['AQA', 'Edexcel', 'OCR'],
    tier: 'both',
    difficulty: 'grade-3-4',
    learningObjectives: [
      'Understand cell biology and organisation',
      'Explain infection and response mechanisms',
      'Describe bioenergetics processes',
      'Understand homeostasis and response',
      'Explain inheritance, variation, and evolution',
      'Describe ecosystems and ecology',
    ],
    prerequisites: [],
    metadata: {
      teachingHours: 35,
      examWeight: 33,
      ncReference: 'KS4-Biology',
    },
  },

  // Biology 1: Cell Biology
  {
    id: 'biology-cell-structure',
    name: 'Cell Structure',
    description: 'Understanding the structure and function of plant and animal cells',
    parentId: 'biology-main',
    subject: 'biology',
    examBoards: ['AQA', 'Edexcel', 'OCR'],
    tier: 'both',
    difficulty: 'grade-3-4',
    learningObjectives: [
      'Describe the structure of animal and plant cells',
      'Explain the function of subcellular structures',
      'Compare prokaryotic and eukaryotic cells',
      'Use microscopy to observe cells',
      'Calculate magnification and size of cells',
    ],
    prerequisites: [],
    vocabulary: ['nucleus', 'cytoplasm', 'cell membrane', 'mitochondria', 'ribosomes', 'chloroplast', 'cell wall', 'vacuole', 'prokaryote', 'eukaryote'],
    misconceptions: [
      'Thinking all cells have chloroplasts (only plant cells)',
      'Confusing cell membrane with cell wall',
      'Believing the nucleus controls all cell activities (many processes are controlled by enzymes)',
    ],
  },

  {
    id: 'biology-cell-division',
    name: 'Cell Division',
    description: 'Understanding mitosis, cell differentiation, and stem cells',
    parentId: 'biology-main',
    subject: 'biology',
    examBoards: ['AQA', 'Edexcel', 'OCR'],
    tier: 'both',
    difficulty: 'grade-5-6',
    learningObjectives: [
      'Describe the stages of mitosis',
      'Explain the importance of cell division',
      'Understand cell differentiation and specialisation',
      'Describe the function and types of stem cells',
      'Evaluate the uses and ethics of stem cell technology',
    ],
    prerequisites: ['biology-cell-structure'],
    vocabulary: ['mitosis', 'chromosome', 'cell cycle', 'differentiation', 'stem cell', 'embryonic', 'adult stem cell', 'therapeutic cloning'],
    misconceptions: [
      'Confusing mitosis with meiosis',
      'Thinking stem cells can only come from embryos',
    ],
  },

  // Biology 2: Organisation
  {
    id: 'biology-organisation-tissues',
    name: 'Organisation and Tissues',
    description: 'How cells form tissues, organs, and organ systems',
    parentId: 'biology-main',
    subject: 'biology',
    examBoards: ['AQA', 'Edexcel', 'OCR'],
    tier: 'both',
    difficulty: 'grade-3-4',
    learningObjectives: [
      'Describe the organisation from cells to organ systems',
      'Explain the function of major organ systems',
      'Understand enzymes and their role in digestion',
      'Describe the structure and function of the heart and blood vessels',
    ],
    prerequisites: ['biology-cell-structure'],
    vocabulary: ['tissue', 'organ', 'organ system', 'digestive system', 'circulatory system', 'enzyme', 'catalyst', 'substrate'],
  },

  // Biology 3: Infection and Response
  {
    id: 'biology-communicable-diseases',
    name: 'Communicable Diseases',
    description: 'Understanding pathogens, diseases, and the immune response',
    parentId: 'biology-main',
    subject: 'biology',
    examBoards: ['AQA', 'Edexcel', 'OCR'],
    tier: 'both',
    difficulty: 'grade-5-6',
    learningObjectives: [
      'Describe types of pathogens (bacteria, viruses, fungi, protists)',
      'Explain how diseases are spread',
      'Understand the body\'s defence systems',
      'Describe vaccination and antibiotic use',
      'Explain how the immune system works',
    ],
    prerequisites: ['biology-cell-structure'],
    vocabulary: ['pathogen', 'bacteria', 'virus', 'fungus', 'protist', 'antibody', 'antigen', 'white blood cell', 'phagocytosis', 'vaccination', 'antibiotic'],
    misconceptions: [
      'Thinking antibiotics work against viruses',
      'Believing all bacteria are harmful',
      'Confusing antibodies with antibiotics',
    ],
  },

  // Biology 4: Photosynthesis and Respiration
  {
    id: 'biology-photosynthesis',
    name: 'Photosynthesis',
    description: 'How plants make glucose using light energy',
    parentId: 'biology-main',
    subject: 'biology',
    examBoards: ['AQA', 'Edexcel', 'OCR'],
    tier: 'both',
    difficulty: 'grade-5-6',
    learningObjectives: [
      'Write the word and symbol equation for photosynthesis',
      'Explain how rate of photosynthesis is affected by limiting factors',
      'Describe how leaf structure is adapted for photosynthesis',
      'Explain how glucose from photosynthesis is used by plants',
    ],
    prerequisites: ['biology-cell-structure'],
    vocabulary: ['photosynthesis', 'chlorophyll', 'glucose', 'stomata', 'limiting factor', 'carbon dioxide', 'light intensity'],
    misconceptions: [
      'Thinking plants respire only at night and photosynthesise only during the day',
      'Believing photosynthesis only occurs in leaves',
    ],
  },

  {
    id: 'biology-respiration',
    name: 'Respiration',
    description: 'Aerobic and anaerobic respiration in cells',
    parentId: 'biology-main',
    subject: 'biology',
    examBoards: ['AQA', 'Edexcel', 'OCR'],
    tier: 'both',
    difficulty: 'grade-5-6',
    learningObjectives: [
      'Describe aerobic and anaerobic respiration',
      'Compare aerobic and anaerobic respiration',
      'Explain the importance of respiration',
      'Understand metabolism and metabolic reactions',
    ],
    prerequisites: ['biology-cell-structure'],
    vocabulary: ['aerobic respiration', 'anaerobic respiration', 'oxygen', 'glucose', 'ATP', 'lactic acid', 'fermentation', 'metabolism'],
    misconceptions: [
      'Confusing respiration with breathing',
      'Thinking anaerobic respiration only happens during exercise',
    ],
  },

  // ========================================
  // CHEMISTRY
  // ========================================
  {
    id: 'chemistry-main',
    name: 'Chemistry',
    description: 'The study of substances, their properties, composition, and reactions',
    parentId: null,
    subject: 'chemistry',
    examBoards: ['AQA', 'Edexcel', 'OCR'],
    tier: 'both',
    difficulty: 'grade-3-4',
    learningObjectives: [
      'Understand atomic structure and the periodic table',
      'Explain bonding, structure, and properties of matter',
      'Describe chemical reactions and energy changes',
      'Understand quantitative chemistry',
      'Explain rates of reaction and chemical analysis',
    ],
    prerequisites: [],
    metadata: {
      teachingHours: 35,
      examWeight: 33,
      ncReference: 'KS4-Chemistry',
    },
  },

  // Chemistry 1: Atomic Structure
  {
    id: 'chemistry-atomic-structure',
    name: 'Atomic Structure and the Periodic Table',
    description: 'Understanding atoms, elements, and the periodic table',
    parentId: 'chemistry-main',
    subject: 'chemistry',
    examBoards: ['AQA', 'Edexcel', 'OCR'],
    tier: 'both',
    difficulty: 'grade-3-4',
    learningObjectives: [
      'Describe the structure of an atom',
      'Explain what isotopes are',
      'Understand the development of the periodic table',
      'Describe the electronic structure of atoms',
      'Explain the properties of groups in the periodic table',
    ],
    prerequisites: [],
    vocabulary: ['atom', 'element', 'proton', 'neutron', 'electron', 'nucleus', 'mass number', 'atomic number', 'isotope', 'periodic table', 'group', 'period'],
    misconceptions: [
      'Thinking electrons orbit the nucleus like planets (electron cloud model is more accurate)',
      'Believing all atoms of an element are identical (isotopes exist)',
      'Confusing atomic number with mass number',
    ],
  },

  // Chemistry 2: Bonding
  {
    id: 'chemistry-bonding',
    name: 'Chemical Bonding',
    description: 'Ionic, covalent, and metallic bonding',
    parentId: 'chemistry-main',
    subject: 'chemistry',
    examBoards: ['AQA', 'Edexcel', 'OCR'],
    tier: 'both',
    difficulty: 'grade-5-6',
    learningObjectives: [
      'Describe ionic bonding and ionic compounds',
      'Describe covalent bonding and covalent structures',
      'Explain metallic bonding',
      'Relate properties of substances to their bonding and structure',
      'Draw dot and cross diagrams for simple molecules',
    ],
    prerequisites: ['chemistry-atomic-structure'],
    vocabulary: ['ionic bond', 'covalent bond', 'metallic bond', 'ion', 'molecule', 'compound', 'electrostatic force', 'lattice', 'delocalised electrons'],
    misconceptions: [
      'Thinking ionic compounds exist as molecules (they form giant lattices)',
      'Confusing atoms sharing electrons (covalent) with atoms transferring electrons (ionic)',
    ],
  },

  // Chemistry 3: Chemical Reactions
  {
    id: 'chemistry-chemical-reactions',
    name: 'Chemical Reactions',
    description: 'Types of reactions, equations, and energy changes',
    parentId: 'chemistry-main',
    subject: 'chemistry',
    examBoards: ['AQA', 'Edexcel', 'OCR'],
    tier: 'both',
    difficulty: 'grade-5-6',
    learningObjectives: [
      'Write word and symbol equations for reactions',
      'Balance chemical equations',
      'Describe oxidation and reduction',
      'Explain endothermic and exothermic reactions',
      'Calculate energy changes in reactions',
    ],
    prerequisites: ['chemistry-atomic-structure'],
    vocabulary: ['reactant', 'product', 'chemical equation', 'oxidation', 'reduction', 'redox', 'exothermic', 'endothermic', 'combustion', 'thermal decomposition'],
    misconceptions: [
      'Thinking atoms are created or destroyed in reactions (law of conservation of mass)',
      'Confusing exothermic (releases energy) with endothermic (absorbs energy)',
    ],
  },

  {
    id: 'chemistry-rates-of-reaction',
    name: 'Rates of Reaction',
    description: 'Factors affecting the speed of chemical reactions',
    parentId: 'chemistry-main',
    subject: 'chemistry',
    examBoards: ['AQA', 'Edexcel', 'OCR'],
    tier: 'both',
    difficulty: 'grade-5-6',
    learningObjectives: [
      'Explain factors affecting rate of reaction (temperature, concentration, surface area, catalyst)',
      'Calculate mean rate of reaction from graphs',
      'Explain collision theory',
      'Understand activation energy',
      'Describe how catalysts work',
    ],
    prerequisites: ['chemistry-chemical-reactions'],
    vocabulary: ['rate of reaction', 'collision theory', 'activation energy', 'catalyst', 'surface area', 'concentration', 'temperature'],
    misconceptions: [
      'Thinking catalysts are used up in reactions (they are not)',
      'Believing increasing temperature always doubles the rate (depends on the reaction)',
    ],
  },

  // Chemistry 4: Quantitative Chemistry
  {
    id: 'chemistry-quantitative',
    name: 'Quantitative Chemistry',
    description: 'Chemical calculations involving mass, moles, and equations',
    parentId: 'chemistry-main',
    subject: 'chemistry',
    examBoards: ['AQA', 'Edexcel', 'OCR'],
    tier: 'both',
    difficulty: 'grade-7-8',
    learningObjectives: [
      'Calculate relative formula mass',
      'Use the mole concept to relate mass to number of particles',
      'Calculate percentage composition',
      'Use balanced equations to calculate reacting masses',
      'Calculate concentration and volumes in solution',
    ],
    prerequisites: ['chemistry-atomic-structure', 'chemistry-chemical-reactions'],
    vocabulary: ['relative atomic mass', 'relative formula mass', 'mole', 'Avogadro constant', 'molar mass', 'concentration', 'limiting reactant'],
    misconceptions: [
      'Confusing relative atomic mass with mass number',
      'Thinking moles are a type of particle (it\'s a counting unit)',
    ],
  },

  // ========================================
  // PHYSICS
  // ========================================
  {
    id: 'physics-main',
    name: 'Physics',
    description: 'The study of matter, energy, and their interactions',
    parentId: null,
    subject: 'physics',
    examBoards: ['AQA', 'Edexcel', 'OCR'],
    tier: 'both',
    difficulty: 'grade-3-4',
    learningObjectives: [
      'Understand forces and motion',
      'Explain energy transfers and conservation',
      'Describe waves and electromagnetic radiation',
      'Understand electricity and magnetism',
      'Explain atomic structure and radioactivity',
    ],
    prerequisites: [],
    metadata: {
      teachingHours: 35,
      examWeight: 34,
      ncReference: 'KS4-Physics',
    },
  },

  // Physics 1: Forces
  {
    id: 'physics-forces',
    name: 'Forces',
    description: 'Understanding forces, motion, and Newton\'s laws',
    parentId: 'physics-main',
    subject: 'physics',
    examBoards: ['AQA', 'Edexcel', 'OCR'],
    tier: 'both',
    difficulty: 'grade-5-6',
    learningObjectives: [
      'Describe different types of forces',
      'Calculate resultant forces',
      'Explain Newton\'s laws of motion',
      'Calculate weight, mass, and gravitational field strength',
      'Understand friction and air resistance',
    ],
    prerequisites: [],
    vocabulary: ['force', 'Newton', 'mass', 'weight', 'gravity', 'friction', 'resultant force', 'balanced forces', 'unbalanced forces', 'air resistance'],
    misconceptions: [
      'Confusing mass with weight',
      'Thinking objects need a force to keep moving at constant velocity (Newton\'s First Law)',
      'Believing heavier objects fall faster in a vacuum',
    ],
  },

  {
    id: 'physics-motion',
    name: 'Motion',
    description: 'Speed, velocity, acceleration, and distance-time graphs',
    parentId: 'physics-main',
    subject: 'physics',
    examBoards: ['AQA', 'Edexcel', 'OCR'],
    tier: 'both',
    difficulty: 'grade-5-6',
    learningObjectives: [
      'Calculate speed, distance, and time',
      'Describe the difference between speed and velocity',
      'Calculate acceleration',
      'Interpret distance-time and velocity-time graphs',
      'Apply equations of motion (Higher tier)',
    ],
    prerequisites: ['physics-forces'],
    vocabulary: ['speed', 'velocity', 'acceleration', 'displacement', 'distance-time graph', 'velocity-time graph', 'uniform motion'],
    misconceptions: [
      'Confusing speed with velocity (velocity has direction)',
      'Thinking acceleration always means speeding up (can be negative)',
    ],
  },

  // Physics 2: Energy
  {
    id: 'physics-energy-stores',
    name: 'Energy Stores and Transfers',
    description: 'Energy conservation and transfers between stores',
    parentId: 'physics-main',
    subject: 'physics',
    examBoards: ['AQA', 'Edexcel', 'OCR'],
    tier: 'both',
    difficulty: 'grade-5-6',
    learningObjectives: [
      'Describe different energy stores',
      'Explain energy transfers between stores',
      'Calculate kinetic and gravitational potential energy',
      'Apply the principle of conservation of energy',
      'Calculate work done and power',
    ],
    prerequisites: [],
    vocabulary: ['energy', 'kinetic energy', 'potential energy', 'chemical energy', 'thermal energy', 'elastic potential energy', 'work done', 'power', 'joule', 'watt'],
    misconceptions: [
      'Thinking energy is used up (it\'s transferred)',
      'Believing energy cannot be wasted (dissipated energy is less useful)',
    ],
  },

  {
    id: 'physics-energy-resources',
    name: 'Energy Resources',
    description: 'Renewable and non-renewable energy resources',
    parentId: 'physics-main',
    subject: 'physics',
    examBoards: ['AQA', 'Edexcel', 'OCR'],
    tier: 'both',
    difficulty: 'grade-3-4',
    learningObjectives: [
      'Compare renewable and non-renewable energy resources',
      'Evaluate environmental impacts of energy resources',
      'Describe how electricity is generated',
      'Understand energy efficiency',
    ],
    prerequisites: ['physics-energy-stores'],
    vocabulary: ['renewable', 'non-renewable', 'fossil fuels', 'solar', 'wind', 'hydroelectric', 'nuclear', 'biomass', 'geothermal', 'efficiency'],
  },

  // Physics 3: Electricity
  {
    id: 'physics-electricity-circuits',
    name: 'Electric Circuits',
    description: 'Current, voltage, resistance, and circuit components',
    parentId: 'physics-main',
    subject: 'physics',
    examBoards: ['AQA', 'Edexcel', 'OCR'],
    tier: 'both',
    difficulty: 'grade-5-6',
    learningObjectives: [
      'Describe current, voltage, and resistance',
      'Use and apply Ohm\'s Law',
      'Analyse series and parallel circuits',
      'Calculate power in electrical circuits',
      'Draw and interpret circuit diagrams',
    ],
    prerequisites: [],
    vocabulary: ['current', 'voltage', 'resistance', 'Ohm\'s Law', 'series circuit', 'parallel circuit', 'ammeter', 'voltmeter', 'power', 'energy transfer'],
    misconceptions: [
      'Thinking current is used up in circuits (it\'s the same everywhere in a series circuit)',
      'Confusing voltage with current',
      'Believing batteries store current (they provide potential difference)',
    ],
  },

  // Physics 4: Waves
  {
    id: 'physics-waves',
    name: 'Waves',
    description: 'Properties of waves, sound, and electromagnetic spectrum',
    parentId: 'physics-main',
    subject: 'physics',
    examBoards: ['AQA', 'Edexcel', 'OCR'],
    tier: 'both',
    difficulty: 'grade-5-6',
    learningObjectives: [
      'Describe transverse and longitudinal waves',
      'Calculate wave speed, frequency, and wavelength',
      'Explain reflection, refraction, and diffraction',
      'Describe the electromagnetic spectrum',
      'Explain uses and hazards of electromagnetic waves',
    ],
    prerequisites: [],
    vocabulary: ['wave', 'transverse', 'longitudinal', 'amplitude', 'wavelength', 'frequency', 'wave speed', 'electromagnetic spectrum', 'reflection', 'refraction'],
    misconceptions: [
      'Thinking all waves transfer matter (they transfer energy)',
      'Believing sound can travel through a vacuum',
    ],
  },

  // Physics 5: Radioactivity
  {
    id: 'physics-radioactivity',
    name: 'Radioactivity',
    description: 'Atomic structure, nuclear radiation, and radioactive decay',
    parentId: 'physics-main',
    subject: 'physics',
    examBoards: ['AQA', 'Edexcel', 'OCR'],
    tier: 'both',
    difficulty: 'grade-7-8',
    learningObjectives: [
      'Describe the structure of atoms',
      'Explain isotopes and radioactive decay',
      'Compare alpha, beta, and gamma radiation',
      'Understand half-life',
      'Evaluate uses and hazards of radioactivity',
    ],
    prerequisites: [],
    vocabulary: ['radioactivity', 'alpha radiation', 'beta radiation', 'gamma radiation', 'isotope', 'half-life', 'decay', 'nuclear fission', 'ionising radiation'],
    misconceptions: [
      'Thinking radioactive decay can be stopped or slowed down',
      'Believing radioactive materials glow in the dark',
      'Confusing ionising with contamination and irradiation',
    ],
  },
];

/**
 * Get all science topics combined
 */
export function getAllScienceTopics(): CurriculumTopic[] {
  return scienceTopics;
}

/**
 * Get topics by specific science subject
 */
export function getTopicsBySubject(subject: 'biology' | 'chemistry' | 'physics' | 'combined-science'): CurriculumTopic[] {
  return scienceTopics.filter(t => t.subject === subject);
}

/**
 * Get all top-level science topics (main subject areas)
 */
export function getTopLevelTopics(): CurriculumTopic[] {
  return scienceTopics.filter(t => t.parentId === null);
}

/**
 * Get all child topics of a parent topic
 */
export function getChildTopics(parentId: string): CurriculumTopic[] {
  return scienceTopics.filter(t => t.parentId === parentId);
}

/**
 * Get a science topic by ID
 */
export function getTopicById(id: string): CurriculumTopic | undefined {
  return scienceTopics.find(t => t.id === id);
}
