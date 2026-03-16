/**
 * KS3 Science Curriculum Data
 *
 * Comprehensive topic taxonomy for Key Stage 3 Science (Years 7-9)
 * Based on the National Curriculum Programme of Study for Science.
 *
 * Structure:
 * - 3 disciplines: Biology, Chemistry, Physics
 * - ~25 topics across all disciplines
 * - Single tier (no exam board at KS3)
 *
 * @module sage/curriculum/data/ks3-science
 */

import type { CurriculumTopic } from '../types';

/**
 * KS3 Science Curriculum Topics
 */
export const ks3ScienceTopics: CurriculumTopic[] = [
  // ========================================
  // BIOLOGY (~8 topics)
  // ========================================
  {
    id: 'ks3-bio-cells-microscopy',
    name: 'Cells & Microscopy',
    description: 'Understanding cell structure, function and how to use microscopes to observe cells',
    parentId: null,
    subject: 'biology',
    examBoards: [],
    tier: 'single',
    level: 'KS3',
    difficulty: 'ks3-developing',
    learningObjectives: [
      'Identify the main structures in animal and plant cells and state their functions',
      'Use a light microscope to observe and draw cells',
      'Explain the differences between plant and animal cells',
      'Understand the hierarchy: cells, tissues, organs, organ systems, organisms',
    ],
    prerequisites: [],
    misconceptions: [
      'Thinking all cells look the same and have the same shape',
      'Believing plant cells do not have mitochondria because they photosynthesise',
      'Confusing magnification with resolution when using microscopes',
    ],
    vocabulary: ['cell', 'nucleus', 'cytoplasm', 'cell membrane', 'cell wall', 'chloroplast', 'vacuole', 'mitochondria', 'microscope', 'magnification'],
    metadata: {
      ncReference: 'KS3-Biology',
    },
  },

  {
    id: 'ks3-bio-reproduction',
    name: 'Reproduction (Human)',
    description: 'Human reproductive systems, puberty, fertilisation and the menstrual cycle',
    parentId: null,
    subject: 'biology',
    examBoards: [],
    tier: 'single',
    level: 'KS3',
    difficulty: 'ks3-developing',
    learningObjectives: [
      'Describe the structure and function of the male and female reproductive systems',
      'Explain the changes that occur during puberty',
      'Describe the process of fertilisation and implantation',
      'Outline the stages of pregnancy and fetal development',
    ],
    prerequisites: ['ks3-bio-cells-microscopy'],
    misconceptions: [
      'Thinking puberty happens at exactly the same age for everyone',
      'Confusing fertilisation with implantation',
      'Believing the menstrual cycle is always exactly 28 days',
    ],
    vocabulary: ['reproduction', 'fertilisation', 'puberty', 'ovulation', 'menstrual cycle', 'embryo', 'fetus', 'placenta', 'gamete', 'sperm', 'ovum'],
    metadata: {
      ncReference: 'KS3-Biology',
    },
  },

  {
    id: 'ks3-bio-health-disease-drugs',
    name: 'Health, Disease & Drugs',
    description: 'Understanding the causes and prevention of disease, and the effects of recreational drugs',
    parentId: null,
    subject: 'biology',
    examBoards: [],
    tier: 'single',
    level: 'KS3',
    difficulty: 'ks3-secure',
    learningObjectives: [
      'Describe the difference between communicable and non-communicable diseases',
      'Explain how bacteria and viruses cause illness',
      'Describe how the body defends itself against pathogens',
      'Understand the effects of recreational drugs, tobacco and alcohol on health',
      'Explain how vaccinations and antibiotics help fight disease',
    ],
    prerequisites: ['ks3-bio-cells-microscopy'],
    misconceptions: [
      'Thinking antibiotics work against viruses',
      'Believing all bacteria are harmful',
      'Confusing symptoms of disease with the pathogen itself',
    ],
    vocabulary: ['pathogen', 'bacteria', 'virus', 'communicable', 'non-communicable', 'antibiotic', 'vaccination', 'immune system', 'white blood cell'],
    metadata: {
      ncReference: 'KS3-Biology',
    },
  },

  {
    id: 'ks3-bio-photosynthesis',
    name: 'Photosynthesis',
    description: 'Understanding how plants produce food using light energy',
    parentId: null,
    subject: 'biology',
    examBoards: [],
    tier: 'single',
    level: 'KS3',
    difficulty: 'ks3-secure',
    learningObjectives: [
      'State the word equation for photosynthesis',
      'Identify where photosynthesis takes place in a plant cell',
      'Describe how leaves are adapted for photosynthesis',
      'Explain the factors that affect the rate of photosynthesis',
    ],
    prerequisites: ['ks3-bio-cells-microscopy'],
    misconceptions: [
      'Thinking plants get their food from the soil rather than making it through photosynthesis',
      'Believing plants only photosynthesise and do not respire',
      'Confusing photosynthesis with respiration',
    ],
    vocabulary: ['photosynthesis', 'chlorophyll', 'chloroplast', 'glucose', 'carbon dioxide', 'oxygen', 'light energy', 'stomata', 'palisade cell'],
    metadata: {
      ncReference: 'KS3-Biology',
    },
  },

  {
    id: 'ks3-bio-ecosystems-food-chains',
    name: 'Ecosystems & Food Chains',
    description: 'Understanding feeding relationships, energy transfer and interdependence in ecosystems',
    parentId: null,
    subject: 'biology',
    examBoards: [],
    tier: 'single',
    level: 'KS3',
    difficulty: 'ks3-secure',
    learningObjectives: [
      'Construct and interpret food chains and food webs',
      'Describe the roles of producers, consumers and decomposers',
      'Explain how changes in one population affect others in a food web',
      'Understand bioaccumulation and its impact on food chains',
      'Describe the importance of biodiversity in maintaining ecosystems',
    ],
    prerequisites: ['ks3-bio-photosynthesis'],
    misconceptions: [
      'Thinking arrows in food chains show what eats what rather than energy flow direction',
      'Believing all energy is passed from one trophic level to the next',
      'Thinking decomposers are not important in an ecosystem',
    ],
    vocabulary: ['ecosystem', 'food chain', 'food web', 'producer', 'consumer', 'predator', 'prey', 'decomposer', 'trophic level', 'bioaccumulation', 'biodiversity'],
    metadata: {
      ncReference: 'KS3-Biology',
    },
  },

  {
    id: 'ks3-bio-inheritance-genetics-intro',
    name: 'Inheritance & Genetics Intro',
    description: 'Introduction to DNA, genes, chromosomes and inheritance of characteristics',
    parentId: null,
    subject: 'biology',
    examBoards: [],
    tier: 'single',
    level: 'KS3',
    difficulty: 'ks3-extending',
    learningObjectives: [
      'Describe the relationship between DNA, genes and chromosomes',
      'Explain the difference between inherited and environmental variation',
      'Understand that offspring inherit genetic information from both parents',
      'Describe natural selection and how it leads to adaptation',
    ],
    prerequisites: ['ks3-bio-cells-microscopy', 'ks3-bio-reproduction'],
    misconceptions: [
      'Thinking acquired characteristics can be inherited (Lamarckism)',
      'Believing DNA and genes are different things rather than genes being sections of DNA',
      'Confusing variation with mutation',
    ],
    vocabulary: ['DNA', 'gene', 'chromosome', 'inheritance', 'variation', 'natural selection', 'adaptation', 'species', 'allele'],
    metadata: {
      ncReference: 'KS3-Biology',
    },
  },

  {
    id: 'ks3-bio-breathing-gas-exchange',
    name: 'Breathing & Gas Exchange',
    description: 'Understanding the respiratory system and gas exchange in the lungs',
    parentId: null,
    subject: 'biology',
    examBoards: [],
    tier: 'single',
    level: 'KS3',
    difficulty: 'ks3-secure',
    learningObjectives: [
      'Describe the structure and function of the human respiratory system',
      'Explain the mechanism of ventilation (breathing in and out)',
      'Describe how gas exchange occurs in the alveoli',
      'Explain how the lungs are adapted for efficient gas exchange',
    ],
    prerequisites: ['ks3-bio-cells-microscopy'],
    misconceptions: [
      'Thinking respiration means breathing rather than a cellular process',
      'Believing we breathe in pure oxygen and breathe out pure carbon dioxide',
      'Confusing the diaphragm moving down with breathing out',
    ],
    vocabulary: ['respiration', 'ventilation', 'trachea', 'bronchi', 'bronchioles', 'alveoli', 'diaphragm', 'intercostal muscles', 'gas exchange', 'diffusion'],
    metadata: {
      ncReference: 'KS3-Biology',
    },
  },

  {
    id: 'ks3-bio-digestion-nutrition',
    name: 'Digestion & Nutrition',
    description: 'Understanding the digestive system, nutrients and a balanced diet',
    parentId: null,
    subject: 'biology',
    examBoards: [],
    tier: 'single',
    level: 'KS3',
    difficulty: 'ks3-developing',
    learningObjectives: [
      'Identify the main food groups and their roles in the body',
      'Describe the structure and function of the human digestive system',
      'Explain the role of enzymes in digestion',
      'Understand how nutrients are absorbed in the small intestine',
      'Describe what constitutes a balanced diet and consequences of poor nutrition',
    ],
    prerequisites: ['ks3-bio-cells-microscopy'],
    misconceptions: [
      'Thinking digestion only happens in the stomach',
      'Believing all fats are unhealthy',
      'Confusing chemical digestion (enzymes) with physical digestion (chewing, churning)',
    ],
    vocabulary: ['digestion', 'enzyme', 'nutrient', 'carbohydrate', 'protein', 'lipid', 'vitamin', 'mineral', 'oesophagus', 'stomach', 'small intestine', 'large intestine', 'absorption'],
    metadata: {
      ncReference: 'KS3-Biology',
    },
  },

  // ========================================
  // CHEMISTRY (~8 topics)
  // ========================================
  {
    id: 'ks3-chem-atoms-elements-compounds',
    name: 'Atoms, Elements & Compounds',
    description: 'Understanding the particle model, elements, compounds and their representation',
    parentId: null,
    subject: 'chemistry',
    examBoards: [],
    tier: 'single',
    level: 'KS3',
    difficulty: 'ks3-developing',
    learningObjectives: [
      'Describe the structure of an atom in terms of protons, neutrons and electrons',
      'Explain the difference between elements, compounds and mixtures',
      'Use chemical symbols to represent elements',
      'Understand that compounds are formed when atoms of different elements bond together',
    ],
    prerequisites: [],
    misconceptions: [
      'Thinking atoms can be seen with a normal microscope',
      'Confusing compounds with mixtures',
      'Believing atoms are solid spheres with no internal structure',
    ],
    vocabulary: ['atom', 'element', 'compound', 'mixture', 'proton', 'neutron', 'electron', 'chemical symbol', 'molecule'],
    metadata: {
      ncReference: 'KS3-Chemistry',
    },
  },

  {
    id: 'ks3-chem-periodic-table-intro',
    name: 'Periodic Table Intro',
    description: 'Introduction to the periodic table, groups and periods',
    parentId: null,
    subject: 'chemistry',
    examBoards: [],
    tier: 'single',
    level: 'KS3',
    difficulty: 'ks3-secure',
    learningObjectives: [
      'Describe how elements are arranged in the periodic table by atomic number',
      'Explain what groups and periods represent',
      'Identify metals and non-metals from their position in the periodic table',
      'Describe the properties of Group 1, Group 7 and Group 0 elements',
    ],
    prerequisites: ['ks3-chem-atoms-elements-compounds'],
    misconceptions: [
      'Thinking the periodic table is arranged by atomic mass rather than atomic number',
      'Believing elements in the same period have similar properties rather than elements in the same group',
      'Confusing groups (columns) with periods (rows)',
    ],
    vocabulary: ['periodic table', 'group', 'period', 'atomic number', 'metal', 'non-metal', 'noble gas', 'halogen', 'alkali metal'],
    metadata: {
      ncReference: 'KS3-Chemistry',
    },
  },

  {
    id: 'ks3-chem-chemical-reactions-equations',
    name: 'Chemical Reactions & Equations',
    description: 'Understanding chemical changes, writing word equations and types of reactions',
    parentId: null,
    subject: 'chemistry',
    examBoards: [],
    tier: 'single',
    level: 'KS3',
    difficulty: 'ks3-secure',
    learningObjectives: [
      'Recognise the signs that a chemical reaction has taken place',
      'Write word equations for common chemical reactions',
      'Understand that mass is conserved in a chemical reaction',
      'Describe common types of reaction: combustion, thermal decomposition, oxidation',
      'Distinguish between exothermic and endothermic reactions',
    ],
    prerequisites: ['ks3-chem-atoms-elements-compounds'],
    misconceptions: [
      'Thinking mass is lost during combustion because the substance gets lighter',
      'Believing chemical reactions can be easily reversed by physical means',
      'Confusing dissolving (physical change) with a chemical reaction',
    ],
    vocabulary: ['reactant', 'product', 'word equation', 'conservation of mass', 'combustion', 'thermal decomposition', 'oxidation', 'exothermic', 'endothermic'],
    metadata: {
      ncReference: 'KS3-Chemistry',
    },
  },

  {
    id: 'ks3-chem-acids-alkalis-neutralisation',
    name: 'Acids, Alkalis & Neutralisation',
    description: 'Understanding the pH scale, indicators and neutralisation reactions',
    parentId: null,
    subject: 'chemistry',
    examBoards: [],
    tier: 'single',
    level: 'KS3',
    difficulty: 'ks3-secure',
    learningObjectives: [
      'Use the pH scale and indicators to classify substances as acidic, neutral or alkaline',
      'Describe the reactions of acids with metals, metal oxides and metal carbonates',
      'Write word equations for neutralisation reactions',
      'Explain everyday uses of neutralisation',
    ],
    prerequisites: ['ks3-chem-chemical-reactions-equations'],
    misconceptions: [
      'Thinking all acids are dangerous and corrosive (many are dilute and safe)',
      'Believing neutralisation always produces a pH of exactly 7',
      'Confusing alkalis with bases (all alkalis are bases but not all bases are alkalis)',
    ],
    vocabulary: ['acid', 'alkali', 'base', 'neutral', 'pH scale', 'indicator', 'universal indicator', 'neutralisation', 'salt', 'litmus'],
    metadata: {
      ncReference: 'KS3-Chemistry',
    },
  },

  {
    id: 'ks3-chem-earths-resources-recycling',
    name: "Earth's Resources & Recycling",
    description: 'Understanding natural resources, sustainability and the importance of recycling',
    parentId: null,
    subject: 'chemistry',
    examBoards: [],
    tier: 'single',
    level: 'KS3',
    difficulty: 'ks3-secure',
    learningObjectives: [
      'Describe the difference between renewable and non-renewable resources',
      'Explain the environmental impact of extracting and using natural resources',
      'Understand the carbon cycle and its importance',
      'Explain why recycling metals and other materials is important for sustainability',
    ],
    prerequisites: ['ks3-chem-atoms-elements-compounds'],
    misconceptions: [
      'Thinking recycling uses no energy at all',
      'Believing fossil fuels will last forever',
      'Confusing the carbon cycle with the water cycle',
    ],
    vocabulary: ['renewable', 'non-renewable', 'fossil fuel', 'sustainability', 'recycling', 'carbon cycle', 'greenhouse gas', 'climate change', 'ore'],
    metadata: {
      ncReference: 'KS3-Chemistry',
    },
  },

  {
    id: 'ks3-chem-states-of-matter-particles',
    name: 'States of Matter & Particle Model',
    description: 'Understanding solids, liquids, gases and changes of state using the particle model',
    parentId: null,
    subject: 'chemistry',
    examBoards: [],
    tier: 'single',
    level: 'KS3',
    difficulty: 'ks3-developing',
    learningObjectives: [
      'Describe the arrangement, movement and energy of particles in solids, liquids and gases',
      'Use the particle model to explain changes of state',
      'Interpret heating and cooling curves',
      'Explain the concepts of diffusion and gas pressure using the particle model',
    ],
    prerequisites: [],
    misconceptions: [
      'Thinking particles themselves expand when heated rather than moving further apart',
      'Believing there is air between particles in a liquid',
      'Thinking particles stop moving in a solid',
    ],
    vocabulary: ['solid', 'liquid', 'gas', 'particle', 'melting', 'boiling', 'evaporation', 'condensation', 'freezing', 'sublimation', 'diffusion'],
    metadata: {
      ncReference: 'KS3-Chemistry',
    },
  },

  {
    id: 'ks3-chem-separating-mixtures',
    name: 'Separating Mixtures',
    description: 'Techniques for separating mixtures including filtration, distillation and chromatography',
    parentId: null,
    subject: 'chemistry',
    examBoards: [],
    tier: 'single',
    level: 'KS3',
    difficulty: 'ks3-secure',
    learningObjectives: [
      'Describe and explain filtration, evaporation and crystallisation',
      'Explain how simple and fractional distillation work',
      'Use chromatography to separate and identify substances',
      'Choose the appropriate separation technique for a given mixture',
    ],
    prerequisites: ['ks3-chem-states-of-matter-particles', 'ks3-chem-atoms-elements-compounds'],
    misconceptions: [
      'Thinking filtering can separate dissolved substances from a solution',
      'Confusing simple distillation with fractional distillation',
      'Believing chromatography only works with ink',
    ],
    vocabulary: ['filtration', 'evaporation', 'crystallisation', 'distillation', 'fractional distillation', 'chromatography', 'solute', 'solvent', 'solution', 'residue', 'filtrate'],
    metadata: {
      ncReference: 'KS3-Chemistry',
    },
  },

  {
    id: 'ks3-chem-metals-reactivity',
    name: 'Metals & Reactivity',
    description: 'Understanding metal properties, the reactivity series and displacement reactions',
    parentId: null,
    subject: 'chemistry',
    examBoards: [],
    tier: 'single',
    level: 'KS3',
    difficulty: 'ks3-secure',
    learningObjectives: [
      'Describe the general physical properties of metals',
      'Place metals in order of reactivity based on their reactions with water and acids',
      'Predict and explain displacement reactions using the reactivity series',
      'Describe how metals are extracted from ores and relate the method to their reactivity',
    ],
    prerequisites: ['ks3-chem-chemical-reactions-equations', 'ks3-chem-acids-alkalis-neutralisation'],
    misconceptions: [
      'Thinking all metals react with water',
      'Believing gold is reactive because it is valuable',
      'Confusing oxidation with rusting as if they are different processes',
    ],
    vocabulary: ['reactivity series', 'displacement', 'oxidation', 'reduction', 'ore', 'extraction', 'corrosion', 'alloy'],
    metadata: {
      ncReference: 'KS3-Chemistry',
    },
  },

  // ========================================
  // PHYSICS (~9 topics)
  // ========================================
  {
    id: 'ks3-phys-forces-motion',
    name: 'Forces & Motion',
    description: 'Understanding different types of forces and their effects on objects',
    parentId: null,
    subject: 'physics',
    examBoards: [],
    tier: 'single',
    level: 'KS3',
    difficulty: 'ks3-developing',
    learningObjectives: [
      'Identify and describe common contact and non-contact forces',
      'Draw and interpret free body diagrams showing forces acting on an object',
      'Explain the effect of balanced and unbalanced forces on the motion of an object',
      'Describe friction, air resistance and water resistance as resistive forces',
    ],
    prerequisites: [],
    misconceptions: [
      'Thinking a moving object must have a force acting on it in the direction of motion',
      'Believing heavier objects always fall faster than lighter ones',
      'Confusing mass with weight',
    ],
    vocabulary: ['force', 'Newton', 'contact force', 'non-contact force', 'friction', 'air resistance', 'gravity', 'balanced', 'unbalanced', 'resultant force'],
    metadata: {
      ncReference: 'KS3-Physics',
    },
  },

  {
    id: 'ks3-phys-speed-distance-time',
    name: 'Speed, Distance & Time',
    description: 'Calculating speed and interpreting distance-time graphs',
    parentId: null,
    subject: 'physics',
    examBoards: [],
    tier: 'single',
    level: 'KS3',
    difficulty: 'ks3-secure',
    learningObjectives: [
      'Use the equation speed = distance / time to calculate speed, distance or time',
      'Convert between common units of speed (m/s, km/h)',
      'Plot and interpret distance-time graphs',
      'Identify when an object is stationary, moving at constant speed or accelerating from a graph',
    ],
    prerequisites: ['ks3-phys-forces-motion'],
    misconceptions: [
      'Confusing speed with velocity (velocity has direction)',
      'Thinking a horizontal line on a distance-time graph means the object has disappeared',
      'Reading the wrong axis when interpreting distance-time graphs',
    ],
    vocabulary: ['speed', 'distance', 'time', 'velocity', 'acceleration', 'constant speed', 'distance-time graph', 'gradient'],
    metadata: {
      ncReference: 'KS3-Physics',
    },
  },

  {
    id: 'ks3-phys-energy-stores-transfers',
    name: 'Energy Stores & Transfers',
    description: 'Understanding energy stores, energy transfers and conservation of energy',
    parentId: null,
    subject: 'physics',
    examBoards: [],
    tier: 'single',
    level: 'KS3',
    difficulty: 'ks3-developing',
    learningObjectives: [
      'Identify the main energy stores: kinetic, gravitational potential, elastic, thermal, chemical, nuclear, magnetic, electrostatic',
      'Describe energy transfers between stores using pathways: mechanical, electrical, heating, radiation',
      'Understand and apply the principle of conservation of energy',
      'Calculate efficiency and understand why no energy transfer is 100% efficient',
    ],
    prerequisites: [],
    misconceptions: [
      'Thinking energy is used up or destroyed rather than transferred',
      'Confusing energy stores with energy transfer pathways',
      'Believing renewable energy sources create energy from nothing',
    ],
    vocabulary: ['energy store', 'energy transfer', 'kinetic energy', 'gravitational potential energy', 'thermal energy', 'chemical energy', 'conservation of energy', 'efficiency', 'dissipated'],
    metadata: {
      ncReference: 'KS3-Physics',
    },
  },

  {
    id: 'ks3-phys-waves-sound',
    name: 'Waves & Sound',
    description: 'Understanding wave properties and how sound travels',
    parentId: null,
    subject: 'physics',
    examBoards: [],
    tier: 'single',
    level: 'KS3',
    difficulty: 'ks3-secure',
    learningObjectives: [
      'Describe the difference between transverse and longitudinal waves',
      'Label wave features: amplitude, wavelength, frequency and period',
      'Explain how sound is produced by vibrations and travels through a medium',
      'Relate pitch to frequency and volume to amplitude',
      'Understand that sound cannot travel through a vacuum',
    ],
    prerequisites: ['ks3-phys-energy-stores-transfers'],
    misconceptions: [
      'Thinking sound can travel through space (a vacuum)',
      'Believing louder sounds travel faster than quieter sounds',
      'Confusing amplitude with wavelength',
    ],
    vocabulary: ['wave', 'transverse', 'longitudinal', 'amplitude', 'wavelength', 'frequency', 'period', 'vibration', 'medium', 'vacuum', 'pitch', 'echo'],
    metadata: {
      ncReference: 'KS3-Physics',
    },
  },

  {
    id: 'ks3-phys-light-colour',
    name: 'Light & Colour',
    description: 'Understanding how light travels, reflects, refracts and how we see colour',
    parentId: null,
    subject: 'physics',
    examBoards: [],
    tier: 'single',
    level: 'KS3',
    difficulty: 'ks3-secure',
    learningObjectives: [
      'Describe light as travelling in straight lines and explain how shadows form',
      'Draw ray diagrams for reflection and state the law of reflection',
      'Describe and explain refraction of light as it passes between different media',
      'Explain how white light is dispersed into a spectrum by a prism',
      'Describe how objects appear coloured due to absorption and reflection of light',
    ],
    prerequisites: ['ks3-phys-waves-sound'],
    misconceptions: [
      'Thinking we see objects because light travels from our eyes to the object',
      'Believing coloured objects produce their own coloured light',
      'Confusing reflection with refraction',
    ],
    vocabulary: ['light', 'ray', 'reflection', 'refraction', 'spectrum', 'dispersion', 'prism', 'normal line', 'angle of incidence', 'angle of reflection', 'transparent', 'translucent', 'opaque'],
    metadata: {
      ncReference: 'KS3-Physics',
    },
  },

  {
    id: 'ks3-phys-electricity-circuits',
    name: 'Electricity & Circuits',
    description: 'Understanding electric circuits, current, voltage and resistance',
    parentId: null,
    subject: 'physics',
    examBoards: [],
    tier: 'single',
    level: 'KS3',
    difficulty: 'ks3-secure',
    learningObjectives: [
      'Draw and interpret circuit diagrams using standard symbols',
      'Describe the difference between series and parallel circuits',
      'Explain current as the flow of charge and measure it using an ammeter',
      'Explain voltage as the energy transferred and measure it using a voltmeter',
      'Understand that resistance opposes the flow of current',
    ],
    prerequisites: ['ks3-phys-energy-stores-transfers'],
    misconceptions: [
      'Thinking current is used up as it flows around a circuit',
      'Believing a single wire is enough to make a bulb light',
      'Confusing current with voltage',
    ],
    vocabulary: ['current', 'voltage', 'resistance', 'circuit', 'series', 'parallel', 'ammeter', 'voltmeter', 'conductor', 'insulator', 'charge', 'component'],
    metadata: {
      ncReference: 'KS3-Physics',
    },
  },

  {
    id: 'ks3-phys-magnets-electromagnets',
    name: 'Magnets & Electromagnets',
    description: 'Understanding magnetic fields, permanent magnets and electromagnets',
    parentId: null,
    subject: 'physics',
    examBoards: [],
    tier: 'single',
    level: 'KS3',
    difficulty: 'ks3-secure',
    learningObjectives: [
      'Describe the properties of magnets and identify magnetic materials',
      'Draw and interpret magnetic field patterns around bar magnets',
      'Explain how an electromagnet works and how to change its strength',
      'Describe everyday uses of permanent magnets and electromagnets',
    ],
    prerequisites: ['ks3-phys-electricity-circuits'],
    misconceptions: [
      'Thinking all metals are magnetic',
      'Believing the north pole of a compass points to the geographic North Pole (it points to the magnetic north)',
      'Confusing magnetic materials with magnets',
    ],
    vocabulary: ['magnet', 'magnetic field', 'north pole', 'south pole', 'attract', 'repel', 'electromagnet', 'solenoid', 'compass', 'magnetic material', 'iron', 'steel'],
    metadata: {
      ncReference: 'KS3-Physics',
    },
  },

  {
    id: 'ks3-phys-earth-space',
    name: 'Earth & Space',
    description: 'Understanding the solar system, seasons, day and night and the life cycle of stars',
    parentId: null,
    subject: 'physics',
    examBoards: [],
    tier: 'single',
    level: 'KS3',
    difficulty: 'ks3-developing',
    learningObjectives: [
      'Describe the structure of the solar system and the relative sizes of planets',
      'Explain how day and night and the seasons are caused by Earth\'s rotation and tilt',
      'Describe the phases of the Moon and how eclipses occur',
      'Explain gravity as the force that keeps planets in orbit',
    ],
    prerequisites: [],
    misconceptions: [
      'Thinking seasons are caused by Earth being closer to the Sun in summer',
      'Believing the Moon produces its own light',
      'Thinking stars and planets are the same thing',
    ],
    vocabulary: ['solar system', 'planet', 'orbit', 'star', 'galaxy', 'gravity', 'axis', 'rotation', 'revolution', 'eclipse', 'satellite'],
    metadata: {
      ncReference: 'KS3-Physics',
    },
  },

  {
    id: 'ks3-phys-pressure-fluids',
    name: 'Pressure in Fluids',
    description: 'Understanding pressure in solids, liquids and gases',
    parentId: null,
    subject: 'physics',
    examBoards: [],
    tier: 'single',
    level: 'KS3',
    difficulty: 'ks3-extending',
    learningObjectives: [
      'Calculate pressure using pressure = force / area',
      'Explain why pressure increases with depth in a liquid',
      'Describe how atmospheric pressure changes with altitude',
      'Explain everyday applications of pressure such as hydraulics and syringes',
    ],
    prerequisites: ['ks3-phys-forces-motion'],
    misconceptions: [
      'Confusing pressure with force (pressure depends on area as well as force)',
      'Thinking pressure in a liquid only acts downward rather than in all directions',
      'Believing the atmosphere has no weight or pressure',
    ],
    vocabulary: ['pressure', 'Pascal', 'force', 'area', 'atmospheric pressure', 'hydraulic', 'fluid', 'upthrust', 'depth'],
    metadata: {
      ncReference: 'KS3-Physics',
    },
  },
];
