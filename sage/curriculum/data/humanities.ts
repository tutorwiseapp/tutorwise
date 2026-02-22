/**
 * GCSE Humanities Curriculum Data
 *
 * Comprehensive topic taxonomy for GCSE History and Geography
 * Based on standard specifications common across AQA, Edexcel, and OCR.
 *
 * Structure:
 * - History: British, Modern World, and Thematic topics
 * - Geography: Physical, Human, and Environmental topics
 *
 * @module sage/curriculum/data/humanities
 */

import type { CurriculumTopic } from '../types';

/**
 * GCSE Humanities Curriculum Topics
 */
export const humanitiesTopics: CurriculumTopic[] = [
  // ========================================
  // HISTORY
  // ========================================
  {
    id: 'history-main',
    name: 'History',
    description: 'The study of past events, societies, and how they shape the present',
    parentId: null,
    subject: 'history',
    examBoards: ['AQA', 'Edexcel', 'OCR'],
    tier: 'both',
    difficulty: 'grade-3-4',
    learningObjectives: [
      'Understand key periods in British and world history',
      'Analyse historical sources and evidence',
      'Explain causes and consequences of historical events',
      'Evaluate interpretations of history',
      'Demonstrate chronological understanding',
    ],
    prerequisites: [],
    metadata: {
      teachingHours: 40,
      examWeight: 100,
      ncReference: 'KS4-History',
    },
  },

  // History 1: Medicine Through Time
  {
    id: 'history-medicine-medieval',
    name: 'Medieval Medicine (c1250-c1500)',
    description: 'Medical knowledge and treatment in medieval England',
    parentId: 'history-main',
    subject: 'history',
    examBoards: ['AQA', 'Edexcel', 'OCR'],
    tier: 'both',
    difficulty: 'grade-5-6',
    learningObjectives: [
      'Describe medieval ideas about causes of disease',
      'Explain the role of the Church in medieval medicine',
      'Evaluate the Theory of the Four Humours',
      'Describe medieval treatments and their effectiveness',
      'Understand the impact of the Black Death',
    ],
    prerequisites: [],
    vocabulary: ['Four Humours', 'miasma', 'astrology', 'bloodletting', 'purging', 'Black Death', 'bubonic plague', 'flagellants', 'supernatural'],
    misconceptions: [
      'Thinking medieval people had no medical knowledge',
      'Believing the Church completely stopped medical progress',
    ],
  },

  {
    id: 'history-medicine-renaissance',
    name: 'Renaissance Medicine (c1500-c1700)',
    description: 'Medical developments during the Renaissance',
    parentId: 'history-main',
    subject: 'history',
    examBoards: ['AQA', 'Edexcel', 'OCR'],
    tier: 'both',
    difficulty: 'grade-5-6',
    learningObjectives: [
      'Explain Vesalius\' contribution to anatomy',
      'Describe Harvey\'s discovery of blood circulation',
      'Evaluate the impact of the printing press on medicine',
      'Understand why progress was slow despite new discoveries',
    ],
    prerequisites: ['history-medicine-medieval'],
    vocabulary: ['Andreas Vesalius', 'William Harvey', 'anatomy', 'dissection', 'circulation', 'printing press', 'Renaissance'],
  },

  {
    id: 'history-medicine-industrial',
    name: 'Industrial Revolution Medicine (c1700-c1900)',
    description: 'Medical breakthroughs in the 18th and 19th centuries',
    parentId: 'history-main',
    subject: 'history',
    examBoards: ['AQA', 'Edexcel', 'OCR'],
    tier: 'both',
    difficulty: 'grade-5-6',
    learningObjectives: [
      'Explain Jenner\'s development of vaccination',
      'Describe Pasteur\'s Germ Theory',
      'Evaluate Koch\'s work on identifying bacteria',
      'Understand the fight against cholera',
      'Analyse the development of anaesthetics and antiseptics',
    ],
    prerequisites: ['history-medicine-renaissance'],
    vocabulary: ['Edward Jenner', 'vaccination', 'Louis Pasteur', 'Germ Theory', 'Robert Koch', 'bacteria', 'cholera', 'anaesthetic', 'chloroform', 'antiseptic', 'Joseph Lister', 'carbolic acid'],
    misconceptions: [
      'Thinking Germ Theory was immediately accepted (it faced resistance)',
      'Believing anaesthetics immediately improved surgery success rates (infection was still a major problem)',
    ],
  },

  {
    id: 'history-medicine-modern',
    name: 'Modern Medicine (c1900-present)',
    description: 'Twentieth century medical advances',
    parentId: 'history-main',
    subject: 'history',
    examBoards: ['AQA', 'Edexcel', 'OCR'],
    tier: 'both',
    difficulty: 'grade-5-6',
    learningObjectives: [
      'Explain the discovery of penicillin by Fleming',
      'Describe the development of the NHS',
      'Evaluate medical advances in the 20th century',
      'Understand modern treatments like transplants and keyhole surgery',
    ],
    prerequisites: ['history-medicine-industrial'],
    vocabulary: ['Alexander Fleming', 'penicillin', 'antibiotics', 'NHS', 'National Health Service', 'Beveridge Report', 'welfare state', 'transplant surgery', 'DNA'],
  },

  // History 2: Conflict and Tension
  {
    id: 'history-ww1-causes',
    name: 'Causes of World War I',
    description: 'Long-term and short-term causes of the First World War',
    parentId: 'history-main',
    subject: 'history',
    examBoards: ['AQA', 'Edexcel', 'OCR'],
    tier: 'both',
    difficulty: 'grade-5-6',
    learningObjectives: [
      'Explain the alliance system before 1914',
      'Describe the arms race and militarism',
      'Understand imperialism and colonial rivalry',
      'Analyse the impact of the assassination of Archduke Franz Ferdinand',
      'Evaluate which causes were most significant',
    ],
    prerequisites: [],
    vocabulary: ['alliance', 'Triple Entente', 'Triple Alliance', 'arms race', 'militarism', 'imperialism', 'nationalism', 'Archduke Franz Ferdinand', 'assassination', 'Sarajevo'],
    misconceptions: [
      'Thinking WWI started only because of the assassination (it was a trigger, not the only cause)',
      'Believing all European countries wanted war',
    ],
  },

  {
    id: 'history-ww1-events',
    name: 'Key Events of World War I',
    description: 'Major battles, strategies, and turning points of WWI',
    parentId: 'history-main',
    subject: 'history',
    examBoards: ['AQA', 'Edexcel', 'OCR'],
    tier: 'both',
    difficulty: 'grade-5-6',
    learningObjectives: [
      'Describe trench warfare on the Western Front',
      'Explain the significance of the Battle of the Somme',
      'Understand the impact of new technologies',
      'Analyse why the war became a stalemate',
      'Evaluate the impact of America entering the war',
    ],
    prerequisites: ['history-ww1-causes'],
    vocabulary: ['Western Front', 'trench warfare', 'Somme', 'Verdun', 'stalemate', 'attrition', 'U-boat', 'Lusitania', 'tank', 'poison gas', 'armistice'],
  },

  {
    id: 'history-treaty-versailles',
    name: 'Treaty of Versailles',
    description: 'The peace settlement after World War I',
    parentId: 'history-main',
    subject: 'history',
    examBoards: ['AQA', 'Edexcel', 'OCR'],
    tier: 'both',
    difficulty: 'grade-5-6',
    learningObjectives: [
      'Describe the aims of the "Big Three" at Versailles',
      'Explain the main terms of the Treaty',
      'Evaluate reactions to the Treaty in Germany',
      'Understand the weaknesses of the League of Nations',
    ],
    prerequisites: ['history-ww1-events'],
    vocabulary: ['Treaty of Versailles', 'Big Three', 'Woodrow Wilson', 'Clemenceau', 'Lloyd George', 'reparations', 'War Guilt Clause', 'League of Nations', 'diktat'],
    misconceptions: [
      'Thinking all countries were happy with the Treaty (Germany felt humiliated)',
      'Believing the Treaty prevented future conflicts (it contributed to WWII)',
    ],
  },

  // History 3: Nazi Germany
  {
    id: 'history-weimar-republic',
    name: 'Weimar Republic',
    description: 'Germany 1919-1933: democracy and instability',
    parentId: 'history-main',
    subject: 'history',
    examBoards: ['AQA', 'Edexcel', 'OCR'],
    tier: 'both',
    difficulty: 'grade-5-6',
    learningObjectives: [
      'Explain the challenges facing the Weimar Republic',
      'Describe the hyperinflation crisis of 1923',
      'Understand the recovery period 1924-1929',
      'Analyse the impact of the Great Depression on Germany',
    ],
    prerequisites: ['history-treaty-versailles'],
    vocabulary: ['Weimar Republic', 'hyperinflation', 'Ruhr crisis', 'Dawes Plan', 'Young Plan', 'Great Depression', 'unemployment'],
  },

  {
    id: 'history-hitler-rise',
    name: 'Hitler\'s Rise to Power',
    description: 'How the Nazi Party came to power 1919-1933',
    parentId: 'history-main',
    subject: 'history',
    examBoards: ['AQA', 'Edexcel', 'OCR'],
    tier: 'both',
    difficulty: 'grade-5-6',
    learningObjectives: [
      'Explain how Hitler became leader of the Nazi Party',
      'Describe Nazi methods of gaining support',
      'Analyse the Munich Putsch and its consequences',
      'Understand how Hitler became Chancellor in 1933',
    ],
    prerequisites: ['history-weimar-republic'],
    vocabulary: ['Adolf Hitler', 'Nazi Party', 'NSDAP', 'Munich Putsch', 'Mein Kampf', 'propaganda', 'SA', 'SS', 'Enabling Act', 'Reichstag Fire'],
    misconceptions: [
      'Thinking Hitler was elected with a majority (Nazis never won >50% in free elections)',
      'Believing all Germans supported Hitler',
    ],
  },

  {
    id: 'history-nazi-control',
    name: 'Nazi Control and Dictatorship',
    description: 'How the Nazis controlled Germany 1933-1945',
    parentId: 'history-main',
    subject: 'history',
    examBoards: ['AQA', 'Edexcel', 'OCR'],
    tier: 'both',
    difficulty: 'grade-7-8',
    learningObjectives: [
      'Explain how the Nazis created a totalitarian state',
      'Describe Nazi policies towards young people',
      'Analyse Nazi racial ideology and persecution',
      'Understand opposition to the Nazis',
      'Evaluate the effectiveness of Nazi propaganda',
    ],
    prerequisites: ['history-hitler-rise'],
    vocabulary: ['totalitarian', 'Gestapo', 'concentration camp', 'Hitler Youth', 'propaganda', 'Joseph Goebbels', 'persecution', 'Kristallnacht', 'Aryan', 'anti-Semitism'],
  },

  // ========================================
  // GEOGRAPHY
  // ========================================
  {
    id: 'geography-main',
    name: 'Geography',
    description: 'The study of places, environments, and the relationship between people and their environments',
    parentId: null,
    subject: 'geography',
    examBoards: ['AQA', 'Edexcel', 'OCR'],
    tier: 'both',
    difficulty: 'grade-3-4',
    learningObjectives: [
      'Understand physical geography processes',
      'Explain human geography patterns and processes',
      'Analyse environmental issues and sustainability',
      'Use geographical skills and fieldwork',
      'Evaluate case studies from around the world',
    ],
    prerequisites: [],
    metadata: {
      teachingHours: 40,
      examWeight: 100,
      ncReference: 'KS4-Geography',
    },
  },

  // Geography 1: Physical Landscapes
  {
    id: 'geography-rivers',
    name: 'River Landscapes',
    description: 'Processes and landforms in river environments',
    parentId: 'geography-main',
    subject: 'geography',
    examBoards: ['AQA', 'Edexcel', 'OCR'],
    tier: 'both',
    difficulty: 'grade-5-6',
    learningObjectives: [
      'Describe the long profile of a river',
      'Explain erosion, transportation, and deposition processes',
      'Identify and explain river landforms (waterfalls, meanders, oxbow lakes)',
      'Understand flood management strategies',
      'Evaluate river management case studies',
    ],
    prerequisites: [],
    vocabulary: ['erosion', 'hydraulic action', 'abrasion', 'attrition', 'solution', 'transportation', 'deposition', 'waterfall', 'gorge', 'meander', 'oxbow lake', 'floodplain', 'levee', 'flood'],
    misconceptions: [
      'Thinking rivers only erode (they also transport and deposit)',
      'Believing meanders only form in flat areas',
    ],
  },

  {
    id: 'geography-coasts',
    name: 'Coastal Landscapes',
    description: 'Processes and landforms in coastal environments',
    parentId: 'geography-main',
    subject: 'geography',
    examBoards: ['AQA', 'Edexcel', 'OCR'],
    tier: 'both',
    difficulty: 'grade-5-6',
    learningObjectives: [
      'Explain coastal erosion processes',
      'Describe landforms of erosion (cliffs, wave-cut platforms, caves, arches, stacks)',
      'Describe landforms of deposition (beaches, spits, bars)',
      'Understand coastal management strategies',
      'Evaluate coastal management case studies',
    ],
    prerequisites: [],
    vocabulary: ['wave', 'fetch', 'constructive wave', 'destructive wave', 'longshore drift', 'cliff', 'wave-cut platform', 'headland', 'bay', 'cave', 'arch', 'stack', 'beach', 'spit', 'sea wall', 'groyne'],
    misconceptions: [
      'Thinking all waves erode (constructive waves build beaches)',
      'Believing coastal management always works perfectly',
    ],
  },

  {
    id: 'geography-glacial',
    name: 'Glacial Landscapes',
    description: 'Processes and landforms in glaciated areas',
    parentId: 'geography-main',
    subject: 'geography',
    examBoards: ['AQA', 'Edexcel', 'OCR'],
    tier: 'both',
    difficulty: 'grade-7-8',
    learningObjectives: [
      'Explain glacial erosion processes',
      'Describe glacial landforms (U-shaped valleys, corries, arêtes)',
      'Understand glacial deposition features',
      'Evaluate economic activities in glaciated areas',
    ],
    prerequisites: [],
    vocabulary: ['glacier', 'ice sheet', 'glaciation', 'plucking', 'abrasion', 'freeze-thaw', 'U-shaped valley', 'corrie', 'arête', 'pyramidal peak', 'moraine', 'drumlin', 'till'],
  },

  // Geography 2: Weather and Climate
  {
    id: 'geography-weather-hazards',
    name: 'Weather Hazards',
    description: 'Tropical storms, droughts, and extreme weather',
    parentId: 'geography-main',
    subject: 'geography',
    examBoards: ['AQA', 'Edexcel', 'OCR'],
    tier: 'both',
    difficulty: 'grade-5-6',
    learningObjectives: [
      'Explain global atmospheric circulation',
      'Describe how tropical storms form',
      'Analyse the impacts of tropical storms',
      'Understand weather hazards in the UK',
      'Evaluate responses to extreme weather events',
    ],
    prerequisites: [],
    vocabulary: ['atmospheric circulation', 'Hadley cell', 'tropical storm', 'hurricane', 'typhoon', 'cyclone', 'eye', 'storm surge', 'drought', 'heatwave', 'extreme weather'],
    misconceptions: [
      'Thinking hurricanes and typhoons are different phenomena (same storm, different names)',
      'Believing climate change causes all extreme weather (it makes some events more likely)',
    ],
  },

  {
    id: 'geography-climate-change',
    name: 'Climate Change',
    description: 'Evidence, causes, and impacts of climate change',
    parentId: 'geography-main',
    subject: 'geography',
    examBoards: ['AQA', 'Edexcel', 'OCR'],
    tier: 'both',
    difficulty: 'grade-7-8',
    learningObjectives: [
      'Explain evidence for climate change',
      'Describe natural and human causes of climate change',
      'Analyse impacts of climate change',
      'Evaluate strategies to manage climate change (mitigation and adaptation)',
    ],
    prerequisites: [],
    vocabulary: ['climate change', 'global warming', 'greenhouse gas', 'carbon dioxide', 'methane', 'ice core', 'sea level rise', 'mitigation', 'adaptation', 'carbon footprint', 'renewable energy'],
    misconceptions: [
      'Confusing weather with climate',
      'Thinking climate change means everywhere gets hotter (patterns are complex)',
    ],
  },

  // Geography 3: Urban Issues
  {
    id: 'geography-urbanisation',
    name: 'Urbanisation',
    description: 'Growth of cities and urban challenges',
    parentId: 'geography-main',
    subject: 'geography',
    examBoards: ['AQA', 'Edexcel', 'OCR'],
    tier: 'both',
    difficulty: 'grade-5-6',
    learningObjectives: [
      'Explain patterns of urbanisation globally',
      'Describe causes of urbanisation',
      'Understand challenges facing cities in LICs and NEEs',
      'Analyse urban growth in a named city',
      'Evaluate urban planning strategies',
    ],
    prerequisites: [],
    vocabulary: ['urbanisation', 'megacity', 'rural-urban migration', 'push factor', 'pull factor', 'squatter settlement', 'informal settlement', 'slum', 'infrastructure', 'urban sprawl'],
    misconceptions: [
      'Thinking all cities in developing countries are slums',
      'Believing urbanisation is always negative',
    ],
  },

  {
    id: 'geography-sustainable-cities',
    name: 'Sustainable Urban Living',
    description: 'Creating sustainable and liveable cities',
    parentId: 'geography-main',
    subject: 'geography',
    examBoards: ['AQA', 'Edexcel', 'OCR'],
    tier: 'both',
    difficulty: 'grade-5-6',
    learningObjectives: [
      'Explain features of sustainable cities',
      'Describe urban regeneration strategies',
      'Understand traffic management in cities',
      'Evaluate waste management and recycling',
      'Analyse green space provision',
    ],
    prerequisites: ['geography-urbanisation'],
    vocabulary: ['sustainability', 'regeneration', 'brownfield site', 'greenfield site', 'congestion', 'public transport', 'waste management', 'recycling', 'green space'],
  },

  // Geography 4: Economic Development
  {
    id: 'geography-development',
    name: 'Economic Development',
    description: 'Measuring and understanding global development',
    parentId: 'geography-main',
    subject: 'geography',
    examBoards: ['AQA', 'Edexcel', 'OCR'],
    tier: 'both',
    difficulty: 'grade-5-6',
    learningObjectives: [
      'Explain how development is measured (GNI, HDI, etc.)',
      'Describe patterns of global development',
      'Understand factors affecting development',
      'Analyse development strategies',
      'Evaluate aid and its effectiveness',
    ],
    prerequisites: [],
    vocabulary: ['development', 'GDP', 'GNI', 'HDI', 'birth rate', 'death rate', 'literacy rate', 'HIC', 'LIC', 'NEE', 'development gap', 'aid', 'trade', 'fair trade', 'debt relief'],
    misconceptions: [
      'Thinking GDP alone shows quality of life (HDI is more comprehensive)',
      'Believing all aid is helpful (can create dependency)',
    ],
  },

  // Geography 5: Resource Management
  {
    id: 'geography-resources-food',
    name: 'Food Security',
    description: 'Global patterns of food supply and demand',
    parentId: 'geography-main',
    subject: 'geography',
    examBoards: ['AQA', 'Edexcel', 'OCR'],
    tier: 'both',
    difficulty: 'grade-5-6',
    learningObjectives: [
      'Explain global patterns of food consumption',
      'Describe causes of food insecurity',
      'Understand impacts of food insecurity',
      'Evaluate strategies to increase food supply',
    ],
    prerequisites: [],
    vocabulary: ['food security', 'malnutrition', 'undernourishment', 'famine', 'irrigation', 'GM crops', 'organic farming', 'intensive farming', 'sustainable agriculture'],
  },

  {
    id: 'geography-resources-water',
    name: 'Water Security',
    description: 'Global patterns of water supply and demand',
    parentId: 'geography-main',
    subject: 'geography',
    examBoards: ['AQA', 'Edexcel', 'OCR'],
    tier: 'both',
    difficulty: 'grade-5-6',
    learningObjectives: [
      'Explain global patterns of water surplus and deficit',
      'Describe causes of water insecurity',
      'Understand impacts of water insecurity',
      'Evaluate strategies to increase water supply',
    ],
    prerequisites: [],
    vocabulary: ['water security', 'water stress', 'water scarcity', 'groundwater', 'aquifer', 'desalination', 'water transfer', 'reservoir', 'drought'],
  },

  {
    id: 'geography-resources-energy',
    name: 'Energy Security',
    description: 'Global patterns of energy supply and demand',
    parentId: 'geography-main',
    subject: 'geography',
    examBoards: ['AQA', 'Edexcel', 'OCR'],
    tier: 'both',
    difficulty: 'grade-5-6',
    learningObjectives: [
      'Explain global patterns of energy consumption',
      'Describe non-renewable and renewable energy sources',
      'Understand impacts of energy extraction and use',
      'Evaluate strategies for sustainable energy',
    ],
    prerequisites: [],
    vocabulary: ['energy security', 'fossil fuels', 'coal', 'oil', 'natural gas', 'renewable energy', 'solar', 'wind', 'hydroelectric', 'nuclear', 'fracking', 'carbon capture'],
  },
];

/**
 * Get all humanities topics combined
 */
export function getAllHumanitiesTopics(): CurriculumTopic[] {
  return humanitiesTopics;
}

/**
 * Get topics by specific humanities subject
 */
export function getTopicsBySubject(subject: 'history' | 'geography'): CurriculumTopic[] {
  return humanitiesTopics.filter(t => t.subject === subject);
}

/**
 * Get all top-level humanities topics (main subject areas)
 */
export function getTopLevelTopics(): CurriculumTopic[] {
  return humanitiesTopics.filter(t => t.parentId === null);
}

/**
 * Get all child topics of a parent topic
 */
export function getChildTopics(parentId: string): CurriculumTopic[] {
  return humanitiesTopics.filter(t => t.parentId === parentId);
}

/**
 * Get a humanities topic by ID
 */
export function getTopicById(id: string): CurriculumTopic | undefined {
  return humanitiesTopics.find(t => t.id === id);
}
