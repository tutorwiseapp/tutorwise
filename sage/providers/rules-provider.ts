/**
 * Sage Rules-Based Provider
 *
 * Uses pattern matching and predefined responses for tutoring.
 * No external API calls required - works offline.
 *
 * This is the fallback provider when API providers are unavailable.
 *
 * @module sage/providers/rules-provider
 */

import { BaseSageProvider } from './base-provider';
import type {
  LLMProviderType,
  LLMProviderConfig,
  LLMCompletionRequest,
  LLMCompletionResponse,
  LLMStreamChunk,
} from './types';
import type {
  SagePersona,
  SageSubject,
  SageLevel,
  SageDetectedIntent,
  SageIntentCategory,
} from '../types';
import type { AgentContext } from '../../cas/packages/core/src/context';

// --- Intent Patterns (ordered by specificity - more specific first) ---

interface IntentPattern {
  patterns: string[];
  category: SageIntentCategory;
  action: string;
  priority: number; // Higher = checked first
}

const INTENT_PATTERNS: IntentPattern[] = [
  // Capabilities / Help - what can you do
  { patterns: ['what can you', 'how can you help', 'what do you do', 'can you help', 'help me with', 'are you able'], category: 'general', action: 'capabilities', priority: 10 },

  // Greetings
  { patterns: ['hello', 'hi there', 'hey', 'good morning', 'good afternoon', 'good evening'], category: 'general', action: 'greeting', priority: 9 },

  // Study tips and advice
  { patterns: ['study tips', 'study advice', 'how to study', 'revision tips', 'learning tips', 'tips for', 'advice for', 'how should i study', 'best way to learn', 'how to revise'], category: 'general', action: 'tips', priority: 8 },

  // Motivation and encouragement
  { patterns: ['motivat', 'struggling', 'hard time', 'difficult', "can't understand", "don't get it", 'confused', 'stuck', 'help me understand'], category: 'general', action: 'encourage', priority: 7 },

  // Learning intents - specific queries
  { patterns: ['explain', 'what is', 'what are', 'how does', 'how do', 'why does', 'why do', 'tell me about', 'describe', 'define', 'meaning of'], category: 'explain', action: 'explain', priority: 6 },
  { patterns: ['solve', 'calculate', 'work out', 'find the', 'compute', 'what is the answer', 'how much', 'how many'], category: 'solve', action: 'solve', priority: 6 },
  { patterns: ['practice', 'exercise', 'quiz', 'test me', 'give me questions', 'problems to solve', 'try some'], category: 'practice', action: 'generate', priority: 6 },
  { patterns: ['wrong', 'mistake', 'error', 'incorrect', 'why not', "didn't work", 'what went wrong', 'where did i go wrong'], category: 'diagnose', action: 'diagnose', priority: 6 },
  { patterns: ['review', 'revise', 'go over', 'summary', 'recap', 'summarise', 'summarize', 'overview'], category: 'review', action: 'review', priority: 6 },
  { patterns: ['homework', 'assignment', 'coursework', 'schoolwork', 'classwork'], category: 'homework', action: 'help', priority: 6 },
  { patterns: ['exam', 'test prep', 'gcse', 'a-level', 'a level', 'preparation', 'upcoming test', 'finals'], category: 'exam', action: 'prepare', priority: 6 },
  { patterns: ['resource', 'material', 'book', 'video', 'learn more', 'where can i', 'recommend'], category: 'resources', action: 'find', priority: 5 },
  { patterns: ['progress', 'how am i', 'improve', 'doing well', 'my performance', 'getting better'], category: 'progress', action: 'view', priority: 5 },

  // Appreciation / thanks
  { patterns: ['thank', 'thanks', 'great', 'helpful', 'awesome', 'perfect', 'excellent'], category: 'general', action: 'thanks', priority: 4 },
];

// --- Subject Detection ---

const SUBJECT_PATTERNS: Record<SageSubject, string[]> = {
  maths: ['math', 'maths', 'algebra', 'geometry', 'calculus', 'equation', 'number', 'fraction', 'percentage', 'graph', 'formula', 'trigonometry', 'statistics', 'probability', 'arithmetic', 'decimal', 'ratio', 'proportion', 'quadratic', 'linear', 'function', 'derivative', 'integral', 'matrix', 'vector'],
  english: ['english', 'grammar', 'writing', 'essay', 'literature', 'poem', 'poetry', 'story', 'vocabulary', 'spelling', 'reading', 'comprehension', 'punctuation', 'sentence', 'paragraph', 'narrative', 'persuasive', 'shakespeare', 'novel', 'author', 'character', 'theme', 'metaphor', 'simile'],
  science: ['science', 'physics', 'chemistry', 'biology', 'experiment', 'atom', 'cell', 'force', 'energy', 'reaction', 'molecule', 'element', 'periodic table', 'gravity', 'electricity', 'magnetism', 'evolution', 'genetics', 'ecosystem', 'photosynthesis', 'respiration', 'newton', 'motion', 'wave', 'light', 'sound'],
  general: [],
};

// --- Rules Provider ---

export class SageRulesProvider extends BaseSageProvider {
  readonly type: LLMProviderType = 'rules';
  readonly name = 'Sage Rules-Based (Offline)';

  constructor(config: LLMProviderConfig = { type: 'rules' }) {
    super(config);
  }

  isAvailable(): boolean {
    // Rules provider is always available
    return true;
  }

  async complete(request: LLMCompletionRequest): Promise<LLMCompletionResponse> {
    const { messages, persona, subject, level, context, intent } = request;

    // Get the last user message
    const lastUserMessage = messages
      .filter(m => m.role === 'user')
      .pop();

    if (!lastUserMessage) {
      return {
        content: this.getGreeting(persona, subject),
        suggestions: this.getDefaultSuggestions(persona, subject),
      };
    }

    // Detect intent if not provided
    const detectedIntent = intent || await this.detectIntent(
      lastUserMessage.content,
      persona,
      context,
      subject,
      level
    );

    // Generate response based on intent, subject, and message context
    const response = this.generateResponse(
      detectedIntent,
      persona,
      subject,
      level,
      lastUserMessage.content
    );

    return {
      content: response.message,
      suggestions: response.suggestions,
    };
  }

  async *stream(request: LLMCompletionRequest): AsyncGenerator<LLMStreamChunk> {
    // Rules provider simulates streaming by yielding words
    const response = await this.complete(request);
    const words = response.content.split(' ');

    for (let i = 0; i < words.length; i++) {
      yield {
        content: words[i] + (i < words.length - 1 ? ' ' : ''),
        done: false,
      };
      // Small delay to simulate streaming
      await new Promise(resolve => setTimeout(resolve, 15));
    }

    yield { content: '', done: true };
  }

  async detectIntent(
    message: string,
    _persona: SagePersona,
    _context: AgentContext,
    subject?: SageSubject,
    level?: SageLevel
  ): Promise<SageDetectedIntent> {
    const lowerMessage = message.toLowerCase();

    // Sort patterns by priority (higher first)
    const sortedPatterns = [...INTENT_PATTERNS].sort((a, b) => b.priority - a.priority);

    // Detect category
    let detectedCategory: SageIntentCategory = 'general';
    let detectedAction = 'chat';
    let confidence = 0.5;

    for (const pattern of sortedPatterns) {
      if (pattern.patterns.some(p => lowerMessage.includes(p))) {
        detectedCategory = pattern.category;
        detectedAction = pattern.action;
        confidence = 0.7 + (pattern.priority * 0.02); // Higher priority = higher confidence
        break;
      }
    }

    // Detect subject from message
    let detectedSubject = subject;
    if (!detectedSubject) {
      for (const [subj, patterns] of Object.entries(SUBJECT_PATTERNS)) {
        if (patterns.some(p => lowerMessage.includes(p))) {
          detectedSubject = subj as SageSubject;
          break;
        }
      }
    }

    // Extract topic
    const topic = this.extractTopic(message);

    return {
      category: detectedCategory,
      action: detectedAction,
      confidence,
      entities: {
        topic,
        subject: detectedSubject,
        level,
      },
      requiresConfirmation: false,
    };
  }

  // --- Private Methods ---

  private extractTopic(message: string): string | undefined {
    // Try to extract the main topic from the message
    const patterns = [
      /about\s+([^?.,!]+)/i,
      /explain\s+([^?.,!]+)/i,
      /what\s+(?:is|are)\s+([^?.,!]+)/i,
      /how\s+(?:does|do|to)\s+([^?.,!]+)/i,
      /solve\s+([^?.,!]+)/i,
      /help\s+(?:me\s+)?(?:with\s+)?([^?.,!]+)/i,
      /understand\s+([^?.,!]+)/i,
      /learn\s+(?:about\s+)?([^?.,!]+)/i,
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return undefined;
  }

  private getGreeting(persona: SagePersona, subject?: SageSubject): string {
    const subjectText = subject && subject !== 'general' ? ` with ${subject}` : '';

    const greetings: Record<SagePersona, string> = {
      student: `Hello! I'm Sage, your AI learning assistant. I'm here to help you learn and understand any subject${subjectText}. What would you like to explore today?`,
      tutor: `Hi! I'm Sage, your teaching assistant. I can help you prepare lessons, create worksheets, and identify student misconceptions${subjectText}. How can I assist?`,
      client: `Welcome! I'm Sage. I can help you understand your child's learning progress${subjectText} and suggest ways to support their education at home.`,
      agent: `Hello! I'm Sage, here to assist with educational queries${subjectText}. How can I help?`,
    };

    return greetings[persona];
  }

  private getDefaultSuggestions(persona: SagePersona, subject?: SageSubject): string[] {
    const subjectSuggestions: Record<SageSubject, string[]> = {
      maths: ['Help me solve an equation', 'Explain fractions', 'Practice algebra'],
      english: ['Check my grammar', 'Essay writing tips', 'Help with vocabulary'],
      science: ['Explain a concept', 'Help with an experiment', 'Physics problem'],
      general: ['Study tips', 'Explain a topic', 'Practice questions'],
    };

    const personaSuggestions: Record<SagePersona, string[]> = {
      student: subject ? subjectSuggestions[subject] : ['Study tips', 'Explain something', 'Practice problems'],
      tutor: ['Create a worksheet', 'Lesson plan ideas', 'Common misconceptions'],
      client: ['Progress overview', 'How to help at home', 'Curriculum topics'],
      agent: ['Student help', 'Tutor information', 'Learning resources'],
    };

    return personaSuggestions[persona];
  }

  private generateResponse(
    intent: SageDetectedIntent,
    persona: SagePersona,
    subject?: SageSubject,
    level?: SageLevel,
    originalMessage?: string
  ): { message: string; suggestions: string[] } {
    const topic = intent.entities?.topic || 'this topic';
    const subjectName = this.getSubjectDisplayName(subject);
    const levelName = this.getLevelDisplayName(level);

    // Try to directly answer simple/factual questions first
    if (originalMessage) {
      const directAnswer = this.tryDirectAnswer(originalMessage, subject);
      if (directAnswer) {
        return directAnswer;
      }
    }

    // Handle action-specific responses first
    if (intent.action === 'capabilities') {
      return this.getCapabilitiesResponse(persona, subject);
    }

    if (intent.action === 'greeting') {
      return this.getGreetingResponse(persona, subject);
    }

    if (intent.action === 'tips') {
      return this.getTipsResponse(subject, level, originalMessage);
    }

    if (intent.action === 'encourage') {
      return this.getEncouragementResponse(subject, topic);
    }

    if (intent.action === 'thanks') {
      return this.getThanksResponse();
    }

    // Subject-specific responses for main categories
    if (subject && subject !== 'general') {
      const subjectResponse = this.getSubjectSpecificResponse(intent.category, subject, level, topic);
      if (subjectResponse) {
        return subjectResponse;
      }
    }

    // Generic category responses
    return this.getCategoryResponse(intent.category, topic, subjectName, levelName);
  }

  /**
   * Try to directly answer simple questions instead of giving generic guidance.
   * Handles basic arithmetic, definitions, and common educational questions.
   */
  private tryDirectAnswer(message: string, subject?: SageSubject): { message: string; suggestions: string[] } | null {
    const lower = message.toLowerCase().trim();

    // --- Simple arithmetic ---
    const arithmeticMatch = message.match(/(?:what\s+is\s+)?(\d+(?:\.\d+)?)\s*([+\-×x*÷/])\s*(\d+(?:\.\d+)?)\s*[?]?\s*$/i);
    if (arithmeticMatch) {
      const a = parseFloat(arithmeticMatch[1]);
      const op = arithmeticMatch[2];
      const b = parseFloat(arithmeticMatch[3]);
      let result: number | null = null;
      let opName = '';

      switch (op) {
        case '+': result = a + b; opName = 'addition'; break;
        case '-': result = a - b; opName = 'subtraction'; break;
        case '×': case 'x': case '*': result = a * b; opName = 'multiplication'; break;
        case '÷': case '/': result = b !== 0 ? a / b : null; opName = 'division'; break;
      }

      if (result !== null) {
        const displayResult = Number.isInteger(result) ? result.toString() : result.toFixed(2);
        return {
          message: `**${a} ${op === '*' || op === 'x' ? '×' : op === '/' ? '÷' : op} ${b} = ${displayResult}**\n\nThis is a ${opName} problem. ${this.getArithmeticExplanation(a, op, b, result)}\n\nWant to try a similar problem to practice?`,
          suggestions: ['Give me a similar problem', 'Explain the method', 'Something harder'],
        };
      }
    }

    // --- "What is [concept]?" questions ---
    const whatIsMatch = lower.match(/^(?:what\s+(?:is|are)\s+)(.+?)(?:\?|$)/);
    if (whatIsMatch) {
      const concept = whatIsMatch[1].trim();
      const definition = this.getConceptDefinition(concept, subject);
      if (definition) {
        return definition;
      }
    }

    // --- "How do I/you [action]?" questions ---
    const howDoMatch = lower.match(/^how\s+(?:do\s+(?:i|you)|can\s+i|to)\s+(.+?)(?:\?|$)/);
    if (howDoMatch) {
      const action = howDoMatch[1].trim();
      const howTo = this.getHowToAnswer(action, subject);
      if (howTo) {
        return howTo;
      }
    }

    return null;
  }

  private getArithmeticExplanation(a: number, op: string, b: number, result: number): string {
    switch (op) {
      case '+':
        return `When we add ${a} and ${b} together, we get ${result}.`;
      case '-':
        return `When we subtract ${b} from ${a}, we get ${result}.`;
      case '*': case 'x': case '×':
        return `Multiplying ${a} by ${b} gives us ${result}. You can think of this as ${a} groups of ${b}.`;
      case '/': case '÷':
        return `Dividing ${a} by ${b} gives us ${Number.isInteger(result) ? result : result.toFixed(2)}. This means ${a} shared equally into ${b} groups.`;
      default:
        return '';
    }
  }

  /**
   * Return definitions for common educational concepts.
   */
  private getConceptDefinition(concept: string, subject?: SageSubject): { message: string; suggestions: string[] } | null {
    const definitions: Record<string, { message: string; suggestions: string[] }> = {
      // Maths concepts
      'trigonometry': {
        message: `**Trigonometry** is a branch of mathematics that studies the relationships between the sides and angles of triangles.\n\n**Key concepts:**\n- **SOH CAH TOA** — the three main ratios:\n  - **Sin(θ)** = Opposite / Hypotenuse\n  - **Cos(θ)** = Adjacent / Hypotenuse\n  - **Tan(θ)** = Opposite / Adjacent\n- Used extensively in engineering, physics, navigation, and architecture\n- At GCSE level, you'll work with right-angled triangles\n- At A-Level, you'll explore sine/cosine rules for non-right triangles\n\nWould you like me to walk through an example problem?`,
        suggestions: ['Show me an example', 'Practice problems', 'Explain sine rule'],
      },
      'algebra': {
        message: `**Algebra** is a branch of mathematics that uses letters and symbols to represent numbers and quantities in formulas and equations.\n\n**Key ideas:**\n- **Variables** (like x, y) represent unknown values\n- **Expressions** combine numbers and variables (e.g., 3x + 2)\n- **Equations** set expressions equal to each other (e.g., 3x + 2 = 11)\n- The goal is often to "solve for x" — find the value of the unknown\n\n**Example:** If 3x + 2 = 11, then 3x = 9, so x = 3\n\nWant to try solving an equation?`,
        suggestions: ['Solve an equation', 'Explain expressions', 'Practice algebra'],
      },
      'fractions': {
        message: `**Fractions** represent parts of a whole. A fraction has a **numerator** (top number) and a **denominator** (bottom number).\n\n**Key operations:**\n- **Adding/Subtracting**: Find a common denominator first\n- **Multiplying**: Multiply tops together and bottoms together\n- **Dividing**: Flip the second fraction and multiply\n- **Simplifying**: Divide top and bottom by their highest common factor\n\n**Example:** ½ + ¼ = 2/4 + 1/4 = 3/4\n\nWhat would you like to practise with fractions?`,
        suggestions: ['Adding fractions', 'Multiplying fractions', 'Practice problems'],
      },
      'pythagoras': {
        message: `**Pythagoras' Theorem** states that in a right-angled triangle:\n\n> **a² + b² = c²**\n\nWhere **c** is the hypotenuse (the longest side, opposite the right angle), and **a** and **b** are the other two sides.\n\n**Example:** If a = 3 and b = 4:\n- c² = 3² + 4² = 9 + 16 = 25\n- c = √25 = **5**\n\nThis is one of the most useful theorems in mathematics!\n\nWant to try a Pythagoras problem?`,
        suggestions: ['Solve a problem', 'When do I use it?', 'Practice questions'],
      },
      'quadratic equations': {
        message: `**Quadratic equations** have the form **ax² + bx + c = 0**.\n\n**Methods to solve:**\n1. **Factorising** — find two brackets that multiply to give the equation\n2. **Quadratic formula** — x = (-b ± √(b²-4ac)) / 2a\n3. **Completing the square** — rewrite in (x+p)² + q form\n\n**The discriminant** (b²-4ac) tells you how many solutions:\n- Positive → 2 real solutions\n- Zero → 1 repeated solution\n- Negative → no real solutions\n\nWhich method would you like to explore?`,
        suggestions: ['Show factorising', 'Use the formula', 'Practice problems'],
      },
      // English concepts
      'a metaphor': {
        message: `**A metaphor** is a figure of speech that directly compares two unlike things by stating one IS the other (without using "like" or "as").\n\n**Examples:**\n- "Time is money" — time isn't literally money, but this emphasises its value\n- "The world is a stage" — Shakespeare comparing life to theatre\n- "Her voice was music" — comparing voice to music\n\n**Difference from simile:** A simile uses "like" or "as" (e.g., "her voice was LIKE music").\n\n**In writing:** Metaphors make your writing more vivid and engaging. They help readers see things in new ways.\n\nWant to practise identifying metaphors?`,
        suggestions: ['Simile vs metaphor', 'Find metaphors in text', 'Use in my writing'],
      },
      'a simile': {
        message: `**A simile** is a figure of speech that compares two things using **"like"** or **"as"**.\n\n**Examples:**\n- "She ran **like** the wind"\n- "He was as brave **as** a lion"\n- "The snow was **like** a white blanket"\n\n**Purpose in writing:** Similes create vivid images and help readers connect to unfamiliar ideas through familiar comparisons.\n\n**Tip:** Don't overuse similes — pick strong, original ones for impact!`,
        suggestions: ['Metaphor vs simile', 'Practice identifying', 'Use in essays'],
      },
      // Science concepts
      'photosynthesis': {
        message: `**Photosynthesis** is the process by which plants convert light energy into chemical energy (food).\n\n**Word equation:**\n> Carbon dioxide + Water → Glucose + Oxygen\n\n**Chemical equation:**\n> 6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂\n\n**Key facts:**\n- Takes place in **chloroplasts** (containing chlorophyll)\n- Chlorophyll absorbs **red and blue** light (reflects green — that's why leaves are green!)\n- **Light-dependent reactions** happen in the thylakoid membranes\n- **Light-independent reactions** (Calvin cycle) happen in the stroma\n\nWant me to explain any part in more detail?`,
        suggestions: ['Factors affecting rate', 'Draw a diagram', 'Practice questions'],
      },
      'gravity': {
        message: `**Gravity** is a force of attraction between any two objects with mass.\n\n**Key facts:**\n- On Earth, gravity accelerates objects at approximately **9.8 m/s²** (often rounded to 10 m/s²)\n- **Weight = mass × gravitational field strength** (W = mg)\n- The larger the mass, the stronger the gravitational pull\n- Gravity keeps planets in orbit around the Sun\n\n**Newton's Law of Universal Gravitation:**\n> F = G(m₁m₂)/r²\n\nWhere G is the gravitational constant, m₁ and m₂ are the masses, and r is the distance between them.\n\nWant to solve a gravity problem?`,
        suggestions: ['Weight vs mass', 'Calculate weight', 'Planetary gravity'],
      },
    };

    // Try exact match first, then partial match
    if (definitions[concept]) {
      return definitions[concept];
    }

    // Try without articles
    const withoutArticle = concept.replace(/^(a|an|the)\s+/i, '');
    if (definitions[withoutArticle]) {
      return definitions[withoutArticle];
    }

    // Try partial matching
    for (const [key, value] of Object.entries(definitions)) {
      const cleanKey = key.replace(/^(a|an|the)\s+/i, '');
      if (concept.includes(cleanKey) || cleanKey.includes(concept)) {
        return value;
      }
    }

    return null;
  }

  /**
   * Provide step-by-step how-to answers for common learning questions.
   */
  private getHowToAnswer(action: string, subject?: SageSubject): { message: string; suggestions: string[] } | null {
    const lower = action.toLowerCase();

    if (lower.includes('solve') && (lower.includes('equation') || lower.includes('quadratic'))) {
      return {
        message: `**How to solve equations:**\n\n**Linear equations** (e.g., 3x + 5 = 20):\n1. Isolate the variable on one side\n2. Undo operations in reverse order (BODMAS backwards)\n3. Check your answer by substituting back\n\n**Example:** 3x + 5 = 20\n- Subtract 5: 3x = 15\n- Divide by 3: x = 5\n- Check: 3(5) + 5 = 20 ✓\n\nWant me to walk through a specific equation?`,
        suggestions: ['Try an example', 'Quadratic equations', 'Simultaneous equations'],
      };
    }

    if (lower.includes('write') && lower.includes('essay')) {
      return {
        message: `**How to write a great essay:**\n\n**Structure:**\n1. **Introduction** — Hook the reader, provide context, state your thesis\n2. **Body paragraphs** — Use PEE/PEA structure:\n   - **P**oint — Make your argument\n   - **E**vidence — Quote or reference\n   - **E**xplain/Analyse — Why does this matter?\n3. **Conclusion** — Summarise, restate thesis, broader implications\n\n**Tips:**\n- Plan before you write (5-10 mins)\n- Use connectives to link ideas\n- Vary sentence length for impact\n- Proofread for SPAG errors\n\nWhat type of essay are you writing?`,
        suggestions: ['Persuasive essay', 'Analytical essay', 'Check my introduction'],
      };
    }

    if (lower.includes('revise') || lower.includes('prepare') && lower.includes('exam')) {
      return {
        message: `**How to revise effectively:**\n\n**Proven techniques:**\n1. **Active recall** — Test yourself instead of re-reading notes\n2. **Spaced repetition** — Review at increasing intervals (1 day, 3 days, 1 week...)\n3. **Practice papers** — Do past papers under timed conditions\n4. **Mind maps** — Create visual summaries of topics\n5. **Teach someone** — Explaining to others deepens understanding\n\n**Revision timetable tips:**\n- Start early — don't cram\n- Mix subjects to avoid fatigue\n- Take regular breaks (Pomodoro: 25 min work, 5 min break)\n- Get enough sleep — your brain processes learning during sleep!\n\nWhat subject are you revising for?`,
        suggestions: ['Create a revision plan', 'Practice questions', 'Subject-specific tips'],
      };
    }

    return null;
  }

  private getSubjectDisplayName(subject?: SageSubject): string {
    const names: Record<SageSubject, string> = {
      maths: 'Mathematics',
      english: 'English',
      science: 'Science',
      general: 'your studies',
    };
    return subject ? names[subject] : 'your studies';
  }

  private getLevelDisplayName(level?: SageLevel): string {
    const names: Record<SageLevel, string> = {
      'GCSE': 'GCSE level',
      'A-Level': 'A-Level',
      'University': 'University level',
      'Other': 'your level',
    };
    return level ? names[level] : 'your level';
  }

  private getCapabilitiesResponse(persona: SagePersona, subject?: SageSubject): { message: string; suggestions: string[] } {
    const subjectText = subject && subject !== 'general' ? ` for ${this.getSubjectDisplayName(subject)}` : '';

    if (persona === 'student') {
      return {
        message: `Great question! Here's how I can help you${subjectText}:\n\n**Learning Support:**\n• Explain concepts in simple terms\n• Walk through problems step-by-step\n• Generate practice questions\n• Help with homework (guiding, not giving answers!)\n\n**Study Skills:**\n• Share effective study techniques\n• Help you prepare for exams\n• Review and summarise topics\n• Identify areas to improve\n\nJust ask me anything - I'm here to help you learn!`,
        suggestions: ['Explain a topic', 'Give me practice questions', 'Study tips'],
      };
    }

    return {
      message: `I can assist you with educational support${subjectText}. I can explain concepts, help with problem-solving, provide study tips, and much more. What would you like help with?`,
      suggestions: ['Explain something', 'Practice questions', 'Study advice'],
    };
  }

  private getGreetingResponse(persona: SagePersona, subject?: SageSubject): { message: string; suggestions: string[] } {
    const subjectText = subject && subject !== 'general' ? ` with ${this.getSubjectDisplayName(subject)}` : '';

    const responses = [
      `Hi there! Ready to learn something new${subjectText}? What can I help you with today?`,
      `Hello! I'm here to help you succeed${subjectText}. What would you like to work on?`,
      `Hey! Great to see you. What shall we explore together${subjectText}?`,
    ];

    return {
      message: responses[Math.floor(Math.random() * responses.length)],
      suggestions: subject && subject !== 'general'
        ? this.getDefaultSuggestions(persona, subject)
        : ['Study tips', 'Explain a concept', 'Practice questions'],
    };
  }

  private getTipsResponse(subject?: SageSubject, level?: SageLevel, originalMessage?: string): { message: string; suggestions: string[] } {
    // Check if asking for specific subject tips
    if (subject === 'maths' || originalMessage?.toLowerCase().includes('math')) {
      return {
        message: `**Maths Study Tips:**\n\n1. **Practice regularly** - Maths is a skill that improves with daily practice\n2. **Understand, don't memorise** - Learn WHY formulas work, not just what they are\n3. **Show your working** - Write out every step, it helps catch errors\n4. **Learn from mistakes** - Review wrong answers to understand where you went wrong\n5. **Use visual aids** - Draw diagrams, graphs, and number lines\n\n**Quick wins:**\n• Do 3-5 practice problems daily\n• Create formula flashcards\n• Teach a concept to someone else\n\nWant me to help you practice a specific topic?`,
        suggestions: ['Practice algebra', 'Explain a formula', 'Help with equations'],
      };
    }

    if (subject === 'english' || originalMessage?.toLowerCase().includes('english') || originalMessage?.toLowerCase().includes('essay')) {
      return {
        message: `**English Study Tips:**\n\n1. **Read widely** - Fiction, non-fiction, articles - variety builds vocabulary\n2. **Write regularly** - Keep a journal or write short pieces daily\n3. **Plan before writing** - Spend 5-10 mins planning essays before you start\n4. **Edit ruthlessly** - First drafts are meant to be improved\n5. **Learn literary techniques** - Know your metaphors from your similes!\n\n**Essay structure reminder:**\n• **Introduction** - Hook, context, thesis\n• **Body paragraphs** - Point, Evidence, Explain\n• **Conclusion** - Summarise, broader significance\n\nWould you like help with a specific writing skill?`,
        suggestions: ['Essay structure help', 'Grammar tips', 'Improve vocabulary'],
      };
    }

    if (subject === 'science' || originalMessage?.toLowerCase().includes('science')) {
      return {
        message: `**Science Study Tips:**\n\n1. **Connect to real life** - Link concepts to everyday examples\n2. **Draw diagrams** - Visual learning helps in science\n3. **Understand processes** - Don't just memorise, understand each step\n4. **Do past papers** - Examiners often repeat similar questions\n5. **Use mnemonics** - Create memory aids for lists and sequences\n\n**Lab skills:**\n• Always predict what you expect to happen\n• Record observations accurately\n• Draw conclusions based on evidence\n\nWhat science topic would you like to explore?`,
        suggestions: ['Physics concepts', 'Chemistry help', 'Biology revision'],
      };
    }

    // General study tips
    return {
      message: `**Effective Study Tips:**\n\n**Before studying:**\n• Find a quiet space with no distractions\n• Set specific goals for each session\n• Have all materials ready\n\n**While studying:**\n• Use the **Pomodoro technique** - 25 mins focus, 5 mins break\n• **Active recall** - Test yourself instead of re-reading\n• **Spaced repetition** - Review material over increasing intervals\n\n**After studying:**\n• Summarise what you learned in your own words\n• Identify gaps in understanding\n• Plan what to cover next\n\n**Top tip:** Teaching a concept to someone else is one of the best ways to learn it!\n\nWhat subject would you like specific tips for?`,
      suggestions: ['Maths tips', 'English tips', 'Exam preparation'],
    };
  }

  private getEncouragementResponse(subject?: SageSubject, topic?: string): { message: string; suggestions: string[] } {
    const topicText = topic && topic !== 'this topic' ? ` with ${topic}` : '';

    return {
      message: `It's completely normal to find things challenging${topicText} - that's actually a sign you're pushing yourself to learn!\n\n**Remember:**\n• Everyone struggles sometimes, even experts once did\n• Making mistakes is part of learning\n• Small progress is still progress\n• Asking for help shows strength, not weakness\n\n**Let's break it down:**\nTell me specifically what's confusing you, and we'll tackle it together, one small step at a time. Sometimes a different explanation makes all the difference!\n\nWhat part would you like me to explain differently?`,
      suggestions: ['Start from basics', 'Show me an example', 'Break it into steps'],
    };
  }

  private getThanksResponse(): { message: string; suggestions: string[] } {
    const responses = [
      "You're welcome! Keep up the great work. Is there anything else you'd like to learn?",
      "Happy to help! Remember, every question you ask is a step forward in your learning. What else can I help with?",
      "Glad I could help! Learning is a journey, and you're doing great. Ready for the next topic?",
    ];

    return {
      message: responses[Math.floor(Math.random() * responses.length)],
      suggestions: ['Practice more', 'New topic', 'Review what we covered'],
    };
  }

  private getSubjectSpecificResponse(
    category: SageIntentCategory,
    subject: SageSubject,
    level?: SageLevel,
    topic?: string
  ): { message: string; suggestions: string[] } | null {
    const levelText = level ? ` at ${this.getLevelDisplayName(level)}` : '';

    // Maths-specific responses
    if (subject === 'maths') {
      if (category === 'explain') {
        return {
          message: `Let me help you understand ${topic || 'this maths concept'}${levelText}.\n\n**Approach:**\n1. First, let's make sure we understand what we're working with\n2. I'll break it down into smaller, manageable parts\n3. We'll look at examples to see how it works\n4. Then you can try one yourself!\n\nCan you tell me more specifically what you'd like explained? For example, is it a formula, a method, or a type of problem?`,
          suggestions: ['Show me an example', 'What formula do I use?', 'Step by step please'],
        };
      }
      if (category === 'solve') {
        return {
          message: `Let's solve this maths problem together!\n\n**Problem-solving steps:**\n1. **Read carefully** - What are we asked to find?\n2. **Identify given information** - What numbers/values do we have?\n3. **Choose a method** - What formula or approach fits?\n4. **Work step by step** - Show all working!\n5. **Check the answer** - Does it make sense?\n\nShare the problem with me and I'll guide you through it.`,
          suggestions: ['Check my working', 'What method should I use?', 'Is my answer right?'],
        };
      }
      if (category === 'practice') {
        return {
          message: `Great idea to practice maths${levelText}! Regular practice builds confidence and speed.\n\n**Practice approach:**\n• Start with problems you're comfortable with\n• Gradually increase difficulty\n• Time yourself to build exam speed\n• Review any mistakes carefully\n\nWhat specific maths topic would you like to practice? (e.g., algebra, fractions, equations, geometry)`,
          suggestions: ['Algebra practice', 'Equation problems', 'Word problems'],
        };
      }
    }

    // English-specific responses
    if (subject === 'english') {
      if (category === 'explain') {
        return {
          message: `Let me help you understand ${topic || 'this English concept'}${levelText}.\n\n**English is about:**\n• Understanding how language works\n• Expressing ideas clearly\n• Analysing texts and their meanings\n\nWhat specifically would you like me to explain? For example:\n• Grammar rules\n• Literary techniques\n• Essay writing\n• Comprehension strategies`,
          suggestions: ['Grammar help', 'Essay structure', 'Literary techniques'],
        };
      }
      if (category === 'homework' || category === 'solve') {
        return {
          message: `Let's work on your English task together!\n\n**Before we start:**\n• What type of task is it? (essay, comprehension, grammar exercise)\n• What are the key requirements?\n• Do you have a specific question or passage to work with?\n\nShare the details and I'll guide you through it step by step.`,
          suggestions: ['Essay help', 'Comprehension help', 'Grammar check'],
        };
      }
    }

    // Science-specific responses
    if (subject === 'science') {
      if (category === 'explain') {
        return {
          message: `Let me help you understand ${topic || 'this science concept'}${levelText}.\n\n**Science explanations work best when we:**\n1. Start with what you already know\n2. Build up to the new concept\n3. Use real-world examples\n4. Draw diagrams where helpful\n\nWhich area of science is this from?\n• Physics (forces, energy, waves, electricity)\n• Chemistry (atoms, reactions, elements)\n• Biology (cells, organisms, systems)\n\nTell me more and I'll explain it clearly!`,
          suggestions: ['Physics help', 'Chemistry help', 'Biology help'],
        };
      }
    }

    return null;
  }

  private getCategoryResponse(
    category: SageIntentCategory,
    topic: string,
    subjectName: string,
    levelName: string
  ): { message: string; suggestions: string[] } {
    const responses: Record<SageIntentCategory, { message: string; suggestions: string[] }> = {
      explain: {
        message: `I'd love to help you understand ${topic}!\n\n**Let's approach this together:**\n1. What do you already know about ${topic}?\n2. Is there a specific part that's confusing?\n3. Would examples help?\n\nThe more you tell me about what you're stuck on, the better I can help. What specifically would you like me to explain?`,
        suggestions: ['Start from the basics', 'Give me an example', 'Why is this important?'],
      },
      solve: {
        message: `Let's work through this problem step by step!\n\n**My approach:**\n1. First, identify what we're asked to find\n2. List the information we have\n3. Choose the right method\n4. Work through carefully\n5. Check our answer\n\nCan you share the problem details? I'll guide you through the solution.`,
        suggestions: ['Show the steps', 'Check my work', 'Explain the method'],
      },
      practice: {
        message: `Great idea to practice! Practice is key to mastering any subject.\n\n**Effective practice:**\n• Start with what you know, then push further\n• Mix different types of questions\n• Time yourself for exam prep\n• Always review mistakes\n\nWhat specific topic in ${subjectName} would you like to practice?`,
        suggestions: ['Easy questions', 'Medium difficulty', 'Challenge me'],
      },
      diagnose: {
        message: `Let's figure out where things went wrong!\n\n**Common mistake areas:**\n• Misreading the question\n• Calculation errors\n• Missing a step\n• Using the wrong method\n\nCan you show me your working? I'll help identify exactly where the issue is.`,
        suggestions: ['Check my method', 'Where did I go wrong?', 'Common mistakes'],
      },
      review: {
        message: `Let's review ${topic} together!\n\n**Good review includes:**\n• Key concepts and definitions\n• Important formulas or rules\n• Worked examples\n• Common exam questions\n\nWhat aspect of ${topic} would you like to focus on?`,
        suggestions: ['Key points', 'Summary', 'Quick quiz'],
      },
      homework: {
        message: `I'm here to help with your homework!\n\n**My approach:**\n• I'll guide you, not give you answers\n• Understanding beats just finishing\n• We'll work through it together\n\nTell me about the homework question and I'll help you figure it out.`,
        suggestions: ['Help me start', 'Explain the question', 'Check my answer'],
      },
      exam: {
        message: `Let's prepare for your exam!\n\n**Exam preparation tips:**\n• Review past papers\n• Focus on weak areas\n• Practice under timed conditions\n• Get enough sleep before!\n\nFor ${levelName} ${subjectName}, what topics do you want to focus on?`,
        suggestions: ['Key topics', 'Past paper practice', 'Exam techniques'],
      },
      resources: {
        message: `Looking for learning resources for ${subjectName}?\n\n**Useful resources:**\n• Your course textbook and notes\n• Past exam papers (great for practice!)\n• Educational videos\n• Practice worksheets\n\nWhat type of resource would help you most?`,
        suggestions: ['Videos', 'Practice papers', 'Reading materials'],
      },
      progress: {
        message: `Tracking your progress is important!\n\n**To see your learning journey:**\n• Check your session history\n• Review topics you've covered\n• Identify areas for improvement\n\nYour detailed progress is available in the Progress tab.`,
        suggestions: ['View history', 'Set goals', 'Areas to improve'],
      },
      general: {
        message: `I'm here to help with your learning! I can:\n\n• **Explain** concepts clearly\n• **Solve** problems step by step\n• **Practice** with you\n• **Review** topics\n• **Prepare** you for exams\n\nWhat would you like to work on?`,
        suggestions: ['Explain something', 'Practice questions', 'Study tips'],
      },
    };

    return responses[category] || responses.general;
  }
}

export default SageRulesProvider;
