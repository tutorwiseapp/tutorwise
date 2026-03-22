export interface WorkflowTheme {
  icon: string;
  colour: string;
  backgroundStyle: 'default' | 'dark' | 'grid' | 'dotted';
  narrative: string;
  cardImage?: string;
}

export interface CanvasAction {
  type: 'stamp_shape' | 'load_template' | 'clear_canvas' | 'add_text' | 'set_background';
  shape?: string;
  templateId?: string;
  position?: 'center' | 'top-left' | 'top-right';
  backgroundStyle?: string;
  props?: Record<string, unknown>;
}

export interface PhaseExitConditions {
  minMasteryScore?: number;
  timeExpiredMins?: number;
  tutorOverride: boolean;
  sageSuggestsReady?: boolean;
}

export interface WorkflowPhase {
  id: string;
  name: string;
  icon: string;
  durationMins: number;
  sageMode: 'full' | 'hints' | 'silent' | 'co-teach';
  sagePersona?: string;
  sagePromptTemplate: string;
  canvasActions: CanvasAction[];
  exitConditions: PhaseExitConditions;
  narrative: string;
  resources?: string[];
  homeworkEnabled?: boolean;
}

export interface LearnYourWayMeta {
  freedoms: Array<'goal' | 'style' | 'support' | 'pace' | 'ai_involvement'>;
  agencyPoints: string[];
  bestFor: string;
}

export interface SessionWorkflow {
  id: string;
  slug: string;
  name: string;
  description?: string;
  short_description?: string;
  theme: WorkflowTheme;
  tags: string[];
  exam_board: string;
  subject: string;
  level: 'primary' | 'foundation' | 'higher' | 'SEN' | '11+' | 'a-level' | 'any';
  duration_mins: number;
  ai_involvement: 'full' | 'hints' | 'silent' | 'co-teach';
  sen_focus: boolean;
  phases: WorkflowPhase[];
  learn_your_way: LearnYourWayMeta;
  built_in: boolean;
}

export const AI_INVOLVEMENT_LABELS: Record<string, string> = {
  full: 'Sage Leads',
  hints: 'Sage Hints',
  silent: 'Sage Silent',
  'co-teach': 'Co-Teach',
};

export const AI_INVOLVEMENT_COLOURS: Record<string, string> = {
  full: '#006c67',
  hints: '#6366f1',
  silent: '#64748b',
  'co-teach': '#f59e0b',
};

export const LEVEL_LABELS: Record<string, string> = {
  primary: 'Primary',
  foundation: 'Foundation',
  higher: 'Higher',
  SEN: 'SEN',
  '11+': '11+',
  'a-level': 'A-Level',
  any: 'Any Level',
};
