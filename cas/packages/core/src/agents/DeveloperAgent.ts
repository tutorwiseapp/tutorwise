/**
 * Developer Agent - Code generation, bug fixing, refactoring
 *
 * Uses Claude API (primary) or Gemini (fallback) for code generation
 */

import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AgentExecutorInterface, AgentExecutionContext, AgentExecutionResult, AgentCapability } from './AgentExecutorInterface';

export class DeveloperAgent implements AgentExecutorInterface {
  readonly agentId = 'developer';
  readonly name = 'Developer Agent';
  readonly description = 'AI agent specialized in code generation, bug fixing, and refactoring';

  private claude: Anthropic | null = null;
  private gemini: GoogleGenerativeAI | null = null;
  private aiProvider: 'claude' | 'gemini' | null = null;

  readonly capabilities: AgentCapability[] = [
    { name: 'generate_code', description: 'Generate code from specifications' },
    { name: 'fix_bug', description: 'Analyze and fix bugs in code' },
    { name: 'refactor_code', description: 'Refactor code for better quality' },
    { name: 'review_code', description: 'Perform code review and suggest improvements' }
  ];

  async initialize(): Promise<void> {
    console.log(`[${this.agentId}] Initializing Developer Agent...`);

    // Try Claude first (best for code generation)
    const claudeKey = process.env.ANTHROPIC_API_KEY;
    if (claudeKey && claudeKey.trim().length > 0) {
      this.claude = new Anthropic({ apiKey: claudeKey });
      this.aiProvider = 'claude';
      console.log(`[${this.agentId}] Claude AI client initialized (primary)`);
    } else {
      // Fallback to Gemini
      const geminiKey = process.env.GOOGLE_AI_API_KEY;
      if (geminiKey && geminiKey.trim().length > 0) {
        this.gemini = new GoogleGenerativeAI(geminiKey);
        this.aiProvider = 'gemini';
        console.log(`[${this.agentId}] Gemini AI client initialized (fallback - Claude key not found)`);
      } else {
        console.warn(`[${this.agentId}] No AI API keys found - agent will run in offline mode`);
      }
    }

    console.log(`[${this.agentId}] Initialized successfully`);
  }

  async execute(context: AgentExecutionContext): Promise<AgentExecutionResult> {
    const { taskId, input, onProgress, onLog } = context;
    const action = input.action;

    try {
      onLog?.('info', `Starting task ${taskId}`, { input });
      onProgress?.(0.1, 'Analyzing request...');

      let result;
      switch (action) {
        case 'generate_code':
          result = await this.generateCode(input, context);
          break;
        case 'fix_bug':
          result = await this.fixBug(input, context);
          break;
        case 'refactor_code':
          result = await this.refactorCode(input, context);
          break;
        case 'review_code':
          result = await this.reviewCode(input, context);
          break;
        default:
          throw new Error(`Unknown action: ${action}`);
      }

      onProgress?.(1.0, 'Task completed');
      onLog?.('info', `Task ${taskId} completed successfully`);

      return {
        output: result,
        status: 'success',
        metadata: {
          action,
          aiProvider: this.aiProvider,
          completedAt: new Date().toISOString()
        }
      };
    } catch (error: any) {
      onLog?.('error', `Task ${taskId} failed: ${error.message}`, { error });
      return {
        output: {},
        status: 'error',
        error: error.message
      };
    }
  }

  // ============================================================================
  // AI-Powered Code Generation Methods
  // ============================================================================

  private async generateCode(input: any, context: AgentExecutionContext): Promise<any> {
    const { description, language = 'typescript', include_tests = true, include_docs = true } = input;

    context.onProgress?.(0.3, 'Preparing code generation...');

    // If no AI available, return placeholder
    if (!this.claude && !this.gemini) {
      context.onLog?.('warn', 'Running in offline mode - returning placeholder code');

      return {
        language,
        code: `// Generated code for: ${description}\nfunction newFunction() {\n  // TODO: Implement logic\n  return true;\n}`,
        tests: include_tests ? `test('should work', () => {\n  expect(newFunction()).toBe(true);\n});` : null,
        documentation: include_docs ? `/**\n * ${description}\n * @returns {boolean}\n */` : null,
        ai_generated: false
      };
    }

    try {
      context.onLog?.('info', `Generating code with ${this.aiProvider}`);
      context.onProgress?.(0.5, 'Requesting AI code generation...');

      const prompt = `Generate ${language} code for the following specification:

${description}

Requirements:
- Language: ${language}
- Include well-structured, production-ready code
- Follow best practices and conventions for ${language}
${include_tests ? '- Include comprehensive unit tests' : ''}
${include_docs ? '- Include inline documentation and JSDoc/TSDoc comments' : ''}
- Use modern syntax and patterns
- Include error handling where appropriate

Please provide a JSON response in the following format:
{
  "code": "// Your generated code here",
  ${include_tests ? '"tests": "// Your test code here",' : ''}
  ${include_docs ? '"documentation": "// Documentation comments",' : ''}
  "explanation": "Brief explanation of the implementation"
}`;

      let responseText: string;

      if (this.aiProvider === 'claude' && this.claude) {
        const response = await this.claude.messages.create({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 4096,
          temperature: 0.2,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        });

        responseText = response.content[0].type === 'text' ? response.content[0].text : '';
      } else if (this.aiProvider === 'gemini' && this.gemini) {
        const model = this.gemini.getGenerativeModel({
          model: 'gemini-2.0-flash',
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 4096
          }
        });

        const result = await model.generateContent(prompt);
        responseText = result.response.text();
      } else {
        throw new Error('No AI provider available');
      }

      context.onProgress?.(0.9, 'Processing generated code...');

      // Parse JSON response
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);

          return {
            language,
            code: parsed.code || '// Code generation failed',
            tests: include_tests ? parsed.tests : null,
            documentation: include_docs ? parsed.documentation : null,
            explanation: parsed.explanation || 'No explanation provided',
            ai_generated: true,
            model: this.aiProvider === 'claude' ? 'claude-sonnet-4-5' : 'gemini-2.0-flash'
          };
        }
      } catch (parseError) {
        context.onLog?.('warn', 'Could not parse JSON, returning raw response');
      }

      // Fallback: return raw response
      return {
        language,
        code: responseText,
        tests: null,
        documentation: null,
        explanation: 'Raw AI output (JSON parsing failed)',
        ai_generated: true,
        model: this.aiProvider
      };

    } catch (error: any) {
      context.onLog?.('error', `Code generation failed: ${error.message}`, { error });

      return {
        language,
        code: `// Code generation failed: ${error.message}`,
        tests: null,
        documentation: null,
        ai_generated: false,
        error: error.message
      };
    }
  }

  private async fixBug(input: any, context: AgentExecutionContext): Promise<any> {
    const { code, bug_description, file, line } = input;

    context.onProgress?.(0.5, 'Analyzing bug...');

    // Placeholder implementation (can be enhanced with AI)
    return {
      bug_description,
      root_cause: 'Analysis in progress',
      fix: {
        file: file || 'unknown.ts',
        line: line || 0,
        original: code?.substring(0, 100) || 'N/A',
        fixed: '// AI-powered fix here',
        explanation: 'Bug fix implementation pending'
      },
      tests_added: false,
      verified: false,
      ai_generated: this.aiProvider !== null
    };
  }

  private async refactorCode(input: any, context: AgentExecutionContext): Promise<any> {
    const { code, objectives = [] } = input;

    context.onProgress?.(0.5, 'Refactoring code...');

    // Placeholder implementation
    return {
      improvements: [
        { type: 'Pending', description: 'AI-powered refactoring in progress', impact: 'pending' }
      ],
      metrics: {
        complexity_before: 0,
        complexity_after: 0,
        lines_of_code_before: code?.split('\n').length || 0,
        lines_of_code_after: 0,
        test_coverage_before: 0,
        test_coverage_after: 0
      },
      ai_generated: this.aiProvider !== null
    };
  }

  private async reviewCode(input: any, context: AgentExecutionContext): Promise<any> {
    const { code, focus_areas = [] } = input;

    context.onProgress?.(0.5, 'Reviewing code...');

    // Placeholder implementation
    return {
      overall_quality: 'pending_review',
      issues: [],
      suggestions: ['AI-powered code review in progress'],
      score: 0,
      ai_generated: this.aiProvider !== null
    };
  }

  validateInput(capability: string, input: any): boolean { return true; }
  async getHealth(): Promise<{ healthy: boolean; message?: string }> {
    return {
      healthy: true,
      message: `AI Provider: ${this.aiProvider || 'offline'}`
    };
  }
  async cleanup(): Promise<void> {
    console.log(`[${this.agentId}] Cleaning up resources...`);
  }
}
