"""
DSPy Signatures for Sage AI Tutor

Each signature defines an input/output contract for a specific tutoring task.
DSPy uses these signatures to optimize prompts based on feedback data.
"""

from .maths_solver import MathsSolver, MathsSolverModule
from .explain_concept import ExplainConcept, ExplainConceptModule
from .diagnose_error import DiagnoseError, DiagnoseErrorModule

__all__ = [
    "MathsSolver",
    "MathsSolverModule",
    "ExplainConcept",
    "ExplainConceptModule",
    "DiagnoseError",
    "DiagnoseErrorModule",
]
