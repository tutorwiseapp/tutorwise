"""
DSPy Signature: Diagnose Error

Analyzes student work to identify errors and misconceptions.
Provides targeted feedback for improvement.
"""

import dspy


class DiagnoseError(dspy.Signature):
    """
    Analyze student work to identify errors and provide constructive feedback.

    The diagnosis should:
    - Identify the specific error(s) made
    - Explain why the error occurred (misconception, calculation mistake, etc.)
    - Provide guidance without giving away the answer
    - Suggest specific steps to correct the error
    - Build student confidence with encouragement
    """

    # Input fields
    student_work: str = dspy.InputField(
        desc="The student's work or answer to analyze"
    )
    expected_answer: str = dspy.InputField(
        desc="The correct answer or expected outcome (optional)",
        default=""
    )
    problem_context: str = dspy.InputField(
        desc="The original problem or task the student was working on"
    )
    subject: str = dspy.InputField(
        desc="Subject area: 'maths', 'english', 'science', or 'general'"
    )
    level: str = dspy.InputField(
        desc="Student's level: 'GCSE', 'A-Level', 'University', or 'Other'"
    )

    # Output fields
    error_identified: str = dspy.OutputField(
        desc="Clear description of the error(s) found in the student's work"
    )
    error_type: str = dspy.OutputField(
        desc="Classification of error: 'conceptual', 'procedural', 'careless', 'incomplete'"
    )
    underlying_misconception: str = dspy.OutputField(
        desc="The underlying misconception or gap in understanding"
    )
    corrective_hint: str = dspy.OutputField(
        desc="A hint to help the student correct their work without giving the answer"
    )
    encouragement: str = dspy.OutputField(
        desc="Supportive message acknowledging what the student did well"
    )
    next_steps: str = dspy.OutputField(
        desc="Specific steps the student should take to improve"
    )


class DiagnoseErrorModule(dspy.Module):
    """
    DSPy Module that wraps the DiagnoseError signature.

    Optimized to provide supportive, educational error feedback.
    """

    def __init__(self):
        super().__init__()
        self.diagnoser = dspy.ChainOfThought(DiagnoseError)

    def forward(
        self,
        student_work: str,
        problem_context: str,
        subject: str,
        level: str,
        expected_answer: str = ""
    ) -> dspy.Prediction:
        """
        Diagnose errors in student work.

        Args:
            student_work: The student's work to analyze
            problem_context: The original problem
            subject: Subject area
            level: Student level
            expected_answer: Optional correct answer

        Returns:
            DSPy Prediction with error analysis and feedback
        """
        return self.diagnoser(
            student_work=student_work,
            expected_answer=expected_answer,
            problem_context=problem_context,
            subject=subject,
            level=level
        )
