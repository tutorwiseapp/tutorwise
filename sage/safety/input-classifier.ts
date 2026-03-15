/**
 * Sage Input Safety Classifier
 *
 * Rules-based classifier that screens student messages before they reach the LLM.
 * Detects: prompt injection, profanity, self-harm signals, off-topic content, PII.
 *
 * Design: fast rules-based layer (<50ms). No LLM call — deterministic and auditable.
 *
 * @module sage/safety/input-classifier
 */

import type { InputClassification, SafetyCategory } from './types';

// --- Pattern Definitions ---

/**
 * Prompt injection patterns — attempts to override system instructions.
 * Source: OWASP LLM Top 10, Authority Partners research.
 */
const PROMPT_INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|prompts?|rules?|guidelines?)/i,
  /disregard\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|prompts?|rules?)/i,
  /forget\s+(everything|all|your)\s+(you\s+)?(were|have\s+been)\s+told/i,
  /you\s+are\s+now\s+(a|an|in)\s+(new|different|unrestricted|jailbreak)/i,
  /pretend\s+(you\s+are|to\s+be)\s+(a|an|not)\s/i,
  /act\s+as\s+(if|though)\s+you\s+(have\s+)?(no|don't\s+have)\s+(restrictions|rules|limits)/i,
  /bypass\s+(your|the|all)\s+(safety|content|ethical)\s+(filters?|rules?|guidelines?)/i,
  /override\s+(your|the|all)\s+(instructions?|rules?|programming)/i,
  /system\s*prompt/i,
  /\[SYSTEM\]/i,
  /\[INST\]/i,
  /<<SYS>>/i,
  /do\s+not\s+follow\s+(your|the)\s+(rules|instructions|guidelines)/i,
  /reveal\s+(your|the)\s+(system|hidden|secret)\s+(prompt|instructions?|message)/i,
  /what\s+(are|is)\s+your\s+(system|hidden|secret)\s+(prompt|instructions?|rules?)/i,
  /jailbreak/i,
  /DAN\s+mode/i,
  /developer\s+mode/i,
];

/**
 * Profanity / strong language patterns.
 * Kept minimal — covers severe words only. Mild frustration expressions are allowed.
 */
const PROFANITY_PATTERNS: RegExp[] = [
  /\bf+u+c+k+\b/i,
  /\bs+h+i+t+\b/i,
  /\bb+a+s+t+a+r+d+\b/i,
  /\bc+u+n+t+\b/i,
  /\bw+a+n+k+e+r+\b/i,
  /\bn+i+g+g+/i,
  /\bf+a+g+g+o+t+\b/i,
  /\bretard(ed)?\b/i,
];

/**
 * Self-harm and crisis signal patterns.
 * Tuned for education context — students may express distress.
 */
const SELF_HARM_PATTERNS: RegExp[] = [
  /\b(want|going|planning|thinking)\s+(to\s+)?(kill|hurt|harm)\s+(myself|me)\b/i,
  /\bsuicid(e|al)\b/i,
  /\bself[\s-]?harm(ing)?\b/i,
  /\bcut(ting)?\s+my(self)?\b/i,
  /\bend\s+(my|it\s+all|everything)\b/i,
  /\bdon'?t\s+want\s+to\s+(live|be\s+alive|exist)\b/i,
  /\bno\s+(point|reason)\s+(in\s+)?(living|being\s+alive|going\s+on)\b/i,
  /\bwish\s+i\s+(was|were)\s+dead\b/i,
  /\bkill\s+myself\b/i,
  /\boverdose\b/i,
];

/**
 * Violence patterns — threats or graphic violence descriptions.
 */
const VIOLENCE_PATTERNS: RegExp[] = [
  /\b(want|going|planning)\s+to\s+(kill|murder|shoot|stab|attack)\s+(someone|people|them|him|her)\b/i,
  /\bbomb\s+(threat|making|build)\b/i,
  /\bschool\s+shoot/i,
  /\bhow\s+to\s+(make|build)\s+(a\s+)?(bomb|weapon|gun)\b/i,
];

/**
 * Sexual content patterns — not appropriate for education context.
 */
const SEXUAL_CONTENT_PATTERNS: RegExp[] = [
  /\bporn(ography)?\b/i,
  /\bsexual(ly)?\s+(explicit|content|act)/i,
  /\bnude(s)?\b/i,
  /\berotic/i,
];

/**
 * Bullying patterns.
 */
const BULLYING_PATTERNS: RegExp[] = [
  /\bno\s+one\s+likes?\s+(me|you)\b/i,
  /\beveryone\s+hates?\s+me\b/i,
  /\b(being|getting)\s+bullied\b/i,
  /\bthey\s+(all\s+)?(laugh|pick|make\s+fun)\s+(at|of)\s+me\b/i,
];

/**
 * PII patterns — detect if student is sharing sensitive personal info.
 * We don't block, but flag for awareness.
 */
const PII_PATTERNS: RegExp[] = [
  // UK phone numbers
  /\b0[0-9]{10}\b/,
  /\b\+44[0-9]{10}\b/,
  // Email addresses
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,
  // UK postcodes
  /\b[A-Z]{1,2}[0-9][A-Z0-9]?\s?[0-9][A-Z]{2}\b/i,
  // National Insurance numbers
  /\b[A-Z]{2}\s?[0-9]{2}\s?[0-9]{2}\s?[0-9]{2}\s?[A-Z]\b/i,
];

// --- Classifier ---

/**
 * Classify a student message for safety.
 * Returns immediately with deterministic result (no LLM call).
 *
 * Priority order: self_harm > violence > sexual_content > prompt_injection > profanity > bullying > pii > safe
 */
export function classifyInput(message: string): InputClassification {
  const trimmed = message.trim();

  // Empty messages are safe
  if (!trimmed) {
    return { safe: true, category: 'safe', confidence: 1.0 };
  }

  // Self-harm (highest priority — safeguarding)
  for (const pattern of SELF_HARM_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        safe: false,
        category: 'self_harm',
        confidence: 0.95,
        reason: 'Self-harm or crisis signal detected',
      };
    }
  }

  // Violence
  for (const pattern of VIOLENCE_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        safe: false,
        category: 'violence',
        confidence: 0.9,
        reason: 'Violent content or threat detected',
      };
    }
  }

  // Sexual content
  for (const pattern of SEXUAL_CONTENT_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        safe: false,
        category: 'sexual_content',
        confidence: 0.9,
        reason: 'Sexual or explicit content detected',
      };
    }
  }

  // Prompt injection
  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        safe: false,
        category: 'prompt_injection',
        confidence: 0.85,
        reason: 'Prompt injection attempt detected',
      };
    }
  }

  // Profanity
  for (const pattern of PROFANITY_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        safe: false,
        category: 'profanity',
        confidence: 0.9,
        reason: 'Strong profanity detected',
      };
    }
  }

  // Bullying
  for (const pattern of BULLYING_PATTERNS) {
    if (pattern.test(trimmed)) {
      // Bullying is not blocked — it triggers wellbeing detection instead
      // Classify as safe but the wellbeing detector will handle it
      return { safe: true, category: 'safe', confidence: 0.7 };
    }
  }

  // PII exposure — warn but don't block (student might be sharing address for context)
  for (const pattern of PII_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        safe: true,
        category: 'pii_exposure',
        confidence: 0.7,
        reason: 'PII detected in message — will be stripped before LLM call',
      };
    }
  }

  // Default: safe
  return { safe: true, category: 'safe', confidence: 1.0 };
}

/**
 * Strip PII from message before sending to LLM provider.
 * Replaces detected PII with placeholders.
 */
export function stripPII(message: string): string {
  let cleaned = message;

  // Replace email addresses
  cleaned = cleaned.replace(
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    '[EMAIL]'
  );

  // Replace UK phone numbers
  cleaned = cleaned.replace(/\b0[0-9]{10}\b/g, '[PHONE]');
  cleaned = cleaned.replace(/\b\+44[0-9]{10}\b/g, '[PHONE]');

  // Replace UK postcodes
  cleaned = cleaned.replace(
    /\b[A-Z]{1,2}[0-9][A-Z0-9]?\s?[0-9][A-Z]{2}\b/gi,
    '[POSTCODE]'
  );

  // Replace National Insurance numbers
  cleaned = cleaned.replace(
    /\b[A-Z]{2}\s?[0-9]{2}\s?[0-9]{2}\s?[0-9]{2}\s?[A-Z]\b/gi,
    '[NI_NUMBER]'
  );

  return cleaned;
}

/**
 * Get a user-friendly block message for a safety category.
 */
export function getBlockMessage(category: SafetyCategory): string {
  switch (category) {
    case 'self_harm':
      return "I can see you might be going through a difficult time. Please reach out to someone who can help:\n\n" +
        "**Childline:** 0800 1111 (free, 24/7)\n" +
        "**Samaritans:** 116 123 (free, 24/7)\n" +
        "**Shout:** Text SHOUT to 85258\n\n" +
        "You're not alone, and there are people who care and want to help.";
    case 'violence':
      return "I'm not able to help with that kind of request. If you're in danger or concerned about someone's safety, please contact the police on 999 (emergency) or 101 (non-emergency). Let's get back to learning — what topic can I help you with?";
    case 'sexual_content':
      return "That's not something I'm able to help with. I'm here to help you learn! What subject would you like to work on?";
    case 'prompt_injection':
      return "I noticed something unusual in your message. I'm Sage, your AI tutor — I'm here to help you learn. What would you like to study?";
    case 'profanity':
      return "I understand things can be frustrating! Let's keep our conversation positive so I can help you learn. What are you working on?";
    default:
      return "I'm not able to help with that particular request. How about we focus on your studies? What topic would you like to work on?";
  }
}
