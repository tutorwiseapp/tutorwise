"""
DSPy Signature: Maths Solver

Solves mathematical problems with step-by-step explanations.
Optimized for tutoring context with adaptive difficulty.
"""

import dspy


class MathsSolver(dspy.Signature):
    """
    Solve a mathematical problem with clear, educational explanations.

    The solution should:
    - Break down the problem into manageable steps
    - Explain the reasoning behind each step
    - Use appropriate mathematical notation
    - Adapt to the student's level (GCSE, A-Level, University)
    - Include verification of the answer
    """

    # Input fields
    problem: str = dspy.InputField(
        desc="The mathematical problem to solve. May include context about what the student is struggling with."
    )
    level: str = dspy.InputField(
        desc="Student's level: 'GCSE', 'A-Level', 'University', or 'Other'"
    )
    topic: str = dspy.InputField(
        desc="Mathematical topic (e.g., 'algebra', 'calculus', 'geometry', 'statistics')",
        default="general"
    )
    student_context: str = dspy.InputField(
        desc="Additional context about the student's understanding, previous attempts, or specific difficulties",
        default=""
    )

    # Output fields
    solution: str = dspy.OutputField(
        desc="Step-by-step solution with clear explanations for each step"
    )
    key_concepts: str = dspy.OutputField(
        desc="List of key mathematical concepts used in this solution"
    )
    common_mistakes: str = dspy.OutputField(
        desc="Common mistakes students make with this type of problem"
    )
    follow_up: str = dspy.OutputField(
        desc="Suggested follow-up question or practice problem"
    )


class MathsSolverModule(dspy.Module):
    """
    DSPy Module that wraps the MathsSolver signature.

    This module can be optimized using DSPy's BootstrapFewShot
    or other optimization strategies.
    """

    def __init__(self):
        super().__init__()
        self.solver = dspy.ChainOfThought(MathsSolver)

    def forward(
        self,
        problem: str,
        level: str,
        topic: str = "general",
        student_context: str = ""
    ) -> dspy.Prediction:
        """
        Solve a mathematical problem.

        Args:
            problem: The math problem to solve
            level: Student level (GCSE, A-Level, University)
            topic: Mathematical topic
            student_context: Additional student context

        Returns:
            DSPy Prediction with solution, key_concepts, common_mistakes, follow_up
        """
        return self.solver(
            problem=problem,
            level=level,
            topic=topic,
            student_context=student_context
        )
