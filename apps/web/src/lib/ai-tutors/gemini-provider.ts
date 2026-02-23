/**
 * Filename: gemini-provider.ts
 * Purpose: Gemini Provider wrapper for AI Tutors
 * Created: 2026-02-23
 * Version: v1.0
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  content: string;
  sources?: string[];
}

/**
 * Simple Gemini provider for AI tutor chat
 */
export class GeminiProvider {
  private genAI: GoogleGenerativeAI;
  private model: string;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = 'gemini-2.0-flash-exp';
  }

  /**
   * Send a chat message and get response
   */
  async chat(
    message: string,
    history: ChatMessage[] = [],
    context?: string
  ): Promise<ChatResponse> {
    try {
      const model = this.genAI.getGenerativeModel({ model: this.model });

      // Build prompt with context
      let prompt = '';
      if (context) {
        prompt += `Context:\n${context}\n\n`;
      }

      // Add history
      if (history.length > 0) {
        prompt += 'Conversation History:\n';
        for (const msg of history.slice(-10)) {
          // Last 10 messages
          prompt += `${msg.role === 'user' ? 'Student' : 'Tutor'}: ${msg.content}\n`;
        }
        prompt += '\n';
      }

      // Add current message
      prompt += `Student: ${message}\nTutor:`;

      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      return {
        content: text,
        sources: [],
      };
    } catch (error) {
      console.error('Gemini API error:', error);
      throw new Error('Failed to generate response');
    }
  }

  /**
   * Stream chat response using Gemini's streaming API
   */
  async *streamChat(
    message: string,
    history: ChatMessage[] = [],
    context?: string
  ): AsyncGenerator<string> {
    try {
      const model = this.genAI.getGenerativeModel({ model: this.model });

      // Build prompt with context
      let prompt = '';
      if (context) {
        prompt += `Context:\n${context}\n\n`;
      }

      if (history.length > 0) {
        prompt += 'Conversation History:\n';
        for (const msg of history.slice(-10)) {
          prompt += `${msg.role === 'user' ? 'Student' : 'Tutor'}: ${msg.content}\n`;
        }
        prompt += '\n';
      }

      prompt += `Student: ${message}\nTutor:`;

      const result = await model.generateContentStream(prompt);

      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) {
          yield text;
        }
      }
    } catch (error) {
      console.error('Gemini streaming error:', error);
      throw new Error('Failed to stream response');
    }
  }
}
