"""
DSPy Metrics for Tutoring Quality Evaluation

These metrics evaluate the quality of AI tutor responses based on
educational effectiveness, clarity, and student feedback.
"""

from typing import Any, Optional
import dspy


class TutoringMetrics:
    """
    Collection of metrics for evaluating tutoring responses.

    Uses user feedback from ai_feedback table to train DSPy optimizers.
    """

    @staticmethod
    def from_feedback(
        rating: str,
        rating_value: Optional[int] = None
    ) -> float:
        """
        Convert user feedback to a metric score.

        Args:
            rating: 'thumbs_up' or 'thumbs_down'
            rating_value: Optional 1-5 scale rating

        Returns:
            Score between 0.0 and 1.0
        """
        if rating_value is not None:
            return rating_value / 5.0

        return 1.0 if rating == "thumbs_up" else 0.0


def feedback_accuracy_metric(
    example: dspy.Example,
    prediction: dspy.Prediction,
    trace: Optional[Any] = None
) -> float:
    """
    Metric based on actual user feedback.

    This is the primary metric used during optimization.
    Uses thumbs up/down from the ai_feedback table.

    Args:
        example: DSPy example with expected output (from feedback)
        prediction: Model prediction
        trace: Optional trace for debugging

    Returns:
        Score between 0.0 and 1.0
    """
    # If we have stored feedback for this example
    if hasattr(example, "feedback_rating"):
        return TutoringMetrics.from_feedback(
            example.feedback_rating,
            getattr(example, "feedback_value", None)
        )

    # Fallback: check if prediction matches expected
    if hasattr(example, "expected_solution"):
        # Simple string containment check
        expected = example.expected_solution.lower()
        actual = prediction.solution.lower() if hasattr(prediction, "solution") else str(prediction).lower()

        # Check for key concepts presence
        if expected in actual:
            return 1.0
        elif any(word in actual for word in expected.split()[:5]):
            return 0.5
        return 0.0

    # Default: neutral score if no feedback available
    return 0.5


def explanation_quality_metric(
    example: dspy.Example,
    prediction: dspy.Prediction,
    trace: Optional[Any] = None
) -> float:
    """
    Evaluate the quality of explanations.

    Checks for:
    - Step-by-step structure
    - Use of examples
    - Appropriate length
    - Presence of key educational elements

    Args:
        example: DSPy example
        prediction: Model prediction
        trace: Optional trace

    Returns:
        Score between 0.0 and 1.0
    """
    score = 0.0
    total_checks = 5

    # Get the explanation text
    explanation = ""
    if hasattr(prediction, "explanation"):
        explanation = prediction.explanation
    elif hasattr(prediction, "solution"):
        explanation = prediction.solution
    else:
        explanation = str(prediction)

    # Check 1: Has step-by-step structure
    step_indicators = ["step 1", "step 2", "first", "then", "next", "finally", "1.", "2."]
    if any(ind in explanation.lower() for ind in step_indicators):
        score += 1

    # Check 2: Has examples
    example_indicators = ["for example", "for instance", "such as", "e.g.", "like this"]
    if any(ind in explanation.lower() for ind in example_indicators):
        score += 1

    # Check 3: Appropriate length (not too short, not too long)
    word_count = len(explanation.split())
    if 50 <= word_count <= 500:
        score += 1
    elif 30 <= word_count <= 600:
        score += 0.5

    # Check 4: Has educational scaffolding
    scaffold_indicators = ["remember", "think about", "consider", "notice", "key point"]
    if any(ind in explanation.lower() for ind in scaffold_indicators):
        score += 1

    # Check 5: Avoids just giving the answer
    answer_giveaway = ["the answer is", "answer:", "= answer"]
    if not any(ind in explanation.lower() for ind in answer_giveaway):
        score += 1

    return score / total_checks


def student_understanding_metric(
    example: dspy.Example,
    prediction: dspy.Prediction,
    trace: Optional[Any] = None
) -> float:
    """
    Evaluate whether the response promotes student understanding.

    Checks for:
    - Questions that check understanding
    - Encouragement
    - Building on prior knowledge
    - Addressing misconceptions

    Args:
        example: DSPy example
        prediction: Model prediction
        trace: Optional trace

    Returns:
        Score between 0.0 and 1.0
    """
    score = 0.0
    total_checks = 4

    # Combine all output fields
    full_response = ""
    for field in ["explanation", "solution", "check_understanding", "encouragement", "next_steps"]:
        if hasattr(prediction, field):
            full_response += " " + str(getattr(prediction, field))

    if not full_response:
        full_response = str(prediction)

    response_lower = full_response.lower()

    # Check 1: Has understanding checks (questions)
    if "?" in full_response:
        score += 1

    # Check 2: Has encouragement
    encouragement_words = ["well done", "good", "great", "excellent", "you're on the right track",
                          "nice work", "keep going", "you've got this"]
    if any(word in response_lower for word in encouragement_words):
        score += 1

    # Check 3: References prior knowledge
    prior_knowledge_refs = ["you learned", "remember when", "as you know", "building on",
                           "using what you know", "from before"]
    if any(ref in response_lower for ref in prior_knowledge_refs):
        score += 1

    # Check 4: Addresses potential misconceptions
    misconception_refs = ["common mistake", "be careful", "don't confuse", "misconception",
                         "students often", "watch out for"]
    if any(ref in response_lower for ref in misconception_refs):
        score += 1

    return score / total_checks


def composite_tutoring_metric(
    example: dspy.Example,
    prediction: dspy.Prediction,
    trace: Optional[Any] = None
) -> float:
    """
    Composite metric combining feedback accuracy, explanation quality,
    and student understanding metrics.

    Weights:
    - Feedback accuracy: 50% (most important - actual user satisfaction)
    - Explanation quality: 30%
    - Student understanding: 20%

    Args:
        example: DSPy example
        prediction: Model prediction
        trace: Optional trace

    Returns:
        Weighted score between 0.0 and 1.0
    """
    feedback_score = feedback_accuracy_metric(example, prediction, trace)
    explanation_score = explanation_quality_metric(example, prediction, trace)
    understanding_score = student_understanding_metric(example, prediction, trace)

    # Weighted combination
    composite = (
        0.5 * feedback_score +
        0.3 * explanation_score +
        0.2 * understanding_score
    )

    return composite


# Metric for DSPy BootstrapFewShot
def dspy_tutoring_metric(example, pred, trace=None) -> float:
    """
    Main metric function for DSPy optimization.

    Use this with BootstrapFewShot:
        optimizer = BootstrapFewShot(metric=dspy_tutoring_metric)

    Args:
        example: DSPy example
        pred: Model prediction
        trace: Optional trace

    Returns:
        Score between 0.0 and 1.0
    """
    return composite_tutoring_metric(example, pred, trace)
