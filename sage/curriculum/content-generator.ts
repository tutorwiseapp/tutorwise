/**
 * Curriculum Content Generator
 *
 * Generates rich knowledge chunks from curriculum topics for RAG ingestion.
 * Creates multiple chunk types per topic:
 * - Definition/Overview
 * - Key Concepts
 * - Worked Examples
 * - Common Misconceptions
 * - Practice Problems
 *
 * @module sage/curriculum/content-generator
 */

import type { CurriculumTopic } from './types';
import type { KnowledgeTier } from '../knowledge/enhanced-rag';

/**
 * Generated knowledge chunk (before embedding)
 */
export interface GeneratedChunk {
  /** Chunk content */
  content: string;

  /** Chunk type */
  type: 'definition' | 'concepts' | 'example' | 'misconception' | 'practice' | 'summary';

  /** Curriculum topic this relates to */
  topicId: string;

  /** Topic name for attribution */
  topicName: string;

  /** Knowledge tier */
  tier: KnowledgeTier;

  /** Source metadata */
  source: {
    type: 'curriculum';
    name: string;
    examBoards?: string[];
  };

  /** Subject */
  subject: string;

  /** Level (GCSE/A-Level) */
  level: string;

  /** Tier (foundation/higher/both) */
  curriculumTier?: 'foundation' | 'higher' | 'both';

  /** Additional metadata */
  metadata: {
    difficulty?: string;
    prerequisites?: string[];
    vocabulary?: string[];
    [key: string]: any;
  };
}

/**
 * Generate all knowledge chunks for a curriculum topic
 */
export function generateTopicChunks(topic: CurriculumTopic): GeneratedChunk[] {
  const chunks: GeneratedChunk[] = [];

  // 1. Definition/Overview chunk
  chunks.push(generateDefinitionChunk(topic));

  // 2. Key Concepts chunk (from learning objectives)
  if (topic.learningObjectives && topic.learningObjectives.length > 0) {
    chunks.push(generateConceptsChunk(topic));
  }

  // 3. Worked Examples (2-3 per topic)
  const examples = generateExampleChunks(topic);
  chunks.push(...examples);

  // 4. Common Misconceptions
  if (topic.misconceptions && topic.misconceptions.length > 0) {
    chunks.push(generateMisconceptionsChunk(topic));
  }

  // 5. Vocabulary/Keywords
  if (topic.vocabulary && topic.vocabulary.length > 0) {
    chunks.push(generateVocabularyChunk(topic));
  }

  // 6. Prerequisites/Connections
  if (topic.prerequisites && topic.prerequisites.length > 0) {
    chunks.push(generatePrerequisitesChunk(topic));
  }

  return chunks;
}

/**
 * Generate definition/overview chunk
 */
function generateDefinitionChunk(topic: CurriculumTopic): GeneratedChunk {
  const tierInfo = topic.tier === 'both' ? 'Foundation and Higher tier' :
                   topic.tier === 'foundation' ? 'Foundation tier' : 'Higher tier';

  const examBoardsText = topic.examBoards.length > 0 ?
    `Covered in ${topic.examBoards.join(', ')} GCSE specifications.` : '';

  const content = `
${topic.name}

${topic.description}

${tierInfo} topic for GCSE ${topic.subject}. ${examBoardsText}

${topic.learningObjectives && topic.learningObjectives.length > 0 ?
  `Key Learning Objectives:
${topic.learningObjectives.map((obj, i) => `${i + 1}. ${obj}`).join('\n')}` : ''}
  `.trim();

  return {
    content,
    type: 'definition',
    topicId: topic.id,
    topicName: topic.name,
    tier: 'curriculum',
    source: {
      type: 'curriculum',
      name: `GCSE ${topic.subject}: ${topic.name}`,
      examBoards: topic.examBoards,
    },
    subject: topic.subject,
    level: 'GCSE',
    curriculumTier: topic.tier,
    metadata: {
      difficulty: topic.difficulty,
      prerequisites: topic.prerequisites,
      vocabulary: topic.vocabulary,
      examBoards: topic.examBoards,
    },
  };
}

/**
 * Generate key concepts chunk
 */
function generateConceptsChunk(topic: CurriculumTopic): GeneratedChunk {
  const content = `
Key Concepts: ${topic.name}

Students need to understand and apply the following concepts:

${topic.learningObjectives!.map((obj, i) => `${i + 1}. ${obj}`).join('\n')}

${topic.vocabulary && topic.vocabulary.length > 0 ?
  `\nEssential Vocabulary: ${topic.vocabulary.join(', ')}` : ''}
  `.trim();

  return {
    content,
    type: 'concepts',
    topicId: topic.id,
    topicName: topic.name,
    tier: 'curriculum',
    source: {
      type: 'curriculum',
      name: `GCSE ${topic.subject}: ${topic.name} - Key Concepts`,
      examBoards: topic.examBoards,
    },
    subject: topic.subject,
    level: 'GCSE',
    curriculumTier: topic.tier,
    metadata: {
      difficulty: topic.difficulty,
      learningObjectives: topic.learningObjectives,
    },
  };
}

/**
 * Generate worked example chunks
 */
function generateExampleChunks(topic: CurriculumTopic): GeneratedChunk[] {
  // Topic-specific examples based on topic ID
  const examples = getExamplesForTopic(topic);

  return examples.map((example, index) => ({
    content: example,
    type: 'example' as const,
    topicId: topic.id,
    topicName: topic.name,
    tier: 'curriculum' as const,
    source: {
      type: 'curriculum' as const,
      name: `GCSE ${topic.subject}: ${topic.name} - Worked Example ${index + 1}`,
      examBoards: topic.examBoards,
    },
    subject: topic.subject,
    level: 'GCSE',
    curriculumTier: topic.tier,
    metadata: {
      difficulty: topic.difficulty,
      exampleNumber: index + 1,
    },
  }));
}

/**
 * Generate misconceptions chunk
 */
function generateMisconceptionsChunk(topic: CurriculumTopic): GeneratedChunk {
  const content = `
Common Misconceptions: ${topic.name}

Students often make these mistakes when studying ${topic.name.toLowerCase()}:

${topic.misconceptions!.map((m, i) => `${i + 1}. ${m}`).join('\n')}

When teaching or solving problems in this topic, watch out for these errors and address them explicitly.
  `.trim();

  return {
    content,
    type: 'misconception',
    topicId: topic.id,
    topicName: topic.name,
    tier: 'curriculum',
    source: {
      type: 'curriculum',
      name: `GCSE ${topic.subject}: ${topic.name} - Common Misconceptions`,
      examBoards: topic.examBoards,
    },
    subject: topic.subject,
    level: 'GCSE',
    curriculumTier: topic.tier,
    metadata: {
      difficulty: topic.difficulty,
      misconceptions: topic.misconceptions,
    },
  };
}

/**
 * Generate vocabulary chunk
 */
function generateVocabularyChunk(topic: CurriculumTopic): GeneratedChunk {
  const content = `
Essential Vocabulary: ${topic.name}

Key terms students must understand for ${topic.name.toLowerCase()}:

${topic.vocabulary!.map(term => `• ${term}`).join('\n')}

Students should be able to define and use these terms correctly in context.
  `.trim();

  return {
    content,
    type: 'summary',
    topicId: topic.id,
    topicName: topic.name,
    tier: 'curriculum',
    source: {
      type: 'curriculum',
      name: `GCSE ${topic.subject}: ${topic.name} - Vocabulary`,
      examBoards: topic.examBoards,
    },
    subject: topic.subject,
    level: 'GCSE',
    curriculumTier: topic.tier,
    metadata: {
      difficulty: topic.difficulty,
      vocabulary: topic.vocabulary,
    },
  };
}

/**
 * Generate prerequisites chunk
 */
function generatePrerequisitesChunk(topic: CurriculumTopic): GeneratedChunk {
  const content = `
Prerequisites for ${topic.name}

Before studying ${topic.name.toLowerCase()}, students should have mastered:

${topic.prerequisites!.map((prereq, i) => `${i + 1}. ${prereq}`).join('\n')}

If students are struggling with ${topic.name.toLowerCase()}, review these prerequisite topics first.
  `.trim();

  return {
    content,
    type: 'summary',
    topicId: topic.id,
    topicName: topic.name,
    tier: 'curriculum',
    source: {
      type: 'curriculum',
      name: `GCSE ${topic.subject}: ${topic.name} - Prerequisites`,
      examBoards: topic.examBoards,
    },
    subject: topic.subject,
    level: 'GCSE',
    curriculumTier: topic.tier,
    metadata: {
      difficulty: topic.difficulty,
      prerequisites: topic.prerequisites,
    },
  };
}

/**
 * Get worked examples for specific topics
 */
function getExamplesForTopic(topic: CurriculumTopic): string[] {
  // BIDMAS/Four Operations
  if (topic.id === 'maths-number-four-operations') {
    return [
      `Worked Example: Order of Operations (BIDMAS)

Question: Calculate 100 - 50 × 2

Solution:
Following BIDMAS (Brackets, Indices, Division/Multiplication, Addition/Subtraction), we must do multiplication before subtraction.

Step 1: Identify the operations
- We have subtraction (100 - 50) and multiplication (50 × 2)

Step 2: Apply BIDMAS
- Multiplication comes before subtraction
- So we calculate 50 × 2 first

Step 3: Calculate
50 × 2 = 100

Step 4: Complete the calculation
100 - 100 = 0

Answer: 0

Common mistake: Calculating left-to-right would give (100 - 50) × 2 = 50 × 2 = 100 ✗ WRONG`,

      `Worked Example: Using Brackets in BIDMAS

Question: Calculate (12 + 8) × 3

Solution:
Brackets are the first priority in BIDMAS.

Step 1: Calculate the brackets first
12 + 8 = 20

Step 2: Multiply the result
20 × 3 = 60

Answer: 60

Key point: Brackets override the normal order of operations. Always do what's inside brackets first.`,

      `Worked Example: Complex BIDMAS Expression

Question: Calculate 48 ÷ 6 + 2 × 3

Solution:
Step 1: Identify operations
- Division: 48 ÷ 6
- Addition: + 2
- Multiplication: 2 × 3

Step 2: Apply BIDMAS (Division and Multiplication before Addition)
First: 48 ÷ 6 = 8
Also: 2 × 3 = 6

Step 3: Now add the results
8 + 6 = 14

Answer: 14

Remember: Division and Multiplication have the same priority in BIDMAS - do them left to right.`,
    ];
  }

  // Fractions
  if (topic.id === 'maths-number-fractions') {
    return [
      `Worked Example: Adding Fractions with Different Denominators

Question: Calculate 1/4 + 2/3

Solution:
Step 1: Find a common denominator
The LCM of 4 and 3 is 12

Step 2: Convert both fractions
1/4 = 3/12 (multiply top and bottom by 3)
2/3 = 8/12 (multiply top and bottom by 4)

Step 3: Add the numerators
3/12 + 8/12 = 11/12

Answer: 11/12`,

      `Worked Example: Multiplying Fractions

Question: Calculate 2/3 × 3/4

Solution:
Step 1: Multiply the numerators
2 × 3 = 6

Step 2: Multiply the denominators
3 × 4 = 12

Step 3: Simplify
6/12 = 1/2 (divide both by 6)

Answer: 1/2

Tip: When multiplying fractions, you can simplify before multiplying to make calculations easier.`,
    ];
  }

  // Percentages
  if (topic.id === 'maths-number-percentages') {
    return [
      `Worked Example: Finding a Percentage of an Amount

Question: Calculate 15% of £80

Solution:
Method 1: Convert to decimal
15% = 0.15
0.15 × 80 = £12

Method 2: Use fraction
15% = 15/100
(15/100) × 80 = 1200/100 = £12

Answer: £12`,

      `Worked Example: Percentage Increase

Question: A shirt costs £25. The price increases by 20%. What is the new price?

Solution:
Step 1: Calculate the increase
20% of £25 = 0.20 × 25 = £5

Step 2: Add to original price
£25 + £5 = £30

Alternative method (multiplier):
100% + 20% = 120% = 1.20
£25 × 1.20 = £30

Answer: £30`,
    ];
  }

  // Algebra - Expanding Brackets
  if (topic.id === 'maths-algebra-expanding-brackets') {
    return [
      `Worked Example: Expanding Single Brackets

Question: Expand 3(x + 4)

Solution:
Step 1: Multiply the term outside the bracket by each term inside
3 × x = 3x
3 × 4 = 12

Step 2: Write the result
3(x + 4) = 3x + 12

Answer: 3x + 12

Key rule: Multiply everything inside the bracket by the term outside.`,

      `Worked Example: Expanding Double Brackets

Question: Expand (x + 3)(x + 2)

Solution:
Use FOIL method (First, Outer, Inner, Last)

First: x × x = x²
Outer: x × 2 = 2x
Inner: 3 × x = 3x
Last: 3 × 2 = 6

Step 2: Combine like terms
x² + 2x + 3x + 6 = x² + 5x + 6

Answer: x² + 5x + 6`,
    ];
  }

  // Generic examples for topics without specific examples
  return [
    `Worked Example: ${topic.name}

This topic covers: ${topic.description}

Students should practice applying these concepts through worked examples and problem-solving.

Key skills required:
${topic.learningObjectives ? topic.learningObjectives.slice(0, 3).map(obj => `• ${obj}`).join('\n') : '• Understanding core concepts\n• Applying methods accurately\n• Checking answers'}`,
  ];
}

/**
 * Generate all chunks for multiple topics
 */
export function generateAllChunks(topics: CurriculumTopic[]): GeneratedChunk[] {
  const allChunks: GeneratedChunk[] = [];

  for (const topic of topics) {
    const topicChunks = generateTopicChunks(topic);
    allChunks.push(...topicChunks);
  }

  return allChunks;
}

/**
 * Format chunk count summary
 */
export function formatChunkSummary(chunks: GeneratedChunk[]): string {
  const byType = chunks.reduce((acc, chunk) => {
    acc[chunk.type] = (acc[chunk.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const lines = [
    `Generated ${chunks.length} knowledge chunks:`,
    ...Object.entries(byType).map(([type, count]) => `  ${type}: ${count}`),
  ];

  return lines.join('\n');
}
