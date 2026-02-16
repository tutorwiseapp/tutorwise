/**
 * AI Query Parser API Route
 * Uses Gemini AI to parse natural language queries into structured filters
 */

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = process.env.GOOGLE_AI_API_KEY
  ? new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY)
  : null;

interface ParsedQuery {
  subjects?: string[];
  levels?: string[];
  location?: string;
  locationType?: 'online' | 'in_person' | 'hybrid';
  minPrice?: number;
  maxPrice?: number;
  availability?: string;
  freeTrialOnly?: boolean;
  intent: 'search' | 'browse' | 'specific_request';
  confidence: number;
  interpretedQuery: string;
}

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    // If Gemini API is not configured, use fallback parser
    if (!genAI || !process.env.GOOGLE_AI_API_KEY) {
      console.warn('Gemini API not configured, using fallback parser');
      const fallbackResult = fallbackParser(query);
      return NextResponse.json(fallbackResult);
    }

    // Use Gemini to parse the query
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `You are an AI assistant helping parse natural language queries for a tutoring marketplace.

Parse the following user query into structured search filters. Extract:
- subjects: Array of academic subjects (e.g., ["Mathematics", "Physics"])
- levels: Array of education levels (e.g., ["GCSE", "A-Level", "Primary", "KS3", "University", "Adult Learning"])
- location: City name if mentioned (e.g., "London")
- locationType: "online", "in_person", or "both" if mentioned
- minPrice: Minimum hourly rate in GBP if mentioned
- maxPrice: Maximum hourly rate in GBP if mentioned
- freeTrialOnly: true if user mentions wanting a free trial
- intent: "search", "browse", or "specific_request"
- confidence: 0-1 score of how confident you are in the parsing
- interpretedQuery: A friendly rephrasing of what the user is looking for

User query: "${query}"

Respond ONLY with valid JSON in this exact format (no markdown, no code blocks):
{"subjects":[],"levels":[],"location":"","locationType":"","minPrice":null,"maxPrice":null,"freeTrialOnly":false,"intent":"search","confidence":0.9,"interpretedQuery":""}

If a field is not mentioned or unclear, omit it or use null/empty values.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text().trim();

    // Remove markdown code blocks if present
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    try {
      const parsed = JSON.parse(text) as ParsedQuery;

      // Validate and clean the parsed data
      const cleaned: ParsedQuery = {
        intent: parsed.intent || 'search',
        confidence: Math.max(0, Math.min(1, parsed.confidence || 0.8)),
        interpretedQuery: parsed.interpretedQuery || query,
      };

      if (parsed.subjects && Array.isArray(parsed.subjects) && parsed.subjects.length > 0) {
        cleaned.subjects = parsed.subjects;
      }

      if (parsed.levels && Array.isArray(parsed.levels) && parsed.levels.length > 0) {
        cleaned.levels = parsed.levels;
      }

      if (parsed.location && typeof parsed.location === 'string') {
        cleaned.location = parsed.location;
      }

      if (parsed.locationType && ['online', 'in_person', 'hybrid'].includes(parsed.locationType)) {
        cleaned.locationType = parsed.locationType;
      }

      if (parsed.minPrice && typeof parsed.minPrice === 'number') {
        cleaned.minPrice = parsed.minPrice;
      }

      if (parsed.maxPrice && typeof parsed.maxPrice === 'number') {
        cleaned.maxPrice = parsed.maxPrice;
      }

      if (parsed.freeTrialOnly === true) {
        cleaned.freeTrialOnly = true;
      }

      return NextResponse.json(cleaned);
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', text, parseError);
      // Fall back to basic parser
      const fallbackResult = fallbackParser(query);
      return NextResponse.json(fallbackResult);
    }
  } catch (error) {
    console.error('AI query parsing error:', error);

    // Return fallback parsing on error
    const { query } = await request.json();
    const fallbackResult = fallbackParser(query);
    return NextResponse.json(fallbackResult);
  }
}

/**
 * Fallback parser when Gemini is unavailable
 */
function fallbackParser(query: string): ParsedQuery {
  const lowerQuery = query.toLowerCase();

  const subjects: string[] = [];
  const subjectKeywords: Record<string, string> = {
    'math': 'Mathematics',
    'maths': 'Mathematics',
    'mathematics': 'Mathematics',
    'english': 'English',
    'science': 'Science',
    'physics': 'Physics',
    'chemistry': 'Chemistry',
    'biology': 'Biology',
    'history': 'History',
    'geography': 'Geography',
    'spanish': 'Languages',
    'french': 'Languages',
    'german': 'Languages',
    'music': 'Music',
    'piano': 'Music',
    'art': 'Art',
  };

  for (const [keyword, subject] of Object.entries(subjectKeywords)) {
    if (lowerQuery.includes(keyword) && !subjects.includes(subject)) {
      subjects.push(subject);
    }
  }

  const levels: string[] = [];
  const levelKeywords: Record<string, string> = {
    'gcse': 'GCSE',
    'a-level': 'A-Level',
    'a level': 'A-Level',
    'primary': 'Primary',
    'ks3': 'KS3',
    'university': 'University',
    'adult': 'Adult Learning',
  };

  for (const [keyword, level] of Object.entries(levelKeywords)) {
    if (lowerQuery.includes(keyword) && !levels.includes(level)) {
      levels.push(level);
    }
  }

  let locationType: 'online' | 'in_person' | 'hybrid' | undefined;
  if (lowerQuery.includes('online') || lowerQuery.includes('remote')) {
    locationType = 'online';
  } else if (lowerQuery.includes('in person') || lowerQuery.includes('in-person')) {
    locationType = 'in_person';
  } else if (lowerQuery.includes('hybrid') || lowerQuery.includes('both')) {
    locationType = 'hybrid';
  }

  const freeTrialOnly = lowerQuery.includes('free trial');

  const result: ParsedQuery = {
    intent: 'search',
    confidence: 0.6,
    interpretedQuery: query,
  };

  if (subjects.length > 0) result.subjects = subjects;
  if (levels.length > 0) result.levels = levels;
  if (locationType) result.locationType = locationType;
  if (freeTrialOnly) result.freeTrialOnly = true;

  return result;
}
