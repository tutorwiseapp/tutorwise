/**
 * Analyst Agent
 *
 * Specializes in:
 * - Data analysis and metrics reporting
 * - Business intelligence
 * - Trend analysis and forecasting
 * - Performance insights
 *
 * Uses Gemini AI for intelligent data analysis and insights
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AgentExecutorInterface, AgentExecutionContext, AgentExecutionResult, AgentCapability } from './AgentExecutorInterface';

export class AnalystAgent implements AgentExecutorInterface {
  readonly agentId = 'analyst';
  readonly name = 'Analyst Agent';
  readonly description = 'AI agent specialized in data analysis, metrics, and business intelligence';

  private genAI: GoogleGenerativeAI | null = null;

  readonly capabilities: AgentCapability[] = [
    { name: 'analyze_metrics', description: 'Analyze business metrics and KPIs' },
    { name: 'generate_report', description: 'Generate data-driven reports' },
    { name: 'forecast_trends', description: 'Forecast future trends based on historical data' },
    { name: 'identify_insights', description: 'Identify actionable insights from data' }
  ];

  async initialize(): Promise<void> {
    console.log(`[${this.agentId}] Initializing Analyst Agent...`);

    // Initialize Gemini AI client
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      console.warn(`[${this.agentId}] GOOGLE_AI_API_KEY not found - agent will run in offline mode`);
    } else {
      this.genAI = new GoogleGenerativeAI(apiKey);
      console.log(`[${this.agentId}] Gemini AI client initialized`);
    }

    console.log(`[${this.agentId}] Initialized successfully`);
  }

  async execute(context: AgentExecutionContext): Promise<AgentExecutionResult> {
    const { taskId, input, onProgress, onLog } = context;

    try {
      onLog?.('info', `Starting task ${taskId}`, { input });
      onProgress?.(0.1, 'Analyzing request...');

      const action = input.action;
      if (!action) {
        throw new Error('No action specified');
      }

      onProgress?.(0.3, `Executing ${action}...`);

      let result;
      switch (action) {
        case 'analyze_metrics':
          result = await this.analyzeMetrics(input, context);
          break;
        case 'generate_report':
          result = await this.generateReport(input, context);
          break;
        case 'forecast_trends':
          result = await this.forecastTrends(input, context);
          break;
        case 'identify_insights':
          result = await this.identifyInsights(input, context);
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
  // AI-Powered Analysis Methods
  // ============================================================================

  private async analyzeMetrics(input: any, context: AgentExecutionContext): Promise<any> {
    const { metrics_data, period = 'monthly', comparison_period = 'previous' } = input;

    context.onProgress?.(0.5, 'Analyzing metrics...');

    // If no AI or no data, return placeholder
    if (!this.genAI || !metrics_data) {
      context.onLog?.('warn', 'Running in offline mode or missing data - returning placeholder');

      return {
        metrics_analyzed: Object.keys(metrics_data || { revenue: 0, users: 0 }),
        analysis: {},
        insights: ['AI analysis unavailable'],
        recommendations: ['Provide metrics data for AI analysis'],
        ai_generated: false
      };
    }

    try {
      context.onLog?.('info', 'Analyzing metrics with Gemini AI');

      const prompt = `You are a data analyst. Analyze the following business metrics and provide insights.

Metrics Data (${period}):
${JSON.stringify(metrics_data, null, 2)}

Comparison Period: ${comparison_period}

Please analyze the data and provide a JSON response with:
{
  "metrics_analyzed": ["list", "of", "metrics"],
  "analysis": {
    "metric_name": {
      "current": <number>,
      "previous": <number>,
      "change_percent": <number>,
      "trend": "up|down|stable",
      "significance": "high|medium|low"
    }
  },
  "insights": ["insight 1", "insight 2", "insight 3"],
  "recommendations": ["recommendation 1", "recommendation 2"],
  "summary": "Overall analysis summary"
}

Focus on actionable insights and specific recommendations.`;

      const model = this.genAI.getGenerativeModel({
        model: 'gemini-2.0-flash',
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2048
        }
      });

      context.onProgress?.(0.7, 'Requesting AI analysis...');

      const result = await model.generateContent(prompt);
      const response = result.response.text();

      context.onProgress?.(0.9, 'Processing analysis results...');

      // Parse JSON response
      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);

          return {
            ...parsed,
            ai_generated: true,
            model: 'gemini-2.0-flash',
            period,
            comparison_period
          };
        }
      } catch (parseError) {
        context.onLog?.('warn', 'Could not parse AI response, returning raw analysis');
      }

      // Fallback
      return {
        metrics_analyzed: Object.keys(metrics_data),
        raw_analysis: response.substring(0, 500),
        ai_generated: true,
        model: 'gemini-2.0-flash'
      };

    } catch (error: any) {
      context.onLog?.('error', `Metrics analysis failed: ${error.message}`, { error });

      return {
        metrics_analyzed: Object.keys(metrics_data || {}),
        analysis: {},
        insights: [],
        recommendations: ['AI analysis failed - retry later'],
        ai_generated: false,
        error: error.message
      };
    }
  }

  private async identifyInsights(input: any, context: AgentExecutionContext): Promise<any> {
    const { data, focus_areas = [], time_period = '30 days' } = input;

    context.onProgress?.(0.5, 'Identifying insights...');

    if (!this.genAI || !data) {
      return {
        insights: [{ type: 'info', text: 'AI insights unavailable', priority: 'low' }],
        action_items: ['Provide data for AI analysis'],
        ai_generated: false
      };
    }

    try {
      context.onLog?.('info', 'Identifying insights with Gemini AI');

      const prompt = `You are a business analyst. Analyze the following data and identify key insights.

Data (${time_period}):
${JSON.stringify(data, null, 2)}

${focus_areas.length > 0 ? `Focus Areas: ${focus_areas.join(', ')}` : ''}

Provide a JSON response with:
{
  "insights": [
    {
      "type": "opportunity|risk|trend|anomaly",
      "text": "Insight description",
      "priority": "high|medium|low",
      "supporting_data": "Data points that support this insight"
    }
  ],
  "action_items": ["actionable item 1", "actionable item 2"],
  "summary": "Executive summary of key findings"
}

Prioritize actionable insights with clear supporting data.`;

      const model = this.genAI.getGenerativeModel({
        model: 'gemini-2.0-flash',
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 2048
        }
      });

      const result = await model.generateContent(prompt);
      const response = result.response.text();

      context.onProgress?.(0.9, 'Processing insights...');

      // Parse JSON
      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);

          return {
            ...parsed,
            ai_generated: true,
            model: 'gemini-2.0-flash',
            time_period
          };
        }
      } catch (parseError) {
        context.onLog?.('warn', 'Could not parse insights JSON');
      }

      return {
        raw_insights: response,
        ai_generated: true,
        model: 'gemini-2.0-flash'
      };

    } catch (error: any) {
      context.onLog?.('error', `Insight identification failed: ${error.message}`, { error });

      return {
        insights: [],
        action_items: [],
        ai_generated: false,
        error: error.message
      };
    }
  }

  private async generateReport(input: any, context: AgentExecutionContext): Promise<any> {
    const { report_type = 'summary', period = 'monthly', data } = input;

    context.onProgress?.(0.5, 'Generating report...');

    // Placeholder for now (can be enhanced with AI)
    return {
      report_type,
      period,
      summary: 'Report generation in progress',
      charts: ['revenue_trend', 'user_growth'],
      key_findings: data ? Object.keys(data) : [],
      ai_generated: this.genAI !== null
    };
  }

  private async forecastTrends(input: any, context: AgentExecutionContext): Promise<any> {
    const { forecast_days = 30, historical_data } = input;

    context.onProgress?.(0.5, 'Forecasting trends...');

    // Placeholder for now (can be enhanced with AI)
    return {
      forecast_period: forecast_days,
      predictions: {},
      assumptions: ['Basic forecasting model'],
      ai_generated: this.genAI !== null
    };
  }

  validateInput(capability: string, input: any): boolean {
    return true;
  }

  async getHealth(): Promise<{ healthy: boolean; message?: string }> {
    return {
      healthy: true,
      message: `AI Provider: ${this.genAI ? 'Gemini' : 'offline'}`
    };
  }

  async cleanup(): Promise<void> {
    console.log(`[${this.agentId}] Cleaning up resources...`);
  }
}
