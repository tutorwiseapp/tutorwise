#!/usr/bin/env python3
"""
Tutorwise Gemini CLI - AI Development Assistant
A comprehensive CLI tool for AI-powered development assistance with Tutorwise context awareness.
"""

import os
import sys
import json
import argparse
from pathlib import Path
from typing import Dict, List, Optional, Any
import subprocess

# Add project root to path for imports
if '__file__' in globals():
    project_root = Path(__file__).parent.parent.parent
else:
    project_root = Path.cwd()

sys.path.insert(0, str(project_root))

try:
    import google.generativeai as genai
except ImportError:
    print("Error: google-generativeai package not installed")
    print("Please install with: pip install google-generativeai")
    sys.exit(1)

class TutorwiseGeminiCLI:
    def __init__(self):
        self.project_root = project_root
        self.ai_dir = self.project_root / '.ai'
        self.config = self.load_configuration()
        self.setup_gemini()

    def load_configuration(self) -> Dict[str, Any]:
        """Load configuration from various sources"""
        config = {
            'model': 'gemini-1.5-pro-latest',
            'temperature': 0.1,
            'max_tokens': 8192,
            'context_sources': {
                'prompt': True,
                'jira': True,
                'github': True,
                'calendar': True,
                'mermaid': True
            }
        }

        # Load from .gemini/settings.json if it exists
        gemini_config_path = self.project_root / '.gemini' / 'settings.json'
        if gemini_config_path.exists():
            try:
                with open(gemini_config_path) as f:
                    file_config = json.load(f)
                    config.update(file_config)
            except Exception as e:
                print(f"Warning: Could not load .gemini/settings.json: {e}")

        return config

    def setup_gemini(self):
        """Initialize Gemini AI with API key"""
        api_key = os.getenv('GOOGLE_AI_API_KEY')
        if not api_key:
            print("Error: GOOGLE_AI_API_KEY environment variable not set")
            print("Please add your Gemini API key to .env.local")
            sys.exit(1)

        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel(self.config['model'])

    def load_context(self, sources: Optional[List[str]] = None) -> str:
        """Load Tutorwise project context from various sources"""
        context_parts = []

        # Main project context
        prompt_file = self.ai_dir / 'PROMPT.md'
        if prompt_file.exists() and (not sources or 'prompt' in sources):
            with open(prompt_file) as f:
                context_parts.append(f"# Tutorwise Project Context\\n{f.read()}")

        # Jira context
        if not sources or 'jira' in sources:
            jira_dir = self.ai_dir / 'jira'
            if jira_dir.exists():
                sprint_file = jira_dir / 'current-sprint.md'
                if sprint_file.exists():
                    with open(sprint_file) as f:
                        context_parts.append(f"# Current Sprint Information\\n{f.read()}")

        # GitHub context
        if not sources or 'github' in sources:
            github_file = self.ai_dir / 'github' / 'repository-overview.md'
            if github_file.exists():
                with open(github_file) as f:
                    context_parts.append(f"# GitHub Repository Overview\\n{f.read()}")

        # Calendar context
        if not sources or 'calendar' in sources:
            calendar_file = self.ai_dir / 'calendar' / 'development-schedule.md'
            if calendar_file.exists():
                with open(calendar_file) as f:
                    context_parts.append(f"# Development Schedule\\n{f.read()}")

        # Mermaid diagrams
        if not sources or 'mermaid' in sources:
            mermaid_file = self.ai_dir / 'mermaid' / 'overview.md'
            if mermaid_file.exists():
                with open(mermaid_file) as f:
                    context_parts.append(f"# Architecture Diagrams\\n{f.read()}")

        return "\\n\\n".join(context_parts)

    def chat(self, query: str, context_sources: Optional[List[str]] = None) -> str:
        """Execute a chat query with Tutorwise context"""
        context = self.load_context(context_sources)

        prompt = f"""You are an AI development assistant for Tutorwise, an educational platform.
You have access to comprehensive project context and should provide specific, actionable guidance.

{context}

User Query: {query}

Please provide a detailed, helpful response based on the Tutorwise project context."""

        try:
            response = self.model.generate_content(prompt)
            return response.text
        except Exception as e:
            return f"Error generating response: {e}"

    def analyze_ticket(self, ticket_id: str) -> str:
        """Analyze a specific Jira ticket"""
        ticket_file = self.ai_dir / 'jira' / 'tickets' / f'{ticket_id}.md'

        if not ticket_file.exists():
            return f"Ticket {ticket_id} not found. Run 'npm run sync:jira' to update tickets."

        with open(ticket_file) as f:
            ticket_content = f.read()

        context = self.load_context()

        prompt = f"""You are analyzing Jira ticket {ticket_id} for the Tutorwise project.

{context}

Ticket Details:
{ticket_content}

Please provide:
1. Implementation approach and recommendations
2. Technical considerations and potential challenges
3. Estimated effort and complexity
4. Dependencies and prerequisites
5. Testing strategy
"""

        try:
            response = self.model.generate_content(prompt)
            return response.text
        except Exception as e:
            return f"Error analyzing ticket: {e}"

    def code_review(self, description: str) -> str:
        """Perform AI code review"""
        context = self.load_context()

        prompt = f"""You are performing a code review for the Tutorwise project.

{context}

Code Review Request: {description}

Please review the code and provide:
1. Code quality assessment
2. Security considerations
3. Performance implications
4. Adherence to Tutorwise patterns and conventions
5. Suggestions for improvements
6. Potential bugs or issues
"""

        try:
            response = self.model.generate_content(prompt)
            return response.text
        except Exception as e:
            return f"Error performing code review: {e}"

    def debug_help(self, error_description: str) -> str:
        """Get debugging assistance"""
        context = self.load_context()

        prompt = f"""You are helping debug an issue in the Tutorwise project.

{context}

Error/Issue Description: {error_description}

Please provide:
1. Possible causes of the issue
2. Step-by-step debugging approach
3. Common solutions for similar problems
4. Relevant Tutorwise-specific considerations
5. Prevention strategies for the future
"""

        try:
            response = self.model.generate_content(prompt)
            return response.text
        except Exception as e:
            return f"Error providing debug help: {e}"

    def development_planning(self) -> str:
        """Generate development planning insights"""
        context = self.load_context()

        prompt = f"""You are providing development planning insights for the Tutorwise project.

{context}

Please analyze the current project state and provide:
1. Sprint progress assessment
2. Upcoming priorities and recommendations
3. Potential blockers and mitigation strategies
4. Code quality and technical debt observations
5. Strategic development suggestions
"""

        try:
            response = self.model.generate_content(prompt)
            return response.text
        except Exception as e:
            return f"Error generating planning insights: {e}"

    def interactive_mode(self):
        """Start interactive chat mode"""
        print("🤖 Tutorwise Gemini CLI - Interactive Mode")
        print("Type 'help' for commands, 'exit' to quit\\n")

        while True:
            try:
                query = input("💬 You: ").strip()

                if query.lower() in ['exit', 'quit']:
                    print("👋 Goodbye!")
                    break
                elif query.lower() == 'help':
                    self.print_help()
                    continue
                elif not query:
                    continue

                print("🤔 Thinking...")
                response = self.chat(query)
                print(f"🤖 Assistant: {response}\\n")

            except KeyboardInterrupt:
                print("\\n👋 Goodbye!")
                break
            except Exception as e:
                print(f"❌ Error: {e}")

    def print_help(self):
        """Print help information"""
        help_text = """
🚀 Tutorwise Gemini CLI Commands:

Interactive Commands:
  help                    Show this help message
  exit, quit             Exit interactive mode

CLI Commands:
  chat -q "question"     Ask a question with full context
  analyze -t TICKET      Analyze a specific Jira ticket
  review -q "description" Get AI code review assistance
  debug -q "error"       Get debugging help
  plan                   Get development planning insights

Examples:
  python gemini-cli.py chat -q "How to implement role switching?"
  python gemini-cli.py analyze -t TUTOR-25
  python gemini-cli.py review -q "Review my authentication code"
  python gemini-cli.py debug -q "Getting 404 errors on API calls"
"""
        print(help_text)

def main():
    parser = argparse.ArgumentParser(description='Tutorwise Gemini CLI')
    subparsers = parser.add_subparsers(dest='command', help='Available commands')

    # Chat command
    chat_parser = subparsers.add_parser('chat', help='Chat with AI assistant')
    chat_parser.add_argument('-q', '--query', required=True, help='Question to ask')

    # Analyze command
    analyze_parser = subparsers.add_parser('analyze', help='Analyze Jira ticket')
    analyze_parser.add_argument('-t', '--ticket', required=True, help='Ticket ID to analyze')

    # Review command
    review_parser = subparsers.add_parser('review', help='Get code review')
    review_parser.add_argument('-q', '--query', required=True, help='Code review description')

    # Debug command
    debug_parser = subparsers.add_parser('debug', help='Get debugging help')
    debug_parser.add_argument('-q', '--query', required=True, help='Error description')

    # Plan command
    subparsers.add_parser('plan', help='Get development planning insights')

    # Interactive command
    subparsers.add_parser('interactive', help='Start interactive mode')

    args = parser.parse_args()

    cli = TutorwiseGeminiCLI()

    if args.command == 'chat':
        response = cli.chat(args.query)
        print(response)
    elif args.command == 'analyze':
        response = cli.analyze_ticket(args.ticket)
        print(response)
    elif args.command == 'review':
        response = cli.code_review(args.query)
        print(response)
    elif args.command == 'debug':
        response = cli.debug_help(args.query)
        print(response)
    elif args.command == 'plan':
        response = cli.development_planning()
        print(response)
    elif args.command == 'interactive':
        cli.interactive_mode()
    else:
        # Default to interactive mode
        cli.interactive_mode()

if __name__ == '__main__':
    main()