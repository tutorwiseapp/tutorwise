/**
 * Hybrid Math Solver
 *
 * Combines LLM reasoning with deterministic symbolic computation for 100% math accuracy.
 * Uses mathjs for numerical computation and nerdamer for symbolic algebra/calculus.
 *
 * Inspired by StarSpark's approach: LLM handles pedagogy, deterministic solver handles computation.
 *
 * @module sage/math/hybrid-solver
 */

import * as math from 'mathjs';
// @ts-ignore - nerdamer doesn't have TypeScript types
import nerdamer from 'nerdamer';
// @ts-ignore
import 'nerdamer/Algebra';
// @ts-ignore
import 'nerdamer/Calculus';
// @ts-ignore
import 'nerdamer/Solve';

export interface MathSolution {
  /** Original expression */
  expression: string;
  /** Computed result */
  result: string;
  /** Step-by-step solution (if available) */
  steps?: string[];
  /** Type of problem (arithmetic, algebra, calculus, etc.) */
  type: MathProblemType;
  /** LaTeX representation of result */
  latex?: string;
}

export type MathProblemType =
  | 'arithmetic'      // Basic calculations: 2 + 2, 100 - 50 * 2
  | 'algebra'         // Equations/inequalities: 2x + 5 = 10, x^2 - 4 = 0
  | 'calculus'        // Derivatives/integrals: d/dx(x^2), ∫(x^2)dx
  | 'simplification'  // Simplify: (x^2 - 1)/(x - 1)
  | 'unknown';

/**
 * Detect if user message contains mathematical expressions
 */
export function containsMath(message: string): boolean {
  const mathPatterns = [
    /\d+\s*[\+\-\*\/\^]\s*\d+/,           // Arithmetic: 5 + 3, 100 - 50 * 2
    /=\s*\d+/,                             // Equations: x = 5
    /[a-z]\s*[\+\-\*\/\^=]/i,             // Algebra: x + 5, y = 2x
    /\b(solve|calculate|simplify|differentiate|integrate|derivative|integral)\b/i,
    /\b(what is|whats|compute|evaluate|find)\b.*\d/i,
    /∫|∑|√|π|∞|≤|≥|≠|±/,                   // Math symbols
    /d\/dx|dy\/dx/i,                       // Derivatives
  ];

  return mathPatterns.some(pattern => pattern.test(message));
}

/**
 * Extract mathematical expressions from user message
 * Returns array of expressions found
 */
export function extractExpressions(message: string): string[] {
  const expressions: string[] = [];

  // Pattern 1: "What is X" or "Calculate X"
  const whatIsMatch = message.match(/(?:what is|whats|calculate|evaluate|compute|find)\s+([0-9\+\-\*\/\^\(\)\s]+)/i);
  if (whatIsMatch?.[1]) {
    expressions.push(whatIsMatch[1].trim());
  }

  // Pattern 2: Standalone arithmetic (100 - 50 * 2)
  const arithmeticMatches = message.matchAll(/\b(\d+(?:\.\d+)?\s*[\+\-\*\/\^]\s*\d+(?:\.\d+)?(?:\s*[\+\-\*\/\^]\s*\d+(?:\.\d+)?)*)/g);
  for (const match of arithmeticMatches) {
    if (!expressions.includes(match[1])) {
      expressions.push(match[1].trim());
    }
  }

  // Pattern 3: Equations (solve 2x + 5 = 10, x^2 - 4 = 0)
  const equationMatch = message.match(/(?:solve|find)\s+([a-z0-9\+\-\*\/\^\(\)\s=]+)/i);
  if (equationMatch?.[1] && equationMatch[1].includes('=')) {
    expressions.push(equationMatch[1].trim());
  }

  // Pattern 4: Differentiate/integrate
  const calculusMatch = message.match(/(?:differentiate|derivative|integrate|integral)(?:\s+of)?\s+([a-z0-9\+\-\*\/\^\(\)\s]+)/i);
  if (calculusMatch?.[1]) {
    expressions.push(calculusMatch[1].trim());
  }

  return expressions;
}

/**
 * Classify the type of math problem
 */
export function classifyProblem(expression: string): MathProblemType {
  // Contains only numbers and operators → arithmetic
  if (/^[\d\s\+\-\*\/\^\(\)\.]+$/.test(expression)) {
    return 'arithmetic';
  }

  // Contains equals sign → algebra (equation solving)
  if (expression.includes('=')) {
    return 'algebra';
  }

  // Contains derivative notation
  if (/d\/d[a-z]|dy\/dx/i.test(expression)) {
    return 'calculus';
  }

  // Contains variables → likely algebra or simplification
  if (/[a-z]/i.test(expression)) {
    return 'algebra';
  }

  return 'unknown';
}

/**
 * Solve arithmetic expressions using mathjs
 */
export function solveArithmetic(expression: string): MathSolution {
  try {
    const result = math.evaluate(expression);

    return {
      expression,
      result: String(result),
      type: 'arithmetic',
      steps: generateArithmeticSteps(expression, result),
    };
  } catch (error) {
    throw new Error(`Failed to solve arithmetic: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate step-by-step solution for arithmetic (PEMDAS/BODMAS order)
 */
function generateArithmeticSteps(expression: string, finalResult: number): string[] {
  const steps: string[] = [];

  // For simple expressions, show the order of operations
  if (expression.includes('*') || expression.includes('/')) {
    steps.push(`Expression: ${expression}`);
    steps.push('Following order of operations (PEMDAS/BODMAS):');
    steps.push('1. First, perform multiplication and division (left to right)');
    steps.push('2. Then, perform addition and subtraction (left to right)');
    steps.push(`Result: ${finalResult}`);
  }

  return steps;
}

/**
 * Solve algebraic equations using nerdamer
 */
export function solveAlgebra(expression: string): MathSolution {
  try {
    // Check if it's an equation (contains =)
    if (expression.includes('=')) {
      const [lhs, rhs] = expression.split('=').map(s => s.trim());
      const equation = `${lhs}-(${rhs})`;

      // Try to detect the variable (usually x, but could be y, z, etc.)
      const variableMatch = equation.match(/[a-z]/i);
      const variable = variableMatch ? variableMatch[0] : 'x';

      // @ts-ignore - nerdamer doesn't have TypeScript types
      const solution = nerdamer.solve(equation, variable);

      return {
        expression,
        result: solution.toString(),
        type: 'algebra',
        steps: [`Solve: ${expression}`, `Solution: ${solution.toString()}`],
      };
    } else {
      // Simplification
      // @ts-ignore - nerdamer doesn't have TypeScript types
      const simplified = nerdamer(expression).simplify();

      return {
        expression,
        result: simplified.toString(),
        type: 'simplification',
        steps: [`Simplify: ${expression}`, `Result: ${simplified.toString()}`],
      };
    }
  } catch (error) {
    throw new Error(`Failed to solve algebra: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Solve calculus problems using nerdamer
 */
export function solveCalculus(expression: string, operation: 'differentiate' | 'integrate'): MathSolution {
  try {
    let result;
    if (operation === 'differentiate') {
      // @ts-ignore - nerdamer doesn't have TypeScript types
      result = nerdamer(expression).diff('x');
    } else {
      // @ts-ignore - nerdamer doesn't have TypeScript types
      result = nerdamer.integrate(expression, 'x');
    }

    return {
      expression,
      result: result.toString(),
      type: 'calculus',
      steps: [
        `${operation === 'differentiate' ? 'Differentiate' : 'Integrate'}: ${expression}`,
        `Result: ${result.toString()}`
      ],
      latex: result.toTeX ? result.toTeX() : undefined,
    };
  } catch (error) {
    throw new Error(`Failed to solve calculus: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Main solver function - automatically detects problem type and solves
 */
export function solveMath(expression: string, hint?: 'differentiate' | 'integrate'): MathSolution {
  const type = classifyProblem(expression);

  switch (type) {
    case 'arithmetic':
      return solveArithmetic(expression);

    case 'algebra':
    case 'simplification':
      return solveAlgebra(expression);

    case 'calculus':
      if (!hint) {
        throw new Error('Calculus problems require a hint (differentiate or integrate)');
      }
      return solveCalculus(expression, hint);

    default:
      throw new Error(`Unable to classify math problem: ${expression}`);
  }
}

/**
 * Solve all math expressions found in user message
 * Returns array of solutions
 */
export function solveMathFromMessage(message: string): MathSolution[] {
  const expressions = extractExpressions(message);
  const solutions: MathSolution[] = [];

  // Detect if calculus from message context
  const isDifferentiate = /differentiate|derivative|d\/dx/i.test(message);
  const isIntegrate = /integrate|integral/i.test(message);
  const hint = isDifferentiate ? 'differentiate' : isIntegrate ? 'integrate' : undefined;

  for (const expr of expressions) {
    try {
      const solution = solveMath(expr, hint);
      solutions.push(solution);
    } catch (error) {
      console.warn(`[HybridSolver] Could not solve "${expr}":`, error);
    }
  }

  return solutions;
}

/**
 * Format math solutions for RAG context injection
 * This gets added to the LLM prompt to ensure accurate answers
 */
export function formatSolutionsForContext(solutions: MathSolution[]): string {
  if (solutions.length === 0) return '';

  const formatted = solutions.map(sol => {
    let text = `Mathematical Solution:\n`;
    text += `Expression: ${sol.expression}\n`;
    text += `Answer: ${sol.result}\n`;

    if (sol.steps && sol.steps.length > 0) {
      text += `Steps:\n${sol.steps.map(s => `  - ${s}`).join('\n')}\n`;
    }

    return text;
  }).join('\n---\n\n');

  return `\n\n### VERIFIED MATHEMATICAL SOLUTIONS\nThe following calculations have been verified using symbolic computation:\n\n${formatted}\n\nWhen teaching, use these verified answers and guide the student through the reasoning.`;
}
