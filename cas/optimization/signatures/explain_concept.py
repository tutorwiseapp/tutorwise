"""
DSPy Signature: Explain Concept

Explains educational concepts in an accessible way.
Adapts to student level and learning preferences.
"""

import dspy


class ExplainConcept(dspy.Signature):
    """
    Explain an educational concept clearly and engagingly.

    The explanation should:
    - Use appropriate language for the student's level
    - Include concrete examples and analogies
    - Build on prerequisite knowledge
    - Address common misconceptions
    - Provide visual descriptions where helpful
    """

    # Input fields
    concept: str = dspy.InputField(
        desc="The concept to explain (e.g., 'photosynthesis', 'quadratic equations', 'metaphors')"
    )
    subject: str = dspy.InputField(
        desc="Subject area: 'maths', 'english', 'science', or 'general'"
    )
    level: str = dspy.InputField(
        desc="Student's level: 'GCSE', 'A-Level', 'University', or 'Other'"
    )
    learning_style: str = dspy.InputField(
        desc="Preferred learning style: 'visual', 'auditory', 'kinesthetic', or 'mixed'",
        default="mixed"
    )
    prior_knowledge: str = dspy.InputField(
        desc="What the student already knows about this topic",
        default=""
    )

    # Output fields
    explanation: str = dspy.OutputField(
        desc="Clear, engaging explanation of the concept appropriate for the student's level"
    )
    examples: str = dspy.OutputField(
        desc="2-3 concrete examples that illustrate the concept"
    )
    analogies: str = dspy.OutputField(
        desc="Real-world analogies to help understanding"
    )
    misconceptions: str = dspy.OutputField(
        desc="Common misconceptions about this concept and how to avoid them"
    )
    check_understanding: str = dspy.OutputField(
        desc="Questions to check if the student has understood the concept"
    )


class ExplainConceptModule(dspy.Module):
    """
    DSPy Module that wraps the ExplainConcept signature.

    Optimized to produce clear, level-appropriate explanations.
    """

    def __init__(self):
        super().__init__()
        self.explainer = dspy.ChainOfThought(ExplainConcept)

    def forward(
        self,
        concept: str,
        subject: str,
        level: str,
        learning_style: str = "mixed",
        prior_knowledge: str = ""
    ) -> dspy.Prediction:
        """
        Explain a concept.

        Args:
            concept: The concept to explain
            subject: Subject area
            level: Student level
            learning_style: Preferred learning style
            prior_knowledge: What student already knows

        Returns:
            DSPy Prediction with explanation, examples, analogies, etc.
        """
        return self.explainer(
            concept=concept,
            subject=subject,
            level=level,
            learning_style=learning_style,
            prior_knowledge=prior_knowledge
        )
