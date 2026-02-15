/**
 * Sage Subject Types
 *
 * Type definitions for curriculum and subject domain logic.
 */

import type { SageSubject, SageLevel } from '../types';

// --- Curriculum Types ---

export interface CurriculumSpec {
  subject: SageSubject;
  level: SageLevel;
  examBoard?: string;  // e.g., 'AQA', 'Edexcel', 'OCR'
  specCode?: string;   // e.g., '8300' for AQA GCSE Maths
  topics: TopicNode[];
  assessmentObjectives?: AssessmentObjective[];
}

export interface TopicNode {
  id: string;
  name: string;
  description?: string;
  parent?: string;
  children?: string[];
  prerequisites?: string[];
  keywords: string[];
  difficulty: 'foundation' | 'intermediate' | 'higher';
  examWeight?: number;  // Percentage of exam marks
  commonMisconceptions?: string[];
}

export interface AssessmentObjective {
  id: string;  // e.g., 'AO1', 'AO2', 'AO3'
  name: string;
  description: string;
  weight: number;  // Percentage
}

// --- Topic Hierarchy ---

export interface TopicHierarchy {
  subject: SageSubject;
  level: SageLevel;
  root: TopicCategory[];
}

export interface TopicCategory {
  id: string;
  name: string;
  topics: Topic[];
}

export interface Topic {
  id: string;
  name: string;
  subtopics?: Topic[];
  skills: string[];
  formulas?: string[];  // For maths/science
  keyTerms?: string[];  // For english/science
}

// --- Learning Objective ---

export interface LearningObjective {
  id: string;
  topicId: string;
  description: string;
  level: SageLevel;
  verb: string;  // Bloom's taxonomy verb
  criteria: string[];
}

// --- Subject Configuration ---

export interface SubjectConfig {
  subject: SageSubject;
  displayName: string;
  description: string;
  levels: SageLevel[];
  examBoards: string[];
  icon?: string;
  color?: string;
}

// --- Reference Data ---

export interface FormulaReference {
  id: string;
  name: string;
  formula: string;  // LaTeX format
  description: string;
  topics: string[];
  level: SageLevel;
  units?: string;
  examples?: string[];
}

export interface KeyTermDefinition {
  term: string;
  definition: string;
  subject: SageSubject;
  topics: string[];
  relatedTerms?: string[];
  examples?: string[];
}
