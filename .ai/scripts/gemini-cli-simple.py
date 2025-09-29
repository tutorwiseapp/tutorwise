#!/usr/bin/env python3
"""
Simple Gemini CLI for Tutorwise - Minimal version that works
Use this when Claude Code credits run out
"""

import os
import sys
import argparse
import google.generativeai as genai
from pathlib import Path
from dotenv import load_dotenv

class SimpleGeminiCLI:
    """Simple, working Gemini CLI"""

    def __init__(self):
        # Load environment
        project_root = Path(__file__).parent.parent.parent
        load_dotenv(project_root / ".env.local")
        load_dotenv()

        # Configure Gemini
        api_key = os.getenv('GOOGLE_AI_API_KEY')
        if not api_key:
            raise ValueError("GOOGLE_AI_API_KEY not found in environment")

        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-2.5-flash')

    def chat(self, query: str, stream: bool = False) -> str:
        """Simple chat with Gemini"""
        try:
            prompt = f"""You are an AI assistant for the Tutorwise educational platform project.

PROJECT: Full-stack Next.js app with Supabase database, Stripe payments, and comprehensive testing.

QUERY: {query}

Provide a helpful, technical response focused on the Tutorwise project."""

            if stream:
                print("Gemini (streaming):")
                try:
                    response = self.model.generate_content(prompt, stream=True)
                    full_response = ""
                    for chunk in response:
                        if chunk.text:
                            print(chunk.text, end="", flush=True)
                            full_response += chunk.text
                    print("\n")
                    return full_response
                except Exception as stream_error:
                    print(f"\n❌ Streaming failed: {stream_error}")
                    # Try non-streaming as fallback
                    print("Trying non-streaming mode...")
                    response = self.model.generate_content(prompt)
                    return response.text
            else:
                print("Gemini is thinking...")
                response = self.model.generate_content(prompt)
                return response.text

        except Exception as e:
            return f"Error: {e}"

    def interactive(self):
        """Interactive chat mode"""
        print("🔷 Tutorwise Gemini CLI (Simple)")
        print("💡 Type 'quit' or 'exit' to leave")
        print("=====================================\n")

        while True:
            try:
                query = input("\n💬 You: ").strip()

                if query.lower() in ['quit', 'exit', 'q']:
                    print("👋 Goodbye!")
                    break

                if not query:
                    continue

                result = self.chat(query, stream=True)

            except KeyboardInterrupt:
                print("\n👋 Goodbye!")
                break
            except Exception as e:
                print(f"Error: {e}")

def main():
    parser = argparse.ArgumentParser(description='Simple Tutorwise Gemini CLI')
    parser.add_argument('command', nargs='?', choices=['chat', 'interactive'], default='interactive')
    parser.add_argument('--query', '-q', help='Query for chat mode')
    parser.add_argument('--stream', '-s', action='store_true', help='Stream response')
    parser.add_argument('--interactive', '-i', action='store_true', help='Interactive mode')

    args = parser.parse_args()

    try:
        cli = SimpleGeminiCLI()

        if args.interactive or args.command == 'interactive':
            cli.interactive()
        elif args.command == 'chat':
            if not args.query:
                print("Error: --query required for chat command")
                sys.exit(1)
            result = cli.chat(args.query, stream=args.stream)
            print(f"\n🔷 Gemini: {result}\n")
        else:
            # Default to interactive
            cli.interactive()

    except Exception as e:
        print(f"❌ Error: {e}")
        print("\n💡 Make sure GOOGLE_AI_API_KEY is set in .env.local")
        sys.exit(1)

if __name__ == "__main__":
    main()