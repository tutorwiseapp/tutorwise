/**
 * Science Subject Module
 *
 * Domain logic for Science tutoring (Physics, Chemistry, Biology).
 */

import type { SubjectConfig, TopicCategory } from '../types';

// DSPy Engine
export {
  SCIENCE_SIGNATURES,
  SCIENCE_CONCEPT_EXPLAINER,
  SCIENCE_PRACTICAL_GUIDE,
  SCIENCE_CALCULATION_HELPER,
  SCIENCE_EQUATION_BALANCER,
  SCIENCE_DIAGRAM_EXPLAINER,
  getScienceSignature,
} from './engine';

export const scienceConfig: SubjectConfig = {
  subject: 'science',
  displayName: 'Science',
  description: 'Physics, Chemistry and Biology',
  levels: ['GCSE', 'A-Level', 'University'],
  examBoards: ['AQA', 'Edexcel', 'OCR', 'WJEC'],
  icon: '🔬',
  color: '#10B981',  // Green
};

// --- GCSE Science Topics (Placeholder) ---

export const GCSE_SCIENCE_TOPICS: TopicCategory[] = [
  {
    id: 'biology',
    name: 'Biology',
    topics: [
      {
        id: 'cells',
        name: 'Cell Biology',
        skills: ['identify cell structures', 'compare cell types', 'understand transport'],
        keyTerms: ['nucleus', 'mitochondria', 'cell membrane', 'osmosis', 'diffusion'],
      },
      {
        id: 'organisation',
        name: 'Organisation',
        skills: ['understand organ systems', 'explain digestion', 'understand circulation'],
        keyTerms: ['tissue', 'organ', 'enzyme', 'substrate'],
      },
      {
        id: 'infection',
        name: 'Infection and Response',
        skills: ['identify pathogens', 'explain immune response', 'understand vaccination'],
        keyTerms: ['pathogen', 'antibody', 'antigen', 'white blood cell'],
      },
      {
        id: 'bioenergetics',
        name: 'Bioenergetics',
        skills: ['explain photosynthesis', 'explain respiration', 'understand metabolism'],
        keyTerms: ['photosynthesis', 'respiration', 'ATP', 'glucose'],
        formulas: ['6CO_2 + 6H_2O → C_6H_{12}O_6 + 6O_2'],
      },
    ],
  },
  {
    id: 'chemistry',
    name: 'Chemistry',
    topics: [
      {
        id: 'atomic-structure',
        name: 'Atomic Structure',
        skills: ['describe atomic structure', 'understand isotopes', 'electronic configuration'],
        keyTerms: ['proton', 'neutron', 'electron', 'isotope', 'ion'],
      },
      {
        id: 'bonding',
        name: 'Bonding and Structure',
        skills: ['explain ionic bonding', 'explain covalent bonding', 'describe structures'],
        keyTerms: ['ionic', 'covalent', 'metallic', 'giant structure'],
      },
      {
        id: 'quantitative',
        name: 'Quantitative Chemistry',
        skills: ['calculate relative formula mass', 'balance equations', 'calculate moles'],
        keyTerms: ['mole', 'Avogadro', 'concentration', 'yield'],
        formulas: ['n = \\frac{m}{M_r}', 'c = \\frac{n}{V}'],
      },
      {
        id: 'reactions',
        name: 'Chemical Changes',
        skills: ['describe reactivity', 'understand electrolysis', 'explain oxidation/reduction'],
        keyTerms: ['oxidation', 'reduction', 'electrolyte', 'electrode'],
      },
    ],
  },
  {
    id: 'physics',
    name: 'Physics',
    topics: [
      {
        id: 'energy',
        name: 'Energy',
        skills: ['calculate energy transfers', 'understand efficiency', 'energy resources'],
        keyTerms: ['kinetic', 'potential', 'thermal', 'efficiency'],
        formulas: ['E_k = \\frac{1}{2}mv^2', 'E_p = mgh', 'P = \\frac{E}{t}'],
      },
      {
        id: 'electricity',
        name: 'Electricity',
        skills: ['calculate current/voltage/resistance', 'understand circuits', 'electrical safety'],
        keyTerms: ['current', 'voltage', 'resistance', 'power'],
        formulas: ['V = IR', 'P = IV', 'Q = It'],
      },
      {
        id: 'particles',
        name: 'Particle Model',
        skills: ['explain states of matter', 'understand density', 'internal energy'],
        keyTerms: ['density', 'specific heat capacity', 'latent heat'],
        formulas: ['ρ = \\frac{m}{V}', 'ΔE = mcΔθ'],
      },
      {
        id: 'forces',
        name: 'Forces',
        skills: ['calculate forces', 'understand motion', 'momentum'],
        keyTerms: ['Newton', 'acceleration', 'momentum', 'friction'],
        formulas: ['F = ma', 's = \\frac{(u+v)t}{2}', 'p = mv'],
      },
      {
        id: 'waves',
        name: 'Waves',
        skills: ['describe wave properties', 'understand electromagnetic spectrum', 'calculate wave speed'],
        keyTerms: ['wavelength', 'frequency', 'amplitude', 'reflection', 'refraction'],
        formulas: ['v = fλ'],
      },
    ],
  },
];
