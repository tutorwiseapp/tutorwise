"""
DSPy Data Loader

Loads training data from the ai_feedback table and related session data.
Converts database records into DSPy Examples for optimization.
"""

import os
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta

import dspy
from supabase import create_client, Client


class FeedbackDataLoader:
    """
    Load feedback data from ai_feedback table for DSPy training.
    """

    def __init__(self, supabase_client: Optional[Client] = None):
        """
        Initialize the data loader.

        Args:
            supabase_client: Optional Supabase client. If not provided,
                           will create from environment variables.
        """
        if supabase_client:
            self.client = supabase_client
        else:
            url = os.environ.get("SUPABASE_URL")
            key = os.environ.get("SUPABASE_SERVICE_KEY")
            if not url or not key:
                raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_KEY required")
            self.client = create_client(url, key)

    def load_feedback(
        self,
        agent_type: str,
        rating: Optional[str] = None,
        processed: Optional[bool] = None,
        since_days: int = 30,
        limit: int = 1000
    ) -> List[Dict[str, Any]]:
        """
        Load feedback records from the database.

        Args:
            agent_type: 'sage' or 'lexi'
            rating: Optional filter by rating ('thumbs_up' or 'thumbs_down')
            processed: Optional filter by processed status
            since_days: Load feedback from last N days
            limit: Maximum records to load

        Returns:
            List of feedback records
        """
        since_date = (datetime.utcnow() - timedelta(days=since_days)).isoformat()

        query = (
            self.client.table("ai_feedback")
            .select("*")
            .eq("agent_type", agent_type)
            .gte("created_at", since_date)
            .order("created_at", desc=True)
            .limit(limit)
        )

        if rating:
            query = query.eq("rating", rating)

        if processed is not None:
            query = query.eq("processed", processed)

        result = query.execute()
        return result.data

    def load_with_sessions(
        self,
        agent_type: str,
        since_days: int = 30,
        limit: int = 500
    ) -> List[Dict[str, Any]]:
        """
        Load feedback with associated session and message data.

        This joins feedback with session messages to get the full
        conversation context for training.

        Args:
            agent_type: 'sage' or 'lexi'
            since_days: Load feedback from last N days
            limit: Maximum records to load

        Returns:
            List of feedback records with session context
        """
        # Load feedback
        feedback_records = self.load_feedback(
            agent_type=agent_type,
            since_days=since_days,
            limit=limit
        )

        # Enrich with session data
        enriched = []
        session_table = f"{agent_type}_messages" if agent_type == "sage" else "lexi_messages"

        for record in feedback_records:
            session_id = record.get("session_id")
            message_id = record.get("message_id")

            if session_id:
                # Try to get the message context
                try:
                    if message_id:
                        # Get specific message and surrounding context
                        messages = (
                            self.client.table(session_table)
                            .select("*")
                            .eq("session_id", session_id)
                            .order("timestamp", desc=False)
                            .limit(10)
                            .execute()
                        )
                    else:
                        # Get last few messages from session
                        messages = (
                            self.client.table(session_table)
                            .select("*")
                            .eq("session_id", session_id)
                            .order("timestamp", desc=True)
                            .limit(5)
                            .execute()
                        )

                    record["messages"] = messages.data
                except Exception:
                    record["messages"] = []

            enriched.append(record)

        return enriched

    def mark_as_processed(self, feedback_ids: List[str]) -> int:
        """
        Mark feedback records as processed.

        Args:
            feedback_ids: List of feedback IDs to mark

        Returns:
            Number of records updated
        """
        if not feedback_ids:
            return 0

        result = (
            self.client.table("ai_feedback")
            .update({
                "processed": True,
                "processed_at": datetime.utcnow().isoformat()
            })
            .in_("id", feedback_ids)
            .execute()
        )

        return len(result.data)


class SessionDataLoader:
    """
    Load session and message data for context-aware training.
    """

    def __init__(self, supabase_client: Optional[Client] = None):
        """Initialize the data loader."""
        if supabase_client:
            self.client = supabase_client
        else:
            url = os.environ.get("SUPABASE_URL")
            key = os.environ.get("SUPABASE_SERVICE_KEY")
            if not url or not key:
                raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_KEY required")
            self.client = create_client(url, key)

    def load_sessions(
        self,
        agent_type: str,
        subject: Optional[str] = None,
        level: Optional[str] = None,
        persona: Optional[str] = None,
        since_days: int = 30,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Load session data for training.

        Args:
            agent_type: 'sage' or 'lexi'
            subject: Optional subject filter
            level: Optional level filter
            persona: Optional persona filter
            since_days: Load sessions from last N days
            limit: Maximum sessions to load

        Returns:
            List of session records with messages
        """
        since_date = (datetime.utcnow() - timedelta(days=since_days)).isoformat()
        session_table = f"{agent_type}_sessions"

        query = (
            self.client.table(session_table)
            .select("*")
            .gte("started_at", since_date)
            .order("started_at", desc=True)
            .limit(limit)
        )

        if subject and agent_type == "sage":
            query = query.eq("subject", subject)

        if level and agent_type == "sage":
            query = query.eq("level", level)

        if persona:
            query = query.eq("persona", persona)

        result = query.execute()
        sessions = result.data

        # Load messages for each session
        message_table = f"{agent_type}_messages"
        for session in sessions:
            messages = (
                self.client.table(message_table)
                .select("*")
                .eq("session_id", session["id"])
                .order("timestamp", desc=False)
                .execute()
            )
            session["messages"] = messages.data

        return sessions


def load_training_data(
    agent_type: str,
    signature_type: str = "general",
    since_days: int = 30,
    limit: int = 500
) -> List[dspy.Example]:
    """
    Load training data as DSPy Examples.

    Args:
        agent_type: 'sage' or 'lexi'
        signature_type: Type of signature to train ('maths', 'explain', 'diagnose', 'general')
        since_days: Load data from last N days
        limit: Maximum examples

    Returns:
        List of DSPy Examples for training
    """
    loader = FeedbackDataLoader()
    feedback_data = loader.load_with_sessions(
        agent_type=agent_type,
        since_days=since_days,
        limit=limit
    )

    examples = []
    for record in feedback_data:
        # Extract context
        context = record.get("context", {}) or {}
        messages = record.get("messages", [])

        # Find the user message and assistant response
        user_message = ""
        assistant_response = ""
        for msg in messages:
            if msg.get("role") == "user":
                user_message = msg.get("content", "")
            elif msg.get("role") == "assistant":
                assistant_response = msg.get("content", "")

        if not user_message:
            continue

        # Create example based on signature type
        example_data = {
            "feedback_rating": record.get("rating"),
            "feedback_value": record.get("rating_value"),
        }

        if signature_type == "maths" or context.get("subject") == "maths":
            example_data.update({
                "problem": user_message,
                "level": context.get("level", "GCSE"),
                "topic": context.get("topic", "general"),
                "student_context": "",
                "expected_solution": assistant_response,
            })
        elif signature_type == "explain":
            example_data.update({
                "concept": user_message,
                "subject": context.get("subject", "general"),
                "level": context.get("level", "GCSE"),
                "learning_style": "mixed",
                "prior_knowledge": "",
                "expected_explanation": assistant_response,
            })
        elif signature_type == "diagnose":
            example_data.update({
                "student_work": user_message,
                "problem_context": context.get("problem", ""),
                "subject": context.get("subject", "general"),
                "level": context.get("level", "GCSE"),
                "expected_diagnosis": assistant_response,
            })
        else:
            # General
            example_data.update({
                "input": user_message,
                "expected_output": assistant_response,
                "context": context,
            })

        examples.append(dspy.Example(**example_data).with_inputs(
            *[k for k in example_data.keys() if not k.startswith("expected") and not k.startswith("feedback")]
        ))

    return examples


def load_evaluation_data(
    agent_type: str,
    signature_type: str = "general",
    limit: int = 100
) -> List[dspy.Example]:
    """
    Load evaluation data (positive feedback only) for testing optimized prompts.

    Args:
        agent_type: 'sage' or 'lexi'
        signature_type: Type of signature
        limit: Maximum examples

    Returns:
        List of DSPy Examples for evaluation
    """
    loader = FeedbackDataLoader()

    # Only use thumbs_up feedback for evaluation
    feedback_data = loader.load_feedback(
        agent_type=agent_type,
        rating="thumbs_up",
        since_days=90,
        limit=limit
    )

    # Convert to examples (similar to training data)
    examples = []
    for record in feedback_data:
        context = record.get("context", {}) or {}

        example_data = {
            "feedback_rating": "thumbs_up",
            "feedback_value": record.get("rating_value", 5),
        }

        if signature_type == "maths":
            example_data.update({
                "problem": "Sample problem",
                "level": context.get("level", "GCSE"),
                "topic": context.get("topic", "general"),
            })

        examples.append(dspy.Example(**example_data))

    return examples
