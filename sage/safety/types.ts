/**
 * Sage Safety Types
 *
 * Shared types for the Sage safety pipeline:
 * input classification, output validation, wellbeing detection, age adaptation.
 *
 * @module sage/safety/types
 */

// --- Input Classification ---

export type SafetyCategory =
  | 'safe'
  | 'prompt_injection'
  | 'profanity'
  | 'off_topic'
  | 'self_harm'
  | 'violence'
  | 'sexual_content'
  | 'pii_exposure'
  | 'bullying';

export interface InputClassification {
  safe: boolean;
  category: SafetyCategory;
  confidence: number;
  reason?: string;
}

// --- Output Validation ---

export type OutputViolationType =
  | 'direct_answer_in_socratic'
  | 'inappropriate_content'
  | 'pii_leakage'
  | 'hallucinated_exam_info'
  | 'off_topic';

export interface OutputValidation {
  valid: boolean;
  violations: OutputViolationType[];
  rewritten?: string;
  details?: string;
}

// --- Wellbeing Detection ---

export type WellbeingSeverity = 'low' | 'medium' | 'high';

export type WellbeingCategory =
  | 'frustration'
  | 'anxiety'
  | 'self_harm'
  | 'bullying'
  | 'distress';

export interface WellbeingAlert {
  detected: boolean;
  severity: WellbeingSeverity;
  category?: WellbeingCategory;
  keywords: string[];
  supportMessage?: string;
}

// --- Age Adaptation ---

export type AgeBracket = 'primary' | 'secondary' | 'adult';

export interface AgeAdaptation {
  bracket: AgeBracket;
  vocabularyLevel: 'simple' | 'intermediate' | 'advanced';
  forbiddenTopics: string[];
  toneGuidelines: string[];
  systemPromptBlock: string;
}

// --- Safeguarding Event (for DB logging) ---

export interface SafeguardingEvent {
  user_id: string;
  session_id: string;
  event_type: 'input_blocked' | 'output_rewritten' | 'wellbeing_alert' | 'age_violation';
  severity: WellbeingSeverity;
  category: string;
  details: Record<string, unknown>;
}

// --- Pipeline Result ---

export interface SafetyPipelineResult {
  inputSafe: boolean;
  inputClassification: InputClassification;
  wellbeingAlert: WellbeingAlert | null;
  blocked: boolean;
  blockMessage?: string;
}
