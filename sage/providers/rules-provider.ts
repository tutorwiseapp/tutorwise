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

// --- Intent Patterns ---

interface IntentPattern {
  patterns: string[];
  category: SageIntentCategory;
  action: string;
}

const INTENT_PATTERNS: IntentPattern[] = [
  // Learning intents
  { patterns: ['explain', 'what is', 'how does', 'why', 'understand', 'meaning'], category: 'explain', action: 'explain' },
  { patterns: ['solve', 'calculate', 'work out', 'find', 'compute', 'answer'], category: 'solve', action: 'solve' },
  { patterns: ['practice', 'exercise', 'quiz', 'test me', 'questions'], category: 'practice', action: 'generate' },
  { patterns: ['wrong', 'mistake', 'error', 'incorrect', 'why not'], category: 'diagnose', action: 'diagnose' },
  { patterns: ['review', 'revise', 'go over', 'summary', 'recap'], category: 'review', action: 'review' },
  { patterns: ['homework', 'assignment', 'coursework'], category: 'homework', action: 'help' },
  { patterns: ['exam', 'test', 'gcse', 'a-level', 'preparation'], category: 'exam', action: 'prepare' },
  { patterns: ['resource', 'material', 'book', 'video', 'learn more'], category: 'resources', action: 'find' },
  { patterns: ['progress', 'how am i', 'improve', 'doing well'], category: 'progress', action: 'view' },
];

// --- Subject Detection ---

const SUBJECT_PATTERNS: Record<SageSubject, string[]> = {
  maths: ['math', 'maths', 'algebra', 'geometry', 'calculus', 'equation', 'number', 'fraction', 'percentage', 'graph', 'formula'],
  english: ['english', 'grammar', 'writing', 'essay', 'literature', 'poem', 'story', 'vocabulary', 'spelling', 'reading'],
  science: ['science', 'physics', 'chemistry', 'biology', 'experiment', 'atom', 'cell', 'force', 'energy', 'reaction'],
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

    // Generate response based on intent
    const response = this.generateResponse(detectedIntent, persona, subject, level);

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
      await new Promise(resolve => setTimeout(resolve, 20));
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

    // Detect category
    let detectedCategory: SageIntentCategory = 'general';
    let detectedAction = 'chat';
    let confidence = 0.5;

    for (const pattern of INTENT_PATTERNS) {
      if (pattern.patterns.some(p => lowerMessage.includes(p))) {
        detectedCategory = pattern.category;
        detectedAction = pattern.action;
        confidence = 0.7;
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
    const aboutMatch = message.match(/about\s+([^?.,]+)/i);
    if (aboutMatch) return aboutMatch[1].trim();

    const explainMatch = message.match(/explain\s+([^?.,]+)/i);
    if (explainMatch) return explainMatch[1].trim();

    const whatMatch = message.match(/what\s+(?:is|are)\s+([^?.,]+)/i);
    if (whatMatch) return whatMatch[1].trim();

    const solveMatch = message.match(/solve\s+([^?.,]+)/i);
    if (solveMatch) return solveMatch[1].trim();

    return undefined;
  }

  private getGreeting(persona: SagePersona, subject?: SageSubject): string {
    const subjectText = subject && subject !== 'general' ? ` with ${subject}` : '';

    const greetings: Record<SagePersona, string> = {
      student: `Hello! I'm Sage, your AI tutor. I'm here to help you learn${subjectText}. What would you like to explore today?`,
      tutor: `Hi! I'm Sage, your teaching assistant. I can help you prepare lessons, create worksheets, and identify student misconceptions${subjectText}. How can I assist?`,
      client: `Welcome! I'm Sage. I can help you understand your child's learning progress${subjectText} and suggest ways to support their education at home.`,
      agent: `Hello! I'm Sage, here to assist with educational queries${subjectText}. How can I help?`,
    };

    return greetings[persona];
  }

  private getDefaultSuggestions(persona: SagePersona, subject?: SageSubject): string[] {
    const subjectSuggestions: Record<SageSubject, string[]> = {
      maths: ['Help me solve an equation', 'Explain fractions', 'Practice algebra'],
      english: ['Check my grammar', 'Explain a literary term', 'Help with essay writing'],
      science: ['Explain a concept', 'Help with an experiment', 'Physics problem'],
      general: ['Help with homework', 'Explain a topic', 'Practice questions'],
    };

    const personaSuggestions: Record<SagePersona, string[]> = {
      student: subject ? subjectSuggestions[subject] : ['Help with homework', 'Explain something', 'Practice problems'],
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
    level?: SageLevel
  ): { message: string; suggestions: string[] } {
    const topic = intent.entities?.topic || 'this topic';
    const subjectName = subject || 'the subject';
    const levelName = level || 'your level';

    // Response templates based on intent category
    const responses: Record<SageIntentCategory, { message: string; suggestions: string[] }> = {
      explain: {
        message: `I'd love to help explain ${topic}!\n\nWhile I'm in offline mode, I can provide basic guidance. For a detailed explanation, please ensure an AI provider (Claude or Gemini) is configured.\n\n**In the meantime:**\n- Break the concept into smaller parts\n- Look for patterns or connections\n- Try to explain it in your own words\n\nWould you like to try explaining what you already know about ${topic}?`,
        suggestions: ['Tell me what you know', 'Give me a hint', 'Show an example'],
      },
      solve: {
        message: `Let's work through this problem together!\n\n**Problem-solving approach:**\n1. Identify what we're asked to find\n2. List the information given\n3. Choose a method or formula\n4. Work through step by step\n5. Check the answer\n\nCan you tell me what information you have, and what you need to find?`,
        suggestions: ['Show me the steps', 'Check my work', 'Give me a hint'],
      },
      practice: {
        message: `Practice makes perfect! Here are some ways to practice ${subjectName}:\n\n**Practice strategies:**\n- Start with easier problems and work up\n- Time yourself to build speed\n- Review mistakes to learn from them\n- Mix different types of questions\n\nWhen the AI provider is available, I can generate custom practice problems for you at ${levelName} level.`,
        suggestions: ['Easy questions', 'Medium difficulty', 'Challenge me'],
      },
      diagnose: {
        message: `Let's figure out where things went wrong!\n\n**Debugging approach:**\n1. Check each step carefully\n2. Look for common mistakes\n3. Verify calculations\n4. Re-read the question\n\nCan you show me your working so we can identify the issue?`,
        suggestions: ['Show my working', 'Common mistakes', 'Check my method'],
      },
      review: {
        message: `Great idea to review! Here's a structured approach:\n\n**Review checklist for ${topic}:**\n- Key definitions and concepts\n- Important formulas or rules\n- Example problems\n- Common pitfalls\n\nWhat specific aspect would you like to focus on?`,
        suggestions: ['Key concepts', 'Practice questions', 'Summary'],
      },
      homework: {
        message: `I'm here to help with your homework!\n\n**Remember:**\n- I'll guide you, not give you answers directly\n- Understanding is more important than finishing\n- It's okay to make mistakes - that's how we learn\n\nTell me about the homework question and I'll help you work through it.`,
        suggestions: ['Help me start', 'Check my answer', 'Explain the method'],
      },
      exam: {
        message: `Let's prepare for your exam!\n\n**Exam preparation tips:**\n- Review key topics and formulas\n- Practice past papers\n- Time yourself\n- Focus on weak areas\n\nFor ${levelName} ${subjectName}, what topics do you want to focus on?`,
        suggestions: ['Key topics', 'Practice questions', 'Exam techniques'],
      },
      resources: {
        message: `I can help you find learning resources!\n\n**Useful resources for ${subjectName}:**\n- Your course textbook and notes\n- Past exam papers\n- Online tutorials and videos\n- Practice worksheets\n\nWhat type of resource would be most helpful?`,
        suggestions: ['Videos', 'Practice papers', 'Reading materials'],
      },
      progress: {
        message: `Tracking your progress is important!\n\n**To see your progress:**\n- Check your completed sessions in Sage History\n- Review topics you've covered\n- Note areas for improvement\n\nYour detailed progress data is available in the Progress tab.`,
        suggestions: ['View history', 'Set goals', 'Areas to improve'],
      },
      general: {
        message: `Hello! I'm Sage, your AI tutor.\n\nI can help you with:\n- **Explaining** concepts and ideas\n- **Solving** problems step by step\n- **Practicing** with questions\n- **Reviewing** material\n- **Preparing** for exams\n\nWhat would you like help with today?`,
        suggestions: ['Explain something', 'Help me practice', 'Review a topic'],
      },
    };

    return responses[intent.category] || responses.general;
  }
}

export default SageRulesProvider;
