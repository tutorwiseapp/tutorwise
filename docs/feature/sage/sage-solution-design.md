# Sage Solution Design
**AI Tutor Agent for GCSE/A-Level – Maths, English, Science & General**
**Version:** 2.0
**Created:** 2026-02-14
**Last Updated:** 2026-02-14
**Status:** Approved for Implementation
**Owner:** Michael Quan

---

## 1. Vision & Objectives

Sage is Tutorwise's specialised AI tutor that acts as a 24/7 personal teaching assistant. Unlike Lexi (the platform support assistant), Sage focuses exclusively on teaching and learning.

Sage must be:
- **Curriculum-expert** – Grounded in UK GCSE/A-Level specifications
- **Role-aware** – Different behaviour for Tutor / Agent / Client / Student
- **Personalised** – Uses uploaded teaching materials, homework, notes
- **Safe & accurate** – No hallucinations on exam content
- **Continuously improving** – Via DSPy + CAS feedback loop
- **Future-proof** – Light A2A readiness, tool calling, capability discovery

**Key differentiator:** Sage learns and teaches in the user's own voice (especially tutors' PowerPoints) while staying strictly aligned to official specs.

---

## 2. Sage vs Lexi

| Aspect | Lexi | Sage |
|--------|------|------|
| **Purpose** | Platform navigation & support | Teaching & learning |
| **Personas** | 5 role-based (Support, Earnings Expert, etc.) | 4 role-based (Tutor, Agent, Client, Student) |
| **Knowledge** | Platform features, help content | Curriculum specs, user uploads, tutoring materials |
| **Tone** | Professional, helpful | Patient, encouraging, educational |
| **Context** | User role, permissions, bookings | Subject, level, learning style, progress |
| **Output** | Actions, suggestions, navigation | Explanations, examples, practice problems |
| **Entry Points** | FAB on all authenticated pages | Tutor/Agent dashboard, Client/Student profile |

**Shared Infrastructure:**
- `context/resolver.ts` – Role detection & context switching
- `ai_feedback` table – Unified feedback storage
- CAS message bus – Standardized JSON envelope
- DSPy pipeline – Weekly optimization (shared job)
- Provider routing – Gemini first, Claude fallback

---

## 3. Core Architecture

```
sage/
├── core/                      # Shared orchestration
│   ├── orchestrator.ts        # Message routing
│   └── index.ts
├── providers/                 # LLM providers (shared with Lexi)
│   ├── base-provider.ts
│   ├── gemini-provider.ts
│   └── claude-provider.ts
├── context/                   # Role & session context
│   ├── resolver.ts            # Role detection & mode switching
│   └── index.ts
├── personas/                  # Four role-based personas
│   ├── tutor/
│   │   ├── index.ts
│   │   └── capabilities.json
│   ├── agent/
│   │   ├── index.ts
│   │   └── capabilities.json
│   ├── client/
│   │   ├── index.ts
│   │   └── capabilities.json
│   └── student/
│       ├── index.ts
│       └── capabilities.json
├── subjects/                  # Domain logic per subject
│   ├── maths/
│   │   ├── engine.ts          # DSPy Chain-of-Thought solver
│   │   └── curriculum.ts
│   ├── english/
│   │   ├── engine.ts
│   │   └── curriculum.ts
│   ├── science/
│   │   ├── engine.ts
│   │   └── curriculum.ts
│   └── general/
│       └── engine.ts
├── knowledge/                 # Role-aware RAG storage
│   ├── global/                # Platform-wide resources
│   ├── users/{user_id}/       # Personal uploads
│   ├── shared/{owner_id}/     # Tutor → Student sharing
│   ├── index.ts               # RAG retrieval
│   └── access-control.ts      # Visibility rules
├── upload/                    # Ingestion pipeline
│   ├── processor.ts           # PPTX/PDF/DOCX extraction
│   ├── embedder.ts            # pgvector embedding
│   └── config/
│       ├── tutor.json
│       ├── agent.json
│       ├── client.json
│       └── student.json
├── services/
│   ├── session-store.ts       # Redis sessions (sage: prefix)
│   ├── progress.ts            # Mastery scores, topic queue
│   ├── report.ts              # Role-specific reports
│   └── rate-limiter.ts
├── messages/                  # CAS message bus integration
│   ├── envelope.ts            # Standardized JSON schema
│   ├── validator.ts           # Envelope validation
│   └── publisher.ts           # Send to CAS
├── tools/                     # OpenAI-compatible tool calling
│   ├── registry.ts            # Tool registration
│   ├── solve-gcse-maths.ts
│   ├── explain-concept.ts
│   └── generate-practice.ts
├── extensions/                # Future role-specific overrides
├── types/
│   └── index.ts
└── index.ts
```

---

## 4. Role-Aware Personas

### 4.1 Role Detection

```typescript
// context/resolver.ts

interface RoleContext {
  role: 'tutor' | 'agent' | 'client' | 'student';
  mode: 'teaching' | 'learning' | 'managing';
  userId: string;
  organisationId?: string;
  linkedStudents?: string[];  // For tutors/agents/clients
  linkedTutors?: string[];    // For students
}

function resolveContext(user: UserInfo): RoleContext {
  // Detect role from profile.active_role
  // Determine mode based on context (viewing student? teaching? managing?)
  // Handle hybrid users (tutor who is also a student)
}
```

### 4.2 Persona Behaviours

| Persona | Mode | Capabilities | Tone |
|---------|------|--------------|------|
| **Tutor** | Teaching | Create materials, review student work, get teaching tips | Professional, authoritative |
| **Agent** | Managing | Overview of students, suggest resources, track progress | Supportive, coordinating |
| **Client** | Managing | Monitor child's progress, understand topics, help at home | Encouraging, accessible |
| **Student** | Learning | Ask questions, practice problems, track mastery | Patient, encouraging |

### 4.3 Capability Manifests

Each persona has a `capabilities.json` for future A2A discovery:

```json
// personas/tutor/capabilities.json
{
  "name": "Sage Tutor Persona",
  "version": "1.0.0",
  "capabilities": [
    "create_lesson_plan",
    "review_student_work",
    "generate_worksheet",
    "explain_for_student",
    "track_student_progress"
  ],
  "subjects": ["maths", "english", "science", "general"],
  "tiers": ["GCSE", "A-Level"],
  "input_types": ["text", "image", "document"],
  "tool_calling": true
}
```

---

## 5. Knowledge Architecture (RAG)

### 5.1 Knowledge Sources (Priority Order)

1. **User's own uploads** – Highest priority, personal context
2. **Shared from tutor/agent** – Materials shared with specific students
3. **Global platform resources** – Curriculum specs, verified content

### 5.2 Access Control

```typescript
// knowledge/access-control.ts

interface KnowledgeAccess {
  global: boolean;           // Can access global resources
  personal: boolean;         // Can access own uploads
  shared: string[];          // Can access shared/{owner_id}/ for these owners
  studentData: string[];     // Can access users/{student_id}/ for these students
}

function getAccessControl(context: RoleContext): KnowledgeAccess {
  switch (context.role) {
    case 'tutor':
      return {
        global: true,
        personal: true,
        shared: [],                              // Own shares visible elsewhere
        studentData: context.linkedStudents,     // Can see linked students' uploads
      };
    case 'student':
      return {
        global: true,
        personal: true,
        shared: context.linkedTutors,            // Can see tutor's shared materials
        studentData: [],
      };
    // ... agent, client
  }
}
```

### 5.3 RAG Retrieval Flow

```
User asks question
        │
        ▼
┌───────────────────┐
│ Resolve Context   │ → Role, mode, linked users
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ Get Access Rules  │ → What knowledge is visible
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ Query pgvector    │ → Search across allowed namespaces
│ with access       │
│ filtering         │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ Rank & Return     │ → User uploads > Shared > Global
└───────────────────┘
```

---

## 6. Upload Pipeline

### 6.1 Supported Formats

| Format | Extraction Method |
|--------|-------------------|
| PPTX | Slide text + speaker notes + images (OCR) |
| PDF | Text extraction + OCR for scanned |
| DOCX | Full text + tables |
| Images | OCR + vision model description |

### 6.2 Role-Specific Upload Config

```json
// upload/config/tutor.json
{
  "max_file_size_mb": 50,
  "allowed_types": ["pptx", "pdf", "docx", "png", "jpg"],
  "auto_share": false,
  "chunk_size": 512,
  "overlap": 50,
  "metadata": {
    "source_type": "tutor_material",
    "visibility": "private",
    "shareable": true
  }
}
```

### 6.3 Upload Flow

```
Tutor uploads PowerPoint
        │
        ▼
┌───────────────────┐
│ processor.ts      │ → Extract text, notes, images
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ embedder.ts       │ → Chunk + embed with pgvector
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ Store in          │ → knowledge/users/{tutor_id}/
│ user namespace    │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ Optionally share  │ → Copy refs to shared/{tutor_id}/
│ with students     │    (students gain access)
└───────────────────┘
```

---

## 7. Subject Engines

### 7.1 Architecture

Each subject has an engine with DSPy-powered reasoning:

```typescript
// subjects/maths/engine.ts

import { dspy } from '@/sage/dspy';

const MathsSolver = dspy.ChainOfThought({
  signature: `
    question: str ->
    working: str,
    answer: str,
    confidence: float
  `,
  description: "Solve GCSE/A-Level maths problems step-by-step"
});

const ErrorDiagnosis = dspy.Predict({
  signature: `
    student_answer: str,
    correct_answer: str,
    working: str ->
    misconception: str,
    explanation: str,
    next_steps: list[str]
  `
});

export class MathsEngine {
  async solve(question: string, level: string): Promise<Solution>;
  async diagnoseError(studentWork: string, correct: string): Promise<Diagnosis>;
  async generatePractice(topic: string, count: number): Promise<Problem[]>;
}
```

### 7.2 Subject Coverage

| Subject | GCSE Topics | A-Level Topics |
|---------|-------------|----------------|
| **Maths** | Algebra, Geometry, Statistics, Number, Ratio | Pure, Mechanics, Statistics |
| **English** | Reading, Writing, Grammar, Literature | Language, Literature, Creative |
| **Science** | Biology, Chemistry, Physics combined | Individual sciences |
| **General** | Study skills, exam prep, cross-subject | Research, essay structure |

---

## 8. DSPy Integration (Full Implementation)

### 8.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     PRODUCTION (TypeScript)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Sage/Lexi sessions → ai_feedback table → sage_sessions         │
│                                                                  │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                         Weekly export
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                   OPTIMIZATION (Python)                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  cas/optimization/                                               │
│  ├── run_dspy.py           # Weekly cron job                    │
│  ├── signatures/                                                 │
│  │   ├── maths_solver.py                                        │
│  │   ├── english_helper.py                                      │
│  │   ├── science_explainer.py                                   │
│  │   ├── explain_concept.py                                     │
│  │   └── diagnose_error.py                                      │
│  ├── metrics/                                                    │
│  │   └── tutoring_metrics.py  # Accuracy, helpfulness           │
│  ├── data/                                                       │
│  │   └── loader.py            # Load from Supabase              │
│  └── output/                                                     │
│      └── optimized_prompts.json  # Exported for TypeScript      │
│                                                                  │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                         Deploy prompts
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                     PRODUCTION (TypeScript)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  sage/prompts/optimized.json  ← Loaded at runtime               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 8.2 File Structure

```
cas/optimization/
├── __init__.py
├── run_dspy.py                    # Main optimization runner
├── config.py                      # Environment & settings
├── signatures/
│   ├── __init__.py
│   ├── base.py                    # Base signature class
│   ├── maths_solver.py            # Maths problem solving
│   ├── english_helper.py          # English/writing assistance
│   ├── science_explainer.py       # Science explanations
│   ├── explain_concept.py         # Generic concept explanation
│   ├── diagnose_error.py          # Error diagnosis
│   └── generate_practice.py       # Practice problem generation
├── metrics/
│   ├── __init__.py
│   ├── tutoring_metrics.py        # Core tutoring metrics
│   ├── accuracy_metrics.py        # Answer accuracy
│   └── engagement_metrics.py      # Session engagement
├── data/
│   ├── __init__.py
│   ├── loader.py                  # Supabase data loader
│   ├── preprocessor.py            # Data cleaning
│   └── sampler.py                 # Training data sampling
├── output/
│   ├── optimized_prompts.json     # Current optimized prompts
│   └── history/                   # Previous versions
│       └── 2026-02-14.json
├── tests/
│   ├── test_signatures.py
│   └── test_metrics.py
└── requirements.txt
```

### 8.3 DSPy Signatures (Python)

```python
# cas/optimization/signatures/maths_solver.py
import dspy

class MathsSolver(dspy.Signature):
    """Solve GCSE/A-Level maths problems with step-by-step working.

    The solution must be pedagogically sound, showing each step clearly
    so students can follow the reasoning.
    """

    question = dspy.InputField(desc="The maths problem to solve")
    level = dspy.InputField(desc="GCSE, A-Level, or University")
    student_context = dspy.InputField(
        desc="What the student has tried or where they're stuck",
        default=""
    )

    thinking = dspy.OutputField(desc="Your reasoning process (hidden from student)")
    working = dspy.OutputField(desc="Step-by-step working shown to student")
    answer = dspy.OutputField(desc="The final answer, clearly formatted")
    explanation = dspy.OutputField(desc="Why this method works")
    check = dspy.OutputField(desc="How to verify the answer is correct")


class DiagnoseError(dspy.Signature):
    """Identify the misconception behind a student's incorrect answer.

    Focus on understanding WHY they made the mistake, not just WHAT
    the mistake was. This enables targeted remediation.
    """

    question = dspy.InputField(desc="The original question")
    correct_answer = dspy.InputField(desc="The correct answer")
    student_answer = dspy.InputField(desc="What the student answered")
    student_working = dspy.InputField(desc="The student's working (if available)")

    misconception = dspy.OutputField(desc="The underlying misunderstanding")
    why_wrong = dspy.OutputField(desc="Explanation of why this approach fails")
    remediation = dspy.OutputField(desc="How to correct the understanding")
    practice_suggestion = dspy.OutputField(desc="A similar problem to try")


class ExplainConcept(dspy.Signature):
    """Explain a curriculum concept at the appropriate level.

    Adapt the explanation to the student's learning style and level.
    Use analogies, examples, and clear structure.
    """

    topic = dspy.InputField(desc="The concept to explain")
    subject = dspy.InputField(desc="maths, english, or science")
    level = dspy.InputField(desc="GCSE, A-Level, or University")
    learning_style = dspy.InputField(
        desc="visual, auditory, reading, or kinesthetic",
        default="visual"
    )
    prior_knowledge = dspy.InputField(
        desc="What the student already knows",
        default=""
    )

    hook = dspy.OutputField(desc="An engaging opening to capture interest")
    explanation = dspy.OutputField(desc="Clear, structured explanation")
    examples = dspy.OutputField(desc="2-3 concrete examples")
    analogy = dspy.OutputField(desc="A relatable analogy if helpful")
    summary = dspy.OutputField(desc="Key takeaways in 2-3 bullet points")
    practice_prompt = dspy.OutputField(desc="A question to test understanding")


class GeneratePractice(dspy.Signature):
    """Generate practice problems for a specific topic and level."""

    topic = dspy.InputField(desc="The topic to practice")
    level = dspy.InputField(desc="Difficulty level")
    count = dspy.InputField(desc="Number of problems to generate", default="3")
    avoid_patterns = dspy.InputField(
        desc="Problem patterns to avoid (already practiced)",
        default=""
    )

    problems = dspy.OutputField(desc="List of practice problems")
    hints = dspy.OutputField(desc="Hints for each problem (hidden initially)")
    solutions = dspy.OutputField(desc="Full solutions (hidden)")
```

### 8.4 Metrics (Python)

```python
# cas/optimization/metrics/tutoring_metrics.py
import re
from typing import Optional

def tutoring_quality_metric(
    example,
    pred,
    trace=None
) -> float:
    """
    Composite metric for tutoring quality.
    Returns a score between 0 and 1.
    """
    scores = []

    # 1. Has step-by-step structure
    step_patterns = [
        r'step \d', r'first', r'then', r'next', r'finally',
        r'1\.', r'2\.', r'3\.'
    ]
    has_steps = any(
        re.search(p, pred.working.lower())
        for p in step_patterns
    )
    scores.append(1.0 if has_steps else 0.0)

    # 2. Has clear answer
    has_answer = len(pred.answer.strip()) > 0
    scores.append(1.0 if has_answer else 0.0)

    # 3. Appropriate length (not too short, not too long)
    working_length = len(pred.working.split())
    if 50 <= working_length <= 500:
        length_score = 1.0
    elif 20 <= working_length < 50 or 500 < working_length <= 800:
        length_score = 0.5
    else:
        length_score = 0.0
    scores.append(length_score)

    # 4. Uses encouraging language
    encouraging_patterns = [
        r"let's", r"great", r"well done", r"you can",
        r"try", r"think about", r"consider"
    ]
    encouragement_count = sum(
        1 for p in encouraging_patterns
        if re.search(p, pred.working.lower())
    )
    scores.append(min(encouragement_count / 3, 1.0))

    # 5. Matches expected answer (if available)
    if hasattr(example, 'expected_answer') and example.expected_answer:
        # Normalize and compare
        pred_answer = normalize_answer(pred.answer)
        expected = normalize_answer(example.expected_answer)
        answer_match = 1.0 if pred_answer == expected else 0.0
        scores.append(answer_match)

    return sum(scores) / len(scores)


def normalize_answer(answer: str) -> str:
    """Normalize answer for comparison."""
    # Remove whitespace, lowercase, remove common formatting
    answer = answer.lower().strip()
    answer = re.sub(r'\s+', ' ', answer)
    answer = re.sub(r'[£$€]', '', answer)
    return answer


def explanation_clarity_metric(example, pred, trace=None) -> float:
    """Metric for explanation clarity."""
    scores = []

    # Has hook/introduction
    has_hook = len(pred.hook.strip()) > 10
    scores.append(1.0 if has_hook else 0.0)

    # Has examples
    has_examples = len(pred.examples.strip()) > 20
    scores.append(1.0 if has_examples else 0.0)

    # Has summary
    has_summary = len(pred.summary.strip()) > 10
    scores.append(1.0 if has_summary else 0.0)

    # Uses bullet points or numbered lists
    has_structure = bool(re.search(r'[-•]\s|^\d+\.', pred.explanation))
    scores.append(1.0 if has_structure else 0.0)

    return sum(scores) / len(scores)
```

### 8.5 Data Loader (Python)

```python
# cas/optimization/data/loader.py
import os
from supabase import create_client
from typing import List
import dspy

SUPABASE_URL = os.environ['SUPABASE_URL']
SUPABASE_KEY = os.environ['SUPABASE_SERVICE_KEY']

def get_supabase():
    return create_client(SUPABASE_URL, SUPABASE_KEY)

def load_training_data(
    agent_type: str = 'sage',
    min_rating: str = 'thumbs_up',
    limit: int = 1000
) -> List[dspy.Example]:
    """
    Load training examples from production feedback.

    Returns examples with positive feedback for optimization.
    """
    supabase = get_supabase()

    # Get sessions with positive feedback
    response = supabase.table('ai_feedback') \
        .select('''
            *,
            session:sage_sessions(
                id,
                subject,
                level,
                messages,
                topics_covered
            )
        ''') \
        .eq('agent_type', agent_type) \
        .eq('rating', min_rating) \
        .order('created_at', desc=True) \
        .limit(limit) \
        .execute()

    examples = []
    for item in response.data:
        session = item.get('session')
        if not session or not session.get('messages'):
            continue

        messages = session['messages']

        # Extract user question and assistant response pairs
        for i in range(len(messages) - 1):
            if messages[i]['role'] == 'user' and messages[i+1]['role'] == 'assistant':
                example = dspy.Example(
                    question=messages[i]['content'],
                    level=session.get('level', 'GCSE'),
                    subject=session.get('subject', 'general'),
                    # The good response (since this had positive feedback)
                    response=messages[i+1]['content'],
                ).with_inputs('question', 'level', 'subject')

                examples.append(example)

    return examples


def load_negative_examples(
    agent_type: str = 'sage',
    limit: int = 500
) -> List[dspy.Example]:
    """
    Load examples with negative feedback for contrast learning.
    """
    supabase = get_supabase()

    response = supabase.table('ai_feedback') \
        .select('*, session:sage_sessions(*)') \
        .eq('agent_type', agent_type) \
        .eq('rating', 'thumbs_down') \
        .order('created_at', desc=True) \
        .limit(limit) \
        .execute()

    # Process similarly to positive examples
    # Used for contrastive learning
    return [...]
```

### 8.6 Optimization Runner (Python)

```python
# cas/optimization/run_dspy.py
#!/usr/bin/env python3
"""
DSPy Optimization Runner for Sage/Lexi

Run weekly to optimize prompts based on production feedback.
Exports optimized prompts to JSON for TypeScript consumption.

Usage:
    python run_dspy.py --agent sage --signatures maths_solver,explain_concept
    python run_dspy.py --agent lexi --all
"""

import argparse
import json
import os
from datetime import datetime
from pathlib import Path

import dspy
from dspy.teleprompt import BootstrapFewShot, BootstrapFewShotWithRandomSearch

from data.loader import load_training_data, load_negative_examples
from signatures import (
    MathsSolver,
    DiagnoseError,
    ExplainConcept,
    GeneratePractice,
)
from metrics.tutoring_metrics import (
    tutoring_quality_metric,
    explanation_clarity_metric,
)

# Configuration
OUTPUT_DIR = Path(__file__).parent / 'output'
HISTORY_DIR = OUTPUT_DIR / 'history'

SIGNATURES = {
    'maths_solver': (MathsSolver, tutoring_quality_metric),
    'diagnose_error': (DiagnoseError, tutoring_quality_metric),
    'explain_concept': (ExplainConcept, explanation_clarity_metric),
    'generate_practice': (GeneratePractice, tutoring_quality_metric),
}


def setup_dspy():
    """Configure DSPy with LLM provider."""
    # Use Gemini for optimization (cost-effective)
    lm = dspy.Google(
        model='gemini-1.5-flash',
        api_key=os.environ['GOOGLE_AI_API_KEY'],
    )
    dspy.settings.configure(lm=lm)


def optimize_signature(
    name: str,
    signature_class,
    metric,
    training_data,
    max_demos: int = 8,
) -> dict:
    """
    Optimize a single signature using BootstrapFewShot.

    Returns the optimized prompt configuration.
    """
    print(f"\n{'='*50}")
    print(f"Optimizing: {name}")
    print(f"Training examples: {len(training_data)}")
    print(f"{'='*50}")

    # Create module from signature
    module = dspy.ChainOfThought(signature_class)

    # Configure teleprompter
    teleprompter = BootstrapFewShotWithRandomSearch(
        metric=metric,
        max_bootstrapped_demos=max_demos,
        max_labeled_demos=max_demos,
        num_candidate_programs=10,
        num_threads=4,
    )

    # Run optimization
    optimized = teleprompter.compile(
        module,
        trainset=training_data,
    )

    # Extract optimized configuration
    config = {
        'name': name,
        'signature': signature_class.__name__,
        'version': datetime.now().isoformat(),
        'optimized_at': datetime.now().isoformat(),
        'training_examples_count': len(training_data),
        'max_demos': max_demos,
        'demos': [],
        'instructions': '',
    }

    # Extract demos (few-shot examples)
    if hasattr(optimized, 'demos'):
        config['demos'] = [
            {
                'inputs': {k: getattr(d, k) for k in signature_class.input_fields()},
                'outputs': {k: getattr(d, k) for k in signature_class.output_fields()},
            }
            for d in optimized.demos
        ]

    # Extract optimized instructions if available
    if hasattr(optimized, 'extended_signature'):
        config['instructions'] = str(optimized.extended_signature.instructions)

    return config


def export_prompts(optimized_configs: dict):
    """Export optimized prompts to JSON for TypeScript."""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    HISTORY_DIR.mkdir(parents=True, exist_ok=True)

    output = {
        'generated_at': datetime.now().isoformat(),
        'generator': 'cas/optimization/run_dspy.py',
        'signatures': optimized_configs,
    }

    # Write current
    with open(OUTPUT_DIR / 'optimized_prompts.json', 'w') as f:
        json.dump(output, f, indent=2)

    # Archive to history
    timestamp = datetime.now().strftime('%Y-%m-%d_%H%M%S')
    with open(HISTORY_DIR / f'{timestamp}.json', 'w') as f:
        json.dump(output, f, indent=2)

    print(f"\nExported to: {OUTPUT_DIR / 'optimized_prompts.json'}")


def main():
    parser = argparse.ArgumentParser(description='DSPy Optimization Runner')
    parser.add_argument('--agent', choices=['sage', 'lexi'], default='sage')
    parser.add_argument('--signatures', type=str, help='Comma-separated signature names')
    parser.add_argument('--all', action='store_true', help='Optimize all signatures')
    parser.add_argument('--max-demos', type=int, default=8)
    parser.add_argument('--dry-run', action='store_true')
    args = parser.parse_args()

    # Setup
    setup_dspy()

    # Determine which signatures to optimize
    if args.all:
        sig_names = list(SIGNATURES.keys())
    elif args.signatures:
        sig_names = [s.strip() for s in args.signatures.split(',')]
    else:
        sig_names = ['maths_solver', 'explain_concept']  # Default

    # Load training data
    print("Loading training data...")
    training_data = load_training_data(agent_type=args.agent)
    print(f"Loaded {len(training_data)} training examples")

    if len(training_data) < 10:
        print("WARNING: Not enough training data for optimization.")
        print("Need at least 10 examples with positive feedback.")
        if not args.dry_run:
            return

    # Optimize each signature
    optimized_configs = {}
    for name in sig_names:
        if name not in SIGNATURES:
            print(f"Unknown signature: {name}")
            continue

        sig_class, metric = SIGNATURES[name]

        if args.dry_run:
            print(f"[DRY RUN] Would optimize: {name}")
            continue

        config = optimize_signature(
            name=name,
            signature_class=sig_class,
            metric=metric,
            training_data=training_data,
            max_demos=args.max_demos,
        )
        optimized_configs[name] = config

    # Export
    if not args.dry_run and optimized_configs:
        export_prompts(optimized_configs)

    print("\nDone!")


if __name__ == '__main__':
    main()
```

### 8.7 TypeScript Integration

```typescript
// sage/prompts/types.ts
export interface OptimizedDemo {
  inputs: Record<string, string>;
  outputs: Record<string, string>;
}

export interface OptimizedSignature {
  name: string;
  signature: string;
  version: string;
  optimized_at: string;
  training_examples_count: number;
  max_demos: number;
  demos: OptimizedDemo[];
  instructions: string;
}

export interface OptimizedPrompts {
  generated_at: string;
  generator: string;
  signatures: Record<string, OptimizedSignature>;
}
```

```typescript
// sage/prompts/loader.ts
import { OptimizedPrompts, OptimizedSignature } from './types';
import optimizedData from './optimized.json';

class PromptLoader {
  private prompts: OptimizedPrompts;
  private fallbacks: Map<string, OptimizedSignature> = new Map();

  constructor() {
    this.prompts = optimizedData as OptimizedPrompts;
    this.initFallbacks();
  }

  private initFallbacks() {
    // Default prompts if optimization hasn't run yet
    this.fallbacks.set('maths_solver', {
      name: 'maths_solver',
      signature: 'MathsSolver',
      version: '0.0.0',
      optimized_at: '',
      training_examples_count: 0,
      max_demos: 0,
      demos: [],
      instructions: `You are Sage, a patient and encouraging maths tutor.
Solve problems step-by-step, showing clear working.
Explain your reasoning so students can follow along.`,
    });
    // ... other fallbacks
  }

  getSignature(name: string): OptimizedSignature {
    const optimized = this.prompts.signatures[name];
    if (optimized && optimized.demos.length > 0) {
      return optimized;
    }
    return this.fallbacks.get(name) || this.fallbacks.get('maths_solver')!;
  }

  buildMessages(
    signatureName: string,
    userInput: Record<string, string>
  ): Array<{ role: string; content: string }> {
    const sig = this.getSignature(signatureName);
    const messages: Array<{ role: string; content: string }> = [];

    // System message with instructions
    messages.push({
      role: 'system',
      content: sig.instructions || this.getDefaultInstructions(signatureName),
    });

    // Few-shot examples from DSPy optimization
    for (const demo of sig.demos) {
      messages.push({
        role: 'user',
        content: this.formatInputs(demo.inputs),
      });
      messages.push({
        role: 'assistant',
        content: this.formatOutputs(demo.outputs),
      });
    }

    // Current user input
    messages.push({
      role: 'user',
      content: this.formatInputs(userInput),
    });

    return messages;
  }

  private formatInputs(inputs: Record<string, string>): string {
    return Object.entries(inputs)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');
  }

  private formatOutputs(outputs: Record<string, string>): string {
    return Object.entries(outputs)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n\n');
  }

  private getDefaultInstructions(name: string): string {
    const defaults: Record<string, string> = {
      maths_solver: 'You are Sage, a patient maths tutor. Solve step-by-step.',
      explain_concept: 'You are Sage. Explain concepts clearly with examples.',
      diagnose_error: 'You are Sage. Identify misconceptions kindly.',
    };
    return defaults[name] || 'You are Sage, an AI tutor.';
  }
}

export const promptLoader = new PromptLoader();
```

```typescript
// sage/subjects/maths/engine.ts
import { promptLoader } from '@/sage/prompts/loader';
import { geminiProvider } from '@/sage/providers/gemini-provider';

export class MathsEngine {
  async solve(
    question: string,
    level: string,
    studentContext?: string
  ): Promise<MathsSolution> {
    // Build messages using DSPy-optimized prompts
    const messages = promptLoader.buildMessages('maths_solver', {
      question,
      level,
      student_context: studentContext || '',
    });

    // Call LLM with optimized few-shot examples
    const response = await geminiProvider.complete(messages);

    // Parse structured output
    return this.parseResponse(response);
  }

  async diagnoseError(
    question: string,
    correctAnswer: string,
    studentAnswer: string,
    studentWorking?: string
  ): Promise<ErrorDiagnosis> {
    const messages = promptLoader.buildMessages('diagnose_error', {
      question,
      correct_answer: correctAnswer,
      student_answer: studentAnswer,
      student_working: studentWorking || '',
    });

    const response = await geminiProvider.complete(messages);
    return this.parseErrorDiagnosis(response);
  }

  private parseResponse(response: string): MathsSolution {
    // Parse the structured response
    // DSPy optimization ensures consistent output format
    const sections = this.extractSections(response);

    return {
      thinking: sections.thinking || '',
      working: sections.working || response,
      answer: sections.answer || '',
      explanation: sections.explanation || '',
      check: sections.check || '',
    };
  }

  private extractSections(text: string): Record<string, string> {
    const sections: Record<string, string> = {};
    const patterns = [
      'thinking', 'working', 'answer', 'explanation', 'check'
    ];

    for (const pattern of patterns) {
      const regex = new RegExp(`${pattern}:\\s*([\\s\\S]*?)(?=\\n\\w+:|$)`, 'i');
      const match = text.match(regex);
      if (match) {
        sections[pattern] = match[1].trim();
      }
    }

    return sections;
  }
}
```

### 8.8 GitHub Actions Workflow

```yaml
# .github/workflows/dspy-optimize.yml
name: DSPy Prompt Optimization

on:
  schedule:
    # Run every Sunday at 3am UTC
    - cron: '0 3 * * 0'
  workflow_dispatch:
    inputs:
      agent:
        description: 'Agent to optimize (sage/lexi)'
        required: true
        default: 'sage'
      signatures:
        description: 'Signatures to optimize (comma-separated, or "all")'
        required: false
        default: 'all'

jobs:
  optimize:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          token: ${{ secrets.GITHUB_TOKEN }}

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'
          cache: 'pip'

      - name: Install dependencies
        run: |
          pip install -r cas/optimization/requirements.txt

      - name: Run DSPy optimization
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
          GOOGLE_AI_API_KEY: ${{ secrets.GOOGLE_AI_API_KEY }}
        run: |
          cd cas/optimization
          python run_dspy.py \
            --agent ${{ github.event.inputs.agent || 'sage' }} \
            --${{ github.event.inputs.signatures == 'all' && 'all' || format('signatures {0}', github.event.inputs.signatures) }}

      - name: Copy optimized prompts to Sage
        run: |
          cp cas/optimization/output/optimized_prompts.json sage/prompts/optimized.json

      - name: Check for changes
        id: changes
        run: |
          git diff --quiet sage/prompts/optimized.json || echo "changed=true" >> $GITHUB_OUTPUT

      - name: Commit and push
        if: steps.changes.outputs.changed == 'true'
        run: |
          git config user.name "CAS Optimization Bot"
          git config user.email "cas@tutorwise.com"
          git add sage/prompts/optimized.json
          git add cas/optimization/output/history/
          git commit -m "chore(sage): Update DSPy optimized prompts

          Optimized signatures based on $(date +%Y-%m-%d) feedback data.

          Co-Authored-By: CAS Optimization <cas@tutorwise.com>"
          git push

      - name: Notify on failure
        if: failure()
        run: |
          echo "DSPy optimization failed. Check logs for details."
          # Could add Slack/Discord notification here

  notify-success:
    needs: optimize
    runs-on: ubuntu-latest
    if: success()
    steps:
      - name: Success notification
        run: |
          echo "DSPy optimization completed successfully"
          # Could add Slack/Discord notification here
```

### 8.9 Requirements

```
# cas/optimization/requirements.txt
dspy-ai>=2.4.0
supabase>=2.0.0
python-dotenv>=1.0.0
```

---

## 9. Future-Proofing Components

### 9.1 Standardized Message Envelope

Shared with Lexi and CAS for inter-agent communication:

```typescript
// messages/envelope.ts

interface MessageEnvelope {
  id: string;                    // UUID
  from: string;                  // "sage" | "lexi" | "cas:planner" | etc.
  to: string;                    // Target agent/service
  type: string;                  // "feedback" | "request" | "response"
  payload: unknown;              // Typed per message type
  correlation_id?: string;       // For request/response matching
  timestamp: string;             // ISO 8601
  version: string;               // Protocol version (e.g., "1.0.0")
  protocol?: string;             // Future: "a2a" | "mcp" when external
}

// Example: Feedback to CAS
{
  "id": "msg_abc123",
  "from": "sage",
  "to": "cas:feedback",
  "type": "feedback",
  "payload": {
    "session_id": "sage_xyz",
    "rating": "thumbs_down",
    "comment": "Explanation was too complex",
    "context": { "subject": "maths", "level": "GCSE", "role": "student" }
  },
  "correlation_id": null,
  "timestamp": "2026-02-14T10:30:00Z",
  "version": "1.0.0"
}
```

### 9.2 OpenAI-Compatible Tool Calling

Expose Sage actions as tools for external integration:

```typescript
// tools/registry.ts

const sageTools = [
  {
    type: "function",
    function: {
      name: "solve_gcse_maths",
      description: "Solve a GCSE-level maths problem with step-by-step working",
      parameters: {
        type: "object",
        properties: {
          question: { type: "string", description: "The maths problem" },
          show_working: { type: "boolean", default: true }
        },
        required: ["question"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "explain_concept",
      description: "Explain a curriculum concept at the appropriate level",
      parameters: {
        type: "object",
        properties: {
          topic: { type: "string" },
          subject: { type: "string", enum: ["maths", "english", "science"] },
          level: { type: "string", enum: ["GCSE", "A-Level"] }
        },
        required: ["topic", "subject", "level"]
      }
    }
  },
  // ... more tools
];
```

### 9.3 A2A/MCP Compatibility Markers

Version field allows future protocol negotiation:

```typescript
// When external A2A agents emerge
if (message.protocol === 'a2a') {
  // Handle A2A protocol specifics
} else if (message.protocol === 'mcp') {
  // Handle MCP protocol
} else {
  // Internal Tutorwise protocol
}
```

---

## 10. Progress Tracking

### 10.1 Data Model

```typescript
interface StudentProgress {
  studentId: string;
  subject: string;
  level: string;

  // Topic mastery
  topics: {
    [topicId: string]: {
      mastery: number;           // 0-100
      lastPracticed: Date;
      practiceCount: number;
      errorPatterns: string[];
    };
  };

  // Spaced repetition
  topicQueue: string[];          // Next topics to review

  // Overall stats
  totalSessions: number;
  totalQuestions: number;
  averageAccuracy: number;
  streak: number;
}
```

### 10.2 Role-Specific Views

| Role | Progress View |
|------|---------------|
| **Student** | Personal dashboard: mastery, streak, next topics |
| **Client** | Child summary: overall progress, recent activity, areas to focus |
| **Tutor** | Student overview: all linked students, group patterns |
| **Agent** | Portfolio view: all assigned students, aggregate metrics |

---

## 11. API Specification

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/sage/session` | POST | Start session (subject, level, role context) |
| `/api/sage/session` | DELETE | End session |
| `/api/sage/stream` | POST | Send message (streaming response) |
| `/api/sage/capabilities` | GET | List capabilities for role |
| `/api/sage/upload` | POST | Upload teaching material |
| `/api/sage/progress` | GET | Get progress for student(s) |
| `/api/sage/tools` | GET | List available tools (OpenAI format) |

### POST /api/sage/session

**Request:**
```json
{
  "subject": "maths",
  "level": "GCSE",
  "sessionGoal": "homework_help"
}
```

**Response:**
```json
{
  "sessionId": "sage_abc123",
  "persona": "student",
  "tutorName": "Sage (Maths Tutor)",
  "greeting": "Hi! I'm Sage, your maths tutor. What would you like to work on today?",
  "capabilities": ["solve_problems", "explain_concepts", "generate_practice"],
  "context": {
    "level": "GCSE",
    "learningStyle": "visual",
    "linkedTutors": ["tutor_xyz"]
  },
  "expiresAt": "2026-02-15T08:33:00Z"
}
```

---

## 12. UI Components

### Component Hierarchy

```
apps/web/src/components/feature/sage/
├── index.ts
├── SageChat.tsx               # Main chat interface
├── SageChat.module.css        # Purple/indigo theme
├── SageChatModal.tsx          # Floating modal
├── SageChatModal.module.css
├── SageMessage.tsx            # Message bubble
├── SageMarkdown.tsx           # Markdown with LaTeX support
├── SageSubjectPicker.tsx      # Subject/level selection
├── SageProgress.tsx           # Progress indicators
├── SageUpload.tsx             # File upload component
├── useSageChat.ts             # Chat hook
└── useSageProgress.ts         # Progress hook
```

### Entry Points by Role

| Role | Entry Point | Location |
|------|-------------|----------|
| **Tutor** | "Ask Sage" button | Tutor dashboard |
| **Agent** | "Ask Sage" button | Agent dashboard |
| **Client** | "Help my child learn" | Client profile, child's page |
| **Student** | "Learn with Sage" | Student dashboard, mobile app |

---

## 13. Database Schema

### sage_sessions
```sql
CREATE TABLE sage_sessions (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  persona TEXT NOT NULL,           -- 'tutor', 'agent', 'client', 'student'
  subject TEXT,                    -- 'maths', 'english', 'science', 'general'
  level TEXT,                      -- 'GCSE', 'A-Level', etc.
  session_goal TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  message_count INTEGER DEFAULT 0,
  topics_covered TEXT[],
  status TEXT DEFAULT 'active',
  metadata JSONB
);
```

### sage_progress
```sql
CREATE TABLE sage_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES auth.users(id),
  subject TEXT NOT NULL,
  level TEXT NOT NULL,
  topic_id TEXT NOT NULL,
  mastery_score INTEGER DEFAULT 0,  -- 0-100
  practice_count INTEGER DEFAULT 0,
  last_practiced_at TIMESTAMPTZ,
  error_patterns JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, subject, level, topic_id)
);
```

### ai_feedback (shared with Lexi)
```sql
CREATE TABLE ai_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_type TEXT NOT NULL,        -- 'sage' | 'lexi'
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  rating TEXT,                     -- 'thumbs_up' | 'thumbs_down'
  comment TEXT,
  context JSONB,                   -- Subject, level, role, etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### sage_uploads
```sql
CREATE TABLE sage_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id),
  filename TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  namespace TEXT NOT NULL,         -- 'users/{id}' or 'shared/{id}' or 'global'
  chunk_count INTEGER,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 14. Design Tokens

| Property | Token | Value |
|----------|-------|-------|
| Primary colour | `--color-sage-primary` | `#4f46e5` (indigo) |
| Secondary colour | `--color-sage-secondary` | `#7c3aed` (purple) |
| Gradient | — | `linear-gradient(135deg, #4f46e5, #7c3aed)` |
| User message bg | — | `#4f46e5` |
| Sage message bg | — | `#f5f3ff` |
| FAB shadow | — | `0 4px 14px rgba(79, 70, 229, 0.4)` |
| Chat width | — | `420px` |
| Chat height | — | `600px` |

---

## 15. Implementation Phases

### Phase 0 – Foundation (Week 1-2, Feb 2026)
- [ ] Fork Lexi → Sage with optimum structure
- [ ] Implement `context/resolver.ts` (role detection)
- [ ] Create 4 persona folders with `capabilities.json`
- [ ] Set up `messages/envelope.ts` + validation
- [ ] Create `tools/registry.ts` with OpenAI format
- [ ] Database migration: `sage_sessions`, `sage_progress`, `ai_feedback`
- [ ] Basic API routes: session, stream

### Phase 1 – Core Engine (Week 3-4, Mar 2026)
- [ ] Build `subjects/maths/engine.ts` with DSPy solver
- [ ] Create `upload/processor.ts` (PPTX extraction)
- [ ] Build `upload/embedder.ts` (pgvector)
- [ ] Implement `knowledge/access-control.ts`
- [ ] Basic RAG retrieval with role filtering
- [ ] UI: SageChat, SageSubjectPicker
- [ ] "Ask Sage" buttons on tutor/agent/client/student dashboards

### Phase 2 – Intelligence (Q1-Q2 2026)
- [ ] Add English & Science engines
- [ ] Implement progress tracking with mastery scores
- [ ] Role-specific progress views
- [ ] Feed sessions to CAS feedback loop
- [ ] First DSPy optimization run
- [ ] Upload sharing (tutor → student)

### Phase 3 – Safety & Visibility (Q2 2026)
- [ ] Predictive guardrails for tutoring accuracy
- [ ] Role-specific reports
- [ ] Unified CAS dashboard view (Lexi + Sage metrics)
- [ ] Self-healing knowledge from error patterns

### Phase 4 – Maturity (Q3-Q4 2026)
- [ ] Pluggable subject modules
- [ ] Voice input/output
- [ ] Full CAS autonomy ("Maintain Sage")
- [ ] Prepare for external A2A protocols

---

## 16. Success Metrics

| Metric | Target |
|--------|--------|
| Session completion rate | >60% have 5+ messages |
| Student return rate | >40% use Sage again within 7 days |
| Topic mastery growth | Average +10% mastery per month |
| Satisfaction rating | >4.0/5 average |
| Human tutor complement | 30% of Sage users also book human tutors |
| DSPy improvement | 5% accuracy gain per optimization cycle |

---

## 17. Guiding Principles

1. **Inherit Lexi maturity** – Multi-LLM, lazy sessions, feedback loop
2. **Strict role separation** – Tutor / Agent / Client / Student with shared core
3. **Knowledge access controlled** – By role & relationship
4. **No model training** – Only RAG + DSPy optimization
5. **Single CAS loop** – Lexi + Sage improvements together
6. **Light future-proofing** – Standardized messages, capability manifests, OpenAI tools
7. **UK curriculum alignment** – Step-by-step pedagogy

---

## 18. Related Documentation

- [Lexi Solution Design](../lexi/lexi-solution-design.md)
- [CAS Architecture](../../architecture/cas.md)
- [CAS Roadmap](../../../cas/agents/planner/planning/cas-roadmap.md)
- [Student Features](../students/README.md)
- [Wisespace](../wisespace/README.md)

---

## Appendix A: Message Bus Integration

### Feedback Flow (Sage → CAS)

```
Student gives thumbs-down
        │
        ▼
┌───────────────────┐
│ Create envelope   │ → Standardized format
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ Validate schema   │ → messages/validator.ts
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ Publish to CAS    │ → messages/publisher.ts
│ message bus       │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ CAS processes     │ → Planner logs, Analyst reviews
│ feedback          │
└───────────────────┘
```

---

## Appendix B: Combined Roadmap (CAS + Lexi + Sage)

### Q1 2026 – Foundation

**CAS:**
- Git commit auto-plan updater
- Message bus with JSON envelope (shared)
- Capability manifests for 8 agents
- OpenAI tool calling wrappers
- DSPy framework integration
- PowerPoint ingestion pipeline for Sage

**Lexi:**
- Embed widget on all pages
- 4-5 new personas
- Feedback → CAS message bus
- Capability manifests per persona
- Provider routing (Gemini → Claude)

**Sage:**
- Fork Lexi with role-aware structure
- 4 personas (Tutor/Agent/Client/Student)
- Maths engine with DSPy
- Upload pipeline + RAG
- "Ask Sage" entry points

### Q2 2026 – Intelligence & Safety

**CAS:**
- Predictive failure prevention
- Security pre-deployment checks
- Marketer agent expansion

**Lexi:**
- DSPy optimization (shared with Sage)
- Context-aware routing
- Role-aware behaviour

**Sage:**
- All subject engines
- Progress tracking
- DSPy optimization
- Predictive guardrails

### Q3-Q4 2026 – Autonomy & Ecosystem

**CAS:**
- Full Phase 2 autonomy
- Plugin system
- Multimodal support
- A2A protocol readiness

**Lexi:**
- Plugin system
- Voice support
- Autonomous maintenance

**Sage:**
- Pluggable subject modules
- Voice I/O
- Full CAS autonomy
- A2A protocol readiness
