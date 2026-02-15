#!/usr/bin/env python3
"""
CAS DSPy Optimization Runner

Weekly optimization of AI tutor prompts using user feedback.
Run via GitHub Actions or manually:

    python cas/optimization/run_dspy.py --agent sage --all
    python cas/optimization/run_dspy.py --agent lexi --signature explain

Environment variables required:
    SUPABASE_URL
    SUPABASE_SERVICE_KEY
    GOOGLE_AI_API_KEY (for Gemini)
"""

import os
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any, List

import click
import dspy
from dotenv import load_dotenv
from tqdm import tqdm

# Local imports
from signatures import MathsSolverModule, ExplainConceptModule, DiagnoseErrorModule
from metrics import composite_tutoring_metric, dspy_tutoring_metric
from data import load_training_data, load_evaluation_data, FeedbackDataLoader

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger(__name__)

# Output directory
OUTPUT_DIR = Path(__file__).parent / "output"
OUTPUT_DIR.mkdir(exist_ok=True)


class DSPyOptimizer:
    """
    DSPy optimization orchestrator for Sage and Lexi.
    """

    def __init__(
        self,
        agent_type: str,
        model: str = "gemini/gemini-1.5-flash-latest"
    ):
        """
        Initialize the optimizer.

        Args:
            agent_type: 'sage' or 'lexi'
            model: LLM model to use for optimization
        """
        self.agent_type = agent_type
        self.model = model
        self.results: Dict[str, Any] = {}

        # Initialize DSPy with the model
        self._configure_dspy()

    def _configure_dspy(self):
        """Configure DSPy with the LLM provider."""
        api_key = os.environ.get("GOOGLE_AI_API_KEY")
        if not api_key:
            raise ValueError("GOOGLE_AI_API_KEY environment variable required")

        # Configure Gemini as the LLM
        lm = dspy.LM(
            model=self.model,
            api_key=api_key,
            temperature=0.7,
            max_tokens=2048
        )
        dspy.configure(lm=lm)
        logger.info(f"Configured DSPy with {self.model}")

    def optimize_signature(
        self,
        signature_type: str,
        max_bootstrapped_demos: int = 4,
        max_labeled_demos: int = 8,
        num_candidate_programs: int = 8
    ) -> Dict[str, Any]:
        """
        Optimize a single signature type.

        Args:
            signature_type: 'maths', 'explain', 'diagnose'
            max_bootstrapped_demos: Max bootstrapped examples
            max_labeled_demos: Max labeled examples
            num_candidate_programs: Number of candidates to try

        Returns:
            Optimization results including before/after metrics
        """
        logger.info(f"Starting optimization for {signature_type} signature...")

        # Load training and evaluation data
        train_data = load_training_data(
            agent_type=self.agent_type,
            signature_type=signature_type,
            since_days=30,
            limit=500
        )

        eval_data = load_evaluation_data(
            agent_type=self.agent_type,
            signature_type=signature_type,
            limit=100
        )

        if len(train_data) < 10:
            logger.warning(f"Insufficient training data for {signature_type}: {len(train_data)} examples")
            return {
                "signature": signature_type,
                "status": "skipped",
                "reason": f"Insufficient data ({len(train_data)} examples)",
                "timestamp": datetime.utcnow().isoformat()
            }

        logger.info(f"Loaded {len(train_data)} training, {len(eval_data)} eval examples")

        # Select the appropriate module
        if signature_type == "maths":
            module = MathsSolverModule()
        elif signature_type == "explain":
            module = ExplainConceptModule()
        elif signature_type == "diagnose":
            module = DiagnoseErrorModule()
        else:
            logger.error(f"Unknown signature type: {signature_type}")
            return {
                "signature": signature_type,
                "status": "error",
                "reason": f"Unknown signature type",
                "timestamp": datetime.utcnow().isoformat()
            }

        # Evaluate before optimization
        logger.info("Evaluating baseline performance...")
        before_score = self._evaluate_module(module, eval_data[:20])

        # Run BootstrapFewShot optimization
        logger.info("Running BootstrapFewShot optimization...")
        optimizer = dspy.BootstrapFewShot(
            metric=dspy_tutoring_metric,
            max_bootstrapped_demos=max_bootstrapped_demos,
            max_labeled_demos=max_labeled_demos,
            max_rounds=1
        )

        try:
            optimized_module = optimizer.compile(
                module,
                trainset=train_data[:100],  # Use subset for faster optimization
            )
        except Exception as e:
            logger.error(f"Optimization failed: {e}")
            return {
                "signature": signature_type,
                "status": "error",
                "reason": str(e),
                "before_score": before_score,
                "timestamp": datetime.utcnow().isoformat()
            }

        # Evaluate after optimization
        logger.info("Evaluating optimized performance...")
        after_score = self._evaluate_module(optimized_module, eval_data[:20])

        # Calculate improvement
        improvement = after_score - before_score
        improvement_pct = (improvement / max(before_score, 0.01)) * 100

        logger.info(f"Optimization complete: {before_score:.3f} -> {after_score:.3f} ({improvement_pct:+.1f}%)")

        # Extract optimized prompts
        optimized_prompts = self._extract_prompts(optimized_module)

        result = {
            "signature": signature_type,
            "status": "success",
            "metrics": {
                "before": before_score,
                "after": after_score,
                "improvement": improvement,
                "improvement_pct": improvement_pct
            },
            "samples_used": len(train_data),
            "optimized_prompts": optimized_prompts,
            "timestamp": datetime.utcnow().isoformat()
        }

        self.results[signature_type] = result
        return result

    def _evaluate_module(
        self,
        module: dspy.Module,
        examples: List[dspy.Example]
    ) -> float:
        """
        Evaluate a module on examples.

        Args:
            module: DSPy module to evaluate
            examples: Evaluation examples

        Returns:
            Average metric score
        """
        if not examples:
            return 0.0

        scores = []
        for example in tqdm(examples, desc="Evaluating", leave=False):
            try:
                # Get input fields from the example
                input_fields = example.inputs()
                prediction = module(**input_fields)
                score = composite_tutoring_metric(example, prediction)
                scores.append(score)
            except Exception as e:
                logger.warning(f"Evaluation error: {e}")
                scores.append(0.0)

        return sum(scores) / len(scores) if scores else 0.0

    def _extract_prompts(self, module: dspy.Module) -> Dict[str, Any]:
        """
        Extract optimized prompts from a compiled module.

        Args:
            module: Compiled DSPy module

        Returns:
            Dictionary of prompt components
        """
        prompts = {}

        # Extract demos (few-shot examples)
        if hasattr(module, "demos"):
            prompts["demos"] = [
                {
                    "inputs": dict(demo.inputs()) if hasattr(demo, "inputs") else {},
                    "outputs": dict(demo.labels()) if hasattr(demo, "labels") else {}
                }
                for demo in module.demos[:5]  # Limit to 5 demos
            ]

        # Extract any modified instructions
        for name, submodule in module.named_predictors():
            if hasattr(submodule, "extended_signature"):
                sig = submodule.extended_signature
                prompts[name] = {
                    "instructions": str(sig.instructions) if hasattr(sig, "instructions") else None,
                    "fields": [
                        {"name": f.name, "desc": f.json_schema_extra.get("desc", "")}
                        for f in sig.fields.values()
                    ] if hasattr(sig, "fields") else []
                }

        return prompts

    def optimize_all(self) -> Dict[str, Any]:
        """
        Optimize all signature types.

        Returns:
            Combined results for all signatures
        """
        signatures = ["maths", "explain", "diagnose"]
        all_results = {}

        for sig in signatures:
            logger.info(f"\n{'='*50}")
            logger.info(f"Optimizing: {sig}")
            logger.info(f"{'='*50}")
            result = self.optimize_signature(sig)
            all_results[sig] = result

        return all_results

    def save_results(self, filename: Optional[str] = None) -> Path:
        """
        Save optimization results to JSON.

        Args:
            filename: Optional custom filename

        Returns:
            Path to saved file
        """
        if not filename:
            timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
            filename = f"optimized_prompts_{self.agent_type}_{timestamp}.json"

        output_path = OUTPUT_DIR / filename

        output_data = {
            "agent_type": self.agent_type,
            "model": self.model,
            "generated_at": datetime.utcnow().isoformat(),
            "version": "1.0.0",
            "signatures": self.results
        }

        with open(output_path, "w") as f:
            json.dump(output_data, f, indent=2, default=str)

        logger.info(f"Results saved to {output_path}")

        # Also save to latest.json for easy access
        latest_path = OUTPUT_DIR / f"optimized_{self.agent_type}_latest.json"
        with open(latest_path, "w") as f:
            json.dump(output_data, f, indent=2, default=str)

        return output_path

    def mark_feedback_processed(self):
        """Mark all used feedback as processed in the database."""
        loader = FeedbackDataLoader()
        feedback = loader.load_feedback(
            agent_type=self.agent_type,
            processed=False,
            since_days=30
        )
        feedback_ids = [f["id"] for f in feedback]

        if feedback_ids:
            count = loader.mark_as_processed(feedback_ids)
            logger.info(f"Marked {count} feedback records as processed")


@click.command()
@click.option(
    "--agent",
    type=click.Choice(["sage", "lexi"]),
    required=True,
    help="Agent type to optimize"
)
@click.option(
    "--signature",
    type=click.Choice(["maths", "explain", "diagnose", "all"]),
    default="all",
    help="Signature to optimize (default: all)"
)
@click.option(
    "--all",
    "optimize_all",
    is_flag=True,
    help="Optimize all signatures"
)
@click.option(
    "--model",
    default="gemini/gemini-1.5-flash-latest",
    help="LLM model to use"
)
@click.option(
    "--dry-run",
    is_flag=True,
    help="Don't mark feedback as processed"
)
def main(agent: str, signature: str, optimize_all: bool, model: str, dry_run: bool):
    """
    CAS DSPy Optimization Runner

    Optimizes AI tutor prompts using user feedback from the ai_feedback table.
    """
    # Load environment variables
    load_dotenv()

    logger.info(f"Starting DSPy optimization for {agent}")
    logger.info(f"Model: {model}")

    try:
        optimizer = DSPyOptimizer(agent_type=agent, model=model)

        if optimize_all or signature == "all":
            results = optimizer.optimize_all()
        else:
            results = optimizer.optimize_signature(signature)
            optimizer.results[signature] = results

        # Save results
        output_path = optimizer.save_results()
        logger.info(f"Optimization complete. Results: {output_path}")

        # Mark feedback as processed (unless dry run)
        if not dry_run:
            optimizer.mark_feedback_processed()

        # Print summary
        logger.info("\n" + "="*50)
        logger.info("OPTIMIZATION SUMMARY")
        logger.info("="*50)
        for sig, result in optimizer.results.items():
            status = result.get("status", "unknown")
            if status == "success":
                metrics = result.get("metrics", {})
                logger.info(f"  {sig}: {metrics.get('before', 0):.3f} -> {metrics.get('after', 0):.3f} ({metrics.get('improvement_pct', 0):+.1f}%)")
            else:
                logger.info(f"  {sig}: {status} - {result.get('reason', 'N/A')}")

    except Exception as e:
        logger.error(f"Optimization failed: {e}")
        raise click.ClickException(str(e))


if __name__ == "__main__":
    main()
