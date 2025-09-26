#!/usr/bin/env python3
"""
Gemini CLI for Tutorwise Context Engineering
Integrates with your existing context system for enhanced AI assistance
"""

import os
import sys
import json
import argparse
from pathlib import Path
from typing import Dict, List, Optional
import google.generativeai as genai
from dotenv import load_dotenv

class TutorwiseGeminiCLI:
    """Enhanced Gemini CLI with Tutorwise context integration"""

    def __init__(self):
        # Handle both direct execution and imported module scenarios
        if '__file__' in globals():
            self.project_root = Path(__file__).parent.parent.parent
        else:
            # Fallback for when imported or executed differently
            self.project_root = Path.cwd()
        self.context_dir = self.project_root / ".ai"
        self.config_dir = self.project_root / ".gemini"

        # Load environment variables
        load_dotenv(self.project_root / ".env.local")
        load_dotenv()

        # Load configuration settings
        self.config = self.load_configuration()

        # Configure Gemini
        api_key = os.getenv('GOOGLE_AI_API_KEY')
        if not api_key:
            raise ValueError("GOOGLE_AI_API_KEY not found in environment")

        genai.configure(api_key=api_key)
        model_name = self.config.get('model', 'gemini-pro')
        self.model = genai.GenerativeModel(model_name)

        # Load context
        self.context = self.load_project_context()

    def load_configuration(self) -> Dict:
        """Load configuration from .gemini directory"""
        default_config = {
            "model": "gemini-pro",
            "temperature": 0.7,
            "maxTokens": 4096,
            "contextMode": "full",
            "streamingEnabled": True
        }

        try:
            # Load base settings
            base_settings_file = self.config_dir / "settings.json"
            if base_settings_file.exists():
                with open(base_settings_file, 'r') as f:
                    base_config = json.load(f)
                    default_config.update(base_config)

            # Load local settings overlay
            local_settings_file = self.config_dir / "settings.local.json"
            if local_settings_file.exists():
                with open(local_settings_file, 'r') as f:
                    local_config = json.load(f)
                    default_config.update(local_config)

            # Apply environment variable overrides
            env_overrides = {
                "model": os.getenv('GEMINI_MODEL'),
                "temperature": float(os.getenv('GEMINI_TEMPERATURE', 0)) or None,
                "maxTokens": int(os.getenv('GEMINI_MAX_TOKENS', 0)) or None,
                "contextMode": os.getenv('GEMINI_CONTEXT_MODE'),
                "streamingEnabled": os.getenv('GEMINI_STREAMING', '').lower() == 'true' if os.getenv('GEMINI_STREAMING') else None
            }

            for key, value in env_overrides.items():
                if value is not None:
                    default_config[key] = value

        except Exception as e:
            print(f"Warning: Could not load configuration: {e}")

        return default_config

    def load_project_context(self) -> Dict:
        """Load comprehensive project context from .ai directory"""
        context = {
            "prompt": "",
            "jira_tickets": [],
            "github_data": {},
            "figma_designs": {},
            "calendar_events": [],
            "google_docs": [],
            "mermaid_diagrams": []
        }

        try:
            # Load main context
            prompt_file = self.context_dir / "PROMPT.md"
            if prompt_file.exists():
                context["prompt"] = prompt_file.read_text()

            # Load Jira tickets
            jira_dir = self.context_dir / "jira" / "tickets"
            if jira_dir.exists():
                for ticket_file in jira_dir.glob("*.md"):
                    context["jira_tickets"].append({
                        "key": ticket_file.stem,
                        "content": ticket_file.read_text()
                    })

            # Load GitHub data
            github_overview = self.context_dir / "github" / "repository-overview.md"
            if github_overview.exists():
                context["github_data"]["overview"] = github_overview.read_text()

            # Load Figma designs
            figma_overview = self.context_dir / "figma" / "overview.md"
            if figma_overview.exists():
                context["figma_designs"]["overview"] = figma_overview.read_text()

            # Load Calendar events
            calendar_schedule = self.context_dir / "calendar" / "development-schedule.md"
            if calendar_schedule.exists():
                context["calendar_events"] = calendar_schedule.read_text()

            # Load Google Docs
            docs_overview = self.context_dir / "google-docs" / "overview.md"
            if docs_overview.exists():
                context["google_docs"] = docs_overview.read_text()

            # Load Mermaid diagrams
            mermaid_overview = self.context_dir / "mermaid" / "overview.md"
            if mermaid_overview.exists():
                context["mermaid_diagrams"] = mermaid_overview.read_text()

            print(f"✅ Loaded context: {len(context['jira_tickets'])} tickets, "
                  f"{'GitHub' if context['github_data'] else 'No GitHub'}, "
                  f"{'Figma' if context['figma_designs'] else 'No Figma'}")

        except Exception as e:
            print(f"⚠️  Warning loading context: {e}")

        return context

    def build_context_prompt(self, user_query: str, include_full_context: bool = True) -> str:
        """Build enhanced prompt with project context"""

        if include_full_context:
            # Full context for complex queries
            context_prompt = f"""You are an AI assistant working on the Tutorwise educational platform.

PROJECT CONTEXT:
{self.context['prompt'][:3000]}  # Truncate for token limits

CURRENT JIRA TICKETS:
{chr(10).join([f"- {ticket['key']}: {ticket['content'][:200]}..." for ticket in self.context['jira_tickets'][:5]])}

DEVELOPMENT SCHEDULE:
{self.context['calendar_events'][:500] if self.context['calendar_events'] else 'No scheduled events'}

USER QUERY: {user_query}

Provide a detailed, context-aware response based on the Tutorwise project information above."""

        else:
            # Minimal context for quick queries
            context_prompt = f"""You are an AI assistant for the Tutorwise educational platform project.

PROJECT: Full-stack Next.js app with Supabase, Stripe payments, and comprehensive testing.

QUERY: {user_query}

Provide a concise, helpful response."""

        return context_prompt

    async def chat(self, query: str, full_context: bool = True, stream: bool = False) -> str:
        """Chat with Gemini using project context"""

        # Use configuration defaults if not specified
        if stream is None:
            stream = self.config.get('streamingEnabled', False)

        prompt = self.build_context_prompt(query, full_context)

        # Apply generation configuration
        generation_config = {
            'temperature': self.config.get('temperature', 0.7),
            'max_output_tokens': self.config.get('maxTokens', 4096),
        }

        try:
            if stream:
                print("Gemini (streaming):")
                response = self.model.generate_content(
                    prompt,
                    stream=True,
                    generation_config=generation_config
                )
                full_response = ""
                for chunk in response:
                    if chunk.text:
                        print(chunk.text, end="", flush=True)
                        full_response += chunk.text
                print("\n")
                return full_response
            else:
                print("Gemini is thinking...")
                response = self.model.generate_content(
                    prompt,
                    generation_config=generation_config
                )
                return response.text

        except Exception as e:
            return f"Error communicating with Gemini: {e}"

    def analyze_ticket(self, ticket_key: str) -> str:
        """Analyze a specific Jira ticket with full context"""

        ticket = next((t for t in self.context['jira_tickets'] if t['key'] == ticket_key), None)
        if not ticket:
            return f"❌ Ticket {ticket_key} not found in context"

        query = f"Analyze ticket {ticket_key} and provide implementation recommendations"
        return self.chat(query, full_context=True, stream=False)

    def code_review(self, description: str) -> str:
        """Perform context-aware code review"""

        query = f"Review this code/implementation: {description}. Check against Tutorwise patterns and requirements."
        return self.chat(query, full_context=True, stream=False)

    def debug_help(self, error_description: str) -> str:
        """Get debugging help with project context"""

        query = f"Help debug this issue in Tutorwise: {error_description}. Consider the tech stack and architecture."
        return self.chat(query, full_context=True, stream=False)

    def planning_assist(self) -> str:
        """Generate development planning recommendations"""

        query = "Based on current Jira tickets and development schedule, suggest optimal work planning and priorities."
        return self.chat(query, full_context=True, stream=False)

def main():
    parser = argparse.ArgumentParser(description='Tutorwise Gemini CLI with Context Integration')
    parser.add_argument('command', nargs='?', choices=['chat', 'analyze', 'review', 'debug', 'plan'],
                       help='Command to execute')
    parser.add_argument('--query', '-q', type=str, help='Query or description')
    parser.add_argument('--ticket', '-t', type=str, help='Jira ticket key for analysis')
    parser.add_argument('--stream', '-s', action='store_true', help='Stream response')
    parser.add_argument('--minimal', '-m', action='store_true', help='Use minimal context')
    parser.add_argument('--interactive', '-i', action='store_true', help='Interactive mode')

    args = parser.parse_args()

    try:
        cli = TutorwiseGeminiCLI()

        if args.interactive or not args.command:
            # Interactive mode
            print("🚀 Tutorwise Gemini CLI - Interactive Mode")
            print("Commands: chat, analyze <ticket>, review <description>, debug <error>, plan, quit")
            print("Example: analyze TUTOR-20")
            print()

            while True:
                try:
                    user_input = input("tutorwise> ").strip()
                    if not user_input or user_input.lower() == 'quit':
                        break

                    parts = user_input.split(' ', 1)
                    cmd = parts[0].lower()
                    arg = parts[1] if len(parts) > 1 else ""

                    if cmd == 'chat':
                        if not arg:
                            arg = input("Enter your question: ")
                        result = cli.chat(arg, full_context=not args.minimal, stream=args.stream)
                        print(f"\n{result}\n")

                    elif cmd == 'analyze':
                        ticket = arg or input("Enter ticket key (e.g., TUTOR-20): ")
                        result = cli.analyze_ticket(ticket)
                        print(f"\n{result}\n")

                    elif cmd == 'review':
                        description = arg or input("Describe code/implementation to review: ")
                        result = cli.code_review(description)
                        print(f"\n{result}\n")

                    elif cmd == 'debug':
                        error = arg or input("Describe the error/issue: ")
                        result = cli.debug_help(error)
                        print(f"\n{result}\n")

                    elif cmd == 'plan':
                        result = cli.planning_assist()
                        print(f"\n{result}\n")

                    else:
                        print("Unknown command. Available: chat, analyze, review, debug, plan, quit")

                except KeyboardInterrupt:
                    print("\nExiting...")
                    break
                except Exception as e:
                    print(f"Error: {e}")

        else:
            # Command line mode
            if args.command == 'chat':
                if not args.query:
                    print("Error: --query required for chat command")
                    sys.exit(1)
                result = cli.chat(args.query, full_context=not args.minimal, stream=args.stream)
                print(result)

            elif args.command == 'analyze':
                if not args.ticket:
                    print("Error: --ticket required for analyze command")
                    sys.exit(1)
                result = cli.analyze_ticket(args.ticket)
                print(result)

            elif args.command == 'review':
                if not args.query:
                    print("Error: --query required for review command")
                    sys.exit(1)
                result = cli.code_review(args.query)
                print(result)

            elif args.command == 'debug':
                if not args.query:
                    print("Error: --query required for debug command")
                    sys.exit(1)
                result = cli.debug_help(args.query)
                print(result)

            elif args.command == 'plan':
                result = cli.planning_assist()
                print(result)

    except Exception as e:
        print(f"❌ CLI Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()