/**
 * Test file for hybrid math solver
 * Run with: ts-node sage/math/test-solver.ts
 */

import {
  containsMath,
  extractExpressions,
  solveMath,
  solveMathFromMessage,
  formatSolutionsForContext,
} from './hybrid-solver';

console.log('=== Hybrid Math Solver Tests ===\n');

// Test 1: Order of operations (the original problem)
console.log('Test 1: Order of Operations');
console.log('Message: "What is 100 - 50 * 2"');
const test1 = solveMathFromMessage('What is 100 - 50 * 2');
console.log('Solutions:', test1);
console.log('Formatted context:', formatSolutionsForContext(test1));
console.log();

// Test 2: Simple arithmetic
console.log('Test 2: Simple Arithmetic');
console.log('Expression: "50 + 25"');
const test2 = solveMath('50 + 25');
console.log('Solution:', test2);
console.log();

// Test 3: Algebra equation
console.log('Test 3: Algebra Equation');
console.log('Message: "Solve 2x + 5 = 15"');
const test3 = solveMathFromMessage('Solve 2x + 5 = 15');
console.log('Solutions:', test3);
console.log();

// Test 4: Quadratic equation
console.log('Test 4: Quadratic Equation');
console.log('Message: "Solve x^2 - 5x + 6 = 0"');
const test4 = solveMathFromMessage('Solve x^2 - 5x + 6 = 0');
console.log('Solutions:', test4);
console.log();

// Test 5: Math detection
console.log('Test 5: Math Detection');
console.log('Does "What is 100 - 50 * 2" contain math?', containsMath('What is 100 - 50 * 2'));
console.log('Does "Hello, how are you?" contain math?', containsMath('Hello, how are you?'));
console.log();

// Test 6: Expression extraction
console.log('Test 6: Expression Extraction');
console.log('Message: "Calculate 15 + 20 and also 100 - 50 * 2"');
const expressions = extractExpressions('Calculate 15 + 20 and also 100 - 50 * 2');
console.log('Extracted expressions:', expressions);
console.log();

console.log('=== All Tests Complete ===');
