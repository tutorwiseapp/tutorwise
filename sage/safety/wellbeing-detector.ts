/**
 * Sage Wellbeing Detector
 *
 * Detects emotional distress signals in student messages.
 * Education-specific: tuned for frustration, anxiety, self-harm, bullying.
 *
 * On high-severity detection: Sage pauses tutoring and shows support resources.
 * DOES NOT attempt to counsel — redirects to qualified humans.
 *
 * @module sage/safety/wellbeing-detector
 */

import type { WellbeingAlert, WellbeingSeverity, WellbeingCategory } from './types';

// --- Pattern Definitions ---

interface WellbeingPattern {
  pattern: RegExp;
  category: WellbeingCategory;
  severity: WellbeingSeverity;
}

/**
 * High severity — immediate safeguarding concern. Sage must intervene.
 */
const HIGH_SEVERITY_PATTERNS: WellbeingPattern[] = [
  { pattern: /\b(want|going|planning|thinking)\s+(to\s+)?(kill|hurt|harm)\s+(myself|me)\b/i, category: 'self_harm', severity: 'high' },
  { pattern: /\bsuicid(e|al)\b/i, category: 'self_harm', severity: 'high' },
  { pattern: /\bself[\s-]?harm(ing)?\b/i, category: 'self_harm', severity: 'high' },
  { pattern: /\bcut(ting)?\s+my(self)?\b/i, category: 'self_harm', severity: 'high' },
  { pattern: /\bend\s+(my\s+life|it\s+all|everything)\b/i, category: 'self_harm', severity: 'high' },
  { pattern: /\bdon'?t\s+want\s+to\s+(live|be\s+alive|exist|be\s+here)\b/i, category: 'self_harm', severity: 'high' },
  { pattern: /\bno\s+(point|reason)\s+(in\s+)?(living|being\s+alive|going\s+on)\b/i, category: 'self_harm', severity: 'high' },
  { pattern: /\bwish\s+i\s+(was|were)\s+dead\b/i, category: 'self_harm', severity: 'high' },
  { pattern: /\bkill\s+myself\b/i, category: 'self_harm', severity: 'high' },
  { pattern: /\boverdose\b/i, category: 'self_harm', severity: 'high' },
  { pattern: /\bnobody\s+would\s+(care|notice|miss\s+me)\s+if\s+i/i, category: 'self_harm', severity: 'high' },
];

/**
 * Medium severity — student is in distress but not immediate danger.
 */
const MEDIUM_SEVERITY_PATTERNS: WellbeingPattern[] = [
  { pattern: /\b(being|getting)\s+bullied\b/i, category: 'bullying', severity: 'medium' },
  { pattern: /\bthey\s+(all\s+)?(laugh|pick|make\s+fun)\s+(at|of)\s+me\b/i, category: 'bullying', severity: 'medium' },
  { pattern: /\bno\s+one\s+(likes?|wants)\s+me\b/i, category: 'bullying', severity: 'medium' },
  { pattern: /\beveryone\s+hates?\s+me\b/i, category: 'distress', severity: 'medium' },
  { pattern: /\bi\s+(feel|am)\s+(so\s+)?(alone|lonely|isolated)\b/i, category: 'distress', severity: 'medium' },
  { pattern: /\bi\s+(hate|can'?t\s+stand)\s+(myself|my\s+life)\b/i, category: 'distress', severity: 'medium' },
  { pattern: /\bi'?m\s+(so\s+)?(scared|terrified|afraid)\s+(of|about)\s+(school|exams?|going)\b/i, category: 'anxiety', severity: 'medium' },
  { pattern: /\bpanic\s+attack/i, category: 'anxiety', severity: 'medium' },
  { pattern: /\bcan'?t\s+(cope|handle|take\s+it)\s+(any\s*more|anymore)\b/i, category: 'distress', severity: 'medium' },
  { pattern: /\bi\s+(feel|am)\s+(worthless|useless|hopeless|helpless)\b/i, category: 'distress', severity: 'medium' },
];

/**
 * Low severity — frustration or mild anxiety. Normal in learning context.
 * Sage adjusts tone (supportive mode) but doesn't intervene.
 */
const LOW_SEVERITY_PATTERNS: WellbeingPattern[] = [
  { pattern: /\bi\s+(hate|can'?t\s+stand)\s+(this|maths?|english|science|school|studying)\b/i, category: 'frustration', severity: 'low' },
  { pattern: /\bthis\s+is\s+(so\s+)?(stupid|pointless|boring|hard|impossible)\b/i, category: 'frustration', severity: 'low' },
  { pattern: /\bi'?m\s+(so\s+)?(stressed|anxious|worried|nervous)\s+(about|for)\b/i, category: 'anxiety', severity: 'low' },
  { pattern: /\bi\s+(give\s+up|quit|can'?t\s+do\s+(this|it))\b/i, category: 'frustration', severity: 'low' },
  { pattern: /\bi'?ll\s+never\s+(get|understand|learn|pass)\b/i, category: 'frustration', severity: 'low' },
  { pattern: /\bi'?m\s+(so\s+)?stupid\b/i, category: 'frustration', severity: 'low' },
  { pattern: /\bwhat'?s\s+the\s+point\b/i, category: 'frustration', severity: 'low' },
];

// --- Support Messages ---

const SUPPORT_MESSAGES: Record<WellbeingSeverity, string> = {
  high:
    "I can see you're going through something really difficult right now, and I want you to know that's okay. " +
    "You don't have to face this alone.\n\n" +
    "Please reach out to someone who can help:\n\n" +
    "**Childline:** 0800 1111 (free, 24/7, for under-19s)\n" +
    "**Samaritans:** 116 123 (free, 24/7)\n" +
    "**Shout Crisis Text Line:** Text SHOUT to 85258\n" +
    "**Emergency:** 999\n\n" +
    "These services are completely free and confidential. You matter, and people care about you.",

  medium:
    "It sounds like you're having a tough time, and I'm sorry to hear that. " +
    "It's completely normal to feel this way sometimes.\n\n" +
    "If you'd like to talk to someone who can help:\n" +
    "- **Childline:** 0800 1111 (free, confidential, for under-19s)\n" +
    "- **Shout:** Text SHOUT to 85258\n\n" +
    "I'm here to help you learn whenever you're ready. No pressure at all.",

  low:
    "I can see this is frustrating — that's completely normal when you're learning something new! " +
    "Everyone finds things difficult sometimes, and struggling is actually a sign that your brain is growing.\n\n" +
    "Let's take it one small step at a time. Would you like me to explain it in a different way?",
};

// --- Detector ---

/**
 * Detect wellbeing signals in a student message.
 *
 * @param message - The student's message
 * @returns WellbeingAlert with detection result, severity, and support message
 */
export function detectWellbeing(message: string): WellbeingAlert {
  const trimmed = message.trim();
  if (!trimmed) {
    return { detected: false, severity: 'low', keywords: [] };
  }

  const matchedKeywords: string[] = [];

  // Check high severity first (most critical)
  for (const { pattern, category, severity } of HIGH_SEVERITY_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) {
      matchedKeywords.push(match[0]);
      return {
        detected: true,
        severity,
        category,
        keywords: matchedKeywords,
        supportMessage: SUPPORT_MESSAGES[severity],
      };
    }
  }

  // Check medium severity
  for (const { pattern, category, severity } of MEDIUM_SEVERITY_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) {
      matchedKeywords.push(match[0]);
      return {
        detected: true,
        severity,
        category,
        keywords: matchedKeywords,
        supportMessage: SUPPORT_MESSAGES[severity],
      };
    }
  }

  // Check low severity (frustration — common in learning, handled with tone adjustment)
  for (const { pattern, category, severity } of LOW_SEVERITY_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) {
      matchedKeywords.push(match[0]);
      return {
        detected: true,
        severity,
        category,
        keywords: matchedKeywords,
        supportMessage: SUPPORT_MESSAGES[severity],
      };
    }
  }

  return { detected: false, severity: 'low', keywords: [] };
}

/**
 * Whether a wellbeing alert should block normal tutoring and show support resources instead.
 * Only high severity blocks. Medium shows support but continues. Low adjusts tone only.
 */
export function shouldBlockTutoring(alert: WellbeingAlert): boolean {
  return alert.detected && alert.severity === 'high';
}

/**
 * Whether a wellbeing alert should switch Sage to supportive teaching mode.
 */
export function shouldSwitchToSupportive(alert: WellbeingAlert): boolean {
  return alert.detected && (alert.severity === 'medium' || alert.severity === 'low');
}
