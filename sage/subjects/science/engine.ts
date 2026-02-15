/**
 * Science DSPy Engine
 *
 * Chain-of-Thought signatures for science tutoring.
 * Covers Physics, Chemistry, and Biology with practical focus.
 *
 * @module sage/subjects/science/engine
 */

import type { DSPySignature, DSPyExample } from '../maths/engine';

// --- Concept Explainer Signature ---

export const SCIENCE_CONCEPT_EXPLAINER: DSPySignature = {
  name: 'ScienceConceptExplainer',
  description: 'Explain scientific concepts with analogies and real-world examples',
  inputs: ['concept', 'subject_area', 'level', 'prior_knowledge'],
  outputs: ['explanation', 'analogy', 'real_world_example', 'common_misconceptions'],
  chainOfThought: true,
  examples: [
    {
      inputs: {
        concept: 'Osmosis',
        subject_area: 'biology',
        level: 'GCSE',
        prior_knowledge: 'understands diffusion',
      },
      outputs: {
        explanation: 'Osmosis is the movement of water molecules across a partially permeable membrane from an area of higher water concentration to lower water concentration.',
        analogy: 'Think of a crowded room with a door that only lets certain people through - water molecules move from the less crowded side to balance things out.',
        real_world_example: 'When you soak raisins in water, they swell up because water moves into the raisin cells by osmosis.',
        common_misconceptions: 'Osmosis is NOT just any movement of water - it specifically involves a partially permeable membrane.',
      },
      reasoning: 'Build on diffusion knowledge, use relatable analogy, address common exam mistakes.',
    },
  ],
};

// --- Practical Method Signature ---

export const SCIENCE_PRACTICAL_GUIDE: DSPySignature = {
  name: 'SciencePracticalGuide',
  description: 'Guide through required practicals with method, variables, and analysis',
  inputs: ['practical_name', 'subject_area', 'level', 'focus'],
  outputs: ['method_steps', 'variables', 'safety_points', 'analysis_guidance', 'exam_tips'],
  chainOfThought: true,
  examples: [
    {
      inputs: {
        practical_name: 'Investigating rate of reaction using marble chips and acid',
        subject_area: 'chemistry',
        level: 'GCSE',
        focus: 'full_method',
      },
      outputs: {
        method_steps: '1. Measure 50ml HCl into conical flask\n2. Place flask on balance, zero it\n3. Add marble chips, start timer\n4. Record mass every 30 seconds\n5. Plot mass lost vs time graph',
        variables: 'IV: Concentration of acid | DV: Mass lost over time | CV: Volume of acid, mass of chips, temperature',
        safety_points: 'Wear safety goggles, handle acid carefully, work in ventilated area',
        analysis_guidance: 'Steeper initial gradient = faster rate. Calculate rate from tangent at start.',
        exam_tips: 'Always state how you would make it a fair test. Mention repeat readings.',
      },
      reasoning: 'Required practical for GCSE Chemistry. Focus on variables identification for exam.',
    },
  ],
};

// --- Calculation Helper Signature ---

export const SCIENCE_CALCULATION_HELPER: DSPySignature = {
  name: 'ScienceCalculationHelper',
  description: 'Guide through physics/chemistry calculations with formula selection and units',
  inputs: ['question', 'subject_area', 'level', 'given_values'],
  outputs: ['formula_needed', 'working_steps', 'answer_with_units', 'common_errors'],
  chainOfThought: true,
  examples: [
    {
      inputs: {
        question: 'A car travels 150m in 10 seconds. Calculate its speed.',
        subject_area: 'physics',
        level: 'GCSE',
        given_values: 'distance = 150m, time = 10s',
      },
      outputs: {
        formula_needed: 'speed = distance / time (v = d/t)',
        working_steps: '1. Write formula: speed = distance / time\n2. Substitute: speed = 150 / 10\n3. Calculate: speed = 15',
        answer_with_units: '15 m/s',
        common_errors: 'Forgetting units, confusing speed/velocity, dividing wrong way round',
      },
      reasoning: 'Basic speed calculation. Emphasize formula triangle and unit consistency.',
    },
  ],
};

// --- Equation Balancer Signature ---

export const SCIENCE_EQUATION_BALANCER: DSPySignature = {
  name: 'ScienceEquationBalancer',
  description: 'Help balance chemical equations with step-by-step method',
  inputs: ['word_equation', 'level', 'show_state_symbols'],
  outputs: ['symbol_equation', 'balancing_steps', 'balanced_equation', 'equation_type'],
  chainOfThought: true,
};

// --- Diagram Explainer Signature ---

export const SCIENCE_DIAGRAM_EXPLAINER: DSPySignature = {
  name: 'ScienceDiagramExplainer',
  description: 'Explain scientific diagrams, processes, and cycles',
  inputs: ['diagram_topic', 'subject_area', 'level', 'specific_parts'],
  outputs: ['overview', 'part_explanations', 'process_flow', 'exam_labels'],
  chainOfThought: true,
};

// --- Export All Signatures ---

export const SCIENCE_SIGNATURES: DSPySignature[] = [
  SCIENCE_CONCEPT_EXPLAINER,
  SCIENCE_PRACTICAL_GUIDE,
  SCIENCE_CALCULATION_HELPER,
  SCIENCE_EQUATION_BALANCER,
  SCIENCE_DIAGRAM_EXPLAINER,
];

/**
 * Get a signature by name
 */
export function getScienceSignature(name: string): DSPySignature | undefined {
  return SCIENCE_SIGNATURES.find(s => s.name === name);
}

export default SCIENCE_SIGNATURES;
